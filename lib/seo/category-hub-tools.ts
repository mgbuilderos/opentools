import { LIVE_TOOL_ROUTES } from './live-tools';
import { pageMetaFor } from './meta-inventory';
import { toolPagesForPrefix, type ToolPageLink } from './related-tools';

/**
 * The old one-URL-for-everything pages: `/math/workbench` answered all 68
 * calculators before each got an address of its own, and it is still live.
 *
 * A hub must not list them. They are not a 69th tool, they duplicate the 68
 * links beside them, and they compete with those pages for the same searches —
 * which is the whole fault the per-tool routes were created to undo. They keep
 * their inbound links from `internal-linking-graph.ts`; they are simply not
 * something to offer someone browsing a category.
 */
const WORKBENCH_LANDING = /\/(?:workbench|advanced|writing)$/u;

/**
 * Live pages a hub leaves out for a reason someone decided, not for a reason
 * derived from the route.
 *
 * `/pdf/compress-offline` is the same compressor as `/pdf/compress` at a
 * second address, built for the "compress pdf offline" search. The owner asked
 * on 2026-09-24 that it appear in no catalogue and no workspace, because two
 * "Compress PDF" entries side by side make a worse menu — and a category hub
 * is a menu. The page keeps its sitemap entry and its inbound links; it is
 * simply not offered to someone browsing.
 *
 * Anything added here is a page a visitor browsing that category will not
 * find, so it wants a named reason and a test that lists it.
 */
const WITHHELD_FROM_HUBS: ReadonlySet<string> = new Set([
  '/pdf/compress-offline',
]);

/**
 * Every tool page under one prefix, named, in one list.
 *
 * WHY THIS IS NOT JUST `toolPagesForPrefix`. That reads the related-tools
 * graph, which is built from the workbench operation lists and the
 * `publicTools` manifest — and three live pages are in neither:
 * `/image/background-remover`, `/image/heic-to-png` and
 * `/pdf/compress-offline`. They were invisible to the graph, so a hub built
 * only from it listed 13 of the 15 image tools while its own heading said
 * "every image tool", and the flagship background remover was the one missing.
 *
 * So the list starts from `LIVE_TOOL_ROUTES` — the registry the sitemap and
 * the build's orphan guard both read, which by definition cannot be missing a
 * page that ships. The graph is then used only for the WORDS, because its
 * names are written for a link ("Merge PDF") where the page's own title is
 * written for a search result ("Merge PDF Online — Free, No Upload,
 * No Sign-Up"). A page the graph does not know falls back to `pageMetaFor`,
 * which `meta-lengths.test.ts` proves resolves every route in the sitemap.
 *
 * The result: a hub lists every tool page under its prefix, always, and
 * `category-hubs.test.ts` asserts exactly that. Add a route and it appears;
 * there is nothing to remember.
 */
export function categoryHubTools(prefix: string): readonly ToolPageLink[] {
  const described = new Map(
    toolPagesForPrefix(prefix).map((tool) => [tool.href, tool]),
  );

  return LIVE_TOOL_ROUTES.filter(
    (route) =>
      route.startsWith(`${prefix}/`) &&
      !WORKBENCH_LANDING.test(route) &&
      !WITHHELD_FROM_HUBS.has(route),
  )
    .map((route) => {
      const known = described.get(route);
      if (known) return known;
      const meta = pageMetaFor(route);
      // Unreachable while `meta-lengths.test.ts` passes, and narrowed rather
      // than asserted so a page with no metadata is one missing card instead
      // of a category that will not render.
      if (!meta) return undefined;
      return {
        href: route,
        name: meta.title,
        description: meta.description,
        category: prefix,
      };
    })
    .filter((tool): tool is ToolPageLink => tool !== undefined)
    .sort(
      (a, b) => a.name.localeCompare(b.name) || a.href.localeCompare(b.href),
    );
}

/** Live pages a hub deliberately leaves out, so a test can hold the line. */
export function omittedFromHub(prefix: string): readonly string[] {
  return LIVE_TOOL_ROUTES.filter(
    (route) =>
      route.startsWith(`${prefix}/`) &&
      (WORKBENCH_LANDING.test(route) || WITHHELD_FROM_HUBS.has(route)),
  );
}
