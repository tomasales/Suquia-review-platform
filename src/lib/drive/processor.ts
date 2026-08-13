import "server-only";

import { DeliveryType, SyncOperationStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { getObjectStream } from "@/lib/storage/storage";

import {
  buildDeliveryFolderAppProperties,
  buildDeliveryJournalAppProperties,
  buildDeliveryManifest,
  buildDeliveryManifestAppProperties,
  buildPieceFolderAppProperties,
  buildPieceMetadata,
  buildPieceVersionAssetAppProperties,
  buildPieceVersionFeedbackAppProperties,
  buildPieceVersionFolderAppProperties,
  buildPieceVersionsFolderAppProperties,
  DRIVE_BACKUP_OPERATION_TYPE,
  getDeliveryFolderName,
  getPieceFolderName,
  getPieceVersionFolderName,
  getPieceVersionsFolderName,
  serializeJournalJsonl,
  serializeVersionFeedbackJsonl,
  serializeJsonForDrive,
  type BackupFeedback,
  type ManifestDriveIds,
} from "./backup-format";
import { getDeliveryBackupSnapshot } from "./backup-snapshot";
import { getDriveConfig } from "./client";
import {
  DriveOperationError,
  getDriveErrorCode,
  sanitizeDriveErrorMessage,
} from "./errors";
import {
  createOrUpdateTextFile,
  createStreamFileIfMissing,
  findOrCreateDriveFolder,
} from "./objects";
import { assertDriveBackupOperationType } from "./processor-state";
import { markDriveConnected, markDriveProblem } from "./state";

export type DriveBackupProcessorResult = {
  attempt: number;
  deliveryId: string | null;
  status: SyncOperationStatus;
  syncOperationId: string;
};

export async function processDriveBackupOperation(syncOperationId: string) {
  const operation = await db.syncOperation.findUnique({
    where: {
      id: syncOperationId,
    },
  });

  if (!operation) {
    throw new DriveOperationError("No encontramos la SyncOperation.", {
      code: "DRIVE_SYNC_OPERATION_NOT_FOUND",
    });
  }

  assertDriveBackupOperationType(operation.type);

  const lockedRows = await db.syncOperation.updateMany({
    data: {
      attempts: {
        increment: 1,
      },
      finishedAt: null,
      lastError: null,
      startedAt: new Date(),
      status: SyncOperationStatus.SYNCING,
    },
    where: {
      id: syncOperationId,
      status: {
        in: [SyncOperationStatus.PENDING, SyncOperationStatus.FAILED],
      },
      type: DRIVE_BACKUP_OPERATION_TYPE,
    },
  });

  if (lockedRows.count === 0) {
    const current = await db.syncOperation.findUnique({
      where: {
        id: syncOperationId,
      },
    });

    if (!current) {
      throw new DriveOperationError("No encontramos la SyncOperation.", {
        code: "DRIVE_SYNC_OPERATION_NOT_FOUND",
      });
    }

    return {
      attempt: current.attempts,
      deliveryId: current.deliveryId,
      status: current.status,
      syncOperationId: current.id,
    } satisfies DriveBackupProcessorResult;
  }

  const lockedOperation = await db.syncOperation.findUniqueOrThrow({
    where: {
      id: syncOperationId,
    },
  });
  const attempt = lockedOperation.attempts;
  let deliveryId: string | null = null;

  try {
    deliveryId = getOperationDeliveryId(lockedOperation);
    const result = await backupDeliveryToDrive(deliveryId);

    await db.syncOperation.update({
      data: {
        finishedAt: new Date(),
        lastError: null,
        status: SyncOperationStatus.SYNCED,
      },
      where: {
        id: syncOperationId,
      },
    });
    await markDriveConnected();
    await db.journalEvent.create({
      data: {
        deliveryId,
        entityId: deliveryId,
        entityType: "DELIVERY",
        eventType: "DRIVE_BACKUP_SYNCED",
        metadata: {
          attempt,
          driveFolderId: result.deliveryFolderId,
          manifestFileId: result.manifestFileId,
          syncOperationId,
        },
      },
    });

    return {
      attempt,
      deliveryId,
      status: SyncOperationStatus.SYNCED,
      syncOperationId,
    } satisfies DriveBackupProcessorResult;
  } catch (error) {
    const errorCode = getDriveErrorCode(error);
    const errorMessage = sanitizeDriveErrorMessage(error);

    console.error("[drive-backup] SyncOperation failed", {
      deliveryId,
      error,
      syncOperationId,
    });

    await db.syncOperation.update({
      data: {
        finishedAt: new Date(),
        lastError: errorMessage,
        status: SyncOperationStatus.FAILED,
      },
      where: {
        id: syncOperationId,
      },
    });
    await markDriveProblem({ errorCode, errorMessage });
    await db.journalEvent.create({
      data: {
        deliveryId,
        entityId: deliveryId,
        entityType: "DELIVERY",
        eventType: "DRIVE_BACKUP_FAILED",
        metadata: {
          attempt,
          errorCode,
          syncOperationId,
        },
      },
    });

    return {
      attempt,
      deliveryId,
      status: SyncOperationStatus.FAILED,
      syncOperationId,
    } satisfies DriveBackupProcessorResult;
  }
}

async function backupDeliveryToDrive(deliveryId: string) {
  const snapshot = await getDeliveryBackupSnapshot(deliveryId);
  const typeParentId = getTypeParentFolderId(snapshot.delivery.type);
  const deliveryFolder = await findOrCreateDriveFolder({
    appProperties: buildDeliveryFolderAppProperties(deliveryId),
    knownFolderId: snapshot.delivery.driveFolderId,
    name: getDeliveryFolderName(deliveryId),
    parentId: typeParentId,
  });

  if (deliveryFolder.id !== snapshot.delivery.driveFolderId) {
    await db.delivery.update({
      data: {
        driveFolderId: deliveryFolder.id,
      },
      where: {
        id: deliveryId,
      },
    });
  }

  const driveIds: ManifestDriveIds = {
    deliveryFolderId: deliveryFolder.id,
    journalFileId: null,
    manifestFileId: snapshot.delivery.driveManifestFileId,
    versionFileIds: new Map(),
    versionFolderIds: new Map(),
  };
  const piecesFolder = await findOrCreateDriveFolder({
    appProperties: {
      suquiaDeliveryId: deliveryId,
      suquiaEntityId: deliveryId,
      suquiaEntityType: "pieces-root",
    },
    name: "pieces",
    parentId: deliveryFolder.id,
  });

  for (const piece of snapshot.pieces) {
    const pieceFolder = await findOrCreateDriveFolder({
      appProperties: buildPieceFolderAppProperties({
        deliveryId,
        pieceId: piece.id,
      }),
      name: getPieceFolderName(piece),
      parentId: piecesFolder.id,
    });
    const versionsFolder = await findOrCreateDriveFolder({
      appProperties: buildPieceVersionsFolderAppProperties({
        deliveryId,
        pieceId: piece.id,
      }),
      name: getPieceVersionsFolderName(),
      parentId: pieceFolder.id,
    });

    for (const version of piece.versions) {
      const versionFolder = await findOrCreateDriveFolder({
        appProperties: buildPieceVersionFolderAppProperties({
          deliveryId,
          pieceVersionId: version.id,
        }),
        knownFolderId: version.driveFolderId,
        name: getPieceVersionFolderName(version),
        parentId: versionsFolder.id,
      });

      driveIds.versionFolderIds?.set(version.id, versionFolder.id);

      if (version.driveFolderId !== versionFolder.id) {
        await db.pieceVersion.update({
          data: {
            driveFolderId: versionFolder.id,
          },
          where: {
            id: version.id,
          },
        });
      }

      if (!version.storageKey) {
        throw new DriveOperationError(
          "La versión de pieza no tiene storageKey para backup.",
          { code: "DRIVE_PIECE_VERSION_MISSING_STORAGE_KEY" },
        );
      }

      const asset = await createStreamFileIfMissing({
        appProperties: buildPieceVersionAssetAppProperties({
          deliveryId,
          pieceVersionId: version.id,
        }),
        body: await getObjectStream(version.storageKey),
        knownFileId: version.driveFileId,
        mimeType: version.mimeType,
        name: version.originalFilename,
        parentId: versionFolder.id,
      });

      driveIds.versionFileIds?.set(version.id, asset.id);

      if (version.driveFileId !== asset.id) {
        await db.pieceVersion.update({
          data: {
            driveFileId: asset.id,
          },
          where: {
            id: version.id,
          },
        });
      }

      const versionFeedback = getFeedbackForVersion(snapshot.feedback, version.id);

      if (versionFeedback.length > 0) {
        await createOrUpdateTextFile({
          appProperties: buildPieceVersionFeedbackAppProperties({
            deliveryId,
            pieceVersionId: version.id,
          }),
          content: serializeVersionFeedbackJsonl(versionFeedback),
          mimeType: "application/x-ndjson",
          name: "feedback.jsonl",
          parentId: versionFolder.id,
        });
      }
    }

    await createOrUpdateTextFile({
      appProperties: {
        suquiaDeliveryId: deliveryId,
        suquiaEntityId: piece.id,
        suquiaEntityType: "piece-metadata",
      },
      content: serializeJsonForDrive(buildPieceMetadata({ driveIds, piece })),
      mimeType: "application/json",
      name: "metadata.json",
      parentId: pieceFolder.id,
    });
  }

  const journalFile = await createOrUpdateTextFile({
    appProperties: buildDeliveryJournalAppProperties(deliveryId),
    content: serializeJournalJsonl(snapshot.journalEvents),
    mimeType: "application/x-ndjson",
    name: "journal.jsonl",
    parentId: deliveryFolder.id,
  });

  driveIds.journalFileId = journalFile.id;

  const exportedAt = new Date();
  const initialManifestFile = await createOrUpdateTextFile({
    appProperties: buildDeliveryManifestAppProperties(deliveryId),
    content: serializeJsonForDrive(
      buildDeliveryManifest({ driveIds, exportedAt, snapshot }),
    ),
    knownFileId: snapshot.delivery.driveManifestFileId,
    mimeType: "application/json",
    name: "manifest.json",
    parentId: deliveryFolder.id,
  });

  driveIds.manifestFileId = initialManifestFile.id;

  if (snapshot.delivery.driveManifestFileId !== initialManifestFile.id) {
    await db.delivery.update({
      data: {
        driveManifestFileId: initialManifestFile.id,
      },
      where: {
        id: deliveryId,
      },
    });
  }

  await createOrUpdateTextFile({
    appProperties: buildDeliveryManifestAppProperties(deliveryId),
    content: serializeJsonForDrive(
      buildDeliveryManifest({ driveIds, exportedAt, snapshot }),
    ),
    knownFileId: initialManifestFile.id,
    mimeType: "application/json",
    name: "manifest.json",
    parentId: deliveryFolder.id,
  });

  return {
    deliveryFolderId: deliveryFolder.id,
    manifestFileId: initialManifestFile.id,
  };
}

function getFeedbackForVersion(
  feedbackItems: BackupFeedback[],
  pieceVersionId: string,
) {
  return feedbackItems.filter(
    (feedback) => feedback.pieceVersionId === pieceVersionId,
  );
}

function getTypeParentFolderId(type: DeliveryType) {
  const config = getDriveConfig();

  if (type === DeliveryType.STORIES) {
    return config.storiesFolderId;
  }

  return config.feedFolderId;
}

function getOperationDeliveryId(operation: {
  deliveryId: string | null;
  entityId: string | null;
  payload: unknown;
}) {
  if (operation.deliveryId) {
    return operation.deliveryId;
  }

  if (
    typeof operation.payload === "object" &&
    operation.payload !== null &&
    "deliveryId" in operation.payload &&
    typeof operation.payload.deliveryId === "string"
  ) {
    return operation.payload.deliveryId;
  }

  if (operation.entityId) {
    return operation.entityId;
  }

  throw new DriveOperationError("La SyncOperation no indica deliveryId.", {
    code: "DRIVE_SYNC_OPERATION_MISSING_DELIVERY_ID",
  });
}
