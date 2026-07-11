import { formatDate } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import type { Locale } from '@/lib/i18n';
import type { PartySnapshot } from '@/server/db/schema/app';

/**
 * Variables users may embed in an invoice notes field as `{{name}}`. They resolve at
 * render time against the invoice's own snapshotted data, so historical invoices stay
 * stable. Dates and the total are formatted for the invoice's language.
 */
export const NOTE_VARIABLES = [
  'issueDate',
  'dueDate',
  'currency',
  'total',
  'senderName',
  'senderAddress',
  'senderTaxId',
  'senderPhone',
  'senderEmail',
  'receiverName',
  'receiverAddress',
  'receiverTaxId',
  'receiverPhone',
  'receiverEmail',
] as const;

export type NoteVariable = (typeof NOTE_VARIABLES)[number];

/** Display tokens (e.g. "{{dueDate}}") for showing available variables in the UI. */
export const NOTE_VARIABLE_TOKENS: string[] = NOTE_VARIABLES.map(
  (name) => `{{${name}}}`,
);

export type NotesContext = {
  issueDate: string;
  dueDate: string;
  currency: string;
  total: string;
  sender: PartySnapshot | null;
  receiver: PartySnapshot | null;
  locale: Locale;
};

// `{{ name }}` with optional inner whitespace; letters only.
const TOKEN_RE = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

function buildValues(ctx: NotesContext): Record<NoteVariable, string> {
  return {
    issueDate: formatDate(ctx.issueDate, ctx.locale),
    dueDate: formatDate(ctx.dueDate, ctx.locale),
    currency: ctx.currency,
    total: formatMoney(ctx.total, ctx.currency, ctx.locale),
    senderName: ctx.sender?.name ?? '',
    senderAddress: ctx.sender?.address ?? '',
    senderTaxId: ctx.sender?.taxId ?? '',
    senderPhone: ctx.sender?.phone ?? '',
    senderEmail: ctx.sender?.email ?? '',
    receiverName: ctx.receiver?.name ?? '',
    receiverAddress: ctx.receiver?.address ?? '',
    receiverTaxId: ctx.receiver?.taxId ?? '',
    receiverPhone: ctx.receiver?.phone ?? '',
    receiverEmail: ctx.receiver?.email ?? '',
  };
}

/**
 * Replaces known `{{variable}}` tokens in `notes` with their invoice values. A known
 * variable with no value becomes empty; unknown tokens are left untouched so typos
 * stay visible rather than silently vanishing.
 */
export function renderNotes(notes: string, ctx: NotesContext): string {
  const values = buildValues(ctx) as Record<string, string>;
  return notes.replace(TOKEN_RE, (whole, name: string) =>
    name in values ? values[name] : whole,
  );
}
