import { NextResponse } from "next/server";

import {
  deliveryApiErrorResponse,
  getApiAuthorizedUser,
} from "@/app/api/deliveries/_shared";
import { validatePrepareDeliveryInput } from "@/lib/delivery-creation";
import {
  buildPieceVersionStorageKey,
  createUploadUrlForStorageKey,
} from "@/lib/storage/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { response } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const input = validatePrepareDeliveryInput(await request.json());
    const deliveryId = crypto.randomUUID();
    const pieces = await Promise.all(
      input.pieces.map(async (piece, index) => {
        const pieceId = crypto.randomUUID();
        const storageKey = buildPieceVersionStorageKey({
          deliveryId,
          filename: piece.filename,
          pieceId,
          versionNumber: 1,
        });
        const upload = await createUploadUrlForStorageKey({
          fileSizeBytes: piece.fileSizeBytes,
          filename: piece.filename,
          mimeType: piece.mimeType,
          storageKey,
        });

        return {
          expiresAt: upload.expiresAt,
          pieceId,
          position: index + 1,
          storageKey,
          uploadUrl: upload.uploadUrl,
        };
      }),
    );

    return NextResponse.json({
      deliveryId,
      pieces,
    });
  } catch (error) {
    return deliveryApiErrorResponse(error);
  }
}
