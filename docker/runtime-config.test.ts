import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// A plain .mjs script, imported for its one pure function. TypeScript infers the
// shape from the source, so no declaration file can drift from it.
import { runtimeConfig } from './runtime-config.mjs';

const ROOT = path.join(__dirname, '..');
const read = (relative: string) =>
  readFileSync(path.join(ROOT, relative), 'utf8');

/**
 * These tests exist because of a specific, shipped failure, and each one fails
 * on a different way of reintroducing it.
 *
 * The self-host access gate lives in `proxy.ts`. `vinext build` emits
 * `assets: {directory: '../client'}` with no `run_worker_first`, and Wrangler's
 * default with a `main` AND `assets` is to serve a matching static file without
 * ever reaching the Worker. Every route is prerendered, so that was every real
 * page: a container started with OPENTOOLS_AUTH_USER and OPENTOOLS_AUTH_PASSWORD
 * answered `/`, `/self-host`, `/pdf/compress` and `/robots.txt` with 200 and no
 * credentials, and returned 401 only for paths that had no file.
 *
 * A unit test of the gate itself cannot catch that — `self-host-auth.test.ts`
 * passed the whole time it was broken, because the defect was that nothing ever
 * called it. So what is guarded here is the wiring: the rewrite, the script that
 * uses it, and the image that has to contain it.
 */
describe('the runtime Wrangler config', () => {
  const built = {
    name: 'local-tools-canary',
    main: 'index.js',
    assets: { directory: '../client' },
    build: { watch_dir: './src' },
    kv_namespaces: [{ binding: 'VINEXT_KV_CACHE', id: 'abc' }],
  };

  it('puts the Worker ahead of the asset server when asked', () => {
    expect(runtimeConfig(built, '/app/dist/server', { runWorkerFirst: true }).assets.run_worker_first).toBe(
      true,
    );
  });

  it('resolves the paths, because the copy does not live beside the build', () => {
    const gated = runtimeConfig(built, '/app/dist/server');
    expect(gated.assets.directory).toBe('/app/dist/client');
    expect(gated.main).toBe('/app/dist/server/index.js');
  });

  it('leaves the asset server in front by default', () => {
    // An unconditional `run_worker_first` would route every request on every
    // self-hosted instance through the Worker and undo the prerendering that
    // fixed the 503s. Only a gated instance pays that.
    expect(
      runtimeConfig(built, '/app/dist/server').assets.run_worker_first,
    ).toBeUndefined();
  });

  it('drops only `build`, and changes nothing else', () => {
    const gated = runtimeConfig(built, '/app/dist/server');
    expect(gated.build).toBeUndefined();
    expect(gated.kv_namespaces).toEqual(built.kv_namespaces);
    expect(gated.name).toBe(built.name);
  });

  it('does not mutate what it was given', () => {
    const input = structuredClone(built);
    runtimeConfig(input, '/app/dist/server');
    expect(input).toEqual(built);
  });

  it('rewrites the real built config when one is present', () => {
    // Skipped rather than failed on a tree with no build: `npm run qc` builds
    // first, and a unit run on a clean checkout should not be red for that.
    let source: string;
    try {
      source = read('dist/server/wrangler.json');
    } catch {
      return;
    }
    const gated = runtimeConfig(JSON.parse(source), '/app/dist/server', {
      runWorkerFirst: true,
    });
    expect(gated.assets.run_worker_first).toBe(true);
    expect(path.isAbsolute(gated.main)).toBe(true);
  });
});

describe('the container actually uses it', () => {
  it('start.sh runs the rewrite', () => {
    // The first version of this change shipped the rewriter and never called it,
    // so the container stayed ungated while every unit test passed.
    expect(read('docker/start.sh')).toContain('runtime-config.mjs');
  });

  it('start.sh passes the chosen config to wrangler, not a fixed path', () => {
    const start = read('docker/start.sh');
    expect(start).toMatch(/--config\s+"\$CONFIG"/u);
    expect(start).not.toMatch(/--config\s+\/app\/dist\/server\/wrangler\.json/u);
  });

  it('worker-first is conditional on a gate being configured', () => {
    // The rewrite itself always runs -- nothing may write under /app. It is the
    // `--run-worker-first` flag that must stay conditional, or every instance
    // loses the prerendering that fixed the 503s.
    const start = read('docker/start.sh');
    expect(start).toContain('--run-worker-first');
    for (const variable of [
      'OPENTOOLS_AUTH_USER',
      'OPENTOOLS_AUTH_PASSWORD',
      'OPENTOOLS_AUTH_TRUSTED_HEADER',
      'OPENTOOLS_AUTH_PROXY_SECRET',
    ]) {
      expect(
        start.includes(`\${${variable}:-}`),
        `${variable} is not in the condition that turns the rewrite on`,
      ).toBe(true);
    }
  });

  it('the runtime image contains the rewrite', () => {
    // `COPY . .` in the build stage is not enough: the runtime stage copies
    // named paths, so a script left out of it is missing where it is needed.
    const dockerfile = read('Dockerfile');
    const runtime = dockerfile.slice(dockerfile.lastIndexOf('FROM '));
    expect(runtime).toContain('docker/runtime-config.mjs');
  });

  it('compose does not mount anything over the config directory', () => {
    // `tmpfs: /app/dist/server` hid `wrangler.json`, and the Worker crash-looped
    // on ENOENT -- `docker compose up -d`, the documented first command, never
    // came up. Proved against the real image before this line existed.
    const compose = read('docker-compose.yml');
    const mounts = compose
      .split('\n')
      .filter((line) => /^\s*-\s*\/\S/u.test(line))
      .map((line) => line.replace(/^\s*-\s*/u, '').trim());
    for (const mount of mounts) {
      expect(
        mount.startsWith('/app'),
        `compose mounts ${mount}, which would hide what the image put there`,
      ).toBe(false);
    }
  });

  it('forwards every variable the gate reads', () => {
    // Container environment is not visible inside workerd, so a variable the
    // auth module reads and start.sh does not forward is one the operator sets
    // and nothing acts on — an instance they believe is gated and is not.
    const auth = read('lib/security/self-host-auth.ts');
    const proxy = read('proxy.ts');
    const start = read('docker/start.sh');
    const read_names = new Set(
      [...`${auth}${proxy}`.matchAll(/env\.(OPENTOOLS_[A-Z_]+)/gu)].map(
        (match) => match[1],
      ),
    );
    expect(read_names.size).toBeGreaterThan(3);
    for (const name of read_names) {
      expect(start.includes(name), `${name} is never forwarded by start.sh`).toBe(
        true,
      );
    }
  });
});
