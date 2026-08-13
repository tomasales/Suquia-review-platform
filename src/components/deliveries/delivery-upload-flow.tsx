"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  FileImage,
  GripVertical,
  Plus,
  StickyNote,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Badge } from "@/components/ui/badge";
import { useDriveRuntime } from "@/components/drive/drive-runtime";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";

type DeliveryType = "STORIES" | "FEED";
type PieceUploadStatus = "idle" | "uploading" | "uploaded" | "error";

type UploadPiece = {
  file: File;
  id: string;
  note: string;
  noteDraft: string;
  noteEditing: boolean;
  previewError: boolean;
  previewUrl: string;
  uploadError: string | null;
  uploadStatus: PieceUploadStatus;
};

type PreparedAttemptPiece = {
  expiresAt: string;
  localPieceId: string;
  pieceId: string;
  position: number;
  storageKey: string;
  uploaded: boolean;
  uploadUrl: string;
};

type PreparedAttempt = {
  attemptToken: string;
  deliveryId: string;
  pieces: PreparedAttemptPiece[];
  type: DeliveryType;
};

type PrepareDeliveryResponse = {
  attemptToken: string;
  deliveryId: string;
  pieces: Array<{
    expiresAt: string;
    pieceId: string;
    position: number;
    storageKey: string;
    uploadUrl: string;
  }>;
};

type FinalizeDeliveryResponse = {
  alreadyFinalized: boolean;
  deliveryId: string;
};

type DeliveryUploadFlowProps = {
  visualReviewMode: boolean;
};

const deliveryTypes: Array<{
  description: string;
  label: string;
  value: DeliveryType;
}> = [
  {
    description: "Secuencia vertical para publicar en historias.",
    label: "Stories",
    value: "STORIES",
  },
  {
    description: "Piezas para publicaciones de feed.",
    label: "Feed",
    value: "FEED",
  },
];

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function getTypeLabel(type: DeliveryType | null) {
  if (type === "STORIES") {
    return "Stories";
  }

  if (type === "FEED") {
    return "Feed";
  }

  return "Sin tipo";
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function createPiece(file: File): UploadPiece {
  const randomId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    file,
    id: `${file.name}-${file.size}-${file.lastModified}-${randomId}`,
    note: "",
    noteDraft: "",
    noteEditing: false,
    previewError: false,
    previewUrl: URL.createObjectURL(file),
    uploadError: null,
    uploadStatus: "idle",
  };
}

function isSupportedFile(file: File) {
  if (acceptedTypes.has(file.type)) {
    return true;
  }

  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(payload?.error ?? "Tus cambios siguen acá. Intentá nuevamente.");
  }

  return response.json() as Promise<T>;
}

async function prepareDeliveryUpload({
  pieces,
  type,
}: {
  pieces: Array<{
    file: File;
    id: string;
  }>;
  type: DeliveryType;
}): Promise<PreparedAttempt> {
  const result = await postJson<PrepareDeliveryResponse>(
    "/api/deliveries/prepare",
    {
      pieces: pieces.map((piece) => ({
        fileSizeBytes: piece.file.size,
        filename: piece.file.name,
        mimeType: piece.file.type,
      })),
      type,
    },
  );

  return {
    attemptToken: result.attemptToken,
    deliveryId: result.deliveryId,
    pieces: result.pieces.map((piece, index) => ({
      ...piece,
      localPieceId: pieces[index]?.id ?? "",
      uploaded: false,
    })),
    type,
  };
}

async function finalizeDeliveryUpload({
  attempt,
  generalNote,
  pieces,
}: {
  attempt: PreparedAttempt;
  generalNote: string;
  pieces: Array<{
    id: string;
    note: string;
  }>;
}) {
  const noteByLocalPieceId = new Map(pieces.map((piece) => [piece.id, piece.note]));

  return postJson<FinalizeDeliveryResponse>("/api/deliveries/finalize", {
    attemptToken: attempt.attemptToken,
    generalNote,
    pieces: attempt.pieces.map((preparedPiece) => {
      return {
        pieceId: preparedPiece.pieceId,
        note: noteByLocalPieceId.get(preparedPiece.localPieceId) ?? "",
      };
    }),
  });
}

