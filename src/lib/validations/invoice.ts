import { z } from 'zod';

/** Statuses an invoice can be manually moved between after finalize. */
export const settleableStatuses = ['waiting', 'paid', 'unpaid'] as const;
export type SettleableStatus = (typeof settleableStatuses)[number];

const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount like 100 or 100.50');

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date');

const optionalText = (max: number) =>
  z.string().max(max).optional().or(z.literal(''));

export const invoiceItemSchema = z.object({
  serviceId: z.string().optional().or(z.literal('')),
  description: z.string().min(1, 'Required').max(300),
  qty: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Qty')
    .refine((v) => Number(v) > 0, 'Must be > 0'),
  rate: money,
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

/**
 * Draft invoice payload. Party blocks are snapshotted onto the invoice, so they are
 * editable here (prefilled from project/org). Subtotal/total are NOT accepted from the
 * client — the server recomputes them from the line items.
 */
export const invoiceSchema = z
  .object({
    issueDate: isoDate,
    dueDate: isoDate,
    currency: z.string().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter code'),

    senderName: z.string().min(1, 'Sender name is required').max(200),
    senderAddress: optionalText(500),
    senderTaxId: optionalText(100),
    senderPhone: optionalText(50),
    senderEmail: z.email('Enter a valid email').optional().or(z.literal('')),

    receiverName: z.string().min(1, 'Receiver name is required').max(200),
    receiverAddress: optionalText(500),
    receiverTaxId: optionalText(100),
    receiverPhone: optionalText(50),
    receiverEmail: z.email('Enter a valid email').optional().or(z.literal('')),

    notes: optionalText(2000),
    items: z.array(invoiceItemSchema).min(1, 'Add at least one line item'),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    message: 'Due date cannot be before the issue date',
    path: ['dueDate'],
  });
export type InvoiceInput = z.infer<typeof invoiceSchema>;
