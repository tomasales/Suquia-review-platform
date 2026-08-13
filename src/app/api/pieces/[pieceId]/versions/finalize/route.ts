import { DeliveryStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getApiAuthorizedUser } from "@/app/api/deliveries/_shared";
import {
  assertDeliveryUploadReceiptUser,
  verifyPieceVersionUploadReceipt,
} from "@/lib/delivery-upload-receipt";
import { db } from "@/lib/db";
import { enqueueDriveBackupRefresh } from "@/lib/drive/enqueue";
import {
  buildDeliveryStatusJournalMetadata,
} from "@/lib/piece-review-rules";
import {
  assertPieceVersionStorageKey,
  PieceVersionUploadError,
  pieceVersionUploadApiError,
  validatePieceVersionAttemptInput,
} from "@/lib/piece-version-upload";
import {
  deleteObject,
  verifyUploadedObject,
} from "@/lib/storage/storage";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ pieceId: string }> },
) {
  const { response, user } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  const { pieceId } = await context.params;

  try {
    const input = validatePieceVersionAttemptInput(await request.json());
    const receipt = verifyPieceVersionUploadReceipt(input.attemptToken);
    assertDeliveryUploadReceiptUser(receipt, user.id);

    if (receipt.pieceId !== pieceId) {
      throw new PieceVersionUploadError("La versión no corresponde a esta pieza.");
    }

    assertPieceVersionStorageKey({
      deliveryId: receipt.deliveryId,
      pieceId: receipt.pieceId,
      storageKey: receipt.storageKey,
      versionNumber: receipt.nextVersionNumber,
    });

    const existingVersion = await db.pieceVersion.findUnique({
      where: {
        id: receipt.newPieceVersionId,
      },
      select: {
        id: true,
        pieceId: true,
        storageKey: true,
        versionNumber: true,
      },
    });

    if (existingVersion) {
      if (
        existingVersion.pieceId === receipt.pieceId &&
        existingVersion.storageKey === receipt.storageKey &&
        existingVersion.versionNumber === receipt.nextVersionNumber
      ) {
        return NextResponse.json({
          alreadyFinalized: true,
          pieceId: receipt.pieceId,
          pieceVersionId: receipt.newPieceVersionId,
          versionNumber: receipt.nextVersionNumber,
        });
      }

      throw new PieceVersionUploadError("La versión ya existe.", 409);
    }

    const piece = await db.piece.findUnique({
      where: {
        id: receipt.pieceId,
      },
      select: {
        delivery: {
          select: {
            deletedAt: true,
            id: true,
            status: true,
          },
        },
        id: true,
        versions: {
          orderBy: {
            versionNumber: "desc",
          },
          select: {
            id: true,
            versionNumber: true,
          },
          take: 1,
        },
      },
    });

    if (!piece || piece.delivery.deletedAt) {
      await deleteUploadedObjectBestEffort(receipt.storageKey);
      throw new PieceVersionUploadError("La pieza no existe.", 404);
    }

    if (piece.delivery.status === DeliveryStatus.CLOSED) {
      await deleteUploadedObjectBestEffort(receipt.storageKey);
      throw new PieceVersionUploadError("La entrega está cerrada.", 409);
    }

    const latestVersion = piece.versions[0] ?? null;

    if (
      !latestVersion ||
      latestVersion.id !== receipt.previousLatestVersionId ||
      latestVersion.versionNumber !== receipt.previousLatestVersionNumber
    ) {
      await deleteUploadedObjectBestEffort(receipt.storageKey);
      throw new PieceVersionUploadError(
        "La pieza ya tiene una versión más nueva.",
        409,
      );
    }

    const verification = await verifyUploadedObject({
      expectedFileSizeBytes: receipt.fileSizeBytes,
      expectedMimeType: receipt.mimeType,
      storageKey: receipt.storageKey,
    });

    if (!verification.ok) {
      throw new PieceVersionUploadError(
        `No pudimos verificar ${receipt.filename}.`,
        400,
      );
    }

    const uploadedAt = new Date();
    const nextDeliveryStatus =
      piece.delivery.status === DeliveryStatus.SENT_FOR_REVIEW
        ? piece.delivery.status
        : DeliveryStatus.SENT_FOR_REVIEW;

    try {
      await db.$transaction(async (tx) => {
        await tx.pieceVersion.create({
          data: {
            fileSizeBytes: BigInt(receipt.fileSizeBytes),
            id: receipt.newPieceVersionId,
            mimeType: receipt.mimeType,
            originalFilename: receipt.filename.trim(),
            pieceId: receipt.pieceId,
            reviewState: null,
            storageKey: receipt.storageKey,
            uploadedAt,
            uploadedByUserId: user.id,
            versionNumber: receipt.nextVersionNumber,
          },
        });

        if (nextDeliveryStatus !== piece.delivery.status) {
          await tx.delivery.update({
            data: {
              status: nextDeliveryStatus,
            },
            where: {
              id: receipt.deliveryId,
            },
          });
        }

        await tx.journalEvent.create({
          data: {
            actorUserId: user.id,
            deliveryId: receipt.deliveryId,
            entityId: receipt.newPieceVersionId,
            entityType: "PIECE_VERSION",
            eventType: "PIECE_VERSION_UPLOADED",
            metadata: {
              fileSizeBytes: receipt.fileSizeBytes,
              mimeType: receipt.mimeType,
              originalFilename: receipt.filename.trim(),
              pieceId: receipt.pieceId,
              pieceVersionId: receipt.newPieceVersionId,
              previousLatestVersionId: receipt.previousLatestVersionId,
              versionNumber: receipt.nextVersionNumber,
            },
          },
        });

        if (nextDeliveryStatus !== piece.delivery.status) {
          await tx.journalEvent.create({
            data: {
              actorUserId: user.id,
              deliveryId: receipt.deliveryId,
              entityId: receipt.deliveryId,
              entityType: "DELIVERY",
              eventType: "DELIVERY_STATUS_CHANGED",
              metadata: buildDeliveryStatusJournalMetadata({
                nextStatus: nextDeliveryStatus,
                previousStatus: piece.delivery.status,
                reason: "new-piece-version",
              }),
            },
          });
        }

        await enqueueDriveBackupRefresh(tx, {
          createdByUserId: user.id,
          deliveryId: receipt.deliveryId,
          entityId: receipt.newPieceVersionId,
          entityType: "PIECE_VERSION",
          reason: "piece-version-uploaded",
        });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        await deleteUploadedObjectBestEffort(receipt.storageKey);
        throw new PieceVersionUploadError(
          "La pieza ya tiene una versión más nueva.",
          409,
        );
      }

      throw error;
    }

    return NextResponse.json({
      alreadyFinalized: false,
      pieceId: receipt.pieceId,
      pieceVersionId: receipt.newPieceVersionId,
      versionNumber: receipt.nextVersionNumber,
    });
  } catch (error) {
    const apiError = pieceVersionUploadApiError(error);

    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.status },
    );
  }
}

async function deleteUploadedObjectBestEffort(storageKey: string) {
  try {
    await deleteObject(storageKey);
  } catch {
    // Best effort cleanup only. The receipt still scopes the object tightly.
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
