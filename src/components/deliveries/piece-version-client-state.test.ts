import assert from "node:assert/strict";

import {
  getFeedbackSubmitLabel,
  getFeedbackReferenceFileError,
  getFeedbackReferenceIdentityKey,
  getFeedbackReferenceSlotsAvailable,
  getOptimisticVersionIdsToDrop,
  isFeedbackAttachmentAttemptFrozen,
  mergePieceVersions,
  resolveFinalizeFailure,
  resolveReviewMutationFailure,
} from "./piece-version-client-state";

const persistedVersions = [
  { id: "version-2", source: "persisted", versionNumber: 2 },
  { id: "version-1", source: "persisted", versionNumber: 1 },
];

const optimisticDuplicateById = [
  { id: "version-2", source: "optimistic", versionNumber: 2 },
];

assert.deepEqual(
  mergePieceVersions(persistedVersions, optimisticDuplicateById),
  persistedVersions,
);
assert.deepEqual(
  getOptimisticVersionIdsToDrop(
    persistedVersions,
    optimisticDuplicateById,
  ),
  ["version-2"],
);

const optimisticDuplicateByVersionNumber = [
  { id: "optimistic-version-2", source: "optimistic", versionNumber: 2 },
];

assert.deepEqual(
  mergePieceVersions(persistedVersions, optimisticDuplicateByVersionNumber),
  persistedVersions,
);
assert.deepEqual(
  getOptimisticVersionIdsToDrop(
    persistedVersions,
    optimisticDuplicateByVersionNumber,
  ),
  ["optimistic-version-2"],
);

assert.deepEqual(
  mergePieceVersions(persistedVersions, [
    { id: "optimistic-version-3", source: "optimistic", versionNumber: 3 },
  ]).map((version) => version.versionNumber),
  [3, 2, 1],
);

assert.equal(resolveFinalizeFailure({ status: 500 }).discardAttempt, false);
assert.equal(resolveFinalizeFailure({ isNetworkError: true }).discardAttempt, false);
assert.equal(resolveFinalizeFailure({}).discardAttempt, false);
assert.equal(
  resolveFinalizeFailure({ code: "VERSION_CONFLICT", status: 409 })
    .discardAttempt,
  true,
);
assert.equal(
  resolveFinalizeFailure({ code: "DELIVERY_CLOSED", status: 409 }).title,
  "La entrega está cerrada",
);
assert.equal(resolveFinalizeFailure({ status: 409 }).discardAttempt, false);
assert.equal(resolveFinalizeFailure({ status: 400 }).discardAttempt, true);
assert.equal(
  resolveFinalizeFailure({ code: "VERSION_CONFLICT", status: 409 }).title,
  "Hay una versión más nueva",
);
assert.equal(
  resolveReviewMutationFailure({
    code: "HISTORICAL_VERSION",
    operation: "review",
  }).title,
  "Hay una versión más nueva",
);
assert.equal(
  resolveReviewMutationFailure({
    code: "DELIVERY_CLOSED",
    operation: "feedback",
  }).title,
  "La entrega está cerrada",
);
assert.equal(
  resolveReviewMutationFailure({
    code: "HISTORICAL_VERSION",
    operation: "feedback",
  }).description,
  "Tu texto sigue acá. Revisá la versión actual antes de enviarlo.",
);
assert.equal(
  resolveReviewMutationFailure({
    code: undefined,
    operation: "feedback",
  }).title,
  "No pudimos guardar el feedback",
);
assert.equal(
  getFeedbackReferenceIdentityKey({
    lastModified: 123,
    name: "ref.png",
    size: 456,
  }),
  "ref.png-456-123",
);
assert.equal(
  getFeedbackReferenceFileError({ size: 1024, type: "image/png" }),
  null,
);
assert.equal(
  getFeedbackReferenceFileError({ size: 1024, type: "image/gif" }),
  "Tipo de archivo no compatible.",
);
assert.equal(getFeedbackReferenceSlotsAvailable(9), 1);
assert.equal(getFeedbackReferenceSlotsAvailable(10), 0);
assert.equal(
  isFeedbackAttachmentAttemptFrozen({
    phase: "finalize-error",
    uploaded: true,
  }),
  true,
);
assert.equal(
  isFeedbackAttachmentAttemptFrozen({
    phase: "finalizing",
    uploaded: true,
  }),
  true,
);
assert.equal(
  isFeedbackAttachmentAttemptFrozen({
    phase: "uploaded",
    uploaded: true,
  }),
  false,
);
assert.equal(
  getFeedbackSubmitLabel({
    isSubmitting: false,
    phase: "finalize-error",
    uploaded: true,
  }),
  "Reintentar",
);
assert.equal(
  getFeedbackSubmitLabel({
    isSubmitting: true,
    phase: "uploading",
    uploaded: false,
  }),
  "Subiendo referencias...",
);

console.log("piece version client state unit tests passed");
