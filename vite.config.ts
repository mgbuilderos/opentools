import { sites } from '@openai/sites-vite-plugin';
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
  // Page cache for pre-rendered routes. Without these the Worker re-renders
  // every page on each request, which exhausted its resources under crawl
  // load on 2026-09-16 (1,316 `exceededResources` 503s in one hour).
  kv_namespaces: [
    { binding: 'VINEXT_KV_CACHE', id: 'c9cf54ced0214def91278f73f69316bd' },
  ],
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
        // Every route is rendered at build time and served from the Worker
        // bundle, so a page request never renders React. The KV cache alone
        // could not carry this: on the free plan KV allows 1,000 writes a day
        // while a full cache needs ~1,340 keys (670 URLs x html+rsc), and
        // every deploy starts a new `cache:app:<build id>:` prefix, so the
        // cache restarts from empty and can never finish filling. Measured on
        // 2026-09-20: 183 of 670 live URLs returned 503 and Cloudflare killed
        // 268 of 1,241 renders with `exceededCpu` against the free plan's
        // 10ms budget (successful renders needed 30ms median, 286ms worst).
        // KV stays bound as the fallback for anything prerender skips.
        prerender: true,
        cache: {
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
