#!/usr/bin/env node
/**
 * Compare two builds and say what actually differs.
 *
 * WHY THIS EXISTS. `diff -r` on two `dist/` trees is unreadable, because a
 * chunk's filename is a hash of its content and rolldown folds that hash into
 * every chunk that imports it. One changed byte in a shared chunk renames it,
 * which renames its importers, which renames theirs. On 2026-09-30 a dependency
 * change that ships nothing read as 111 of 257 renamed chunks, and the reviewer
 * who measured it reasonably concluded the change was enormous. On the 1 MB
 * `catalog` chunk the real difference was 8 bytes out of 1,004,022, all of them
 * inside the embedded `app-shell-<hash>.js` filename.
 *
 * The cause was the build ID falling back to a random UUID on a dirty tree, and
 * that is fixed (`lib/build/build-inputs.ts`). This script is the other half:
 * even with the ID stable, any real change to a shared chunk renames its
 * importers, and a reviewer still needs to see past the renaming to the change.
 *
 * WHAT IT DOES. Pairs the two trees file by file, normalising hashed filenames
 * away -- `app-shell-DEVbjwrW.js` and `app-shell-BkdQ3zW8.js` become the same
 * name, in the file list and inside file bodies -- then reports four things:
 * byte-identical, renamed but identical once normalised, genuinely different,
 * and present on one side only.
 *
 * It pairs by content, not by normalised name. That matters: this build emits
 * five chunks called `kernel-<hash>.js`, four called `metadata-<hash>.js`, three
 * `pdf-<hash>.js` and three `image-<hash>.js`. Normalising their names collapses
 * each group to one key, and a comparison keyed on that name compares chunks
 * that have nothing to do with each other. That, not build noise, is why an
 * earlier hand-rolled normalisation reported three chunks (`pdf`, `vinext`,
 * `qr-barcode`) as differing "between two builds of the same tree". Two of the
 * three were collisions; `vinext-<hash>.js` was the real one -- it carries the
 * RSC compatibility id.
 *
 * Only the filenames this build actually emitted are treated as hashes, so a
 * name like `ort-wasm-simd-threaded.mjs` is never mistaken for one.
 *
 * `dist/server/.wrangler/` is skipped: local Miniflare state, not part of the
 * upload, with SQLite `-wal`/`-shm` files that differ on every run.
 *
 * USAGE
 *   cp -r dist /tmp/before   # build, then
 *   cp -r dist /tmp/after    # build again
 *   node scripts/diff-dist.mjs /tmp/before /tmp/after
 *
 *   --max=<n>   how many differing files to describe (default 20)
 *
 * Exit code 0 means the two trees are the same build: nothing added, nothing
 * removed, and nothing differing once hashed filenames are normalised. 1 means
 * something really changed, and the report says what.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const HASHED = /^(?<stem>.+)-(?<hash>[A-Za-z0-9_-]{8})\.(?<ext>js|mjs|css)$/;
const SKIP = ['server/.wrangler'];

function walk(root, prefix = '') {
  const out = [];
  for (const entry of readdirSync(path.join(root, prefix), {
    withFileTypes: true,
  })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (SKIP.some((skip) => rel === skip || rel.startsWith(`${skip}/`)))
      continue;
    if (entry.isDirectory()) out.push(...walk(root, rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

/**
 * `chunks/app-shell-DEVbjwrW.js` -> `chunks/app-shell-<hash>.js`, but only for
 * the build's own hashed output, which all lands under `_next/`. A static asset
 * copied from `public/` keeps its name even when it happens to end in eight
 * innocent characters -- `ort/ort-wasm-simd-threaded.mjs` is one.
 */
function normaliseName(file) {
  if (!file.includes('_next/')) return file;
  const dir = path.dirname(file);
  const name = normaliseBasename(path.basename(file));
  return dir === '.' ? name : `${dir}/${name}`;
}

function normaliseBasename(base) {
  const match = HASHED.exec(base);
  return match ? `${match.groups.stem}-<hash>.${match.groups.ext}` : base;
}

/**
 * The basenames this build hashed, so a body reference is only normalised when
 * it names a file that really exists on one side or the other.
 */
function hashedBasenames(trees) {
  const names = new Set();
  for (const { files } of trees)
    for (const file of files) {
      if (!file.includes('_next/')) continue;
      const base = path.basename(file);
      if (HASHED.test(base)) names.add(base);
    }
  return names;
}

const REFERENCE = /[A-Za-z0-9_.$-]+\.(?:js|mjs|css)/g;

