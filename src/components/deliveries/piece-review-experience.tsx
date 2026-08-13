"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { DeliveryDetail } from "@/lib/deliveries";

import { PieceGrid } from "./piece-grid";
import { PieceReviewModal } from "./piece-review-modal";

type Piece = DeliveryDetail["pieces"][number];
type ReviewState = Piece["reviewState"];

type PieceReviewExperienceProps = {
  isVisualReviewMode: boolean;
  pieces: Piece[];
};

export function PieceReviewExperience({
  isVisualReviewMode,
  pieces,
}: PieceReviewExperienceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reviewStates, setReviewStates] = useState<Record<string, ReviewState>>(
    () =>
      Object.fromEntries(
        pieces.map((piece) => [piece.id, piece.reviewState]),
      ) as Record<string, ReviewState>,
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const selectedPieceId = searchParams.get("piece");
  const selectedPiece = useMemo(
    () => pieces.find((piece) => piece.id === selectedPieceId) ?? null,
    [pieces, selectedPieceId],
  );
  const selectedVersionNumber = Number(searchParams.get("version"));
  const selectedVersion =
    selectedPiece?.versions.find(
      (version) => version.versionNumber === selectedVersionNumber,
    ) ??
    selectedPiece?.versions[0] ??
    null;
  const selectedIndex = selectedPiece
    ? pieces.findIndex((piece) => piece.id === selectedPiece.id)
    : -1;
  const draftKey =
    selectedPiece && selectedVersion
      ? `${selectedPiece.id}-${selectedVersion.versionNumber}`
      : "";

  function navigateToPiece(pieceId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("piece", pieceId);
    params.delete("version");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function closeModal() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("piece");
    params.delete("version");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function selectVersion(versionNumber: number) {
    if (!selectedPiece) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("piece", selectedPiece.id);
    params.set("version", String(versionNumber));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function goToOffset(offset: -1 | 1) {
    const nextPiece = pieces[selectedIndex + offset];

    if (nextPiece) {
      navigateToPiece(nextPiece.id);
    }
  }

  function setSelectedReviewState(reviewState: ReviewState) {
    if (!selectedPiece || !isVisualReviewMode) {
      return;
    }

    setReviewStates((current) => ({
      ...current,
      [selectedPiece.id]: reviewState,
    }));
  }

  function updateDraft(value: string) {
    if (!draftKey || !isVisualReviewMode) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [draftKey]: value,
    }));
  }

  return (
    <>
      <PieceGrid
        onOpenPiece={navigateToPiece}
        pieces={pieces}
        reviewStates={reviewStates}
      />

      {selectedPiece && selectedVersion ? (
        <PieceReviewModal
          draft={drafts[draftKey] ?? ""}
          hasNext={selectedIndex >= 0 && selectedIndex < pieces.length - 1}
          hasPrevious={selectedIndex > 0}
          isVisualReviewMode={isVisualReviewMode}
          onClose={closeModal}
          onDraftChange={updateDraft}
          onNext={() => goToOffset(1)}
          onPrevious={() => goToOffset(-1)}
          onReviewStateChange={setSelectedReviewState}
          onVersionSelect={selectVersion}
          piece={selectedPiece}
          reviewState={
            reviewStates[selectedPiece.id] ?? selectedPiece.reviewState
          }
          selectedVersion={selectedVersion}
        />
      ) : null}
    </>
  );
}
