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
        // Pages are cached in KV on first render and served from there, so
        // the Worker stops re-rendering every page on every request -- that
        // per-request render is what exhausted its resources under crawl load
        // on 2026-09-16 (1,316 `exceededResources` 503s in one hour).
        // Build-time prerender is deliberately NOT enabled: it bundles every
        // page into the Worker script (3.0MB gzip vs 0.96MB) for no gain once
        // the KV cache fills on the first request to each URL.
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
