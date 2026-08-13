import { DeliveryStatus, SyncOperationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  DeliveryConflictError,
  deliveryApiErrorResponse,
  getApiAuthorizedUser,
} from "@/app/api/deliveries/_shared";
import {
  generateDeliveryTitle,
  validateFinalizeDeliveryInput,
} from "@/lib/delivery-creation";
import { db } from "@/lib/db";
import { StorageValidationError } from "@/lib/storage/errors";
import { verifyUploadedObject } from "@/lib/storage/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { response, user } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const input = validateFinalizeDeliveryInput(await request.json());
    const existingDelivery = await db.delivery.findUnique({
      where: {
        id: input.deliveryId,
      },
      select: {
        createdByUserId: true,
      },
    });

    if (existingDelivery) {
      if (existingDelivery.createdByUserId === user.id) {
        return NextResponse.json({
          alreadyFinalized: true,
          deliveryId: input.deliveryId,
        });
      }

      throw new DeliveryConflictError("La entrega ya existe.");
    }

    await Promise.all(
      input.pieces.map(async (piece) => {
        const verification = await verifyUploadedObject({
          expectedFileSizeBytes: piece.fileSizeBytes,
          expectedMimeType: piece.mimeType,
          storageKey: piece.storageKey,
        });

        if (!verification.ok) {
          throw new StorageValidationError(
            `No pudimos verificar ${piece.originalFilename}.`,
          );
        }
      }),
    );

    const submittedAt = new Date();
    const generatedTitle = generateDeliveryTitle({
      pieceCount: input.pieces.length,
      submittedAt,
      type: input.type,
    });

    await db.$transaction(async (tx) => {
      await tx.delivery.create({
        data: {
          createdByUserId: user.id,
          generatedTitle,
          generalNote: input.generalNote,
          id: input.deliveryId,
          status: DeliveryStatus.SENT_FOR_REVIEW,
          submittedAt,
          type: input.type,
        },
      });

      for (const piece of input.pieces) {
        await tx.piece.create({
          data: {
            deliveryId: input.deliveryId,
            id: piece.pieceId,
            initialNote: piece.note,
            position: piece.position,
            reviewState: null,
            versions: {
              create: {
                fileSizeBytes: BigInt(piece.fileSizeBytes),
                mimeType: piece.mimeType,
                originalFilename: piece.originalFilename,
                storageKey: piece.storageKey,
                uploadedAt: submittedAt,
                uploadedByUserId: user.id,
                versionNumber: 1,
              },
            },
          },
        });
      }

      await tx.journalEvent.create({
        data: {
          actorUserId: user.id,
          deliveryId: input.deliveryId,
          entityId: input.deliveryId,
          entityType: "DELIVERY",
          eventType: "DELIVERY_SUBMITTED",
          metadata: {
            generatedTitle,
            pieceCount: input.pieces.length,
            type: input.type,
          },
        },
      });

      await tx.syncOperation.create({
        data: {
          createdByUserId: user.id,
          deliveryId: input.deliveryId,
          entityId: input.deliveryId,
          entityType: "DELIVERY",
          payload: {
            deliveryId: input.deliveryId,
          },
          status: SyncOperationStatus.PENDING,
          type: "DRIVE_BACKUP_DELIVERY",
        },
      });
    });

    return NextResponse.json({
      alreadyFinalized: false,
      deliveryId: input.deliveryId,
    });
  } catch (error) {
    return deliveryApiErrorResponse(error);
  }
}
