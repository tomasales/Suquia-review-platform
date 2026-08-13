import "server-only";

import { FeedbackLevel } from "@prisma/client";

import { db } from "@/lib/db";
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

type ReviewUser = {
  email: string;
  id: string;
  isAiLearningSource: boolean;
  name: string | null;
};

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

  return db.$transaction(async (tx) => {
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

    if (!piece || piece.delivery.deletedAt) {
      throw new PieceReviewValidationError("La pieza no existe.", 404);
    }

    assertDeliveryCanBeReviewed(piece.delivery.status);

    const latestVersion = piece.versions[0] ?? null;

    if (!latestVersion || latestVersion.id !== pieceVersionId) {
      throw new PieceReviewValidationError(
        "Esta versión ya forma parte del historial.",
        409,
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

  return db.$transaction(async (tx) => {
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

    if (!piece || piece.delivery.deletedAt) {
      throw new PieceReviewValidationError("La pieza no existe.", 404);
    }

    assertDeliveryCanBeReviewed(piece.delivery.status);

    const version = await tx.pieceVersion.findFirst({
      where: {
        id: pieceVersionId,
        pieceId: piece.id,
      },
      select: {
        id: true,
      },
    });

    if (!version) {
      throw new PieceReviewValidationError(
        "La versión no corresponde a esta pieza.",
      );
    }

    if (piece.versions[0]?.id !== version.id) {
      throw new PieceReviewValidationError(
        "Esta versión ya forma parte del historial.",
        409,
      );
    }

    const nextDeliveryStatus = getDeliveryStatusAfterFeedback(
      piece.delivery.status,
    );

    const feedback = await tx.feedback.create({
      data: {
        authorUserId: user.id,
        body: normalizedBody,
        deliveryId: piece.delivery.id,
        level: FeedbackLevel.PIECE,
        pieceId: piece.id,
        pieceVersionId: version.id,
        sourceType,
      },
      select: {
        author: {
          select: {
            email: true,
            name: true,
          },
        },
        body: true,
        createdAt: true,
        id: true,
        sourceType: true,
      },
    });

    await tx.journalEvent.create({
      data: {
        actorUserId: user.id,
        deliveryId: piece.delivery.id,
        entityId: feedback.id,
        entityType: "FEEDBACK",
        eventType: "FEEDBACK_ADDED",
        metadata: buildFeedbackJournalMetadata({
          pieceId: piece.id,
          pieceVersionId: version.id,
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
      delivery: {
        id: piece.delivery.id,
        status: nextDeliveryStatus,
      },
      feedback: {
        author: feedback.author.name ?? feedback.author.email,
        body: feedback.body,
        createdAtLabel: formatFeedbackDate(feedback.createdAt),
        id: feedback.id,
        sourceType: feedback.sourceType,
      },
    };
  });
}

export function pieceReviewApiError(error: unknown) {
  if (error instanceof PieceReviewValidationError) {
    return {
      message: error.message,
      status: error.status,
    };
  }

  return {
    message: "No pudimos guardar la revisión.",
    status: 500,
  };
}

function formatFeedbackDate(date: Date) {
  return feedbackDateFormatter.format(date);
}
