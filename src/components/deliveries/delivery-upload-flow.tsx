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
  X,
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
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";

type DeliveryType = "STORIES" | "FEED";

type UploadPiece = {
  file: File;
  id: string;
  note: string;
  noteDraft: string;
  noteEditing: boolean;
  previewError: boolean;
  previewUrl: string;
};

type PendingTypeChange = {
  nextType: DeliveryType;
} | null;

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
  };
}

function isSupportedFile(file: File) {
  if (acceptedTypes.has(file.type)) {
    return true;
  }

  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

export function DeliveryUploadFlow({
  visualReviewMode,
}: DeliveryUploadFlowProps) {
  const router = useRouter();
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
  const [pendingTypeChange, setPendingTypeChange] =
    useState<PendingTypeChange>(null);

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
    deliveryType === "STORIES" ? "aspect-[9/16]" : "aspect-square";
  const summary = `${getTypeLabel(deliveryType)} · ${pieces.length} ${
    pieces.length === 1 ? "pieza" : "piezas"
  }`;

  const submitDescription = useMemo(() => {
    if (!deliveryType) {
      return "Elegí Stories o Feed.";
    }

    if (pieces.length === 0) {
      return "Agregá al menos una pieza.";
    }

    if (!visualReviewMode) {
      return "El envío real todavía no está activo.";
    }

    return "Vista previa: la entrega todavía no se guardó.";
  }, [deliveryType, pieces.length, visualReviewMode]);

  function addFiles(fileList: FileList | File[]) {
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
    if (deliveryType === nextType) {
      return;
    }

    if (pieces.length > 0) {
      setPendingTypeChange({ nextType });
      return;
    }

    setDeliveryType(nextType);
  }

  function confirmTypeChange() {
    if (!pendingTypeChange) {
      return;
    }

    pieces.forEach((piece) => URL.revokeObjectURL(piece.previewUrl));
    setPieces([]);
    setErrors([]);
    setGeneralNote("");
    setDeliveryType(pendingTypeChange.nextType);
    setPendingTypeChange(null);
  }

  function removePiece(pieceId: string) {
    setPieces((currentPieces) => {
      const pieceToRemove = currentPieces.find((piece) => piece.id === pieceId);

      if (pieceToRemove) {
        URL.revokeObjectURL(pieceToRemove.previewUrl);
      }

      return currentPieces.filter((piece) => piece.id !== pieceId);
    });
  }

  function movePiece(pieceId: string, direction: -1 | 1) {
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
    setPieces((currentPieces) =>
      currentPieces.map((piece) =>
        piece.id === pieceId ? { ...piece, noteDraft } : piece,
      ),
    );
  }

  function startEditingPieceNote(pieceId: string) {
    setPieces((currentPieces) =>
      currentPieces.map((piece) =>
        piece.id === pieceId
          ? { ...piece, noteDraft: piece.note, noteEditing: true }
          : piece,
      ),
    );
  }

  function cancelPieceNote(pieceId: string) {
    setPieces((currentPieces) =>
      currentPieces.map((piece) =>
        piece.id === pieceId
          ? { ...piece, noteDraft: piece.note, noteEditing: false }
          : piece,
      ),
    );
  }

  function savePieceNote(pieceId: string) {
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

    if (!deliveryType) {
      return;
    }

    setDragOverDropzone(true);
  }

  function handleDropzoneDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOverDropzone(false);

    if (!deliveryType) {
      return;
    }

    addFiles(event.dataTransfer.files);
  }

  function handlePieceDragStart(pieceId: string) {
    draggedPieceId.current = pieceId;
  }

  function handlePieceDrop(targetPieceId: string) {
    const sourcePieceId = draggedPieceId.current;
    draggedPieceId.current = null;

    if (!sourcePieceId || sourcePieceId === targetPieceId) {
      return;
    }

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

  async function handleSubmit() {
    if (!canSubmit || !visualReviewMode || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

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

    // Future real flow:
    // const createdDelivery = await createDelivery(...)
    // router.push(`/deliveries/${createdDelivery.id}`)
    router.push(
      `/deliveries/${targetDeliveryId}?created=1&pieces=${pieces.length}`,
    );
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
                  disabled={!deliveryType}
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
                } ${deliveryType ? "" : "opacity-70"}`}
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
                    disabled={!deliveryType}
                    onClick={() => inputRef.current?.click()}
                    variant="secondary"
                  >
                    Seleccionar piezas
                  </Button>
                  {!deliveryType ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Primero elegí Stories o Feed.
                    </p>
                  ) : null}
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
                disabled={!canSubmit || !visualReviewMode || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Entregando..." : "Entregar"}
              </Button>
            </div>
          </Surface>
        </aside>
      </div>

      {pendingTypeChange ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/24 p-3 sm:items-center sm:justify-center">
          <div
            aria-modal="true"
            className="w-full max-w-md rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[0_18px_60px_rgba(25,24,23,0.16)]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Cambiar tipo
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Cambiar el tipo eliminará las piezas seleccionadas.
                </p>
              </div>
              <button
                aria-label="Cancelar cambio de tipo"
                className="inline-flex size-9 items-center justify-center rounded-[8px] border border-border text-muted-foreground"
                onClick={() => setPendingTypeChange(null)}
                type="button"
              >
                <X className="size-4" strokeWidth={1.8} />
              </button>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                onClick={() => setPendingTypeChange(null)}
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button onClick={confirmTypeChange}>Cambiar tipo</Button>
            </div>
          </div>
        </div>
      ) : null}
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
  piece: UploadPiece;
};

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
  piece,
}: UploadPieceCardProps) {
  const position = String(index + 1).padStart(2, "0");
  const hasSavedNote = piece.note.trim().length > 0;

  return (
    <article
      className="rounded-[8px] border border-border bg-background p-2"
      draggable
      onDragOver={(event) => event.preventDefault()}
      onDragStart={() => onDragStart(piece.id)}
      onDrop={() => onDrop(piece.id)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 min-w-8 items-center justify-center rounded-[7px] border border-border bg-surface px-2 text-xs font-semibold text-foreground">
            {position}
          </span>
          <Badge tone={piece.previewError ? "warning" : "neutral"}>
            {piece.previewError ? "Sin preview" : "Local"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label={`Mover pieza ${position} arriba`}
            className="inline-flex size-9 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:opacity-35"
            disabled={isFirst}
            onClick={() => onMove(piece.id, -1)}
            type="button"
          >
            <ArrowUp className="size-4" strokeWidth={1.8} />
          </button>
          <button
            aria-label={`Mover pieza ${position} abajo`}
            className="inline-flex size-9 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:opacity-35"
            disabled={isLast}
            onClick={() => onMove(piece.id, 1)}
            type="button"
          >
            <ArrowDown className="size-4" strokeWidth={1.8} />
          </button>
          <button
            aria-label={`Eliminar pieza ${position}`}
            className="inline-flex size-9 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-surface-muted hover:text-destructive"
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
                onClick={() => onCancelNote(piece.id)}
                size="sm"
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                className="min-h-10"
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
