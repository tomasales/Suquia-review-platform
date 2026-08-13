import { SyncOperationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/drive/_shared";
import { db } from "@/lib/db";
import { DRIVE_SYNC_STATE_KEY } from "@/lib/drive/backup-format";
import { getDriveBackupOperationWhere } from "@/lib/drive/operation-selection";
import { buildDriveStatusResponse } from "@/lib/drive/status-format";

export const runtime = "nodejs";

export async function GET() {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  const [state, pending, syncing, failed] = await Promise.all([
    db.driveSyncState.findUnique({
      select: {
        lastCheckedAt: true,
        lastErrorCode: true,
        lastSuccessAt: true,
        status: true,
      },
      where: {
        key: DRIVE_SYNC_STATE_KEY,
      },
    }),
    db.syncOperation.count({
      where: getDriveBackupOperationWhere(SyncOperationStatus.PENDING),
    }),
    db.syncOperation.count({
      where: getDriveBackupOperationWhere(SyncOperationStatus.SYNCING),
    }),
    db.syncOperation.count({
      where: getDriveBackupOperationWhere(SyncOperationStatus.FAILED),
    }),
  ]);

  return NextResponse.json(
    buildDriveStatusResponse({
      counts: {
        failed,
        pending,
        syncing,
      },
      state,
    }),
  );
}
