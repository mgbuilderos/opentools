import { NextResponse, type NextRequest } from 'next/server';

import {
  contentSecurityPolicy,
  loadsLocalModel,
} from './lib/security/content-security-policy';
import { authorise, challengeResponse } from './lib/security/self-host-auth';
import { siteRedirect } from './lib/seo/site-redirects';
import { recipeArrivalShape, recipeLinkTarget } from './lib/tools/recipe-link';

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

  /*
   * A shared setup link arrives on its own path — see `RECIPE_LINK_PREFIX`.
   * Resolved before the visit log so the arrival is recorded, then sent on to
   * the tool below. Null for every ordinary request, which is nearly all of
   * them.
   */
  const sharedTarget = recipeLinkTarget(pathname);

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
    const tool =
      sharedTarget || request.nextUrl.searchParams.get('tool') || pathname;

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
        /*
         * Whether this visit came in on a shared setup link.
         *
         * This is the only way to see whether the share loop is closing. A
         * recipe arrival and a search arrival are the same page view, so the
         * path counts alone cannot separate them, and the site has no
         * client-side analytics and must not gain any — no beacon, no script,
         * no identifier. This is derived here at the edge from the shape of
         * the request that already arrived, and is two words wide:
         * `recipe` or `direct`. The settings themselves are never recorded;
         * see `recipeArrivalShape` for why that question needs no answer.
         *
         * Reading the loop: `arrival=recipe` on a tool path is a colleague
         * who was sent a link and landed on a working tool. Growth compounds
         * only while that count rises faster than the sends that produced it.
         */
        arrival: sharedTarget
          ? 'recipe'
          : recipeArrivalShape(pathname, request.nextUrl.search),
        lang: acceptLang.slice(0, 10),
        time: Date.now(),
      }),
    );
  }

  /*
   * Send a shared link on to the tool, with its settings intact.
   *
   * 307 and not 308 on purpose. A permanent redirect is cached by the browser,
   * so the second person to open the same link would never reach the server
   * and the arrival would go uncounted — the count would quietly undercount
   * exactly the links that were shared most. A temporary redirect costs one
   * hop and keeps every arrival visible.
   */
  if (sharedTarget) {
    return NextResponse.redirect(
      new URL(`${sharedTarget}${request.nextUrl.search}`, request.url),
      307,
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
