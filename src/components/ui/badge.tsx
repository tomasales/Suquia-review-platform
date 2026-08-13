import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const tones = {
  neutral: "border-border bg-surface-muted/70 text-muted-foreground",
  success: "border-success/20 bg-success/8 text-success",
  warning: "border-warning/20 bg-warning/8 text-warning",
  danger: "border-destructive/20 bg-destructive/8 text-destructive",
  info: "border-info/20 bg-info/8 text-info",
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-5 items-center whitespace-nowrap rounded-[6px] border px-1.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
