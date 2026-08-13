import assert from "node:assert/strict";

import { SyncOperationStatus } from "@prisma/client";

import {
  buildDeliveryFolderAppProperties,
  buildDeliveryJournalAppProperties,
  buildDeliveryManifest,
  buildDeliveryManifestAppProperties,
  buildPieceFolderAppProperties,
  buildPieceMetadata,
  buildPieceVersionAssetAppProperties,
  buildPieceVersionFolderAppProperties,
  getDeliveryFolderName,
  getPieceFolderName,
  getPieceVersionAssetRelativePath,
  getPieceVersionFolderName,
  serializeJournalJsonl,
  serializeJsonForDrive,
  type DeliveryBackupSnapshot,
} from "./backup-format";
import { DriveOperationError } from "./errors";
import {
  assertDriveBackupOperationType,
  canStartDriveBackup,
  isSyncedDriveBackup,
} from "./processor-state";

const createdAt = new Date("2026-08-13T12:00:00.000Z");
const exportedAt = new Date("2026-08-13T13:00:00.000Z");
const user = {
  email: "visual-review@suquia.local",
  id: "user-1",
  name: "Tomi Preview",
};
const snapshot: DeliveryBackupSnapshot = {
  delivery: {
    createdAt,
    createdByUserId: user.id,
    creator: user,
    driveFolderId: "drive-delivery-folder",
    driveManifestFileId: null,
    generalNote: "Nota general",
    generatedTitle: "Stories · 13 ago · 1 pieza",
    id: "delivery-1",
    status: "SENT_FOR_REVIEW",
    submittedAt: createdAt,
    type: "STORIES",
    updatedAt: createdAt,
  },
  journalEvents: [
    {
      actor: user,
      actorUserId: user.id,
      createdAt,
      deliveryId: "delivery-1",
      entityId: "delivery-1",
      entityType: "DELIVERY",
      eventType: "DELIVERY_SUBMITTED",
      id: "journal-1",
      metadata: { pieceCount: 1 },
    },
  ],
  pieces: [
    {
      createdAt,
      deliveryId: "delivery-1",
      id: "piece-1",
      initialNote: "Ajustar copy",
      position: 1,
      reviewState: "OK",
      updatedAt: createdAt,
      versions: [
        {
          checksum: null,
          createdAt,
          driveFileId: null,
          driveFolderId: null,
          fileSizeBytes: BigInt(2048),
          id: "version-1",
          mimeType: "image/png",
          originalFilename: "story.png",
          storageKey: "deliveries/delivery-1/pieces/piece-1/v1/story.png",
          uploadedAt: createdAt,
          uploadedBy: user,
          uploadedByUserId: user.id,
          versionNumber: 1,
        },
      ],
    },
  ],
};

assert.deepEqual(buildDeliveryFolderAppProperties("delivery-1"), {
  suquiaEntityId: "delivery-1",
  suquiaEntityType: "delivery",
});
assert.deepEqual(
  buildPieceFolderAppProperties({
    deliveryId: "delivery-1",
    pieceId: "piece-1",
  }),
  {
    suquiaDeliveryId: "delivery-1",
    suquiaEntityId: "piece-1",
    suquiaEntityType: "piece",
  },
);
assert.deepEqual(
  buildPieceVersionFolderAppProperties({
    deliveryId: "delivery-1",
    pieceVersionId: "version-1",
  }),
  {
    suquiaDeliveryId: "delivery-1",
    suquiaEntityId: "version-1",
    suquiaEntityType: "piece-version",
  },
);
assert.deepEqual(
  buildPieceVersionAssetAppProperties({
    deliveryId: "delivery-1",
    pieceVersionId: "version-1",
  }),
  {
    suquiaDeliveryId: "delivery-1",
    suquiaEntityId: "version-1",
    suquiaEntityType: "piece-version-asset",
  },
);
assert.deepEqual(buildDeliveryManifestAppProperties("delivery-1"), {
  suquiaEntityId: "delivery-1",
  suquiaEntityType: "delivery-manifest",
});
assert.deepEqual(buildDeliveryJournalAppProperties("delivery-1"), {
  suquiaEntityId: "delivery-1",
  suquiaEntityType: "delivery-journal",
});

assert.equal(getDeliveryFolderName("delivery-1"), "delivery-1");
assert.equal(getPieceFolderName({ id: "piece-1", position: 1 }), "01-piece-1");
assert.equal(
  getPieceVersionFolderName({ id: "version-1", versionNumber: 1 }),
  "V1-version-1",
);
assert.equal(
  getPieceVersionAssetRelativePath({
    piece: snapshot.pieces[0],
    version: snapshot.pieces[0].versions[0],
  }),
  "pieces/01-piece-1/versions/V1-version-1/story.png",
);

const driveIds = {
  deliveryFolderId: "drive-delivery-folder",
  journalFileId: "drive-journal",
  manifestFileId: "drive-manifest",
  versionFileIds: new Map([["version-1", "drive-version-file"]]),
  versionFolderIds: new Map([["version-1", "drive-version-folder"]]),
};
const metadata = buildPieceMetadata({
  driveIds,
  piece: snapshot.pieces[0],
});
assert.equal(metadata.schemaVersion, 1);
assert.equal(metadata.versions[0].driveFileId, "drive-version-file");
assert.equal(metadata.versions[0].fileSizeBytes, 2048);

const manifest = buildDeliveryManifest({ driveIds, exportedAt, snapshot });
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.delivery.driveManifestFileId, "drive-manifest");
assert.equal(manifest.journal.driveFileId, "drive-journal");
assert.equal(manifest.pieces[0].versions[0].driveFileId, "drive-version-file");
assert.equal(manifest.feedback.length, 0);
assert.equal(manifest.attachments.length, 0);
assert.match(serializeJsonForDrive(manifest), /"schemaVersion": 1,/);

assert.equal(
  serializeJournalJsonl(snapshot.journalEvents),
  '{"actorUserId":"user-1","createdAt":"2026-08-13T12:00:00.000Z","deliveryId":"delivery-1","entityId":"delivery-1","entityType":"DELIVERY","eventType":"DELIVERY_SUBMITTED","id":"journal-1","metadata":{"pieceCount":1}}\n',
);

assert.equal(canStartDriveBackup(SyncOperationStatus.PENDING), true);
assert.equal(canStartDriveBackup(SyncOperationStatus.FAILED), true);
assert.equal(canStartDriveBackup(SyncOperationStatus.SYNCING), false);
assert.equal(isSyncedDriveBackup(SyncOperationStatus.SYNCED), true);
assert.doesNotThrow(() =>
  assertDriveBackupOperationType("DRIVE_BACKUP_DELIVERY"),
);
assert.throws(
  () => assertDriveBackupOperationType("AI_PROCESS_FEEDBACK"),
  DriveOperationError,
);

console.log("drive unit tests passed");
