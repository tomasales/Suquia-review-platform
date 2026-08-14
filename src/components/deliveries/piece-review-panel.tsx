import { Check, MessageSquare, Paperclip, RotateCcw, Upload, X } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DeliveryDetail } from "@/lib/deliveries";

import { getReviewStatePresentation } from "./piece-card";
import { PiecePreview } from "./piece-preview";

type Piece = DeliveryDetail["pieces"][number];
type PieceVersion = Piece["versions"][number];
type ReviewState = Piece["reviewState"];

type PieceReviewPanelProps = {
  draft: string;
  feedbackAttachmentUpload: {
    error: string | null;
    phase: string;
    uploaded: boolean;
  };
  feedbackReferences: Array<{
    error: string | null;
    file: File;
    id: string;
    objectUrl: string;
  }>;
  isFeedbackSubmitting: boolean;
  isLatestVersion: boolean;
  isMobileLayout?: boolean;
  isReadOnly: boolean;
  isReviewSaving: boolean;
  onDraftChange: (value: string) => void;
  onFeedbackReferenceRemove: (referenceId: string) => void;
  onFeedbackReferenceSelect: (files: FileList | File[]) => void;
  onFeedbackSubmit: () => void;
  onReviewStateChange: (reviewState: ReviewState) => void;
  onVersionFileCancel: () => void;
  onVersionFileSelect: (file: File | null) => void;
  onVersionSelect: (versionNumber: number) => void;
  onVersionUpload: () => void;
  piece: Piece;
  reviewState: ReviewState;
  selectedVersion: PieceVersion;
  versionUpload: {
    error: string | null;
    file: File | null;
    isUploading: boolean;
    phase: string;
  };
};

