import { NextResponse } from "next/server";

import { guidelineApiErrorResponse } from "@/app/api/guidelines/_shared";
import { getApiAuthorizedUser } from "@/app/api/storage/_shared";
import {
  BRAND_MANUAL_GUIDELINE_TYPE,
  isPdfManualInput,
} from "@/lib/guidelines";
import { createGuidelineBrandManualUploadReceipt } from "@/lib/delivery-upload-receipt";
import { StorageValidationError } from "@/lib/storage/errors";
import {
  buildGuidelineStorageKey,
  createUploadUrlForStorageKey,
} from "@/lib/storage/storage";

export const runtime = "nodejs";

type PrepareBody = {
  fileSizeBytes?: unknown;
  filename?: unknown;
  mimeType?: unknown;
};

export async function POST(request: Request) {
  const { response, user } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const input = validatePrepareBrandManualInput(await request.json());
    const guidelineId = crypto.randomUUID();
    const storageKey = buildGuidelineStorageKey({
      filename: input.filename,
      guidelineId,
    });
    const upload = await createUploadUrlForStorageKey({
      fileSizeBytes: input.fileSizeBytes,
      filename: input.filename,
      mimeType: input.mimeType,
      purpose: "guideline",
      storageKey,
    });
    const attemptToken = createGuidelineBrandManualUploadReceipt({
      fileSizeBytes: input.fileSizeBytes,
      filename: input.filename,
      guidelineId,
      mimeType: input.mimeType,
      storageKey,
      userId: user.id,
    });

    return NextResponse.json({
      attemptToken,
      expiresAt: upload.expiresAt,
      guidelineId,
      storageKey,
      type: BRAND_MANUAL_GUIDELINE_TYPE,
      uploadUrl: upload.uploadUrl,
    });
  } catch (error) {
    return guidelineApiErrorResponse(error);
  }
}

function validatePrepareBrandManualInput(body: PrepareBody) {
  if (
    typeof body.filename !== "string" ||
    typeof body.mimeType !== "string" ||
    typeof body.fileSizeBytes !== "number"
  ) {
    throw new StorageValidationError("Payload de manual inválido.");
  }

  const filename = body.filename.trim();
  const mimeType = body.mimeType.trim();

  if (!isPdfManualInput({ filename, mimeType })) {
    throw new StorageValidationError("Solo se admite un archivo PDF.");
  }

  return {
    fileSizeBytes: body.fileSizeBytes,
    filename,
    mimeType,
  };
}
