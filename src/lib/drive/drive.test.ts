import assert from "node:assert/strict";

import { FeedbackLevel, FeedbackSourceType, SyncOperationStatus } from "@prisma/client";

import {
  buildDeliveryFolderAppProperties,
  buildDeliveryJournalAppProperties,
  buildDeliveryManifest,
  buildDeliveryManifestAppProperties,
  buildFeedbackAttachmentAppProperties,
  buildPieceFolderAppProperties,
  buildPieceMetadata,
  buildPieceVersionAssetAppProperties,
  buildPieceVersionFeedbackAppProperties,
  buildPieceVersionFolderAppProperties,
  getDeliveryFolderName,
  getPieceFolderName,
  getFeedbackAttachmentRelativePath,
  getPieceVersionAssetRelativePath,
  getPieceVersionFolderName,
  serializeJournalJsonl,
  serializeVersionFeedbackJsonl,
  serializeJsonForDrive,
  type DeliveryBackupSnapshot,
} from "./backup-format";
import { DriveOperationError } from "./errors";
import {
  assertDriveBackupOperationType,
  canStartDriveBackup,
  isSyncedDriveBackup,
} from "./processor-state";
import {
  buildDriveStatusResponse,
  getDriveBackupSummary,
  getDriveStatusLabel,
} from "./status-format";
import {
  getOldestFailedDriveBackupQuery,
  getOldestPendingDriveBackupQuery,
} from "./operation-selection";
import { resolveDriveBackupRefreshAction } from "./enqueue-rules";
import { buildAbsorbedPendingFollowUpsWhere } from "./processor-rules";

