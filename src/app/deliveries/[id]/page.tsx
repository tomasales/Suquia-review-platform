import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeliveryCreatedToast } from "@/components/deliveries/delivery-created-toast";
import { PieceReviewExperience } from "@/components/deliveries/piece-review-experience";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { getDeliveryById } from "@/lib/deliveries";
import { requireAuthorizedUser } from "@/lib/session";
import { isVisualReviewMode } from "@/lib/visual-review";

type DeliveryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DeliveryDetailPage({
  params,
}: DeliveryDetailPageProps) {
  const user = await requireAuthorizedUser();
  const { id } = await params;
  const delivery = await getDeliveryById(id);

  if (!delivery) {
    notFound();
  }

  return (
    <AppShell user={user}>
      <Suspense fallback={null}>
        <DeliveryCreatedToast />
      </Suspense>

      <PageHeader
        title={delivery.title}
        description={`${delivery.typeLabel} · ${delivery.dateLabel} · ${delivery.authorLabel}`}
        action={<Badge tone={delivery.statusTone}>{delivery.statusLabel}</Badge>}
      />

      <section className="mt-4 grid gap-4 xl:mt-6 xl:grid-cols-[minmax(0,1fr)_260px] xl:gap-5">
        <Surface contentClassName="p-0" title="Piezas">
          <Suspense
            fallback={
              <p className="p-4 text-sm text-muted-foreground">
                Cargando piezas...
              </p>
            }
          >
            <PieceReviewExperience
              isVisualReviewMode={isVisualReviewMode()}
              pieces={delivery.pieces}
            />
          </Suspense>
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
    </AppShell>
  );
}
