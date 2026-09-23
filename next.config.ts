import type { NextConfig } from 'next';

import { resolvePinnedBuildId } from './lib/build/build-identity';
import { CACHED_GUIDE_SLUGS } from './lib/seo/cached-guides';
import {
  contentSecurityPolicy,
  LOCAL_MODEL_SOURCES,
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
   * `ALLOW_INDEXING` has the same defect and no fix on this path: `_headers` is
   * static and cannot read the environment, so setting it to `false` does not
   * de-index the Cloudflare deploy. See `public/_headers`.
   */
  async headers() {
    return [
      {
        source: '/:path*',
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
