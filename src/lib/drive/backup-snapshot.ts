import "server-only";

import { db } from "@/lib/db";

import type { DeliveryBackupSnapshot } from "./backup-format";
import { DriveOperationError } from "./errors";

export async function getDeliveryBackupSnapshot(deliveryId: string) {
  const delivery = await db.delivery.findUnique({
    include: {
      creator: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
      feedback: {
        include: {
          author: {
            select: {
              email: true,
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      journalEvents: {
        include: {
          actor: {
            select: {
              email: true,
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      pieces: {
        include: {
          versions: {
            include: {
              uploadedBy: {
                select: {
                  email: true,
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: [{ versionNumber: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
    where: {
      id: deliveryId,
    },
  });

  if (!delivery) {
    throw new DriveOperationError("No encontramos la Delivery para backup.", {
      code: "DRIVE_DELIVERY_NOT_FOUND",
    });
  }

  return {
    delivery: {
      createdAt: delivery.createdAt,
      createdByUserId: delivery.createdByUserId,
      creator: delivery.creator,
      driveFolderId: delivery.driveFolderId,
      driveManifestFileId: delivery.driveManifestFileId,
      generalNote: delivery.generalNote,
      generatedTitle: delivery.generatedTitle,
      id: delivery.id,
      status: delivery.status,
      submittedAt: delivery.submittedAt,
      type: delivery.type,
      updatedAt: delivery.updatedAt,
    },
    feedback: delivery.feedback.map((feedback) => ({
      author: feedback.author,
      authorUserId: feedback.authorUserId,
      body: feedback.body,
      createdAt: feedback.createdAt,
      deliveryId: feedback.deliveryId,
      id: feedback.id,
      level: feedback.level,
      pieceId: feedback.pieceId,
      pieceVersionId: feedback.pieceVersionId,
      sourceType: feedback.sourceType,
      updatedAt: feedback.updatedAt,
    })),
    journalEvents: delivery.journalEvents.map((event) => ({
      actor: event.actor,
      actorUserId: event.actorUserId,
      createdAt: event.createdAt,
      deliveryId: event.deliveryId,
      entityId: event.entityId,
      entityType: event.entityType,
      eventType: event.eventType,
      id: event.id,
      metadata: event.metadata,
    })),
    pieces: delivery.pieces.map((piece) => {
      const latestVersion = piece.versions.at(-1) ?? null;

      return {
        createdAt: piece.createdAt,
        currentReviewState: latestVersion?.reviewState ?? null,
        deliveryId: piece.deliveryId,
        id: piece.id,
        initialNote: piece.initialNote,
        position: piece.position,
        updatedAt: piece.updatedAt,
        versions: piece.versions.map((version) => ({
          checksum: version.checksum,
          createdAt: version.createdAt,
          driveFileId: version.driveFileId,
          driveFolderId: version.driveFolderId,
          fileSizeBytes: version.fileSizeBytes,
          id: version.id,
          mimeType: version.mimeType,
          originalFilename: version.originalFilename,
          reviewState: version.reviewState,
          storageKey: version.storageKey,
          uploadedAt: version.uploadedAt,
          uploadedBy: version.uploadedBy,
          uploadedByUserId: version.uploadedByUserId,
          versionNumber: version.versionNumber,
        })),
      };
    }),
  } satisfies DeliveryBackupSnapshot;
}
