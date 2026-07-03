import { and, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { db, schema } from '@/server/db';
import {
  NoActiveOrgError,
  UnauthorizedError,
  requireOrgContext,
} from '@/server/db/queries/context';
import { getInvoiceWithItems } from '@/server/db/queries/invoices';
import { renderInvoicePdf } from '@/server/pdf/render';
import { publicUrl, putObject } from '@/server/storage/s3';
import { env } from '@/env';

// Playwright requires the Node.js runtime.
export const runtime = 'nodejs';

/**
 * Generates the invoice PDF via Playwright, caches it to S3 (best-effort) on
 * `invoice.pdfUrl`, and streams it back inline. Org-scoped and role-agnostic (any
 * member of the active org can export their invoices).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let ctx;
  try {
    ctx = await requireOrgContext();
  } catch (e) {
    if (e instanceof UnauthorizedError || e instanceof NoActiveOrgError) {
      return new Response('Unauthorized', { status: 401 });
    }
    throw e;
  }

  const data = await getInvoiceWithItems(id);
  if (!data) return new Response('Not found', { status: 404 });

  // Canonical app origin (works behind a reverse proxy where request.url is internal).
  const origin = (
    env.APP_URL ??
    env.BETTER_AUTH_URL ??
    new URL(request.url).origin
  ).replace(/\/$/, '');
  const printUrl = `${origin}/print/invoice/${id}`;

  let pdf: Buffer;
  try {
    pdf = await renderInvoicePdf({
      url: printUrl,
      origin,
      cookieHeader: request.headers.get('cookie'),
    });
  } catch (e) {
    console.error('PDF render failed', e);
    return new Response('Failed to generate PDF', { status: 500 });
  }

  // Cache to storage; never let a storage hiccup block the download.
  try {
    const key = `invoices/${ctx.organizationId}/${id}.pdf`;
    await putObject({ key, body: pdf, contentType: 'application/pdf' });
    await db
      .update(schema.invoice)
      .set({ pdfUrl: publicUrl(key), updatedAt: new Date() })
      .where(
        and(
          eq(schema.invoice.id, id),
          eq(schema.invoice.organizationId, ctx.organizationId),
        ),
      );
  } catch (e) {
    console.error('PDF cache upload failed (serving inline anyway)', e);
  }

  const label =
    data.invoice.number != null
      ? String(data.invoice.number).padStart(3, '0')
      : 'draft';

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${label}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
