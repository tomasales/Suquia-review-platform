export class DriveConfigurationError extends Error {
  readonly code = "DRIVE_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "DriveConfigurationError";
  }
}

export class DriveOperationError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown; code?: string }) {
    super(message);
    this.name = "DriveOperationError";
    this.code = options?.code ?? "DRIVE_OPERATION_ERROR";
    this.cause = options?.cause;
  }
}

export class DriveIntegrityError extends Error {
  readonly code = "DRIVE_INTEGRITY_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "DriveIntegrityError";
  }
}

export function getDriveErrorCode(error: unknown) {
  if (error instanceof DriveConfigurationError) {
    return error.code;
  }

  if (error instanceof DriveIntegrityError) {
    return error.code;
  }

  if (error instanceof DriveOperationError) {
    return error.code;
  }

  return "DRIVE_UNKNOWN_ERROR";
}

export function sanitizeDriveErrorMessage(error: unknown) {
  if (
    error instanceof DriveConfigurationError ||
    error instanceof DriveIntegrityError ||
    error instanceof DriveOperationError
  ) {
    return error.message;
  }

  return "No pudimos completar la operación con Google Drive.";
}

export function getPublicDriveErrorMessage(error: unknown) {
  if (error instanceof DriveConfigurationError) {
    return "Google Drive no está configurado.";
  }

  if (error instanceof DriveIntegrityError) {
    return "El backup de Google Drive necesita revisión.";
  }

  return "No pudimos conectar con Google Drive.";
}
