import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/date';
import { formatInvoiceNumber, type InvoiceDocument } from './types';
import { statusLabel, templateStrings } from './i18n';
import type { PartySnapshot } from '@/server/db/schema/app';
import type { Locale } from '@/lib/i18n';

/**
 * Self-contained, print-optimized invoice stylesheet. Explicit light-mode colors and
 * system fonts keep PDF output deterministic regardless of the app theme. Scoped under
 * `.invoice-doc` so it never leaks into the app.
 */
const CLASSIC_CSS = `
.invoice-doc { --ink:#18181b; --muted:#71717a; --line:#e4e4e7; --accent:#4f46e5; }
@page { size: A4; margin: 16mm; }
.invoice-doc {
  box-sizing: border-box;
  color: var(--ink);
  background: #fff;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  max-width: 210mm;
  margin: 0 auto;
  padding: 16mm;
}
.invoice-doc * { box-sizing: border-box; }
@media print { .invoice-doc { padding: 0; max-width: none; } }
.invoice-doc .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.invoice-doc .title { font-size: 30px; font-weight: 700; letter-spacing: 0.14em; color: var(--ink); }
.invoice-doc .brand { margin-top: 4px; font-size: 12px; color: var(--muted); }
.invoice-doc .meta { text-align: right; font-size: 12px; color: var(--muted); }
.invoice-doc .meta .num { font-size: 18px; font-weight: 600; color: var(--accent); }
.invoice-doc .meta .status { display:inline-block; margin-top:4px; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; background:#f4f4f5; color:var(--muted); }
.invoice-doc .rule { height: 1px; background: var(--line); margin: 20px 0; }
.invoice-doc .parties { display: flex; gap: 40px; }
.invoice-doc .party { flex: 1; }
.invoice-doc .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 4px; }
.invoice-doc .party .name { font-weight: 600; }
.invoice-doc .party .line { color: var(--muted); }
.invoice-doc table { width: 100%; border-collapse: collapse; margin-top: 24px; }
.invoice-doc thead th { text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); border-bottom: 1px solid var(--line); padding: 8px 0; }
.invoice-doc tbody td { padding: 10px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.invoice-doc .num-col { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.invoice-doc .totals { margin-top: 20px; margin-left: auto; width: 260px; }
.invoice-doc .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
.invoice-doc .totals .grand { border-top: 1px solid var(--line); margin-top: 4px; padding-top: 8px; font-size: 15px; font-weight: 700; }
.invoice-doc .totals .due { color: var(--accent); }
.invoice-doc .terms { margin-top: 32px; }
.invoice-doc .terms p { color: var(--muted); white-space: pre-wrap; margin: 0; }
.invoice-doc .signatures { margin-top: 56px; display: flex; gap: 40px; }
.invoice-doc .sign { flex: 1; }
.invoice-doc .sign img { max-height: 56px; max-width: 200px; object-fit: contain; margin-bottom: 6px; }
.invoice-doc .sign .sigline { border-top: 1px solid var(--ink); padding-top: 6px; font-size: 11px; color: var(--muted); }
`;

function Party({
  label,
  taxIdLabel,
  party,
}: {
  label: string;
  taxIdLabel: string;
  party: PartySnapshot | null;
}) {
  return (
    <div className="party">
      <div className="label">{label}</div>
      <div className="name">{party?.name ?? '—'}</div>
      {party?.address ? <div className="line">{party.address}</div> : null}
      {party?.taxId ? (
        <div className="line">
          {taxIdLabel}: {party.taxId}
        </div>
      ) : null}
      {party?.phone ? <div className="line">{party.phone}</div> : null}
      {party?.email ? <div className="line">{party.email}</div> : null}
    </div>
  );
}

export function ClassicTemplate({ doc }: { doc: InvoiceDocument }) {
  const { currency } = doc;
  const locale: Locale = doc.locale;
  const t = templateStrings(locale);
  const amountDue = doc.status === 'paid' ? '0.00' : doc.total;

  return (
    <div className="invoice-doc">
      <style dangerouslySetInnerHTML={{ __html: CLASSIC_CSS }} />

      <div className="header">
        <div>
          <div className="title">{t.invoice}</div>
          {doc.sender?.name ? <div className="brand">{doc.sender.name}</div> : null}
        </div>
        <div className="meta">
          <div className="num">
            {doc.number != null ? formatInvoiceNumber(doc.number) : t.draft}
          </div>
          <div>
            {t.issued}: {formatDate(doc.issueDate, locale)}
          </div>
          <div>
            {t.due}: {formatDate(doc.dueDate, locale)}
          </div>
          <div className="status">{statusLabel(locale, doc.status)}</div>
        </div>
      </div>

      <div className="rule" />

      <div className="parties">
        <Party label={t.sender} taxIdLabel={t.taxId} party={doc.sender} />
        <Party label={t.receiver} taxIdLabel={t.taxId} party={doc.receiver} />
      </div>

      <table>
        <thead>
          <tr>
            <th>{t.service}</th>
            <th className="num-col">{t.qty}</th>
            <th className="num-col">{t.rate}</th>
            <th className="num-col">{t.lineTotal}</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, i) => (
            <tr key={i}>
              <td>{item.description}</td>
              <td className="num-col">{item.qty}</td>
              <td className="num-col">{formatMoney(item.rate, currency, locale)}</td>
              <td className="num-col">
                {formatMoney(item.lineTotal, currency, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        <div className="row">
          <span>{t.subtotal}</span>
          <span className="num-col">
            {formatMoney(doc.subtotal, currency, locale)}
          </span>
        </div>
        <div className="row grand">
          <span>{t.total}</span>
          <span className="num-col">{formatMoney(doc.total, currency, locale)}</span>
        </div>
        <div className="row due">
          <span>{t.amountDue}</span>
          <span className="num-col">{formatMoney(amountDue, currency, locale)}</span>
        </div>
      </div>

      <div className="terms">
        <div className="label">{t.terms}</div>
        <p>{doc.notes?.trim() || t.defaultTerms}</p>
      </div>

      <div className="signatures">
        <div className="sign">
          <div className="sigline">{t.sender}</div>
        </div>
        <div className="sign">
          {doc.signature?.imageUrl ? (
            // Plain <img>: this template is rendered to a static PDF by Playwright,
            // where next/image optimization/loaders don't apply.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.signature.imageUrl} alt="Signature" />
          ) : null}
          <div className="sigline">{doc.signature?.label || t.receiver}</div>
        </div>
      </div>
    </div>
  );
}