function normaliseBody(bytes, known) {
  // Only text can carry a filename reference, and only JS, CSS, HTML, JSON and
  // the RSC payloads do here. Binary assets are compared byte for byte.
  const text = bytes.toString('utf8');
  if (!text.includes('.js') && !text.includes('.css') && !text.includes('.mjs'))
    return bytes;
  return Buffer.from(
    text.replace(REFERENCE, (match) =>
      known.has(match) ? normaliseBasename(match) : match,
    ),
    'utf8',
  );
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function read(root, files, known) {
  const entries = new Map();
  for (const file of files) {
    const bytes = readFileSync(path.join(root, file));
    entries.set(file, {
      file,
      size: bytes.length,
      raw: sha(bytes),
      normalised: sha(normaliseBody(bytes, known)),
      normalisedName: normaliseName(file),
    });
  }
  return entries;
}

/** First differing offset and a window around it, for the report. */
function firstDifference(a, b) {
  const limit = Math.min(a.length, b.length);
  let at = 0;
  while (at < limit && a[at] === b[at]) at += 1;
  let differing = 0;
  for (let i = 0; i < limit; i += 1) if (a[i] !== b[i]) differing += 1;
  differing += Math.abs(a.length - b.length);
  const from = Math.max(0, at - 40);
  return {
    at,
    differing,
    before: a.subarray(from, at + 48).toString('utf8'),
    after: b.subarray(from, at + 48).toString('utf8'),
  };
}

function main() {
  const args = process.argv.slice(2);
  const max = Number(
    args.find((arg) => arg.startsWith('--max='))?.slice('--max='.length) ?? 20,
  );
  const dirs = args.filter((arg) => !arg.startsWith('--'));
  if (dirs.length !== 2) {
    process.stderr.write(
      'usage: node scripts/diff-dist.mjs <before> <after> [--max=20]\n',
    );
    process.exit(2);
  }
  for (const dir of dirs) {
    if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
      process.stderr.write(`[DIFF DIST] not a directory: ${dir}\n`);
      process.exit(2);
    }
  }

  const trees = dirs.map((root) => ({ root, files: walk(root) }));
  const known = hashedBasenames(trees);
  const [before, after] = trees.map(({ root, files }) =>
    read(root, files, known),
  );

  const identical = [];
  const hashesOnly = [];
  const changed = [];
  const removed = [];
  const added = new Map(after);

  // Pair on the exact path first, then on the normalised name, matching equal
  // content before unequal so a group of same-stem chunks pairs up correctly.
  for (const entry of before.values()) {
    const samePath = after.get(entry.file);
    if (samePath && samePath.raw === entry.raw) {
      identical.push(entry);
      added.delete(entry.file);
      continue;
    }
    const candidates = [...added.values()].filter(
      (other) => other.normalisedName === entry.normalisedName,
    );
    const match =
      candidates.find((other) => other.normalised === entry.normalised) ??
      candidates[0];
    if (!match) {
      removed.push(entry);
      continue;
    }
    added.delete(match.file);
    if (match.normalised !== entry.normalised) changed.push([entry, match]);
    else hashesOnly.push([entry, match]);
  }

  const renamed = hashesOnly.filter(
    ([left, right]) => left.file !== right.file,
  );
  const rows = [
    ['byte-identical', identical.length],
    ['identical once hashed filenames are normalised', hashesOnly.length],
    ['content differs', changed.length],
    [`only in ${dirs[0]}`, removed.length],
    [`only in ${dirs[1]}`, added.size],
  ];
  process.stdout.write(
    `[DIFF DIST] ${before.size} files in ${dirs[0]}, ${after.size} in ${dirs[1]}\n`,
  );
  for (const [label, count] of rows)
    process.stdout.write(`  ${String(count).padStart(6)}  ${label}\n`);

  if (changed.length > 0) {
    process.stdout.write('\n  content differs:\n');
    for (const [left, right] of changed.slice(0, max)) {
      const a = readFileSync(path.join(dirs[0], left.file));
      const b = readFileSync(path.join(dirs[1], right.file));
      const { at, differing, before: was, after: now } = firstDifference(a, b);
      process.stdout.write(
        `    ${left.normalisedName}  ${left.size} -> ${right.size} bytes, ` +
          `${differing} differing, first at ${at}\n` +
          `      - ${JSON.stringify(was)}\n` +
          `      + ${JSON.stringify(now)}\n`,
      );
    }
    if (changed.length > max)
      process.stdout.write(`    ... and ${changed.length - max} more\n`);
  }
  const listOnlyIn = (label, list) => {
    if (list.length === 0) return;
    process.stdout.write(`\n  only in ${label}:\n`);
    for (const file of list.slice(0, max))
      process.stdout.write(`    ${file}\n`);
    if (list.length > max)
      process.stdout.write(`    ... and ${list.length - max} more\n`);
  };
  listOnlyIn(
    dirs[0],
    removed.map((entry) => entry.file),
  );
  listOnlyIn(dirs[1], [...added.keys()]);

  const same = changed.length === 0 && removed.length === 0 && added.size === 0;
  process.stdout.write(
    same
      ? `\n[DIFF DIST] Same build.${
          hashesOnly.length > 0
            ? ` ${hashesOnly.length} files differ only in the hashed filenames` +
              ` they carry, ${renamed.length} of them renamed. No code differs.`
            : ''
        }\n`
      : '\n[DIFF DIST] These are different builds.\n',
  );
  process.exit(same ? 0 : 1);
}

main();
