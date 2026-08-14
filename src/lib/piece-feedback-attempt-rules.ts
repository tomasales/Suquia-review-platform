import type { FeedbackSourceType } from "@prisma/client";

import { PieceReviewValidationError } from "@/lib/piece-review-rules";

export type FeedbackAttachmentAttemptInput = {
  fileSizeBytes: number;
  filename: string;
  id: string;
  mimeType: string;
  storageKey: string;
};

export type ExistingFeedbackAttachmentForAttempt = {
  fileSizeBytes: bigint;
  id: string;
  mimeType: string;
  originalFilename: string;
  storageKey: string | null;
  uploadedByUserId: string;
};

export type ExistingFeedbackForAttempt = {
  attachments: ExistingFeedbackAttachmentForAttempt[];
  authorUserId: string;
  body: string;
  deliveryId: string;
  pieceId: string | null;
  pieceVersionId: string | null;
  sourceType: FeedbackSourceType;
};

export function assertExistingFeedbackMatchesReceipt(
  feedback: ExistingFeedbackForAttempt,
  {
    attachments,
    authorUserId,
    body,
    deliveryId,
    pieceId,
    pieceVersionId,
    sourceType,
  }: {
    attachments: FeedbackAttachmentAttemptInput[];
    authorUserId: string;
    body: string;
    deliveryId: string;
    pieceId: string;
    pieceVersionId: string;
    sourceType: FeedbackSourceType;
  },
) {
  const expectedAttachments = [...attachments].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const actualAttachments = [...feedback.attachments].sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  if (
    feedback.authorUserId !== authorUserId ||
    feedback.body !== body ||
    feedback.deliveryId !== deliveryId ||
    feedback.pieceId !== pieceId ||
    feedback.pieceVersionId !== pieceVersionId ||
    feedback.sourceType !== sourceType ||
    actualAttachments.length !== expectedAttachments.length
  ) {
    throwFeedbackAttemptConflict();
  }

  for (const [index, expected] of expectedAttachments.entries()) {
    const actual = actualAttachments[index];

    if (
      !actual ||
      actual.id !== expected.id ||
      actual.fileSizeBytes !== BigInt(expected.fileSizeBytes) ||
      actual.mimeType !== expected.mimeType ||
      actual.originalFilename !== expected.filename.trim() ||
      actual.storageKey !== expected.storageKey ||
      actual.uploadedByUserId !== authorUserId
    ) {
      throwFeedbackAttemptConflict();
    }
  }
}

function throwFeedbackAttemptConflict(): never {
  throw new PieceReviewValidationError(
    "El intento de feedback no coincide.",
    409,
    "FEEDBACK_ATTEMPT_CONFLICT",
  );
}
