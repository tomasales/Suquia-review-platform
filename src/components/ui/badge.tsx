import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

const tones = {
  neutral: "border-border bg-surface-muted text-muted-foreground",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  info: "border-info/20 bg-info/10 text-info",
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-[7px] border px-2 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
