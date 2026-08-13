"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useToast } from "@/components/ui/toast";
import {
  type DriveStatusResponse,
  visualReviewDriveStatus,
} from "@/lib/drive/status-format";

type DriveRuntimeOptions = {
  processPending?: boolean;
  silent?: boolean;
};

type DriveRuntimeContextValue = DriveStatusResponse & {
  checkNow: (options?: DriveRuntimeOptions) => Promise<void>;
  isChecking: boolean;
  isProcessing: boolean;
  notifyBackupPending: () => Promise<void>;
  refreshStatus: () => Promise<DriveStatusResponse | null>;
  retryFailed: () => Promise<void>;
};

const HEALTH_INTERVAL_MS = 3 * 60 * 1000;
const HEALTH_STALE_MS = 3 * 60 * 1000;
const PROCESS_PENDING_COOLDOWN_MS = 25 * 1000;

const unknownDriveStatus: DriveStatusResponse = {
  backups: {
    failed: 0,
    pending: 0,
    syncing: 0,
  },
  drive: {
    lastCheckedAt: null,
    lastErrorCode: null,
    lastSuccessAt: null,
    status: "UNKNOWN",
  },
};

const DriveRuntimeContext = createContext<DriveRuntimeContextValue | null>(null);

export function DriveRuntimeProvider({
  children,
  visualReviewMode,
}: {
  children: ReactNode;
  visualReviewMode: boolean;
}) {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [status, setStatus] = useState<DriveStatusResponse>(
    visualReviewMode ? visualReviewDriveStatus : unknownDriveStatus,
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const checkingRef = useRef(false);
  const processingRef = useRef(false);
  const lastHealthAttemptAtRef = useRef(0);
  const lastProcessPendingAtRef = useRef(0);

  const refreshStatus = useCallback(async () => {
    if (visualReviewMode) {
      setStatus(visualReviewDriveStatus);
      return visualReviewDriveStatus;
    }

    try {
      const response = await fetch("/api/drive/status", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Drive status failed");
      }

      const payload = (await response.json()) as DriveStatusResponse;
      setStatus(payload);

      return payload;
    } catch {
      setStatus(unknownDriveStatus);
      return null;
    }
  }, [visualReviewMode]);

  const processPending = useCallback(async () => {
    if (visualReviewMode || processingRef.current) {
      return;
    }

    const now = Date.now();

    if (now - lastProcessPendingAtRef.current < PROCESS_PENDING_COOLDOWN_MS) {
      return;
    }

    processingRef.current = true;
    lastProcessPendingAtRef.current = now;
    setIsProcessing(true);

    try {
      await fetch("/api/drive/process-pending", {
        method: "POST",
      });
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      await refreshStatus();
    }
  }, [refreshStatus, visualReviewMode]);

  const checkNow = useCallback(
    async (options: DriveRuntimeOptions = {}) => {
      if (visualReviewMode || checkingRef.current) {
        return;
      }

      checkingRef.current = true;
      lastHealthAttemptAtRef.current = Date.now();
      setIsChecking(true);

      try {
        const response = await fetch("/api/drive/health", {
          cache: "no-store",
        });

        const nextStatus = await refreshStatus();

        if (
          response.ok &&
          options.processPending !== false &&
          (nextStatus?.backups.pending ?? 0) > 0
        ) {
          await processPending();
        }
      } catch {
        await refreshStatus();
      } finally {
        checkingRef.current = false;
        setIsChecking(false);
      }
    },
    [processPending, refreshStatus, visualReviewMode],
  );

  const retryFailed = useCallback(async () => {
    if (visualReviewMode || processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    try {
      const response = await fetch("/api/drive/retry-failed", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        processed?: boolean;
        result?: { status?: string };
      } | null;

      await refreshStatus();

      if (response.ok && payload?.processed && payload.result?.status === "SYNCED") {
        showToast({
          title: "Backup sincronizado",
          description: "La entrega ya está respaldada en Drive.",
          tone: "success",
        });
        return;
      }

      showToast({
        title: "No pudimos sincronizar con Drive",
        description:
          "La entrega sigue guardada en la plataforma. Podés reintentar más tarde.",
        tone: "error",
      });
    } catch {
      await refreshStatus();
      showToast({
        title: "No pudimos sincronizar con Drive",
        description:
          "La entrega sigue guardada en la plataforma. Podés reintentar más tarde.",
        tone: "error",
      });
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [refreshStatus, showToast, visualReviewMode]);

  const notifyBackupPending = useCallback(async () => {
    if (visualReviewMode) {
      return;
    }

    const nextStatus = await refreshStatus();

    if (
      nextStatus?.drive.status === "CONNECTED" &&
      nextStatus.backups.pending > 0
    ) {
      await processPending();
    }
  }, [processPending, refreshStatus, visualReviewMode]);

  useEffect(() => {
    if (visualReviewMode) {
      return;
    }

    let cancelled = false;

    async function initializeDriveRuntime() {
      const initialStatus = await refreshStatus();

      if (cancelled) {
        return;
      }

      await checkNow({
        processPending: (initialStatus?.backups.pending ?? 0) > 0,
      });
    }

    void initializeDriveRuntime();

    return () => {
      cancelled = true;
    };
  }, [checkNow, refreshStatus, visualReviewMode]);

  useEffect(() => {
    if (visualReviewMode) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkNow();
      }
    }, HEALTH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [checkNow, visualReviewMode]);

  useEffect(() => {
    if (visualReviewMode) {
      return;
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastHealthAttemptAtRef.current > HEALTH_STALE_MS
      ) {
        void checkNow();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [checkNow, visualReviewMode]);

  useEffect(() => {
    if (visualReviewMode) {
      return;
    }

    let cancelled = false;

    async function refreshAfterNavigation() {
      const nextStatus = await refreshStatus();

      if (!cancelled && (nextStatus?.backups.pending ?? 0) > 0) {
        await processPending();
      }
    }

    void refreshAfterNavigation();

    return () => {
      cancelled = true;
    };
  }, [pathname, processPending, refreshStatus, visualReviewMode]);

  const value = useMemo(
    () => ({
      ...status,
      checkNow,
      isChecking,
      isProcessing,
      notifyBackupPending,
      refreshStatus,
      retryFailed,
    }),
    [
      checkNow,
      isChecking,
      isProcessing,
      notifyBackupPending,
      refreshStatus,
      retryFailed,
      status,
    ],
  );

  return (
    <DriveRuntimeContext.Provider value={value}>
      {children}
    </DriveRuntimeContext.Provider>
  );
}

export function useDriveRuntime() {
  const context = useContext(DriveRuntimeContext);

  if (!context) {
    throw new Error("useDriveRuntime must be used within DriveRuntimeProvider");
  }

  return context;
}
