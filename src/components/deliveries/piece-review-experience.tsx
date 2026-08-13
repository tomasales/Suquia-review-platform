"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useDriveRuntime } from "@/components/drive/drive-runtime";
import { useToast } from "@/components/ui/toast";
import type { DeliveryDetail } from "@/lib/deliveries";

import { PieceGrid } from "./piece-grid";
import { PieceReviewModal } from "./piece-review-modal";

type Piece = DeliveryDetail["pieces"][number];
type PieceFeedback = Piece["versions"][number]["feedback"][number];
type PieceVersion = Piece["versions"][number];
type ReviewState = Piece["reviewState"];

type VersionUploadState = {
  error: string | null;
  file: File | null;
  isUploading: boolean;
};

type PrepareVersionResponse = {
  attemptToken: string;
  pieceVersionId: string;
  uploadUrl: string;
  versionNumber: number;
};

type FinalizeVersionResponse = {
  pieceVersionId: string;
  versionNumber: number;
};

const defaultUploadState: VersionUploadState = {
  error: null,
  file: null,
  isUploading: false,
};

const maxVersionFileSizeBytes = 25 * 1024 * 1024;
const allowedVersionMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  const driveRuntime = useDriveRuntime();
  const { showToast } = useToast();
  const [reviewOverrides, setReviewOverrides] = useState<
    Record<string, ReviewState>
  >({});
  const [feedbackOverrides, setFeedbackOverrides] = useState<
    Record<string, PieceFeedback[]>
  >({});
  const [localVersions, setLocalVersions] = useState<
    Record<string, PieceVersion[]>
  >({});
  const [versionUploads, setVersionUploads] = useState<
    Record<string, VersionUploadState>
  >({});
  const [pendingReviewVersionId, setPendingReviewVersionId] = useState<
    string | null
  >(null);
  const [pendingFeedbackKey, setPendingFeedbackKey] = useState<string | null>(
    null,
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const isReadOnly = deliveryStatus === "CLOSED";

  const pieceItems = useMemo(
    () =>
      pieces.map((piece) => {
        const versions = [...(localVersions[piece.id] ?? []), ...piece.versions]
          .map((version) => {
            const reviewState = reviewOverrides[version.id] ?? version.reviewState;
            const presentation = getVersionReviewPresentation(reviewState);

            return {
              ...version,
              feedback: mergeFeedback(
                version.feedback,
                feedbackOverrides[version.id] ?? [],
              ),
              reviewState,
              reviewStateLabel: presentation.label,
              reviewStateTone: presentation.tone,
            };
          })
          .sort((left, right) => right.versionNumber - left.versionNumber);
        const latestVersion = versions[0] ?? null;
        const latestPresentation = getVersionReviewPresentation(
          latestVersion?.reviewState ?? null,
        );
        const latestVersionSummary = piece.latestVersion
          ? {
              ...piece.latestVersion,
              reviewState: latestVersion?.reviewState ?? null,
              reviewStateLabel: latestPresentation.label,
            }
          : null;

        return {
          ...piece,
          latestVersion: latestVersionSummary,
          reviewState: latestVersion?.reviewState ?? null,
          reviewStateLabel: latestPresentation.label,
          reviewStateTone: latestPresentation.tone,
          versions,
        };
      }),
    [feedbackOverrides, localVersions, pieces, reviewOverrides],
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
  const latestVersion = selectedPiece?.versions[0] ?? null;
  const isSelectedLatestVersion =
    Boolean(selectedVersion && latestVersion) &&
    selectedVersion?.id === latestVersion?.id;
  const selectedIndex = selectedPiece
    ? pieceItems.findIndex((piece) => piece.id === selectedPiece.id)
    : -1;
  const draftKey =
    selectedPiece && selectedVersion
      ? `${selectedPiece.id}-${selectedVersion.id}`
      : "";
  const selectedUploadState = selectedPiece
    ? versionUploads[selectedPiece.id] ?? defaultUploadState
    : defaultUploadState;

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

    navigateToVersion(selectedPiece.id, versionNumber);
  }

  function navigateToVersion(pieceId: string, versionNumber: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("piece", pieceId);
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
    if (
      !selectedPiece ||
      !selectedVersion ||
      !reviewState ||
      isReadOnly ||
      !isSelectedLatestVersion
    ) {
      return;
    }

    const previousReviewState =
      reviewOverrides[selectedVersion.id] ?? selectedVersion.reviewState;

    if (isVisualReviewMode) {
      setReviewOverride(selectedVersion.id, reviewState);
      return;
    }

    setPendingReviewVersionId(selectedVersion.id);
    setReviewOverride(selectedVersion.id, reviewState);

    try {
      const response = await fetch(`/api/pieces/${selectedPiece.id}/review-state`, {
        body: JSON.stringify({
          pieceVersionId: selectedVersion.id,
          reviewState,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Review request failed.");
      }

      void driveRuntime.notifyBackupPending();
      router.refresh();
    } catch {
      setReviewOverride(selectedVersion.id, previousReviewState);
      showToast({
        description: "Intentá nuevamente.",
        title: "No pudimos guardar la revisión",
        tone: "error",
      });
    } finally {
      setPendingReviewVersionId(null);
    }
  }

  function updateDraft(value: string) {
    if (!draftKey || isReadOnly || !isSelectedLatestVersion) {
      return;
    }

    setDrafts((current) => ({
      ...current,
      [draftKey]: value,
    }));
  }

  async function submitFeedback() {
    if (
      !selectedPiece ||
      !selectedVersion ||
      !draftKey ||
      isReadOnly ||
      !isSelectedLatestVersion
    ) {
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
      void driveRuntime.notifyBackupPending();
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

  function selectVersionFile(file: File | null) {
    if (!selectedPiece || isReadOnly) {
      return;
    }

    const error = file ? getVersionFileError(file) : null;

    setVersionUploads((current) => ({
      ...current,
      [selectedPiece.id]: {
        error,
        file,
        isUploading: false,
      },
    }));
  }

  function cancelVersionUpload() {
    if (!selectedPiece) {
      return;
    }

    setVersionUploads((current) => {
      const next = { ...current };
      delete next[selectedPiece.id];
      return next;
    });
  }

  async function uploadSelectedVersion() {
    if (
      !selectedPiece ||
      !latestVersion ||
      !selectedUploadState.file ||
      selectedUploadState.error ||
      selectedUploadState.isUploading ||
      isReadOnly
    ) {
      return;
    }

    const file = selectedUploadState.file;
    const nextVersionNumber = latestVersion.versionNumber + 1;

    setVersionUploads((current) => ({
      ...current,
      [selectedPiece.id]: {
        ...selectedUploadState,
        isUploading: true,
      },
    }));

    if (isVisualReviewMode) {
      const localVersion = buildLocalVersion({
        file,
        pieceVersionId: `visual-version-${selectedPiece.id}-${Date.now()}`,
        versionNumber: nextVersionNumber,
      });

      prependLocalVersion(selectedPiece.id, localVersion);
      cancelVersionUpload();
      showToast({
        description: `V${nextVersionNumber} está lista para revisar.`,
        title: "Nueva versión subida",
        tone: "success",
      });
      navigateToVersion(selectedPiece.id, nextVersionNumber);
      return;
    }

    let attemptToken: string | null = null;

    try {
      const prepareResponse = await fetch(
        `/api/pieces/${selectedPiece.id}/versions/prepare`,
        {
          body: JSON.stringify({
            fileSizeBytes: file.size,
            filename: file.name,
            mimeType: file.type,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );

      if (!prepareResponse.ok) {
        throw new Error("Prepare version request failed.");
      }

      const prepared = (await prepareResponse.json()) as PrepareVersionResponse;
      attemptToken = prepared.attemptToken;

      const uploadResponse = await fetch(prepared.uploadUrl, {
        body: file,
        headers: {
          "Content-Type": file.type,
        },
        method: "PUT",
      });

      if (!uploadResponse.ok) {
        throw new Error("R2 upload failed.");
      }

      const finalizeResponse = await fetch(
        `/api/pieces/${selectedPiece.id}/versions/finalize`,
        {
          body: JSON.stringify({
            attemptToken,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );

      if (!finalizeResponse.ok) {
        throw new Error("Finalize version request failed.");
      }

      const finalized = (await finalizeResponse.json()) as FinalizeVersionResponse;
      const localVersion = buildLocalVersion({
        file,
        pieceVersionId: finalized.pieceVersionId,
        versionNumber: finalized.versionNumber,
      });

      prependLocalVersion(selectedPiece.id, localVersion);
      cancelVersionUpload();
      showToast({
        description: `V${finalized.versionNumber} está lista para revisar.`,
        title: "Nueva versión subida",
        tone: "success",
      });
      void driveRuntime.notifyBackupPending();
      router.refresh();
      navigateToVersion(selectedPiece.id, finalized.versionNumber);
    } catch {
      if (attemptToken) {
        void cleanupVersionUpload(selectedPiece.id, attemptToken);
      }

      setVersionUploads((current) => ({
        ...current,
        [selectedPiece.id]: {
          error: "No pudimos subir la versión. Intentá nuevamente.",
          file,
          isUploading: false,
        },
      }));
      showToast({
        description: "Intentá nuevamente.",
        title: "No pudimos subir la nueva versión",
        tone: "error",
      });
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
          isLatestVersion={isSelectedLatestVersion}
          isReadOnly={isReadOnly}
          isReviewSaving={pendingReviewVersionId === selectedVersion.id}
          onClose={closeModal}
          onDraftChange={updateDraft}
          onFeedbackSubmit={submitFeedback}
          onNext={() => goToOffset(1)}
          onPrevious={() => goToOffset(-1)}
          onReviewStateChange={setSelectedReviewState}
          onVersionFileCancel={cancelVersionUpload}
          onVersionFileSelect={selectVersionFile}
          onVersionSelect={selectVersion}
          onVersionUpload={uploadSelectedVersion}
          piece={selectedPiece}
          reviewState={selectedVersion.reviewState}
          selectedVersion={selectedVersion}
          versionUpload={selectedUploadState}
        />
      ) : null}
    </>
  );

  function setReviewOverride(versionId: string, reviewState: ReviewState) {
    setReviewOverrides((current) => {
      const next = { ...current };

      if (reviewState) {
        next[versionId] = reviewState;
      } else {
        delete next[versionId];
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

  function prependLocalVersion(pieceId: string, version: PieceVersion) {
    setLocalVersions((current) => ({
      ...current,
      [pieceId]: [version, ...(current[pieceId] ?? [])],
    }));
  }
}

async function cleanupVersionUpload(pieceId: string, attemptToken: string) {
  await fetch(`/api/pieces/${pieceId}/versions/cleanup-upload`, {
    body: JSON.stringify({
      attemptToken,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }).catch(() => null);
}

function buildLocalVersion({
  file,
  pieceVersionId,
  versionNumber,
}: {
  file: File;
  pieceVersionId: string;
  versionNumber: number;
}): PieceVersion {
  return {
    conversation: [],
    feedback: [],
    fileSizeBytes: file.size,
    id: pieceVersionId,
    imageSrc: URL.createObjectURL(file),
    mimeType: file.type,
    originalFilename: file.name,
    references: [],
    reviewState: null,
    reviewStateLabel: "Sin revisar",
    reviewStateTone: "neutral",
    uploadedAtLabel: "Ahora",
    uploaderLabel: "Tomi Preview",
    versionNumber,
  };
}

function getVersionFileError(file: File) {
  if (!allowedVersionMimeTypes.has(file.type)) {
    return "Tipo de archivo no compatible.";
  }

  if (file.size > maxVersionFileSizeBytes) {
    return "El archivo supera el máximo de 25 MB.";
  }

  return null;
}

function getVersionReviewPresentation(reviewState: ReviewState) {
  if (reviewState === "OK") {
    return {
      label: "OK",
      tone: "success" as const,
    };
  }

  if (reviewState === "NEEDS_CHANGES") {
    return {
      label: "Necesita cambios",
      tone: "warning" as const,
    };
  }

  return {
    label: "Sin revisar",
    tone: "neutral" as const,
  };
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
