import { NextResponse } from "next/server";

import { getApiAuthorizedUser, storageErrorResponse } from "../_shared";
import { StorageValidationError } from "@/lib/storage/errors";
import { deleteObject } from "@/lib/storage/storage";

type DeleteObjectRequestBody = {
  storageKey?: unknown;
};

export async function DELETE(request: Request) {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const body = (await request.json()) as DeleteObjectRequestBody;

    if (typeof body.storageKey !== "string") {
      throw new StorageValidationError("Storage key requerida.");
    }

    await deleteObject(body.storageKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return storageErrorResponse(error);
  }
}
