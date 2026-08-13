import { DeliveryStatus, DeliveryType } from "@prisma/client";
import { SlidersHorizontal } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { DeliveryTable } from "@/components/ui/delivery-table";
import { Surface } from "@/components/ui/surface";
import {
  listDeliveries,
  listDeliveryAuthors,
  parseDeliveryFilters,
  type DeliverySearchParams,
} from "@/lib/deliveries";
import {
  deliveryStatusLabel,
  deliveryTypeLabel,
} from "@/lib/delivery-presentation";
import { requireAuthorizedUser } from "@/lib/session";

type DeliveriesPageProps = {
  searchParams?: Promise<DeliverySearchParams>;
};

export default async function DeliveriesPage({
  searchParams,
}: DeliveriesPageProps) {
  const user = await requireAuthorizedUser();
  const params = searchParams ? await searchParams : {};
  const filters = parseDeliveryFilters(params);
  const [deliveries, authors] = await Promise.all([
    listDeliveries(filters),
    listDeliveryAuthors(),
  ]);
  const renderFilterControls = () => (
    <>
      <label className="space-y-1 text-[11px] font-medium text-muted-foreground">
        <span>Tipo</span>
        <select
          className="h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground md:h-8"
          defaultValue={filters.values.type}
          name="type"
        >
          <option value="">Todas</option>
          {Object.values(DeliveryType).map((type) => (
            <option key={type} value={type}>
              {deliveryTypeLabel[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-[11px] font-medium text-muted-foreground">
        <span>Estado</span>
        <select
          className="h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground md:h-8"
          defaultValue={filters.values.status}
          name="status"
        >
          <option value="">Todos</option>
          {Object.values(DeliveryStatus).map((status) => (
            <option key={status} value={status}>
              {deliveryStatusLabel[status]}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-[11px] font-medium text-muted-foreground">
        <span>Autor</span>
        <select
          className="h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground md:h-8"
          defaultValue={filters.values.author}
          name="author"
        >
          <option value="">Todos</option>
          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.name ?? author.email}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-[11px] font-medium text-muted-foreground">
        <span>Desde</span>
        <input
          className="h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground md:h-8"
          defaultValue={filters.values.from}
          name="from"
          type="date"
        />
      </label>

      <label className="space-y-1 text-[11px] font-medium text-muted-foreground">
        <span>Hasta</span>
        <input
          className="h-9 w-full rounded-[8px] border border-border bg-surface px-2 text-sm text-foreground md:h-8"
          defaultValue={filters.values.to}
          name="to"
          type="date"
        />
      </label>
    </>
  );

  return (
    <AppShell user={user}>
      <PageHeader
        title="Entregas"
        description="Revisá el estado y la actividad de cada entrega."
        action={<ButtonLink href="/deliveries/new">Subir entrega</ButtonLink>}
      />

      <section className="mt-5">
        <Surface contentClassName="p-0">
          <form
            action="/deliveries"
            className="hidden items-end gap-2 border-b border-border p-4 md:grid md:grid-cols-[minmax(120px,0.9fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_auto]"
          >
            {renderFilterControls()}

            <div className="flex gap-2">
              <Button size="sm" type="submit" variant="secondary">
                Aplicar
              </Button>
              {filters.isActive ? (
                <ButtonLink href="/deliveries" size="sm" variant="secondary">
                  Limpiar
                </ButtonLink>
              ) : null}
            </div>
          </form>

          <details className="border-b border-border md:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="size-4" strokeWidth={1.8} />
                Filtros
              </span>
              {filters.isActive ? (
                <span className="rounded-[6px] border border-border bg-surface-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  Activos
                </span>
              ) : null}
            </summary>

            <form action="/deliveries" className="space-y-3 px-4 pb-4">
              {renderFilterControls()}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button size="md" type="submit" variant="secondary">
                  Aplicar
                </Button>
                {filters.isActive ? (
                  <ButtonLink href="/deliveries" size="md" variant="secondary">
                    Limpiar
                  </ButtonLink>
                ) : null}
              </div>
            </form>
          </details>

          <div>
            {deliveries.length > 0 ? (
              <DeliveryTable deliveries={deliveries} edgeToEdge />
            ) : filters.isActive ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  No encontramos entregas con estos filtros.
                </p>
                <div className="mt-4">
                  <ButtonLink href="/deliveries" size="sm" variant="secondary">
                    Limpiar filtros
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  Todavía no hay entregas
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Las entregas que se envíen para revisión van a aparecer acá.
                </p>
                <div className="mt-4">
                  <ButtonLink href="/deliveries/new" size="sm">
                    Subir entrega
                  </ButtonLink>
                </div>
              </div>
            )}
          </div>
        </Surface>
      </section>
    </AppShell>
  );
}
