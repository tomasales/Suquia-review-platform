import { Menu, Search } from "lucide-react";
import Image from "next/image";

import { SignOutButton } from "@/components/auth/sign-out-button";

type AppHeaderProps = {
  user: {
    email: string;
    image: string | null;
    name: string | null;
  };
};

function getInitials(user: AppHeaderProps["user"]) {
  const label = user.name ?? user.email;
  const parts = label.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return label.slice(0, 2).toUpperCase();
}

export function AppHeader({ user }: AppHeaderProps) {
  const displayName = user.name ?? user.email;

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          aria-label="Abrir navegación"
          className="inline-flex size-9 items-center justify-center rounded-[8px] border border-border text-muted-foreground lg:hidden"
          type="button"
        >
          <Menu className="size-4" />
        </button>

        <div className="hidden min-w-0 flex-1 items-center sm:flex">
          <div className="flex h-9 w-full max-w-[440px] items-center gap-2 rounded-[8px] border border-border bg-background px-3 text-muted-foreground">
            <Search className="size-4" />
            <span className="text-sm">Búsqueda pendiente de configurar</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          {user.image ? (
            <Image
              alt=""
              className="size-9 rounded-full border border-border"
              height={36}
              src={user.image}
              width={36}
            />
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full border border-border bg-surface-muted text-xs font-semibold text-foreground">
              {getInitials(user)}
            </div>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
