import type { Metadata } from 'next';

import { PAGE_DEPTH_CORE } from './tool-page-depth-core';
import { PAGE_DEPTH_IMAGE } from './tool-page-depth-image';
import { PAGE_DEPTH_PDF } from './tool-page-depth-pdf';
import { PAGE_DEPTH_VIDEO } from './tool-page-depth-video';
import type { ToolPageDepth } from './tool-page-depth-types';

export type {
  ToolPageDepth,
  ToolPageDepthFaq,
  ToolPageDepthSection,
  ToolPageDepthStep,
} from './tool-page-depth-types';

/*
  THE PROBLEM THIS FILE EXISTS FOR.
*/

const TOOL_PAGE_DEPTH: Readonly<Record<string, ToolPageDepth>> = {
  ...PAGE_DEPTH_PDF,
  ...PAGE_DEPTH_IMAGE,
  ...PAGE_DEPTH_CORE,
  ...PAGE_DEPTH_VIDEO,
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
 * each page file. `app/layout.tsx` USED TO declare `alternates.canonical: '/'`,
 * and Next merges metadata down the segment tree, so every page that set none
 * of its own inherited the front page's -- telling Google that **59** dedicated
 * routes (every PDF and image tool, and all fourteen workbenches) were the home
 * page. Measured live 2026-09-23; only the `[tool]` routes had set their own.
 *
 * That declaration is **gone** now -- see the comment in `app/layout.tsx` -- so
 * nothing is inherited and every page must state its own. Two tests hold the
 * line: `lib/seo/canonical-coverage.test.ts` and
 * `lib/seo/indexability-sweep.test.ts`, the latter across all 1,325 live tool
 * routes. Reintroducing `canonical: CANONICAL_ORIGIN` below turns the sweep's
 * "self-canonical" assertion red -- verified by mutation on 2026-09-24.
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
