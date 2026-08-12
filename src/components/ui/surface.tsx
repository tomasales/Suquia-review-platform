import type { ReactNode } from "react";

type SurfaceProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export function Surface({ children, title, description }: SurfaceProps) {
  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface">
      {title || description ? (
        <div className="border-b border-border px-4 py-3">
          {title ? (
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
