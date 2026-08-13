import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/storage/_shared";
import {
  DriveOperationError,
  getDriveErrorCode,
  getPublicDriveErrorMessage,
} from "@/lib/drive/errors";

export { getApiAuthorizedUser };

export function driveApiErrorResponse(error: unknown) {
  let status = 500;

  if (error instanceof DriveOperationError) {
    if (error.code === "DRIVE_UNSUPPORTED_SYNC_OPERATION") {
      status = 400;
    }

    if (error.code === "DRIVE_SYNC_OPERATION_NOT_FOUND") {
      status = 404;
    }
  }

  return NextResponse.json(
    {
      code: getDriveErrorCode(error),
      error: getPublicDriveErrorMessage(error),
    },
    { status },
  );
}
