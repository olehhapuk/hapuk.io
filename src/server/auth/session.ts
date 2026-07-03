import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';

/**
 * Server-side session helpers for RSC / layouts / server actions.
 * `getSession` is request-cached so multiple callers in one render share a single lookup.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type ServerSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/** Returns the session or redirects to /login. Use in the authenticated app layout. */
export async function requireUser(): Promise<ServerSession> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
