import "server-only";

import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { isVisualReviewMode } from "@/lib/visual-review";

export const BRAND_MANUAL_GUIDELINE_TYPE = "BRAND_MANUAL";
export const BRAND_MANUAL_GUIDELINE_TITLE = "Manual de marca";

const guidelineDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const activeBrandManualSelect = {
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
} satisfies Prisma.GuidelineSelect;

type ActiveBrandManualRecord = Prisma.GuidelineGetPayload<{
  select: typeof activeBrandManualSelect;
}>;

export type BrandManualGuideline = {
  fileSizeLabel: string;
  id: string;
  mimeType: string;
  originalFilename: string;
  updatedAtLabel: string;
  uploadedByLabel: string;
};

export async function getActiveBrandManual() {
  if (isVisualReviewMode()) {
    return null;
  }

  const guideline = await db.guideline.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
    select: activeBrandManualSelect,
    where: {
      active: true,
      type: BRAND_MANUAL_GUIDELINE_TYPE,
    },
  });

  return guideline ? formatBrandManualGuideline(guideline) : null;
}

export async function getActiveBrandManualStorageKey() {
  const guideline = await db.guideline.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      storageKey: true,
    },
    where: {
      active: true,
      type: BRAND_MANUAL_GUIDELINE_TYPE,
    },
  });

  return guideline?.storageKey ?? null;
}

export function formatBrandManualGuideline(
  guideline: ActiveBrandManualRecord,
): BrandManualGuideline {
  return {
    fileSizeLabel: formatFileSize(Number(guideline.fileSizeBytes)),
    id: guideline.id,
    mimeType: guideline.mimeType,
    originalFilename: guideline.originalFilename,
    updatedAtLabel: guidelineDateFormatter.format(guideline.updatedAt),
    uploadedByLabel:
      guideline.uploadedBy.name ?? guideline.uploadedBy.email ?? "Usuario",
  };
}

export function isPdfManualInput({
  filename,
  mimeType,
}: {
  filename: string;
  mimeType: string;
}) {
  return mimeType === "application/pdf" && filename.toLowerCase().endsWith(".pdf");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
