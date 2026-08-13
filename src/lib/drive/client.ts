import "server-only";

import { google, type drive_v3 } from "googleapis";

import { DriveConfigurationError, DriveOperationError } from "./errors";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export type DriveConfig = {
  feedFolderId: string;
  rootFolderId: string;
  serviceAccountCredentials: Record<string, unknown>;
  sharedDriveId: string | null;
  storiesFolderId: string;
};

let cachedDriveClient: drive_v3.Drive | null = null;
let cachedConfig: DriveConfig | null = null;

export function readDriveConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): DriveConfig {
  const serviceAccountJson = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const rootFolderId = env.DRIVE_ROOT_FOLDER_ID?.trim();
  const storiesFolderId = env.DRIVE_STORIES_FOLDER_ID?.trim();
  const feedFolderId = env.DRIVE_FEED_FOLDER_ID?.trim();
  const sharedDriveId = env.DRIVE_SHARED_DRIVE_ID?.trim() || null;

  if (!serviceAccountJson) {
    throw new DriveConfigurationError(
      "Falta GOOGLE_SERVICE_ACCOUNT_JSON para Google Drive.",
    );
  }

  if (!rootFolderId || !storiesFolderId || !feedFolderId) {
    throw new DriveConfigurationError(
      "Faltan IDs de carpetas de Google Drive.",
    );
  }

  const serviceAccountCredentials = parseServiceAccountJson(serviceAccountJson);

  return {
    feedFolderId,
    rootFolderId,
    serviceAccountCredentials,
    sharedDriveId,
    storiesFolderId,
  };
}

export function getDriveConfig() {
  cachedConfig ??= readDriveConfigFromEnv();

  return cachedConfig;
}

export function getDriveClient() {
  if (cachedDriveClient) {
    return cachedDriveClient;
  }

  const config = getDriveConfig();
  const auth = new google.auth.GoogleAuth({
    credentials: config.serviceAccountCredentials,
    scopes: [DRIVE_SCOPE],
  });

  cachedDriveClient = google.drive({
    auth,
    version: "v3",
  });

  return cachedDriveClient;
}

export function getSharedDriveListOptions() {
  const { sharedDriveId } = getDriveConfig();

  if (!sharedDriveId) {
    return {};
  }

  return {
    corpora: "drive" as const,
    driveId: sharedDriveId,
    includeItemsFromAllDrives: true,
  };
}

export async function checkDriveHealth() {
  const config = getDriveConfig();

  await Promise.all([
    assertDriveFolderAccessible(config.rootFolderId, "ROOT"),
    assertDriveFolderAccessible(config.storiesFolderId, "STORIES"),
    assertDriveFolderAccessible(config.feedFolderId, "FEED"),
  ]);

  return {
    feedFolderId: config.feedFolderId,
    rootFolderId: config.rootFolderId,
    sharedDriveId: config.sharedDriveId,
    storiesFolderId: config.storiesFolderId,
  };
}

async function assertDriveFolderAccessible(fileId: string, label: string) {
  try {
    const response = await getDriveClient().files.get({
      fileId,
      fields: "id,mimeType,name,trashed",
      supportsAllDrives: true,
    });

    if (response.data.trashed) {
      throw new DriveOperationError(
        `La carpeta ${label} de Google Drive está en la papelera.`,
        { code: "DRIVE_FOLDER_TRASHED" },
      );
    }
  } catch (error) {
    if (error instanceof DriveOperationError) {
      throw error;
    }

    throw new DriveOperationError(
      `No pudimos acceder a la carpeta ${label} de Google Drive.`,
      { cause: error, code: "DRIVE_HEALTH_CHECK_FAILED" },
    );
  }
}

function parseServiceAccountJson(value: string) {
  try {
    const credentials = JSON.parse(value) as Record<string, unknown>;

    if (
      typeof credentials.client_email !== "string" ||
      typeof credentials.private_key !== "string"
    ) {
      throw new Error("Invalid service account JSON.");
    }

    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

    return credentials;
  } catch {
    throw new DriveConfigurationError(
      "GOOGLE_SERVICE_ACCOUNT_JSON no contiene JSON válido.",
    );
  }
}
