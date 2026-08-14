import assert from "node:assert/strict";

import { FeedbackSourceType } from "@prisma/client";

import {
  assertExistingFeedbackMatchesReceipt,
  type ExistingFeedbackForAttempt,
} from "./piece-feedback-attempt-rules";
import { PieceReviewValidationError } from "./piece-review-rules";

const existingFeedback: ExistingFeedbackForAttempt = {
  attachments: [
    {
      fileSizeBytes: BigInt(1234),
      id: "attachment-2",
      mimeType: "image/png",
      originalFilename: "second.png",
      storageKey: "feedback/second.png",
      uploadedByUserId: "user-1",
    },
    {
      fileSizeBytes: BigInt(5678),
      id: "attachment-1",
      mimeType: "image/jpeg",
      originalFilename: "first.jpg",
      storageKey: "feedback/first.jpg",
      uploadedByUserId: "user-1",
    },
  ],
  authorUserId: "user-1",
  body: "Comentario final",
  deliveryId: "delivery-1",
  pieceId: "piece-1",
  pieceVersionId: "piece-version-1",
  sourceType: FeedbackSourceType.TOMI,
};

assert.doesNotThrow(() =>
  assertExistingFeedbackMatchesReceipt(existingFeedback, {
    attachments: [
      {
        fileSizeBytes: 5678,
        filename: " first.jpg ",
        id: "attachment-1",
        mimeType: "image/jpeg",
        storageKey: "feedback/first.jpg",
      },
      {
        fileSizeBytes: 1234,
        filename: "second.png",
        id: "attachment-2",
        mimeType: "image/png",
        storageKey: "feedback/second.png",
      },
    ],
    authorUserId: "user-1",
    body: "Comentario final",
    deliveryId: "delivery-1",
    pieceId: "piece-1",
    pieceVersionId: "piece-version-1",
    sourceType: FeedbackSourceType.TOMI,
  }),
);

assertFeedbackAttemptConflict(() =>
  assertExistingFeedbackMatchesReceipt(existingFeedback, {
    attachments: [
      {
        fileSizeBytes: 5678,
        filename: "first.jpg",
        id: "attachment-1",
        mimeType: "image/jpeg",
        storageKey: "feedback/first.jpg",
      },
      {
        fileSizeBytes: 1234,
        filename: "second.png",
        id: "attachment-2",
        mimeType: "image/png",
        storageKey: "feedback/second.png",
      },
    ],
    authorUserId: "user-1",
    body: "Comentario cambiado",
    deliveryId: "delivery-1",
    pieceId: "piece-1",
    pieceVersionId: "piece-version-1",
    sourceType: FeedbackSourceType.TOMI,
  }),
);

assertFeedbackAttemptConflict(() =>
  assertExistingFeedbackMatchesReceipt(existingFeedback, {
    attachments: [
      {
        fileSizeBytes: 5678,
        filename: "first.jpg",
        id: "attachment-1",
        mimeType: "image/jpeg",
        storageKey: "feedback/first.jpg",
      },
    ],
    authorUserId: "user-1",
    body: "Comentario final",
    deliveryId: "delivery-1",
    pieceId: "piece-1",
    pieceVersionId: "piece-version-1",
    sourceType: FeedbackSourceType.TOMI,
  }),
);

assertFeedbackAttemptConflict(() =>
  assertExistingFeedbackMatchesReceipt(existingFeedback, {
    attachments: [
      {
        fileSizeBytes: 5678,
        filename: "first.jpg",
        id: "attachment-1",
        mimeType: "image/jpeg",
        storageKey: "feedback/first.jpg",
      },
      {
        fileSizeBytes: 1234,
        filename: "second.png",
        id: "attachment-2",
        mimeType: "image/png",
        storageKey: "feedback/second.png",
      },
    ],
    authorUserId: "user-2",
    body: "Comentario final",
    deliveryId: "delivery-1",
    pieceId: "piece-1",
    pieceVersionId: "piece-version-1",
    sourceType: FeedbackSourceType.TOMI,
  }),
);

function assertFeedbackAttemptConflict(callback: () => void) {
  assert.throws(callback, (error) => {
    assert.equal(error instanceof PieceReviewValidationError, true);
    assert.equal((error as PieceReviewValidationError).status, 409);
    assert.equal(
      (error as PieceReviewValidationError).code,
      "FEEDBACK_ATTEMPT_CONFLICT",
    );
    return true;
  });
}

console.log("piece feedback attempt rules unit tests passed");
