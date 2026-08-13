import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { DeliveryListItem } from "@/lib/deliveries";

type DeliveryTableProps = {
  deliveries: DeliveryListItem[];
  edgeToEdge?: boolean;
  variant?: "compact" | "full";
};

export function DeliveryTable({
  deliveries,
  edgeToEdge = false,
  variant = "full",
}: DeliveryTableProps) {
  const showAuthor = variant === "full";
  const cellX = edgeToEdge ? "px-4" : "pr-4";
  const lastCellX = edgeToEdge ? "px-4" : "";

  return (
    <div>
      <div className="divide-y divide-border md:hidden">
        {deliveries.map((delivery) => (
          <Link
            className="block px-4 py-3 transition-colors active:bg-surface-muted/50"
            href={`/deliveries/${delivery.id}`}
            key={delivery.id}
          >
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
              {delivery.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {delivery.typeLabel} · {delivery.dateLabel}
            </p>
            <div className="mt-2">
              <Badge tone={delivery.statusTone}>{delivery.statusLabel}</Badge>
            </div>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              {delivery.reviewSummary}
            </p>
            {showAuthor ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {delivery.authorLabel}
              </p>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-muted/35 text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle-foreground">
              <th className={`py-2 ${cellX}`}>Entrega</th>
              <th className={`py-2 ${cellX}`}>Tipo</th>
              <th className={`py-2 ${cellX}`}>Piezas</th>
              <th className={`py-2 ${cellX}`}>Estado</th>
              <th className={`py-2 ${cellX}`}>Resumen</th>
              <th className={`py-2 ${cellX}`}>Fecha</th>
              {showAuthor ? (
                <th className={`py-2 ${lastCellX}`}>Autor</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr
                className="group cursor-pointer border-b border-border/85 transition-colors last:border-0 hover:bg-surface-muted/45"
                key={delivery.id}
              >
                <td className={`py-2.5 ${cellX}`}>
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
                <td className={`py-2.5 text-sm text-muted-foreground ${cellX}`}>
                  {delivery.typeLabel}
                </td>
                <td className={`py-2.5 text-sm text-muted-foreground ${cellX}`}>
                  {delivery.pieceCountLabel}
                </td>
                <td className={`py-2.5 ${cellX}`}>
                  <Badge tone={delivery.statusTone}>
                    {delivery.statusLabel}
                  </Badge>
                </td>
                <td className={`py-2.5 text-sm text-muted-foreground ${cellX}`}>
                  {delivery.reviewSummary}
                </td>
                <td className={`py-2.5 text-sm text-muted-foreground ${cellX}`}>
                  {delivery.dateLabel}
                </td>
                {showAuthor ? (
                  <td
                    className={`py-2.5 text-sm text-muted-foreground ${lastCellX}`}
                  >
                    {delivery.authorLabel}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
