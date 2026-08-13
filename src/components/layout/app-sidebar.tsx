"use client";

import {
  ArchiveRestore,
  BookOpen,
  Clock3,
  FileStack,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryNav = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Entregas", icon: FileStack, href: "/deliveries" },
  { label: "Guidelines / Knowledge", icon: BookOpen, href: "#" },
  { label: "Journal", icon: Clock3, href: "#" },
];

const secondaryNav = [
  { label: "Recuperar desde Drive", icon: ArchiveRestore, href: "#" },
  { label: "Configuración", icon: Settings, href: "#" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden fixed inset-y-0 left-0 z-20 w-[var(--sidebar-width)] border-r border-border bg-surface lg:flex lg:flex-col">
      <div className="flex h-14 items-center border-b border-border px-5">
        <div>
          <p className="text-base font-semibold tracking-tight text-foreground">
            SUQUIA
          </p>
          <p className="text-xs text-muted-foreground">Review Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {primaryNav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href !== "#" && pathname.startsWith(item.href);

          return (
            <Link
              className={
                isActive
                  ? "relative flex h-9 items-center gap-3 rounded-[8px] bg-surface-muted px-3 text-sm font-medium text-foreground before:absolute before:left-0 before:top-2 before:h-5 before:w-0.5 before:rounded-full before:bg-foreground"
                  : "flex h-9 items-center gap-3 rounded-[8px] px-3 text-sm font-medium text-muted-foreground hover:bg-surface-muted/70 hover:text-foreground"
              }
              href={item.href}
              key={item.label}
            >
              <item.icon className="size-4" strokeWidth={1.8} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 flex items-center gap-2 px-3 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-warning" />
          <span>Drive pendiente</span>
        </div>
        <nav className="space-y-1">
          {secondaryNav.map((item) => (
            <Link
              className="flex h-9 items-center gap-3 rounded-[8px] px-3 text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              href={item.href}
              key={item.label}
            >
              <item.icon className="size-4" strokeWidth={1.8} />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
