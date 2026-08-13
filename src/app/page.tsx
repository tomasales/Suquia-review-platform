import { Sparkles } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button-link";
import { Surface } from "@/components/ui/surface";
import { DeliveryTable } from "@/components/ui/delivery-table";
import { listDeliveries, reviewQueueStatuses } from "@/lib/deliveries";
import { requireAuthorizedUser } from "@/lib/session";

export default async function Home() {
  const user = await requireAuthorizedUser();
  const [deliveriesForReview, recentDeliveries] = await Promise.all([
    listDeliveries(undefined, { statuses: reviewQueueStatuses, take: 5 }),
    listDeliveries(undefined, { take: 5 }),
  ]);

  return (
    <AppShell user={user}>
      <PageHeader
        title="Dashboard"
        description="Entregas pendientes y actividad reciente."
        action={<ButtonLink href="/deliveries/new">Subir entrega</ButtonLink>}
      />

      <section className="mt-4 grid gap-4 xl:mt-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-5">
        <div className="space-y-4 xl:space-y-5">
          <Surface
            action={
              <ButtonLink href="/deliveries" size="sm" variant="tertiary">
                Ver todas
              </ButtonLink>
            }
            contentClassName="p-0"
            title="Entregas para revisar"
          >
            {deliveriesForReview.length > 0 ? (
              <DeliveryTable
                deliveries={deliveriesForReview}
                edgeToEdge
                variant="compact"
              />
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                No hay entregas pendientes de revisión.
              </p>
            )}
          </Surface>

          <Surface contentClassName="p-0" title="Entregas recientes">
            {recentDeliveries.length > 0 ? (
              <DeliveryTable
                deliveries={recentDeliveries}
                edgeToEdge
                variant="compact"
              />
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                Las entregas que se envíen van a aparecer acá.
              </p>
            )}
          </Surface>
        </div>

        <aside className="order-last">
          <Surface compact title="Aprendizajes">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-[7px] border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700">
                <Sparkles className="size-3" strokeWidth={1.8} />
                <span>Generado por IA</span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Los aprendizajes aparecerán a medida que se procese feedback.
              </p>
            </div>
          </Surface>
        </aside>
      </section>
    </AppShell>
  );
}
