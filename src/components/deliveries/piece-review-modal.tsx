"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";

import type { DeliveryDetail } from "@/lib/deliveries";

import { PiecePreview } from "./piece-preview";
import { PieceReviewPanel } from "./piece-review-panel";

type Piece = DeliveryDetail["pieces"][number];
type PieceVersion = Piece["versions"][number];
type ReviewState = Piece["reviewState"];

type PieceReviewModalProps = {
  draft: string;
  hasNext: boolean;
  hasPrevious: boolean;
  isFeedbackSubmitting: boolean;
  isLatestVersion: boolean;
  isReadOnly: boolean;
  isReviewSaving: boolean;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onFeedbackSubmit: () => void;
  onNext: () => void;
  onPrevious: () => void;
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

export function PieceReviewModal({
  draft,
  hasNext,
  hasPrevious,
  isFeedbackSubmitting,
  isLatestVersion,
  isReadOnly,
  isReviewSaving,
  onClose,
  onDraftChange,
  onFeedbackSubmit,
  onNext,
  onPrevious,
  onReviewStateChange,
  onVersionFileCancel,
  onVersionFileSelect,
  onVersionSelect,
  onVersionUpload,
  piece,
  reviewState,
  selectedVersion,
  versionUpload,
}: PieceReviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeElement = document.activeElement;
    dialogRef.current?.focus();

    return () => {
      if (activeElement instanceof HTMLElement) {
        activeElement.focus();
      }
    };
  }, [piece.id]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "ArrowLeft" && hasPrevious) {
      event.preventDefault();
      onPrevious();
      return;
    }

    if (event.key === "ArrowRight" && hasNext) {
      event.preventDefault();
      onNext();
      return;
    }

    if (event.key === "Tab") {
      trapFocus(event);
    }
  }

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable?.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex max-w-[100dvw] items-center justify-center overflow-hidden bg-black/28 md:p-6">
      <div
        aria-label={`Revisión de pieza ${piece.position}`}
        aria-modal="true"
        className="flex h-[100dvh] w-[100dvw] max-w-[100dvw] flex-col overflow-hidden bg-surface outline-none md:grid md:h-[min(760px,calc(100vh-48px))] md:w-[min(1180px,calc(100vw-48px))] md:grid-cols-[minmax(0,1fr)_360px] md:rounded-[12px] md:border md:border-border md:shadow-[0_18px_60px_rgba(25,24,23,0.18)]"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex min-h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between gap-3 border-b border-border bg-surface px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
          <button
            aria-label="Pieza anterior"
            className="inline-flex min-h-11 items-center gap-1 rounded-[8px] border border-border px-2.5 text-sm font-medium text-muted-foreground disabled:opacity-35"
            disabled={!hasPrevious}
            onClick={onPrevious}
            type="button"
          >
            <ChevronLeft className="size-4" strokeWidth={1.8} />
            Anterior
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold text-foreground">
              Pieza {piece.position} · V{selectedVersion.versionNumber}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedVersion.reviewStateLabel}
            </p>
          </div>
          <button
            aria-label="Cerrar revisión"
            className="inline-flex size-11 items-center justify-center rounded-[8px] border border-border text-muted-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto md:contents">
          <section className="relative flex h-[44vh] max-h-[372px] shrink-0 items-center justify-center overflow-hidden bg-[#f1efe9] p-4 md:h-auto md:max-h-none md:min-h-0 md:p-6">
            <button
              aria-label="Cerrar modal"
              className="absolute right-3 top-3 hidden size-8 items-center justify-center rounded-[8px] border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground md:inline-flex"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" strokeWidth={1.8} />
            </button>

            <button
              aria-label="Pieza anterior"
              className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-[8px] border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35 md:inline-flex"
              disabled={!hasPrevious}
              onClick={onPrevious}
              type="button"
            >
              <ChevronLeft className="size-5" strokeWidth={1.8} />
            </button>

            <button
              aria-label="Pieza siguiente"
              className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-[8px] border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35 md:inline-flex"
              disabled={!hasNext}
              onClick={onNext}
              type="button"
            >
              <ChevronRight className="size-5" strokeWidth={1.8} />
            </button>

            <div className="flex h-full w-full items-center justify-center md:h-full md:max-h-none">
              <PiecePreview
                aspect={piece.aspect}
                imageSrc={selectedVersion.imageSrc}
                label={`Pieza ${piece.position} V${selectedVersion.versionNumber}`}
                mode="modal"
              />
            </div>
          </section>

          <div className="md:hidden">
            <PieceReviewPanel
              draft={draft}
              isFeedbackSubmitting={isFeedbackSubmitting}
              isLatestVersion={isLatestVersion}
              isMobileLayout
              isReadOnly={isReadOnly}
              isReviewSaving={isReviewSaving}
              onDraftChange={onDraftChange}
              onFeedbackSubmit={onFeedbackSubmit}
              onReviewStateChange={onReviewStateChange}
              onVersionFileCancel={onVersionFileCancel}
              onVersionFileSelect={onVersionFileSelect}
              onVersionSelect={onVersionSelect}
              onVersionUpload={onVersionUpload}
              piece={piece}
              reviewState={reviewState}
              selectedVersion={selectedVersion}
              versionUpload={versionUpload}
            />
          </div>
        </div>

        <div className="hidden min-h-0 md:block">
          <PieceReviewPanel
            draft={draft}
            isFeedbackSubmitting={isFeedbackSubmitting}
            isLatestVersion={isLatestVersion}
            isReadOnly={isReadOnly}
            isReviewSaving={isReviewSaving}
            onDraftChange={onDraftChange}
            onFeedbackSubmit={onFeedbackSubmit}
            onReviewStateChange={onReviewStateChange}
            onVersionFileCancel={onVersionFileCancel}
            onVersionFileSelect={onVersionFileSelect}
            onVersionSelect={onVersionSelect}
            onVersionUpload={onVersionUpload}
            piece={piece}
            reviewState={reviewState}
            selectedVersion={selectedVersion}
            versionUpload={versionUpload}
          />
        </div>

        <button
          aria-label="Pieza siguiente"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-20 inline-flex min-h-11 items-center gap-1 rounded-[8px] border border-border bg-surface px-3 text-sm font-medium text-muted-foreground shadow-sm disabled:opacity-35 md:hidden"
          disabled={!hasNext}
          onClick={onNext}
          type="button"
        >
          Siguiente
          <ChevronRight className="size-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
