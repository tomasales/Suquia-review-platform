import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/deliveries/_shared";
import {
  assertDeliveryUploadReceiptUser,
  verifyPieceVersionUploadReceipt,
} from "@/lib/delivery-upload-receipt";
import { db } from "@/lib/db";
import {
  PieceVersionUploadError,
  pieceVersionUploadApiError,
  validatePieceVersionAttemptInput,
} from "@/lib/piece-version-upload";
import { deleteObject } from "@/lib/storage/storage";

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
    const input = validatePieceVersionAttemptInput(await request.json());
    const receipt = verifyPieceVersionUploadReceipt(input.attemptToken);
    assertDeliveryUploadReceiptUser(receipt, user.id);

    if (receipt.pieceId !== pieceId) {
      throw new PieceVersionUploadError("La versión no corresponde a esta pieza.");
    }

    const existingVersion = await db.pieceVersion.findUnique({
      where: {
        id: receipt.newPieceVersionId,
      },
      select: {
        id: true,
      },
    });

    if (existingVersion) {
      return NextResponse.json({
        deleted: false,
        reason: "already-finalized",
      });
    }

    await deleteObject(receipt.storageKey);

    return NextResponse.json({
      deleted: true,
    });
  } catch (error) {
    const apiError = pieceVersionUploadApiError(error);

    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.status },
    );
  }
}
