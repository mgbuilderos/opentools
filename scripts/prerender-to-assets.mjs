#!/usr/bin/env node
/**
 * Moves the build's prerendered pages out of the Worker bundle and into the
 * static assets directory.
 *
 * `vinext build` writes prerendered routes to `dist/server/prerendered-routes/`,
 * which Wrangler uploads as Worker modules. At this site's size that upload is
 * 14.5MB gzipped -- the Workers Free script limit is 3MB, so the deploy cannot
 * even be attempted. Served from `dist/client/` instead, the same pages cost
 * nothing against the script limit and are returned without rendering.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'dist/server/prerendered-routes');
const TARGET = path.join(ROOT, 'dist/client');

if (!existsSync(SOURCE)) {
  console.error(
    '\n  prerender-to-assets: dist/server/prerendered-routes/ is missing.\n' +
      '  The build produced no prerendered pages, so every page would render\n' +
      '  per request on a Worker capped at 10ms CPU. Check that vite.config.ts\n' +
      '  still passes `prerender: true` to vinext().\n',
  );
  process.exit(1);
}

let moved = 0;
let overwritten = 0;

function moveTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const src = path.join(from, entry);
    const dest = path.join(to, entry);
    if (statSync(src).isDirectory()) {
      moveTree(src, dest);
      continue;
    }
    if (existsSync(dest)) {
      rmSync(dest);
      overwritten += 1;
    }
    renameSync(src, dest);
    moved += 1;
  }
}

moveTree(SOURCE, TARGET);
rmSync(SOURCE, { recursive: true, force: true });

const suffix =
  overwritten > 0 ? ` (${overwritten} replaced an existing asset)` : '';
console.log(`  Moved ${moved} prerendered files into dist/client/${suffix}`);
