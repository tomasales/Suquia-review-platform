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

const storeKey = "__suquiaVisualReviewUploadDeliveries";

declare global {
  interface Window {
    [storeKey]?: Map<string, VisualReviewUploadDelivery>;
  }
}

export function isVisualReviewUploadId(id: string) {
  return id.startsWith(visualReviewUploadIdPrefix);
}

export function saveVisualReviewUploadDelivery(input: {
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
  const pieces = input.pieces.map((piece, index) => ({
    fileSizeBytes: piece.file.size,
    id: `${id}-piece-${index + 1}`,
    imageSrc: URL.createObjectURL(piece.file),
    mimeType: piece.file.type,
    note: piece.note.trim() || null,
    originalFilename: piece.file.name,
    position: index + 1,
  }));
  const delivery: VisualReviewUploadDelivery = {
    createdAt,
    generalNote: input.generalNote.trim() || null,
    id,
    pieces,
    type: input.type,
  };

  getBrowserStore().set(id, delivery);

  return delivery;
}

export function getVisualReviewUploadDelivery(id: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return getBrowserStore().get(id) ?? null;
}

function getBrowserStore() {
  const existingStore = window[storeKey];

  if (existingStore) {
    return existingStore;
  }

  const store = new Map<string, VisualReviewUploadDelivery>();

  window[storeKey] = store;

  return store;
}
