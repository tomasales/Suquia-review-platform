import { NextResponse } from "next/server";

import { StorageValidationError } from "@/lib/storage/errors";

export function guidelineApiErrorResponse(error: unknown) {
  const status = error instanceof StorageValidationError ? 400 : 500;

  return NextResponse.json(
    {
      error:
        error instanceof StorageValidationError
          ? error.message
          : "No pudimos procesar el manual.",
    },
    { status },
  );
}
