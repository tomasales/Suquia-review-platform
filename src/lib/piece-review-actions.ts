import "server-only";

import { FeedbackLevel, type Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { lockDeliveryForMutation } from "@/lib/delivery-mutation-lock";
import type { PieceFeedbackAttachmentsReceiptPayload } from "@/lib/delivery-upload-receipt";
import { enqueueDriveBackupRefresh } from "@/lib/drive/enqueue";
import { lockPieceForMutation } from "@/lib/piece-mutation-lock";
import {
  assertDeliveryCanBeReviewed,
  buildDeliveryStatusJournalMetadata,
  buildFeedbackJournalMetadata,
  buildPieceReviewJournalMetadata,
  getDeliveryStatusAfterFeedback,
  getDeliveryStatusAfterPieceReview,
  getFeedbackSourceType,
  isPieceReviewStateNoop,
  normalizeFeedbackBody,
  parsePieceReviewState,
  PieceReviewValidationError,
} from "@/lib/piece-review-rules";
import {
  getPublicStorageErrorMessage,
  StorageConfigurationError,
  StorageUploadError,
  StorageValidationError,
} from "@/lib/storage/errors";
import { createReadUrl } from "@/lib/storage/storage";

type ReviewUser = {
  email: string;
  id: string;
  isAiLearningSource: boolean;
  name: string | null;
};

type FeedbackAttachmentInput = {
  fileSizeBytes: number;
  filename: string;
  id: string;
  mimeType: string;
  storageKey: string;
};

const feedbackDtoSelect = {
  attachments: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      createdAt: true,
      fileSizeBytes: true,
      id: true,
      mimeType: true,
      originalFilename: true,
      storageKey: true,
      uploadedBy: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  },
  author: {
    select: {
      email: true,
      name: true,
    },
  },
  authorUserId: true,
  body: true,
  createdAt: true,
  id: true,
  pieceId: true,
  pieceVersionId: true,
  sourceType: true,
} satisfies Prisma.FeedbackSelect;

type FeedbackForDto = Prisma.FeedbackGetPayload<{
  select: typeof feedbackDtoSelect;
}>;

const feedbackDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

