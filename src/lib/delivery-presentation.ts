import {
  DeliveryStatus,
  DeliveryType,
  PieceReviewState,
} from "@prisma/client";

export type BadgeTone =
  | "closed"
  | "danger"
  | "info"
  | "neutral"
  | "sent"
  | "success"
  | "warning";

export const deliveryTypeLabel: Record<DeliveryType, string> = {
  [DeliveryType.STORIES]: "Stories",
  [DeliveryType.FEED]: "Feed",
};

export const deliveryStatusLabel: Record<DeliveryStatus, string> = {
  [DeliveryStatus.SENT_FOR_REVIEW]: "Enviado para revisar",
  [DeliveryStatus.IN_REVIEW]: "En revisión",
  [DeliveryStatus.CHANGES_REQUESTED]: "Requiere cambios",
  [DeliveryStatus.APPROVED]: "Aprobada",
  [DeliveryStatus.CLOSED]: "Cerrada",
};

export const deliveryStatusTone: Record<DeliveryStatus, BadgeTone> = {
  [DeliveryStatus.SENT_FOR_REVIEW]: "sent",
  [DeliveryStatus.IN_REVIEW]: "info",
  [DeliveryStatus.CHANGES_REQUESTED]: "warning",
  [DeliveryStatus.APPROVED]: "success",
  [DeliveryStatus.CLOSED]: "closed",
};

export const pieceReviewStateLabel: Record<PieceReviewState, string> = {
  [PieceReviewState.OK]: "OK",
  [PieceReviewState.NEEDS_CHANGES]: "Necesita cambios",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDeliveryDate(date: Date | null) {
  if (!date) {
    return "Sin fecha";
  }

  return dateFormatter.format(date);
}

export function formatPieceCount(count: number) {
  return `${count} ${count === 1 ? "pieza" : "piezas"}`;
}

export function formatReviewSummary(
  pieces: Array<{ reviewState: PieceReviewState | null }>,
) {
  const total = pieces.length;

  if (total === 0) {
    return "Sin piezas";
  }

  const ok = pieces.filter(
    (piece) => piece.reviewState === PieceReviewState.OK,
  ).length;
  const needsChanges = pieces.filter(
    (piece) => piece.reviewState === PieceReviewState.NEEDS_CHANGES,
  ).length;
  const unreviewed = total - ok - needsChanges;
  const parts: string[] = [];

  if (ok > 0) {
    parts.push(`${ok} OK`);
  }

  if (needsChanges > 0) {
    parts.push(
      `${needsChanges} ${
        needsChanges === 1 ? "necesita cambios" : "necesitan cambios"
      }`,
    );
  }

  if (unreviewed > 0) {
    parts.push(`${unreviewed} sin revisar`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Sin revisar";
}
