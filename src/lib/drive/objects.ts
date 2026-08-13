import "server-only";

import { Readable } from "node:stream";
import type { drive_v3 } from "googleapis";

import { DRIVE_FOLDER_MIME_TYPE, type DriveAppProperties } from "./backup-format";
import { getDriveClient, getSharedDriveListOptions } from "./client";
import { DriveIntegrityError, DriveOperationError } from "./errors";

export type DriveObject = {
  appProperties?: Record<string, string> | null;
  id: string;
  mimeType?: string | null;
  name?: string | null;
  parents?: string[] | null;
};

export async function getDriveObjectOrNull(fileId: string) {
  try {
    const response = await getDriveClient().files.get({
      fileId,
      fields: "id,name,mimeType,parents,appProperties,trashed",
      supportsAllDrives: true,
    });

    if (response.data.trashed || !response.data.id) {
      return null;
    }

    return toDriveObject(response.data);
  } catch (error) {
    if (getGoogleErrorStatus(error) === 404) {
      return null;
    }

    throw new DriveOperationError(
      "No pudimos verificar un objeto existente de Google Drive.",
      { cause: error, code: "DRIVE_VERIFY_OBJECT_FAILED" },
    );
  }
}

export async function findDriveObject({
  appProperties,
  parentId,
}: {
  appProperties: DriveAppProperties;
  parentId: string;
}) {
  try {
    const response = await getDriveClient().files.list({
      ...getSharedDriveListOptions(),
      fields: "files(id,name,mimeType,parents,appProperties)",
      includeItemsFromAllDrives: true,
      pageSize: 10,
      q: buildDriveQuery({ appProperties, parentId }),
      supportsAllDrives: true,
    });

    const files = (response.data.files ?? [])
      .filter((file): file is drive_v3.Schema$File & { id: string } =>
        Boolean(file.id),
      )
      .map(toDriveObject);

    if (files.length > 1) {
      throw new DriveIntegrityError(
        "Google Drive devolvió más de un objeto para una identidad SUQUIA.",
      );
    }

    return files[0] ?? null;
  } catch (error) {
    if (error instanceof DriveIntegrityError) {
      throw error;
    }

    throw new DriveOperationError(
      "No pudimos buscar objetos de Google Drive.",
      { cause: error, code: "DRIVE_FIND_OBJECT_FAILED" },
    );
  }
}

