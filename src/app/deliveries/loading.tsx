export default function DeliveriesLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:pl-[calc(var(--sidebar-width)+2rem)] lg:pr-8">
      <div className="h-16 border-b border-border" />
      <div className="mt-6 max-w-6xl space-y-4">
        <div className="h-8 w-40 rounded-[8px] bg-surface-muted" />
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <div className="grid gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="h-9 rounded-[8px] bg-surface-muted"
                key={index}
              />
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="h-10 rounded-[8px] bg-surface-muted/70"
                key={index}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