async function cleanupPreparedAttempt(attemptToken: string) {
  await fetch("/api/deliveries/cleanup-upload", {
    body: JSON.stringify({ attemptToken }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }).catch(() => null);
}

function getClientErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Tus cambios siguen acá. Intentá nuevamente.";
}

export function DeliveryUploadFlow({
  visualReviewMode,
}: DeliveryUploadFlowProps) {
  const router = useRouter();
  const driveRuntime = useDriveRuntime();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const draggedPieceId = useRef<string | null>(null);
  const piecesRef = useRef<UploadPiece[]>([]);
  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(null);
  const [dragOverDropzone, setDragOverDropzone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [generalNote, setGeneralNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pieces, setPieces] = useState<UploadPiece[]>([]);
  const [preparedAttempt, setPreparedAttempt] = useState<PreparedAttempt | null>(
    null,
  );

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  useEffect(() => {
    return () => {
      piecesRef.current.forEach((piece) => URL.revokeObjectURL(piece.previewUrl));
    };
  }, []);

  const piecesWithNotes = pieces.filter((piece) => piece.note.trim()).length;
  const canSubmit = Boolean(deliveryType && pieces.length > 0);
  const aspectClass =
    deliveryType === "STORIES"
      ? "aspect-[9/16]"
      : deliveryType === "FEED"
        ? "aspect-square"
        : "min-h-[220px]";
  const summary = `${getTypeLabel(deliveryType)} · ${pieces.length} ${
    pieces.length === 1 ? "pieza" : "piezas"
  }`;

  const submitDescription = useMemo(() => {
    if (!deliveryType && pieces.length === 0) {
      return "Elegí tipo y agregá piezas para entregar.";
    }

    if (!deliveryType) {
      return "Elegí Stories o Feed para entregar.";
    }

    if (pieces.length === 0) {
      return "Agregá al menos una pieza para entregar.";
    }

    if (visualReviewMode) {
      return "Vista previa: la entrega todavía no se guardó.";
    }

    return "Al entregar se suben las piezas y se abre el detalle.";
  }, [deliveryType, pieces.length, visualReviewMode]);

  function addFiles(fileList: FileList | File[]) {
    if (isSubmitting) {
      return;
    }

    discardPreparedAttemptForStructuralChange();

    const incomingFiles = Array.from(fileList);
    const supportedFiles = incomingFiles.filter(isSupportedFile);
    const unsupportedFiles = incomingFiles.filter((file) => !isSupportedFile(file));

    if (unsupportedFiles.length > 0) {
      setErrors(
        unsupportedFiles.map(
          (file) => `${file.name} no es compatible. Usá JPG, PNG o WEBP.`,
        ),
      );
    } else {
      setErrors([]);
    }

    if (supportedFiles.length === 0) {
      return;
    }

    setPieces((currentPieces) => [
      ...currentPieces,
      ...supportedFiles.map(createPiece),
    ]);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  }

  function chooseType(nextType: DeliveryType) {
    if (isSubmitting) {
      return;
    }

    if (deliveryType === nextType) {
      return;
    }

    discardPreparedAttemptForStructuralChange();
    setDeliveryType(nextType);
  }

  function removePiece(pieceId: string) {
    if (isSubmitting) {
      return;
    }

    discardPreparedAttemptForStructuralChange();
    setPieces((currentPieces) => {
      const pieceToRemove = currentPieces.find((piece) => piece.id === pieceId);

      if (pieceToRemove) {
        URL.revokeObjectURL(pieceToRemove.previewUrl);
      }

      return currentPieces.filter((piece) => piece.id !== pieceId);
    });
  }

  function movePiece(pieceId: string, direction: -1 | 1) {
    if (isSubmitting) {
      return;
    }

    discardPreparedAttemptForStructuralChange();
    setPieces((currentPieces) => {
      const currentIndex = currentPieces.findIndex((piece) => piece.id === pieceId);
      const nextIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= currentPieces.length
      ) {
        return currentPieces;
      }

      const nextPieces = [...currentPieces];
      const [piece] = nextPieces.splice(currentIndex, 1);
      nextPieces.splice(nextIndex, 0, piece);

      return nextPieces;
    });
  }

  function updatePieceNoteDraft(pieceId: string, noteDraft: string) {
    if (isSubmitting) {
      return;
    }

    setPieces((currentPieces) =>
      currentPieces.map((piece) =>
        piece.id === pieceId ? { ...piece, noteDraft } : piece,
      ),
    );
  }

  function startEditingPieceNote(pieceId: string) {
    if (isSubmitting) {
      return;
    }

    setPieces((currentPieces) =>
      currentPieces.map((piece) =>
        piece.id === pieceId
          ? { ...piece, noteDraft: piece.note, noteEditing: true }
          : piece,
      ),
    );
  }

  function cancelPieceNote(pieceId: string) {
    if (isSubmitting) {
      return;
    }

    setPieces((currentPieces) =>
      currentPieces.map((piece) =>
        piece.id === pieceId
          ? { ...piece, noteDraft: piece.note, noteEditing: false }
          : piece,
      ),
    );
  }

  function savePieceNote(pieceId: string) {
    if (isSubmitting) {
      return;
    }

    setPieces((currentPieces) =>
      currentPieces.map((piece) =>
        piece.id === pieceId
          ? {
              ...piece,
              note: piece.noteDraft.trim(),
              noteDraft: piece.noteDraft.trim(),
              noteEditing: false,
            }
          : piece,
      ),
    );
  }

  function markPreviewError(pieceId: string) {
    setPieces((currentPieces) =>
      currentPieces.map((piece) =>
        piece.id === pieceId ? { ...piece, previewError: true } : piece,
      ),
    );
  }

  function handleDropzoneDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOverDropzone(true);
  }

  function handleDropzoneDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOverDropzone(false);
    addFiles(event.dataTransfer.files);
  }

  function handlePieceDragStart(pieceId: string) {
    if (isSubmitting) {
      return;
    }

    draggedPieceId.current = pieceId;
  }

  function handlePieceDrop(targetPieceId: string) {
    if (isSubmitting) {
      return;
    }

    const sourcePieceId = draggedPieceId.current;
    draggedPieceId.current = null;

    if (!sourcePieceId || sourcePieceId === targetPieceId) {
      return;
    }

    discardPreparedAttemptForStructuralChange();
    setPieces((currentPieces) => {
      const sourceIndex = currentPieces.findIndex(
        (piece) => piece.id === sourcePieceId,
      );
      const targetIndex = currentPieces.findIndex(
        (piece) => piece.id === targetPieceId,
      );

      if (sourceIndex < 0 || targetIndex < 0) {
        return currentPieces;
      }

      const nextPieces = [...currentPieces];
      const [piece] = nextPieces.splice(sourceIndex, 1);
      nextPieces.splice(targetIndex, 0, piece);

      return nextPieces;
    });
  }

  function setPieceUploadState(
    pieceId: string,
    uploadStatus: PieceUploadStatus,
    uploadError: string | null = null,
  ) {
    setPieces((currentPieces) =>
      currentPieces.map((piece) =>
        piece.id === pieceId ? { ...piece, uploadError, uploadStatus } : piece,
      ),
    );
  }

  function resetPieceUploadState() {
    setPieces((currentPieces) =>
      currentPieces.map((piece) => ({
        ...piece,
        uploadError: null,
        uploadStatus: "idle",
      })),
    );
  }

  function discardPreparedAttemptForStructuralChange() {
    if (!preparedAttempt) {
      return;
    }

    void cleanupPreparedAttempt(preparedAttempt.attemptToken);
    setPreparedAttempt(null);
    resetPieceUploadState();
  }

  async function uploadPreparedPieces(
    attempt: PreparedAttempt,
    snapshotPieces: Array<{
      file: File;
      id: string;
    }>,
  ) {
    const nextAttempt: PreparedAttempt = {
      ...attempt,
      pieces: attempt.pieces.map((piece) => ({ ...piece })),
    };
    const fileByPieceId = new Map(
      snapshotPieces.map((piece) => [piece.id, piece.file]),
    );
    const errors: Array<{ localPieceId: string }> = [];
    let cursor = 0;

    async function worker() {
      while (cursor < nextAttempt.pieces.length && errors.length === 0) {
        const index = cursor;
        cursor += 1;

        const preparedPiece = nextAttempt.pieces[index];

        if (!preparedPiece || preparedPiece.uploaded) {
          continue;
        }

        const file = fileByPieceId.get(preparedPiece.localPieceId);

        if (!file) {
          errors.push({ localPieceId: preparedPiece.localPieceId });
          setPieceUploadState(
            preparedPiece.localPieceId,
            "error",
            "No pudimos subir esta pieza.",
          );
          continue;
        }

        setPieceUploadState(preparedPiece.localPieceId, "uploading");

        try {
          const response = await fetch(preparedPiece.uploadUrl, {
            body: file,
            headers: {
              "Content-Type": file.type,
            },
            method: "PUT",
          });

          if (!response.ok) {
            throw new Error("Upload failed");
          }

          preparedPiece.uploaded = true;
          setPieceUploadState(preparedPiece.localPieceId, "uploaded");
        } catch {
          errors.push({ localPieceId: preparedPiece.localPieceId });
          setPieceUploadState(
            preparedPiece.localPieceId,
            "error",
            "No pudimos subir esta pieza.",
          );
        }
      }
    }

    await Promise.all(Array.from({ length: 4 }, () => worker()));

    if (errors.length > 0) {
      await cleanupPreparedAttempt(attempt.attemptToken);
      setPreparedAttempt(null);
      setPieces((currentPieces) =>
        currentPieces.map((piece) =>
          piece.uploadStatus === "uploaded"
            ? { ...piece, uploadError: null, uploadStatus: "idle" }
            : piece,
        ),
      );
      throw new Error("Tus cambios siguen acá. Intentá nuevamente.");
    }

    return nextAttempt;
  }

  async function handleSubmit() {
    if (!canSubmit || isSubmitting || !deliveryType) {
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    if (!visualReviewMode) {
      void driveRuntime.checkNow({
        processPending: false,
        silent: true,
      });
    }

    if (visualReviewMode) {
      await new Promise((resolve) => window.setTimeout(resolve, 650));

      const shouldSimulateError =
        process.env.NODE_ENV === "development" &&
        new URLSearchParams(window.location.search).get("simulateCreateError") ===
          "1";

      if (shouldSimulateError) {
        setIsSubmitting(false);
        showToast({
          title: "No pudimos crear la entrega",
          description: "Tus cambios siguen acá. Intentá nuevamente.",
          tone: "error",
        });
        return;
      }

      const targetDeliveryId =
        deliveryType === "FEED" ? "visual-feed-review" : "visual-stories-sent";

      router.push(
        `/deliveries/${targetDeliveryId}?created=1&pieces=${pieces.length}`,
      );
      return;
    }

    const snapshot = {
      generalNote,
      pieces: pieces.map((piece) => ({
        file: piece.file,
        id: piece.id,
        note: piece.note,
      })),
      type: deliveryType,
    };

    try {
      const attempt =
        preparedAttempt ??
        (await prepareDeliveryUpload({
          pieces: snapshot.pieces,
          type: snapshot.type,
        }));
      let uploadedAttempt = attempt;

      setPreparedAttempt(attempt);

      if (!attempt.pieces.every((piece) => piece.uploaded)) {
        uploadedAttempt = await uploadPreparedPieces(attempt, snapshot.pieces);
        setPreparedAttempt(uploadedAttempt);
      }

      const result = await finalizeDeliveryUpload({
        attempt: uploadedAttempt,
        generalNote: snapshot.generalNote,
        pieces: snapshot.pieces,
      });

      router.push(
        `/deliveries/${result.deliveryId}?created=1&pieces=${snapshot.pieces.length}`,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("expiró")
      ) {
        setPreparedAttempt(null);
        resetPieceUploadState();
      }

      showToast({
        title: "No pudimos crear la entrega",
        description: getClientErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Surface
            title="Tipo de entrega"
            description="Una entrega puede ser Stories o Feed."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {deliveryTypes.map((type) => {
                const isActive = deliveryType === type.value;

                return (
                  <button
                    aria-pressed={isActive}
                    className={`min-h-20 rounded-[8px] border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? "border-foreground bg-surface-muted text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                    }`}
                    disabled={isSubmitting}
                    key={type.value}
                    onClick={() => chooseType(type.value)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {type.label}
                      </span>
                      {isActive ? <Check className="size-4" /> : null}
                    </span>
                    <span className="mt-2 block text-xs leading-5">
                      {type.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </Surface>

          <Surface
            title="Piezas"
            description={
              pieces.length > 0
                ? "Ordená las piezas y agregá notas si hace falta."
                : "Agregá los archivos que querés revisar."
            }
            action={
              pieces.length > 0 ? (
                <Button
                  disabled={isSubmitting}
                  onClick={() => inputRef.current?.click()}
                  size="sm"
                  variant="secondary"
                >
                  <Plus className="mr-2 size-4" strokeWidth={1.8} />
                  Agregar más
                </Button>
              ) : null
            }
          >
            <input
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={isSubmitting}
              multiple
              onChange={handleInputChange}
              ref={inputRef}
              type="file"
            />

            {pieces.length === 0 ? (
              <div
                className={`flex min-h-[260px] items-center justify-center rounded-[8px] border border-dashed px-4 text-center transition-colors ${
                  dragOverDropzone
                    ? "border-foreground bg-surface-muted"
                    : "border-border bg-background"
                }`}
                onDragLeave={() => setDragOverDropzone(false)}
                onDragOver={handleDropzoneDragOver}
                onDrop={handleDropzoneDrop}
              >
                <div className="max-w-md">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-[8px] border border-border bg-surface">
                    <Upload className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Arrastrá archivos acá o elegilos desde tu dispositivo
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    JPG, PNG o WEBP. Las previews se preparan localmente en el
                    navegador.
                  </p>
                  <Button
                    className="mt-4 min-h-11 px-5"
                    disabled={isSubmitting}
                    onClick={() => inputRef.current?.click()}
                    variant="secondary"
                  >
                    Seleccionar piezas
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={`rounded-[8px] border border-dashed px-3 py-3 text-sm transition-colors ${
                    dragOverDropzone
                      ? "border-foreground bg-surface-muted text-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                  onDragLeave={() => setDragOverDropzone(false)}
                  onDragOver={handleDropzoneDragOver}
                  onDrop={handleDropzoneDrop}
                >
                  <button
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[7px] font-medium"
                    disabled={isSubmitting}
                    onClick={() => inputRef.current?.click()}
                    type="button"
                  >
                    <Plus className="size-4" strokeWidth={1.8} />
                    Agregar más piezas
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {pieces.map((piece, index) => (
                    <UploadPieceCard
                      aspectClass={aspectClass}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === pieces.length - 1}
                      key={piece.id}
                      onDragStart={handlePieceDragStart}
                      onDrop={handlePieceDrop}
                      onMove={movePiece}
                      onPreviewError={markPreviewError}
                      onRemove={removePiece}
                      onCancelNote={cancelPieceNote}
                      onSaveNote={savePieceNote}
                      onStartEditingNote={startEditingPieceNote}
                      onUpdateNoteDraft={updatePieceNoteDraft}
                      isDisabled={isSubmitting}
                      piece={piece}
                    />
                  ))}
                </div>
              </div>
            )}

            {errors.length > 0 ? (
              <div className="mt-4 space-y-2 rounded-[8px] border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                {errors.map((error) => (
                  <p className="flex gap-2" key={error}>
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0"
                      strokeWidth={1.8}
                    />
                    <span>{error}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </Surface>

          <Surface title="Nota general" description="Opcional y secundaria.">
            <label className="sr-only" htmlFor="general-note">
              Nota general
            </label>
            <textarea
              className="min-h-28 w-full resize-y rounded-[8px] border border-border bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
              disabled={isSubmitting}
              id="general-note"
              onChange={(event) => {
                setGeneralNote(event.target.value);
              }}
              placeholder="Contexto general de la entrega..."
              value={generalNote}
            />
          </Surface>
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <Surface compact title="Resumen">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {summary}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {piecesWithNotes > 0
                    ? `${piecesWithNotes} ${
                        piecesWithNotes === 1 ? "pieza" : "piezas"
                      } con nota`
                    : "Sin notas por pieza"}
                </p>
              </div>

              <div className="rounded-[8px] border border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                {submitDescription}
              </div>

              <Button
                className="min-h-11 w-full"
                disabled={!canSubmit || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Entregando..." : "Entregar"}
              </Button>
            </div>
          </Surface>
        </aside>
      </div>
    </>
  );
}

type UploadPieceCardProps = {
  aspectClass: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onDragStart: (pieceId: string) => void;
  onDrop: (pieceId: string) => void;
  onMove: (pieceId: string, direction: -1 | 1) => void;
  onCancelNote: (pieceId: string) => void;
  onPreviewError: (pieceId: string) => void;
  onRemove: (pieceId: string) => void;
  onSaveNote: (pieceId: string) => void;
  onStartEditingNote: (pieceId: string) => void;
  onUpdateNoteDraft: (pieceId: string, noteDraft: string) => void;
  isDisabled: boolean;
  piece: UploadPiece;
};

function getUploadBadge(piece: UploadPiece) {
  if (piece.uploadStatus === "uploading") {
    return { label: "Subiendo", tone: "info" as const };
  }

  if (piece.uploadStatus === "uploaded") {
    return { label: "Subida", tone: "success" as const };
  }

  if (piece.uploadStatus === "error") {
    return { label: "Error", tone: "warning" as const };
  }

  return {
    label: piece.previewError ? "Sin preview" : "Local",
    tone: piece.previewError ? ("warning" as const) : ("neutral" as const),
  };
}

function UploadPieceCard({
  aspectClass,
  index,
  isFirst,
  isLast,
  onDragStart,
  onDrop,
  onMove,
  onCancelNote,
  onPreviewError,
  onRemove,
  onSaveNote,
  onStartEditingNote,
  onUpdateNoteDraft,
  isDisabled,
  piece,
}: UploadPieceCardProps) {
  const position = String(index + 1).padStart(2, "0");
  const hasSavedNote = piece.note.trim().length > 0;
  const uploadBadge = getUploadBadge(piece);

  return (
    <article
      className="rounded-[8px] border border-border bg-background p-2"
      draggable={!isDisabled}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={() => onDragStart(piece.id)}
      onDrop={() => onDrop(piece.id)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 min-w-8 items-center justify-center rounded-[7px] border border-border bg-surface px-2 text-xs font-semibold text-foreground">
            {position}
          </span>
          <Badge tone={uploadBadge.tone}>{uploadBadge.label}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label={`Mover pieza ${position} arriba`}
            className="inline-flex size-9 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:opacity-35"
            disabled={isFirst || isDisabled}
            onClick={() => onMove(piece.id, -1)}
            type="button"
          >
            <ArrowUp className="size-4" strokeWidth={1.8} />
          </button>
          <button
            aria-label={`Mover pieza ${position} abajo`}
            className="inline-flex size-9 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:opacity-35"
            disabled={isLast || isDisabled}
            onClick={() => onMove(piece.id, 1)}
            type="button"
          >
            <ArrowDown className="size-4" strokeWidth={1.8} />
          </button>
          <button
            aria-label={`Eliminar pieza ${position}`}
            className="inline-flex size-9 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-surface-muted hover:text-destructive"
            disabled={isDisabled}
            onClick={() => onRemove(piece.id)}
            type="button"
          >
            <Trash2 className="size-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div
        aria-label={`Reordenar pieza ${position}`}
        className="mb-2 flex h-8 cursor-grab items-center justify-center rounded-[7px] border border-border bg-surface text-xs font-medium text-muted-foreground"
      >
        <GripVertical className="mr-1 size-4" strokeWidth={1.8} />
        Arrastrar
      </div>

      <div
        className={`relative ${aspectClass} overflow-hidden rounded-[8px] border border-border bg-surface-muted`}
      >
        {piece.previewError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-muted-foreground">
            <FileImage className="size-5" strokeWidth={1.8} />
            No se pudo previsualizar
          </div>
        ) : (
          <Image
            alt={`Preview de ${piece.file.name}`}
            className="h-full w-full object-contain"
            fill
            onError={() => onPreviewError(piece.id)}
            sizes="(min-width: 1536px) 280px, (min-width: 1024px) 25vw, (min-width: 640px) 45vw, 92vw"
            src={piece.previewUrl}
            unoptimized
          />
        )}
      </div>

      <div className="mt-2 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {piece.file.name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatFileSize(piece.file.size)}
        </p>
        {piece.uploadError ? (
          <p className="mt-1 text-xs font-medium text-destructive">
            {piece.uploadError}
          </p>
        ) : null}
      </div>

      <div className="mt-3">
        {piece.noteEditing ? (
          <div>
            <label
              className="mb-1 block text-xs font-medium text-muted-foreground"
              htmlFor={`piece-note-${piece.id}`}
            >
              Nota para esta pieza
            </label>
            <textarea
              className="min-h-20 w-full resize-y rounded-[8px] border border-border bg-surface px-3 py-2 text-sm leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
              disabled={isDisabled}
              id={`piece-note-${piece.id}`}
              onChange={(event) =>
                onUpdateNoteDraft(piece.id, event.target.value)
              }
              placeholder="Nota para esta pieza..."
              value={piece.noteDraft}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                className="min-h-10"
                disabled={isDisabled}
                onClick={() => onCancelNote(piece.id)}
                size="sm"
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                className="min-h-10"
                disabled={isDisabled}
                onClick={() => onSaveNote(piece.id)}
                size="sm"
              >
                Guardar nota
              </Button>
            </div>
          </div>
        ) : hasSavedNote ? (
          <div className="rounded-[8px] border border-border bg-surface px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              Nota para esta pieza
            </p>
            <p className="mt-1 max-h-[3.75rem] overflow-hidden text-sm leading-5 text-foreground">
              {piece.note}
            </p>
            <button
              className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-[8px] text-sm font-medium text-muted-foreground hover:text-foreground"
              disabled={isDisabled}
              onClick={() => onStartEditingNote(piece.id)}
              type="button"
            >
              <StickyNote className="size-4" strokeWidth={1.8} />
              Editar nota
            </button>
          </div>
        ) : (
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-[8px] px-2 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            disabled={isDisabled}
            onClick={() => onStartEditingNote(piece.id)}
            type="button"
          >
            <StickyNote className="size-4" strokeWidth={1.8} />
            Agregar nota
          </button>
        )}
      </div>
    </article>
  );
}
