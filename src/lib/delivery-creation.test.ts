import assert from "node:assert/strict";

import { DeliveryType } from "@prisma/client";

import {
  assertPieceVersionV1StorageKey,
  generateDeliveryTitle,
  normalizeOptionalNote,
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
  deliveryId: "delivery-1",
  generalNote: "  Nota general  ",
  pieces: [
    {
      fileSizeBytes: 2048,
      mimeType: "image/webp",
      note: "  Nota pieza  ",
      originalFilename: "feed.webp",
      pieceId: "piece-1",
      position: 1,
      storageKey: "deliveries/delivery-1/pieces/piece-1/v1/file.webp",
    },
  ],
  type: "FEED",
});
assert.equal(finalizeInput.generalNote, "Nota general");
assert.equal(finalizeInput.pieces[0]?.note, "Nota pieza");
assert.equal(finalizeInput.pieces[0]?.position, 1);

assertThrowsStorageValidation(() =>
  validateFinalizeDeliveryInput({
    deliveryId: "delivery-1",
    pieces: [
      {
        fileSizeBytes: 2048,
        mimeType: "image/webp",
        originalFilename: "feed.webp",
        pieceId: "piece-1",
        position: 2,
        storageKey: "deliveries/delivery-1/pieces/piece-1/v1/file.webp",
      },
    ],
    type: "FEED",
  }),
);

console.log("delivery creation unit tests passed");
