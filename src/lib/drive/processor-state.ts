import { SyncOperationStatus } from "@prisma/client";

import { DRIVE_BACKUP_OPERATION_TYPE } from "./backup-format";
import { DriveOperationError } from "./errors";

export function canStartDriveBackup(status: SyncOperationStatus) {
  return (
    status === SyncOperationStatus.PENDING ||
    status === SyncOperationStatus.FAILED
  );
}

export function isSyncedDriveBackup(status: SyncOperationStatus) {
  return status === SyncOperationStatus.SYNCED;
}

export function assertDriveBackupOperationType(type: string) {
  if (type !== DRIVE_BACKUP_OPERATION_TYPE) {
    throw new DriveOperationError("Tipo de SyncOperation no soportado.", {
      code: "DRIVE_UNSUPPORTED_SYNC_OPERATION",
    });
  }
}
