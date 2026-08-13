import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { getDeliveryById } from "@/lib/deliveries";
import { requireAuthorizedUser } from "@/lib/session";

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
      <PageHeader
        title={delivery.title}
        description={`${delivery.typeLabel} · ${delivery.dateLabel} · ${delivery.authorLabel}`}
        action={<Badge tone={delivery.statusTone}>{delivery.statusLabel}</Badge>}
      />

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Surface title="Piezas">
          {delivery.pieces.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-subtle-foreground">
                    <th className="pb-2 pr-4">Orden</th>
                    <th className="pb-2 pr-4">Pieza</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2 pr-4">Versión</th>
                    <th className="pb-2">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {delivery.pieces.map((piece) => (
                    <tr
                      className="border-b border-border last:border-0"
                      key={piece.id}
                    >
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {piece.position}
                      </td>
                      <td className="py-3 pr-4 text-sm font-medium text-foreground">
                        Pieza {piece.position}
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {piece.reviewStateLabel}
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {piece.latestVersion
                          ? `V${piece.latestVersion.versionNumber} · ${piece.latestVersion.originalFilename}`
                          : "Sin versiones"}
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">
                        {piece.initialNote ?? "Sin nota"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta entrega no tiene piezas registradas.
            </p>
          )}
        </Surface>

        <aside className="space-y-4">
          <Surface title="Resumen">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="font-medium text-foreground">
                  {delivery.typeLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Piezas</dt>
                <dd className="font-medium text-foreground">
                  {delivery.pieceCountLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="font-medium text-foreground">
                  {delivery.dateLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Autor</dt>
                <dd className="font-medium text-foreground">
                  {delivery.authorLabel}
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
              {delivery.reviewSummary}
            </p>
          </Surface>

          {delivery.generalNote ? (
            <Surface title="Nota general">
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
