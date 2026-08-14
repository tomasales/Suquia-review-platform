import assert from "node:assert/strict";

import { readR2ConfigFromEnv } from "./config";
import { StorageConfigurationError, StorageValidationError } from "./errors";
import {
  buildFeedbackAttachmentStorageKey,
  buildGuidelineStorageKey,
  buildPendingStorageKey,
  buildPieceVersionStorageKey,
  sanitizeFilename,
} from "./keys";
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  validateUploadUrlInput,
} from "./validation";

function assertThrowsStorageValidation(fn: () => void) {
  assert.throws(fn, StorageValidationError);
}

function assertThrowsStorageConfig(fn: () => void) {
  assert.throws(fn, StorageConfigurationError);
}

validateUploadUrlInput({
  fileSizeBytes: 1024,
  filename: "pieza.png",
  mimeType: "image/png",
  purpose: "piece-version",
});

assertThrowsStorageValidation(() =>
  validateUploadUrlInput({
    fileSizeBytes: 1024,
    filename: "pieza.gif",
    mimeType: "image/gif",
    purpose: "piece-version",
  }),
);

assertThrowsStorageValidation(() =>
  validateUploadUrlInput({
    fileSizeBytes: 0,
    filename: "pieza.png",
    mimeType: "image/png",
    purpose: "piece-version",
  }),
);

assertThrowsStorageValidation(() =>
  validateUploadUrlInput({
    fileSizeBytes: MAX_UPLOAD_FILE_SIZE_BYTES + 1,
    filename: "pieza.png",
    mimeType: "image/png",
    purpose: "piece-version",
  }),
);

assert.equal(sanitizeFilename(" Pieza final áé.png "), "Pieza-final-ae.png");
assert.equal(sanitizeFilename("///"), "archivo");

const pendingKey = buildPendingStorageKey({
  filename: "pieza final.png",
  purpose: "piece-version",
  userId: "user-1",
});
assert.match(pendingKey, /^pending\/user-1\/piece-version\/.+\/pieza-final.png$/);

assert.match(
  buildPieceVersionStorageKey({
    deliveryId: "delivery-1",
    filename: "story.jpg",
    pieceId: "piece-1",
    versionNumber: 1,
  }),
  /^deliveries\/delivery-1\/pieces\/piece-1\/v1\/.+-story.jpg$/,
);

assert.match(
  buildFeedbackAttachmentStorageKey({
    attachmentId: "attachment-1",
    deliveryId: "delivery-1",
    feedbackId: "feedback-1",
    filename: "ref.webp",
    pieceId: "piece-1",
    versionNumber: 2,
  }),
  /^deliveries\/delivery-1\/pieces\/piece-1\/v2\/feedback\/feedback-1\/references\/attachment-1-ref.webp$/,
);

assert.match(
  buildGuidelineStorageKey({
    filename: "manual.png",
    guidelineId: "guideline-1",
  }),
  /^guidelines\/guideline-1\/.+-manual.png$/,
);

const config = readR2ConfigFromEnv({
  R2_ACCESS_KEY_ID: "access-key",
  R2_ACCOUNT_ID: "account-id",
  R2_BUCKET_NAME: "bucket",
  R2_SECRET_ACCESS_KEY: "secret",
});
assert.equal(
  config.endpoint,
  "https://account-id.r2.cloudflarestorage.com",
);

assertThrowsStorageConfig(() =>
  readR2ConfigFromEnv({
    R2_ACCESS_KEY_ID: "access-key",
    R2_ACCOUNT_ID: "account-id",
    R2_BUCKET_NAME: "bucket",
    R2_ENDPOINT: "http://example.com",
    R2_SECRET_ACCESS_KEY: "secret",
  }),
);

console.log("storage unit tests passed");
