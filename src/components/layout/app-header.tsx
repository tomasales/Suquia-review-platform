import { Bell, Menu, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function AppHeader() {
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
            <span className="text-sm">Buscar entregas, feedback o notas</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge tone="success">Drive conectado</Badge>
          <button
            aria-label="Notificaciones"
            className="hidden size-9 items-center justify-center rounded-[8px] border border-border text-muted-foreground sm:inline-flex"
            type="button"
          >
            <Bell className="size-4" />
          </button>
          <div className="flex size-9 items-center justify-center rounded-full border border-border bg-surface-muted text-xs font-semibold text-foreground">
            TS
          </div>
        </div>
      </div>
    </header>
  );
}
