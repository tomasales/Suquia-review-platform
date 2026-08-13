import "server-only";

import { DriveSyncStatus } from "@prisma/client";

import { db } from "@/lib/db";

import { DRIVE_SYNC_STATE_KEY } from "./backup-format";

export async function markDriveChecking() {
  return db.driveSyncState.upsert({
    create: {
      key: DRIVE_SYNC_STATE_KEY,
      lastCheckedAt: new Date(),
      status: DriveSyncStatus.CHECKING,
    },
    update: {
      lastCheckedAt: new Date(),
      status: DriveSyncStatus.CHECKING,
    },
    where: {
      key: DRIVE_SYNC_STATE_KEY,
    },
  });
}

export async function markDriveConnected() {
  const now = new Date();

  return db.driveSyncState.upsert({
    create: {
      key: DRIVE_SYNC_STATE_KEY,
      lastCheckedAt: now,
      lastSuccessAt: now,
      status: DriveSyncStatus.CONNECTED,
    },
    update: {
      lastCheckedAt: now,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastSuccessAt: now,
      status: DriveSyncStatus.CONNECTED,
    },
    where: {
      key: DRIVE_SYNC_STATE_KEY,
    },
  });
}

export async function markDriveProblem({
  errorCode,
  errorMessage,
}: {
  errorCode: string;
  errorMessage: string;
}) {
  return db.driveSyncState.upsert({
    create: {
      key: DRIVE_SYNC_STATE_KEY,
      lastCheckedAt: new Date(),
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      status: DriveSyncStatus.PROBLEM,
    },
    update: {
      lastCheckedAt: new Date(),
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      status: DriveSyncStatus.PROBLEM,
    },
    where: {
      key: DRIVE_SYNC_STATE_KEY,
    },
  });
}
