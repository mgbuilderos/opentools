import { GUIDE_CONSOLIDATION_ENABLED } from './guide-consolidation-config';
import { GUIDE_KEEP_LIST } from './guide-keep-list';
import { LIVE_TOOL_CATALOG, getLiveToolBySlug } from './live-tools';
import type { ToolCatalogEntry } from './tool-catalog-data';

/**
 * Which guide pages are published. Every function takes the state as a
 * parameter, defaulting to the committed switch and keep list, so tests cover
 * both states without mutating module globals.
 */
export interface GuideConsolidationState {
  enabled: boolean;
  keepSlugs: ReadonlySet<string>;
}

export const GUIDE_CONSOLIDATION: GuideConsolidationState = {
  enabled: GUIDE_CONSOLIDATION_ENABLED,
  keepSlugs: new Set(GUIDE_KEEP_LIST.map((entry) => entry.slug)),
};

/**
 * True when /guides/<slug> renders a guide. Guides of tools that are not live
 * are never published: they 404 (docs/DECISION_LOG.md §7), with or without
 * consolidation.
 */
export function hasPublishedGuide(
  slug: string,
  state: GuideConsolidationState = GUIDE_CONSOLIDATION,
): boolean {
  if (!getLiveToolBySlug(slug)) return false;
  return !state.enabled || state.keepSlugs.has(slug);
}

/** The guide URL, or null when the tool page stands in for the guide. */
export function publishedGuideHref(
  slug: string,
  state: GuideConsolidationState = GUIDE_CONSOLIDATION,
): string | null {
  return hasPublishedGuide(slug, state) ? `/guides/${slug}` : null;
}

/** Where a link about this tool should go: its guide, else the tool itself. */
export function guideOrToolHref(
  tool: ToolCatalogEntry,
  state: GuideConsolidationState = GUIDE_CONSOLIDATION,
): string {
  return publishedGuideHref(tool.slug, state) ?? tool.destinationUrl;
}

/**
 * Live tools whose guide page is published.
 *
 * This is the single source both `app/sitemap.ts` and the guide route's
 * `generateStaticParams` read, so the set of URLs promised to Google and the
 * set of pages the build produces cannot drift apart. Drifting apart is what
 * left 177 guides rendering per request on a 10ms Worker on 2026-09-20;
 * `guide-prerender-coverage.test.ts` holds both to this function.
 */
export function getPublishedGuideTools(
  state: GuideConsolidationState = GUIDE_CONSOLIDATION,
): readonly ToolCatalogEntry[] {
  if (!state.enabled) return LIVE_TOOL_CATALOG;
  return LIVE_TOOL_CATALOG.filter((tool) => state.keepSlugs.has(tool.slug));
}

const GUIDE_PATH = /^\/guides\/([a-z0-9-]+)$/u;

/**
 * Redirect target for a consolidated guide, or null. Only guides of live tools
 * that are not kept redirect; the target is the tool's own destination URL,
 * query string included (for example `/developer/advanced?tool=jwt-decoder`).
 */
export function consolidatedGuideRedirect(
  pathname: string,
  state: GuideConsolidationState = GUIDE_CONSOLIDATION,
): string | null {
  if (!state.enabled) return null;
  const withoutQuery = pathname.split(/[?#]/u)[0]!;
  const path =
    withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/u, '') : withoutQuery;
  const match = GUIDE_PATH.exec(path);
  if (!match || match[1] === 'category') return null;
  const tool = getLiveToolBySlug(match[1]!);
  if (!tool || state.keepSlugs.has(tool.slug)) return null;
  return tool.destinationUrl;
}

/** Every consolidation redirect as path -> target, for review and tests. */
export function getGuideConsolidationRedirects(
  state: GuideConsolidationState = GUIDE_CONSOLIDATION,
): ReadonlyMap<string, string> {
  const redirects = new Map<string, string>();
  if (!state.enabled) return redirects;
  for (const tool of LIVE_TOOL_CATALOG) {
    if (!state.keepSlugs.has(tool.slug)) {
      redirects.set(`/guides/${tool.slug}`, tool.destinationUrl);
    }
  }
  return redirects;
}

/**
 * Guides featured on /guides. Before consolidation: early-wave and top-ranked
 * tools, the list that page has always shown. After: the kept guides
 * themselves, since each was chosen on purpose.
 */
export function getFeaturedGuideTools(
  state: GuideConsolidationState = GUIDE_CONSOLIDATION,
  limit = 18,
): readonly ToolCatalogEntry[] {
  const published = getPublishedGuideTools(state);
  const pool = state.enabled
    ? published
    : published.filter((tool) => tool.releaseWave === 'P0' || tool.rank <= 5);
  return pool.slice(0, limit);
}
