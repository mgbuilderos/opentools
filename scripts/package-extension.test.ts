import { readFileSync } from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import {
  DECLARED_PERMISSIONS,
  MAX_DESCRIPTION,
  problemsWith,
  referencedFiles,
  shippableFiles,
  zipArchive,
} from './package-extension.mjs';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(
  readFileSync(path.join(root, 'extension/manifest.json'), 'utf8'),
) as Record<string, unknown>;

/**
 * The short description the store listing tells you to paste, pulled out of the
 * document rather than repeated here — a copy in the test would pass while the
 * two files it is comparing had drifted apart.
 */
function shortDescriptionFromListing(): string {
  const listing = readFileSync(
    path.join(root, 'extension/STORE_LISTING.md'),
    'utf8',
  );
  const block = /## Short description[^\n]*\n+```\n([\s\S]*?)\n```/u.exec(
    listing,
  );
  if (!block)
    throw new Error('STORE_LISTING.md has no short description block');
  return block[1].trim();
}

describe('the shipped extension is submittable', () => {
  /**
   * The regression this exists for: the manifest carried a 152-character
   * description against Chrome's limit of 132, so the first upload attempt
   * would have been rejected — months into a repository where the store copy
   * was recorded as finished. Nothing in the build read the manifest, so
   * nothing said so.
   */
  it('has nothing wrong with it', () => {
    expect(problemsWith(manifest, shippableFiles())).toEqual([]);
  });

  it('keeps the description inside the limit Chrome enforces', () => {
    expect(String(manifest.description).length).toBeLessThanOrEqual(
      MAX_DESCRIPTION,
    );
  });

  /**
   * The manifest description *is* the store's short description, so the two
   * being different copy is the bug rather than a tidiness matter: whichever
   * one someone reads, the other is what users see.
   */
  it('ships exactly the copy the store listing writes', () => {
    expect(manifest.description).toBe(shortDescriptionFromListing());
  });

  it('declares only the permissions the listing justifies', () => {
    expect(manifest.permissions).toEqual(DECLARED_PERMISSIONS);
  });
});

describe('choosing what goes in the archive', () => {
  const files = shippableFiles();

  /**
   * Chrome reads `manifest.json` from the archive root. `zip -r` would nest it
   * under `extension/` and the upload fails with "manifest file is missing or
   * unreadable", which does not point at the cause.
   */
  it('puts the manifest at the root', () => {
    expect(files).toContain('manifest.json');
    expect(files.every((file) => !file.startsWith('extension/'))).toBe(true);
  });

  it('ships the icons and the popup', () => {
    expect(files).toContain('icons/icon-128.png');
    expect(files).toContain('popup.html');
    expect(files).toContain('background.js');
  });

  /**
   * `STORE_LISTING.md` is the submission copy and its checklist, and
   * `PRIVACY.md` is a policy served from GitHub. Neither belongs inside the
   * add-on that users download.
   */
  it('ships no markdown', () => {
    expect(files.filter((file) => file.endsWith('.md'))).toEqual([]);
  });

  it('is sorted, so two builds agree on byte order', () => {
    expect(files).toEqual([...files].sort((a, b) => (a < b ? -1 : 1)));
  });
});

