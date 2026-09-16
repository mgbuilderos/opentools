import { NextResponse, type NextRequest } from 'next/server';

import {
  contentSecurityPolicy,
  loadsLocalModel,
} from './lib/security/content-security-policy';

const responseHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Edge Telemetry Logging for non-static tool & page requests
  if (!pathname.startsWith('/_next/') && !pathname.includes('.')) {
    const country = request.headers.get('cf-ipcountry') || 'XX';
    const region = request.headers.get('cf-region') || '';
    const city = request.headers.get('cf-ipcity') || '';
    const referer = request.headers.get('referer') || 'direct';
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLang =
      request.headers.get('accept-language')?.split(',')[0] || 'en';
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
    const isTablet = /iPad|Tablet/i.test(userAgent);
    const device = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const tool = request.nextUrl.searchParams.get('tool') || pathname;

    let refererSource = 'direct';
    if (referer !== 'direct') {
      if (referer.includes('google.')) refererSource = 'google';
      else if (referer.includes('github.')) refererSource = 'github';
      else if (referer.includes('reddit.')) refererSource = 'reddit';
      else if (referer.includes('ycombinator.com'))
        refererSource = 'hackernews';
      else if (
        referer.includes('t.co') ||
        referer.includes('x.com') ||
        referer.includes('twitter.com')
      )
        refererSource = 'x_twitter';
      else if (referer.includes('bing.')) refererSource = 'bing';
      else refererSource = 'other_web';
    }

    // Output structured event for Cloudflare Observability & Analytics logs
    console.log(
      JSON.stringify({
        event: 'tool_impression',
        country,
        region,
        city,
        tool,
        path: pathname,
        device,
        referer_source: refererSource,
        referer: referer.slice(0, 120),
        lang: acceptLang.slice(0, 10),
        time: Date.now(),
      }),
    );
  }

  const response = NextResponse.next();

  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicy({
      development: process.env.NODE_ENV === 'development',
      localModel: loadsLocalModel(request.nextUrl.pathname),
    }),
  );
  for (const [name, value] of Object.entries(responseHeaders)) {
    response.headers.set(name, value);
  }

  return response;
}

export const config = {
  matcher: '/:path*',
};
