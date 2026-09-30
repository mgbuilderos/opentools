/**
 * Rewrites the built Wrangler config so the Worker sees a request before the
 * asset server answers it.
 *
 * **Why this exists.** `vinext build` emits `assets: { directory: '../client' }`
 * and nothing else, and Wrangler's default with a `main` plus `assets` is to
 * serve a matching static file and never reach the Worker. Since the whole route
 * set is prerendered, that is every real page. The self-host gate lives in
 * `proxy.ts`, so with the gate configured and no `run_worker_first`, the
 * container served `/`, `/self-host`, `/pdf/compress` and `/robots.txt` to
 * anybody and returned `401` only for paths that had no file — measured against
 * the built Worker, not reasoned about.
 *
 * So a gated instance runs the Worker first. An ungated one, including the
 * public site, keeps the asset-first path and its prerendering speed: the
 * deployed config is not touched by any of this, only the copy a gated container
 * starts from.
 *
 * Written to a temporary path rather than patched in place because the image's
 * filesystem may be read-only, which is the posture `docker-compose.yml` ships.
 * Relative paths inside the config resolve against the config's own directory,
 * so both are made absolute on the way out.
 *
 * Imported by `docker/gated-config.test.ts`, so the rewrite is a pure function
 * and nothing happens on import — the property `prerender-to-assets.mjs` lacked,
 * which is why its logic had to be moved out to be tested at all.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * `config` with the Worker ahead of the asset server, and its relative paths
 * resolved against `configDir` so the result can live anywhere.
 */
export function gatedConfig(config, configDir) {
  const gated = {
    ...config,
    assets: {
      ...config.assets,
      // `true` rather than a route list: a gate with an exception is not a gate,
      // and the exceptions would have to be kept in step with the route set.
      run_worker_first: true,
    },
  };
  if (gated.assets.directory) {
    gated.assets.directory = resolve(configDir, gated.assets.directory);
  }
  if (gated.main) gated.main = resolve(configDir, gated.main);
  // Only meaningful to `wrangler dev` watching a source tree that is not shipped.
  delete gated.build;
  return gated;
}

function main() {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination) {
    console.error('usage: gated-config.mjs <built wrangler.json> <output path>');
    process.exit(2);
  }
  const config = JSON.parse(readFileSync(source, 'utf8'));
  const gated = gatedConfig(config, dirname(resolve(source)));
  mkdirSync(dirname(resolve(destination)), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(gated, null, 2)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
