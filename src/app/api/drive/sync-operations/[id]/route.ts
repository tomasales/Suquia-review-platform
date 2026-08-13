import { NextResponse } from "next/server";

import {
  driveApiErrorResponse,
  getApiAuthorizedUser,
} from "@/app/api/drive/_shared";
import { processDriveBackupOperation } from "@/lib/drive/processor";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  const { id } = await context.params;

  try {
    const result = await processDriveBackupOperation(id);

    return NextResponse.json(result);
  } catch (error) {
    return driveApiErrorResponse(error);
  }
}
