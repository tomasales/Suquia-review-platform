import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  size?: "sm" | "md";
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

export function Button({
  children,
  className = "",
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-[8px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
