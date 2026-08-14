import { DeliveryStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/deliveries/_shared";
import { createPieceFeedbackAttachmentsReceipt } from "@/lib/delivery-upload-receipt";
import { db } from "@/lib/db";
import { PieceReviewValidationError } from "@/lib/piece-review-rules";
import {
  getFeedbackAttachmentClientError,
  validatePrepareFeedbackAttachmentsInput,
} from "@/lib/piece-feedback-attachments";
import { buildFeedbackAttachmentStorageKey } from "@/lib/storage/keys";
import { createUploadUrlForStorageKey } from "@/lib/storage/storage";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ pieceId: string }> },
) {
  const { response, user } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  const { pieceId } = await context.params;

  try {
    const input = validatePrepareFeedbackAttachmentsInput(await request.json());
    const piece = await db.piece.findUnique({
      where: {
        id: pieceId,
      },
      select: {
        delivery: {
          select: {
            deletedAt: true,
            id: true,
            status: true,
          },
        },
        id: true,
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
          select: {
            id: true,
            versionNumber: true,
          },
          take: 1,
        },
      },
    });

    if (!piece || piece.delivery.deletedAt) {
      throw new PieceReviewValidationError(
        "La pieza no existe.",
        404,
        "PIECE_NOT_FOUND",
      );
    }

    if (piece.delivery.status === DeliveryStatus.CLOSED) {
      throw new PieceReviewValidationError(
        "La entrega está cerrada.",
        409,
        "DELIVERY_CLOSED",
      );
    }

    const latestVersion = piece.versions[0] ?? null;

    if (!latestVersion || latestVersion.id !== input.pieceVersionId) {
      throw new PieceReviewValidationError(
        "Esta versión ya forma parte del historial.",
        409,
        "HISTORICAL_VERSION",
      );
    }

    const feedbackId = crypto.randomUUID();
    const attachments = await Promise.all(
      input.attachments.map(async (attachment) => {
        const id = crypto.randomUUID();
        const storageKey = buildFeedbackAttachmentStorageKey({
          attachmentId: id,
          deliveryId: piece.delivery.id,
          feedbackId,
          filename: attachment.filename,
          pieceId: piece.id,
          versionNumber: latestVersion.versionNumber,
        });
        const upload = await createUploadUrlForStorageKey({
          fileSizeBytes: attachment.fileSizeBytes,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          purpose: "feedback-attachment",
          storageKey,
        });

        return {
          fileSizeBytes: attachment.fileSizeBytes,
          filename: attachment.filename,
          id,
          mimeType: attachment.mimeType,
          storageKey,
          uploadUrl: upload.uploadUrl,
        };
      }),
    );

    const attemptToken = createPieceFeedbackAttachmentsReceipt({
      attachments: attachments.map((attachment) => ({
        fileSizeBytes: attachment.fileSizeBytes,
        filename: attachment.filename,
        id: attachment.id,
        mimeType: attachment.mimeType,
        storageKey: attachment.storageKey,
      })),
      deliveryId: piece.delivery.id,
      feedbackId,
      pieceId: piece.id,
      pieceVersionId: latestVersion.id,
      userId: user.id,
    });

    return NextResponse.json({
      attemptToken,
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        uploadUrl: attachment.uploadUrl,
      })),
      feedbackId,
    });
  } catch (error) {
    if (error instanceof PieceReviewValidationError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: getFeedbackAttachmentClientError(error) },
      { status: 400 },
    );
  }
}
