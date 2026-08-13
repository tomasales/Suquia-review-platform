import { SyncOperationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  driveApiErrorResponse,
  getApiAuthorizedUser,
} from "@/app/api/drive/_shared";
import { db } from "@/lib/db";
import { DRIVE_BACKUP_OPERATION_TYPE } from "@/lib/drive/backup-format";
import { processDriveBackupOperation } from "@/lib/drive/processor";

export const runtime = "nodejs";

export async function POST() {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  const operation = await db.syncOperation.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    where: {
      status: SyncOperationStatus.PENDING,
      type: DRIVE_BACKUP_OPERATION_TYPE,
    },
  });

  if (!operation) {
    return NextResponse.json({
      processed: false,
    });
  }

  try {
    const result = await processDriveBackupOperation(operation.id);

    return NextResponse.json({
      processed: true,
      result,
    });
  } catch (error) {
    return driveApiErrorResponse(error);
  }
}
