import type { ReactNode } from "react";

type SurfaceProps = {
  action?: ReactNode;
  children: ReactNode;
  compact?: boolean;
  title?: string;
  description?: string;
};

export function Surface({
  action,
  children,
  compact = false,
  title,
  description,
}: SurfaceProps) {
  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface">
      {title || description ? (
        <div
          className={`flex items-start justify-between gap-4 border-b border-border ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}
        >
          <div>
            {title ? (
              <h2
                className={
                  compact
                    ? "text-sm font-semibold text-foreground"
                    : "text-base font-semibold tracking-tight text-foreground"
                }
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={compact ? "p-3" : "p-4"}>{children}</div>
    </section>
  );
}
