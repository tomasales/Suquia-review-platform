import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { guidelineApiErrorResponse } from "@/app/api/guidelines/_shared";
import { getApiAuthorizedUser } from "@/app/api/storage/_shared";
import {
  BRAND_MANUAL_GUIDELINE_TITLE,
  BRAND_MANUAL_GUIDELINE_TYPE,
  formatBrandManualGuideline,
} from "@/lib/guidelines";
import {
  assertDeliveryUploadReceiptUser,
  verifyGuidelineBrandManualUploadReceipt,
} from "@/lib/delivery-upload-receipt";
import { db } from "@/lib/db";
import { StorageValidationError } from "@/lib/storage/errors";
import { verifyUploadedObject } from "@/lib/storage/storage";

export const runtime = "nodejs";

type FinalizeBody = {
  attemptToken?: unknown;
};

export async function POST(request: Request) {
  const { response, user } = await getApiAuthorizedUser();

  if (response) {
    return response;
  }

  try {
    const body = (await request.json()) as FinalizeBody;

    if (typeof body.attemptToken !== "string") {
      throw new StorageValidationError("Receipt de subida inválido.");
    }

    const receipt = verifyGuidelineBrandManualUploadReceipt(body.attemptToken);
    assertDeliveryUploadReceiptUser(receipt, user.id);

    const existingGuideline = await db.guideline.findUnique({
      select: {
        id: true,
        originalFilename: true,
        mimeType: true,
        fileSizeBytes: true,
        storageKey: true,
        updatedAt: true,
        uploadedBy: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      where: {
        id: receipt.guidelineId,
      },
    });

    if (existingGuideline) {
      return NextResponse.json({
        alreadyFinalized: true,
        manual: formatBrandManualGuideline(existingGuideline),
      });
    }

    const verification = await verifyUploadedObject({
      expectedFileSizeBytes: receipt.fileSizeBytes,
      expectedMimeType: receipt.mimeType,
      storageKey: receipt.storageKey,
    });

    if (!verification.ok) {
      throw new StorageValidationError("No pudimos verificar el manual.");
    }

    const guideline = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('guidelines:BRAND_MANUAL'))`;
      await tx.guideline.updateMany({
        data: {
          active: false,
        },
        where: {
          active: true,
          type: BRAND_MANUAL_GUIDELINE_TYPE,
        },
      });

      return tx.guideline.create({
        data: {
          active: true,
          fileSizeBytes: BigInt(receipt.fileSizeBytes),
          id: receipt.guidelineId,
          mimeType: receipt.mimeType,
          originalFilename: receipt.filename,
          storageKey: receipt.storageKey,
          title: BRAND_MANUAL_GUIDELINE_TITLE,
          type: BRAND_MANUAL_GUIDELINE_TYPE,
          uploadedByUserId: user.id,
        },
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          fileSizeBytes: true,
          storageKey: true,
          updatedAt: true,
          uploadedBy: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      alreadyFinalized: false,
      manual: formatBrandManualGuideline(guideline),
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return guidelineApiErrorResponse(
        new StorageValidationError("El manual ya fue finalizado."),
      );
    }

    return guidelineApiErrorResponse(error);
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
