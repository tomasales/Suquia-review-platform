import {
  ArchiveRestore,
  BookOpen,
  Clock3,
  FileStack,
  LayoutDashboard,
  Settings,
} from "lucide-react";

const primaryNav = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Entregas", icon: FileStack },
  { label: "Guidelines / Knowledge", icon: BookOpen },
  { label: "Journal", icon: Clock3 },
];

const secondaryNav = [
  { label: "Recuperar desde Drive", icon: ArchiveRestore },
  { label: "Configuración", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="hidden fixed inset-y-0 left-0 z-20 w-[var(--sidebar-width)] border-r border-border bg-surface lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-border px-5">
        <div>
          <p className="text-base font-semibold tracking-tight text-foreground">
            SUQUIA
          </p>
          <p className="text-xs text-muted-foreground">Review Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {primaryNav.map((item) => (
          <a
            className={
              item.active
                ? "flex h-9 items-center gap-3 rounded-[8px] bg-primary px-3 text-sm font-medium text-primary-foreground"
                : "flex h-9 items-center gap-3 rounded-[8px] px-3 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            }
            href="#"
            key={item.label}
          >
            <item.icon className="size-4" strokeWidth={1.8} />
            <span className="truncate">{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <div className="mb-3 rounded-[8px] border border-border bg-surface-muted/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <p className="text-xs font-medium text-foreground">
              Drive conectado
            </p>
          </div>
        </div>
        <nav className="space-y-1">
          {secondaryNav.map((item) => (
            <a
              className="flex h-9 items-center gap-3 rounded-[8px] px-3 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              href="#"
              key={item.label}
            >
              <item.icon className="size-4" strokeWidth={1.8} />
              <span className="truncate">{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
