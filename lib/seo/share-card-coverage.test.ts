import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  auditRenderedPages,
  duplicateOgTitles,
  missingShareTags,
  ogTitle,
} from '../../scripts/check-share-and-heading-order.mjs';
import {
  SHARE_CARDS,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
} from './share-images';

/**
 * Every URL this site publishes ships a full share card.
 *
 * WHAT BROKE. A 360 sweep of all 1,413 live URLs on 2026-09-23 found 78 of
 * them serving no `og:image`: `/guides`, `/blog`, all 21 `/guides/category/*`,
 * the six standalone guides and all 19 templates. Every one was a page that
 * declares its own `openGraph` block. Next.js does not merge a page's
 * `openGraph` into the layout's field by field -- the page's block replaces the
 * parent's whole -- so naming `title` and `description` there dropped the
 * `images` array `app/layout.tsx` sets, while `twitter.card` stayed
 * `summary_large_image`. Platforms reserve that slot and render it empty, which
 * is worse than no card at all.
 *
 * Nothing in any of those seven files was wrong on its own terms, which is
 * precisely why `share-card.test.ts` -- which guards the home page's card --
 * did not see it. The fault exists only in the merged metadata.
 *
 * WHAT IS ASSERTED WHERE. The population claim ("every sitemap URL") can only
 * be made against rendered HTML, so it is made by
 * `scripts/check-share-and-heading-order.mjs`, which runs on every build beside
 * `verify-static-coverage.mjs`. That is the same split
 * `lib/seo/orphan-coverage.test.ts` argues for: a model of the rendered page
 * rebuilt from the modules the pages import is a second, wrong implementation
 * of the site.
 *
 * This file holds the three things a unit test can prove without a build: that
 * the detector still detects, that the build still runs it, and that the source
 * invariant behind all 78 -- an `openGraph` block with no `images` -- is not
 * back. When a build is present it also re-runs the population check, so a
 * `vitest run` after a build proves the whole thing end to end.
 */
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const CLIENT_DIR = path.join(PROJECT_ROOT, 'dist', 'client');

function pageFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) pageFiles(full, found);
    else if (/^(page|layout)\.tsx$/u.test(entry)) found.push(full);
  }
  return found;
}

/**
 * The body of every `openGraph: { ... }` literal in a file, brace-matched.
 *
 * A regex up to the next `}` stops at the first nested object -- `images: [{`
 * closes one -- and would report a block that does declare an image as one
 * that does not. Counting braces is the only way to read the whole block.
 */
function openGraphBlocks(source: string): string[] {
  const blocks: string[] = [];
  for (const marker of source.matchAll(/openGraph:\s*\{/gu)) {
    let depth = 1;
    let i = marker.index! + marker[0].length;
    const start = i;
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') depth -= 1;
      i += 1;
    }
    blocks.push(source.slice(start, i - 1));
  }
  return blocks;
}

/** Width and height out of the PNG's IHDR, no image library required. */
function pngSize(file: string) {
  const bytes = new Uint8Array(readFileSync(file));
  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const be32 = (at: number) =>
    ((bytes[at]! << 24) |
      (bytes[at + 1]! << 16) |
      (bytes[at + 2]! << 8) |
      bytes[at + 3]!) >>>
    0;
  return {
    isPng: PNG_SIGNATURE.every((byte, index) => bytes[index] === byte),
    width: be32(16),
    height: be32(20),
  };
}

