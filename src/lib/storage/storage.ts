import "server-only";

import { buildPendingStorageKey } from "./keys";
import {
  createR2SignedReadUrl,
  createR2SignedUploadUrl,
  deleteR2Object,
  headR2Object,
} from "./r2";
import {
  assertValidStorageKey,
  type UploadUrlInput,
  validateUploadUrlInput,
} from "./validation";

export {
  buildFeedbackAttachmentStorageKey,
  buildGuidelineStorageKey,
  buildPendingStorageKey,
  buildPieceVersionStorageKey,
  sanitizeFilename,
} from "./keys";
export {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  type StoragePurpose,
} from "./validation";

export const SIGNED_UPLOAD_EXPIRES_IN_SECONDS = 5 * 60;
export const SIGNED_READ_EXPIRES_IN_SECONDS = 20 * 60;

export async function createUploadUrl({
  fileSizeBytes,
  filename,
  mimeType,
  purpose,
  userId,
}: UploadUrlInput & {
  userId: string;
}) {
  validateUploadUrlInput({ fileSizeBytes, filename, mimeType, purpose });

  const storageKey = buildPendingStorageKey({
    filename,
    purpose,
    userId,
  });
  const uploadUrl = await createR2SignedUploadUrl({
    contentType: mimeType,
    expiresInSeconds: SIGNED_UPLOAD_EXPIRES_IN_SECONDS,
    storageKey,
  });

  return {
    expiresAt: new Date(
      Date.now() + SIGNED_UPLOAD_EXPIRES_IN_SECONDS * 1000,
    ).toISOString(),
    storageKey,
    uploadUrl,
  };
}

export async function createReadUrl(storageKey: string) {
  assertValidStorageKey(storageKey);

  const readUrl = await createR2SignedReadUrl({
    expiresInSeconds: SIGNED_READ_EXPIRES_IN_SECONDS,
    storageKey,
  });

  return {
    expiresAt: new Date(Date.now() + SIGNED_READ_EXPIRES_IN_SECONDS * 1000)
      .toISOString(),
    readUrl,
    storageKey,
  };
}

export async function headObject(storageKey: string) {
  assertValidStorageKey(storageKey);

  return headR2Object(storageKey);
}

export async function verifyUploadedObject({
  expectedFileSizeBytes,
  expectedMimeType,
  storageKey,
}: {
  expectedFileSizeBytes?: number;
  expectedMimeType?: string;
  storageKey: string;
}) {
  const metadata = await headObject(storageKey);

  if (
    typeof expectedFileSizeBytes === "number" &&
    metadata.contentLength !== expectedFileSizeBytes
  ) {
    return {
      metadata,
      ok: false,
    };
  }

  if (expectedMimeType && metadata.contentType !== expectedMimeType) {
    return {
      metadata,
      ok: false,
    };
  }

  return {
    metadata,
    ok: true,
  };
}

export async function deleteObject(storageKey: string) {
  assertValidStorageKey(storageKey);

  await deleteR2Object(storageKey);
}
