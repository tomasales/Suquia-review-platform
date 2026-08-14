import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/deliveries/_shared";
import {
  assertDeliveryUploadReceiptUser,
  verifyPieceFeedbackAttachmentsReceipt,
} from "@/lib/delivery-upload-receipt";
import { db } from "@/lib/db";
import { pieceReviewApiError } from "@/lib/piece-review-actions";
import { StorageValidationError } from "@/lib/storage/errors";
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
    const input = await readCleanupInput(request);
    const receipt = verifyPieceFeedbackAttachmentsReceipt(input.attemptToken);
    assertDeliveryUploadReceiptUser(receipt, user.id);

    if (receipt.pieceId !== pieceId) {
      throw new StorageValidationError("Receipt de subida inválido.");
    }

    const feedback = await db.feedback.findUnique({
      where: {
        id: receipt.feedbackId,
      },
      select: {
        id: true,
      },
    });

    if (feedback) {
      return NextResponse.json({
        deleted: false,
        reason: "already-finalized",
      });
    }

    await Promise.all(
      receipt.attachments.map((attachment) =>
        deleteObject(attachment.storageKey).catch(() => null),
      ),
    );

    return NextResponse.json({
      deleted: true,
    });
  } catch (error) {
    const apiError = pieceReviewApiError(error);

    return NextResponse.json(
      { code: apiError.code, error: apiError.message },
      { status: apiError.status },
    );
  }
}

async function readCleanupInput(request: Request) {
  const input = (await request.json()) as unknown;

  if (
    typeof input !== "object" ||
    input === null ||
    typeof (input as { attemptToken?: unknown }).attemptToken !== "string"
  ) {
    throw new StorageValidationError("Payload de referencias inválido.");
  }

  return {
    attemptToken: (input as { attemptToken: string }).attemptToken,
  };
}
