import { execFileSync } from 'node:child_process';

import type { NextConfig } from 'next';

import {
  contentSecurityPolicy,
  LOCAL_MODEL_SOURCES,
} from './lib/security/content-security-policy';

const development = process.env.NODE_ENV === 'development';

/**
 * Pin the build ID to the commit being built.
 *
 * Left unset, `resolveBuildId` returns a fresh random UUID on every build
 * (vinext/dist/config/next-config.js). The page cache is keyed
 * `cache:app:<buildId>:<pathname>:<html|rsc>`, so an unset build ID means every
 * build -- and every REDEPLOY OF IDENTICAL CODE -- starts from an empty cache
 * and has to re-render and re-write every page.
 *
 * That is not hypothetical. On 2026-09-19 KV held 2,550 entries under three
 * dead build IDs while the live build ID matched none of them, and the free
 * plan's 1,000 writes/day was being spent several times over. It is also
 * self-inflicted: this project's own documented remedy for CPU errors is to
 * redeploy the identical commit, which silently wiped the whole cache each time.
 *
 * Keyed on the commit, an unchanged tree redeploys onto its existing warm cache,
 * and a real code change still gets a new key so nobody is served a stale page.
 *
 * A dirty tree is deliberately NOT given the clean commit's ID -- that would let
 * two different builds share one cache key and serve each other's pages. It
 * falls back to `null`, which restores the random-UUID behaviour: correct, just
 * uncached. Same for a missing git directory, or CI that exports the SHA itself
 * via `OPENTOOLS_BUILD_ID`.
 */
function resolvePinnedBuildId(): string | null {
  const fromEnv = process.env.OPENTOOLS_BUILD_ID?.trim();
  if (fromEnv) return fromEnv;
  try {
    const git = (...args: string[]) =>
      execFileSync('git', args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    // Tracked-file changes only. Untracked files cannot alter the built output
    // unless something imports them, in which case the importer is itself dirty.
    if (git('status', '--porcelain', '--untracked-files=no')) return null;
    return git('rev-parse', 'HEAD') || null;
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  generateBuildId: resolvePinnedBuildId,
  productionBrowserSourceMaps: false,
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
