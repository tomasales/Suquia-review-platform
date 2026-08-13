import { SyncOperationStatus } from "@prisma/client";

import { DRIVE_BACKUP_OPERATION_TYPE } from "./backup-format";

export function buildAbsorbedPendingFollowUpsWhere({
  createdAtLte,
  deliveryId,
  syncOperationId,
}: {
  createdAtLte?: Date;
  deliveryId: string | null;
  syncOperationId: string;
}) {
  return {
    deliveryId: deliveryId ?? "__missing_delivery_id__",
    id: {
      not: syncOperationId,
    },
    ...(createdAtLte
      ? {
          createdAt: {
            lte: createdAtLte,
          },
        }
      : {}),
    status: SyncOperationStatus.PENDING,
    type: DRIVE_BACKUP_OPERATION_TYPE,
  };
}
