import { NextResponse } from "next/server";

import { getApiAuthorizedUser, storageErrorResponse } from "../_shared";
import { StorageValidationError } from "@/lib/storage/errors";
import { headObject, verifyUploadedObject } from "@/lib/storage/storage";

type HeadRequestBody = {
  expectedFileSizeBytes?: unknown;
  expectedMimeType?: unknown;
  storageKey?: unknown;
};

export async function POST(request: Request) {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const body = (await request.json()) as HeadRequestBody;

    if (typeof body.storageKey !== "string") {
      throw new StorageValidationError("Storage key requerida.");
    }

    const hasExpectedMetadata =
      typeof body.expectedFileSizeBytes === "number" ||
      typeof body.expectedMimeType === "string";

    if (!hasExpectedMetadata) {
      return NextResponse.json({
        metadata: await headObject(body.storageKey),
        ok: true,
      });
    }

    return NextResponse.json(
      await verifyUploadedObject({
        expectedFileSizeBytes:
          typeof body.expectedFileSizeBytes === "number"
            ? body.expectedFileSizeBytes
            : undefined,
        expectedMimeType:
          typeof body.expectedMimeType === "string"
            ? body.expectedMimeType
            : undefined,
        storageKey: body.storageKey,
      }),
    );
  } catch (error) {
    return storageErrorResponse(error);
  }
}
