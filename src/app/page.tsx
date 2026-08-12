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

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        <AppHeader />
        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <PageHeader
            eyebrow="Bootstrap técnico"
            title="Dashboard"
            description="Shell visual inicial para validar densidad, jerarquía y dirección editorial. Los datos son mock temporales."
            action={<Button>Subir entrega</Button>}
          />

          <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_336px]">
            <div className="space-y-4">
              <Surface
                title="Entregas para revisar"
                description="Listado operativo compacto, todavía sin datos reales."
              >
                <DeliveryTable deliveries={deliveriesForReview} />
              </Surface>

              <Surface
                title="Entregas recientes"
                description="Actividad reciente para validar tablas y badges."
              >
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
                      Indicador visual estático para el bootstrap.
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
