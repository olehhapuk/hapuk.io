import type {
  InvoiceItemRow,
  InvoiceRow,
} from '@/server/db/queries/invoices';
import type { PartySnapshot, SignatureSnapshot } from '@/server/db/schema/app';
import { toLocale, type Locale } from '@/lib/i18n';

/**
 * Normalized, self-contained invoice document handed to a template. Built entirely
 * from the invoice's own snapshotted data so a template never touches the DB and a
 * historical invoice always renders exactly as it was finalized.
 */
export type InvoiceDocument = {
  number: number | null;
  status: string;
  locale: Locale;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  total: string;
  notes: string | null;
  sender: PartySnapshot | null;
  receiver: PartySnapshot | null;
  signature: SignatureSnapshot | null;
  items: Array<{
    description: string;
    qty: string;
    rate: string;
    lineTotal: string;
  }>;
};

/** Zero-padded display number, or a DRAFT marker. */
export function formatInvoiceNumber(number: number | null): string {
  return number != null ? `#${String(number).padStart(3, '0')}` : 'DRAFT';
}

/** Build a template document from an invoice row + its items. */
export function toInvoiceDocument(
  invoice: InvoiceRow,
  items: InvoiceItemRow[],
): InvoiceDocument {
  return {
    number: invoice.number,
    status: invoice.status,
    locale: toLocale(invoice.locale),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    total: invoice.total,
    notes: invoice.notes,
    sender: invoice.senderSnapshot,
    receiver: invoice.receiverSnapshot,
    signature: invoice.signatureSnapshot,
    items: items.map((i) => ({
      description: i.description,
      qty: i.qty,
      rate: i.rate,
      lineTotal: i.lineTotal,
    })),
  };
}

export type TemplateComponent = (props: {
  doc: InvoiceDocument;
}) => React.ReactElement;
