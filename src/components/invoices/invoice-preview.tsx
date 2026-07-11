import type {
  InvoiceItemRow,
  InvoiceRow,
} from '@/server/db/queries/invoices';
import type { PartySnapshot } from '@/server/db/schema/app';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/date';
import { toLocale } from '@/lib/i18n';
import { templateStrings } from '@/templates/i18n';
import { renderNotes } from '@/templates/notes';

function PartyBlock({
  label,
  taxIdLabel,
  party,
}: {
  label: string;
  taxIdLabel: string;
  party: PartySnapshot | null;
}) {
  return (
    <div className="grid gap-0.5 text-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-medium">{party?.name ?? '—'}</p>
      {party?.address ? (
        <p className="text-muted-foreground">{party.address}</p>
      ) : null}
      {party?.taxId ? (
        <p className="text-muted-foreground">
          {taxIdLabel}: {party.taxId}
        </p>
      ) : null}
      {party?.phone ? (
        <p className="text-muted-foreground">{party.phone}</p>
      ) : null}
      {party?.email ? (
        <p className="text-muted-foreground">{party.email}</p>
      ) : null}
    </div>
  );
}

/**
 * Read-only invoice summary for finalized invoices. This is a lightweight view;
 * the pixel-perfect `classic` template + PDF export arrive in Phase 5.
 */
export function InvoicePreview({
  invoice,
  items,
}: {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
}) {
  const { currency } = invoice;
  const locale = toLocale(invoice.locale);
  const t = templateStrings(locale);
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <PartyBlock
          label={t.sender}
          taxIdLabel={t.taxId}
          party={invoice.senderSnapshot}
        />
        <PartyBlock
          label={t.receiver}
          taxIdLabel={t.taxId}
          party={invoice.receiverSnapshot}
        />
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          {t.issued}{' '}
          <span className="text-foreground">
            {formatDate(invoice.issueDate, locale)}
          </span>
        </span>
        <span className="text-muted-foreground">
          {t.due}{' '}
          <span className="text-foreground">
            {formatDate(invoice.dueDate, locale)}
          </span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 font-medium">{t.service}</th>
              <th className="py-2 text-right font-medium">{t.qty}</th>
              <th className="py-2 text-right font-medium">{t.rate}</th>
              <th className="py-2 text-right font-medium">{t.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right tabular-nums">{item.qty}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatMoney(item.rate, currency, locale)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatMoney(item.lineTotal, currency, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="grid gap-1 text-sm">
          <div className="flex justify-between gap-12">
            <span className="text-muted-foreground">{t.subtotal}</span>
            <span className="tabular-nums">
              {formatMoney(invoice.subtotal, currency, locale)}
            </span>
          </div>
          <div className="flex justify-between gap-12 text-base font-semibold">
            <span>{t.total}</span>
            <span className="tabular-nums">
              {formatMoney(invoice.total, currency, locale)}
            </span>
          </div>
        </div>
      </div>

      {invoice.notes ? (
        <div className="grid gap-1 text-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.terms}
          </p>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {renderNotes(invoice.notes, {
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate,
              currency: invoice.currency,
              total: invoice.total,
              sender: invoice.senderSnapshot,
              receiver: invoice.receiverSnapshot,
              locale,
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
