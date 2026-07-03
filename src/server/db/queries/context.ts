import { headers } from 'next/headers';
import { auth } from '@/server/auth';
import { getSession } from '@/server/auth/session';

/**
 * Tenant-scoping helpers. Every data-access function that touches a tenant table
 * must resolve the active organization through these and scope its queries by it.
 *
 * Golden rule (see README): a query against a tenant table without an active
 * `organizationId` filter is a bug.
 */

export class UnauthorizedError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NoActiveOrgError extends Error {
  constructor(message = 'No active organization') {
    super(message);
    this.name = 'NoActiveOrgError';
  }
}

export type OrgContext = {
  userId: string;
  organizationId: string;
  role: string;
};

/** Returns the current session or throws if unauthenticated. */
export async function requireSession() {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/**
 * Resolves the active organization context (user + org + role) or throws.
 * Use this at the top of every org-scoped server action / query.
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const session = await requireSession();
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) throw new NoActiveOrgError();

  const members = await auth.api.listMembers({
    headers: await headers(),
    query: { organizationId },
  });
  const me = members.members.find((m) => m.userId === session.user.id);
  if (!me) throw new NoActiveOrgError('User is not a member of the active org');

  return {
    userId: session.user.id,
    organizationId,
    role: me.role,
  };
}

/** Throws if the current member's role is not in the allowed set. */
export function assertRole(
  ctx: OrgContext,
  allowed: Array<OrgContext['role']>,
) {
  if (!allowed.includes(ctx.role)) {
    throw new Error(`Requires role: ${allowed.join(' | ')}`);
  }
}
