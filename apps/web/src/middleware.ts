import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'aicrafter.ru';
const REDIRECT_HOSTS = new Set(['www.aicrafter.ru']);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.toLowerCase().split(':')[0];

  if (!host || !REDIRECT_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = 'https';
  url.hostname = CANONICAL_HOST;
  url.port = '';

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: '/:path*'
};
