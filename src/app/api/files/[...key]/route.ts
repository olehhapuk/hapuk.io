import { and, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { getSession } from '@/server/auth/session';
import { db, schema } from '@/server/db';
import { getDownloadUrl } from '@/server/storage/s3';

export const runtime = 'nodejs';

// The redirect is cached for less than the presigned URL lives, so a cached
// redirect never points at an expired URL.
const PRESIGN_TTL_SECONDS = 60 * 10;
const REDIRECT_CACHE_SECONDS = 60 * 5;

/**
 * Gateway to the private bucket. Stored file URLs point here (see `fileUrl`);
 * access is checked by key prefix, then the browser is redirected to a
 * short-lived presigned GET.
 *
 *   avatars/<userId>/…    any signed-in user (shown on member lists)
 *   signatures/<orgId>/…  members of that organization
 *   invoices/<orgId>/…    members of that organization
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;

  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  if (
    segments.length < 3 ||
    segments.some((s) => s === '' || s === '.' || s === '..')
  ) {
    return new Response('Not found', { status: 404 });
  }

  const [scope, ownerId] = segments;
  if (scope === 'signatures' || scope === 'invoices') {
    const [membership] = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, ownerId),
          eq(schema.member.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!membership) return new Response('Not found', { status: 404 });
  } else if (scope !== 'avatars') {
    return new Response('Not found', { status: 404 });
  }

  const url = await getDownloadUrl({
    key: segments.join('/'),
    expiresIn: PRESIGN_TTL_SECONDS,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      'Cache-Control': `private, max-age=${REDIRECT_CACHE_SECONDS}`,
    },
  });
}
