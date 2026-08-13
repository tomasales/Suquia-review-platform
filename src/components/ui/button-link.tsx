import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "tertiary" | "danger";
};

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-foreground/90",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-surface-muted",
  tertiary: "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
  danger: "bg-destructive text-white hover:bg-destructive/90",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
};

export function ButtonLink({
  children,
  className = "",
  href,
  size = "md",
  variant = "primary",
}: ButtonLinkProps) {
  return (
    <Link
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-[8px] font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}
