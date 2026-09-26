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

import { freePort, isPortCollision } from './free-port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'dist/server/prerendered-routes');
const TARGET = path.join(ROOT, 'dist/client');

const SERVED_ROUTES = [
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
  /*
    The what's-new feed. A route handler, so vinext's prerender skips it (see
    note 2 above) and without this line the Worker renders the same nine items
    on every poll -- and feed readers poll on a timer forever, unprompted. It is
    static content by nature: captured here, it is served as an asset like the
    page it belongs to.
  */
  '/whats-new/feed.xml',
];
/**
 * How many times to re-pick a port before giving up.
 *
 * A fixed port was the original design and it broke: several worktrees build at
 * once, `8791` was hardcoded, and on 2026-09-21 one lane's build killed
 * another's with nothing but "wrangler dev exited with 1". The port is chosen
 * by the OS now, but the gap between asking for a free port and wrangler
 * binding it is still a gap — another process can take it in between — so a
 * collision is retried rather than treated as a build failure.
 */
const CAPTURE_PORT_ATTEMPTS = 5;

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

async function waitForServer(url, server, stderr) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      // The reason used to be discarded with `stdio: 'ignore'`, so this failure
      // read as "exited with 1" and said nothing about why. Whatever wrangler
      // complained about is far more useful than the exit code.
      const reason = stderr().trim().split('\n').slice(-6).join('\n');
      const error = new Error(
        `wrangler dev exited with ${server.exitCode} before it served anything` +
          (reason ? `:\n${reason}` : ''),
      );
      error.stderr = reason;
      throw error;
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
  for (let attempt = 1; ; attempt += 1) {
    const port = await freePort();
    let captured = '';
    const server = spawn(
      path.join(ROOT, 'node_modules/.bin/wrangler'),
      ['dev', '--config', 'dist/server/wrangler.json', '--port', String(port)],
      { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] },
    );
    server.stderr.setEncoding('utf8');
    server.stderr.on('data', (chunk) => {
      captured += chunk;
    });
    const origin = `http://127.0.0.1:${port}`;

    try {
      await waitForServer(`${origin}/robots.txt`, server, () => captured);
    } catch (error) {
      server.kill('SIGTERM');
      if (isPortCollision(error) && attempt < CAPTURE_PORT_ATTEMPTS) {
        console.log(
          `  Port ${port} was taken before wrangler could bind it; ` +
            `retrying (${attempt} of ${CAPTURE_PORT_ATTEMPTS}).`,
        );
        continue;
      }
      throw error;
    }
    return captureFrom(origin, server);
  }
}

/** Saves each served route to disk, then always stops the server. */
async function captureFrom(origin, server) {
  try {
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
      /*
        Every served route was a top-level file until `/whats-new/feed.xml`, so
        this wrote straight into `dist/client` and ENOENT'd on the first nested
        one. The directory is created here rather than in the list above so the
        next nested route added costs nobody a debugging session.
      */
      const destination = path.join(TARGET, route.slice(1));
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, body);
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