const createdAt = new Date("2026-08-13T12:00:00.000Z");
const exportedAt = new Date("2026-08-13T13:00:00.000Z");
const user = {
  email: "visual-review@suquia.local",
  id: "user-1",
  name: "Tomi Preview",
};
const feedbackAuthor = {
  email: "designer@suquia.local",
  id: "user-2",
  name: "Diseño SUQUIA",
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
  feedback: [
    {
      attachments: [
        {
          createdAt: new Date("2026-08-13T12:11:00.000Z"),
          driveFileId: null,
          feedbackId: "feedback-2",
          fileSizeBytes: BigInt(1024),
          id: "attachment-1",
          mimeType: "image/png",
          originalFilename: "ref.png",
          storageKey:
            "deliveries/delivery-1/pieces/piece-1/v1/feedback/feedback-2/references/attachment-1-ref.png",
          uploadedBy: user,
          uploadedByUserId: user.id,
        },
      ],
      author: feedbackAuthor,
      authorUserId: feedbackAuthor.id,
      body: "Ajustar el CTA y mantener el fondo.",
      createdAt: new Date("2026-08-13T12:10:00.000Z"),
      deliveryId: "delivery-1",
      id: "feedback-2",
      level: FeedbackLevel.PIECE,
      pieceId: "piece-1",
      pieceVersionId: "version-1",
      sourceType: FeedbackSourceType.OTHER,
      updatedAt: new Date("2026-08-13T12:10:05.000Z"),
    },
    {
      attachments: [],
      author: user,
      authorUserId: user.id,
      body: "OK para publicar.",
      createdAt: new Date("2026-08-13T12:10:00.000Z"),
      deliveryId: "delivery-1",
      id: "feedback-1",
      level: FeedbackLevel.PIECE,
      pieceId: "piece-1",
      pieceVersionId: "version-1",
      sourceType: FeedbackSourceType.TOMI,
      updatedAt: new Date("2026-08-13T12:10:00.000Z"),
    },
  ],
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
      currentReviewState: "OK",
      deliveryId: "delivery-1",
      id: "piece-1",
      initialNote: "Ajustar copy",
      position: 1,
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
          reviewState: "OK",
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
assert.deepEqual(
  buildPieceVersionFeedbackAppProperties({
    deliveryId: "delivery-1",
    pieceVersionId: "version-1",
  }),
  {
    suquiaDeliveryId: "delivery-1",
    suquiaEntityId: "version-1",
    suquiaEntityType: "piece-version-feedback",
  },
);
assert.deepEqual(
  buildFeedbackAttachmentAppProperties({
    attachmentId: "attachment-1",
    deliveryId: "delivery-1",
    feedbackId: "feedback-2",
    pieceVersionId: "version-1",
  }),
  {
    suquiaDeliveryId: "delivery-1",
    suquiaEntityId: "attachment-1",
    suquiaEntityType: "feedback-attachment",
    suquiaFeedbackId: "feedback-2",
    suquiaPieceVersionId: "version-1",
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
assert.equal(
  getFeedbackAttachmentRelativePath({
    attachment: snapshot.feedback[0].attachments[0],
    feedback: snapshot.feedback[0],
    piece: snapshot.pieces[0],
    version: snapshot.pieces[0].versions[0],
  }),
  "pieces/01-piece-1/versions/V1-version-1/references/feedback-2/attachment-1-ref.png",
);

const driveIds = {
  deliveryFolderId: "drive-delivery-folder",
  journalFileId: "drive-journal",
  manifestFileId: "drive-manifest",
  feedbackAttachmentFileIds: new Map([["attachment-1", "drive-attachment-file"]]),
  versionFileIds: new Map([["version-1", "drive-version-file"]]),
  versionFolderIds: new Map([["version-1", "drive-version-folder"]]),
};
const metadata = buildPieceMetadata({
  driveIds,
  piece: snapshot.pieces[0],
});
assert.equal(metadata.schemaVersion, 2);
assert.equal(metadata.versions[0].driveFileId, "drive-version-file");
assert.equal(metadata.versions[0].fileSizeBytes, 2048);
assert.equal(metadata.piece.currentReviewState, "OK");
assert.equal(metadata.versions[0].reviewState, "OK");

const manifest = buildDeliveryManifest({ driveIds, exportedAt, snapshot });
assert.equal(manifest.schemaVersion, 3);
assert.equal(manifest.delivery.driveManifestFileId, "drive-manifest");
assert.equal(manifest.journal.driveFileId, "drive-journal");
assert.equal(manifest.pieces[0].versions[0].driveFileId, "drive-version-file");
assert.equal(manifest.pieces[0].currentReviewState, "OK");
assert.equal(manifest.pieces[0].versions[0].reviewState, "OK");
assert.equal(manifest.feedback.length, 2);
assert.equal(manifest.feedback[0].id, "feedback-2");
assert.equal(manifest.feedback[0].pieceVersionId, "version-1");
assert.equal(manifest.feedback[0].sourceType, FeedbackSourceType.OTHER);
assert.equal(manifest.feedback[0].body, "Ajustar el CTA y mantener el fondo.");
assert.deepEqual(manifest.feedback[0].attachmentIds, ["attachment-1"]);
assert.deepEqual(
  manifest.users.map((item) => item.id),
  ["user-1", "user-2"],
);
assert.equal(manifest.attachments.length, 1);
assert.equal(manifest.attachments[0].id, "attachment-1");
assert.equal(manifest.attachments[0].driveFileId, "drive-attachment-file");
assert.equal(
  manifest.attachments[0].relativePath,
  "pieces/01-piece-1/versions/V1-version-1/references/feedback-2/attachment-1-ref.png",
);
assert.match(serializeJsonForDrive(manifest), /"schemaVersion": 3,/);

assert.equal(
  serializeJournalJsonl(snapshot.journalEvents),
  '{"actorUserId":"user-1","createdAt":"2026-08-13T12:00:00.000Z","deliveryId":"delivery-1","entityId":"delivery-1","entityType":"DELIVERY","eventType":"DELIVERY_SUBMITTED","id":"journal-1","metadata":{"pieceCount":1}}\n',
);
assert.equal(
  serializeVersionFeedbackJsonl(snapshot.feedback),
  '{"authorUserId":"user-1","attachmentIds":[],"body":"OK para publicar.","createdAt":"2026-08-13T12:10:00.000Z","id":"feedback-1","level":"PIECE","pieceId":"piece-1","pieceVersionId":"version-1","sourceType":"TOMI","updatedAt":"2026-08-13T12:10:00.000Z"}\n{"authorUserId":"user-2","attachmentIds":["attachment-1"],"body":"Ajustar el CTA y mantener el fondo.","createdAt":"2026-08-13T12:10:00.000Z","id":"feedback-2","level":"PIECE","pieceId":"piece-1","pieceVersionId":"version-1","sourceType":"OTHER","updatedAt":"2026-08-13T12:10:05.000Z"}\n',
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

assert.equal(
  getDriveBackupSummary({
    counts: { failed: 1, pending: 3, syncing: 2 },
    status: "CONNECTED",
  }),
  "1 backup con error",
);
assert.equal(
  getDriveBackupSummary({
    counts: { failed: 0, pending: 3, syncing: 2 },
    status: "CONNECTED",
  }),
  "Sincronizando backup...",
);
assert.equal(
  getDriveBackupSummary({
    counts: { failed: 0, pending: 3, syncing: 0 },
    status: "CONNECTED",
  }),
  "3 backups pendientes",
);
assert.equal(
  getDriveBackupSummary({
    counts: { failed: 0, pending: 0, syncing: 0 },
    status: "CONNECTED",
  }),
  "Todo sincronizado",
);
assert.equal(
  getDriveStatusLabel({ isChecking: true, status: "CONNECTED" }),
  "Verificando Drive...",
);

assert.deepEqual(
  buildDriveStatusResponse({
    counts: { failed: 0, pending: 0, syncing: 0 },
    state: null,
  }),
  {
    backups: { failed: 0, pending: 0, syncing: 0 },
    drive: {
      lastCheckedAt: null,
      lastErrorCode: null,
      lastSuccessAt: null,
      status: "UNKNOWN",
    },
  },
);

assert.equal(
  getOldestPendingDriveBackupQuery().where.status,
  SyncOperationStatus.PENDING,
);
assert.deepEqual(
  getOldestPendingDriveBackupQuery().where.delivery,
  {
    is: {
      syncOperations: {
        none: {
          status: SyncOperationStatus.FAILED,
          type: "DRIVE_BACKUP_DELIVERY",
        },
      },
    },
  },
);
assert.equal(
  getOldestFailedDriveBackupQuery().where.status,
  SyncOperationStatus.FAILED,
);
assert.notEqual(
  getOldestPendingDriveBackupQuery().where.status,
  getOldestFailedDriveBackupQuery().where.status,
);

assert.equal(resolveDriveBackupRefreshAction([]), null);
assert.equal(
  resolveDriveBackupRefreshAction([
    { id: "synced-1", status: SyncOperationStatus.SYNCED },
  ]),
  null,
);
assert.deepEqual(
  resolveDriveBackupRefreshAction([
    { id: "pending-1", status: SyncOperationStatus.PENDING },
  ]),
  {
    action: "reused-pending",
    syncOperationId: "pending-1",
  },
);
assert.deepEqual(
  resolveDriveBackupRefreshAction([
    { id: "failed-1", status: SyncOperationStatus.FAILED },
  ]),
  {
    action: "blocked-by-failed",
    syncOperationId: "failed-1",
  },
);
assert.deepEqual(
  resolveDriveBackupRefreshAction([
    { id: "failed-1", status: SyncOperationStatus.FAILED },
    { id: "pending-1", status: SyncOperationStatus.PENDING },
  ]),
  {
    action: "blocked-by-failed",
    syncOperationId: "failed-1",
  },
);
assert.equal(
  resolveDriveBackupRefreshAction([
    { id: "syncing-1", status: SyncOperationStatus.SYNCING },
  ]),
  null,
);
assert.deepEqual(
  resolveDriveBackupRefreshAction([
    { id: "syncing-1", status: SyncOperationStatus.SYNCING },
    { id: "pending-2", status: SyncOperationStatus.PENDING },
  ]),
  {
    action: "reused-pending",
    syncOperationId: "pending-2",
  },
);

assert.deepEqual(
  buildAbsorbedPendingFollowUpsWhere({
    deliveryId: "delivery-1",
    syncOperationId: "syncing-operation",
  }),
  {
    deliveryId: "delivery-1",
    id: { not: "syncing-operation" },
    status: SyncOperationStatus.PENDING,
    type: "DRIVE_BACKUP_DELIVERY",
  },
);

const retryStartedAt = new Date("2026-08-13T13:20:00.000Z");
assert.deepEqual(
  buildAbsorbedPendingFollowUpsWhere({
    createdAtLte: retryStartedAt,
    deliveryId: "delivery-1",
    syncOperationId: "retry-operation",
  }),
  {
    createdAt: {
      lte: retryStartedAt,
    },
    deliveryId: "delivery-1",
    id: { not: "retry-operation" },
    status: SyncOperationStatus.PENDING,
    type: "DRIVE_BACKUP_DELIVERY",
  },
);

console.log("drive unit tests passed");
