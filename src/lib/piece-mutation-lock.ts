import "server-only";

import type { Prisma } from "@prisma/client";

export async function lockPieceForMutation(
  tx: Prisma.TransactionClient,
  pieceId: string,
) {
  await tx.$queryRaw`
    SELECT id
    FROM "Piece"
    WHERE id = ${pieceId}
    FOR UPDATE
  `;
}
