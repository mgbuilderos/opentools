import { NextResponse, type NextRequest } from 'next/server';

import {
  contentSecurityPolicy,
  loadsLocalModel,
} from './lib/security/content-security-policy';
import { authorise, challengeResponse } from './lib/security/self-host-auth';
import { siteRedirect } from './lib/seo/site-redirects';

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
  // Self-host gate, first thing and before the visit log: an instance that
  // refuses a request should not record it either. Off unless
  // OPENTOOLS_AUTH_USER and OPENTOOLS_AUTH_PASSWORD are both set, which is
  // never the case for the public site — no account is the product there.
  if (
    authorise(process.env, request.headers.get('authorization')).kind ===
    'challenge'
  ) {
    return challengeResponse();
  }

  const pathname = request.nextUrl.pathname;

  // Edge Telemetry Logging for non-static tool & page requests
  if (!pathname.startsWith('/_next/') && !pathname.includes('.')) {
    const country = request.headers.get('cf-ipcountry') || 'XX';
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
        device,
        referer_source: refererSource,
        path: pathname,
        tool,
        lang: acceptLang.slice(0, 10),
        time: Date.now(),
      }),
    );
  }

  // Old links to tools removed by owner decision (308) and thin guides merged
  // into their tool page (301, off until the owner supplies Search Console
  // data) go straight to the final live page; see lib/seo/site-redirects.ts.
  // The target keeps its own query string (e.g. /developer/advanced?tool=x).
  const redirect = siteRedirect(pathname, request.nextUrl.search);
  if (redirect) {
    return NextResponse.redirect(
      new URL(redirect.location, request.url),
      redirect.status,
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
