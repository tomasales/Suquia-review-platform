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

type BaseUploadReceiptPayload = {
  expiresAt: number;
  issuedAt: number;
  kind: "delivery-creation" | "piece-version-upload";
  userId: string;
};

export type DeliveryUploadReceiptPayload = BaseUploadReceiptPayload & {
  deliveryId: string;
  kind: "delivery-creation";
  pieces: DeliveryUploadReceiptPiece[];
  type: "STORIES" | "FEED";
};

export type PieceVersionUploadReceiptPayload = BaseUploadReceiptPayload & {
  deliveryId: string;
  fileSizeBytes: number;
  filename: string;
  kind: "piece-version-upload";
  mimeType: string;
  newPieceVersionId: string;
  nextVersionNumber: number;
  pieceId: string;
  previousLatestVersionId: string;
  previousLatestVersionNumber: number;
  storageKey: string;
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
  payload: Omit<DeliveryUploadReceiptPayload, "expiresAt" | "issuedAt" | "kind">,
  options: CreateReceiptOptions = {},
) {
  const now = options.now ?? new Date();
  const issuedAt = Math.floor(now.getTime() / 1000);
  const receiptPayload: DeliveryUploadReceiptPayload = {
    deliveryId: payload.deliveryId,
    expiresAt: issuedAt + DELIVERY_UPLOAD_RECEIPT_EXPIRES_IN_SECONDS,
    issuedAt,
    kind: "delivery-creation",
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

  return createUploadReceiptToken(receiptPayload, options);
}

export function verifyDeliveryUploadReceipt(
  token: string,
  options: VerifyReceiptOptions = {},
) {
  const payload = verifyUploadReceipt(token, options);

  if (payload.kind !== "delivery-creation") {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  return payload;
}

export function createPieceVersionUploadReceipt(
  payload: Omit<PieceVersionUploadReceiptPayload, "expiresAt" | "issuedAt" | "kind">,
  options: CreateReceiptOptions = {},
) {
  const now = options.now ?? new Date();
  const issuedAt = Math.floor(now.getTime() / 1000);
  const receiptPayload: PieceVersionUploadReceiptPayload = {
    deliveryId: payload.deliveryId,
    expiresAt: issuedAt + DELIVERY_UPLOAD_RECEIPT_EXPIRES_IN_SECONDS,
    fileSizeBytes: payload.fileSizeBytes,
    filename: payload.filename,
    issuedAt,
    kind: "piece-version-upload",
    mimeType: payload.mimeType,
    newPieceVersionId: payload.newPieceVersionId,
    nextVersionNumber: payload.nextVersionNumber,
    pieceId: payload.pieceId,
    previousLatestVersionId: payload.previousLatestVersionId,
    previousLatestVersionNumber: payload.previousLatestVersionNumber,
    storageKey: payload.storageKey,
    userId: payload.userId,
  };

  return createUploadReceiptToken(receiptPayload, options);
}

export function verifyPieceVersionUploadReceipt(
  token: string,
  options: VerifyReceiptOptions = {},
) {
  const payload = verifyUploadReceipt(token, options);

  if (payload.kind !== "piece-version-upload") {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  return payload;
}

function createUploadReceiptToken(
  payload: DeliveryUploadReceiptPayload | PieceVersionUploadReceiptPayload,
  options: CreateReceiptOptions,
) {
  const encodedPayload = base64UrlEncode(JSON.stringify(sortJsonValue(payload)));
  const signature = signEncodedPayload(encodedPayload, getReceiptSecret(options));

  return `${encodedPayload}.${signature}`;
}

function verifyUploadReceipt(
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
  payload: DeliveryUploadReceiptPayload | PieceVersionUploadReceiptPayload,
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

function parseReceiptPayload(
  encodedPayload: string,
): DeliveryUploadReceiptPayload | PieceVersionUploadReceiptPayload {
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
    (payload.kind !== "delivery-creation" &&
      payload.kind !== "piece-version-upload") ||
    typeof payload.userId !== "string"
  ) {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  if (payload.kind === "piece-version-upload") {
    return parsePieceVersionUploadReceiptPayload(payload);
  }

  if (
    !Array.isArray(payload.pieces) ||
    (payload.type !== "STORIES" && payload.type !== "FEED")
  ) {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  return {
    deliveryId: payload.deliveryId,
    expiresAt: payload.expiresAt,
    issuedAt: payload.issuedAt,
    kind: "delivery-creation",
    pieces: payload.pieces.map(parseReceiptPiece),
    type: payload.type,
    userId: payload.userId,
  };
}

function parsePieceVersionUploadReceiptPayload(
  payload: Record<string, unknown>,
): PieceVersionUploadReceiptPayload {
  if (
    typeof payload.fileSizeBytes !== "number" ||
    typeof payload.filename !== "string" ||
    typeof payload.mimeType !== "string" ||
    typeof payload.newPieceVersionId !== "string" ||
    typeof payload.nextVersionNumber !== "number" ||
    typeof payload.pieceId !== "string" ||
    typeof payload.previousLatestVersionId !== "string" ||
    typeof payload.previousLatestVersionNumber !== "number" ||
    typeof payload.storageKey !== "string"
  ) {
    throw new StorageValidationError("Receipt de subida inválido.");
  }

  return {
    deliveryId: payload.deliveryId as string,
    expiresAt: payload.expiresAt as number,
    fileSizeBytes: payload.fileSizeBytes,
    filename: payload.filename,
    issuedAt: payload.issuedAt as number,
    kind: "piece-version-upload",
    mimeType: payload.mimeType,
    newPieceVersionId: payload.newPieceVersionId,
    nextVersionNumber: payload.nextVersionNumber,
    pieceId: payload.pieceId,
    previousLatestVersionId: payload.previousLatestVersionId,
    previousLatestVersionNumber: payload.previousLatestVersionNumber,
    storageKey: payload.storageKey,
    userId: payload.userId as string,
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
