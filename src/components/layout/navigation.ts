import { ArchiveRestore, BookOpen, Clock3, FileStack, LayoutDashboard, Settings } from "lucide-react";

export const primaryNav = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Entregas", icon: FileStack, href: "/deliveries" },
];

export const futurePrimaryNav = [
  { label: "Guidelines / Knowledge", icon: BookOpen, href: "#" },
  { label: "Journal", icon: Clock3, href: "#" },
];

export const utilityNav: Array<{
  href: string;
  icon: typeof Settings;
  label: string;
}> = [];

export const futureUtilityNav = [
  { label: "Recuperar desde Drive", icon: ArchiveRestore, href: "#" },
  { label: "Configuración", icon: Settings, href: "#" },
];

export function isNavActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : href !== "#" && pathname.startsWith(href);
}
