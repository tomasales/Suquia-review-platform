import assert from "node:assert/strict";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { readR2ConfigFromEnv } from "../src/lib/storage/config";
import {
  buildPendingStorageKey,
} from "../src/lib/storage/keys";
import { validateUploadUrlInput } from "../src/lib/storage/validation";

const requiredEnvVars = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.log(
    `Skipping R2 smoke test. Missing env vars: ${missingEnvVars.join(", ")}`,
  );
  process.exit(0);
}

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

async function runSmokeTest() {
  const config = readR2ConfigFromEnv(process.env);
  const client = new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    region: "auto",
  });
  const input = {
    fileSizeBytes: pngBytes.length,
    filename: "storage-smoke-test.png",
    mimeType: "image/png",
    purpose: "piece-version",
  } as const;
  validateUploadUrlInput(input);

  const storageKey = buildPendingStorageKey({
    filename: input.filename,
    purpose: input.purpose,
    userId: "storage-smoke-test",
  });
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucketName,
      ContentType: input.mimeType,
      Key: storageKey,
    }),
    { expiresIn: 300 },
  );

  const uploadResponse = await fetch(uploadUrl, {
    body: pngBytes,
    headers: {
      "Content-Type": "image/png",
    },
    method: "PUT",
  });

  try {
    assert.equal(uploadResponse.ok, true);

    const metadata = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey,
      }),
    );
    assert.equal(metadata.ContentLength, pngBytes.length);
    assert.equal(metadata.ContentType, "image/png");

    const readUrl = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey,
      }),
      { expiresIn: 1200 },
    );
    const readResponse = await fetch(readUrl);
    assert.equal(readResponse.ok, true);
    assert.equal((await readResponse.arrayBuffer()).byteLength, pngBytes.length);

    console.log(`R2 smoke test passed for ${storageKey}`);
  } finally {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey,
      }),
    );
  }
}

runSmokeTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
