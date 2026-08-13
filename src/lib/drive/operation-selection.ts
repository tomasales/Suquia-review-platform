import { SyncOperationStatus } from "@prisma/client";

import { DRIVE_BACKUP_OPERATION_TYPE } from "./backup-format";

export function getDriveBackupOperationWhere(status: SyncOperationStatus) {
  return {
    status,
    type: DRIVE_BACKUP_OPERATION_TYPE,
  };
}

export function getOldestPendingDriveBackupQuery() {
  return {
    orderBy: {
      createdAt: "asc" as const,
    },
    where: getDriveBackupOperationWhere(SyncOperationStatus.PENDING),
  };
}

export function getOldestFailedDriveBackupQuery() {
  return {
    orderBy: {
      createdAt: "asc" as const,
    },
    where: getDriveBackupOperationWhere(SyncOperationStatus.FAILED),
  };
}
