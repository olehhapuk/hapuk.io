import { chromium } from 'playwright';

/**
 * Renders a print page to a PDF via headless Chromium. Navigates back to the app's
 * own `/print/invoice/[id]` route, forwarding the caller's session cookies so the
 * page renders authenticated and org-scoped. Node runtime only.
 */

function parseCookieHeader(header: string, origin: string) {
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf('=');
      if (eq === -1) return null;
      return {
        name: part.slice(0, eq).trim(),
        value: part.slice(eq + 1).trim(),
        url: origin,
      };
    })
    .filter((c): c is { name: string; value: string; url: string } => c !== null);
}

export async function renderInvoicePdf(opts: {
  url: string;
  origin: string;
  cookieHeader: string | null;
}): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    if (opts.cookieHeader) {
      const cookies = parseCookieHeader(opts.cookieHeader, opts.origin);
      if (cookies.length > 0) await context.addCookies(cookies);
    }
    const page = await context.newPage();
    const response = await page.goto(opts.url, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    if (!response || !response.ok()) {
      throw new Error(
        `Print page responded with ${response ? response.status() : 'no response'}`,
      );
    }
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    await browser.close();
  }
}
