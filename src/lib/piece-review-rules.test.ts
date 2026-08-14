import assert from "node:assert/strict";

import {
  DeliveryStatus,
  FeedbackSourceType,
  PieceReviewState,
} from "@prisma/client";

import {
  assertDeliveryCanBeReviewed,
  buildFeedbackJournalMetadata,
  buildDeliveryStatusJournalMetadata,
  getDeliveryStatusAfterFeedback,
  getDeliveryStatusAfterPieceReview,
  getFeedbackSourceType,
  isPieceReviewStateNoop,
  normalizeFeedbackBody,
  parsePieceReviewState,
  PieceReviewValidationError,
} from "@/lib/piece-review-rules";

assert.equal(parsePieceReviewState("OK"), PieceReviewState.OK);
assert.equal(
  parsePieceReviewState("NEEDS_CHANGES"),
  PieceReviewState.NEEDS_CHANGES,
);
assert.throws(
  () => parsePieceReviewState("PENDING"),
  (error) =>
    error instanceof PieceReviewValidationError &&
    error.code === "INVALID_REVIEW_STATE",
);
assert.equal(
  isPieceReviewStateNoop({
    currentState: PieceReviewState.OK,
    nextState: PieceReviewState.OK,
  }),
  true,
);
assert.equal(
  isPieceReviewStateNoop({
    currentState: null,
    nextState: PieceReviewState.OK,
  }),
  false,
);

assert.equal(normalizeFeedbackBody("  Ajustar CTA.  "), "Ajustar CTA.");
assert.throws(() => normalizeFeedbackBody("   "));

assert.equal(
  getDeliveryStatusAfterPieceReview({
    currentStatus: DeliveryStatus.SENT_FOR_REVIEW,
    nextReviewState: PieceReviewState.OK,
  }),
  DeliveryStatus.IN_REVIEW,
);
assert.equal(
  getDeliveryStatusAfterPieceReview({
    currentStatus: DeliveryStatus.SENT_FOR_REVIEW,
    nextReviewState: PieceReviewState.NEEDS_CHANGES,
  }),
  DeliveryStatus.CHANGES_REQUESTED,
);
assert.equal(
  getDeliveryStatusAfterPieceReview({
    currentStatus: DeliveryStatus.IN_REVIEW,
    nextReviewState: PieceReviewState.NEEDS_CHANGES,
  }),
  DeliveryStatus.CHANGES_REQUESTED,
);
assert.equal(
  getDeliveryStatusAfterPieceReview({
    currentStatus: DeliveryStatus.CHANGES_REQUESTED,
    nextReviewState: PieceReviewState.OK,
  }),
  DeliveryStatus.CHANGES_REQUESTED,
);
assert.equal(
  getDeliveryStatusAfterPieceReview({
    currentStatus: DeliveryStatus.APPROVED,
    nextReviewState: PieceReviewState.OK,
  }),
  DeliveryStatus.APPROVED,
);

assert.equal(
  getDeliveryStatusAfterFeedback(DeliveryStatus.SENT_FOR_REVIEW),
  DeliveryStatus.IN_REVIEW,
);
assert.equal(
  getDeliveryStatusAfterFeedback(DeliveryStatus.CHANGES_REQUESTED),
  DeliveryStatus.CHANGES_REQUESTED,
);

assert.throws(
  () => assertDeliveryCanBeReviewed(DeliveryStatus.CLOSED),
  (error) =>
    error instanceof PieceReviewValidationError &&
    error.code === "DELIVERY_CLOSED",
);
assert.doesNotThrow(() =>
  assertDeliveryCanBeReviewed(DeliveryStatus.IN_REVIEW),
);

assert.equal(getFeedbackSourceType(true), FeedbackSourceType.TOMI);
assert.equal(getFeedbackSourceType(false), FeedbackSourceType.OTHER);

const feedbackMetadata = buildFeedbackJournalMetadata({
  attachmentIds: ["attachment-1"],
  pieceId: "piece-1",
  pieceVersionId: "version-1",
  sourceType: FeedbackSourceType.TOMI,
});

assert.deepEqual(feedbackMetadata, {
  attachmentCount: 1,
  attachmentIds: ["attachment-1"],
  level: "PIECE",
  pieceId: "piece-1",
  pieceVersionId: "version-1",
  sourceType: FeedbackSourceType.TOMI,
});
assert.equal("body" in feedbackMetadata, false);

assert.deepEqual(
  buildDeliveryStatusJournalMetadata({
    nextStatus: DeliveryStatus.SENT_FOR_REVIEW,
    previousStatus: DeliveryStatus.CHANGES_REQUESTED,
    reason: "new-piece-version",
  }),
  {
    nextStatus: DeliveryStatus.SENT_FOR_REVIEW,
    previousStatus: DeliveryStatus.CHANGES_REQUESTED,
    reason: "new-piece-version",
  },
);
