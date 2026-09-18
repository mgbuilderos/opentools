import { sites } from '@openai/sites-vite-plugin';
import { cdnAdapter } from '@vinext/cloudflare/cache/cdn-adapter';
import { kvDataAdapter } from '@vinext/cloudflare/cache/kv-data-adapter';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json' with { type: 'json' };

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  // Data cache only, as of 2026-09-19. Pages are no longer stored here -- see
  // the `cache` option on the vinext() plugin below. Kept bound so reverting
  // to the KV page cache is a one-line change, and because the namespace still
  // holds 2,550 keys under dead build IDs that nobody has cleaned up yet.
  kv_namespaces: [
    { binding: 'VINEXT_KV_CACHE', id: 'c9cf54ced0214def91278f73f69316bd' },
  ],
  // Both of these are REQUIRED by cdnAdapter(): it serves page ISR from the
  // Workers Cache, and reads the deployed version id to stamp the build
  // identity header the deploy-time cache warmer validates against. Already
  // present before the switch -- do not remove either.
  cache: { enabled: true },
  version_metadata: { binding: 'CF_VERSION_METADATA' },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext({
        // Page-level ISR is served by Cloudflare's edge cache, not by KV.
        //
        // Why this changed (2026-09-19). Pages used to be stored in KV: only
        // `data` was configured, so page ISR fell through `DefaultCdnCacheAdapter`,
        // which delegates `get`/`set` to the data cache handler
        // (vinext/dist/shims/cdn-cache.js). That store is keyed
        // `cache:app:<buildId>:<pathname>:<html|rsc>` and `buildId` is a fresh
        // random UUID on every build -- `resolveBuildId` returns `safeUUID()`
        // whenever `generateBuildId` is unset (vinext/dist/config/next-config.js).
        // So every build, and every REDEPLOY OF IDENTICAL CODE, started from an
        // empty cache and had to rewrite every page. KV held 2,550 keys under 3
        // dead build IDs while the live build ID matched none of them, and the
        // free plan's 1,000 writes/day was being spent several times over
        // (writes/day = pages x 2 x deploys that day).
        //
        // `cdnAdapter()` ends that class of problem rather than tuning it: its
        // runtime `get` returns null and its `set` is a no-op, so page caching
        // costs ZERO KV writes and the daily ceiling stops applying. The origin
        // renders fresh whenever a request actually reaches it; the edge absorbs
        // the repeats and revalidates in the background.
        //
        // `data` is deliberately left on KV. Nothing in this repo uses the data
        // cache today (no `use cache`, `unstable_cache` or cached fetch), so this
        // is inert -- it is kept so that this commit changes exactly one thing
        // and can be reverted by deleting the `cdn` line alone.
        //
        // Build-time prerender is still deliberately NOT enabled: it bundles
        // every page into the Worker script (3.0MB gzip vs 0.96MB), which is at
        // the free plan's Worker size ceiling.
        cache: {
          cdn: cdnAdapter(),
          data: kvDataAdapter({ binding: 'VINEXT_KV_CACHE' }),
        },
      }),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
