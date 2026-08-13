import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { DeliveryTable } from "@/components/ui/delivery-table";
import {
  aiLearnings,
  deliveriesForReview,
  journalEvents,
  recentDeliveries,
} from "@/lib/mock-data";
import { requireAuthorizedUser } from "@/lib/session";

export default async function Home() {
  const user = await requireAuthorizedUser();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        <AppHeader user={user} />
        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <PageHeader
            title="Dashboard"
            description="Entregas pendientes y actividad reciente."
            action={<Button>Subir entrega</Button>}
          />

          <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
            <div className="space-y-4">
              <Surface title="Entregas para revisar">
                <DeliveryTable deliveries={deliveriesForReview} />
              </Surface>

              <Surface title="Entregas recientes">
                <DeliveryTable deliveries={recentDeliveries} />
              </Surface>
            </div>

            <aside className="space-y-4">
              <Surface title="Drive">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Drive conectado
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Backup disponible para entregas y versiones.
                    </p>
                  </div>
                  <Badge tone="success">Conectado</Badge>
                </div>
              </Surface>

              <Surface title="Journal reciente">
                <div className="space-y-3">
                  {journalEvents.map((event) => (
                    <div
                      className="border-b border-border pb-3 last:border-0 last:pb-0"
                      key={event.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                          {event.actor}
                        </p>
                        <span className="text-[11px] text-subtle-foreground">
                          {event.time}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.action}
                      </p>
                    </div>
                  ))}
                </div>
              </Surface>

              <Surface title="Aprendizajes">
                <div className="space-y-3">
                  {aiLearnings.map((learning) => (
                    <div
                      className="rounded-[8px] border border-border bg-surface-muted/45 p-3"
                      key={learning.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Badge tone="neutral">{learning.category}</Badge>
                        <span className="text-[11px] text-subtle-foreground">
                          {learning.recurrence}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-foreground">
                        {learning.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </Surface>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
