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
          <tr className="border-b border-border text-xs font-medium text-subtle-foreground">
            <th className="pb-2 pr-4">Entrega</th>
            <th className="pb-2 pr-4">Tipo</th>
            <th className="pb-2 pr-4">Piezas</th>
            <th className="pb-2 pr-4">Estado</th>
            <th className="pb-2 pr-4">Resumen</th>
            <th className="pb-2 pr-4">Fecha</th>
            {showAuthor ? <th className="pb-2">Autor</th> : null}
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
            <tr
              className="border-b border-border last:border-0"
              key={delivery.id}
            >
              <td className="py-3 pr-4">
                <div>
                  <Link
                    className="text-sm font-medium text-foreground hover:underline"
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
              <td className="py-3 pr-4 text-sm text-muted-foreground">
                {delivery.typeLabel}
              </td>
              <td className="py-3 pr-4 text-sm text-muted-foreground">
                {delivery.pieceCountLabel}
              </td>
              <td className="py-3 pr-4">
                <Badge tone={delivery.statusTone}>{delivery.statusLabel}</Badge>
              </td>
              <td className="py-3 pr-4 text-sm text-muted-foreground">
                {delivery.reviewSummary}
              </td>
              <td className="py-3 pr-4 text-sm text-muted-foreground">
                {delivery.dateLabel}
              </td>
              {showAuthor ? (
                <td className="py-3 text-sm text-muted-foreground">
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
