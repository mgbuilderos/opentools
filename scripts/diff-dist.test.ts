import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const appRoot = path.resolve(import.meta.dirname, '..');
const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/** A throwaway `dist/`-shaped tree: `{ 'client/x.js': 'body' }`. */
function tree(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'diff-dist-'));
  scratch.push(root);
  for (const [file, body] of Object.entries(files)) {
    mkdirSync(path.join(root, path.dirname(file)), { recursive: true });
    writeFileSync(path.join(root, file), body);
  }
  return root;
}

function diff(before: string, after: string) {
  const run = spawnSync(
    process.execPath,
    [path.join(appRoot, 'scripts/diff-dist.mjs'), before, after],
    { cwd: appRoot, encoding: 'utf8' },
  );
  return { status: run.status, out: run.stdout + run.stderr };
}

const CHUNKS = 'client/_next/static/chunks';

describe('comparing two builds', () => {
  it('calls a tree the same build as itself', () => {
    const only = tree({ [`${CHUNKS}/catalog-11111111.js`]: 'body' });
    const { status, out } = diff(only, only);
    expect(out).toContain('Same build.');
    expect(status).toBe(0);
  });

  /**
   * The case the whole script exists for. A chunk's name is a hash of its
   * content and rolldown folds that hash into every importer, so one changed
   * byte renames a cascade. Here nothing changed but the names.
   */
  it('sees through a rename cascade', () => {
    const before = tree({
      [`${CHUNKS}/catalog-11111111.js`]: 'import "./app-shell-AAAAAAAA.js";',
      [`${CHUNKS}/app-shell-AAAAAAAA.js`]: 'import "./catalog-11111111.js";',
      'client/index.html':
        '<script src="/chunks/catalog-11111111.js"></script>',
    });
    const after = tree({
      [`${CHUNKS}/catalog-22222222.js`]: 'import "./app-shell-BBBBBBBB.js";',
      [`${CHUNKS}/app-shell-BBBBBBBB.js`]: 'import "./catalog-22222222.js";',
      'client/index.html':
        '<script src="/chunks/catalog-22222222.js"></script>',
    });
    const { status, out } = diff(before, after);
    expect(out).toContain('3  identical once hashed filenames are normalised');
    expect(out).toContain('2 of them renamed');
    expect(out).toContain('Same build.');
    expect(status).toBe(0);
  });

  /**
   * Normalising names alone collapses the five `kernel-<hash>.js` chunks this
   * build emits, and the four `metadata-<hash>.js`, into one key each -- which
   * is how an earlier hand-rolled normalisation came to report `pdf` and
   * `qr-barcode` as differing between two builds of the same tree. They were
   * name collisions. Pairing has to go by content.
   */
  it('pairs same-stem chunks by content, not by their collapsed name', () => {
    const bodies = ['alpha', 'beta', 'gamma'];
    const before = tree({
      [`${CHUNKS}/pdf-AAAAAAAA.js`]: bodies[0],
      [`${CHUNKS}/pdf-BBBBBBBB.js`]: bodies[1],
      [`${CHUNKS}/pdf-CCCCCCCC.js`]: bodies[2],
    });
    const after = tree({
      [`${CHUNKS}/pdf-DDDDDDDD.js`]: bodies[2],
      [`${CHUNKS}/pdf-EEEEEEEE.js`]: bodies[0],
      [`${CHUNKS}/pdf-FFFFFFFF.js`]: bodies[1],
    });
    const { status, out } = diff(before, after);
    expect(out).toContain('0  content differs');
    expect(status).toBe(0);
  });

  it('reports a real change, with where it is', () => {
    const before = tree({ [`${CHUNKS}/catalog-11111111.js`]: 'const a = 1;' });
    const after = tree({ [`${CHUNKS}/catalog-22222222.js`]: 'const a = 2;' });
    const { status, out } = diff(before, after);
    expect(out).toContain('1  content differs');
    expect(out).toContain('catalog-<hash>.js');
    expect(out).toContain('These are different builds.');
    expect(status).toBe(1);
  });

  it('does not mistake an unhashed name for a hashed one', () => {
    // `-threaded` is eight characters, and this file is not a build chunk.
    const before = tree({ 'client/ort/ort-wasm-simd-threaded.mjs': 'one' });
    const after = tree({ 'client/ort/ort-wasm-simd-threaded.mjs': 'two' });
    const { out } = diff(before, after);
    expect(out).toContain('ort-wasm-simd-threaded.mjs');
    expect(out).not.toContain('ort-wasm-simd-<hash>.mjs');
  });

  it('ignores dist/server/.wrangler, which is local Miniflare state', () => {
    const before = tree({
      'client/index.html': 'page',
      'server/.wrangler/state/v3/db.sqlite-wal': 'one',
    });
    const after = tree({
      'client/index.html': 'page',
      'server/.wrangler/state/v3/db.sqlite-wal': 'two',
    });
    expect(diff(before, after).status).toBe(0);
  });

  it('reports a file that only one side has', () => {
    const before = tree({ 'client/index.html': 'page' });
    const after = tree({
      'client/index.html': 'page',
      'client/extra.html': 'new',
    });
    const { status, out } = diff(before, after);
    expect(out).toContain('client/extra.html');
    expect(status).toBe(1);
  });

  it('explains itself rather than guessing when the arguments are wrong', () => {
    const run = spawnSync(
      process.execPath,
      [path.join(appRoot, 'scripts/diff-dist.mjs')],
      { cwd: appRoot, encoding: 'utf8' },
    );
    expect(run.status).toBe(2);
    expect(run.stderr).toContain('usage:');
  });
});
