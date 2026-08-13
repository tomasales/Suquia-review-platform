import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { getR2Config } from "./config";
import { StorageUploadError } from "./errors";

const R2_REGION = "auto";

let cachedClient: S3Client | null = null;

function getR2Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getR2Config();

  cachedClient = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    region: R2_REGION,
  });

  return cachedClient;
}

function getBucketName() {
  return getR2Config().bucketName;
}

export async function createR2SignedUploadUrl({
  contentType,
  expiresInSeconds,
  storageKey,
}: {
  contentType: string;
  expiresInSeconds: number;
  storageKey: string;
}) {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    ContentType: contentType,
    Key: storageKey,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: expiresInSeconds,
  });
}

export async function createR2SignedReadUrl({
  expiresInSeconds,
  storageKey,
}: {
  expiresInSeconds: number;
  storageKey: string;
}) {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: expiresInSeconds,
  });
}

export async function headR2Object(storageKey: string) {
  try {
    const response = await getR2Client().send(
      new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: storageKey,
      }),
    );

    return {
      contentLength: response.ContentLength ?? null,
      contentType: response.ContentType ?? null,
      eTag: response.ETag ?? null,
      lastModified: response.LastModified ?? null,
    };
  } catch {
    throw new StorageUploadError("Could not confirm uploaded object.");
  }
}

export async function deleteR2Object(storageKey: string) {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: storageKey,
    }),
  );
}

export async function getR2ObjectStream(storageKey: string) {
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: storageKey,
    }),
  );

  const body = response.Body;

  if (!body) {
    throw new StorageUploadError("Could not read uploaded object.");
  }

  if (isNodeReadable(body)) {
    return body;
  }

  const streamableBody = body as unknown as {
    transformToWebStream?: () => unknown;
  };

  if (typeof streamableBody.transformToWebStream === "function") {
    return Readable.fromWeb(
      streamableBody.transformToWebStream() as NodeReadableStream<Uint8Array>,
    );
  }

  if (body instanceof Uint8Array) {
    return Readable.from(body);
  }

  throw new StorageUploadError("Could not read uploaded object.");
}

function isNodeReadable(value: unknown): value is Readable {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { pipe?: unknown }).pipe === "function"
  );
}
