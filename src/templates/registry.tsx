import { ClassicTemplate } from './classic';
import type { InvoiceDocument } from './types';

/**
 * Maps a `templateKey` (stored on invoice/invoice_template) to a template component.
 * Add new templates here; `invoice.templateKey` references these keys.
 */
export const templateRegistry = {
  classic: ClassicTemplate,
} as const;

export type TemplateKey = keyof typeof templateRegistry;
export const DEFAULT_TEMPLATE_KEY: TemplateKey = 'classic';

export function isTemplateKey(key: string): key is TemplateKey {
  return key in templateRegistry;
}

/** Resolve a template component, falling back to the default for unknown keys. */
export function getTemplate(key: string) {
  return isTemplateKey(key)
    ? templateRegistry[key]
    : templateRegistry[DEFAULT_TEMPLATE_KEY];
}

export function renderTemplate(key: string, doc: InvoiceDocument) {
  const Template = getTemplate(key);
  return <Template doc={doc} />;
}
