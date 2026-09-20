#!/usr/bin/env node
/**
 * Makes the build fully static: every public URL answers from a file in
 * `dist/client/`, so no page request renders anything.
 *
 * Two things stand in the way of that after `vinext build`:
 *
 * 1. Prerendered pages are written to `dist/server/prerendered-routes/`, which
 *    Wrangler uploads as Worker modules. At this site's size that upload is
 *    14.5MB gzipped against a 3MB script limit on Workers Free, so the deploy
 *    cannot even be attempted. Moved into `dist/client/` they cost nothing
 *    against that limit.
 * 2. vinext's prerender does not emit route handlers or `sitemap.ts` /
 *    `robots.ts` at all, so those are rebuilt by the Worker on every request --
 *    and they are the paths Googlebot asks for most. They are captured by
 *    serving the finished build and saving the bytes it returns, so there is
 *    one implementation rather than a copy of the sitemap serializer here that
 *    could drift from the real one.
 */
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'dist/server/prerendered-routes');
const TARGET = path.join(ROOT, 'dist/client');

const SERVED_ROUTES = [
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
];
const CAPTURE_PORT = 8791;

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

async function waitForServer(url, server) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `wrangler dev exited with ${server.exitCode} before it served anything`,
      );
    }
    try {
      const probe = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (probe.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`wrangler dev did not answer on ${url} within 90s`);
}

async function captureServedRoutes() {
  const server = spawn(
    path.join(ROOT, 'node_modules/.bin/wrangler'),
    [
      'dev',
      '--config',
      'dist/server/wrangler.json',
      '--port',
      String(CAPTURE_PORT),
    ],
    { cwd: ROOT, stdio: 'ignore' },
  );
  const origin = `http://127.0.0.1:${CAPTURE_PORT}`;

  try {
    await waitForServer(`${origin}/robots.txt`, server);
    for (const route of SERVED_ROUTES) {
      const response = await fetch(`${origin}${route}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`${route} answered ${response.status}; not saving it`);
      }
      const body = Buffer.from(await response.arrayBuffer());
      if (body.length === 0) {
        throw new Error(`${route} answered empty; not saving it`);
      }
      writeFileSync(path.join(TARGET, route.slice(1)), body);
      console.log(`  Captured ${route} (${body.length} bytes)`);
    }
  } finally {
    server.kill('SIGTERM');
  }
}

moveTree(SOURCE, TARGET);
rmSync(SOURCE, { recursive: true, force: true });

const suffix =
  overwritten > 0 ? ` (${overwritten} replaced an existing asset)` : '';
console.log(`  Moved ${moved} prerendered files into dist/client/${suffix}`);

await captureServedRoutes();