export function PieceReviewPanel({
  draft,
  feedbackAttachmentUpload,
  feedbackReferences,
  isFeedbackSubmitting,
  isLatestVersion,
  isReadOnly,
  isReviewSaving,
  isMobileLayout = false,
  onDraftChange,
  onFeedbackReferenceRemove,
  onFeedbackReferenceSelect,
  onFeedbackSubmit,
  onReviewStateChange,
  onVersionFileCancel,
  onVersionFileSelect,
  onVersionSelect,
  onVersionUpload,
  piece,
  reviewState,
  selectedVersion,
  versionUpload,
}: PieceReviewPanelProps) {
  const state = getReviewStatePresentation(reviewState);
  const nextVersionNumber = (piece.versions[0]?.versionNumber ?? 0) + 1;
  const isInteractionDisabled = isReadOnly || !isLatestVersion;
  const isFinalizeRetry = versionUpload.phase === "finalize-error";
  const isVersionUploadBlocked =
    versionUpload.isUploading || versionUpload.phase === "invalid";
  const isFeedbackAttachmentActive =
    feedbackAttachmentUpload.phase === "preparing" ||
    feedbackAttachmentUpload.phase === "uploading" ||
    feedbackAttachmentUpload.phase === "finalizing";
  const hasInvalidFeedbackReferences = feedbackReferences.some(
    (reference) => reference.error,
  );
  const feedbackSubmitLabel = isFeedbackSubmitting
    ? feedbackAttachmentUpload.phase === "uploading"
      ? "Subiendo referencias..."
      : feedbackAttachmentUpload.phase === "finalizing"
        ? "Guardando..."
        : feedbackAttachmentUpload.phase === "finalize-error"
          ? "Reintentar"
          : "Enviando…"
    : "Enviar feedback";
  const versionUploadLabel = versionUpload.isUploading
    ? versionUpload.phase === "finalizing"
      ? "Finalizando..."
      : "Subiendo..."
    : isFinalizeRetry
      ? "Reintentar"
      : `Subir V${nextVersionNumber}`;

  return (
    <aside
      className={`flex min-h-0 min-w-0 flex-col bg-surface ${isMobileLayout ? "" : "h-full border-l border-border"}`}
    >
      <div className={isMobileLayout ? "hidden" : "border-b border-border p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Pieza {piece.position}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              V{selectedVersion.versionNumber}
            </h2>
          </div>
          <Badge tone={state.tone}>{state.label}</Badge>
        </div>

        {piece.initialNote ? (
          <div className="mt-4 rounded-[8px] border border-border bg-surface-muted/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle-foreground">
              Nota inicial
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {piece.initialNote}
            </p>
          </div>
        ) : null}

        {selectedVersion.originalFilename ? (
          <dl className="mt-4 space-y-2 rounded-[8px] border border-border bg-surface-muted/30 p-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Archivo</dt>
              <dd className="min-w-0 truncate text-right font-medium text-foreground">
                {selectedVersion.originalFilename}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Fecha</dt>
              <dd className="text-right font-medium text-foreground">
                {selectedVersion.uploadedAtLabel}
              </dd>
            </div>
            {selectedVersion.uploaderLabel ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Subida por</dt>
                <dd className="min-w-0 truncate text-right font-medium text-foreground">
                  {selectedVersion.uploaderLabel}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      <div
        className={`min-h-0 flex-1 space-y-5 overflow-y-auto p-4 ${
          isMobileLayout
            ? "pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
            : ""
        }`}
      >
        <section className={isMobileLayout ? "hidden" : ""}>
          <p className="text-sm font-semibold text-foreground">Revisión</p>
          {!isLatestVersion ? (
            <div className="mt-3 rounded-[8px] border border-border bg-surface-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">
                Versión anterior
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Esta versión forma parte del historial.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                className={
                  reviewState === "OK"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
                    : ""
                }
                disabled={isReadOnly || isReviewSaving}
                onClick={() => onReviewStateChange("OK")}
                size="sm"
                variant="secondary"
              >
                <Check className="mr-1.5 size-4" strokeWidth={1.8} />
                OK
              </Button>
              <Button
                className={
                  reviewState === "NEEDS_CHANGES"
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-50"
                    : ""
                }
                disabled={isReadOnly || isReviewSaving}
                onClick={() => onReviewStateChange("NEEDS_CHANGES")}
                size="sm"
                variant="secondary"
              >
                <RotateCcw className="mr-1.5 size-4" strokeWidth={1.8} />
                Necesita cambios
              </Button>
            </div>
          )}
          {isReadOnly ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              La entrega está cerrada.
            </p>
          ) : null}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Feedback</p>
            <span className="text-xs text-muted-foreground">
              V{selectedVersion.versionNumber}
            </span>
          </div>

          {selectedVersion.feedback.length > 0 ? (
            <div className="mt-3 space-y-2">
              {selectedVersion.feedback.map((item) => (
                <article
                  className="min-w-0 rounded-[8px] border border-border bg-surface-muted/25 p-3"
                  key={item.id}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground">
                      {item.author}
                    </span>
                    <span className="text-muted-foreground">
                      {item.createdAtLabel}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                    {item.body}
                  </p>
                  {item.attachments.length > 0 ? (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {item.attachments.map((attachment) => (
                        <ReferenceThumb
                          imageSrc={attachment.imageSrc}
                          key={attachment.id}
                          title={attachment.originalFilename}
                        />
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Todavía no hay feedback para esta versión.
            </p>
          )}

          <div className="mt-3">
            <textarea
              className="min-h-24 w-full resize-none rounded-[8px] border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-subtle-foreground"
              disabled={isInteractionDisabled || isFeedbackSubmitting}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder={
                isLatestVersion
                  ? "Escribir devolución..."
                  : "Esta versión es solo lectura."
              }
              value={draft}
            />
            {feedbackReferences.length > 0 ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {feedbackReferences.map((reference) => (
                  <div
                    className={`rounded-[8px] border p-2 ${
                      reference.error
                        ? "border-amber-300 bg-amber-50"
                        : "border-border bg-surface-muted/25"
                    }`}
                    key={reference.id}
                  >
                    <div className="flex gap-2">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-[6px] border border-border bg-surface">
                        <Image
                          alt={reference.file.name}
                          className="h-full w-full object-cover"
                          fill
                          sizes="56px"
                          src={reference.objectUrl}
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {reference.file.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatFileSize(reference.file.size)}
                        </p>
                        {reference.error ? (
                          <p className="mt-1 text-xs leading-4 text-amber-800">
                            {reference.error}
                          </p>
                        ) : null}
                      </div>
                      <button
                        aria-label="Quitar referencia"
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] border border-border text-muted-foreground disabled:opacity-45"
                        disabled={isFeedbackAttachmentActive}
                        onClick={() => onFeedbackReferenceRemove(reference.id)}
                        type="button"
                      >
                        <X className="size-3.5" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {feedbackAttachmentUpload.error ? (
              <p className="mt-2 text-xs leading-5 text-amber-800">
                {feedbackAttachmentUpload.error}
              </p>
            ) : null}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                id={`feedback-reference-upload-${selectedVersion.id}-${isMobileLayout ? "mobile" : "desktop"}`}
                multiple
                onChange={(event) => {
                  if (event.currentTarget.files) {
                    onFeedbackReferenceSelect(event.currentTarget.files);
                  }
                  event.currentTarget.value = "";
                }}
                type="file"
              />
              <label
                aria-disabled={isInteractionDisabled || isFeedbackSubmitting}
                className={`inline-flex min-h-9 cursor-pointer items-center justify-start rounded-[8px] border border-border px-3 text-sm font-medium transition-colors ${
                  isInteractionDisabled || isFeedbackSubmitting
                    ? "pointer-events-none opacity-50"
                    : "text-muted-foreground hover:bg-surface-muted"
                }`}
                htmlFor={`feedback-reference-upload-${selectedVersion.id}-${isMobileLayout ? "mobile" : "desktop"}`}
              >
                <Paperclip className="mr-1.5 size-4" strokeWidth={1.8} />
                Adjuntar referencia
              </label>
              <Button
                disabled={
                  isInteractionDisabled ||
                  isFeedbackSubmitting ||
                  hasInvalidFeedbackReferences ||
                  !draft.trim()
                }
                onClick={onFeedbackSubmit}
                size="sm"
                variant="primary"
              >
                {feedbackSubmitLabel}
              </Button>
            </div>
          </div>
        </section>

        <section>
          <p className="text-sm font-semibold text-foreground">Referencias</p>
          {selectedVersion.references.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {selectedVersion.references.map((reference) => (
                <div key={reference.id}>
                  <ReferenceThumb
                    imageSrc={reference.imageSrc}
                    title={reference.title}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {reference.title}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Sin referencias adjuntas.
            </p>
          )}
        </section>

        <section>
          <p className="text-sm font-semibold text-foreground">Versiones</p>
          <div className="mt-3 space-y-1">
            {piece.versions.map((version) => (
              <button
                className={`flex min-h-11 w-full items-center justify-between rounded-[8px] border px-3 py-2 text-left text-sm transition-colors md:min-h-0 ${
                  version.versionNumber === selectedVersion.versionNumber
                    ? "border-subtle-foreground bg-surface-muted/40 text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:bg-surface-muted/30"
                }`}
                key={version.versionNumber}
                onClick={() => onVersionSelect(version.versionNumber)}
                type="button"
              >
                <span>V{version.versionNumber}</span>
                <span className="min-w-0 truncate text-right text-xs">
                  {version.versionNumber === piece.versions[0]?.versionNumber
                    ? `Actual · ${version.reviewStateLabel}`
                    : version.reviewStateLabel}
                </span>
              </button>
            ))}
          </div>
          {!isReadOnly ? (
            <div className="mt-3 rounded-[8px] border border-border bg-surface-muted/25 p-3">
              <input
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                id={`piece-version-upload-${piece.id}-${isMobileLayout ? "mobile" : "desktop"}`}
                onChange={(event) => {
                  onVersionFileSelect(event.currentTarget.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
                type="file"
              />
              {versionUpload.file ? (
                <div className="space-y-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {versionUpload.file.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatFileSize(versionUpload.file.size)}
                      </p>
                    </div>
                    <button
                      aria-label="Cancelar subida"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-border text-muted-foreground"
                      disabled={versionUpload.isUploading}
                      onClick={onVersionFileCancel}
                      type="button"
                    >
                      <X className="size-4" strokeWidth={1.8} />
                    </button>
                  </div>
                  {versionUpload.error ? (
                    <p className="text-xs leading-5 text-amber-800">
                      {versionUpload.error}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      disabled={versionUpload.isUploading}
                      onClick={onVersionFileCancel}
                      size="sm"
                      variant="secondary"
                    >
                      Cancelar
                    </Button>
                    <Button
                      disabled={isVersionUploadBlocked}
                      onClick={onVersionUpload}
                      size="sm"
                      variant="primary"
                    >
                      {versionUploadLabel}
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-[8px] border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                  htmlFor={`piece-version-upload-${piece.id}-${isMobileLayout ? "mobile" : "desktop"}`}
                >
                  <Upload className="mr-1.5 size-4" strokeWidth={1.8} />
                  Subir nueva versión
                </label>
              )}
            </div>
          ) : null}
        </section>

        <section>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">
              Conversación
            </p>
          </div>
          {selectedVersion.conversation.length > 0 ? (
            <div className="mt-3 space-y-2">
              {selectedVersion.conversation.map((item) => (
                <article
                  className="rounded-[8px] border border-border bg-surface-muted/25 p-3"
                  key={item.id}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground">
                      {item.author}
                    </span>
                    <span className="text-muted-foreground">
                      {item.createdAtLabel}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Sin conversación todavía.
            </p>
          )}
        </section>
      </div>

      {isMobileLayout ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          {!isLatestVersion ? (
            <div className="mx-auto flex min-h-11 max-w-md items-center justify-center rounded-[8px] border border-border bg-surface-muted/40 px-3 text-sm font-medium text-muted-foreground">
              Versión anterior · solo lectura
            </div>
          ) : (
          <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <Button
              className={
                reviewState === "OK"
                  ? "min-h-11 px-2 text-[13px] border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
                  : "min-h-11 px-2 text-[13px]"
              }
              disabled={isReadOnly || isReviewSaving}
              onClick={() => onReviewStateChange("OK")}
              size="md"
              variant="secondary"
            >
              <Check className="mr-1.5 size-4" strokeWidth={1.8} />
              OK
            </Button>
            <Button
              className={
                reviewState === "NEEDS_CHANGES"
                  ? "min-h-11 px-2 text-[13px] border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-50"
                  : "min-h-11 px-2 text-[13px]"
              }
              disabled={isReadOnly || isReviewSaving}
              onClick={() => onReviewStateChange("NEEDS_CHANGES")}
              size="md"
              variant="secondary"
            >
              <RotateCcw className="mr-1.5 size-4" strokeWidth={1.8} />
              Necesita cambios
            </Button>
          </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function ReferenceThumb({
  imageSrc,
  title,
}: {
  imageSrc: string | null;
  title: string;
}) {
  const content = (
    <PiecePreview aspect="feed" imageSrc={imageSrc} label={title} mode="reference" />
  );

  return imageSrc ? (
    <a href={imageSrc} rel="noreferrer" target="_blank">
      {content}
    </a>
  ) : (
    content
  );
}
