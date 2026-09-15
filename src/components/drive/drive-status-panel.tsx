"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDriveRuntime } from "@/components/drive/drive-runtime";
import {
  getDriveBackupSummary,
  getDriveStatusLabel,
  getDriveStatusTone,
} from "@/lib/drive/status-format";

const toneClasses = {
  checking: "bg-info",
  problem: "bg-warning",
  success: "bg-success",
  unknown: "bg-muted-foreground",
};

export function DriveStatusPanel() {
  const drive = useDriveRuntime();

  if (!drive.isEnabled) {
    return null;
  }

  const statusLabel = getDriveStatusLabel({
    isChecking: drive.isChecking,
    status: drive.drive.status,
  });
  const summary = getDriveBackupSummary({
    counts: drive.backups,
    status: drive.drive.status,
  });
  const tone = getDriveStatusTone(drive.isChecking ? "CHECKING" : drive.drive.status);
  const hasFailedBackups = drive.backups.failed > 0;

  return (
    <div
      aria-live="polite"
      className="rounded-[8px] border border-border bg-background/70 px-3 py-2.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <span
              className={`size-1.5 shrink-0 rounded-full ${toneClasses[tone]}`}
            />
            <span className="truncate">{statusLabel}</span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {summary}
          </p>
        </div>

        {hasFailedBackups ? (
          <Button
            className="h-7 shrink-0 px-2 text-xs"
            disabled={drive.isProcessing}
            onClick={() => void drive.retryFailed()}
            variant="tertiary"
          >
            {drive.isProcessing ? "Reintentando..." : "Reintentar backup"}
          </Button>
        ) : (
          <Button
            aria-label="Verificar Drive"
            className="h-7 shrink-0 gap-1.5 px-2 text-xs"
            disabled={drive.isChecking}
            onClick={() => void drive.checkNow()}
            variant="tertiary"
          >
            <RefreshCw
              className={`size-3.5 ${drive.isChecking ? "animate-spin" : ""}`}
              strokeWidth={1.8}
            />
            <span>{drive.isChecking ? "Verificando..." : "Verificar"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
