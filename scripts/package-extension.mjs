#!/usr/bin/env node
/**
 * Packages `extension/` into the ZIP that Chrome, Firefox and Edge accept.
 *
 *   node scripts/package-extension.mjs            # check, then write the zip
 *   node scripts/package-extension.mjs --check    # check only, write nothing
 *
 * **Why this is a script and not `zip -r extension.zip extension/`.** That
 * command produces an archive all three stores reject or mis-ship, in four
 * separate ways, and none of them announce themselves as the cause:
 *
 *   1. It nests every file under `extension/`. Chrome looks for `manifest.json`
 *      at the archive root and reports only "manifest file is missing or
 *      unreadable", which reads like a corrupt upload rather than a wrong
 *      working directory.
 *   2. It ships `STORE_LISTING.md` and `PRIVACY.md` — the submission copy and
 *      its checklist — *inside* the extension delivered to users. Nothing
 *      fails; the files are simply there, downloadable by anyone, forever.
 *   3. It carries `.DS_Store` and anything else the directory has collected.
 *   4. It checks nothing first, and the manifest is where a submission
 *      actually fails. The description limit below had already been exceeded.
 *
 * So the archive is built from an explicit allowlist, with the manifest checked
 * against the store's own limits before a byte is written. A rejected upload
 * costs a day of review queue; a check costs nothing.
 *
 * The ZIP is written by hand out of `node:zlib` rather than with a dependency.
 * The format needed here is the 1989 one — deflated entries, no encryption, no
 * Zip64, no directory entries — and `archiver` plus its tree is a lot of supply
 * chain for three headers. Entries are sorted and stamped with the DOS epoch,
 * so the same input produces byte-identical output and two builds can be
 * compared.
 */

import { deflateRawSync } from 'node:zlib';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'extension');
const OUT_DIR = path.join(ROOT, 'dist/extension');

/**
 * Chrome rejects a manifest `description` longer than this at upload time, so
 * the copy has to be inside it before the file is zipped, not after a rejection.
 *
 * `extension/STORE_LISTING.md` writes its short description to the same number
 * and counts it in the heading. The manifest had drifted to 152 characters
 * against that, which is the whole reason this check exists.
 */
export const MAX_DESCRIPTION = 132;

/** Chrome's cap on the manifest `name`. */
export const MAX_NAME = 75;

/**
 * Exactly the permissions `extension/STORE_LISTING.md` writes a justification
 * for, and exactly the ones its data-usage disclosures answer "No" against.
 *
 * Checked as equality rather than as a subset, in both directions. A permission
 * added here without a justification is a review rejection; the unused
 * `storage` permission was removed on 2026-09-19 for that reason and must not
 * return silently. Adding one is allowed — update this list, the justification
 * section of the listing, and the disclosures together, which is the point.
 */
export const DECLARED_PERMISSIONS = ['webRequest'];

/**
 * Plain codepoint order, used everywhere something is sorted here.
 *
 * Not `localeCompare`: the archive's entry order *is* its byte order, and a
 * locale-aware comparison would reorder entries between machines and break the
 * byte-identical rebuild this script promises.
 */
const ascending = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Extensions of files that belong in a shipped add-on. Markdown does not. */
const SHIPPED_TYPES = new Set(['.json', '.js', '.css', '.html', '.png']);

/**
 * Every file under `extension/` that belongs in the archive, as paths relative
 * to that directory, sorted.
 *
 * Sorted because the archive's entry order is its byte order: unsorted
 * `readdirSync` output varies by filesystem, and two identical checkouts would
 * produce two different zips with no way to tell which was shipped.
 */
export function shippableFiles(root = SOURCE) {
  const found = [];
  const walk = (dir, prefix) => {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      ascending(a.name, b.name),
    );
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), relative);
        continue;
      }
      if (!SHIPPED_TYPES.has(path.extname(entry.name).toLowerCase())) continue;
      found.push(relative);
    }
  };
  walk(root, '');
  return found;
}

/**
 * Every path the manifest points at, so a missing one is caught here rather
 * than as a blank popup after installation.
 */
