import { DeliveryStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/deliveries/_shared";
import { createPieceVersionUploadReceipt } from "@/lib/delivery-upload-receipt";
import { db } from "@/lib/db";
import {
  PieceVersionUploadError,
  pieceVersionUploadApiError,
  validatePreparePieceVersionInput,
} from "@/lib/piece-version-upload";
import {
  buildPieceVersionStorageKey,
  createUploadUrlForStorageKey,
} from "@/lib/storage/storage";

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
    const input = validatePreparePieceVersionInput(await request.json());
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
      throw new PieceVersionUploadError("La pieza no existe.", 404);
    }

    if (piece.delivery.status === DeliveryStatus.CLOSED) {
      throw new PieceVersionUploadError("La entrega está cerrada.", 409);
    }

    const latestVersion = piece.versions[0] ?? null;

    if (!latestVersion) {
      throw new PieceVersionUploadError("La pieza no tiene una versión base.", 409);
    }

    const nextVersionNumber = latestVersion.versionNumber + 1;
    const newPieceVersionId = crypto.randomUUID();
    const storageKey = buildPieceVersionStorageKey({
      deliveryId: piece.delivery.id,
      filename: input.filename,
      nextVersionNumber,
      pieceId: piece.id,
    });
    const upload = await createUploadUrlForStorageKey({
      fileSizeBytes: input.fileSizeBytes,
      filename: input.filename,
      mimeType: input.mimeType,
      storageKey,
    });
    const attemptToken = createPieceVersionUploadReceipt({
      deliveryId: piece.delivery.id,
      fileSizeBytes: input.fileSizeBytes,
      filename: input.filename,
      mimeType: input.mimeType,
      newPieceVersionId,
      nextVersionNumber,
      pieceId: piece.id,
      previousLatestVersionId: latestVersion.id,
      previousLatestVersionNumber: latestVersion.versionNumber,
      storageKey,
      userId: user.id,
    });

    return NextResponse.json({
      attemptToken,
      expiresAt: upload.expiresAt,
      pieceId: piece.id,
      pieceVersionId: newPieceVersionId,
      storageKey,
      uploadUrl: upload.uploadUrl,
      versionNumber: nextVersionNumber,
    });
  } catch (error) {
    const apiError = pieceVersionUploadApiError(error);

    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.status },
    );
  }
}
