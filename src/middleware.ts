import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PRIVATE_PATH_PREFIXES = [
  '/dashboard',
  '/editor',
  '/builder',
  '/admin',
  '/preview',
  '/auth',
  '/api',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
];

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase();
  const pathname = request.nextUrl.pathname;

  // 1. Enforce canonical apex domain: redirect www.websitebanja.com -> websitebanja.com
  // Preserves path and query parameters with permanent 308 redirect, eliminating internal container port
  if (host.startsWith('www.websitebanja.com')) {
    const canonicalUrl = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      'https://websitebanja.com'
    );
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const response = NextResponse.next();

  // 2. Private route search crawler protection: Add X-Robots-Tag
  const isPrivatePath = PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isPrivatePath) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (files with extensions like images, icons)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
