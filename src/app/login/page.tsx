import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SignInButton } from "@/components/auth/sign-in-button";
import { Surface } from "@/components/ui/surface";
import { getAuthorizedUser } from "@/lib/session";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const authorization = await getAuthorizedUser();

  if (authorization.status === "authorized") {
    redirect("/");
  }

  const { error } = await searchParams;
  const isAccessDenied =
    error === "AccessDenied" || authorization.status === "unauthorized";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-[380px]">
        <div className="mb-5">
          <p className="text-xl font-semibold tracking-tight">SUQUIA</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Review Platform
          </p>
        </div>

        <Surface title="Ingresar">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Accedé con tu cuenta autorizada.
            </p>

            {isAccessDenied ? (
              <div className="rounded-[8px] border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  Esta cuenta no tiene acceso a SUQUIA Review Platform.
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Probá con otra cuenta de Google o contactá al responsable del
                  sistema.
                </p>
              </div>
            ) : null}

            {authorization.status === "unauthorized" ? (
              <SignOutButton />
            ) : (
              <SignInButton />
            )}

            <p className="text-xs text-subtle-foreground">
              Esta plataforma es de uso interno.
            </p>
          </div>
        </Surface>
      </div>
    </main>
  );
}
