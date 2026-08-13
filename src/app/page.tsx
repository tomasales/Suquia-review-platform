import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
        <div className="space-y-4">
          <Surface title="Entregas para revisar">
            {deliveriesForReview.length > 0 ? (
              <DeliveryTable deliveries={deliveriesForReview} variant="compact" />
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay entregas pendientes de revisión.
              </p>
            )}
          </Surface>

          <Surface title="Entregas recientes">
            {recentDeliveries.length > 0 ? (
              <DeliveryTable deliveries={recentDeliveries} variant="compact" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Las entregas que se envíen van a aparecer acá.
              </p>
            )}
          </Surface>
        </div>

        <aside className="space-y-4">
          <Surface title="Drive">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drive pendiente de configurar
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  El backup se activará cuando se integre Drive.
                </p>
              </div>
              <Badge tone="warning">Pendiente</Badge>
            </div>
          </Surface>

          <Surface title="Journal reciente">
            <p className="text-sm text-muted-foreground">
              Sin actividad registrada todavía.
            </p>
          </Surface>

          <Surface title="Aprendizajes">
            <p className="text-sm text-muted-foreground">
              Los aprendizajes aparecerán a medida que se procese feedback.
            </p>
          </Surface>
        </aside>
      </section>
    </AppShell>
  );
}
