import "server-only";

import {
  getPublicStorageErrorMessage,
  StorageConfigurationError,
  StorageValidationError,
} from "@/lib/storage/errors";
import {
  assertValidStorageKey,
  validateUploadUrlInput,
} from "@/lib/storage/validation";

export type PreparedPieceVersionInput = {
  fileSizeBytes: number;
  filename: string;
  mimeType: string;
};

export type PieceVersionUploadErrorCode =
  | "DELIVERY_CLOSED"
  | "PIECE_NOT_FOUND"
  | "VERSION_CONFLICT";

export class PieceVersionUploadError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code?: PieceVersionUploadErrorCode,
  ) {
    super(message);
    this.name = "PieceVersionUploadError";
  }
}

export function validatePreparePieceVersionInput(
  input: unknown,
): PreparedPieceVersionInput {
  if (
    !isRecord(input) ||
    typeof input.filename !== "string" ||
    typeof input.mimeType !== "string" ||
    typeof input.fileSizeBytes !== "number"
  ) {
    throw new StorageValidationError("Payload de versión inválido.");
  }

  validateUploadUrlInput({
    fileSizeBytes: input.fileSizeBytes,
    filename: input.filename,
    mimeType: input.mimeType,
    purpose: "piece-version",
  });

  return {
    fileSizeBytes: input.fileSizeBytes,
    filename: input.filename,
    mimeType: input.mimeType,
  };
}

export function validatePieceVersionAttemptInput(input: unknown) {
  if (
    !isRecord(input) ||
    typeof input.attemptToken !== "string" ||
    !input.attemptToken.trim()
  ) {
    throw new StorageValidationError("Payload de versión inválido.");
  }

  return {
    attemptToken: input.attemptToken,
  };
}

export function assertPieceVersionStorageKey({
  deliveryId,
  pieceId,
  storageKey,
  versionNumber,
}: {
  deliveryId: string;
  pieceId: string;
  storageKey: string;
  versionNumber: number;
}) {
  assertValidStorageKey(storageKey);

  const prefix = `deliveries/${deliveryId}/pieces/${pieceId}/v${versionNumber}/`;
  const filenameSegment = storageKey.slice(prefix.length);

  if (
    !storageKey.startsWith(prefix) ||
    !filenameSegment ||
    filenameSegment.includes("/")
  ) {
    throw new StorageValidationError("Storage key de pieza inválida.");
  }
}

export function pieceVersionUploadApiError(error: unknown) {
  if (error instanceof PieceVersionUploadError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof StorageValidationError) {
    return {
      code: undefined,
      message: getPublicStorageErrorMessage(error),
      status: 400,
    };
  }

  if (error instanceof StorageConfigurationError) {
    return {
      code: undefined,
      message: getPublicStorageErrorMessage(error),
      status: 500,
    };
  }

  return {
    code: undefined,
    message: "No pudimos subir la nueva versión.",
    status: 500,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
