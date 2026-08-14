import type {
  DeliveryStatus,
  DeliveryType,
  FeedbackLevel,
  FeedbackSourceType,
  PieceReviewState,
} from "@prisma/client";

export const DRIVE_BACKUP_OPERATION_TYPE = "DRIVE_BACKUP_DELIVERY";
export const DRIVE_SYNC_STATE_KEY = "primary";
export const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export type DriveAppProperties = Record<string, string>;

export type BackupUser = {
  email: string;
  id: string;
  name: string | null;
};

export type BackupPieceVersion = {
  checksum: string | null;
  createdAt: Date;
  driveFileId: string | null;
  driveFolderId: string | null;
  fileSizeBytes: bigint;
  id: string;
  mimeType: string;
  originalFilename: string;
  reviewState: PieceReviewState | null;
  storageKey: string | null;
  uploadedAt: Date;
  uploadedBy: BackupUser;
  uploadedByUserId: string;
  versionNumber: number;
};

export type BackupPiece = {
  createdAt: Date;
  deliveryId: string;
  id: string;
  initialNote: string | null;
  position: number;
  currentReviewState: PieceReviewState | null;
  updatedAt: Date;
  versions: BackupPieceVersion[];
};

export type BackupJournalEvent = {
  actor: BackupUser | null;
  actorUserId: string | null;
  createdAt: Date;
  deliveryId: string | null;
  entityId: string | null;
  entityType: string;
  eventType: string;
  id: string;
  metadata: unknown;
};

export type BackupFeedbackAttachment = {
  createdAt: Date;
  driveFileId: string | null;
  feedbackId: string;
  fileSizeBytes: bigint;
  id: string;
  mimeType: string;
  originalFilename: string;
  storageKey: string | null;
  uploadedBy: BackupUser;
  uploadedByUserId: string;
};

export type BackupFeedback = {
  attachments: BackupFeedbackAttachment[];
  author: BackupUser;
  authorUserId: string;
  body: string;
  createdAt: Date;
  deliveryId: string;
  id: string;
  level: FeedbackLevel;
  pieceId: string | null;
  pieceVersionId: string | null;
  sourceType: FeedbackSourceType;
  updatedAt: Date;
};

export type DeliveryBackupSnapshot = {
  delivery: {
    createdAt: Date;
    createdByUserId: string;
    creator: BackupUser;
    driveFolderId: string | null;
    driveManifestFileId: string | null;
    generalNote: string | null;
    generatedTitle: string;
    id: string;
    status: DeliveryStatus;
    submittedAt: Date | null;
    type: DeliveryType;
    updatedAt: Date;
  };
  feedback: BackupFeedback[];
  journalEvents: BackupJournalEvent[];
  pieces: BackupPiece[];
};

export type ManifestDriveIds = {
  deliveryFolderId: string | null;
  journalFileId: string | null;
  manifestFileId: string | null;
  versionFileIds?: Map<string, string>;
  versionFolderIds?: Map<string, string>;
  feedbackAttachmentFileIds?: Map<string, string>;
};

export function buildDeliveryFolderAppProperties(
  deliveryId: string,
): DriveAppProperties {
  return {
    suquiaEntityId: deliveryId,
    suquiaEntityType: "delivery",
  };
}

export function buildPieceFolderAppProperties({
  deliveryId,
  pieceId,
}: {
  deliveryId: string;
  pieceId: string;
}): DriveAppProperties {
  return {
    suquiaDeliveryId: deliveryId,
    suquiaEntityId: pieceId,
    suquiaEntityType: "piece",
  };
}

export function buildPieceVersionsFolderAppProperties({
  deliveryId,
  pieceId,
}: {
  deliveryId: string;
  pieceId: string;
}): DriveAppProperties {
  return {
    suquiaDeliveryId: deliveryId,
    suquiaEntityId: pieceId,
    suquiaEntityType: "piece-versions",
  };
}

export function buildPieceVersionFolderAppProperties({
  deliveryId,
  pieceVersionId,
}: {
  deliveryId: string;
  pieceVersionId: string;
}): DriveAppProperties {
  return {
    suquiaDeliveryId: deliveryId,
    suquiaEntityId: pieceVersionId,
    suquiaEntityType: "piece-version",
  };
}

export function buildPieceVersionAssetAppProperties({
  deliveryId,
  pieceVersionId,
}: {
  deliveryId: string;
  pieceVersionId: string;
}): DriveAppProperties {
  return {
    suquiaDeliveryId: deliveryId,
    suquiaEntityId: pieceVersionId,
    suquiaEntityType: "piece-version-asset",
  };
}

export function buildPieceVersionFeedbackAppProperties({
  deliveryId,
  pieceVersionId,
}: {
  deliveryId: string;
  pieceVersionId: string;
}): DriveAppProperties {
  return {
    suquiaDeliveryId: deliveryId,
    suquiaEntityId: pieceVersionId,
    suquiaEntityType: "piece-version-feedback",
  };
}

