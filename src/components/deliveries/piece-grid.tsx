import type { DeliveryDetail } from "@/lib/deliveries";

import { PieceCard } from "./piece-card";

type Piece = DeliveryDetail["pieces"][number];
type ReviewState = Piece["reviewState"];

type PieceGridProps = {
  onOpenPiece: (pieceId: string) => void;
  pieces: Piece[];
  reviewStates: Record<string, ReviewState>;
};

export function PieceGrid({
  onOpenPiece,
  pieces,
  reviewStates,
}: PieceGridProps) {
  if (pieces.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Esta entrega no tiene piezas registradas.
      </p>
    );
  }

  return (
    <div className="grid gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {pieces.map((piece) => (
        <PieceCard
          key={piece.id}
          onOpen={() => onOpenPiece(piece.id)}
          piece={piece}
          reviewState={reviewStates[piece.id] ?? piece.reviewState}
        />
      ))}
    </div>
  );
}
