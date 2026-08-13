export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageValidationError";
  }
}

export class StorageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageUploadError";
  }
}

export function getPublicStorageErrorMessage(error: unknown) {
  if (error instanceof StorageConfigurationError) {
    return "No pudimos preparar la subida.";
  }

  if (error instanceof StorageValidationError) {
    return error.message;
  }

  if (error instanceof StorageUploadError) {
    return "No pudimos confirmar el archivo.";
  }

  return "No pudimos preparar la subida.";
}
