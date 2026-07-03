import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { getSession, requireUser } from '@/server/auth/session';

/**
 * Active-organization helpers for RSC / layouts / server components.
 *
 * `requireActiveOrg` is the org-scoped counterpart to `requireUser`: it guarantees an
 * authenticated user AND an active organization, redirecting to onboarding otherwise.
 */

export type Role = 'owner' | 'admin' | 'member';

export const listUserOrganizations = cache(async () => {
  return auth.api.listOrganizations({ headers: await headers() });
});

export const getActiveOrganization = cache(async () => {
  const session = await getSession();
  const organizationId = session?.session.activeOrganizationId;
  if (!organizationId) return null;
  return auth.api.getFullOrganization({
    headers: await headers(),
    query: { organizationId },
  });
});

export type ActiveOrg = {
  userId: string;
  role: Role;
  organization: NonNullable<Awaited<ReturnType<typeof getActiveOrganization>>>;
};

/**
 * Requires an authenticated user with an active org. Redirects to /onboarding when the
 * user has no active organization (e.g. brand-new account).
 */
export async function requireActiveOrg(): Promise<ActiveOrg> {
  const session = await requireUser();
  const organization = await getActiveOrganization();
  if (!organization) redirect('/onboarding');

  const member = await auth.api.getActiveMember({ headers: await headers() });
  return {
    userId: session.user.id,
    role: (member?.role ?? 'member') as Role,
    organization,
  };
}

/** True when the role may manage org settings, members, projects, etc. */
export function canManage(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}
