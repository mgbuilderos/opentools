import type { NextConfig } from 'next';

import { resolvePinnedBuildId } from './lib/build/build-identity';
import { CACHED_GUIDE_SLUGS } from './lib/seo/cached-guides';
import {
  contentSecurityPolicy,
  EMBED_SOURCE,
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
          /*
           * Declared in `proxy.ts` since that file was written, and reaching
           * nobody on getopentools.com: verified 2026-09-26 with
           * `curl -I` against `/`, `/pdf/merge` and
           * `/convert/kilograms-to-pounds`, none of which carried it. Same
           * shape of fault as `X-Frame-Options` on 2026-09-19 — declared in
           * one place, absent from the file the Worker actually serves.
           *
           * It matters here beyond the usual reason: `proxy.ts` records that
           * `connect-src 'none'` is only as strong as the transport, because a
           * network attacker who can serve plaintext can strip the CSP. HSTS
           * is what stops that on every visit after the first.
           */
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
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
