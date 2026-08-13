import { NextResponse } from "next/server";

import { getApiAuthorizedUser, storageErrorResponse } from "../_shared";
import { StorageValidationError } from "@/lib/storage/errors";
import { createUploadUrl, type StoragePurpose } from "@/lib/storage/storage";

type UploadUrlRequestBody = {
  fileSizeBytes?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  purpose?: unknown;
};

export async function POST(request: Request) {
  const { response, user } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const body = (await request.json()) as UploadUrlRequestBody;

    if (
      typeof body.filename !== "string" ||
      typeof body.mimeType !== "string" ||
      typeof body.fileSizeBytes !== "number" ||
      typeof body.purpose !== "string"
    ) {
      throw new StorageValidationError("Payload de storage inválido.");
    }

    const result = await createUploadUrl({
      fileSizeBytes: body.fileSizeBytes,
      filename: body.filename,
      mimeType: body.mimeType,
      purpose: body.purpose as StoragePurpose,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return storageErrorResponse(error);
  }
}
