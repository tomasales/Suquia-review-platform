import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Surface } from "@/components/ui/surface";
import { requireAuthorizedUser } from "@/lib/session";

export default async function NewDeliveryPage() {
  const user = await requireAuthorizedUser();

  return (
    <AppShell user={user}>
      <PageHeader
        title="Subir entrega"
        description="Prepará una entrega de Stories o Feed para revisión."
        action={
          <ButtonLink href="/deliveries" variant="secondary">
            Volver a entregas
          </ButtonLink>
        }
      />

      <section className="mt-6 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Surface title="Tipo de entrega">
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-[8px] border border-border bg-background px-3 py-3 text-sm font-medium text-foreground">
              <input defaultChecked name="type" type="radio" value="STORIES" />
              Stories
            </label>
            <label className="flex items-center gap-3 rounded-[8px] border border-border bg-background px-3 py-3 text-sm font-medium text-foreground">
              <input name="type" type="radio" value="FEED" />
              Feed
            </label>
          </div>
        </Surface>

        <Surface title="Piezas">
          <div className="flex min-h-[260px] items-center justify-center rounded-[8px] border border-dashed border-border bg-background px-4 text-center">
            <div>
              <p className="text-sm font-medium text-foreground">
                Seleccioná las piezas que querés enviar.
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                El orden, las notas y el envío se completan en el flujo de carga.
              </p>
              <Button className="mt-4" disabled variant="secondary">
                Seleccionar piezas
              </Button>
            </div>
          </div>
        </Surface>
      </section>
    </AppShell>
  );
}