describe('the manifest checks', () => {
  const ok = {
    manifest_version: 3,
    version: '1.0.0',
    name: 'Fine',
    description: 'Short enough.',
    permissions: ['webRequest'],
    action: { default_popup: 'popup.html' },
  };
  const present = ['manifest.json', 'popup.html'];

  it('passes a manifest with nothing wrong', () => {
    expect(problemsWith(ok, present)).toEqual([]);
  });

  it('rejects a description over the limit, and says the number', () => {
    const problems = problemsWith(
      { ...ok, description: 'x'.repeat(MAX_DESCRIPTION + 1) },
      present,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(String(MAX_DESCRIPTION + 1));
    expect(problems[0]).toContain('STORE_LISTING.md');
  });

  /**
   * The `storage` permission was removed on 2026-09-19 because nothing used it.
   * A permission with no justification in the listing is a review rejection, so
   * one coming back has to fail here rather than at the store.
   */
  it('rejects a permission the listing does not justify', () => {
    const problems = problemsWith(
      { ...ok, permissions: ['webRequest', 'storage'] },
      present,
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('storage');
  });

  it('rejects dropping a declared permission too', () => {
    expect(problemsWith({ ...ok, permissions: [] }, present)).toHaveLength(1);
  });

  it('rejects manifest v2, which the stores no longer accept', () => {
    const problems = problemsWith({ ...ok, manifest_version: 2 }, present);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('manifest_version');
  });

  it('rejects a version string the stores cannot parse', () => {
    expect(
      problemsWith({ ...ok, version: '1.0.0-rc.1' }, present),
    ).toHaveLength(1);
    expect(problemsWith({ ...ok, version: '' }, present)).toHaveLength(1);
  });

  it('rejects a file the manifest points at but does not ship', () => {
    const problems = problemsWith(ok, ['manifest.json']);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('popup.html');
  });

  /**
   * All of them at once, because someone fixing a submission should see the
   * whole list rather than rediscover the next problem on each attempt.
   */
  it('reports every problem in one pass', () => {
    expect(
      problemsWith(
        {
          manifest_version: 2,
          version: 'one',
          name: '',
          description: '',
          permissions: ['storage'],
        },
        [],
      ).length,
    ).toBeGreaterThan(4);
  });
});

describe('finding what the manifest points at', () => {
  it('collects icons, popup and service worker', () => {
    expect(
      referencedFiles({
        background: { service_worker: 'background.js' },
        action: {
          default_popup: 'popup.html',
          default_icon: { 32: 'icons/icon-32.png' },
        },
        icons: { 128: 'icons/icon-128.png' },
      }),
    ).toEqual([
      'background.js',
      'icons/icon-128.png',
      'icons/icon-32.png',
      'popup.html',
    ]);
  });

  it('reads a leading slash the same as no slash', () => {
    expect(referencedFiles({ icons: { 16: '/icons/a.png' } })).toEqual([
      'icons/a.png',
    ]);
  });

  it('is empty for a manifest that points at nothing', () => {
    expect(referencedFiles({})).toEqual([]);
  });
});

/**
 * Reads an archive back out of its central directory, the way an unzipper does,
 * rather than trusting the writer's own bookkeeping. The archive this produces
 * was also checked against Info-ZIP and Python's `zipfile` when it was written;
 * this keeps that from silently regressing.
 *
 * `DataView` rather than `Buffer.readUInt32LE`: Node's Buffer methods are not
 * visible in this project's TypeScript, and a view is explicit that every field
 * in this format is little-endian.
 */
function readArchive(archive: Uint8Array) {
  const view = new DataView(
    archive.buffer,
    archive.byteOffset,
    archive.byteLength,
  );
  const signatureAt = (offset: number) => view.getUint32(offset, true);

  let end = archive.byteLength - 22;
  while (end >= 0 && signatureAt(end) !== 0x06054b50) end -= 1;
  expect(end, 'no end-of-central-directory record').toBeGreaterThanOrEqual(0);

  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();

  const entries: { name: string; data: Uint8Array }[] = [];
  for (let index = 0; index < count; index += 1) {
    expect(signatureAt(cursor)).toBe(0x02014b50);
    const method = view.getUint16(cursor + 10, true);
    const compressed = view.getUint32(cursor + 20, true);
    const uncompressed = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localAt = view.getUint32(cursor + 42, true);
    const name = decoder.decode(
      archive.subarray(cursor + 46, cursor + 46 + nameLength),
    );

    expect(signatureAt(localAt)).toBe(0x04034b50);
    const bodyAt =
      localAt +
      30 +
      view.getUint16(localAt + 26, true) +
      view.getUint16(localAt + 28, true);
    const body = archive.subarray(bodyAt, bodyAt + compressed);
    const data =
      method === 8 ? new Uint8Array(inflateRawSync(body)) : body.slice();
    expect(data.byteLength, `${name} has the wrong length`).toBe(uncompressed);

    entries.push({ name, data });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

describe('the archive it writes', () => {
  const input = [
    { name: 'manifest.json', data: Buffer.from('{"manifest_version":3}') },
    // Long and repetitive, so deflate is the smaller branch.
    { name: 'popup.js', data: Buffer.from('x'.repeat(4096)) },
    // Two bytes: deflate would expand this, so the stored branch is taken.
    { name: 'icons/tiny.png', data: Buffer.from([0x89, 0x50]) },
  ];

  it('round-trips every entry through its central directory', () => {
    const entries = readArchive(zipArchive(input));
    expect(entries.map((entry) => entry.name)).toEqual(
      input.map((entry) => entry.name),
    );
    for (const [index, entry] of entries.entries()) {
      expect([...entry.data]).toEqual([...input[index].data]);
    }
  });

  it('stores what deflate would make bigger and deflates the rest', () => {
    const archive = zipArchive(input);
    expect(archive.length).toBeLessThan(
      input.reduce((total, entry) => total + entry.data.length, 0),
    );
    expect(readArchive(archive)[2].data).toHaveLength(2);
  });

  it('is byte-identical when built twice', () => {
    expect([...zipArchive(input)]).toEqual([...zipArchive(input)]);
  });

  it('writes a readable empty archive', () => {
    expect(readArchive(zipArchive([]))).toEqual([]);
  });

  it('round-trips the real extension', () => {
    const files = shippableFiles();
    const entries = readArchive(
      zipArchive(
        files.map((name) => ({
          name,
          data: readFileSync(path.join(root, 'extension', name)),
        })),
      ),
    );
    expect(entries.map((entry) => entry.name)).toEqual(files);
    expect(
      JSON.parse(
        new TextDecoder().decode(
          entries.find((entry) => entry.name === 'manifest.json')!.data,
        ),
      ).manifest_version,
    ).toBe(3);
  });
});
