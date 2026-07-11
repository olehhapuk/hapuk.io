import { z } from 'zod';
import { slugSchema } from './organization';
import { locales } from '@/lib/i18n';

/** Optional free-text field: allows empty string, capped length. */
const optionalText = (max: number) =>
  z.string().max(max).optional().or(z.literal(''));

/** Monetary amount as a string ("100" or "100.50"); empty => use a fallback. */
const optionalMoney = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount like 100 or 100.50')
  .optional()
  .or(z.literal(''));

/**
 * Project = invoice SENDER defaults + invoice defaults (currency, rate, notes, due days).
 * Numeric fields are kept as strings here (mirrors the org form) and coerced in the
 * server action, avoiding zod coercion/output-type friction with react-hook-form.
 */
export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  slug: slugSchema,
  description: optionalText(500),

  senderName: optionalText(200),
  senderAddress: optionalText(500),
  senderTaxId: optionalText(100),
  senderPhone: optionalText(50),
  senderEmail: z.email('Enter a valid email').optional().or(z.literal('')),

  currency: z.string().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter code like USD'),
  // Language for this project's invoice templates.
  locale: z.enum(locales),
  defaultRate: optionalMoney,
  defaultNotes: optionalText(5000),
  defaultDueDays: z
    .string()
    .regex(/^\d{1,3}$/, 'Enter a whole number of days')
    .refine((v) => Number(v) <= 365, 'Must be 365 or fewer'),
});
export type ProjectInput = z.infer<typeof projectSchema>;

/** A per-project catalog service. Empty rate => fall back to project.defaultRate. */
export const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: optionalText(500),
  rate: optionalMoney,
  unit: z.string().min(1, 'Required').max(20),
  isActive: z.boolean(),
});
export type ServiceInput = z.infer<typeof serviceSchema>;
