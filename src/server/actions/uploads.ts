'use server';

import { randomUUID } from 'crypto';
import { requireOrgContext, requireSession } from '@/server/db/queries/context';
import { getUploadUrl, publicUrl } from '@/server/storage/s3';

const AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/**
 * Issues a short-lived presigned PUT URL for the current user's avatar.
 * The client uploads directly to S3/MinIO, then persists `publicUrl` via updateUser.
 */
export async function createAvatarUploadUrl(input: {
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const session = await requireSession();

  if (!AVATAR_TYPES.has(input.contentType)) {
    throw new Error('Unsupported image type. Use PNG, JPEG, or WebP.');
  }

  const ext = input.contentType.split('/')[1];
  const key = `avatars/${session.user.id}/${randomUUID()}.${ext}`;

  const { url } = await getUploadUrl({
    key,
    contentType: input.contentType,
  });

  return { uploadUrl: url, publicUrl: publicUrl(key) };
}

/**
 * Issues a presigned PUT URL for the active organization's signature image.
 * Scoped to the active org; the client persists `publicUrl` via organization.update.
 */
export async function createSignatureUploadUrl(input: {
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const ctx = await requireOrgContext();

  if (!AVATAR_TYPES.has(input.contentType)) {
    throw new Error('Unsupported image type. Use PNG, JPEG, or WebP.');
  }

  const ext = input.contentType.split('/')[1];
  const key = `signatures/${ctx.organizationId}/${randomUUID()}.${ext}`;

  const { url } = await getUploadUrl({
    key,
    contentType: input.contentType,
  });

  return { uploadUrl: url, publicUrl: publicUrl(key) };
}
