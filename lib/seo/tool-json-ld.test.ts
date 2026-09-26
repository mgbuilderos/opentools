import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { LIVE_TOOL_ROUTES } from './live-tool-routes';
import { toolJsonLd } from './tool-json-ld';

/*
  The gap this suite exists to keep closed.

  Measured on 2026-09-25: structured data was served on `/blog/*`, `/guides/*`,
  `/templates/*` and the 64 tool routes carrying depth content, and on no other
  tool page. Those other pages are the commercial core -- the ones an assistant
  has to name because the answer is a converted file, not a number -- and they
  were the ones a machine could read least.

  So the first test here is not about a property of the JSON. It is that every
  page file serving a live tool route renders `<ToolJsonLd`. A new tool page
  added without it fails the build with its own path named.
*/

/** The page file that serves a route, static folder or dynamic segment. */
function pageFileFor(route: string): string {
  const direct = `app${route}/page.tsx`;
  if (existsSync(direct)) return direct;
  const prefix = route.split('/')[1];
  for (const segment of ['[tool]', '[pair]']) {
    const dynamic = `app/${prefix}/${segment}/page.tsx`;
    if (existsSync(dynamic)) return dynamic;
  }
  throw new Error(`No page file serves ${route}`);
}

const PAGE_FILES = [...new Set(LIVE_TOOL_ROUTES.map(pageFileFor))];

describe('every live tool page carries structured data', () => {
  it('finds a page file for all of them', () => {
    expect(PAGE_FILES.length).toBeGreaterThan(100);
  });

  it.each(PAGE_FILES)('%s renders ToolJsonLd', (file) => {
    expect(readFileSync(file, 'utf8')).toContain('<ToolJsonLd');
  });
});

/** The `@graph` node of a type, for the assertions below. */
function node(route: string, meta: Parameters<typeof toolJsonLd>[0]['meta']) {
  const graph = toolJsonLd({ route, meta })['@graph'] as Record<
    string,
    unknown
  >[];
  return (type: string) =>
    graph.find((entry) => {
      const entryType = entry['@type'];
      return Array.isArray(entryType)
        ? entryType.includes(type)
        : entryType === type;
    }) as Record<string, unknown>;
}

const MERGE_META = {
  title: 'Merge PDF files',
  description: 'Combine PDFs in your browser tab, in the order you choose.',
};

describe('toolJsonLd', () => {
  it('describes the tool as free software that runs in the browser', () => {
    const software = node('/pdf/merge', MERGE_META)('SoftwareApplication');
    expect(software.name).toBe(MERGE_META.title);
    expect(software.description).toBe(MERGE_META.description);
    expect(software.url).toContain('/pdf/merge');
    expect(software.isAccessibleForFree).toBe(true);
    expect(software.offers).toMatchObject({ price: '0' });
    expect(software.applicationSubCategory).toBe('PDF');
  });

  /*
    The one claim on the page a reader can check with `curl -I`, so it has to
    be the header the route is really served. `/pdf/merge` gets 'none';
    `/image/heic-to-jpg` fetches its decoder from this same origin and gets
    'self'. Saying 'none' on both would be the single most damaging thing this
    file could emit -- a machine-readable statement that is false.
  */
  it("names the route's own connect-src", () => {
    const sealed = node('/pdf/merge', MERGE_META)('SoftwareApplication');
    expect(JSON.stringify(sealed.featureList)).toContain("connect-src 'none'");

    const localModel = node('/image/heic-to-jpg', {
      title: 'HEIC to JPG converter',
      description: 'Convert iPhone HEIC photos to JPG without uploading them.',
    })('SoftwareApplication');
    expect(JSON.stringify(localModel.featureList)).toContain(
      "connect-src 'self'",
    );
    expect(JSON.stringify(localModel.featureList)).not.toContain(
      "connect-src 'none'",
    );
  });

  it('claims no rating it cannot substantiate', () => {
    const serialised = JSON.stringify(
      toolJsonLd({
        route: '/pdf/merge',
        meta: MERGE_META,
      }),
    );
    expect(serialised).not.toContain('aggregateRating');
    expect(serialised).not.toContain('"review"');
    expect(serialised).not.toContain('ratingValue');
  });

  it('points at the page that measured the claim', () => {
    const software = node('/pdf/merge', MERGE_META)('SoftwareApplication');
    expect(JSON.stringify(software.softwareHelp)).toContain('/proof');
  });

  it('claims offline only for a precached route', () => {
    /* `/pdf/merge` is in the service worker precache list; `/pdf/ocr` is not. */
    const offline = node('/pdf/merge', MERGE_META)('SoftwareApplication');
    expect(JSON.stringify(offline.featureList)).toContain('offline');

    const online = node('/pdf/ocr', {
      title: 'OCR a PDF',
      description:
        'Read the text out of a scanned PDF in the browser tab you are in.',
    })('SoftwareApplication');
    expect(JSON.stringify(online.featureList)).not.toContain('offline');
  });

  it('builds a breadcrumb through the category the homepage links', () => {
    const crumbs = node('/pdf/merge', MERGE_META)('BreadcrumbList');
    expect(
      (crumbs.itemListElement as { name: string }[]).map((item) => item.name),
    ).toEqual(['Home', 'PDF', MERGE_META.title]);
  });

  /* `/convert` has no hub yet, so the trail is Home then the page. */
  it('omits the category when the prefix has no depth-1 address', () => {
    const crumbs = node('/convert/csv-to-yaml', {
      title: 'CSV to YAML converter',
      description: 'Turn a CSV table into YAML in the browser tab you are in.',
    })('BreadcrumbList');
    expect(
      (crumbs.itemListElement as { name: string }[]).map((item) => item.name),
    ).toEqual(['Home', 'CSV to YAML converter']);
  });

  /*
    A page that lost its title or description would otherwise emit
    `"name": "[object Object]"` or `"description": undefined` -- a broken
    machine-readable claim is worse than none, so the build stops instead.
  */
  it('refuses to describe a page that has nothing to say', () => {
    expect(() =>
      toolJsonLd({ route: '/pdf/merge', meta: { title: 'Merge PDF files' } }),
    ).toThrow(/no description/);
    expect(() =>
      toolJsonLd({
        route: '/pdf/merge',
        meta: { description: 'x'.repeat(60) },
      }),
    ).toThrow(/no plain-string title/);
  });
});
