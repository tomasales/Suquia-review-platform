import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  size?: "sm" | "lg";
  tone?:
    | "closed"
    | "danger"
    | "info"
    | "neutral"
    | "sent"
    | "success"
    | "warning";
};

const tones = {
  closed: "border-stone-300 bg-stone-100 text-stone-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  neutral: "border-border bg-surface-muted text-muted-foreground",
  sent: "border-indigo-200 bg-indigo-50 text-indigo-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
};

const sizes = {
  lg: "min-h-7 rounded-[8px] px-2.5 py-1 text-xs",
  sm: "h-5 rounded-[6px] px-1.5 text-[11px]",
};

export function Badge({ children, size = "sm", tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border font-medium ${sizes[size]} ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
