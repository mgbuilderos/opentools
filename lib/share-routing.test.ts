import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  SHARE_KINDS,
  SHARE_ROUTES,
  shareDestinationFor,
  shareKindFor,
  withHandoffFlag,
} from './share-routing';

const projectRoot = path.resolve(import.meta.dirname, '..');
const worker = readFileSync(path.join(projectRoot, 'public/sw.js'), 'utf8');
const manifest = JSON.parse(
  readFileSync(path.join(projectRoot, 'public/site.webmanifest'), 'utf8'),
) as {
  start_url: string;
  scope: string;
  display: string;
  icons: { src: string; sizes: string }[];
  share_target?: {
    action: string;
    method: string;
    enctype: string;
    params: { files: { name: string; accept: string[] }[] };
  };
  file_handlers?: { action: string; accept: Record<string, string[]> }[];
  shortcuts?: { name: string; url: string }[];
};

/** A route is real when the app has a page for it. */
function routeExists(destination: string): boolean {
  const pathname = destination.split('?')[0].replace(/^\/+|\/+$/gu, '');
  const app = path.join(projectRoot, 'app', pathname);
  return existsSync(path.join(app, 'page.tsx')) || existsSync(`${app}.tsx`);
}

describe('share routing', () => {
  it('sorts a file by extension even when the type is unhelpful', () => {
    // The case the share target exists for: Android hands over a document
    // from a chat app with no usable MIME type at all.
    expect(shareKindFor('statement.pdf', 'application/octet-stream')).toBe(
      'pdf',
    );
    expect(shareKindFor('IMG-20260921-WA0003.jpg', '')).toBe('image');
    expect(shareKindFor('ledger.csv', 'application/octet-stream')).toBe('csv');
    expect(shareKindFor('payload.JSON', '')).toBe('json');
  });

  it('falls back to the type when the name carries no extension', () => {
    expect(shareKindFor('scan', 'application/pdf')).toBe('pdf');
    expect(shareKindFor('photo', 'image/heic')).toBe('image');
    expect(shareKindFor('', '')).toBe('generic-file');
  });

  it('sends anything it cannot place to a tool that takes any file', () => {
    expect(shareDestinationFor('backup.bin', '')).toBe(
      SHARE_ROUTES['generic-file'],
    );
  });

  it('only routes to pages that exist', () => {
    const dead = Object.entries(SHARE_ROUTES).filter(
      ([, route]) => !routeExists(route),
    );
    expect(dead).toEqual([]);
  });

  it('adds the handoff marker with the right separator', () => {
    const origin = 'https://example.test';
    expect(withHandoffFlag('/image/optimize', origin)).toBe(
      '/image/optimize?shared=1',
    );
    expect(withHandoffFlag('/pdf/page-tools?tool=rotate-pdf', origin)).toBe(
      '/pdf/page-tools?tool=rotate-pdf&shared=1',
    );
  });
});

/**
 * `public/sw.js` is served verbatim with no module graph, so it carries its own
 * copy of the routing table. A copy nobody compares is a copy that drifts, and
 * the drift here is silent: the share sheet would keep working and keep
 * sending people to the wrong tool.
 */
describe('the service worker copy of the routing table', () => {
  const copied = Object.fromEntries(
    [...worker.matchAll(/^\s*'?([a-z-]+)'?:\s*'([^']+)',$/gmu)]
      .filter(([, kind]) => (SHARE_KINDS as readonly string[]).includes(kind))
      .map(([, kind, route]) => [kind, route]),
  );

  it('lists every kind', () => {
    expect(Object.keys(copied).sort()).toEqual([...SHARE_KINDS].sort());
  });

  it('agrees with the table the rest of the app uses', () => {
    expect(copied).toEqual(SHARE_ROUTES);
  });

  it('uses the same query flag', () => {
    expect(worker).toContain("const HANDOFF_FLAG = 'shared';");
  });

  /*
   * The worker writes the handed-over file straight into the store that
   * `lib/file-handoff.ts` reads back. Nothing links the two but these names,
   * and renaming one without the other loses every shared file in silence.
   */
  it('writes into the store the collector reads from', () => {
    const handoff = readFileSync(
      path.join(projectRoot, 'lib/file-handoff.ts'),
      'utf8',
    );
    for (const [constant, value] of [
      ['DATABASE', 'opentools-handoff'],
      ['STORE', 'pending'],
      ['KEY', 'file'],
    ]) {
      expect(
        handoff,
        `lib/file-handoff.ts no longer sets ${constant}`,
      ).toContain(`const ${constant} = '${value}';`);
      expect(
        worker,
        `public/sw.js no longer sets HANDOFF_${constant}`,
      ).toContain(`const HANDOFF_${constant} = '${value}';`);
    }
  });
});

describe('the web app manifest', () => {
  it('is installable: scope, start url, display and both icon sizes', () => {
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  /*
   * A file share is only delivered as `multipart/form-data` over POST; a GET
   * share target silently drops the file and hands over a title and a link
   * instead, which is the whole feature failing quietly.
   */
  it('declares a share target that can actually carry a file', () => {
    const share = manifest.share_target;
    expect(share?.action).toBe('/share-target');
    expect(share?.method.toUpperCase()).toBe('POST');
    expect(share?.enctype).toBe('multipart/form-data');
    expect(share?.params.files[0]?.name).toBe('file');
    for (const type of [
      'application/pdf',
      'image/*',
      'text/csv',
      'application/json',
    ]) {
      expect(share?.params.files[0]?.accept).toContain(type);
    }
  });

  it('names the field the worker reads', () => {
    expect(worker).toContain("form.getAll('file')");
    expect(manifest.share_target?.params.files[0]?.name).toBe('file');
  });

  it('hands file handlers to the same landing as the share sheet', () => {
    expect(manifest.file_handlers?.[0]?.action).toBe('/share-target');
    expect(Object.keys(manifest.file_handlers?.[0]?.accept ?? {})).toContain(
      'application/pdf',
    );
  });

  it('only offers shortcuts to pages that exist', () => {
    const dead = (manifest.shortcuts ?? []).filter(
      (shortcut) => !routeExists(shortcut.url),
    );
    expect(dead).toEqual([]);
  });

  it('points the share target at a page that exists', () => {
    expect(routeExists(manifest.share_target?.action ?? '')).toBe(true);
  });
});
