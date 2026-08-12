import { Badge } from "@/components/ui/badge";
import type { DeliverySummary } from "@/types/domain";

type DeliveryTableProps = {
  deliveries: DeliverySummary[];
};

const statusTone: Record<DeliverySummary["status"], Parameters<typeof Badge>[0]["tone"]> = {
  "Aprobada": "success",
  "Cerrada": "neutral",
  "En revisión": "info",
  "Enviado para revisar": "neutral",
  "Requiere cambios": "warning",
};

export function DeliveryTable({ deliveries }: DeliveryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border text-xs font-medium text-subtle-foreground">
            <th className="pb-2 pr-4">Entrega</th>
            <th className="pb-2 pr-4">Tipo</th>
            <th className="pb-2 pr-4">Piezas</th>
            <th className="pb-2 pr-4">Estado</th>
            <th className="pb-2 pr-4">Resumen</th>
            <th className="pb-2">Última actividad</th>
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
                  <p className="text-sm font-medium text-foreground">
                    {delivery.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {delivery.author} · {delivery.date}
                  </p>
                </div>
              </td>
              <td className="py-3 pr-4 text-sm text-muted-foreground">
                {delivery.type}
              </td>
              <td className="py-3 pr-4 text-sm text-muted-foreground">
                {delivery.pieces}
              </td>
              <td className="py-3 pr-4">
                <Badge tone={statusTone[delivery.status]}>
                  {delivery.status}
                </Badge>
              </td>
              <td className="py-3 pr-4 text-sm text-muted-foreground">
                {delivery.reviewSummary}
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {delivery.lastActivity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