describe('share card coverage', () => {
  /**
   * The guard's own eyes. If `missingShareTags` ever stops matching what
   * Next.js emits -- an attribute order change, a switch to `name=` -- it would
   * pass every page silently, and 78 blank cards would ship again with a green
   * build. These two cases are the difference between a guard and a decoration.
   */
  it('detects a page that is missing the image, and passes one that is not', () => {
    const full =
      '<meta property="og:title" content="A"/>' +
      '<meta property="og:description" content="B"/>' +
      '<meta property="og:image" content="/og.png"/>';
    expect(missingShareTags(full)).toEqual([]);
    expect(
      missingShareTags(full.replace(/<meta property="og:image"[^>]*>/u, '')),
    ).toEqual(['og:image']);
    expect(missingShareTags('<html><head></head></html>')).toEqual([
      'og:title',
      'og:description',
      'og:image',
    ]);
  });

  /**
   * The source invariant behind all 78. A page may inherit the whole card by
   * declaring no `openGraph` at all -- that is what the 1,335 tool pages do --
   * but a page that opens the block owns every field in it.
   */
  it('never declares an openGraph block without an image', () => {
    const offenders = pageFiles(APP_DIR)
      .filter((file) =>
        openGraphBlocks(readFileSync(file, 'utf8')).some(
          (block) => !/\bimages:/u.test(block),
        ),
      )
      .map((file) => path.relative(PROJECT_ROOT, file));

    expect(
      offenders,
      'these pages declare openGraph without images; Next.js replaces the ' +
        'layout block whole, so they will ship no og:image. Add ' +
        "`images: shareImages('<section>')` from lib/seo/share-images.ts",
    ).toEqual([]);
  });

  /** A declared card that is not on disk is a 404 in every link preview. */
  it('ships a real 1200x630 PNG for every section it names', () => {
    for (const [section, url] of Object.entries(SHARE_CARDS)) {
      const file = path.join(PROJECT_ROOT, 'public', url.replace(/^\//u, ''));
      expect(existsSync(file), `${section} card ${url} is not in public/`).toBe(
        true,
      );
      const card = pngSize(file);
      expect(card.isPng, `${url} is not a PNG`).toBe(true);
      expect(card.width, `${url} width`).toBe(SHARE_CARD_WIDTH);
      expect(card.height, `${url} height`).toBe(SHARE_CARD_HEIGHT);
    }
  });

  /**
   * The population check only protects anything if it runs. Without this, the
   * script could be dropped from the build and nothing would say so.
   */
  it('runs the rendered-HTML check on every build', () => {
    const scripts = JSON.parse(
      readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'),
    ).scripts as Record<string, string>;
    expect(scripts.build).toContain('check-share-and-heading-order.mjs');
  });

  /**
   * And the population claim itself, whenever a build is on disk. Skipped
   * rather than faked on a tree that has not been built: the build runs the
   * same code, and the assertion above proves it still does.
   */
  it.skipIf(!existsSync(path.join(CLIENT_DIR, 'sitemap.xml')))(
    'ships og:title, og:description and og:image on every sitemap URL',
    () => {
      const result = auditRenderedPages(CLIENT_DIR)!;
      expect(result.checked).toBeGreaterThan(1000);
      expect(
        result.faults.filter((fault) => fault.check === 'share-tags'),
      ).toEqual([]);
    },
  );
});

/**
 * Every card names its own page.
 *
 * WHAT BROKE, AND WHY NOTHING SAW IT. The 2026-09-23 sweep above closed the
 * "is the tag there" question, and all 1,335 tool pages passed it: they had an
 * `og:title`, an `og:description` and an `og:image`. Re-measured against a
 * fresh `dist/client` the same day, those 1,335 of 1,413 URLs carried ONE
 * `og:title` between them -- `OpenTools — Fast, Private Browser Utilities` --
 * with 79 distinct values across the site, and an `og:url` pointing at the
 * home page. Same Next.js rule as the 78, read from the other side: a page
 * that declares no `openGraph` inherits the layout's whole, so
 * `app/layout.tsx` was answering for every tool.
 *
 * `scripts/audit-360.mjs`'s `og` check asserts presence, and the
 * `duplicate-title` / `duplicate-description` population checks read `<title>`
 * and `<meta name="description">` -- which were already 1,413 distinct values.
 * Nothing read the Open Graph pair as a population, so the fault was invisible
 * to every guard the site had.
 *
 * WHY THE FIX IS AN OMISSION. `app/layout.tsx` states no `openGraph.title`,
 * no `openGraph.description` and no absolute `openGraph.url`. The metadata
 * shim's `postProcessMetadata` then fills `og:title` from the page's own
 * resolved title (site template already applied) and `og:description` from its
 * own description, and `url: '.'` resolves against the page's own pathname.
 * So the 1,335 pages were fixed without editing any of them -- and nothing in
 * any page file will look wrong if someone puts the three fields back. That is
 * what these tests are for.
 */
describe('share card titles name their own page', () => {
  /**
   * The detector's own eyes, for the same reason `missingShareTags` has a
   * pair of them: a matcher that quietly stops matching would report 1,413
   * identical cards as a clean site.
   */
  it('reads an og:title, and groups only the values more than one page uses', () => {
    const page = (title: string) =>
      `<meta property="og:title" content="${title}"/>`;
    expect(ogTitle(page('Merge PDF · OpenTools'))).toBe(
      'Merge PDF · OpenTools',
    );
    expect(ogTitle('<html><head></head></html>')).toBeNull();

    expect(
      duplicateOgTitles([
        { urlPath: '/a', html: page('Shared') },
        { urlPath: '/c', html: page('Shared') },
        { urlPath: '/b', html: page('Shared') },
        { urlPath: '/d', html: page('Its own') },
        { urlPath: '/e', html: '<html><head></head></html>' },
      ]),
    ).toEqual([{ title: 'Shared', routes: ['/a', '/b', '/c'] }]);

    expect(
      duplicateOgTitles([
        { urlPath: '/a', html: page('One') },
        { urlPath: '/b', html: page('Two') },
      ]),
    ).toEqual([]);
  });

  /**
   * The source invariant behind all 1,335. Stating any of these three in the
   * ROOT layout re-breaks every page that declares no block of its own, and
   * no page file changes when it happens.
   *
   * A nested layout or a page may state them freely -- `/guides`, `/blog` and
   * the templates do, and they are the reason `shareImages()` exists. Only the
   * root layout answers for pages that said nothing.
   */
  it('leaves title, description and an absolute url out of the root layout', () => {
    const [block, ...rest] = openGraphBlocks(
      readFileSync(path.join(APP_DIR, 'layout.tsx'), 'utf8'),
    );
    expect(block, 'app/layout.tsx declares no openGraph block').toBeDefined();
    expect(
      rest,
      'app/layout.tsx declares more than one openGraph block',
    ).toEqual([]);

    const stated = ['title', 'description'].filter((field) =>
      new RegExp(`(^|[{,\\s])${field}:`, 'u').test(block!),
    );
    expect(
      stated,
      'app/layout.tsx states these in openGraph, so all 1,335 pages that ' +
        'declare no openGraph of their own will inherit them and every tool ' +
        'link will preview as the site. Leave them out; postProcessMetadata ' +
        "fills them from each page's own title and description.",
    ).toEqual([]);

    const url = block!
      .match(/(^|[{,\s])url:\s*([^,\n]+)/u)?.[2]
      ?.trim()
      .replace(/^['"`]|['"`]$/gu, '');
    expect(
      url,
      "openGraph.url must be '.', which resolves against the page's own " +
        'pathname. An absolute origin makes every page claim the home page ' +
        'as its og:url, and Facebook and LinkedIn read og:url as canonical.',
    ).toBe('.');
  });

  /**
   * And the population claim, whenever a build is on disk. This is also the
   * only place the shim's fill-from-page-title behaviour is proved: it is
   * behaviour of a dependency, so it is asserted against rendered bytes rather
   * than against an import of its internals.
   */
  it.skipIf(!existsSync(path.join(CLIENT_DIR, 'sitemap.xml')))(
    'gives no two sitemap URLs the same og:title',
    () => {
      const result = auditRenderedPages(CLIENT_DIR)!;
      expect(result.checked).toBeGreaterThan(1000);
      expect(
        result.faults
          .filter((fault) => fault.check === 'duplicate-og-title')
          .map((fault) => fault.detail),
      ).toEqual([]);
    },
  );
});