export async function updatePieceReviewState({
  pieceId,
  pieceVersionId,
  reviewState,
  userId,
}: {
  pieceId: string;
  pieceVersionId: unknown;
  reviewState: unknown;
  userId: string;
}) {
  const nextReviewState = parsePieceReviewState(reviewState);

  if (typeof pieceVersionId !== "string" || !pieceVersionId.trim()) {
    throw new PieceReviewValidationError("Versión de pieza inválida.");
  }

  const deliveryId = await getPieceDeliveryId(pieceId);

  return db.$transaction(async (tx) => {
    await lockDeliveryForMutation(tx, deliveryId);
    await lockPieceForMutation(tx, pieceId);

    const piece = await tx.piece.findUnique({
      where: { id: pieceId },
      select: {
        id: true,
        delivery: {
          select: {
            deletedAt: true,
            id: true,
            status: true,
          },
        },
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
          select: {
            id: true,
            reviewState: true,
            versionNumber: true,
          },
          take: 1,
        },
      },
    });

    if (!piece || piece.delivery.id !== deliveryId || piece.delivery.deletedAt) {
      throw new PieceReviewValidationError(
        "La pieza no existe.",
        404,
        "PIECE_NOT_FOUND",
      );
    }

    assertDeliveryCanBeReviewed(piece.delivery.status);

    const latestVersion = piece.versions[0] ?? null;

    if (!latestVersion || latestVersion.id !== pieceVersionId) {
      throw new PieceReviewValidationError(
        "Esta versión ya forma parte del historial.",
        409,
        "HISTORICAL_VERSION",
      );
    }

    if (
      isPieceReviewStateNoop({
        currentState: latestVersion.reviewState,
        nextState: nextReviewState,
      })
    ) {
      return {
        delivery: {
          id: piece.delivery.id,
          status: piece.delivery.status,
        },
        piece: {
          id: piece.id,
          reviewState: latestVersion.reviewState,
          versionId: latestVersion.id,
        },
      };
    }

    const nextDeliveryStatus = getDeliveryStatusAfterPieceReview({
      currentStatus: piece.delivery.status,
      nextReviewState,
    });

    await tx.pieceVersion.update({
      data: {
        reviewState: nextReviewState,
      },
      where: {
        id: latestVersion.id,
      },
    });

    if (nextDeliveryStatus !== piece.delivery.status) {
      await tx.delivery.update({
        data: {
          status: nextDeliveryStatus,
        },
        where: {
          id: piece.delivery.id,
        },
      });
    }

    await tx.journalEvent.create({
      data: {
        actorUserId: userId,
        deliveryId: piece.delivery.id,
        entityId: piece.id,
        entityType: "PIECE",
        eventType: "PIECE_REVIEW_STATE_CHANGED",
        metadata: buildPieceReviewJournalMetadata({
          nextState: nextReviewState,
          pieceVersionId: latestVersion.id,
          previousState: latestVersion.reviewState,
          versionNumber: latestVersion.versionNumber,
        }),
      },
    });

    if (nextDeliveryStatus !== piece.delivery.status) {
      await tx.journalEvent.create({
        data: {
          actorUserId: userId,
          deliveryId: piece.delivery.id,
          entityId: piece.delivery.id,
          entityType: "DELIVERY",
          eventType: "DELIVERY_STATUS_CHANGED",
          metadata: buildDeliveryStatusJournalMetadata({
            nextStatus: nextDeliveryStatus,
            previousStatus: piece.delivery.status,
            reason: "piece-review",
          }),
        },
      });
    }

    await enqueueDriveBackupRefresh(tx, {
      createdByUserId: userId,
      deliveryId: piece.delivery.id,
      entityId: piece.id,
      entityType: "PIECE",
      reason: "piece-review",
    });

    return {
      delivery: {
        id: piece.delivery.id,
        status: nextDeliveryStatus,
      },
      piece: {
        id: piece.id,
        reviewState: nextReviewState,
        versionId: latestVersion.id,
      },
    };
  });
}

export async function addPieceFeedback({
  body,
  pieceId,
  pieceVersionId,
  user,
}: {
  body: unknown;
  pieceId: string;
  pieceVersionId: unknown;
  user: ReviewUser;
}) {
  const normalizedBody = normalizeFeedbackBody(body);

  if (typeof pieceVersionId !== "string" || !pieceVersionId.trim()) {
    throw new PieceReviewValidationError("Versión de pieza inválida.");
  }

  const sourceType = getFeedbackSourceType(user.isAiLearningSource);
  const deliveryId = await getPieceDeliveryId(pieceId);

  const result = await db.$transaction(async (tx) => {
    return addPieceFeedbackInTransaction(tx, {
      attachments: [],
      body: normalizedBody,
      deliveryId,
      pieceId,
      pieceVersionId,
      sourceType,
      user,
    });
  });

  return {
    delivery: result.delivery,
    feedback: await toPieceFeedbackDto(result.feedback),
  };
}

export async function addPieceFeedbackWithAttachments({
  body,
  pieceId,
  receipt,
  user,
}: {
  body: unknown;
  pieceId: string;
  receipt: PieceFeedbackAttachmentsReceiptPayload;
  user: ReviewUser;
}) {
  const normalizedBody = normalizeFeedbackBody(body);
  const sourceType = getFeedbackSourceType(user.isAiLearningSource);

  const result = await db.$transaction(async (tx) => {
    return addPieceFeedbackInTransaction(tx, {
      attachments: receipt.attachments,
      body: normalizedBody,
      deliveryId: receipt.deliveryId,
      feedbackId: receipt.feedbackId,
      pieceId,
      pieceVersionId: receipt.pieceVersionId,
      sourceType,
      user,
    });
  });

  return {
    alreadyFinalized: result.alreadyFinalized,
    delivery: result.delivery,
    feedback: await toPieceFeedbackDto(result.feedback),
  };
}

