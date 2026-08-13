import { DeliveryType } from "@prisma/client";

import { deliveryTypeLabel } from "@/lib/delivery-presentation";
import { StorageValidationError } from "@/lib/storage/errors";
import {
  assertValidStorageKey,
  validateUploadUrlInput,
} from "@/lib/storage/validation";

export type PreparedDeliveryPiece = {
  fileSizeBytes: number;
  filename: string;
  mimeType: string;
};

export type FinalizeDeliveryPiece = {
  fileSizeBytes: number;
  mimeType: string;
  note: string | null;
  originalFilename: string;
  pieceId: string;
  position: number;
  storageKey: string;
};

const submitTitleDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

export function generateDeliveryTitle({
  pieceCount,
  submittedAt,
  type,
}: {
  pieceCount: number;
  submittedAt: Date;
  type: DeliveryType;
}) {
  const dateLabel = submitTitleDateFormatter
    .format(submittedAt)
    .replace(/-/g, " ");

  return `${deliveryTypeLabel[type]} · ${dateLabel} · ${pieceCount} ${
    pieceCount === 1 ? "pieza" : "piezas"
  }`;
}

export function normalizeOptionalNote(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function validatePrepareDeliveryInput(input: unknown) {
  if (!isRecord(input) || !isDeliveryType(input.type)) {
    throw new StorageValidationError("Payload de entrega inválido.");
  }

  if (!Array.isArray(input.pieces) || input.pieces.length === 0) {
    throw new StorageValidationError("Agregá al menos una pieza.");
  }

  const pieces = input.pieces.map((piece) => {
    if (
      !isRecord(piece) ||
      typeof piece.filename !== "string" ||
      typeof piece.mimeType !== "string" ||
      typeof piece.fileSizeBytes !== "number"
    ) {
      throw new StorageValidationError("Payload de pieza inválido.");
    }

    validateUploadUrlInput({
      fileSizeBytes: piece.fileSizeBytes,
      filename: piece.filename,
      mimeType: piece.mimeType,
      purpose: "piece-version",
    });

    return {
      fileSizeBytes: piece.fileSizeBytes,
      filename: piece.filename,
      mimeType: piece.mimeType,
    } satisfies PreparedDeliveryPiece;
  });

  return {
    pieces,
    type: input.type,
  };
}

export function validateFinalizeDeliveryInput(input: unknown) {
  if (
    !isRecord(input) ||
    typeof input.deliveryId !== "string" ||
    !input.deliveryId.trim() ||
    !isDeliveryType(input.type)
  ) {
    throw new StorageValidationError("Payload de entrega inválido.");
  }

  if (!Array.isArray(input.pieces) || input.pieces.length === 0) {
    throw new StorageValidationError("Agregá al menos una pieza.");
  }

  const deliveryId = input.deliveryId.trim();
  const pieces = input.pieces.map((piece, index) => {
    if (
      !isRecord(piece) ||
      typeof piece.pieceId !== "string" ||
      typeof piece.position !== "number" ||
      typeof piece.originalFilename !== "string" ||
      typeof piece.mimeType !== "string" ||
      typeof piece.fileSizeBytes !== "number" ||
      typeof piece.storageKey !== "string"
    ) {
      throw new StorageValidationError("Payload de pieza inválido.");
    }

    const expectedPosition = index + 1;
    const pieceId = piece.pieceId.trim();

    if (!pieceId || piece.position !== expectedPosition) {
      throw new StorageValidationError("El orden de piezas no es válido.");
    }

    validateUploadUrlInput({
      fileSizeBytes: piece.fileSizeBytes,
      filename: piece.originalFilename,
      mimeType: piece.mimeType,
      purpose: "piece-version",
    });
    assertPieceVersionV1StorageKey({
      deliveryId,
      pieceId,
      storageKey: piece.storageKey,
    });

    return {
      fileSizeBytes: piece.fileSizeBytes,
      mimeType: piece.mimeType,
      note: normalizeOptionalNote(piece.note),
      originalFilename: piece.originalFilename.trim(),
      pieceId,
      position: expectedPosition,
      storageKey: piece.storageKey,
    } satisfies FinalizeDeliveryPiece;
  });

  return {
    deliveryId,
    generalNote: normalizeOptionalNote(input.generalNote),
    pieces,
    type: input.type,
  };
}

export function assertPieceVersionV1StorageKey({
  deliveryId,
  pieceId,
  storageKey,
}: {
  deliveryId: string;
  pieceId: string;
  storageKey: string;
}) {
  assertValidStorageKey(storageKey);

  const prefix = `deliveries/${deliveryId}/pieces/${pieceId}/v1/`;
  const filenameSegment = storageKey.slice(prefix.length);

  if (
    !storageKey.startsWith(prefix) ||
    !filenameSegment ||
    filenameSegment.includes("/")
  ) {
    throw new StorageValidationError("Storage key de pieza inválida.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDeliveryType(value: unknown): value is DeliveryType {
  return value === DeliveryType.STORIES || value === DeliveryType.FEED;
}
