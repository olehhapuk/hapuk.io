import { notFound } from 'next/navigation';

import { requireActiveOrg } from '@/server/auth/org';
import { getInvoiceWithItems } from '@/server/db/queries/invoices';
import { renderTemplate } from '@/templates/registry';
import { toInvoiceDocument } from '@/templates/types';

/**
 * Bare, print-optimized invoice page — no app chrome. Rendered on-screen for preview
 * and navigated to by Playwright for PDF export. Auth is enforced here (this route is
 * outside the (app) group) and scoped to the active org.
 */
export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireActiveOrg();

  const data = await getInvoiceWithItems(id);
  if (!data) notFound();

  const doc = toInvoiceDocument(data.invoice, data.items);

  return (
    <main className="bg-white">
      {renderTemplate(data.invoice.templateKey, doc)}
    </main>
  );
}