export function pieceReviewApiError(error: unknown) {
  if (error instanceof PieceReviewValidationError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof StorageValidationError) {
    return {
      code: undefined,
      message: getPublicStorageErrorMessage(error),
      status: 400,
    };
  }

  if (error instanceof StorageUploadError) {
    return {
      code: undefined,
      message: getPublicStorageErrorMessage(error),
      status: 400,
    };
  }

  if (error instanceof StorageConfigurationError) {
    return {
      code: undefined,
      message: getPublicStorageErrorMessage(error),
      status: 500,
    };
  }

  return {
    code: undefined,
    message: "No pudimos guardar la revisión.",
    status: 500,
  };
}

async function addPieceFeedbackInTransaction(
  tx: Prisma.TransactionClient,
  {
    attachments,
    body,
    deliveryId,
    feedbackId,
    pieceId,
    pieceVersionId,
    sourceType,
    user,
  }: {
    attachments: FeedbackAttachmentInput[];
    body: string;
    deliveryId: string;
    feedbackId?: string;
    pieceId: string;
    pieceVersionId: string;
    sourceType: ReturnType<typeof getFeedbackSourceType>;
    user: ReviewUser;
  },
) {
  await lockDeliveryForMutation(tx, deliveryId);
  await lockPieceForMutation(tx, pieceId);

  const piece = await tx.piece.findUnique({
    where: { id: pieceId },
    select: {
      id: true,
      delivery: {
        select: {
          deletedAt: true,
          id: true,
          status: true,
        },
      },
      versions: {
        orderBy: {
          versionNumber: "desc",
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!piece || piece.delivery.id !== deliveryId || piece.delivery.deletedAt) {
    throw new PieceReviewValidationError(
      "La pieza no existe.",
      404,
      "PIECE_NOT_FOUND",
    );
  }

  assertDeliveryCanBeReviewed(piece.delivery.status);

  const latestVersion = piece.versions[0] ?? null;

  if (!latestVersion || latestVersion.id !== pieceVersionId) {
    throw new PieceReviewValidationError(
      "Esta versión ya forma parte del historial.",
      409,
      "HISTORICAL_VERSION",
    );
  }

  if (feedbackId) {
    const existingFeedback = await tx.feedback.findUnique({
      where: {
        id: feedbackId,
      },
      select: feedbackDtoSelect,
    });

    if (existingFeedback) {
      assertExistingFeedbackMatchesReceipt(existingFeedback, {
        attachments,
        authorUserId: user.id,
        pieceId: piece.id,
        pieceVersionId: latestVersion.id,
      });

      return {
        alreadyFinalized: true,
        delivery: {
          id: piece.delivery.id,
          status: piece.delivery.status,
        },
        feedback: existingFeedback,
      };
    }
  }

  const nextDeliveryStatus = getDeliveryStatusAfterFeedback(
    piece.delivery.status,
  );

  const feedback = await tx.feedback.create({
    data: {
      ...(feedbackId ? { id: feedbackId } : {}),
      authorUserId: user.id,
      body,
      deliveryId: piece.delivery.id,
      level: FeedbackLevel.PIECE,
      pieceId: piece.id,
      pieceVersionId: latestVersion.id,
      sourceType,
    },
    select: feedbackDtoSelect,
  });

  if (attachments.length > 0) {
    await tx.feedbackAttachment.createMany({
      data: attachments.map((attachment) => ({
        feedbackId: feedback.id,
        fileSizeBytes: BigInt(attachment.fileSizeBytes),
        id: attachment.id,
        mimeType: attachment.mimeType,
        originalFilename: attachment.filename.trim(),
        storageKey: attachment.storageKey,
        uploadedByUserId: user.id,
      })),
    });
  }

  const feedbackWithAttachments = await tx.feedback.findUniqueOrThrow({
    where: {
      id: feedback.id,
    },
    select: feedbackDtoSelect,
  });

  await tx.journalEvent.create({
    data: {
      actorUserId: user.id,
      deliveryId: piece.delivery.id,
      entityId: feedback.id,
      entityType: "FEEDBACK",
      eventType: "FEEDBACK_ADDED",
      metadata: buildFeedbackJournalMetadata({
        attachmentIds: attachments.map((attachment) => attachment.id),
        pieceId: piece.id,
        pieceVersionId: latestVersion.id,
        sourceType,
      }),
    },
  });

  if (nextDeliveryStatus !== piece.delivery.status) {
    await tx.delivery.update({
      data: {
        status: nextDeliveryStatus,
      },
      where: {
        id: piece.delivery.id,
      },
    });

    await tx.journalEvent.create({
      data: {
        actorUserId: user.id,
        deliveryId: piece.delivery.id,
        entityId: piece.delivery.id,
        entityType: "DELIVERY",
        eventType: "DELIVERY_STATUS_CHANGED",
        metadata: buildDeliveryStatusJournalMetadata({
          nextStatus: nextDeliveryStatus,
          previousStatus: piece.delivery.status,
          reason: "feedback-added",
        }),
      },
    });
  }

  await enqueueDriveBackupRefresh(tx, {
    createdByUserId: user.id,
    deliveryId: piece.delivery.id,
    entityId: feedback.id,
    entityType: "FEEDBACK",
    reason: "feedback-added",
  });

  return {
    alreadyFinalized: false,
    delivery: {
      id: piece.delivery.id,
      status: nextDeliveryStatus,
    },
    feedback: feedbackWithAttachments,
  };
}

function assertExistingFeedbackMatchesReceipt(
  feedback: FeedbackForDto,
  {
    attachments,
    authorUserId,
    pieceId,
    pieceVersionId,
  }: {
    attachments: FeedbackAttachmentInput[];
    authorUserId: string;
    pieceId: string;
    pieceVersionId: string;
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
    feedback.pieceId !== pieceId ||
    feedback.pieceVersionId !== pieceVersionId ||
    actualAttachments.length !== expectedAttachments.length
  ) {
    throw new PieceReviewValidationError("El intento de feedback no coincide.", 409);
  }

  for (const [index, expected] of expectedAttachments.entries()) {
    const actual = actualAttachments[index];

    if (
      !actual ||
      actual.id !== expected.id ||
      actual.fileSizeBytes !== BigInt(expected.fileSizeBytes) ||
      actual.mimeType !== expected.mimeType ||
      actual.originalFilename !== expected.filename.trim() ||
      actual.storageKey !== expected.storageKey
    ) {
      throw new PieceReviewValidationError(
        "El intento de feedback no coincide.",
        409,
      );
    }
  }
}

async function toPieceFeedbackDto(feedback: FeedbackForDto) {
  return {
    attachments: await Promise.all(
      feedback.attachments.map(async (attachment) => ({
        createdAtLabel: formatFeedbackDate(attachment.createdAt),
        fileSizeBytes: Number(attachment.fileSizeBytes),
        id: attachment.id,
        imageSrc: attachment.storageKey
          ? await createReadUrl(attachment.storageKey)
              .then((result) => result.readUrl)
              .catch(() => null)
          : null,
        mimeType: attachment.mimeType,
        originalFilename: attachment.originalFilename,
        uploadedByLabel:
          attachment.uploadedBy.name ?? attachment.uploadedBy.email,
      })),
    ),
    author: feedback.author.name ?? feedback.author.email,
    body: feedback.body,
    createdAtLabel: formatFeedbackDate(feedback.createdAt),
    id: feedback.id,
    sourceType: feedback.sourceType,
  };
}

function formatFeedbackDate(date: Date) {
  return feedbackDateFormatter.format(date);
}

async function getPieceDeliveryId(pieceId: string) {
  const piece = await db.piece.findUnique({
    where: {
      id: pieceId,
    },
    select: {
      deliveryId: true,
    },
  });

  if (!piece) {
    throw new PieceReviewValidationError(
      "La pieza no existe.",
      404,
      "PIECE_NOT_FOUND",
    );
  }

  return piece.deliveryId;
}