export function buildFeedbackAttachmentAppProperties({
  deliveryId,
  feedbackId,
  pieceVersionId,
  attachmentId,
}: {
  attachmentId: string;
  deliveryId: string;
  feedbackId: string;
  pieceVersionId: string;
}): DriveAppProperties {
  return {
    suquiaDeliveryId: deliveryId,
    suquiaEntityId: attachmentId,
    suquiaEntityType: "feedback-attachment",
    suquiaFeedbackId: feedbackId,
    suquiaPieceVersionId: pieceVersionId,
  };
}

export function buildDeliveryManifestAppProperties(
  deliveryId: string,
): DriveAppProperties {
  return {
    suquiaEntityId: deliveryId,
    suquiaEntityType: "delivery-manifest",
  };
}

export function buildDeliveryJournalAppProperties(
  deliveryId: string,
): DriveAppProperties {
  return {
    suquiaEntityId: deliveryId,
    suquiaEntityType: "delivery-journal",
  };
}

export function getDeliveryFolderName(deliveryId: string) {
  return deliveryId;
}

export function getPieceFolderName(piece: { id: string; position: number }) {
  return `${padPiecePosition(piece.position)}-${piece.id}`;
}

export function getPieceVersionsFolderName() {
  return "versions";
}

export function getPieceVersionFolderName(version: {
  id: string;
  versionNumber: number;
}) {
  return `V${version.versionNumber}-${version.id}`;
}

export function getPieceFolderRelativePath(piece: {
  id: string;
  position: number;
}) {
  return `pieces/${getPieceFolderName(piece)}`;
}

export function getPieceVersionFolderRelativePath({
  piece,
  version,
}: {
  piece: { id: string; position: number };
  version: { id: string; versionNumber: number };
}) {
  return `${getPieceFolderRelativePath(piece)}/versions/${getPieceVersionFolderName(
    version,
  )}`;
}

export function getPieceVersionAssetRelativePath({
  piece,
  version,
}: {
  piece: { id: string; position: number };
  version: {
    id: string;
    originalFilename: string;
    versionNumber: number;
  };
}) {
  return `${getPieceVersionFolderRelativePath({ piece, version })}/${
    version.originalFilename
  }`;
}

export function getFeedbackAttachmentRelativePath({
  attachment,
  feedback,
  piece,
  version,
}: {
  attachment: { id: string; originalFilename: string };
  feedback: { id: string };
  piece: { id: string; position: number };
  version: { id: string; versionNumber: number };
}) {
  return `${getPieceVersionFolderRelativePath({
    piece,
    version,
  })}/references/${feedback.id}/${attachment.id}-${attachment.originalFilename}`;
}

export function buildPieceMetadata({
  driveIds,
  piece,
}: {
  driveIds: ManifestDriveIds;
  piece: BackupPiece;
}) {
  return {
    schemaVersion: 2,
    piece: {
      currentReviewState: piece.currentReviewState,
      deliveryId: piece.deliveryId,
      id: piece.id,
      initialNote: piece.initialNote,
      position: piece.position,
    },
    versions: piece.versions.map((version) => ({
      driveFileId:
        driveIds.versionFileIds?.get(version.id) ?? version.driveFileId,
      fileSizeBytes: Number(version.fileSizeBytes),
      id: version.id,
      mimeType: version.mimeType,
      originalFilename: version.originalFilename,
      relativePath: getPieceVersionAssetRelativePath({ piece, version }),
      reviewState: version.reviewState,
      uploadedAt: version.uploadedAt.toISOString(),
      uploadedByUserId: version.uploadedByUserId,
      versionNumber: version.versionNumber,
    })),
  };
}

