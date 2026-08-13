import { Check, MessageSquare, Paperclip, RotateCcw } from "lucide-react";

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
  isFeedbackSubmitting: boolean;
  isMobileLayout?: boolean;
  isReadOnly: boolean;
  isReviewSaving: boolean;
  onDraftChange: (value: string) => void;
  onFeedbackSubmit: () => void;
  onReviewStateChange: (reviewState: ReviewState) => void;
  onVersionSelect: (versionNumber: number) => void;
  piece: Piece;
  reviewState: ReviewState;
  selectedVersion: PieceVersion;
};

export function PieceReviewPanel({
  draft,
  isFeedbackSubmitting,
  isReadOnly,
  isReviewSaving,
  isMobileLayout = false,
  onDraftChange,
  onFeedbackSubmit,
  onReviewStateChange,
  onVersionSelect,
  piece,
  reviewState,
  selectedVersion,
}: PieceReviewPanelProps) {
  const state = getReviewStatePresentation(reviewState);

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
              disabled={isReadOnly || isFeedbackSubmitting}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Escribir devolución..."
              value={draft}
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                className="justify-start text-muted-foreground"
                disabled
                size="sm"
                variant="secondary"
              >
                <Paperclip className="mr-1.5 size-4" strokeWidth={1.8} />
                Adjuntar referencia
              </Button>
              <Button
                disabled={isReadOnly || isFeedbackSubmitting || !draft.trim()}
                onClick={onFeedbackSubmit}
                size="sm"
                variant="primary"
              >
                {isFeedbackSubmitting ? "Enviando…" : "Enviar feedback"}
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
                  <PiecePreview
                    aspect="feed"
                    imageSrc={reference.imageSrc}
                    label={reference.title}
                    mode="reference"
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
                <span className="text-xs">
                  {version.versionNumber === piece.versions[0]?.versionNumber
                    ? "Actual"
                    : version.uploadedAtLabel}
                </span>
              </button>
            ))}
          </div>
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
        </div>
      ) : null}
    </aside>
  );
}