export async function findOrCreateDriveFolder({
  appProperties,
  knownFolderId,
  name,
  parentId,
}: {
  appProperties: DriveAppProperties;
  knownFolderId?: string | null;
  name: string;
  parentId: string;
}) {
  const knownFolder = knownFolderId
    ? await getDriveObjectOrNull(knownFolderId)
    : null;

  if (knownFolder) {
    assertFolder(knownFolder);
    return knownFolder;
  }

  const existingFolder = await findDriveObject({ appProperties, parentId });

  if (existingFolder) {
    assertFolder(existingFolder);
    return existingFolder;
  }

  try {
    const response = await getDriveClient().files.create({
      fields: "id,name,mimeType,parents,appProperties",
      requestBody: {
        appProperties,
        mimeType: DRIVE_FOLDER_MIME_TYPE,
        name,
        parents: [parentId],
      },
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new DriveOperationError(
        "Google Drive no devolvió ID para la carpeta creada.",
        { code: "DRIVE_CREATE_FOLDER_MISSING_ID" },
      );
    }

    return toDriveObject(response.data);
  } catch (error) {
    if (error instanceof DriveOperationError) {
      throw error;
    }

    throw new DriveOperationError(
      "No pudimos crear una carpeta en Google Drive.",
      { cause: error, code: "DRIVE_CREATE_FOLDER_FAILED" },
    );
  }
}

export async function createOrUpdateTextFile({
  appProperties,
  content,
  knownFileId,
  mimeType,
  name,
  parentId,
}: {
  appProperties: DriveAppProperties;
  content: string;
  knownFileId?: string | null;
  mimeType: string;
  name: string;
  parentId: string;
}) {
  const existingFile = await resolveExistingFile({
    appProperties,
    knownFileId,
    parentId,
  });
  const body = Readable.from([content]);

  if (existingFile) {
    return updateDriveFile({
      appProperties,
      body,
      fileId: existingFile.id,
      mimeType,
      name,
    });
  }

  return createDriveFile({
    appProperties,
    body,
    mimeType,
    name,
    parentId,
  });
}

export async function createStreamFileIfMissing({
  appProperties,
  body,
  knownFileId,
  mimeType,
  name,
  parentId,
}: {
  appProperties: DriveAppProperties;
  body: Readable;
  knownFileId?: string | null;
  mimeType: string;
  name: string;
  parentId: string;
}) {
  const existingFile = await resolveExistingFile({
    appProperties,
    knownFileId,
    parentId,
  });

  if (existingFile) {
    return existingFile;
  }

  return createDriveFile({
    appProperties,
    body,
    mimeType,
    name,
    parentId,
  });
}

async function resolveExistingFile({
  appProperties,
  knownFileId,
  parentId,
}: {
  appProperties: DriveAppProperties;
  knownFileId?: string | null;
  parentId: string;
}) {
  const knownFile = knownFileId ? await getDriveObjectOrNull(knownFileId) : null;

  if (knownFile) {
    return knownFile;
  }

  return findDriveObject({ appProperties, parentId });
}

async function createDriveFile({
  appProperties,
  body,
  mimeType,
  name,
  parentId,
}: {
  appProperties: DriveAppProperties;
  body: Readable;
  mimeType: string;
  name: string;
  parentId: string;
}) {
  try {
    const response = await getDriveClient().files.create({
      fields: "id,name,mimeType,parents,appProperties",
      media: {
        body,
        mimeType,
      },
      requestBody: {
        appProperties,
        name,
        parents: [parentId],
      },
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new DriveOperationError(
        "Google Drive no devolvió ID para el archivo creado.",
        { code: "DRIVE_CREATE_FILE_MISSING_ID" },
      );
    }

    return toDriveObject(response.data);
  } catch (error) {
    if (error instanceof DriveOperationError) {
      throw error;
    }

    throw new DriveOperationError(
      "No pudimos crear un archivo en Google Drive.",
      { cause: error, code: "DRIVE_CREATE_FILE_FAILED" },
    );
  }
}

async function updateDriveFile({
  appProperties,
  body,
  fileId,
  mimeType,
  name,
}: {
  appProperties: DriveAppProperties;
  body: Readable;
  fileId: string;
  mimeType: string;
  name: string;
}) {
  try {
    const response = await getDriveClient().files.update({
      fields: "id,name,mimeType,parents,appProperties",
      fileId,
      media: {
        body,
        mimeType,
      },
      requestBody: {
        appProperties,
        name,
      },
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new DriveOperationError(
        "Google Drive no devolvió ID para el archivo actualizado.",
        { code: "DRIVE_UPDATE_FILE_MISSING_ID" },
      );
    }

    return toDriveObject(response.data);
  } catch (error) {
    if (error instanceof DriveOperationError) {
      throw error;
    }

    throw new DriveOperationError(
      "No pudimos actualizar un archivo en Google Drive.",
      { cause: error, code: "DRIVE_UPDATE_FILE_FAILED" },
    );
  }
}

function assertFolder(file: DriveObject) {
  if (file.mimeType !== DRIVE_FOLDER_MIME_TYPE) {
    throw new DriveIntegrityError(
      "La identidad esperada en Google Drive no corresponde a una carpeta.",
    );
  }
}

function buildDriveQuery({
  appProperties,
  parentId,
}: {
  appProperties: DriveAppProperties;
  parentId: string;
}) {
  const clauses = [
    `'${escapeDriveQueryValue(parentId)}' in parents`,
    "trashed = false",
  ];

  for (const [key, value] of Object.entries(appProperties)) {
    clauses.push(
      `appProperties has { key='${escapeDriveQueryValue(
        key,
      )}' and value='${escapeDriveQueryValue(value)}' }`,
    );
  }

  return clauses.join(" and ");
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function toDriveObject(file: drive_v3.Schema$File): DriveObject {
  if (!file.id) {
    throw new DriveOperationError("Google Drive devolvió un objeto sin ID.", {
      code: "DRIVE_OBJECT_MISSING_ID",
    });
  }

  return {
    appProperties: file.appProperties,
    id: file.id,
    mimeType: file.mimeType,
    name: file.name,
    parents: file.parents,
  };
}

function getGoogleErrorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    return error.code;
  }

  const maybeResponse = (error as { response?: { status?: unknown } })?.response;

  return typeof maybeResponse?.status === "number" ? maybeResponse.status : null;
}
