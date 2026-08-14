import {
  DeliveryStatus,
  FeedbackSourceType,
  PieceReviewState,
} from "@prisma/client";

export const MAX_FEEDBACK_BODY_LENGTH = 5000;

export type PieceReviewErrorCode =
  | "DELIVERY_CLOSED"
  | "HISTORICAL_VERSION"
  | "INVALID_REVIEW_STATE"
  | "PIECE_NOT_FOUND";

export class PieceReviewValidationError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code?: PieceReviewErrorCode,
  ) {
    super(message);
    this.name = "PieceReviewValidationError";
  }
}

export function parsePieceReviewState(value: unknown) {
  if (
    value !== PieceReviewState.OK &&
    value !== PieceReviewState.NEEDS_CHANGES
  ) {
    throw new PieceReviewValidationError(
      "Estado de revisión inválido.",
      400,
      "INVALID_REVIEW_STATE",
    );
  }

  return value;
}

export function isPieceReviewStateNoop({
  currentState,
  nextState,
}: {
  currentState: PieceReviewState | null;
  nextState: PieceReviewState;
}) {
  return currentState === nextState;
}

export function normalizeFeedbackBody(value: unknown) {
  if (typeof value !== "string") {
    throw new PieceReviewValidationError("Feedback inválido.");
  }

  const body = value.trim();

  if (!body) {
    throw new PieceReviewValidationError("Escribí un feedback antes de enviarlo.");
  }

  if (body.length > MAX_FEEDBACK_BODY_LENGTH) {
    throw new PieceReviewValidationError(
      `El feedback no puede superar ${MAX_FEEDBACK_BODY_LENGTH} caracteres.`,
    );
  }

  return body;
}

export function assertDeliveryCanBeReviewed(status: DeliveryStatus) {
  if (status === DeliveryStatus.CLOSED) {
    throw new PieceReviewValidationError(
      "La entrega está cerrada.",
      409,
      "DELIVERY_CLOSED",
    );
  }
}

export function getDeliveryStatusAfterPieceReview({
  currentStatus,
  nextReviewState,
}: {
  currentStatus: DeliveryStatus;
  nextReviewState: PieceReviewState;
}) {
  if (
    currentStatus === DeliveryStatus.SENT_FOR_REVIEW &&
    nextReviewState === PieceReviewState.OK
  ) {
    return DeliveryStatus.IN_REVIEW;
  }

  if (
    currentStatus === DeliveryStatus.SENT_FOR_REVIEW &&
    nextReviewState === PieceReviewState.NEEDS_CHANGES
  ) {
    return DeliveryStatus.CHANGES_REQUESTED;
  }

  if (
    currentStatus === DeliveryStatus.IN_REVIEW &&
    nextReviewState === PieceReviewState.NEEDS_CHANGES
  ) {
    return DeliveryStatus.CHANGES_REQUESTED;
  }

  return currentStatus;
}

export function getDeliveryStatusAfterFeedback(currentStatus: DeliveryStatus) {
  if (currentStatus === DeliveryStatus.SENT_FOR_REVIEW) {
    return DeliveryStatus.IN_REVIEW;
  }

  return currentStatus;
}

export function getFeedbackSourceType(isAiLearningSource: boolean) {
  return isAiLearningSource
    ? FeedbackSourceType.TOMI
    : FeedbackSourceType.OTHER;
}

export function buildPieceReviewJournalMetadata({
  pieceVersionId,
  previousState,
  nextState,
  versionNumber,
}: {
  pieceVersionId: string | null;
  previousState: PieceReviewState | null;
  nextState: PieceReviewState;
  versionNumber: number | null;
}) {
  return {
    nextState,
    pieceVersionId,
    previousState,
    versionNumber,
  };
}

export function buildFeedbackJournalMetadata({
  pieceId,
  pieceVersionId,
  sourceType,
}: {
  pieceId: string;
  pieceVersionId: string;
  sourceType: FeedbackSourceType;
}) {
  return {
    level: "PIECE",
    pieceId,
    pieceVersionId,
    sourceType,
  };
}

export function buildDeliveryStatusJournalMetadata({
  previousStatus,
  nextStatus,
  reason,
}: {
  previousStatus: DeliveryStatus;
  nextStatus: DeliveryStatus;
  reason: "feedback-added" | "new-piece-version" | "piece-review";
}) {
  return {
    nextStatus,
    previousStatus,
    reason,
  };
}
