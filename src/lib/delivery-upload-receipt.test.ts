import assert from "node:assert/strict";

import {
  assertDeliveryUploadReceiptUser,
  createDeliveryUploadReceipt,
  DELIVERY_UPLOAD_RECEIPT_EXPIRES_IN_SECONDS,
  verifyDeliveryUploadReceipt,
} from "./delivery-upload-receipt";
import { StorageValidationError } from "./storage/errors";

const secret = "test-delivery-upload-secret";
const now = new Date("2026-08-13T15:00:00.000Z");
const payload = {
  deliveryId: "delivery-1",
  pieces: [
    {
      fileSizeBytes: 2048,
      filename: "story.png",
      mimeType: "image/png",
      pieceId: "piece-1",
      position: 1,
      storageKey: "deliveries/delivery-1/pieces/piece-1/v1/file.png",
    },
  ],
  type: "STORIES" as const,
  userId: "user-1",
};

function assertThrowsStorageValidation(fn: () => void) {
  assert.throws(fn, StorageValidationError);
}

const token = createDeliveryUploadReceipt(payload, { now, secret });
const verifiedPayload = verifyDeliveryUploadReceipt(token, { now, secret });

assert.equal(verifiedPayload.deliveryId, payload.deliveryId);
assert.equal(verifiedPayload.userId, "user-1");
assert.equal(verifiedPayload.type, "STORIES");
assert.equal(verifiedPayload.pieces[0]?.pieceId, "piece-1");
assert.equal(
  verifiedPayload.pieces[0]?.storageKey,
  "deliveries/delivery-1/pieces/piece-1/v1/file.png",
);
assert.equal(verifiedPayload.pieces[0]?.filename, "story.png");
assert.equal(verifiedPayload.pieces[0]?.mimeType, "image/png");
assert.equal(verifiedPayload.pieces[0]?.fileSizeBytes, 2048);

const [encodedPayload, signature] = token.split(".");
assert(encodedPayload);
assert(signature);

const manipulatedSignature = `${encodedPayload}.${signature.slice(0, -1)}x`;
assertThrowsStorageValidation(() =>
  verifyDeliveryUploadReceipt(manipulatedSignature, { now, secret }),
);

const decodedPayload = JSON.parse(
  Buffer.from(encodedPayload, "base64url").toString("utf8"),
) as typeof verifiedPayload;
decodedPayload.userId = "user-2";
const manipulatedPayload = `${Buffer.from(JSON.stringify(decodedPayload)).toString(
  "base64url",
)}.${signature}`;
assertThrowsStorageValidation(() =>
  verifyDeliveryUploadReceipt(manipulatedPayload, { now, secret }),
);

assertThrowsStorageValidation(() =>
  verifyDeliveryUploadReceipt(token, {
    now: new Date(
      now.getTime() + (DELIVERY_UPLOAD_RECEIPT_EXPIRES_IN_SECONDS + 1) * 1000,
    ),
    secret,
  }),
);

assert.doesNotThrow(() =>
  assertDeliveryUploadReceiptUser(verifiedPayload, "user-1"),
);
assertThrowsStorageValidation(() =>
  assertDeliveryUploadReceiptUser(verifiedPayload, "another-user"),
);

console.log("delivery upload receipt unit tests passed");
