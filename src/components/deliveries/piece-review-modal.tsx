"use client";

import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
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
  isVisualReviewMode: boolean;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReviewStateChange: (reviewState: ReviewState) => void;
  onVersionSelect: (versionNumber: number) => void;
  piece: Piece;
  reviewState: ReviewState;
  selectedVersion: PieceVersion;
};

export function PieceReviewModal({
  draft,
  hasNext,
  hasPrevious,
  isVisualReviewMode,
  onClose,
  onDraftChange,
  onNext,
  onPrevious,
  onReviewStateChange,
  onVersionSelect,
  piece,
  reviewState,
  selectedVersion,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/28 p-6">
      <div
        aria-label={`Revisión de pieza ${piece.position}`}
        aria-modal="true"
        className="grid h-[min(760px,calc(100vh-48px))] w-[min(1180px,calc(100vw-48px))] grid-cols-[minmax(0,1fr)_360px] overflow-hidden rounded-[12px] border border-border bg-surface shadow-[0_18px_60px_rgba(25,24,23,0.18)] outline-none"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <section className="relative flex min-h-0 items-center justify-center bg-[#f1efe9] p-6">
          <button
            aria-label="Cerrar modal"
            className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-[8px] border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" strokeWidth={1.8} />
          </button>

          <button
            aria-label="Pieza anterior"
            className="absolute left-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-[8px] border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
            disabled={!hasPrevious}
            onClick={onPrevious}
            type="button"
          >
            <ChevronLeft className="size-5" strokeWidth={1.8} />
          </button>

          <button
            aria-label="Pieza siguiente"
            className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-[8px] border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
            disabled={!hasNext}
            onClick={onNext}
            type="button"
          >
            <ChevronRight className="size-5" strokeWidth={1.8} />
          </button>

          <div className="flex h-full w-full items-center justify-center">
            <PiecePreview
              aspect={piece.aspect}
              imageSrc={selectedVersion.imageSrc}
              label={`Pieza ${piece.position} V${selectedVersion.versionNumber}`}
              mode="modal"
            />
          </div>
        </section>

        <PieceReviewPanel
          draft={draft}
          isVisualReviewMode={isVisualReviewMode}
          onDraftChange={onDraftChange}
          onReviewStateChange={onReviewStateChange}
          onVersionSelect={onVersionSelect}
          piece={piece}
          reviewState={reviewState}
          selectedVersion={selectedVersion}
        />
      </div>
    </div>
  );
}
