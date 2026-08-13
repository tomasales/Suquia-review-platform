"use client";

import { X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastTone = "error" | "info" | "success";

type ToastInput = {
  description?: string;
  title: string;
  tone?: ToastTone;
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses = {
  error: "border-red-200 bg-red-50 text-red-950",
  info: "border-sky-200 bg-sky-50 text-sky-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

function createToastId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId),
    );
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const nextToast: ToastItem = {
      ...toast,
      id: createToastId(),
      tone: toast.tone ?? "info",
    };

    setToasts((currentToasts) => [...currentToasts, nextToast]);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[360px]"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            onDismiss={() => dismissToast(toast.id)}
            toast={toast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

function ToastCard({
  onDismiss,
  toast,
}: {
  onDismiss: () => void;
  toast: ToastItem;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [onDismiss]);

  return (
    <div
      className={`rounded-[var(--radius)] border px-3 py-3 shadow-[0_12px_36px_rgba(25,24,23,0.12)] ${toneClasses[toast.tone]}`}
      role={toast.tone === "error" ? "alert" : "status"}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm leading-5 opacity-80">
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          aria-label="Cerrar notificación"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] opacity-70 transition-opacity hover:opacity-100"
          onClick={onDismiss}
          type="button"
        >
          <X className="size-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
