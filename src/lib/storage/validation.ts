import { StorageValidationError } from "./errors";

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const ALLOWED_GUIDELINE_MIME_TYPES = ["application/pdf"] as const;

export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];
export type AllowedGuidelineMimeType =
  (typeof ALLOWED_GUIDELINE_MIME_TYPES)[number];

export type StoragePurpose =
  | "feedback-attachment"
  | "guideline"
  | "piece-version";

export type UploadUrlInput = {
  fileSizeBytes: number;
  filename: string;
  mimeType: string;
  purpose: StoragePurpose;
};

export function isAllowedUploadMimeType(
  mimeType: string,
): mimeType is AllowedUploadMimeType {
  return ALLOWED_UPLOAD_MIME_TYPES.includes(
    mimeType as AllowedUploadMimeType,
  );
}

export function isAllowedGuidelineMimeType(
  mimeType: string,
): mimeType is AllowedGuidelineMimeType {
  return ALLOWED_GUIDELINE_MIME_TYPES.includes(
    mimeType as AllowedGuidelineMimeType,
  );
}

export function assertAllowedStoragePurpose(
  purpose: string,
): asserts purpose is StoragePurpose {
  if (
    purpose !== "piece-version" &&
    purpose !== "feedback-attachment" &&
    purpose !== "guideline"
  ) {
    throw new StorageValidationError("Purpose no soportado.");
  }
}

export function validateUploadUrlInput(input: UploadUrlInput) {
  const filename = input.filename.trim();

  if (!filename) {
    throw new StorageValidationError("El nombre de archivo es obligatorio.");
  }

  if (input.purpose === "guideline") {
    if (
      !isAllowedGuidelineMimeType(input.mimeType) ||
      !filename.toLowerCase().endsWith(".pdf")
    ) {
      throw new StorageValidationError("Solo se admite un archivo PDF.");
    }
  } else if (!isAllowedUploadMimeType(input.mimeType)) {
    throw new StorageValidationError("Tipo de archivo no compatible.");
  }

  if (!Number.isFinite(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
    throw new StorageValidationError("El tamaño del archivo no es válido.");
  }

  if (input.fileSizeBytes > MAX_UPLOAD_FILE_SIZE_BYTES) {
    throw new StorageValidationError("El archivo supera el máximo de 25 MB.");
  }

  assertAllowedStoragePurpose(input.purpose);
}

export function assertValidStorageKey(storageKey: string) {
  if (!storageKey.trim()) {
    throw new StorageValidationError("Storage key requerida.");
  }

  if (
    storageKey.startsWith("/") ||
    storageKey.includes("..") ||
    storageKey.includes("\\")
  ) {
    throw new StorageValidationError("Storage key inválida.");
  }
}
