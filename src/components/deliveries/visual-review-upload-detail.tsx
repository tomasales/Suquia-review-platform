"use client";

import { useEffect, useMemo, useState } from "react";

import { PieceReviewExperience } from "@/components/deliveries/piece-review-experience";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import {
  deliveryStatusLabel,
  deliveryStatusTone,
  deliveryTypeLabel,
  formatDeliveryDate,
  formatPieceCount,
  formatReviewSummary,
} from "@/lib/delivery-presentation";
import type { DeliveryDetail } from "@/lib/deliveries";
import {
  getVisualReviewUploadDelivery,
  type VisualReviewUploadDelivery,
} from "@/lib/visual-review-upload-store";

type VisualReviewUploadDetailProps = {
  deliveryId: string;
};

export function VisualReviewUploadDetail({
  deliveryId,
}: VisualReviewUploadDetailProps) {
  const [storedDelivery, setStoredDelivery] = useState<
    VisualReviewUploadDelivery | null | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setStoredDelivery(getVisualReviewUploadDelivery(deliveryId));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deliveryId]);

  const delivery = useMemo(
    () => (storedDelivery ? toDeliveryDetail(storedDelivery) : null),
    [storedDelivery],
  );

  if (storedDelivery === undefined) {
    return (
      <Surface>
        <p className="text-sm text-muted-foreground">Cargando entrega...</p>
      </Surface>
    );
  }

  if (!delivery) {
    return (
      <Surface title="Entrega no disponible">
        <p className="text-sm leading-6 text-muted-foreground">
          Esta entrega de Visual Review vive solo en esta sesión del navegador.
          Volvé a crearla desde Nueva entrega.
        </p>
      </Surface>
    );
  }

  return (
    <>
      <PageHeader
        action={
          <Badge size="lg" tone={delivery.statusTone}>
            {delivery.statusLabel}
          </Badge>
        }
        description={`${delivery.typeLabel} · ${delivery.dateLabel} · ${delivery.authorLabel}`}
        title={delivery.title}
      />

      <section className="mt-4 grid gap-4 xl:mt-6 xl:grid-cols-[minmax(0,1fr)_260px] xl:gap-5">
        <Surface contentClassName="p-0" title="Piezas">
          <PieceReviewExperience
            deliveryStatus={delivery.status}
            isVisualReviewMode
            pieces={delivery.pieces}
          />
        </Surface>

        <aside className="-order-1 space-y-3 xl:order-none">
          <Surface compact title="Resumen">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="min-w-0 text-right font-medium text-foreground">
                  {delivery.typeLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Piezas</dt>
                <dd className="min-w-0 text-right font-medium text-foreground">
                  {delivery.pieceCountLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="min-w-0 text-right font-medium text-foreground">
                  {delivery.dateLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Autor</dt>
                <dd className="min-w-0 text-right font-medium text-foreground">
                  {delivery.authorLabel}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle-foreground">
                Estado de piezas
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {delivery.reviewSummary}
              </p>
            </div>
          </Surface>

          {delivery.generalNote ? (
            <Surface compact title="Nota general">
              <p className="text-sm leading-6 text-muted-foreground">
                {delivery.generalNote}
              </p>
            </Surface>
          ) : null}
        </aside>
      </section>
    </>
  );
}

function toDeliveryDetail(
  delivery: VisualReviewUploadDelivery,
): DeliveryDetail {
  const createdAt = new Date(delivery.createdAt);
  const title = `${deliveryTypeLabel[delivery.type]} · ${formatDeliveryDate(
    createdAt,
  ).replace(" de ", " ")} · ${formatPieceCount(delivery.pieces.length)}`;
  const pieces = delivery.pieces.map((piece) => {
    const version = {
      conversation: [],
      feedback: [],
      fileSizeBytes: piece.fileSizeBytes,
      id: `${piece.id}-version-1`,
      imageSrc: piece.imageSrc,
      mimeType: piece.mimeType,
      originalFilename: piece.originalFilename,
      references: [],
      reviewState: null,
      reviewStateLabel: "Sin revisar",
      reviewStateTone: "neutral" as const,
      uploadedAtLabel: "Ahora",
      uploaderLabel: "Tomi Preview",
      versionNumber: 1,
    };

    return {
      aspect: delivery.type === "STORIES" ? ("story" as const) : ("feed" as const),
      id: piece.id,
      initialNote: piece.note,
      latestVersion: {
        fileSizeBytes: piece.fileSizeBytes,
        id: version.id,
        mimeType: piece.mimeType,
        originalFilename: piece.originalFilename,
        reviewState: null,
        reviewStateLabel: "Sin revisar",
        uploadedAtLabel: "Ahora",
        uploaderLabel: "Tomi Preview",
        versionNumber: 1,
      },
      position: piece.position,
      reviewState: null,
      reviewStateLabel: "Sin revisar",
      reviewStateTone: "neutral" as const,
      versions: [version],
    };
  });

  return {
    authorLabel: "Tomi Preview",
    date: createdAt,
    dateLabel: formatDeliveryDate(createdAt),
    generalNote: delivery.generalNote,
    id: delivery.id,
    pieceCount: delivery.pieces.length,
    pieceCountLabel: formatPieceCount(delivery.pieces.length),
    pieces,
    reviewSummary: formatReviewSummary(pieces),
    status: "SENT_FOR_REVIEW",
    statusLabel: deliveryStatusLabel.SENT_FOR_REVIEW,
    statusTone: deliveryStatusTone.SENT_FOR_REVIEW,
    title,
    type: delivery.type,
    typeLabel: deliveryTypeLabel[delivery.type],
  };
}
