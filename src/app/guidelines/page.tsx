import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { BrandManualPanel } from "@/components/guidelines/brand-manual-panel";
import { getActiveBrandManual } from "@/lib/guidelines";
import { requireAuthorizedUser } from "@/lib/session";

export default async function GuidelinesPage() {
  const user = await requireAuthorizedUser();
  const manual = await getActiveBrandManual();

  return (
    <AppShell user={user}>
      <PageHeader title="Guidelines" />

      <section className="mt-5 max-w-3xl">
        <BrandManualPanel initialManual={manual} />
      </section>
    </AppShell>
  );
}
