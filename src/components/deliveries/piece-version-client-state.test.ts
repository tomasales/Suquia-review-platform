import assert from "node:assert/strict";

import {
  getOptimisticVersionIdsToDrop,
  mergePieceVersions,
  resolveFinalizeFailure,
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
assert.equal(resolveFinalizeFailure({ status: 409 }).discardAttempt, true);
assert.equal(resolveFinalizeFailure({ status: 400 }).discardAttempt, true);
assert.equal(
  resolveFinalizeFailure({ status: 409 }).title,
  "Hay una versión más nueva",
);

console.log("piece version client state unit tests passed");
