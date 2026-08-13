"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { SignOutButton } from "@/components/auth/sign-out-button";

import { isNavActive, primaryNav, utilityNav } from "./navigation";

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
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const DriveIcon = utilityNav[0].icon;

  useEffect(() => {
    document.body.style.overflow = isMenuOpen || isUserMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen, isUserMenuOpen]);

  const menuOverlay =
    isMenuOpen
      ? createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Cerrar navegación"
            className="absolute inset-0 bg-black/24"
            onClick={() => setIsMenuOpen(false)}
            type="button"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col border-r border-border bg-surface shadow-[0_18px_60px_rgba(25,24,23,0.16)]">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 pb-3 pt-[calc(0.875rem+env(safe-area-inset-top))]">
              <div>
                <p className="text-base font-semibold tracking-tight text-foreground">
                  SUQUIA
                </p>
                <p className="text-xs text-muted-foreground">
                  Review Platform
                </p>
              </div>
              <button
                aria-label="Cerrar navegación"
                className="inline-flex size-9 items-center justify-center rounded-[8px] border border-border text-muted-foreground"
                onClick={() => setIsMenuOpen(false)}
                type="button"
              >
                <X className="size-4" strokeWidth={1.8} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {primaryNav.map((item) => {
                const isActive = isNavActive(pathname, item.href);

                return (
                  <Link
                    className={
                      isActive
                        ? "relative flex h-11 items-center gap-3 rounded-[8px] bg-surface-muted px-3 text-sm font-medium text-foreground before:absolute before:left-0 before:top-2.5 before:h-6 before:w-0.5 before:rounded-full before:bg-foreground"
                        : "flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-medium text-muted-foreground"
                    }
                    href={item.href}
                    key={item.label}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="size-4" strokeWidth={1.8} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              <div className="mb-2 rounded-[8px] border border-border bg-background/70 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-warning" />
                  <span>Drive pendiente</span>
                </div>
                <Link
                  className="mt-2 flex h-10 items-center gap-2 rounded-[7px] text-sm font-medium text-muted-foreground"
                  href={utilityNav[0].href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <DriveIcon className="size-4" strokeWidth={1.8} />
                  <span className="truncate">{utilityNav[0].label}</span>
                </Link>
              </div>

              <nav className="space-y-1">
                {utilityNav.slice(1).map((item) => (
                  <Link
                    className="flex h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-medium text-muted-foreground"
                    href={item.href}
                    key={item.label}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="size-4" strokeWidth={1.8} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="mt-3 border-t border-border pt-3">
                <div className="mb-3 text-sm">
                  <p className="font-medium text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <SignOutButton />
              </div>
            </div>
          </aside>
        </div>,
        document.body,
      )
      : null;

  const userMenuOverlay =
    isUserMenuOpen
      ? createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Cerrar menú de usuario"
            className="absolute inset-0 bg-black/24"
            onClick={() => setIsUserMenuOpen(false)}
            type="button"
          />
          <section className="absolute inset-x-3 top-[calc(4rem+env(safe-area-inset-top))] rounded-[var(--radius)] border border-border bg-surface p-3 shadow-[0_18px_60px_rgba(25,24,23,0.16)]">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <button
                aria-label="Cerrar menú de usuario"
                className="inline-flex size-9 items-center justify-center rounded-[8px] border border-border text-muted-foreground"
                onClick={() => setIsUserMenuOpen(false)}
                type="button"
              >
                <X className="size-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="pt-3">
              <SignOutButton />
            </div>
          </section>
        </div>,
        document.body,
      )
      : null;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            aria-label="Abrir navegación"
            className="inline-flex size-9 items-center justify-center rounded-[8px] border border-border text-muted-foreground lg:hidden"
            onClick={() => {
              setIsUserMenuOpen(false);
              setIsMenuOpen(true);
            }}
            type="button"
          >
            <Menu className="size-4" />
          </button>

          <div className="lg:hidden">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              SUQUIA
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <button
              aria-label="Abrir menú de usuario"
              aria-expanded={isUserMenuOpen}
              className="inline-flex size-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-foreground/20"
              onClick={() => {
                setIsMenuOpen(false);
                setIsUserMenuOpen((current) => !current);
              }}
              type="button"
            >
              {user.image ? (
                <Image
                  alt=""
                  className="size-9 rounded-full border border-border"
                  height={36}
                  src={user.image}
                  width={36}
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full border border-border bg-surface-muted text-xs font-semibold text-foreground">
                  {getInitials(user)}
                </span>
              )}
            </button>
            <div className="hidden sm:block">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>
      {menuOverlay}
      {userMenuOverlay}
    </>
  );
}
