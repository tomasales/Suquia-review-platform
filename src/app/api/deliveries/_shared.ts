import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/storage/_shared";
import {
  getPublicStorageErrorMessage,
  StorageConfigurationError,
  StorageValidationError,
} from "@/lib/storage/errors";

export { getApiAuthorizedUser };

export class DeliveryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryConflictError";
  }
}

export function deliveryApiErrorResponse(error: unknown) {
  if (error instanceof DeliveryConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  if (
    error instanceof StorageValidationError ||
    error instanceof StorageConfigurationError
  ) {
    return NextResponse.json(
      { error: getPublicStorageErrorMessage(error) },
      { status: error instanceof StorageValidationError ? 400 : 500 },
    );
  }

  return NextResponse.json(
    { error: "No pudimos crear la entrega." },
    { status: 500 },
  );
}
