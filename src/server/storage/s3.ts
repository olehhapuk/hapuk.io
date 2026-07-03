import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/env';

/**
 * S3 storage helper (signatures & PDFs).
 *
 * Works with real AWS S3 and S3-compatible providers (MinIO/R2). When `S3_ENDPOINT`
 * is set we use path-style addressing (`endpoint/bucket/key`); otherwise the default
 * virtual-hosted style for AWS.
 *
 * Browser uploads use a short-lived presigned PUT (`getUploadUrl`). Server-generated
 * files (e.g. Playwright PDFs) use `putObject`.
 */

function requireStorageEnv() {
  const { AWS_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } =
    env;
  if (
    !AWS_REGION ||
    !S3_BUCKET ||
    !AWS_ACCESS_KEY_ID ||
    !AWS_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      'S3 storage is not configured: set AWS_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.',
    );
  }
  return {
    region: AWS_REGION,
    bucket: S3_BUCKET,
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    endpoint: env.S3_ENDPOINT,
  };
}

const globalForS3 = globalThis as unknown as { s3Client?: S3Client };

function getClient(): S3Client {
  if (globalForS3.s3Client) return globalForS3.s3Client;
  const cfg = requireStorageEnv();
  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    // Path-style is required for MinIO and most S3-compatible providers.
    forcePathStyle: Boolean(cfg.endpoint),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  globalForS3.s3Client = client;
  return client;
}

export function getBucket(): string {
  return requireStorageEnv().bucket;
}

/** Presigned PUT URL for a direct browser upload. Store the returned `key` on your row. */
export async function getUploadUrl(params: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ url: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: params.key,
    ContentType: params.contentType,
  });
  const url = await getSignedUrl(getClient(), command, {
    expiresIn: params.expiresIn ?? 60 * 5,
  });
  return { url, key: params.key };
}

/** Presigned GET URL, for private objects that shouldn't be world-readable. */
export async function getDownloadUrl(params: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: params.key,
  });
  return getSignedUrl(getClient(), command, {
    expiresIn: params.expiresIn ?? 60 * 60,
  });
}

/** Server-side upload (e.g. a generated PDF). Returns the object key. */
export async function putObject(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
}): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
  return params.key;
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}

/**
 * Deterministic public URL for objects in a public-read bucket (dev MinIO / public prod bucket).
 * For private objects, use `getDownloadUrl` instead.
 */
export function publicUrl(key: string): string {
  const cfg = requireStorageEnv();
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  if (cfg.endpoint) {
    return `${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${encodedKey}`;
  }
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${encodedKey}`;
}
