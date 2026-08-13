import "server-only";

import { Prisma, SyncOperationStatus } from "@prisma/client";

import { DRIVE_BACKUP_OPERATION_TYPE } from "@/lib/drive/backup-format";
import { resolveDriveBackupRefreshAction } from "@/lib/drive/enqueue-rules";

export type DriveBackupRefreshReason =
  | "feedback-added"
  | "piece-review"
  | "piece-version-uploaded";

export type DriveBackupRefreshResult =
  | {
      action: "created-pending";
      syncOperationId: string;
    }
  | {
      action: "reused-pending";
      syncOperationId: string;
    }
  | {
      action: "blocked-by-failed";
      syncOperationId: string;
    };

export async function enqueueDriveBackupRefresh(
  tx: Prisma.TransactionClient,
  {
    createdByUserId,
    deliveryId,
    entityId,
    entityType,
    reason,
  }: {
    createdByUserId: string;
    deliveryId: string;
    entityId?: string;
    entityType?: string;
    reason: DriveBackupRefreshReason;
  },
): Promise<DriveBackupRefreshResult> {
  const existingOperations = await tx.syncOperation.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      status: true,
    },
    where: {
      deliveryId,
      status: {
        in: [
          SyncOperationStatus.PENDING,
          SyncOperationStatus.SYNCING,
          SyncOperationStatus.FAILED,
        ],
      },
      type: DRIVE_BACKUP_OPERATION_TYPE,
    },
  });

  const resolvedAction = resolveDriveBackupRefreshAction(existingOperations);

  if (resolvedAction) {
    return resolvedAction;
  }

  const operation = await tx.syncOperation.create({
    data: {
      createdByUserId,
      deliveryId,
      entityId: deliveryId,
      entityType: "DELIVERY",
      payload: {
        deliveryId,
        reason,
        triggerEntityId: entityId ?? null,
        triggerEntityType: entityType ?? null,
      },
      status: SyncOperationStatus.PENDING,
      type: DRIVE_BACKUP_OPERATION_TYPE,
    },
    select: {
      id: true,
    },
  });

  return {
    action: "created-pending",
    syncOperationId: operation.id,
  };
}
