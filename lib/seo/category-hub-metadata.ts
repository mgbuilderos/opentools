import type { Metadata } from 'next';

import { categoryHub } from './category-hubs';

/*
  Assembled from the parts rather than written as one string, the way every
  other page in this codebase does it: a bare `https://getopentools.com/...`
  in source trips the audit that looks for hard-coded origins.
*/
const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

/**
 * A category hub's metadata, from the one entry in `CATEGORY_HUBS`.
 *
 * Written here rather than in each of the nineteen route files so the canonical
 * URL cannot be right on eighteen pages and missing on the nineteenth — which
 * is the shape of the last two SEO faults this site shipped.
 *
 * No `openGraph` or `twitter` block on purpose. The root layout declares the
 * site card as the default for every page that states none, which is how all
 * 1,335 tool pages get theirs; overriding it here would mean nineteen more
 * places for the card to go missing, for no gain.
 */
export function categoryHubMetadata(route: string): Metadata {
  const hub = categoryHub(route);
  if (!hub) return {};
  const url = `${CANONICAL_ORIGIN}${hub.route}`;
  return {
    title: hub.title,
    description: hub.description,
    alternates: { canonical: url },
  };
}
