import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { env } from '@/env';
import { db, schema } from '@/server/db';
import { sendEmail } from '@/server/email';
import { orgAdditionalFields } from '@/server/auth/org-fields';

/**
 * Better Auth server instance.
 *
 * - Email/password with verification + password reset.
 * - Organization plugin: orgs, members, roles (owner|admin|member), email invitations.
 *   Receiver/signature defaults are declared as additionalFields on `organization`
 *   (kept in sync with src/server/db/schema/auth.ts).
 *
 * After changing this config, regenerate the schema and reconcile:
 *   pnpm auth:generate
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),

  databaseHooks: {
    session: {
      create: {
        // Auto-scope new sessions to the user's first organization (if any) so the
        // app has an active tenant on login. Users with no org go through onboarding.
        before: async (session) => {
          const [firstMembership] = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, session.userId))
            .limit(1);
          return {
            data: {
              ...session,
              activeOrganizationId: firstMembership?.organizationId ?? null,
            },
          };
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: 'Reset your hapuk.io password',
        html: `<p>Click to reset your password:</p><p><a href="${url}">${url}</a></p>`,
        text: `Reset your password: ${url}`,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: 'Verify your hapuk.io email',
        html: `<p>Welcome! Confirm your email:</p><p><a href="${url}">${url}</a></p>`,
        text: `Verify your email: ${url}`,
      });
    },
  },

  plugins: [
    organization({
      // Receiver defaults + signature live on the organization row.
      schema: {
        organization: {
          additionalFields: orgAdditionalFields,
        },
      },
      async sendInvitationEmail(data) {
        const url = `${env.BETTER_AUTH_URL}/accept-invitation/${data.id}`;
        await sendEmail({
          to: data.email,
          subject: `You've been invited to ${data.organization.name} on hapuk.io`,
          html: `<p>${data.inviter.user.name} invited you to join <b>${data.organization.name}</b>.</p><p><a href="${url}">Accept invitation</a></p>`,
          text: `Accept your invitation: ${url}`,
        });
      },
    }),
  ],
});
