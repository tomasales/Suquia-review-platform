import "server-only";

import type { Prisma } from "@prisma/client";

export async function lockDeliveryForMutation(
  tx: Prisma.TransactionClient,
  deliveryId: string,
) {
  await tx.$queryRaw`
    SELECT id
    FROM "Delivery"
    WHERE id = ${deliveryId}
    FOR UPDATE
  `;
}
