import { sites } from '@openai/sites-vite-plugin';
import { kvDataAdapter } from '@vinext/cloudflare/cache/kv-data-adapter';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, type Plugin } from 'vite';
import {
  pinnedRscBuildIdentity,
  pinnedRscCompatibilityId,
  resolvePinnedBuildId,
  VINEXT_SHARED_RSC_BUILD_IDENTITY_ENV,
  VINEXT_SHARED_RSC_COMPATIBILITY_ID_ENV,
} from './lib/build/build-identity';
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

/**
 * Hand vinext the two identities it otherwise mints at random, derived from the
 * commit, so that two builds of the same tree produce the same bytes.
 *
 * The compatibility id is the one that matters to a visitor: it is baked into
 * the client bundle, so a random one renamed most of `/_next/static/chunks/`
 * on every build. The build identity never leaves the Worker; pinning it is
 * what makes `dist/server` reproducible, so a deploy can be checked against the
 * commit it claims to come from.
 *
 * Why here and not in `next.config.ts`: the only knob vinext exposes for this
 * id is `deploymentId`, and setting that would also switch on
 * `experimental.renderBuiltUrl`, which appends `?dpl=<id>` to every asset URL
 * a stylesheet or an HTML document points at. Those URLs would then change on
 * every commit -- re-breaking, for the entry chunk and the CSS, the very
 * caching this fix exists to restore. The shared environment variable below is
 * vinext's own mechanism for giving one id to all the Vite builds in a run;
 * borrowing it changes the value and nothing else.
 *
 * `vinext build` sets this variable to a random UUID before it starts the
 * builds, so it cannot be pinned from outside the process. It is read again,
 * per build, by vinext's `vinext:config` plugin -- which is `enforce: 'pre'`,
 * hence `enforce: 'pre'` and first in the `plugins` array here.
 *
 * `writeBundle` then proves vinext actually used it. Without that, a vinext
 * upgrade that renames the variable would silently restore the random id and
 * the build would quietly stop being reproducible again.
 */
function pinRscIdentities(): Plugin {
  const buildId = resolvePinnedBuildId();
  const pinned = pinnedRscCompatibilityId(buildId);
  const pinnedBuildIdentity = pinnedRscBuildIdentity(buildId);
  return {
    name: 'opentools:pin-rsc-identities',
    enforce: 'pre',
    apply: 'build',
    config() {
      if (pinned) process.env[VINEXT_SHARED_RSC_COMPATIBILITY_ID_ENV] = pinned;
      if (pinnedBuildIdentity)
        process.env[VINEXT_SHARED_RSC_BUILD_IDENTITY_ENV] = pinnedBuildIdentity;
    },
    writeBundle(options, bundle) {
      // Only the compatibility id is checked here, because only it reaches a
      // chunk a browser loads, and only the client build is written to
      // `dist/client`. The build identity's own rename risk is covered by the
      // test that reads vinext's source. Matched on the last two segments so an
      // absolute and a relative `outDir` are both recognised -- a guard that
      // quietly matches nothing is worse than no guard.
      const outDir = (options.dir ?? '')
        .replaceAll('\\', '/')
        .replace(/\/+$/, '');
      if (!pinned || !/(^|\/)dist\/client$/.test(outDir)) return;
      const carried = Object.values(bundle).some(
        (output) => output.type === 'chunk' && output.code.includes(pinned),
      );
      if (!carried)
        this.error(
          `The pinned RSC compatibility id is missing from the client bundle. ` +
            `vinext no longer reads ${VINEXT_SHARED_RSC_COMPATIBILITY_ID_ENV}, ` +
            `so it has gone back to a random id per build and the build is no ` +
            `longer reproducible. See lib/build/build-identity.ts.`,
        );
    },
  };
}

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
      pinRscIdentities(),
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
