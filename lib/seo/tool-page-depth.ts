import type { Metadata } from 'next';

import { PAGE_DEPTH_CORE } from './tool-page-depth-core';
import { PAGE_DEPTH_IMAGE } from './tool-page-depth-image';
import { PAGE_DEPTH_PDF } from './tool-page-depth-pdf';
import type { ToolPageDepth } from './tool-page-depth-types';

export type {
  ToolPageDepth,
  ToolPageDepthFaq,
  ToolPageDepthSection,
  ToolPageDepthStep,
} from './tool-page-depth-types';

/*
  THE PROBLEM THIS FILE EXISTS FOR.

  Measured on production on 2026-09-23: `/pdf/merge` carried 281 visible words
  and the title `Merge PDF`, while `/guides/pdf-merge-pdf` carried 1,348 words
  and the title `Merge PDF — free, in your browser, no upload`. Two URLs, one
  query, and the optimised one was the page that cannot do the job. Even a
  converter nobody searches for -- `/convert/l100km-to-mpg-us` -- carried 579
  words, more than twice the PDF tool that is the single most commercially
  valuable page on this site.

  So the writing was never the gap. `GUIDE_DETAILS` in `guide-content.ts`
  already held hand-verified explanations for fourteen of these 32 routes, and
  guide consolidation had stopped rendering most of them. This file is where
  the depth for a PDF or image tool page lives: the direct answer, the steps,
  the sections that state what the tool refuses as plainly as what it does, and
  the questions people actually ask. It is keyed by route, because the route is
  the only identifier a page and a redirect and a sitemap entry all agree on.

  RULES FOR ANYTHING WRITTEN HERE.

  1. Every sentence must be true of the code as it stands. Where a limit, a
     format or a refusal is named, it is named because the component or the
     engine enforces it, and `tool-page-depth.test.ts` pins the ones that are
     cheap to pin.
  2. `offlineReady` is not a writing decision. It may only be set for a route
     in the service worker's precache list, because that list is the only
     reason a page answers with the network off -- see
     `scripts/build-service-worker-precache.mjs` and the test in
     `tool-page-depth.test.ts` that reads it. `e2e/share-target.spec.ts`
     ("serves the app with the network switched off") is the proof for the
     mechanism and `/pdf/merge` is the route it proves it on.
  3. Titles are unique across this map and short enough that the ` · OpenTools`
     template does not push the useful words out of a result snippet.
*/

const TOOL_PAGE_DEPTH: Readonly<Record<string, ToolPageDepth>> = {
  ...PAGE_DEPTH_PDF,
  ...PAGE_DEPTH_IMAGE,
  ...PAGE_DEPTH_CORE,
};

/** Routes that carry depth content, for tests and for the registry. */
export const TOOL_PAGE_DEPTH_ROUTES: readonly string[] =
  Object.keys(TOOL_PAGE_DEPTH).sort();

export function toolPageDepth(route: string): ToolPageDepth | undefined {
  return TOOL_PAGE_DEPTH[route];
}

/**
 * The depth content for a route that must have some, for the page files.
 *
 * A page that renders nothing because a lookup quietly returned `undefined` is
 * the failure this whole file was written to fix, so the miss is loud: the
 * build stops with the route named rather than shipping a thin page.
 */
export function requireToolPageDepth(route: string): ToolPageDepth {
  const depth = TOOL_PAGE_DEPTH[route];
  if (!depth) {
    throw new Error(`No tool page depth content is registered for ${route}`);
  }
  return depth;
}

/**
 * The words a reader sees, for the word-count floor the test enforces.
 *
 * Counted from the same strings the component renders, so the number in the
 * test is the number on the page rather than a proxy for it.
 */
export function toolPageDepthWordCount(depth: ToolPageDepth): number {
  const text = [
    depth.directAnswer,
    depth.lead,
    ...depth.steps.flatMap((step) => [step.name, step.text]),
    ...depth.sections.flatMap((section) => [section.heading, ...section.body]),
    ...depth.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join(' ');
  return text.trim().split(/\s+/u).length;
}

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

/**
 * Title, description and a self-canonical for one tool page.
 *
 * The canonical is the reason this helper exists rather than three literals in
 * each page file. `app/layout.tsx` declares `alternates.canonical: '/'`, and
 * Next merges metadata down the segment tree, so a page that sets no canonical
 * of its own inherits the front page's -- which tells Google that 32 tool
 * pages are all the home page. Only the two `[tool]` routes had set one.
 */
export function toolPageMetadata(route: string): Metadata {
  const depth = TOOL_PAGE_DEPTH[route];
  if (!depth) {
    throw new Error(`No tool page depth content is registered for ${route}`);
  }
  return {
    title: depth.title,
    description: depth.description,
    alternates: { canonical: `${CANONICAL_ORIGIN}${route}` },
  };
}
