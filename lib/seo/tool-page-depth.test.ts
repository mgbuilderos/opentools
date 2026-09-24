import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { LIVE_TOOL_ROUTES } from './live-tools';
import {
  TOOL_PAGE_DEPTH_ROUTES,
  toolPageDepth,
  toolPageDepthWordCount,
  toolPageMetadata,
} from './tool-page-depth';

/*
  The guard on the depth content of the 19 PDF and 13 image tool pages.

  These 32 routes are the most commercially valuable pages on the site and were
  measured, on 2026-09-23, as the thinnest: `/pdf/merge` carried 281 visible
  words and the title `Merge PDF`, against 1,348 words and a search-intent
  title on `/guides/pdf-merge-pdf` -- a guide that cannot merge anything. This
  file exists so that never quietly comes back: a route added to `/pdf` or
  `/image` without depth content fails here, and so does a title that grows
  past what a result snippet shows, a duplicate title, or an offline claim on a
  page the service worker does not hold.
*/

const projectRoot = path.resolve(import.meta.dirname, '../..');

const CORE_DEPTH_ROUTES = [
  '/life-admin/aadhaar-pan-masker',
  '/data/csv-to-json',
  '/audio/convert',
  '/audio/mp3-toolkit',
  '/math/percentage-calculator',
  '/date/age-calculator',
  '/date/date-difference',
  '/developer/base64-decoder',
  '/developer/base64-encoder',
  '/developer/unix-timestamp',
  '/developer/uuid-generator',
  '/file/hash-calculator',
  '/text/case-converter',
  '/video/trim',
] as const;

const depthRoutes = [
  ...LIVE_TOOL_ROUTES.filter(
    (route) => route.startsWith('/pdf/') || route.startsWith('/image/'),
  ),
  ...CORE_DEPTH_ROUTES,
];

/**
 * The pages the service worker precaches, read out of the build script.
 *
 * Parsed rather than imported because the script is an ESM build tool that
 * reads `dist/` at module scope. The point is that the list in the build and
 * the list this content may claim about are the same list: `offlineReady` is
 * the only thing that renders "Kept for use with the network off", and a route
 * can only answer with the network off because it is in this array.
 *
 * The mechanism itself is proved by `e2e/share-target.spec.ts`: "serves the app
 * with the network switched off" fills the cache, disconnects the browser,
 * loads `/pdf/merge` and requires a 200 with a working file input, and "leaves
 * pages it holds no bytes for to the browser" requires a route that is NOT in
 * this list to fail instead.
 */
