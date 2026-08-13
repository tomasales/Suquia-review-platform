import {
  DeliveryStatus,
  Prisma,
  SyncOperationStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";

import {
  DeliveryConflictError,
  deliveryApiErrorResponse,
  getApiAuthorizedUser,
} from "@/app/api/deliveries/_shared";
import {
  getReceiptFinalizePieces,
  generateDeliveryTitle,
  validateFinalizeDeliveryInput,
  validateFinalizeNotesInput,
} from "@/lib/delivery-creation";
import {
  assertDeliveryUploadReceiptUser,
  verifyDeliveryUploadReceipt,
} from "@/lib/delivery-upload-receipt";
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
    const requestInput = validateFinalizeDeliveryInput(await request.json());
    const receipt = verifyDeliveryUploadReceipt(requestInput.attemptToken);
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
      if (existingDelivery.createdByUserId === user.id) {
        return NextResponse.json({
          alreadyFinalized: true,
          deliveryId: receipt.deliveryId,
        });
      }

      throw new DeliveryConflictError("La entrega ya existe.");
    }

    const notesInput = validateFinalizeNotesInput({
      allowedPieceIds: receipt.pieces.map((piece) => piece.pieceId),
      generalNote: requestInput.generalNote,
      pieces: requestInput.rawPieces,
    });
    const pieces = getReceiptFinalizePieces(receipt).map((piece) => ({
      ...piece,
      note: notesInput.pieceNotes.get(piece.pieceId) ?? null,
    }));

    await Promise.all(
      pieces.map(async (piece) => {
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
      pieceCount: pieces.length,
      submittedAt,
      type: receipt.type,
    });

    try {
      await db.$transaction(async (tx) => {
        await tx.delivery.create({
          data: {
            createdByUserId: user.id,
            generatedTitle,
            generalNote: notesInput.generalNote,
            id: receipt.deliveryId,
            status: DeliveryStatus.SENT_FOR_REVIEW,
            submittedAt,
            type: receipt.type,
          },
        });

        for (const piece of pieces) {
          await tx.piece.create({
            data: {
              deliveryId: receipt.deliveryId,
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
            deliveryId: receipt.deliveryId,
            entityId: receipt.deliveryId,
            entityType: "DELIVERY",
            eventType: "DELIVERY_SUBMITTED",
            metadata: {
              generatedTitle,
              pieceCount: pieces.length,
              type: receipt.type,
            },
          },
        });

        await tx.syncOperation.create({
          data: {
            createdByUserId: user.id,
            deliveryId: receipt.deliveryId,
            entityId: receipt.deliveryId,
            entityType: "DELIVERY",
            payload: {
              deliveryId: receipt.deliveryId,
            },
            status: SyncOperationStatus.PENDING,
            type: "DRIVE_BACKUP_DELIVERY",
          },
        });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return await resolveExistingDelivery(receipt.deliveryId, user.id);
      }

      throw error;
    }

    return NextResponse.json({
      alreadyFinalized: false,
      deliveryId: receipt.deliveryId,
    });
  } catch (error) {
    return deliveryApiErrorResponse(error);
  }
}

async function resolveExistingDelivery(deliveryId: string, userId: string) {
  const existingDelivery = await db.delivery.findUnique({
    where: {
      id: deliveryId,
    },
    select: {
      createdByUserId: true,
    },
  });

  if (existingDelivery?.createdByUserId === userId) {
    return NextResponse.json({
      alreadyFinalized: true,
      deliveryId,
    });
  }

  throw new DeliveryConflictError("La entrega ya existe.");
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
