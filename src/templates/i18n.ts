import type { Locale } from '@/lib/i18n';

/** Every user-facing label an invoice template renders, per supported language. */
export type TemplateStrings = {
  invoice: string;
  draft: string;
  issued: string;
  due: string;
  sender: string;
  receiver: string;
  taxId: string;
  service: string;
  qty: string;
  rate: string;
  lineTotal: string;
  subtotal: string;
  total: string;
  amountDue: string;
  terms: string;
  defaultTerms: string;
  status: Record<'draft' | 'waiting' | 'paid' | 'unpaid', string>;
};

const en: TemplateStrings = {
  invoice: 'INVOICE',
  draft: 'DRAFT',
  issued: 'Issued',
  due: 'Due',
  sender: 'Sender',
  receiver: 'Receiver',
  taxId: 'Tax ID',
  service: 'Service',
  qty: 'Qty',
  rate: 'Rate',
  lineTotal: 'Line total',
  subtotal: 'Subtotal',
  total: 'Total',
  amountDue: 'Amount due',
  terms: 'Terms',
  defaultTerms:
    'Payment is due by the date shown above. Thank you for your business.',
  status: {
    draft: 'draft',
    waiting: 'waiting',
    paid: 'paid',
    unpaid: 'unpaid',
  },
};

const uk: TemplateStrings = {
  invoice: 'РАХУНОК',
  draft: 'ЧЕРНЕТКА',
  issued: 'Виставлено',
  due: 'Термін оплати',
  sender: 'Відправник',
  receiver: 'Отримувач',
  taxId: 'ІПН',
  service: 'Послуга',
  qty: 'К-сть',
  rate: 'Ціна',
  lineTotal: 'Сума',
  subtotal: 'Проміжний підсумок',
  total: 'Разом',
  amountDue: 'До сплати',
  terms: 'Умови',
  defaultTerms:
    'Оплата має бути здійснена до вказаної вище дати. Дякуємо за співпрацю.',
  status: {
    draft: 'чернетка',
    waiting: 'очікує оплати',
    paid: 'оплачено',
    unpaid: 'не оплачено',
  },
};

const dictionaries: Record<Locale, TemplateStrings> = { en, uk };

export function templateStrings(locale: Locale): TemplateStrings {
  return dictionaries[locale];
}

/** Localized status label, tolerant of unknown status values. */
export function statusLabel(locale: Locale, status: string): string {
  const map = dictionaries[locale].status as Record<string, string>;
  return map[status] ?? status;
}