export function buildDeliveryManifest({
  driveIds,
  exportedAt,
  snapshot,
}: {
  driveIds: ManifestDriveIds;
  exportedAt: Date;
  snapshot: DeliveryBackupSnapshot;
}) {
  return {
    schemaVersion: 3,
    delivery: {
      createdAt: snapshot.delivery.createdAt.toISOString(),
      createdByUserId: snapshot.delivery.createdByUserId,
      driveFolderId:
        driveIds.deliveryFolderId ?? snapshot.delivery.driveFolderId,
      driveManifestFileId:
        driveIds.manifestFileId ?? snapshot.delivery.driveManifestFileId,
      generalNote: snapshot.delivery.generalNote,
      generatedTitle: snapshot.delivery.generatedTitle,
      id: snapshot.delivery.id,
      status: snapshot.delivery.status,
      submittedAt: snapshot.delivery.submittedAt?.toISOString() ?? null,
      type: snapshot.delivery.type,
      updatedAt: snapshot.delivery.updatedAt.toISOString(),
    },
    users: collectManifestUsers(snapshot),
    pieces: snapshot.pieces.map((piece) => ({
      createdAt: piece.createdAt.toISOString(),
      currentReviewState: piece.currentReviewState,
      deliveryId: piece.deliveryId,
      id: piece.id,
      initialNote: piece.initialNote,
      position: piece.position,
      updatedAt: piece.updatedAt.toISOString(),
      versions: piece.versions.map((version) => ({
        checksum: version.checksum,
        createdAt: version.createdAt.toISOString(),
        driveFileId:
          driveIds.versionFileIds?.get(version.id) ?? version.driveFileId,
        driveFolderId:
          driveIds.versionFolderIds?.get(version.id) ?? version.driveFolderId,
        fileSizeBytes: Number(version.fileSizeBytes),
        id: version.id,
        mimeType: version.mimeType,
        originalFilename: version.originalFilename,
        relativePath: getPieceVersionAssetRelativePath({ piece, version }),
        reviewState: version.reviewState,
        storageKey: version.storageKey,
        uploadedAt: version.uploadedAt.toISOString(),
        uploadedByUserId: version.uploadedByUserId,
        versionNumber: version.versionNumber,
      })),
    })),
    feedback: snapshot.feedback.map((feedback) => ({
      attachmentIds: feedback.attachments.map((attachment) => attachment.id),
      authorUserId: feedback.authorUserId,
      body: feedback.body,
      createdAt: feedback.createdAt.toISOString(),
      deliveryId: feedback.deliveryId,
      id: feedback.id,
      level: feedback.level,
      pieceId: feedback.pieceId,
      pieceVersionId: feedback.pieceVersionId,
      sourceType: feedback.sourceType,
      updatedAt: feedback.updatedAt.toISOString(),
    })),
    attachments: snapshot.feedback.flatMap((feedback) =>
      feedback.attachments.map((attachment) => {
        const piece = snapshot.pieces.find((item) => item.id === feedback.pieceId);
        const version = piece?.versions.find(
          (item) => item.id === feedback.pieceVersionId,
        );

        return {
          createdAt: attachment.createdAt.toISOString(),
          driveFileId:
            driveIds.feedbackAttachmentFileIds?.get(attachment.id) ??
            attachment.driveFileId,
          feedbackId: attachment.feedbackId,
          fileSizeBytes: Number(attachment.fileSizeBytes),
          id: attachment.id,
          mimeType: attachment.mimeType,
          originalFilename: attachment.originalFilename,
          relativePath:
            piece && version
              ? getFeedbackAttachmentRelativePath({
                  attachment,
                  feedback,
                  piece,
                  version,
                })
              : null,
          storageKey: attachment.storageKey,
          uploadedByUserId: attachment.uploadedByUserId,
        };
      }),
    ),
    journal: {
      driveFileId: driveIds.journalFileId,
      format: "jsonl",
    },
    metadata: {
      appVersion: "mvp",
      exportedAt: exportedAt.toISOString(),
    },
  };
}

export function serializeJsonForDrive(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function serializeJournalJsonl(events: BackupJournalEvent[]) {
  return events
    .map((event) =>
      JSON.stringify({
        actorUserId: event.actorUserId,
        createdAt: event.createdAt.toISOString(),
        deliveryId: event.deliveryId,
        entityId: event.entityId,
        entityType: event.entityType,
        eventType: event.eventType,
        id: event.id,
        metadata: event.metadata,
      }),
    )
    .join("\n")
    .concat(events.length > 0 ? "\n" : "");
}

export function serializeVersionFeedbackJsonl(feedbackItems: BackupFeedback[]) {
  return [...feedbackItems]
    .sort(compareFeedbackForBackup)
    .map((feedback) =>
      JSON.stringify({
        authorUserId: feedback.authorUserId,
        attachmentIds: feedback.attachments.map((attachment) => attachment.id),
        body: feedback.body,
        createdAt: feedback.createdAt.toISOString(),
        id: feedback.id,
        level: feedback.level,
        pieceId: feedback.pieceId,
        pieceVersionId: feedback.pieceVersionId,
        sourceType: feedback.sourceType,
        updatedAt: feedback.updatedAt.toISOString(),
      }),
    )
    .join("\n")
    .concat(feedbackItems.length > 0 ? "\n" : "");
}

function collectManifestUsers(snapshot: DeliveryBackupSnapshot) {
  const users = new Map<string, BackupUser>();

  users.set(snapshot.delivery.creator.id, snapshot.delivery.creator);

  for (const piece of snapshot.pieces) {
    for (const version of piece.versions) {
      users.set(version.uploadedBy.id, version.uploadedBy);
    }
  }

  for (const event of snapshot.journalEvents) {
    if (event.actor) {
      users.set(event.actor.id, event.actor);
    }
  }

  for (const feedback of snapshot.feedback) {
    users.set(feedback.author.id, feedback.author);

    for (const attachment of feedback.attachments) {
      users.set(attachment.uploadedBy.id, attachment.uploadedBy);
    }
  }

  return Array.from(users.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function compareFeedbackForBackup(a: BackupFeedback, b: BackupFeedback) {
  const dateComparison = a.createdAt.getTime() - b.createdAt.getTime();

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return a.id.localeCompare(b.id);
}

function padPiecePosition(position: number) {
  return position.toString().padStart(2, "0");
}
