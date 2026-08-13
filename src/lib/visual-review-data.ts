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
    generatedTitle: "Stories · 13 ago · 6 piezas",
    type: DeliveryType.STORIES,
    status: DeliveryStatus.SENT_FOR_REVIEW,
    generalNote: "Priorizar lectura rápida del mensaje principal.",
    submittedAt: new Date("2026-08-13T10:30:00"),
    createdAt: new Date("2026-08-13T10:12:00"),
    creator: visualReviewAuthors[1],
    pieces: [
      visualPiece("sent", 1, null, "Cover con producto en primer plano", 1),
      visualPiece("sent", 2, PieceReviewState.OK, null, 1),
      visualPiece("sent", 3, PieceReviewState.NEEDS_CHANGES, "Ajustar contraste", 2),
      visualPiece("sent", 4, null, null, 1),
      visualPiece("sent", 5, PieceReviewState.OK, null, 1),
      visualPiece("sent", 6, PieceReviewState.NEEDS_CHANGES, "Revisar CTA", 1),
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

export type VisualReviewReference = {
  id: string;
  title: string;
  imageSrc: string;
};

export type VisualReviewFeedbackItem = {
  id: string;
  author: string;
  body: string;
  createdAtLabel: string;
};

export type VisualReviewConversationItem = {
  id: string;
  author: string;
  body: string;
  createdAtLabel: string;
};

export type VisualReviewVersionData = {
  versionNumber: number;
  uploadedAtLabel: string;
  imageSrc: string;
  feedback: VisualReviewFeedbackItem[];
  references: VisualReviewReference[];
  conversation: VisualReviewConversationItem[];
};

export type VisualReviewPieceData = {
  aspect: "feed" | "story";
  versions: VisualReviewVersionData[];
};

const visualReviewPieceData: Record<string, VisualReviewPieceData> = {
  "visual-sent-piece-1": storyPiece([
    version(1, "13 ago", "story-01-v1.svg", {
      feedback: [
        feedback(
          "tomi",
          "La lectura del beneficio queda bien, pero probaria bajar el peso del subtitulo.",
          "Hoy",
        ),
      ],
      conversation: [
        conversation(
          "Tomi Preview",
          "Me gusta la composicion general. Mantengamos el producto con ese protagonismo.",
          "10:42",
        ),
        conversation(
          "Diseño SUQUIA",
          "Perfecto, ajusto solo subtitulo y mantengo el encuadre.",
          "10:48",
        ),
      ],
      references: [reference("ref-contrast.svg", "Contraste de texto")],
    }),
  ]),
  "visual-sent-piece-2": storyPiece([
    version(1, "13 ago", "story-02-v1.svg", {
      feedback: [
        feedback("tomi", "OK para publicar en esta version.", "Hoy"),
      ],
    }),
  ]),
  "visual-sent-piece-3": storyPiece([
    version(2, "13 ago", "story-03-v2.svg", {
      feedback: [
        feedback(
          "tomi",
          "V2 mejora la jerarquia. Solo cuidaria que el precio no compita con el CTA.",
          "Hoy",
        ),
      ],
      conversation: [
        conversation(
          "Diseño SUQUIA",
          "Subi V2 con mas aire entre precio y boton.",
          "09:58",
        ),
      ],
    }),
    version(1, "12 ago", "story-03-v1.svg", {
      feedback: [
        feedback(
          "tomi",
          "El precio esta demasiado grande y tapa el mensaje principal.",
          "Ayer",
        ),
      ],
      references: [reference("ref-price.svg", "Referencia de jerarquia")],
    }),
  ]),
  "visual-sent-piece-4": storyPiece([
    version(1, "13 ago", "story-04-v1.svg", {
      feedback: [],
    }),
  ]),
  "visual-sent-piece-5": storyPiece([
    version(1, "13 ago", "story-05-v1.svg", {
      feedback: [feedback("tomi", "OK. Buen cierre visual.", "Hoy")],
    }),
  ]),
  "visual-sent-piece-6": storyPiece([
    version(1, "13 ago", "story-06-v1.svg", {
      feedback: [
        feedback(
          "tomi",
          "El CTA queda chico. Necesita ser mas claro en lectura rapida.",
          "Hoy",
        ),
      ],
      references: [reference("ref-cta.svg", "Referencia de CTA")],
    }),
  ]),
  "visual-review-piece-1": feedPiece([
    version(2, "12 ago", "feed-01-v2.svg", {
      feedback: [feedback("tomi", "V2 queda aprobada.", "Ayer")],
    }),
    version(1, "11 ago", "feed-01-v1.svg", {
      feedback: [
        feedback("tomi", "Subir contraste del titular y despejar margen superior.", "11 ago"),
      ],
    }),
  ]),
  "visual-review-piece-2": feedPiece([
    version(1, "12 ago", "feed-02-v1.svg", {
      feedback: [feedback("tomi", "OK.", "Ayer")],
    }),
  ]),
  "visual-review-piece-3": feedPiece([
    version(1, "12 ago", "feed-03-v1.svg", {
      feedback: [
        feedback("tomi", "Pendiente revisar el texto final cuando este cerrado.", "Ayer"),
      ],
    }),
  ]),
  "visual-review-piece-4": feedPiece([
    version(1, "12 ago", "feed-04-v1.svg", {
      feedback: [],
    }),
  ]),
};

export function getVisualReviewPieceData(pieceId: string) {
  return visualReviewPieceData[pieceId] ?? null;
}

function storyPiece(versions: VisualReviewVersionData[]): VisualReviewPieceData {
  return { aspect: "story", versions };
}

function feedPiece(versions: VisualReviewVersionData[]): VisualReviewPieceData {
  return { aspect: "feed", versions };
}

function version(
  versionNumber: number,
  uploadedAtLabel: string,
  fileName: string,
  data: {
    feedback?: VisualReviewFeedbackItem[];
    references?: VisualReviewReference[];
    conversation?: VisualReviewConversationItem[];
  },
): VisualReviewVersionData {
  return {
    versionNumber,
    uploadedAtLabel,
    imageSrc: `/visual-review/${fileName}`,
    feedback: data.feedback ?? [],
    references: data.references ?? [],
    conversation: data.conversation ?? [],
  };
}

function feedback(
  id: string,
  body: string,
  createdAtLabel: string,
): VisualReviewFeedbackItem {
  return {
    id,
    author: "Tomi Preview",
    body,
    createdAtLabel,
  };
}

function conversation(
  author: string,
  body: string,
  createdAtLabel: string,
): VisualReviewConversationItem {
  return {
    id: `${author}-${createdAtLabel}-${body.slice(0, 12)}`,
    author,
    body,
    createdAtLabel,
  };
}

function reference(fileName: string, title: string): VisualReviewReference {
  return {
    id: fileName,
    title,
    imageSrc: `/visual-review/${fileName}`,
  };
}
