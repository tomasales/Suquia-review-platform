-- Move review state from Piece to the latest PieceVersion for each Piece.
-- Existing Piece.reviewState values are preserved by copying them to the
-- highest versionNumber currently associated with the Piece before dropping
-- the old column.

ALTER TABLE "PieceVersion" ADD COLUMN "reviewState" "PieceReviewState";

UPDATE "PieceVersion" AS pv
SET "reviewState" = p."reviewState"
FROM "Piece" AS p
WHERE pv."pieceId" = p."id"
  AND pv."versionNumber" = (
    SELECT MAX(pv_latest."versionNumber")
    FROM "PieceVersion" AS pv_latest
    WHERE pv_latest."pieceId" = p."id"
  );

DROP INDEX IF EXISTS "Piece_reviewState_idx";

ALTER TABLE "Piece" DROP COLUMN "reviewState";

CREATE INDEX "PieceVersion_reviewState_idx" ON "PieceVersion"("reviewState");
