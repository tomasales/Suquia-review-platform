"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavActive, primaryNav, utilityNav } from "./navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const driveNavItem = utilityNav[0];
  const DriveNavIcon = driveNavItem.icon;

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
          const isActive = isNavActive(pathname, item.href);

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
        <div className="mb-2 rounded-[8px] border border-border bg-background/70 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-warning" />
            <span>Drive pendiente</span>
          </div>
          <Link
            className="mt-2 flex h-8 items-center gap-2 rounded-[7px] text-sm font-medium text-muted-foreground hover:text-foreground"
            href={driveNavItem.href}
          >
            <DriveNavIcon className="size-4" strokeWidth={1.8} />
            <span className="truncate">{driveNavItem.label}</span>
          </Link>
        </div>
        <nav className="space-y-1">
          {utilityNav.slice(1).map((item) => (
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
