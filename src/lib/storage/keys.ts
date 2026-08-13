import { StorageValidationError } from "./errors";
import type { StoragePurpose } from "./validation";

const MAX_FILENAME_LENGTH = 120;

export function sanitizeFilename(filename: string) {
  const sanitized = filename
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_FILENAME_LENGTH);

  return sanitized || "archivo";
}

function createStorageUuid() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function buildPendingStorageKey({
  filename,
  purpose,
  userId,
}: {
  filename: string;
  purpose: StoragePurpose;
  userId: string;
}) {
  if (!userId.trim()) {
    throw new StorageValidationError("User id requerido.");
  }

  return `pending/${userId}/${purpose}/${createStorageUuid()}/${sanitizeFilename(
    filename,
  )}`;
}

export function buildPieceVersionStorageKey({
  deliveryId,
  filename,
  pieceId,
  versionNumber,
}: {
  deliveryId: string;
  filename: string;
  pieceId: string;
  versionNumber: number;
}) {
  return `deliveries/${deliveryId}/pieces/${pieceId}/v${versionNumber}/${createStorageUuid()}-${sanitizeFilename(
    filename,
  )}`;
}

export function buildFeedbackAttachmentStorageKey({
  feedbackId,
  filename,
}: {
  feedbackId: string;
  filename: string;
}) {
  return `feedback/${feedbackId}/attachments/${createStorageUuid()}-${sanitizeFilename(
    filename,
  )}`;
}

export function buildGuidelineStorageKey({
  filename,
  guidelineId,
}: {
  filename: string;
  guidelineId: string;
}) {
  return `guidelines/${guidelineId}/${createStorageUuid()}-${sanitizeFilename(
    filename,
  )}`;
}
