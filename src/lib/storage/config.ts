import { StorageConfigurationError } from "./errors";

export type R2Config = {
  accessKeyId: string;
  accountId: string;
  bucketName: string;
  endpoint: string;
  secretAccessKey: string;
};

type R2Env = {
  [key: string]: string | undefined;
  R2_ACCESS_KEY_ID?: string;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  R2_SECRET_ACCESS_KEY?: string;
};

function readRequiredEnv(env: R2Env, key: keyof R2Env) {
  const value = env[key]?.trim();

  if (!value) {
    throw new StorageConfigurationError(`Missing ${key}`);
  }

  return value;
}

export function readR2ConfigFromEnv(env: R2Env): R2Config {
  const accountId = readRequiredEnv(env, "R2_ACCOUNT_ID");
  const endpoint =
    env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  try {
    const url = new URL(endpoint);

    if (url.protocol !== "https:") {
      throw new StorageConfigurationError("R2_ENDPOINT must use https");
    }
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      throw error;
    }

    throw new StorageConfigurationError("R2_ENDPOINT must be a valid URL");
  }

  return {
    accessKeyId: readRequiredEnv(env, "R2_ACCESS_KEY_ID"),
    accountId,
    bucketName: readRequiredEnv(env, "R2_BUCKET_NAME"),
    endpoint,
    secretAccessKey: readRequiredEnv(env, "R2_SECRET_ACCESS_KEY"),
  };
}

export function getR2Config() {
  return readR2ConfigFromEnv(process.env);
}
