import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/drive/_shared";
import { checkDriveHealth } from "@/lib/drive/client";
import {
  getDriveErrorCode,
  getPublicDriveErrorMessage,
  sanitizeDriveErrorMessage,
} from "@/lib/drive/errors";
import {
  markDriveChecking,
  markDriveConnected,
  markDriveProblem,
} from "@/lib/drive/state";

export const runtime = "nodejs";

export async function GET() {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  await markDriveChecking();

  try {
    const health = await checkDriveHealth();
    await markDriveConnected();

    return NextResponse.json({
      health,
      status: "CONNECTED",
    });
  } catch (error) {
    await markDriveProblem({
      errorCode: getDriveErrorCode(error),
      errorMessage: sanitizeDriveErrorMessage(error),
    });

    return NextResponse.json(
      {
        error: getPublicDriveErrorMessage(error),
        status: "PROBLEM",
      },
      { status: 500 },
    );
  }
}
