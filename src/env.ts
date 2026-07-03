import { z } from 'zod';

/**
 * Centralized, validated environment access.
 * Import from here instead of touching `process.env` directly so a missing/invalid
 * variable fails loudly at startup rather than deep inside a request.
 */
const schema = z.object({
  DATABASE_URL: z.url(),

  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),

  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).default('invoices@hapuk.io'),

  AWS_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_ENDPOINT: z.url().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '❌ Invalid environment variables:',
    z.treeifyError(parsed.error),
  );
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
