import { NextResponse } from "next/server";

import { guidelineApiErrorResponse } from "@/app/api/guidelines/_shared";
import { getApiAuthorizedUser } from "@/app/api/storage/_shared";
import { getActiveBrandManualStorageKey } from "@/lib/guidelines";
import { createReadUrl } from "@/lib/storage/storage";

export const runtime = "nodejs";

export async function POST() {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const storageKey = await getActiveBrandManualStorageKey();

    if (!storageKey) {
      return NextResponse.json(
        { error: "No hay un manual activo." },
        { status: 404 },
      );
    }

    return NextResponse.json(await createReadUrl(storageKey));
  } catch (error) {
    return guidelineApiErrorResponse(error);
  }
}
