import {
  DeliveryStatus,
  DeliveryType,
  PieceReviewState,
} from "@prisma/client";

import type { DeliveryDetailRecord } from "@/lib/deliveries";

// DEVELOPMENT ONLY: fixtures for local UI review when DB/OAuth are unavailable.
export const visualReviewAuthors = [
  {
    id: "visual-review-user",
    name: "Tomi Preview",
    email: "visual-review@suquia.local",
  },
  {
    id: "visual-design-user",
    name: "Diseño SUQUIA",
    email: "design-preview@suquia.local",
  },
];

export const visualReviewDeliveries: DeliveryDetailRecord[] = [
  {
    id: "visual-stories-sent",
    generatedTitle: "Stories · 13 ago · 5 piezas",
    type: DeliveryType.STORIES,
    status: DeliveryStatus.SENT_FOR_REVIEW,
    generalNote: "Priorizar lectura rápida del mensaje principal.",
    submittedAt: new Date("2026-08-13T10:30:00"),
    createdAt: new Date("2026-08-13T10:12:00"),
    creator: visualReviewAuthors[1],
    pieces: [
      visualPiece("sent", 1, null, "Cover con producto en primer plano", 1),
      visualPiece("sent", 2, PieceReviewState.OK, null, 1),
      visualPiece("sent", 3, PieceReviewState.NEEDS_CHANGES, "Ajustar contraste", 1),
      visualPiece("sent", 4, null, null, 1),
      visualPiece("sent", 5, PieceReviewState.OK, null, 1),
    ],
  },
  {
    id: "visual-feed-review",
    generatedTitle: "Feed · 12 ago · 4 piezas",
    type: DeliveryType.FEED,
    status: DeliveryStatus.IN_REVIEW,
    generalNote: null,
    submittedAt: new Date("2026-08-12T16:00:00"),
    createdAt: new Date("2026-08-12T15:45:00"),
    creator: visualReviewAuthors[1],
    pieces: [
      visualPiece("review", 1, PieceReviewState.OK, null, 2),
      visualPiece("review", 2, PieceReviewState.OK, null, 1),
      visualPiece("review", 3, null, "Pendiente de texto final", 1),
      visualPiece("review", 4, null, null, 1),
    ],
  },
  {
    id: "visual-stories-changes",
    generatedTitle: "Stories · 11 ago · 6 piezas",
    type: DeliveryType.STORIES,
    status: DeliveryStatus.CHANGES_REQUESTED,
    generalNote: "Revisar cierre de secuencia y jerarquía de precios.",
    submittedAt: new Date("2026-08-11T12:15:00"),
    createdAt: new Date("2026-08-11T12:05:00"),
    creator: visualReviewAuthors[0],
    pieces: [
      visualPiece("changes", 1, PieceReviewState.NEEDS_CHANGES, "Reducir texto", 1),
      visualPiece("changes", 2, PieceReviewState.OK, null, 1),
      visualPiece("changes", 3, PieceReviewState.NEEDS_CHANGES, "Cambiar recorte", 2),
      visualPiece("changes", 4, null, null, 1),
      visualPiece("changes", 5, PieceReviewState.OK, null, 1),
      visualPiece("changes", 6, null, "Falta versión con CTA", 1),
    ],
  },
  {
    id: "visual-feed-approved",
    generatedTitle: "Feed · 09 ago · 3 piezas",
    type: DeliveryType.FEED,
    status: DeliveryStatus.APPROVED,
    generalNote: null,
    submittedAt: new Date("2026-08-09T18:20:00"),
    createdAt: new Date("2026-08-09T18:00:00"),
    creator: visualReviewAuthors[1],
    pieces: [
      visualPiece("approved", 1, PieceReviewState.OK, null, 2),
      visualPiece("approved", 2, PieceReviewState.OK, null, 2),
      visualPiece("approved", 3, PieceReviewState.OK, null, 1),
    ],
  },
  {
    id: "visual-stories-closed",
    generatedTitle: "Stories · 05 ago · 2 piezas",
    type: DeliveryType.STORIES,
    status: DeliveryStatus.CLOSED,
    generalNote: "Campaña cerrada.",
    submittedAt: new Date("2026-08-05T09:30:00"),
    createdAt: new Date("2026-08-05T09:20:00"),
    creator: visualReviewAuthors[0],
    pieces: [
      visualPiece("closed", 1, PieceReviewState.OK, null, 3),
      visualPiece("closed", 2, PieceReviewState.OK, null, 2),
    ],
  },
];

function visualPiece(
  deliveryKey: string,
  position: number,
  reviewState: PieceReviewState | null,
  initialNote: string | null,
  versionNumber: number,
) {
  return {
    id: `visual-${deliveryKey}-piece-${position}`,
    position,
    initialNote,
    reviewState,
    versions: [
      {
        versionNumber,
        originalFilename: `pieza-${position}.jpg`,
        uploadedAt: new Date("2026-08-13T09:00:00"),
      },
    ],
  };
}
