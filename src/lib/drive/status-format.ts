import type { DriveSyncStatus } from "@prisma/client";

export type DriveConnectionStatus = DriveSyncStatus | "UNKNOWN";

export type DriveBackupCounts = {
  failed: number;
  pending: number;
  syncing: number;
};

export type DriveStatusResponse = {
  backups: DriveBackupCounts;
  drive: {
    lastCheckedAt: string | null;
    lastErrorCode: string | null;
    lastSuccessAt: string | null;
    status: DriveConnectionStatus;
  };
};

export const visualReviewDriveStatus: DriveStatusResponse = {
  backups: {
    failed: 0,
    pending: 1,
    syncing: 0,
  },
  drive: {
    lastCheckedAt: "2026-08-13T12:00:00.000Z",
    lastErrorCode: null,
    lastSuccessAt: "2026-08-13T12:00:00.000Z",
    status: "CONNECTED",
  },
};

export function buildDriveStatusResponse({
  counts,
  state,
}: {
  counts: DriveBackupCounts;
  state: {
    lastCheckedAt: Date | null;
    lastErrorCode: string | null;
    lastSuccessAt: Date | null;
    status: DriveSyncStatus;
  } | null;
}): DriveStatusResponse {
  return {
    backups: counts,
    drive: {
      lastCheckedAt: state?.lastCheckedAt?.toISOString() ?? null,
      lastErrorCode: state?.lastErrorCode ?? null,
      lastSuccessAt: state?.lastSuccessAt?.toISOString() ?? null,
      status: state?.status ?? "UNKNOWN",
    },
  };
}

export function getDriveStatusLabel({
  isChecking,
  status,
}: {
  isChecking?: boolean;
  status: DriveConnectionStatus;
}) {
  if (isChecking || status === "CHECKING") {
    return "Verificando Drive...";
  }

  if (status === "CONNECTED") {
    return "Drive conectado";
  }

  if (status === "PROBLEM") {
    return "Problemas con Drive";
  }

  return "Drive sin verificar";
}

export function getDriveBackupSummary({
  counts,
  status,
}: {
  counts: DriveBackupCounts;
  status: DriveConnectionStatus;
}) {
  if (counts.failed > 0) {
    return `${counts.failed} ${counts.failed === 1 ? "backup con error" : "backups con error"}`;
  }

  if (counts.syncing > 0) {
    return "Sincronizando backup...";
  }

  if (counts.pending > 0) {
    return `${counts.pending} ${counts.pending === 1 ? "backup pendiente" : "backups pendientes"}`;
  }

  if (status === "CONNECTED") {
    return "Todo sincronizado";
  }

  return "Sin backups pendientes";
}

export function getDriveStatusTone(status: DriveConnectionStatus) {
  if (status === "CONNECTED") {
    return "success";
  }

  if (status === "PROBLEM") {
    return "problem";
  }

  if (status === "CHECKING") {
    return "checking";
  }

  return "unknown";
}
