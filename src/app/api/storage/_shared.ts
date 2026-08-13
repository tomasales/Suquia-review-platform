import { NextResponse } from "next/server";

import { getAuthorizedUser } from "@/lib/session";
import {
  getPublicStorageErrorMessage,
  StorageValidationError,
} from "@/lib/storage/errors";

export async function getApiAuthorizedUser() {
  const authorization = await getAuthorizedUser();

  if (authorization.status === "unauthenticated") {
    return {
      response: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }),
      user: null,
    };
  }

  if (authorization.status === "unauthorized") {
    return {
      response: NextResponse.json({ error: "Access denied" }, { status: 403 }),
      user: null,
    };
  }

  return {
    response: null,
    user: authorization.user,
  };
}

export function storageErrorResponse(error: unknown) {
  const status = error instanceof StorageValidationError ? 400 : 500;

  return NextResponse.json(
    {
      error: getPublicStorageErrorMessage(error),
    },
    { status },
  );
}
