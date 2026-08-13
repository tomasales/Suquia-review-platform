import { NextResponse } from "next/server";

import {
  driveApiErrorResponse,
  getApiAuthorizedUser,
} from "@/app/api/drive/_shared";
import { db } from "@/lib/db";
import { getOldestFailedDriveBackupQuery } from "@/lib/drive/operation-selection";
import { processDriveBackupOperation } from "@/lib/drive/processor";

export const runtime = "nodejs";

export async function POST() {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  const operation = await db.syncOperation.findFirst(
    getOldestFailedDriveBackupQuery(),
  );

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
