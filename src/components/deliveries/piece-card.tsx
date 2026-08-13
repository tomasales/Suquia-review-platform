import type { DeliveryDetail } from "@/lib/deliveries";

import { PiecePreview } from "./piece-preview";

type Piece = DeliveryDetail["pieces"][number];
type ReviewState = Piece["reviewState"];

type PieceCardProps = {
  onOpen: () => void;
  piece: Piece;
  reviewState: ReviewState;
};

export function PieceCard({ onOpen, piece, reviewState }: PieceCardProps) {
  const latestVersion = piece.versions[0] ?? null;
  const state = getReviewStatePresentation(reviewState);

  return (
    <button
      aria-label={`Abrir pieza ${piece.position}`}
      className="group min-w-0 rounded-[var(--radius)] border border-border bg-surface p-1.5 text-left transition-colors hover:border-subtle-foreground hover:bg-surface-muted/30 focus:outline-none focus:ring-2 focus:ring-foreground/20 sm:p-2"
      onClick={onOpen}
      type="button"
    >
      <div className="relative">
        <PiecePreview
          aspect={piece.aspect}
          imageSrc={latestVersion?.imageSrc ?? null}
          label={`Pieza ${piece.position}`}
        />
        <span
          className={`absolute left-2 top-2 h-2.5 w-2.5 rounded-full border border-white ${state.indicator}`}
        />
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">
            Pieza {piece.position}
          </p>
          <p className="whitespace-nowrap text-xs text-muted-foreground">
            {latestVersion ? `V${latestVersion.versionNumber}` : "Sin version"}
          </p>
        </div>
        <span
          className={`inline-flex max-w-full items-center whitespace-normal rounded-[6px] border px-1.5 py-0.5 text-[10px] font-medium leading-4 ${state.badge}`}
        >
          {state.label}
        </span>
      </div>
    </button>
  );
}

export function getReviewStatePresentation(reviewState: ReviewState) {
  if (reviewState === "OK") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      indicator: "bg-emerald-500",
      label: "OK",
      tone: "success" as const,
    };
  }

  if (reviewState === "NEEDS_CHANGES") {
    return {
      badge: "border-amber-300 bg-amber-50 text-amber-800",
      indicator: "bg-amber-500",
      label: "Necesita cambios",
      tone: "warning" as const,
    };
  }

  return {
    badge: "border-border bg-surface-muted text-muted-foreground",
    indicator: "bg-stone-400",
    label: "Sin revisar",
    tone: "neutral" as const,
  };
}
