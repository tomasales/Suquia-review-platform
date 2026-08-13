"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/ui/toast";
import type { DeliveryDetail } from "@/lib/deliveries";

import { PieceGrid } from "./piece-grid";
import { PieceReviewModal } from "./piece-review-modal";

type Piece = DeliveryDetail["pieces"][number];
type PieceFeedback = Piece["versions"][number]["feedback"][number];
type ReviewState = Piece["reviewState"];

type PieceReviewExperienceProps = {
  deliveryStatus: DeliveryDetail["status"];
  isVisualReviewMode: boolean;
  pieces: Piece[];
};

export function PieceReviewExperience({
  deliveryStatus,
  isVisualReviewMode,
  pieces,
}: PieceReviewExperienceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [reviewOverrides, setReviewOverrides] = useState<
    Record<string, ReviewState>
  >({});
  const [feedbackOverrides, setFeedbackOverrides] = useState<
    Record<string, PieceFeedback[]>
  >({});
  const [pendingReviewPieceId, setPendingReviewPieceId] = useState<string | null>(
    null,
  );
  const [pendingFeedbackKey, setPendingFeedbackKey] = useState<string | null>(
    null,
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const isReadOnly = deliveryStatus === "CLOSED";

  const pieceItems = useMemo(
    () =>
      pieces.map((piece) => ({
        ...piece,
        reviewState: reviewOverrides[piece.id] ?? piece.reviewState,
        versions: piece.versions.map((version) => ({
          ...version,
          feedback: mergeFeedback(
            version.feedback,
            feedbackOverrides[version.id] ?? [],
          ),
        })),
      })),
    [feedbackOverrides, pieces, reviewOverrides],
  );

  const selectedPieceId = searchParams.get("piece");
  const selectedPiece = useMemo(
    () => pieceItems.find((piece) => piece.id === selectedPieceId) ?? null,
    [pieceItems, selectedPieceId],
  );
  const selectedVersionNumber = Number(searchParams.get("version"));
  const selectedVersion =
    selectedPiece?.versions.find(
      (version) => version.versionNumber === selectedVersionNumber,
    ) ??
    selectedPiece?.versions[0] ??
    null;
  const selectedIndex = selectedPiece
    ? pieceItems.findIndex((piece) => piece.id === selectedPiece.id)
    : -1;
  const draftKey =
    selectedPiece && selectedVersion
      ? `${selectedPiece.id}-${selectedVersion.id}`
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
    const nextPiece = pieceItems[selectedIndex + offset];

    if (nextPiece) {
      navigateToPiece(nextPiece.id);
    }
  }

  async function setSelectedReviewState(reviewState: ReviewState) {
    if (!selectedPiece || !reviewState || isReadOnly) {
      return;
    }

    if (isVisualReviewMode) {
      setReviewOverride(selectedPiece.id, reviewState);
      return;
    }

    const previousReviewState = reviewOverrides[selectedPiece.id];
    setPendingReviewPieceId(selectedPiece.id);
    setReviewOverride(selectedPiece.id, reviewState);

    try {
      const response = await fetch(`/api/pieces/${selectedPiece.id}/review-state`, {
        body: JSON.stringify({ reviewState }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Review request failed.");
      }

      router.refresh();
    } catch {
      setReviewOverride(selectedPiece.id, previousReviewState);
      showToast({
        description: "Intentá nuevamente.",
        title: "No pudimos guardar la revisión",
        tone: "error",
      });
    } finally {
      setPendingReviewPieceId(null);
    }
  }

  function updateDraft(value: string) {
    if (!draftKey || isReadOnly) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [draftKey]: value,
    }));
  }

  async function submitFeedback() {
    if (!selectedPiece || !selectedVersion || !draftKey || isReadOnly) {
      return;
    }

    const body = (drafts[draftKey] ?? "").trim();

    if (!body || pendingFeedbackKey === draftKey) {
      return;
    }

    if (isVisualReviewMode) {
      const feedback: PieceFeedback = {
        author: "Tomi Preview",
        body,
        createdAtLabel: "Ahora",
        id: `visual-feedback-${Date.now()}`,
        sourceType: "TOMI",
      };

      addFeedbackOverride(selectedVersion.id, feedback);
      setDrafts((current) => ({ ...current, [draftKey]: "" }));
      return;
    }

    setPendingFeedbackKey(draftKey);

    try {
      const response = await fetch(`/api/pieces/${selectedPiece.id}/feedback`, {
        body: JSON.stringify({
          body,
          pieceVersionId: selectedVersion.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Feedback request failed.");
      }

      const result = (await response.json()) as { feedback: PieceFeedback };

      addFeedbackOverride(selectedVersion.id, result.feedback);
      setDrafts((current) => ({ ...current, [draftKey]: "" }));
      router.refresh();
    } catch {
      showToast({
        description: "Tu texto sigue acá. Intentá nuevamente.",
        title: "No pudimos guardar el feedback",
        tone: "error",
      });
    } finally {
      setPendingFeedbackKey(null);
    }
  }

  return (
    <>
      <PieceGrid
        onOpenPiece={navigateToPiece}
        pieces={pieceItems}
        reviewStates={Object.fromEntries(
          pieceItems.map((piece) => [piece.id, piece.reviewState]),
        )}
      />

      {selectedPiece && selectedVersion ? (
        <PieceReviewModal
          draft={drafts[draftKey] ?? ""}
          hasNext={selectedIndex >= 0 && selectedIndex < pieceItems.length - 1}
          hasPrevious={selectedIndex > 0}
          isFeedbackSubmitting={pendingFeedbackKey === draftKey}
          isReadOnly={isReadOnly}
          isReviewSaving={pendingReviewPieceId === selectedPiece.id}
          onClose={closeModal}
          onDraftChange={updateDraft}
          onFeedbackSubmit={submitFeedback}
          onNext={() => goToOffset(1)}
          onPrevious={() => goToOffset(-1)}
          onReviewStateChange={setSelectedReviewState}
          onVersionSelect={selectVersion}
          piece={selectedPiece}
          reviewState={selectedPiece.reviewState}
          selectedVersion={selectedVersion}
        />
      ) : null}
    </>
  );

  function setReviewOverride(pieceId: string, reviewState: ReviewState) {
    setReviewOverrides((current) => {
      const next = { ...current };

      if (reviewState) {
        next[pieceId] = reviewState;
      } else {
        delete next[pieceId];
      }

      return next;
    });
  }

  function addFeedbackOverride(versionId: string, feedback: PieceFeedback) {
    setFeedbackOverrides((current) => ({
      ...current,
      [versionId]: [...(current[versionId] ?? []), feedback],
    }));
  }
}

function mergeFeedback(
  persistedFeedback: PieceFeedback[],
  localFeedback: PieceFeedback[],
) {
  const seenFeedbackIds = new Set<string>();

  return [...persistedFeedback, ...localFeedback].filter((feedback) => {
    if (seenFeedbackIds.has(feedback.id)) {
      return false;
    }

    seenFeedbackIds.add(feedback.id);

    return true;
  });
}
