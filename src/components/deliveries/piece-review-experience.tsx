"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useDriveRuntime } from "@/components/drive/drive-runtime";
import { useToast } from "@/components/ui/toast";
import type { DeliveryDetail } from "@/lib/deliveries";

import { PieceGrid } from "./piece-grid";
import { PieceReviewModal } from "./piece-review-modal";
import {
  getFeedbackReferenceFileError,
  getFeedbackReferenceIdentityKey,
  getFeedbackReferenceSlotsAvailable,
  getOptimisticVersionIdsToDrop,
  mergePieceVersions,
  resolveFinalizeFailure,
  resolveReviewMutationFailure,
} from "./piece-version-client-state";

type Piece = DeliveryDetail["pieces"][number];
type PieceFeedback = Piece["versions"][number]["feedback"][number];
type PieceVersion = Piece["versions"][number];
type ReviewState = Piece["reviewState"];
type VersionUploadFlowPhase = "prepare" | "upload" | "finalize";
type FeedbackAttachmentFlowPhase = "prepare" | "upload" | "finalize";

type VersionUploadState = {
  attemptToken: string | null;
  error: string | null;
  file: File | null;
  isUploading: boolean;
  phase:
    | "idle"
    | "invalid"
    | "selected"
    | "preparing"
    | "uploading"
    | "uploaded"
    | "finalizing"
    | "finalize-error";
  pieceVersionId: string | null;
  uploaded: boolean;
  versionNumber: number | null;
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

type FeedbackReferenceSelection = {
  error: string | null;
  file: File;
  id: string;
  objectUrl: string;
};

type FeedbackAttachmentUploadState = {
  attemptToken: string | null;
  attachmentUploads: Array<{
    id: string;
    uploadUrl: string;
  }>;
  error: string | null;
  feedbackId: string | null;
  phase:
    | "idle"
    | "preparing"
    | "uploading"
    | "uploaded"
    | "finalizing"
    | "finalize-error";
  uploaded: boolean;
};

type PrepareFeedbackAttachmentsResponse = {
  attemptToken: string;
  attachments: Array<{
    id: string;
    uploadUrl: string;
  }>;
  feedbackId: string;
};

const defaultUploadState: VersionUploadState = {
  attemptToken: null,
  error: null,
  file: null,
  isUploading: false,
  phase: "idle",
  pieceVersionId: null,
  uploaded: false,
  versionNumber: null,
};

const defaultFeedbackAttachmentUploadState: FeedbackAttachmentUploadState = {
  attemptToken: null,
  attachmentUploads: [],
  error: null,
  feedbackId: null,
  phase: "idle",
  uploaded: false,
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
  const feedbackReferenceUrlsRef = useRef(new Set<string>());
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
  const [feedbackReferences, setFeedbackReferences] = useState<
    Record<string, FeedbackReferenceSelection[]>
  >({});
  const [feedbackAttachmentUploads, setFeedbackAttachmentUploads] = useState<
    Record<string, FeedbackAttachmentUploadState>
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
        const versions = mergePieceVersions(
          piece.versions,
          localVersions[piece.id] ?? [],
        )
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
  const selectedFeedbackReferences = draftKey
    ? feedbackReferences[draftKey] ?? []
    : [];
  const selectedFeedbackAttachmentUpload = draftKey
    ? feedbackAttachmentUploads[draftKey] ?? defaultFeedbackAttachmentUploadState
    : defaultFeedbackAttachmentUploadState;
  const selectedUploadState = selectedPiece
    ? versionUploads[selectedPiece.id] ?? defaultUploadState
    : defaultUploadState;

  useEffect(() => {
    const objectUrls = feedbackReferenceUrlsRef.current;

    return () => {
      for (const objectUrl of objectUrls) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

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
        throw await readApiError(response);
      }

      void driveRuntime.notifyBackupPending();
      router.refresh();
    } catch (error) {
      setReviewOverride(selectedVersion.id, previousReviewState);

      const resolution = resolveReviewMutationFailure({
        code: error instanceof ApiRequestError ? error.code : undefined,
        operation: "review",
      });

      if (resolution.shouldRefresh) {
        router.refresh();
      }

      showToast({
        description: resolution.description,
        title: resolution.title,
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

  function selectFeedbackReferences(files: FileList | File[]) {
    if (
      !draftKey ||
      isReadOnly ||
      !isSelectedLatestVersion ||
      selectedFeedbackAttachmentUpload.phase === "preparing" ||
      selectedFeedbackAttachmentUpload.phase === "uploading" ||
      selectedFeedbackAttachmentUpload.phase === "finalizing"
    ) {
      return;
    }

    const incomingFiles = Array.from(files);

    setFeedbackReferences((current) => {
      const existing = current[draftKey] ?? [];
      const existingKeys = new Set(
        existing.map((reference) =>
          getFeedbackReferenceIdentityKey(reference.file),
        ),
      );
      const slotsAvailable = getFeedbackReferenceSlotsAvailable(existing.length);
      const nextReferences: FeedbackReferenceSelection[] = [];

      for (const file of incomingFiles) {
        if (nextReferences.length >= slotsAvailable) {
          break;
        }

        const identityKey = getFeedbackReferenceIdentityKey(file);

        if (existingKeys.has(identityKey)) {
          continue;
        }

        existingKeys.add(identityKey);
        const objectUrl = URL.createObjectURL(file);
        feedbackReferenceUrlsRef.current.add(objectUrl);
        nextReferences.push({
          error: getFeedbackReferenceFileError(file),
          file,
          id: `feedback-reference-${file.name}-${file.size}-${file.lastModified}`,
          objectUrl,
        });
      }

      return {
        ...current,
        [draftKey]: [...existing, ...nextReferences],
      };
    });
  }

  function removeFeedbackReference(referenceId: string) {
    if (!draftKey) {
      return;
    }

    setFeedbackReferences((current) => {
      const existing = current[draftKey] ?? [];
      const reference = existing.find((item) => item.id === referenceId);

      if (reference) {
        URL.revokeObjectURL(reference.objectUrl);
        feedbackReferenceUrlsRef.current.delete(reference.objectUrl);
      }

      return {
        ...current,
        [draftKey]: existing.filter((item) => item.id !== referenceId),
      };
    });
    setFeedbackAttachmentUploads((current) => {
      const next = { ...current };
      delete next[draftKey];
      return next;
    });
  }

  function clearFeedbackComposer(key: string, options: { revokeUrls?: boolean } = {}) {
    const references = feedbackReferences[key] ?? [];

    if (options.revokeUrls ?? true) {
      for (const reference of references) {
        URL.revokeObjectURL(reference.objectUrl);
        feedbackReferenceUrlsRef.current.delete(reference.objectUrl);
      }
    }

    setFeedbackReferences((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setFeedbackAttachmentUploads((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setDrafts((current) => ({ ...current, [key]: "" }));
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
    const references = selectedFeedbackReferences;

    if (!body || pendingFeedbackKey === draftKey) {
      return;
    }

    if (references.some((reference) => reference.error)) {
      showToast({
        description: "Revisá las referencias seleccionadas.",
        title: "No pudimos guardar el feedback",
        tone: "error",
      });
      return;
    }

    if (isVisualReviewMode) {
      const feedback: PieceFeedback = {
        attachments: references.map((reference) => ({
          createdAtLabel: "Ahora",
          fileSizeBytes: reference.file.size,
          id: reference.id,
          imageSrc: reference.objectUrl,
          mimeType: reference.file.type,
          originalFilename: reference.file.name,
          uploadedByLabel: "Tomi Preview",
        })),
        author: "Tomi Preview",
        body,
        createdAtLabel: "Ahora",
        id: `visual-feedback-${Date.now()}`,
        sourceType: "TOMI",
      };

      addFeedbackOverride(selectedVersion.id, feedback);
      clearFeedbackComposer(draftKey, { revokeUrls: false });
      return;
    }

    setPendingFeedbackKey(draftKey);

    try {
      const result =
        references.length > 0
          ? await submitFeedbackWithReferences({
              body,
              draftKey,
              pieceId: selectedPiece.id,
              pieceVersionId: selectedVersion.id,
              references,
            })
          : await submitTextOnlyFeedback({
              body,
              pieceId: selectedPiece.id,
              pieceVersionId: selectedVersion.id,
            });

      addFeedbackOverride(selectedVersion.id, result.feedback);
      clearFeedbackComposer(draftKey);
      void driveRuntime.notifyBackupPending();
      router.refresh();
    } catch (error) {
      const uploadError =
        error instanceof FeedbackAttachmentFlowError ? error : null;
      const apiError =
        error instanceof ApiRequestError
          ? error
          : uploadError?.apiError;
      const resolution = resolveReviewMutationFailure({
        code: apiError?.code,
        operation: "feedback",
      });

      if (uploadError?.phase === "upload" && uploadError.attemptToken) {
        void cleanupFeedbackAttachmentUpload(
          selectedPiece.id,
          uploadError.attemptToken,
        );
        resetFeedbackAttachmentAttempt(draftKey);
      }

      if (uploadError?.phase === "finalize") {
        const shouldDiscardAttempt =
          apiError?.code === "HISTORICAL_VERSION" ||
          apiError?.code === "DELIVERY_CLOSED" ||
          apiError?.status === 400 ||
          (apiError?.status !== undefined && apiError.status < 500);

        setFeedbackAttachmentUploads((current) => ({
          ...current,
          [draftKey]: {
            ...selectedFeedbackAttachmentUpload,
            attemptToken: shouldDiscardAttempt
              ? null
              : uploadError.attemptToken ?? null,
            attachmentUploads: shouldDiscardAttempt
              ? []
              : uploadError.attachmentUploads,
            error: resolution.description,
            feedbackId: shouldDiscardAttempt
              ? null
              : selectedFeedbackAttachmentUpload.feedbackId,
            phase: shouldDiscardAttempt ? "idle" : "finalize-error",
            uploaded: !shouldDiscardAttempt,
          },
        }));
      }

      if (resolution.shouldRefresh) {
        router.refresh();
      }

      showToast({
        description: resolution.description,
        title: resolution.title,
        tone: "error",
      });
    } finally {
      setPendingFeedbackKey(null);
    }
  }

  async function submitTextOnlyFeedback({
    body,
    pieceId,
    pieceVersionId,
  }: {
    body: string;
    pieceId: string;
    pieceVersionId: string;
  }) {
    const response = await fetch(`/api/pieces/${pieceId}/feedback`, {
      body: JSON.stringify({
        body,
        pieceVersionId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw await readApiError(response);
    }

    return (await response.json()) as { feedback: PieceFeedback };
  }

  async function submitFeedbackWithReferences({
    body,
    draftKey,
    pieceId,
    pieceVersionId,
    references,
  }: {
    body: string;
    draftKey: string;
    pieceId: string;
    pieceVersionId: string;
    references: FeedbackReferenceSelection[];
  }) {
    let attemptToken = selectedFeedbackAttachmentUpload.attemptToken;
    let attachmentUploads = selectedFeedbackAttachmentUpload.attachmentUploads;
    let phase: FeedbackAttachmentFlowPhase =
      selectedFeedbackAttachmentUpload.uploaded ? "finalize" : "prepare";

    try {
      if (!attemptToken) {
        setFeedbackAttachmentUploads((current) => ({
          ...current,
          [draftKey]: {
            ...defaultFeedbackAttachmentUploadState,
            phase: "preparing",
          },
        }));

        const prepareResponse = await fetch(
          `/api/pieces/${pieceId}/feedback/attachments/prepare`,
          {
            body: JSON.stringify({
              attachments: references.map((reference) => ({
                fileSizeBytes: reference.file.size,
                filename: reference.file.name,
                mimeType: reference.file.type,
              })),
              pieceVersionId,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          },
        );

        if (!prepareResponse.ok) {
          throw new FeedbackAttachmentFlowError("prepare", {
            apiError: await readApiError(prepareResponse),
          });
        }

        const prepared =
          (await prepareResponse.json()) as PrepareFeedbackAttachmentsResponse;

        attemptToken = prepared.attemptToken;
        attachmentUploads = prepared.attachments;

        setFeedbackAttachmentUploads((current) => ({
          ...current,
          [draftKey]: {
            attemptToken,
            attachmentUploads,
            error: null,
            feedbackId: prepared.feedbackId,
            phase: "uploading",
            uploaded: false,
          },
        }));
      }

      if (!attemptToken) {
        throw new FeedbackAttachmentFlowError("prepare");
      }

      if (!selectedFeedbackAttachmentUpload.uploaded) {
        phase = "upload";
        await uploadFeedbackReferences({
          attachmentUploads,
          references,
        });

        setFeedbackAttachmentUploads((current) => ({
          ...current,
          [draftKey]: {
            ...(current[draftKey] ?? defaultFeedbackAttachmentUploadState),
            attemptToken,
            attachmentUploads,
            error: null,
            phase: "finalizing",
            uploaded: true,
          },
        }));
      }

      phase = "finalize";
      const finalizeResponse = await fetch(
        `/api/pieces/${pieceId}/feedback/attachments/finalize`,
        {
          body: JSON.stringify({
            attemptToken,
            body,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );

      if (!finalizeResponse.ok) {
        throw new FeedbackAttachmentFlowError("finalize", {
          apiError: await readApiError(finalizeResponse),
          attachmentUploads,
          attemptToken,
        });
      }

      return (await finalizeResponse.json()) as { feedback: PieceFeedback };
    } catch (error) {
      if (error instanceof FeedbackAttachmentFlowError) {
        throw error;
      }

      throw new FeedbackAttachmentFlowError(phase, {
        attachmentUploads,
        attemptToken,
      });
    }
  }

  async function uploadFeedbackReferences({
    attachmentUploads,
    references,
  }: {
    attachmentUploads: Array<{ id: string; uploadUrl: string }>;
    references: FeedbackReferenceSelection[];
  }) {
    const uploadById = new Map(
      attachmentUploads.map((attachment) => [attachment.id, attachment]),
    );
    const queue = references.map((reference, index) => ({
      reference,
      upload: attachmentUploads[index] ?? uploadById.get(reference.id),
    }));
    let cursor = 0;

    async function worker() {
      while (cursor < queue.length) {
        const item = queue[cursor];
        cursor += 1;

        if (!item?.upload) {
          throw new Error("Missing feedback attachment upload URL.");
        }

        const response = await fetch(item.upload.uploadUrl, {
          body: item.reference.file,
          headers: {
            "Content-Type": item.reference.file.type,
          },
          method: "PUT",
        });

        if (!response.ok) {
          throw new Error("Feedback attachment upload failed.");
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(3, queue.length) }, () => worker()),
    );
  }

  function resetFeedbackAttachmentAttempt(key: string) {
    setFeedbackAttachmentUploads((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function selectVersionFile(file: File | null) {
    if (!selectedPiece || isReadOnly) {
      return;
    }

    const error = file ? getVersionFileError(file) : null;

    setVersionUploads((current) => ({
      ...current,
      [selectedPiece.id]: {
        attemptToken: null,
        error,
        file,
        isUploading: false,
        phase: file ? (error ? "invalid" : "selected") : "idle",
        pieceVersionId: null,
        uploaded: false,
        versionNumber: null,
      },
    }));
  }

  function cancelVersionUpload() {
    if (!selectedPiece) {
      return;
    }

    const currentUpload = versionUploads[selectedPiece.id];

    if (currentUpload?.uploaded && currentUpload.attemptToken) {
      void cleanupVersionUpload(selectedPiece.id, currentUpload.attemptToken);
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
      selectedUploadState.phase === "invalid" ||
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
        phase: selectedUploadState.uploaded ? "finalizing" : "preparing",
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

    let attemptToken = selectedUploadState.attemptToken;
    let currentPhase: VersionUploadFlowPhase = selectedUploadState.uploaded
      ? "finalize"
      : "prepare";
    let activePieceVersionId = selectedUploadState.pieceVersionId;
    let activeVersionNumber = selectedUploadState.versionNumber;
    let activeUploaded = selectedUploadState.uploaded;

    try {
      let prepared: PrepareVersionResponse | null =
        selectedUploadState.attemptToken &&
        selectedUploadState.pieceVersionId &&
        selectedUploadState.versionNumber
          ? {
              attemptToken: selectedUploadState.attemptToken,
              pieceVersionId: selectedUploadState.pieceVersionId,
              uploadUrl: "",
              versionNumber: selectedUploadState.versionNumber,
            }
          : null;

      if (!prepared) {
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
          throw new VersionUploadFlowError(
            "prepare",
            await readApiError(prepareResponse),
          );
        }

        prepared = (await prepareResponse.json()) as PrepareVersionResponse;
        attemptToken = prepared.attemptToken;
        activePieceVersionId = prepared.pieceVersionId;
        activeVersionNumber = prepared.versionNumber;

        setVersionUploads((current) => ({
          ...current,
          [selectedPiece.id]: {
            ...selectedUploadState,
            attemptToken,
            error: null,
            isUploading: true,
            phase: "uploading",
            pieceVersionId: activePieceVersionId,
            uploaded: false,
            versionNumber: activeVersionNumber,
          },
        }));
      }

      if (!prepared) {
        throw new VersionUploadFlowError("prepare");
      }

      if (!selectedUploadState.uploaded) {
        currentPhase = "upload";
        const uploadResponse = await fetch(prepared.uploadUrl, {
          body: file,
          headers: {
            "Content-Type": file.type,
          },
          method: "PUT",
        });

        if (!uploadResponse.ok) {
          throw new VersionUploadFlowError("upload", {
            status: uploadResponse.status,
          });
        }

        activeUploaded = true;
        currentPhase = "finalize";
        setVersionUploads((current) => ({
          ...current,
          [selectedPiece.id]: {
            ...selectedUploadState,
            attemptToken: prepared.attemptToken,
            error: null,
            file,
            isUploading: true,
            phase: "finalizing",
            pieceVersionId: prepared.pieceVersionId,
            uploaded: true,
            versionNumber: prepared.versionNumber,
          },
        }));
      }

      currentPhase = "finalize";
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
        throw new VersionUploadFlowError(
          "finalize",
          await readApiError(finalizeResponse),
        );
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
    } catch (error) {
      const uploadError =
        error instanceof VersionUploadFlowError
          ? error
          : new VersionUploadFlowError(currentPhase);

      if (
        uploadError.phase === "upload" &&
        attemptToken
      ) {
        void cleanupVersionUpload(selectedPiece.id, attemptToken);
      }

      if (uploadError.phase === "finalize") {
        const resolution = resolveFinalizeFailure({
          code: uploadError.apiError?.code,
          status: uploadError.apiError?.status,
        });

        setVersionUploads((current) => ({
          ...current,
          [selectedPiece.id]: {
            ...selectedUploadState,
            attemptToken: resolution.discardAttempt ? null : attemptToken,
            error: resolution.description,
            file,
            isUploading: false,
            phase: resolution.discardAttempt ? "selected" : "finalize-error",
            pieceVersionId: resolution.discardAttempt
              ? null
              : activePieceVersionId,
            uploaded: resolution.discardAttempt ? false : activeUploaded,
            versionNumber: resolution.discardAttempt
              ? null
              : activeVersionNumber,
          },
        }));
        showToast({
          description: resolution.description,
          title: resolution.title,
          tone: "error",
        });

        if (
          uploadError.apiError?.code === "VERSION_CONFLICT" ||
          uploadError.apiError?.code === "DELIVERY_CLOSED"
        ) {
          router.refresh();
        }

        return;
      }

      setVersionUploads((current) => ({
        ...current,
        [selectedPiece.id]: {
          error: "No pudimos subir la versión. Intentá nuevamente.",
          file,
          isUploading: false,
          attemptToken: null,
          phase: "selected",
          pieceVersionId: null,
          uploaded: false,
          versionNumber: null,
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
          feedbackAttachmentUpload={selectedFeedbackAttachmentUpload}
          feedbackReferences={selectedFeedbackReferences}
          hasNext={selectedIndex >= 0 && selectedIndex < pieceItems.length - 1}
          hasPrevious={selectedIndex > 0}
          isFeedbackSubmitting={pendingFeedbackKey === draftKey}
          isLatestVersion={isSelectedLatestVersion}
          isReadOnly={isReadOnly}
          isReviewSaving={pendingReviewVersionId === selectedVersion.id}
          onClose={closeModal}
          onDraftChange={updateDraft}
          onFeedbackReferenceRemove={removeFeedbackReference}
          onFeedbackReferenceSelect={selectFeedbackReferences}
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
    const persistedVersions =
      pieces.find((piece) => piece.id === pieceId)?.versions ?? [];

    setLocalVersions((current) => {
      const optimisticVersionIdsToDrop = new Set(
        getOptimisticVersionIdsToDrop(
          persistedVersions,
          current[pieceId] ?? [],
        ),
      );

      return {
        ...current,
        [pieceId]: [
          version,
          ...(current[pieceId] ?? []).filter(
            (localVersion) => !optimisticVersionIdsToDrop.has(localVersion.id),
          ),
        ],
      };
    });
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

async function cleanupFeedbackAttachmentUpload(
  pieceId: string,
  attemptToken: string,
) {
  await fetch(`/api/pieces/${pieceId}/feedback/attachments/cleanup`, {
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

type ApiErrorCode =
  | "DELIVERY_CLOSED"
  | "HISTORICAL_VERSION"
  | "INVALID_REVIEW_STATE"
  | "PIECE_NOT_FOUND"
  | "VERSION_CONFLICT";

type ApiErrorPayload = {
  code?: ApiErrorCode;
  message?: string;
  status: number;
};

class ApiRequestError extends Error {
  public readonly code?: ApiErrorCode;
  public readonly status: number;

  constructor({ code, message, status }: ApiErrorPayload) {
    super(message ?? "API request failed.");
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

class VersionUploadFlowError extends Error {
  constructor(
    public readonly phase: VersionUploadFlowPhase,
    public readonly apiError?: ApiErrorPayload,
  ) {
    super("Version upload flow failed.");
    this.name = "VersionUploadFlowError";
  }
}

class FeedbackAttachmentFlowError extends Error {
  public readonly apiError?: ApiErrorPayload;
  public readonly attachmentUploads: Array<{ id: string; uploadUrl: string }>;
  public readonly attemptToken?: string | null;

  constructor(
    public readonly phase: FeedbackAttachmentFlowPhase,
    options: {
      apiError?: ApiErrorPayload;
      attachmentUploads?: Array<{ id: string; uploadUrl: string }>;
      attemptToken?: string | null;
    } = {},
  ) {
    super("Feedback attachment flow failed.");
    this.name = "FeedbackAttachmentFlowError";
    this.apiError = options.apiError;
    this.attachmentUploads = options.attachmentUploads ?? [];
    this.attemptToken = options.attemptToken;
  }
}

async function readApiError(response: Response) {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (isApiErrorPayload(payload)) {
    return new ApiRequestError({
      code: isApiErrorCode(payload.code) ? payload.code : undefined,
      message: typeof payload.error === "string" ? payload.error : undefined,
      status: response.status,
    });
  }

  return new ApiRequestError({ status: response.status });
}

function isApiErrorPayload(
  payload: unknown,
): payload is { code?: unknown; error?: unknown } {
  return typeof payload === "object" && payload !== null;
}

function isApiErrorCode(code: unknown): code is ApiErrorCode {
  return (
    code === "DELIVERY_CLOSED" ||
    code === "HISTORICAL_VERSION" ||
    code === "INVALID_REVIEW_STATE" ||
    code === "PIECE_NOT_FOUND" ||
    code === "VERSION_CONFLICT"
  );
}
