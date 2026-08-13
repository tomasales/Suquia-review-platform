import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

type AppShellProps = {
  children: ReactNode;
  user: {
    email: string;
    image: string | null;
    name: string | null;
  };
};

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        <AppHeader user={user} />
        <main className="px-3 py-4 sm:px-6 lg:px-8 lg:py-5">{children}</main>
      </div>
    </div>
  );
}
