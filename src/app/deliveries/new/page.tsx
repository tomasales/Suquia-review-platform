import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DeliveryUploadFlow } from "@/components/deliveries/delivery-upload-flow";
import { ButtonLink } from "@/components/ui/button-link";
import { requireAuthorizedUser } from "@/lib/session";
import { isVisualReviewMode } from "@/lib/visual-review";

export default async function NewDeliveryPage() {
  const user = await requireAuthorizedUser();
  const visualReviewMode = isVisualReviewMode();

  return (
    <AppShell user={user}>
      <PageHeader
        title="Nueva entrega"
        description="Elegí el tipo y agregá las piezas que querés revisar."
        action={
          <ButtonLink href="/deliveries" variant="secondary">
            Volver a entregas
          </ButtonLink>
        }
      />

      <DeliveryUploadFlow visualReviewMode={visualReviewMode} />
    </AppShell>
  );
}