export function referencedFiles(manifest) {
  const referenced = new Set();
  const add = (value) => {
    if (typeof value === 'string' && value.length > 0) {
      referenced.add(value.replace(/^\//u, ''));
    }
  };
  add(manifest.background?.service_worker);
  add(manifest.action?.default_popup);
  for (const icons of [manifest.icons, manifest.action?.default_icon]) {
    for (const file of Object.values(icons ?? {})) add(file);
  }
  for (const script of manifest.content_scripts ?? []) {
    for (const file of [...(script.js ?? []), ...(script.css ?? [])]) add(file);
  }
  return [...referenced].sort(ascending);
}

/**
 * Everything wrong with this manifest, as a list rather than a throw on the
 * first one. Someone fixing a submission should see all of it in one pass
 * instead of rediscovering the next problem per attempt.
 */
export function problemsWith(manifest, files) {
  const problems = [];
  const present = new Set(files);

  if (manifest.manifest_version !== 3) {
    problems.push(
      `manifest_version is ${JSON.stringify(manifest.manifest_version)}; ` +
        'the stores have stopped accepting anything but 3',
    );
  }

  if (!/^\d+(\.\d+){0,3}$/u.test(manifest.version ?? '')) {
    problems.push(
      `version ${JSON.stringify(manifest.version)} is not one to four ` +
        'dot-separated integers, which is the only shape the stores parse',
    );
  }

  const name = manifest.name ?? '';
  if (name.length === 0) problems.push('name is empty');
  if (name.length > MAX_NAME) {
    problems.push(
      `name is ${name.length} characters; Chrome allows ${MAX_NAME}`,
    );
  }

  const description = manifest.description ?? '';
  if (description.length === 0) problems.push('description is empty');
  if (description.length > MAX_DESCRIPTION) {
    problems.push(
      `description is ${description.length} characters; Chrome rejects ` +
        `anything over ${MAX_DESCRIPTION} at upload. Use the short ` +
        'description from extension/STORE_LISTING.md, which is written to fit.',
    );
  }

  const declared = [...(manifest.permissions ?? [])].sort(ascending);
  const expected = [...DECLARED_PERMISSIONS].sort(ascending);
  if (declared.join(',') !== expected.join(',')) {
    problems.push(
      `permissions are [${declared.join(', ')}] but the store listing ` +
        `justifies [${expected.join(', ')}]. A permission with no ` +
        'justification is a review rejection: update the manifest, the ' +
        'justification section and the disclosures together, then update ' +
        'DECLARED_PERMISSIONS here.',
    );
  }

  for (const file of referencedFiles(manifest)) {
    if (!present.has(file)) {
      problems.push(`the manifest points at ${file}, which is not shipped`);
    }
  }

  return problems;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * The DOS epoch, 1 January 1980, in the packed form the ZIP header wants.
 *
 * A fixed stamp rather than the file's mtime: a checkout's mtimes are the time
 * it was cloned, so real timestamps make the archive differ on every machine
 * for no gain. Nothing reads these dates except an unzip listing.
 */
const DOS_EPOCH_TIME = 0;
const DOS_EPOCH_DATE = 0x21;

/** The unix mode a store-shipped file should carry: a regular file, 0644. */
const UNIX_MODE = 0o100644 * 0x10000;

/** Marks the entry name as UTF-8, which is the only encoding written here. */
const UTF8_NAMES = 0x0800;

/**
 * A ZIP archive of `entries`, each `{ name, data }`, deflated where that is
 * smaller and stored where it is not.
 */
export function zipArchive(entries) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const deflated = deflateRawSync(data, { level: 9 });
    // Deflate expands incompressible input. PNG icons are already deflated, so
    // storing them keeps the archive smaller than compressing it would.
    const compress = deflated.length < data.length;
    const body = compress ? deflated : data;
    const method = compress ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed: 2.0, for deflate
    local.writeUInt16LE(UTF8_NAMES, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_EPOCH_TIME, 10);
    local.writeUInt16LE(DOS_EPOCH_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // no extra field
    locals.push(local, nameBytes, body);

    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(0x0314, 4); // made by: unix, 2.0
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(UTF8_NAMES, 8);
    directory.writeUInt16LE(method, 10);
    directory.writeUInt16LE(DOS_EPOCH_TIME, 12);
    directory.writeUInt16LE(DOS_EPOCH_DATE, 14);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(body.length, 20);
    directory.writeUInt32LE(data.length, 24);
    directory.writeUInt16LE(nameBytes.length, 28);
    directory.writeUInt16LE(0, 30); // no extra field
    directory.writeUInt16LE(0, 32); // no comment
    directory.writeUInt16LE(0, 34); // disk 0
    directory.writeUInt16LE(0, 36); // internal attributes
    directory.writeUInt32LE(UNIX_MODE, 38);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, nameBytes);

    offset += local.length + nameBytes.length + body.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // this disk
  end.writeUInt16LE(0, 6); // disk holding the directory
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // no archive comment

  return Buffer.concat([...locals, directory, end]);
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const files = shippableFiles();
  const manifest = JSON.parse(
    readFileSync(path.join(SOURCE, 'manifest.json'), 'utf8'),
  );

  const problems = problemsWith(manifest, files);
  if (problems.length > 0) {
    console.error('\n  package-extension: the manifest is not submittable\n');
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error('');
    process.exit(1);
  }

  const skipped = readdirSync(SOURCE, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        !SHIPPED_TYPES.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name);

  console.log(`  manifest ${manifest.version} — ${manifest.name}`);
  console.log(
    `  description ${manifest.description.length}/${MAX_DESCRIPTION}`,
  );
  for (const file of files) console.log(`    + ${file}`);
  for (const file of skipped) console.log(`    - ${file} (not shipped)`);

  if (checkOnly) {
    console.log('\n  --check: nothing written\n');
    return;
  }

  const archive = zipArchive(
    files.map((name) => ({
      name,
      data: readFileSync(path.join(SOURCE, name)),
    })),
  );

  mkdirSync(OUT_DIR, { recursive: true });
  const out = path.join(OUT_DIR, `opentools-extension-${manifest.version}.zip`);
  writeFileSync(out, archive);
  console.log(
    `\n  ${path.relative(ROOT, out)} — ${files.length} files, ` +
      `${(archive.length / 1024).toFixed(1)} KB\n`,
  );
}

/**
 * Only package when run as a command. The test imports the checks above, and an
 * import that also wrote a zip would make `npm test` produce release artifacts.
 */
const runAsCommand =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runAsCommand) main();
