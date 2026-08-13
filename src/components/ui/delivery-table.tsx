import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { DeliveryListItem } from "@/lib/deliveries";

type DeliveryTableProps = {
  deliveries: DeliveryListItem[];
  variant?: "compact" | "full";
};

export function DeliveryTable({
  deliveries,
  variant = "full",
}: DeliveryTableProps) {
  const showAuthor = variant === "full";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-y border-border bg-surface-muted/35 text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle-foreground">
            <th className="py-2 pr-4">Entrega</th>
            <th className="py-2 pr-4">Tipo</th>
            <th className="py-2 pr-4">Piezas</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4">Resumen</th>
            <th className="py-2 pr-4">Fecha</th>
            {showAuthor ? <th className="py-2">Autor</th> : null}
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
            <tr
              className="group cursor-pointer border-b border-border/85 transition-colors last:border-0 hover:bg-surface-muted/45"
              key={delivery.id}
            >
              <td className="py-2.5 pr-4">
                <div>
                  <Link
                    className="text-sm font-semibold text-foreground group-hover:underline"
                    href={`/deliveries/${delivery.id}`}
                  >
                    {delivery.title}
                  </Link>
                  {!showAuthor ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {delivery.authorLabel}
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="py-2.5 pr-4 text-sm text-muted-foreground">
                {delivery.typeLabel}
              </td>
              <td className="py-2.5 pr-4 text-sm text-muted-foreground">
                {delivery.pieceCountLabel}
              </td>
              <td className="py-2.5 pr-4">
                <Badge tone={delivery.statusTone}>{delivery.statusLabel}</Badge>
              </td>
              <td className="py-2.5 pr-4 text-sm text-muted-foreground">
                {delivery.reviewSummary}
              </td>
              <td className="py-2.5 pr-4 text-sm text-muted-foreground">
                {delivery.dateLabel}
              </td>
              {showAuthor ? (
                <td className="py-2.5 text-sm text-muted-foreground">
                  {delivery.authorLabel}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
