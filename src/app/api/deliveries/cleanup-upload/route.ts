import { NextResponse } from "next/server";

import {
  DeliveryConflictError,
  deliveryApiErrorResponse,
  getApiAuthorizedUser,
} from "@/app/api/deliveries/_shared";
import { validateFinalizeDeliveryInput } from "@/lib/delivery-creation";
import {
  assertDeliveryUploadReceiptUser,
  verifyDeliveryUploadReceipt,
} from "@/lib/delivery-upload-receipt";
import { db } from "@/lib/db";
import { deleteObject } from "@/lib/storage/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { response, user } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const input = validateFinalizeDeliveryInput(await request.json());
    const receipt = verifyDeliveryUploadReceipt(input.attemptToken);
    assertDeliveryUploadReceiptUser(receipt, user.id);

    const existingDelivery = await db.delivery.findUnique({
      where: {
        id: receipt.deliveryId,
      },
      select: {
        createdByUserId: true,
      },
    });

    if (existingDelivery) {
      if (existingDelivery.createdByUserId !== user.id) {
        throw new DeliveryConflictError("La entrega ya existe.");
      }

      return NextResponse.json({
        deliveryId: receipt.deliveryId,
        skipped: true,
      });
    }

    await Promise.allSettled(
      receipt.pieces.map((piece) => deleteObject(piece.storageKey)),
    );

    return NextResponse.json({
      deliveryId: receipt.deliveryId,
      skipped: false,
    });
  } catch (error) {
    return deliveryApiErrorResponse(error);
  }
}
