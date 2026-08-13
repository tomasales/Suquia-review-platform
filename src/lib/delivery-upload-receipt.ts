import { createHmac, timingSafeEqual } from "node:crypto";

import {
  StorageConfigurationError,
  StorageValidationError,
} from "./storage/errors";

export const DELIVERY_UPLOAD_RECEIPT_EXPIRES_IN_SECONDS = 30 * 60;

export type DeliveryUploadReceiptPiece = {
  fileSizeBytes: number;
  filename: string;
  mimeType: string;
  pieceId: string;
  position: number;
  storageKey: string;
};

export type DeliveryUploadReceiptPayload = {
  deliveryId: string;
  expiresAt: number;
  issuedAt: number;
  pieces: DeliveryUploadReceiptPiece[];
  type: "STORIES" | "FEED";
  userId: string;
};

type CreateReceiptOptions = {
  now?: Date;
  secret?: string;
};

type VerifyReceiptOptions = {
  now?: Date;
  secret?: string;
};

export function createDeliveryUploadReceipt(
  payload: Omit<DeliveryUploadReceiptPayload, "expiresAt" | "issuedAt">,
  options: CreateReceiptOptions = {},
) {
  const now = options.now ?? new Date();
  const issuedAt = Math.floor(now.getTime() / 1000);
  const receiptPayload: DeliveryUploadReceiptPayload = {
    deliveryId: payload.deliveryId,
    expiresAt: issuedAt + DELIVERY_UPLOAD_RECEIPT_EXPIRES_IN_SECONDS,
    issuedAt,
    pieces: payload.pieces.map((piece) => ({
      fileSizeBytes: piece.fileSizeBytes,
      filename: piece.filename,
      mimeType: piece.mimeType,
      pieceId: piece.pieceId,
      position: piece.position,
      storageKey: piece.storageKey,
    })),
    type: payload.type,
    userId: payload.userId,
  };
  const encodedPayload = base64UrlEncode(
    JSON.stringify(sortJsonValue(receiptPayload)),
  );
  const signature = signEncodedPayload(encodedPayload, getReceiptSecret(options));

  return `${encodedPayload}.${signature}`;
}

export function verifyDeliveryUploadReceipt(
  token: string,
  options: VerifyReceiptOptions = {},
) {
  const [encodedPayload, signature, extra] = token.split(".");

  if (!encodedPayload || !signature || extra !== undefined) {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  const expectedSignature = signEncodedPayload(
    encodedPayload,
    getReceiptSecret(options),
  );

  if (!timingSafeEqualString(signature, expectedSignature)) {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  const payload = parseReceiptPayload(encodedPayload);
  const now = Math.floor((options.now ?? new Date()).getTime() / 1000);

  if (payload.expiresAt <= now) {
    throw new StorageValidationError("El intento de subida expiró. Intentá nuevamente.");
  }

  return payload;
}

export function assertDeliveryUploadReceiptUser(
  payload: DeliveryUploadReceiptPayload,
  userId: string,
) {
  if (payload.userId !== userId) {
    throw new StorageValidationError("Receipt de subida inválido.");
  }
}

export function getReceiptSecret(options: { secret?: string } = {}) {
  const secret = options.secret ?? process.env.DELIVERY_UPLOAD_SECRET;

  if (!secret?.trim()) {
    throw new StorageConfigurationError("DELIVERY_UPLOAD_SECRET is required.");
  }

  return secret;
}

function parseReceiptPayload(encodedPayload: string): DeliveryUploadReceiptPayload {
  let payload: unknown;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  if (
    !isRecord(payload) ||
    typeof payload.deliveryId !== "string" ||
    typeof payload.expiresAt !== "number" ||
    typeof payload.issuedAt !== "number" ||
    !Array.isArray(payload.pieces) ||
    (payload.type !== "STORIES" && payload.type !== "FEED") ||
    typeof payload.userId !== "string"
  ) {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  return {
    deliveryId: payload.deliveryId,
    expiresAt: payload.expiresAt,
    issuedAt: payload.issuedAt,
    pieces: payload.pieces.map(parseReceiptPiece),
    type: payload.type,
    userId: payload.userId,
  };
}

function parseReceiptPiece(piece: unknown): DeliveryUploadReceiptPiece {
  if (
    !isRecord(piece) ||
    typeof piece.fileSizeBytes !== "number" ||
    typeof piece.filename !== "string" ||
    typeof piece.mimeType !== "string" ||
    typeof piece.pieceId !== "string" ||
    typeof piece.position !== "number" ||
    typeof piece.storageKey !== "string"
  ) {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  return {
    fileSizeBytes: piece.fileSizeBytes,
    filename: piece.filename,
    mimeType: piece.mimeType,
    pieceId: piece.pieceId,
    position: piece.position,
    storageKey: piece.storageKey,
  };
}

function signEncodedPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function timingSafeEqualString(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.byteLength !== rightBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortJsonValue(value[key]);
        return result;
      }, {});
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
