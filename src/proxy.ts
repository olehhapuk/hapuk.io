import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Optimistic auth gating at the edge (cookie presence only — no DB).
 * Real enforcement happens server-side in the (app) layout via requireUser().
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/onboarding',
  '/organization',
  '/accept-invitation',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  // Signed-in users shouldn't see login/register; let them finish verify/reset flows.
  if (
    hasSession &&
    (pathname.startsWith('/login') || pathname.startsWith('/register'))
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip API, Next internals, and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