function precachedPages(): ReadonlySet<string> {
  const source = readFileSync(
    path.join(projectRoot, 'scripts/build-service-worker-precache.mjs'),
    'utf8',
  );
  const block = /const PAGES = \[([\s\S]*?)\];/u.exec(source);
  expect(block, 'the precache PAGES list could not be found').not.toBeNull();
  /*
    Comments come out before the quoted paths go in. The array is annotated, and
    one apostrophe in an annotation -- "the route's engine" -- opens a string
    this parser then closes on the next real quote, shifting every path after it
    by one. That is not a theoretical failure: it happened while
    `/pdf/compress-offline` was being added on 2026-09-24, and it reported
    `/image/optimize` as absent from a list it was plainly in. A parse that can
    silently produce the wrong set can also silently produce a passing run, so
    the comments are removed rather than written around.
  */
  const array = block![1]!
    .replaceAll(/\/\*[\s\S]*?\*\//gu, '')
    .replaceAll(/\/\/[^\n]*/gu, '');
  return new Set([...array.matchAll(/'([^']+)'/gu)].map((match) => match[1]!));
}

describe('PDF, image, and commercial core tool page depth', () => {
  it('covers every live PDF, image, and commercial core tool route', () => {
    expect(depthRoutes.length).toBe(50);
    expect([...depthRoutes].sort()).toEqual([...TOOL_PAGE_DEPTH_ROUTES]);
  });

  it.each(depthRoutes)('%s carries at least 800 words', (route) => {
    const depth = toolPageDepth(route);
    expect(depth, `no depth content for ${route}`).toBeDefined();
    // 800 is the floor the brief set. The guide these pages replace carried
    // 1,348; a tool page under 800 is back to losing its own query to a page
    // that cannot do the job.
    expect(toolPageDepthWordCount(depth!)).toBeGreaterThanOrEqual(800);
  });

  it.each(depthRoutes)('%s has steps and questions to answer with', (route) => {
    const depth = toolPageDepth(route)!;
    // Both are emitted as structured data (HowTo, FAQPage) by
    // components/page-depth-content.tsx, from these very strings.
    expect(depth.steps.length).toBeGreaterThanOrEqual(3);
    expect(depth.faqs.length).toBeGreaterThanOrEqual(4);
    expect(depth.sections.length).toBeGreaterThanOrEqual(3);
    for (const step of depth.steps)
      expect(step.text.length).toBeGreaterThan(40);
    for (const faq of depth.faqs) {
      expect(faq.question.endsWith('?')).toBe(true);
      expect(faq.answer.length).toBeGreaterThan(80);
    }
    for (const section of depth.sections) {
      expect(section.body.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('gives every page its own title, short enough to survive the snippet', () => {
    const titles = TOOL_PAGE_DEPTH_ROUTES.map(
      (route) => toolPageDepth(route)!.title,
    );
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) {
      // `app/layout.tsx` appends ' · OpenTools' (12 characters). Google shows
      // roughly 60; past that the words that earn the click are the ones cut.
      expect(title.length, title).toBeLessThanOrEqual(56);
      expect(title.length, title).toBeGreaterThan(20);
    }
  });

  it('gives every page its own description, sized for the snippet', () => {
    const descriptions = TOOL_PAGE_DEPTH_ROUTES.map(
      (route) => toolPageDepth(route)!.description,
    );
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const description of descriptions) {
      expect(description.length, description).toBeGreaterThanOrEqual(70);
      expect(description.length, description).toBeLessThanOrEqual(215);
    }
  });

  it('claims offline use only for pages the service worker holds', () => {
    const precached = precachedPages();
    const claiming = TOOL_PAGE_DEPTH_ROUTES.filter(
      (route) => toolPageDepth(route)!.offlineReady,
    );
    // Not a style rule. A page that is not in the precache list cannot answer
    // with the network off, so the badge would be a claim nothing backs.
    for (const route of claiming) {
      expect(
        precached.has(route),
        `${route} claims offline use but is not in the service worker precache list`,
      ).toBe(true);
    }
    // And the route the offline end-to-end test actually loads must keep it,
    // so the claim cannot be quietly dropped from the one page that proves it.
    expect(claiming).toContain('/pdf/merge');
  });

  it('spells out the offline mechanism only where the test loads that page', () => {
    const spec = readFileSync(
      path.join(projectRoot, 'e2e/share-target.spec.ts'),
      'utf8',
    );
    for (const route of TOOL_PAGE_DEPTH_ROUTES) {
      const depth = toolPageDepth(route)!;
      const prose = [
        depth.lead,
        ...depth.sections.flatMap((section) => section.body),
        ...depth.faqs.map((faq) => faq.answer),
      ].join(' ');
      if (!/network (?:is )?(?:switched )?off|works offline/iu.test(prose)) {
        continue;
      }
      expect(
        spec.includes(`page.goto('${route}')`),
        `${route} describes working with the network off, but e2e/share-target.spec.ts never loads it offline`,
      ).toBe(true);
    }
  });

  it('writes no literal remote URL, which the source policy test forbids', () => {
    // `lib/tools/local-source-policy.test.ts` fails on `https://` anywhere
    // under components/ and app/. These strings are rendered by a component,
    // so the same discipline applies to the words even though the data file
    // sits outside the guarded roots.
    const forbidden = ['http', ':', '//'].join('');
    for (const route of TOOL_PAGE_DEPTH_ROUTES) {
      const depth = toolPageDepth(route)!;
      const everything = JSON.stringify(depth);
      expect(everything.includes(forbidden), route).toBe(false);
    }
  });

  it('names no competitor, in line with the shipped-code rule', () => {
    const brands =
      /smallpdf|ilovepdf|pdf24|tinypng|sejda|pdf2go|stirlingpdf|acrobat/iu;
    for (const route of TOOL_PAGE_DEPTH_ROUTES) {
      expect(brands.test(JSON.stringify(toolPageDepth(route)!)), route).toBe(
        false,
      );
    }
  });

  it('gives every page a canonical pointing at itself', () => {
    for (const route of TOOL_PAGE_DEPTH_ROUTES) {
      const metadata = toolPageMetadata(route);
      // `Metadata['alternates']['canonical']` is a union that includes an
      // object form, so it is narrowed rather than stringified: a canonical
      // that stringified to `[object Object]` would end with no route and the
      // assertion below would be vacuous.
      const canonical = metadata.alternates?.canonical;
      expect(typeof canonical, route).toBe('string');
      expect((canonical as string).endsWith(route), route).toBe(true);
      expect(metadata.title).toBe(toolPageDepth(route)!.title);
      expect(metadata.description).toBe(toolPageDepth(route)!.description);
    }
  });

  it('refuses to build metadata for a route it has no content for', () => {
    expect(() => toolPageMetadata('/pdf/not-a-tool')).toThrow(
      /no tool page depth content/iu,
    );
  });

  it('is wired into every one of those pages', () => {
    // The content only reaches a reader if the page file provides it. Reading
    // the route files is what stops this whole file passing while the pages
    // render exactly what they rendered before.
    for (const route of depthRoutes) {
      const dedicated = path.join(projectRoot, 'app', route, 'page.tsx');
      const dynamic = path.join(
        projectRoot,
        'app',
        route.split('/')[1]!,
        '[tool]',
        'page.tsx',
      );
      const file = [dedicated, dynamic].find((candidate) => {
        try {
          readFileSync(candidate, 'utf8');
          return true;
        } catch {
          return false;
        }
      });
      expect(file, `no page file found for ${route}`).toBeDefined();
      const source = readFileSync(file!, 'utf8');
      expect(source, `${route} does not provide its depth content`).toContain(
        'PageDepthProvider',
      );
      expect(source, `${route} does not set its own canonical`).toContain(
        'toolPageMetadata',
      );
    }
  });
});
