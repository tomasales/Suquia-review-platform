import assert from "node:assert/strict";

import { DeliveryType } from "@prisma/client";

import {
  assertPieceVersionV1StorageKey,
  getReceiptFinalizePieces,
  generateDeliveryTitle,
  normalizeOptionalNote,
  validateFinalizeNotesInput,
  validateFinalizeDeliveryInput,
  validatePrepareDeliveryInput,
} from "./delivery-creation";
import { StorageValidationError } from "./storage/errors";

function assertThrowsStorageValidation(fn: () => void) {
  assert.throws(fn, StorageValidationError);
}

assert.equal(
  generateDeliveryTitle({
    pieceCount: 4,
    submittedAt: new Date("2026-08-13T15:00:00.000Z"),
    type: DeliveryType.STORIES,
  }),
  "Stories · 13 ago · 4 piezas",
);

assert.equal(
  generateDeliveryTitle({
    pieceCount: 1,
    submittedAt: new Date("2026-08-13T15:00:00.000Z"),
    type: DeliveryType.FEED,
  }),
  "Feed · 13 ago · 1 pieza",
);

assert.equal(normalizeOptionalNote("  Nota guardada  "), "Nota guardada");
assert.equal(normalizeOptionalNote("   "), null);
assert.equal(normalizeOptionalNote(undefined), null);

const prepareInput = validatePrepareDeliveryInput({
  pieces: [
    {
      fileSizeBytes: 1024,
      filename: "story.png",
      mimeType: "image/png",
    },
  ],
  type: "STORIES",
});
assert.equal(prepareInput.type, DeliveryType.STORIES);
assert.equal(prepareInput.pieces.length, 1);

assertThrowsStorageValidation(() =>
  validatePrepareDeliveryInput({
    pieces: [],
    type: "STORIES",
  }),
);

assertPieceVersionV1StorageKey({
  deliveryId: "delivery-1",
  pieceId: "piece-1",
  storageKey: "deliveries/delivery-1/pieces/piece-1/v1/file.png",
});

assertThrowsStorageValidation(() =>
  assertPieceVersionV1StorageKey({
    deliveryId: "delivery-1",
    pieceId: "piece-1",
    storageKey: "deliveries/delivery-1/pieces/piece-2/v1/file.png",
  }),
);

const finalizeInput = validateFinalizeDeliveryInput({
  attemptToken: "receipt-token",
  generalNote: "  Nota general  ",
  pieces: [
    {
      note: "  Nota pieza  ",
      pieceId: "piece-1",
    },
  ],
});
assert.equal(finalizeInput.generalNote, "Nota general");
assert.equal(finalizeInput.attemptToken, "receipt-token");

const notesInput = validateFinalizeNotesInput({
  allowedPieceIds: ["piece-1"],
  generalNote: "  Nota general  ",
  pieces: [
    {
      note: "  Nota pieza  ",
      pieceId: "piece-1",
    },
  ],
});
assert.equal(notesInput.generalNote, "Nota general");
assert.equal(notesInput.pieceNotes.get("piece-1"), "Nota pieza");

assertThrowsStorageValidation(() =>
  validateFinalizeNotesInput({
    allowedPieceIds: ["piece-1"],
    generalNote: null,
    pieces: [
      {
        pieceId: "piece-2",
      },
    ],
  }),
);

assertThrowsStorageValidation(() =>
  validateFinalizeNotesInput({
    allowedPieceIds: ["piece-1"],
    generalNote: null,
    pieces: [{ pieceId: "piece-1" }, { pieceId: "piece-1" }],
  }),
);

const receiptPieces = getReceiptFinalizePieces({
  deliveryId: "delivery-1",
  expiresAt: 1,
  issuedAt: 0,
  pieces: [
    {
      fileSizeBytes: 2048,
      filename: "feed.webp",
      mimeType: "image/webp",
      pieceId: "piece-1",
      position: 1,
      storageKey: "deliveries/delivery-1/pieces/piece-1/v1/file.webp",
    },
  ],
  type: DeliveryType.FEED,
  userId: "user-1",
});
assert.equal(receiptPieces[0]?.originalFilename, "feed.webp");
assert.equal(receiptPieces[0]?.position, 1);

console.log("delivery creation unit tests passed");
