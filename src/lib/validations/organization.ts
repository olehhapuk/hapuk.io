import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(2, 'Too short')
  .max(48, 'Too long')
  .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only');

export const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: slugSchema,
});
export type CreateOrgInput = z.infer<typeof createOrgSchema>;

/** Org profile = invoice RECEIVER defaults + identity + signature label. */
export const orgProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: slugSchema,
  receiverName: z.string().max(200).optional().or(z.literal('')),
  receiverAddress: z.string().max(500).optional().or(z.literal('')),
  receiverTaxId: z.string().max(100).optional().or(z.literal('')),
  receiverPhone: z.string().max(50).optional().or(z.literal('')),
  receiverEmail: z.email('Enter a valid email').optional().or(z.literal('')),
  signatureLabel: z.string().max(200).optional().or(z.literal('')),
});
export type OrgProfileInput = z.infer<typeof orgProfileSchema>;

export const inviteMemberSchema = z.object({
  email: z.email('Enter a valid email'),
  role: z.enum(['admin', 'member']),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

/** Turn a display name into a URL-safe slug candidate. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
