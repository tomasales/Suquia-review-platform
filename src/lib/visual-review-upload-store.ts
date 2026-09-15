type DeliveryType = "STORIES" | "FEED";

export const visualReviewUploadIdPrefix = "visual-upload-";

export type VisualReviewUploadPiece = {
  fileSizeBytes: number;
  id: string;
  imageSrc: string;
  mimeType: string;
  note: string | null;
  originalFilename: string;
  position: number;
};

export type VisualReviewUploadDelivery = {
  createdAt: string;
  generalNote: string | null;
  id: string;
  pieces: VisualReviewUploadPiece[];
  type: DeliveryType;
};

const storageKey = "suquia.visualReview.uploadDeliveries";

export function isVisualReviewUploadId(id: string) {
  return id.startsWith(visualReviewUploadIdPrefix);
}

export async function saveVisualReviewUploadDelivery(input: {
  generalNote: string;
  pieces: Array<{
    file: File;
    id: string;
    note: string;
  }>;
  type: DeliveryType;
}) {
  const createdAt = new Date().toISOString();
  const id = `${visualReviewUploadIdPrefix}${Date.now()}`;
  const pieces = await Promise.all(
    input.pieces.map(async (piece, index) => ({
      fileSizeBytes: piece.file.size,
      id: `${id}-piece-${index + 1}`,
      imageSrc: await readFileAsDataUrl(piece.file),
      mimeType: piece.file.type,
      note: piece.note.trim() || null,
      originalFilename: piece.file.name,
      position: index + 1,
    })),
  );
  const delivery: VisualReviewUploadDelivery = {
    createdAt,
    generalNote: input.generalNote.trim() || null,
    id,
    pieces,
    type: input.type,
  };
  const deliveries = readVisualReviewUploadDeliveries();

  window.sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      ...deliveries,
      [id]: delivery,
    }),
  );

  return delivery;
}

export function getVisualReviewUploadDelivery(id: string) {
  return readVisualReviewUploadDeliveries()[id] ?? null;
}

function readVisualReviewUploadDeliveries(): Record<
  string,
  VisualReviewUploadDelivery
> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.sessionStorage.getItem(storageKey);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);

    return isRecord(parsed)
      ? (parsed as Record<string, VisualReviewUploadDelivery>)
      : {};
  } catch {
    return {};
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("error", () => {
      reject(new Error("No pudimos preparar la preview local."));
    });
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No pudimos preparar la preview local."));
      }
    });
    reader.readAsDataURL(file);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
