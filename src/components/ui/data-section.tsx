import type { ReactNode } from "react";

type DataSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
};

export function DataSection({
  action,
  children,
  description,
  title,
}: DataSectionProps) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4 border-b border-border pb-2">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
