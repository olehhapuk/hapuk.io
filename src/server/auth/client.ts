import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { orgAdditionalFields } from '@/server/auth/org-fields';

/**
 * Client-side Better Auth instance for use in Client Components.
 * Exposes signIn/signUp/signOut, session hooks, and organization methods.
 * The org additionalFields mirror the server so `organization.update` is typed.
 */
export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      schema: { organization: { additionalFields: orgAdditionalFields } },
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization,
  useListOrganizations,
  useActiveOrganization,
} = authClient;
