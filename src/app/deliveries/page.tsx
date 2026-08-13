import { DeliveryStatus, DeliveryType } from "@prisma/client";

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

  return (
    <AppShell user={user}>
      <PageHeader
        title="Entregas"
        description="Revisá el estado y la actividad de cada entrega."
        action={<ButtonLink href="/deliveries/new">Subir entrega</ButtonLink>}
      />

      <section className="mt-6">
        <Surface>
          <form
            action="/deliveries"
            className="grid gap-3 border-b border-border pb-4 md:grid-cols-5"
          >
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Tipo</span>
              <select
                className="h-9 w-full rounded-[8px] border border-border bg-background px-2 text-sm text-foreground"
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

            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Estado</span>
              <select
                className="h-9 w-full rounded-[8px] border border-border bg-background px-2 text-sm text-foreground"
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

            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Autor</span>
              <select
                className="h-9 w-full rounded-[8px] border border-border bg-background px-2 text-sm text-foreground"
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

            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Desde</span>
              <input
                className="h-9 w-full rounded-[8px] border border-border bg-background px-2 text-sm text-foreground"
                defaultValue={filters.values.from}
                name="from"
                type="date"
              />
            </label>

            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Hasta</span>
              <input
                className="h-9 w-full rounded-[8px] border border-border bg-background px-2 text-sm text-foreground"
                defaultValue={filters.values.to}
                name="to"
                type="date"
              />
            </label>

            <div className="flex items-end gap-2 md:col-span-5">
              <Button size="sm" type="submit">
                Aplicar filtros
              </Button>
              {filters.isActive ? (
                <ButtonLink href="/deliveries" size="sm" variant="secondary">
                  Limpiar filtros
                </ButtonLink>
              ) : null}
            </div>
          </form>

          <div className="pt-4">
            {deliveries.length > 0 ? (
              <DeliveryTable deliveries={deliveries} />
            ) : filters.isActive ? (
              <div className="py-8 text-center">
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
              <div className="py-8 text-center">
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
