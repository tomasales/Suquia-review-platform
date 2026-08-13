"use client";

import { Button } from "@/components/ui/button";

type DeliveriesErrorProps = {
  reset: () => void;
};

export default function DeliveriesError({ reset }: DeliveriesErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-5 text-center">
        <p className="text-sm font-medium text-foreground">
          No pudimos cargar las entregas.
        </p>
        <div className="mt-4">
          <Button onClick={reset} size="sm" variant="secondary">
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
