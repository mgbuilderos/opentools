import type { NextConfig } from 'next';

import { resolvePinnedBuildId } from './lib/build/build-identity';
import { CACHED_GUIDE_SLUGS } from './lib/seo/cached-guides';
import {
  contentSecurityPolicy,
  EMBED_SOURCE,
  FIX_SOURCE,
  LOCAL_MODEL_SOURCES,
  NON_EMBED_SOURCE,
} from './lib/security/content-security-policy';

const development = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  /**
   * Serve the 50 cacheable guides from `/guides-cached/:slug`, while the public
   * URL stays `/guides/:slug`. A rewrite is internal -- no redirect, no address
   * change, nothing for search engines to re-learn.
   *
   * **Unlike `headers()` below, these DO ship on Cloudflare.** That was not
   * assumed: a probe rewrite was added, built, and found in the deployed Worker
   * bundle (`dist/server/index.js`), which iterates `configRewrites.beforeFiles`
   * at request time. `headers()` has no such entry, which is exactly why
   * `X-Frame-Options` reached nobody until it was copied into `public/_headers`.
   *
   * The list is literal strings for a reason -- see `lib/seo/cached-guides.ts`.
   */
  async rewrites() {
    return CACHED_GUIDE_SLUGS.map((slug) => ({
      source: `/guides/${slug}`,
      destination: `/guides-cached/${slug}`,
    }));
  },
  generateBuildId: resolvePinnedBuildId,
  productionBrowserSourceMaps: false,
  /**
   * **These headers do not ship on Cloudflare.** `headers()` is applied by the
   * Node server, so it governs the Docker self-host path and `next start` — but
   * the deployed Worker serves its headers from `public/_headers` alone, and
   * never runs this.
   *
   * So anything added here must be added to `public/_headers` too, or it
   * reaches self-hosters and no one else. That is not hypothetical: until
   * 2026-09-19 `X-Frame-Options: DENY` was declared here, missing there, and
   * therefore absent from every response getopentools.com served. (Framing was
   * still blocked the whole time by `frame-ancestors 'none'` in the CSP, which
   * does ship — but the declaration below was reaching nobody.)
   *
   * `lib/security/header-parity.test.ts` now enforces that rather than asking
   * for it: adding a header here without adding it to `public/_headers` fails
   * the test suite, and so does letting the two values drift apart.
   *
   * `ALLOW_INDEXING` has the same defect and no fix on this path: `_headers` is
   * static and cannot read the environment, so setting it to `false` does not
   * de-index the Cloudflare deploy. See `public/_headers`.
   */
  async headers() {
    return [
      {
        /*
         * `NON_EMBED_SOURCE`, not `/:path*`. `X-Frame-Options: DENY` below has
         * no value meaning "any origin", so the only way to stop sending it on
         * the framable `/embed/<tool>` routes is for this rule not to match
         * them. See ADR-019 and `lib/security/embed-framing.test.ts`.
         */
        source: NON_EMBED_SOURCE,
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({ development }),
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'X-Robots-Tag',
            value:
              process.env.ALLOW_INDEXING === 'false'
                ? 'noindex, nofollow, noarchive'
                : 'index, follow',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          /*
           * Declared here as well as in `public/_headers` so the two paths agree
           * and `lib/security/header-parity.test.ts` has both sides to compare.
           *
           * Browsers ignore this header over plain HTTP (RFC 6797 s7.2), so on a
           * self-hosted instance reached over http it costs nothing and does
           * nothing; behind the reverse proxy that instance is meant to sit
           * behind, it does the same job it does in production. No `preload` —
           * that is near-irreversible and the owner's call, not this change's.
           */
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      /*
       * The framable routes: everything the catch-all sends except
       * `X-Frame-Options`, which is simply absent, plus a CSP whose only
       * difference is `frame-ancestors *` and a CORP that lets a parent page
       * with `Cross-Origin-Embedder-Policy: require-corp` load the frame at
       * all. `connect-src` stays `'none'` -- an embedded tool is as sealed as
       * the same tool on this site. Business rule 33 (amended 2026-09-24).
       */
      {
        source: EMBED_SOURCE,
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({ development, embeddable: true }),
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Robots-Tag', value: 'noindex, follow' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
      /*
       * Fix My Upload's working routes, and the ONLY relaxation here is the
       * opener policy. Every other directive above still applies to them:
       * the same CSP with `frame-ancestors 'none'`, `connect-src 'none'`,
       * COEP, CORP, `X-Frame-Options: DENY`, referrer and permissions policy.
       * This entry names one key, so it can only change one thing.
       *
       * WHY. `Cross-Origin-Opener-Policy: same-origin` severs the browsing
       * context group between a cross-origin opener and this site, in both
       * directions, before any script runs -- measured, not assumed:
       * `window.opener` is null in the popup and the opener's own handle
       * reports `closed`. That makes it impossible for a site whose upload
       * rejected a file to hand the visitor a link and receive the corrected
       * file back through browser memory. The alternative route, an iframe, is
       * closed by `frame-ancestors 'none'` and stays closed.
       *
       * Owner decision 2026-09-28. ADR-020, and
       * `lib/security/fix-opener-policy.test.ts` fails the build if this ever
       * widens past `/fix/<path>` or past this single header.
       */
      {
        source: FIX_SOURCE,
        headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' }],
      },
      /*
       * The nine product counters, on the Node/Docker path. The Cloudflare
       * deploy gets the same rule from `public/_headers`; both are required,
       * and a header declared in one and not the other reaches half the users.
       *
       * `no-store` is load-bearing rather than tidy: the request IS the
       * measurement, so a cacheable response means the second event of a kind
       * is served from a copy and never counted again. A self-hosted instance
       * requests these from itself and nowhere else — the paths are relative
       * and `lib/product-telemetry.test.ts` proves no absolute host appears in
       * the module at all.
       */
      {
        source: '/telemetry/v1/:file*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      // Later entries override the same header key.
      ...LOCAL_MODEL_SOURCES.map((source) => ({
        source,
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({ development, localModel: true }),
          },
        ],
      })),
    ];
  },
};

export default nextConfig;
