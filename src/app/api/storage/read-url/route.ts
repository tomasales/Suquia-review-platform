import { NextResponse } from "next/server";

import { getApiAuthorizedUser, storageErrorResponse } from "../_shared";
import { StorageValidationError } from "@/lib/storage/errors";
import { createReadUrl } from "@/lib/storage/storage";

type ReadUrlRequestBody = {
  storageKey?: unknown;
};

export async function POST(request: Request) {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const body = (await request.json()) as ReadUrlRequestBody;

    if (typeof body.storageKey !== "string") {
      throw new StorageValidationError("Storage key requerida.");
    }

    return NextResponse.json(await createReadUrl(body.storageKey));
  } catch (error) {
    return storageErrorResponse(error);
  }
}
