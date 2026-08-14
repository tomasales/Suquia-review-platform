import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/deliveries/_shared";
import {
  assertDeliveryUploadReceiptUser,
  type PieceFeedbackAttachmentsReceiptPayload,
  verifyPieceFeedbackAttachmentsReceipt,
} from "@/lib/delivery-upload-receipt";
import { db } from "@/lib/db";
import {
  addPieceFeedbackWithAttachments,
  pieceReviewApiError,
} from "@/lib/piece-review-actions";
import { PieceReviewValidationError } from "@/lib/piece-review-rules";
import { StorageUploadError, StorageValidationError } from "@/lib/storage/errors";
import { deleteObject, verifyUploadedObject } from "@/lib/storage/storage";

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
  let receipt: PieceFeedbackAttachmentsReceiptPayload | null = null;

  try {
    const input = await readFinalizeInput(request);
    receipt = verifyPieceFeedbackAttachmentsReceipt(input.attemptToken);
    assertDeliveryUploadReceiptUser(receipt, user.id);

    if (receipt.pieceId !== pieceId) {
      throw new StorageValidationError("Receipt de subida inválido.");
    }

    try {
      await verifyReceiptObjects(receipt);
    } catch (error) {
      await cleanupFeedbackAttachmentAttemptBestEffort(receipt);
      throw error;
    }

    const result = await addPieceFeedbackWithAttachments({
      body: input.body,
      pieceId,
      receipt,
      user,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (receipt && shouldCleanupReceiptAfterFinalizeError(error)) {
      await cleanupFeedbackAttachmentAttemptBestEffort(receipt);
    }

    const apiError = pieceReviewApiError(error);

    return NextResponse.json(
      { code: apiError.code, error: apiError.message },
      { status: apiError.status },
    );
  }
}

async function readFinalizeInput(request: Request) {
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
    body: (input as { body?: unknown }).body,
  };
}

async function verifyReceiptObjects(
  receipt: PieceFeedbackAttachmentsReceiptPayload,
) {
  for (const attachment of receipt.attachments) {
    const verification = await verifyUploadedObject({
      expectedFileSizeBytes: attachment.fileSizeBytes,
      expectedMimeType: attachment.mimeType,
      storageKey: attachment.storageKey,
    });

    if (!verification.ok) {
      throw new StorageUploadError("Could not confirm uploaded object.");
    }
  }
}

function shouldCleanupReceiptAfterFinalizeError(error: unknown) {
  return (
    error instanceof StorageUploadError ||
    (error instanceof PieceReviewValidationError &&
      (error.code === "DELIVERY_CLOSED" ||
        error.code === "HISTORICAL_VERSION" ||
        error.code === "PIECE_NOT_FOUND"))
  );
}

async function cleanupFeedbackAttachmentAttemptBestEffort(
  receipt: PieceFeedbackAttachmentsReceiptPayload,
) {
  const feedback = await db.feedback.findUnique({
    where: {
      id: receipt.feedbackId,
    },
    select: {
      id: true,
    },
  });

  if (feedback) {
    return;
  }

  await Promise.all(
    receipt.attachments.map((attachment) =>
      deleteObject(attachment.storageKey).catch(() => null),
    ),
  );
}
