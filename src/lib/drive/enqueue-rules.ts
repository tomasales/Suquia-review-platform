import { SyncOperationStatus } from "@prisma/client";

type ExistingDriveBackupOperation = {
  id: string;
  status: SyncOperationStatus;
};

export function resolveDriveBackupRefreshAction(
  operations: ExistingDriveBackupOperation[],
) {
  const failed = operations.find(
    (operation) => operation.status === SyncOperationStatus.FAILED,
  );

  if (failed) {
    return {
      action: "blocked-by-failed" as const,
      syncOperationId: failed.id,
    };
  }

  const pending = operations.find(
    (operation) => operation.status === SyncOperationStatus.PENDING,
  );

  if (pending) {
    return {
      action: "reused-pending" as const,
      syncOperationId: pending.id,
    };
  }

  return null;
}
