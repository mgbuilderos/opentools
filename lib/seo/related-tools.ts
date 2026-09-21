import { publicTools } from '../tools/catalog';
import {
  isLiveToolUrl,
  LIVE_TOOL_ROUTES,
  routedToolIdsForPrefix,
  routedToolPrefixes,
} from './live-tools';

/**
 * WHY THIS FILE EXISTS.
 *
 * On 2026-09-19, forty distinct IP addresses opened a `/blog/` page on the
 * live site and every one of them read exactly one page. Of 220 real-browser
 * visitors that day, 28 loaded two pages or more. Then 626 tool pages shipped,
 * each with its own URL and title — and each with nothing on it pointing at
 * another one. A page nobody can leave except by the back button is a dead
 * end for a reader and a leaf node for a crawler.
 *
 * This module turns those pages into a graph: given a tool page, it names the
 * three to six tools a person doing that job is most likely to want next.
 *
 * NOTHING HERE IS HAND-WRITTEN PER TOOL. Six hundred hand-kept lists would be
 * wrong within a week. Every suggestion is derived from data the repository
 * already maintains for other reasons:
 *
 *   1. Position in a workbench's operation list. Those lists are ordered by
 *      hand and group by job — the CSV readers sit together, then the CSV
 *      editors, then the converters — so neighbours in the list are tools
 *      someone reaches for in sequence. This is the strongest signal.
 *   2. Category, taken from `publicTools`. A workbench manifest already names
 *      the category of every operation it hosts through its `searchEntries`,
 *      and a single-tool manifest names its own. This is what lets `/date` and
 *      `/productivity` see each other: two prefixes, one category.
 *   3. Words shared by two tool names, weighted by how rare the word is across
 *      the whole catalogue. "PDF" appears in thirty names and means something;
 *      "calculator" appears in a hundred and twenty and means much less; "the"
 *      means nothing and scores nothing. The weighting is computed from the
 *      names themselves, so there is no stop-word list to keep.
 *
 * WHAT IT WILL NOT DO. A suggestion is only ever a URL that `isLiveToolUrl`
 * accepts, because that is the gate every other surface on this site checks
 * before offering a destination, and it is the gate that keeps a half-built
 * tool out of the visitor's way. Beyond it, the three pages in
 * `WITHHELD_ROUTES` are refused by name.
 *
 * SERVER ONLY. Reaching `publicTools` pulls in all eighteen operation modules.
 * Route files call this during the build and hand the finished links to the
 * tool component as plain data, so none of that weight reaches the browser.
 * `lib/seo/live-tool-routes.ts` exists for exactly the same reason.
 */

/**
 * Built, tested, and deliberately unpublished. The owner asked on 2026-09-20
 * that no new tool go out before a tech review, so these three have no route
 * registered and `isLiveToolUrl` already refuses them — this list is the
 * second lock, and the one that says out loud that the omission is a decision
 * rather than an oversight. `related-tools.test.ts` checks it still matches
 * `HELD_BACK` in `tool-page-registration.test.ts`, so releasing one of them
 * cannot leave half the repository believing it is still held.
 */
export const WITHHELD_ROUTES: ReadonlySet<string> = new Set([
  '/image/svg',
  '/image/colour',
  '/data/lists',
]);

/** A workbench landing page, which lists its own tools and needs no help. */
const HUB_ROUTE = /\/(?:workbench|advanced|writing)$/u;

export interface RelatedTool {
  /** A site-relative path that `isLiveToolUrl` accepts. */
  href: string;
  name: string;
  description: string;
  /** Why it is here, in words a visitor can read. */
  relationship: string;
}

interface ToolPage {
  href: string;
  name: string;
  description: string;
  category: string;
  /** `/math` for `/math/median-calculator`; the workbench it belongs to. */
  prefix: string;
  /** Index in that workbench's operation list; -1 for a single-tool page. */
  position: number;
  nameWords: readonly string[];
  /** What the tool says it does. A weaker signal than the name, and used so. */
  jobWords: readonly string[];
}

const prefixOf = (href: string) => `/${href.split('/')[1]}`;

function words(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/u)
        .filter((word) => word.length > 2),
    ),
  ];
}

/**
 * Category per route, from the manifests the home page and search already use.
 *
 * A workbench manifest lists every operation it hosts in `searchEntries`, so
 * the category of `/qr/wifi-qr-code` is the category the QR workbench declares
 * — no second table to keep in step. A single-tool manifest speaks for its own
 * route.
 */
function categoriesByRoute(): ReadonlyMap<string, string> {
  const categories = new Map<string, string>();
  for (const manifest of publicTools) {
    const path = manifest.href.split('?')[0]!;
    categories.set(path, manifest.category);
    for (const entry of manifest.searchEntries ?? []) {
      categories.set(`${prefixOf(path)}/${entry.id}`, manifest.category);
    }
  }
  return categories;
}

/**
 * Every page that runs one named tool, and can therefore be both a source of
 * suggestions and a destination for them.
 *
 * Workbench landing pages are left out on purpose: they already carry a
 * dropdown of everything they host, so a link to one is a link to a menu
 * rather than to the tool a visitor was about to need.
 */
function collectToolPages(): readonly ToolPage[] {
  const categories = categoriesByRoute();
  const pages = new Map<string, ToolPage>();

  const add = (page: ToolPage) => {
    if (HUB_ROUTE.test(page.href)) return;
    if (WITHHELD_ROUTES.has(page.href)) return;
    if (!isLiveToolUrl(page.href)) return;
    if (!pages.has(page.href)) pages.set(page.href, page);
  };

  for (const prefix of routedToolPrefixes()) {
    const operations = routedToolIdsForPrefix(prefix) ?? [];
    operations.forEach((operation, position) => {
      add({
        href: `${prefix}/${operation.id}`,
        name: operation.name,
        description: operation.description,
        category: categories.get(`${prefix}/${operation.id}`) ?? prefix,
        prefix,
        position,
        nameWords: words(operation.name),
        jobWords: words(operation.description),
      });
    });
  }

  // The hand-written pages — `/pdf/merge`, `/image/optimize` and the rest.
  // They are reached through the same scoring, so a routed tool can send
  // someone to one of them and the PDF and image tools stop being an island
  // of their own.
  for (const manifest of publicTools) {
    const href = manifest.href.split('?')[0]!;
    add({
      href,
      name: manifest.name,
      description: manifest.shortDescription,
      category: manifest.category,
      prefix: prefixOf(href),
      position: -1,
      nameWords: words(manifest.name),
      jobWords: words(manifest.shortDescription),
    });
  }

  return [...pages.values()];
}

const TOOL_PAGES = collectToolPages();

const PAGE_BY_HREF: ReadonlyMap<string, ToolPage> = new Map(
  TOOL_PAGES.map((page) => [page.href, page]),
);

/**
 * How much a shared word is worth: the rarer it is across every tool name, the
 * more two tools sharing it have in common. Standard inverse document
 * frequency, computed from the names themselves — which is why there is no
 * stop-word list here to fall out of date. "Converter" is cheap, "IFSC" is
 * expensive, "and" is free.
 */
function inverseFrequency(
  wordsPerPage: readonly (readonly string[])[],
): ReadonlyMap<string, number> {
  const frequency = new Map<string, number>();
  for (const page of wordsPerPage) {
    for (const word of page)
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }
  const weights = new Map<string, number>();
  for (const [word, count] of frequency) {
    weights.set(word, Math.log(wordsPerPage.length / count));
  }
  return weights;
}

const NAME_WEIGHT = inverseFrequency(TOOL_PAGES.map((page) => page.nameWords));
const JOB_WEIGHT = inverseFrequency(TOOL_PAGES.map((page) => page.jobWords));

/** A name word specific enough to stand on its own as a reason to link. */
const TOPIC_WEIGHT = Math.log(TOOL_PAGES.length / 30);

/**
 * The weakest relationship worth offering, set at the value of sharing a
 * category — the faintest signal here that is still a fact about the two
 * tools. Below it the scoring is finding coincidences: an audio trimmer and a
 * canonical URL builder share four words of description and nothing else, and
 * a link between them wastes the visitor's attention and tells a crawler
 * something untrue about the shape of the site. A short list of real
 * suggestions beats a full one padded with strangers.
 */
const MINIMUM_SCORE = 12;

function sharedWeight(
  mine: readonly string[],
  theirs: readonly string[],
  weights: ReadonlyMap<string, number>,
): number {
  const held = new Set(mine);
  let total = 0;
  for (const word of theirs) {
    if (held.has(word)) total += weights.get(word) ?? 0;
  }
  return total;
}

/** The shared name word that says the most about why these two go together. */
function sharpestSharedWord(from: ToolPage, to: ToolPage): string | undefined {
  const held = new Set(from.nameWords);
  let best: string | undefined;
  let bestWeight = 0;
  for (const word of to.nameWords) {
    const weight = held.has(word) ? (NAME_WEIGHT.get(word) ?? 0) : 0;
    if (weight > bestWeight) {
      best = word;
      bestWeight = weight;
    }
  }
  return bestWeight >= TOPIC_WEIGHT ? best : undefined;
}

function score(from: ToolPage, to: ToolPage): number {
  let total = 0;

  if (from.prefix === to.prefix) {
    // Hand-ordered lists group by job, so a neighbour is usually the next step.
    const gap =
      from.position < 0 || to.position < 0
        ? Number.POSITIVE_INFINITY
        : Math.abs(from.position - to.position);
    if (gap === 1) total += 50;
    else if (gap <= 3) total += 34;
    else if (gap <= 8) total += 18;
    else total += 6;
  }

  if (from.category === to.category) total += 12;

  total += 9 * sharedWeight(from.nameWords, to.nameWords, NAME_WEIGHT);
  // What a tool says it does, worth a fraction of what it is called. Enough to
  // find the neighbours of a tool that is alone in its category, never enough
  // to push a same-job tool out of the top of the list.
  total += 1.2 * sharedWeight(from.jobWords, to.jobWords, JOB_WEIGHT);

  return total;
}

/**
 * The line under a suggestion. It states the signal that actually put the tool
 * there and nothing more — no claim about what other people went on to use,
 * because nothing here measures that.
 */
function relationship(from: ToolPage, to: ToolPage): string {
  if (
    from.prefix === to.prefix &&
    from.position >= 0 &&
    to.position >= 0 &&
    Math.abs(from.position - to.position) <= 3
  ) {
    return 'Next along in the same workbench';
  }
  const word = sharpestSharedWord(from, to);
  // Printed as the destination writes it, so `csv` reads as CSV and `ifsc` as
  // IFSC rather than being flattened to the matching key.
  if (word) {
    const asWritten =
      to.name
        .split(/[^A-Za-z0-9]+/u)
        .find((part) => part.toLowerCase() === word) ?? word;
    return `Another ${asWritten} tool`;
  }
  if (from.category === to.category) return `Another ${to.category} tool`;
  return 'Describes the same job';
}

const MEMO = new Map<string, readonly RelatedTool[]>();

/**
 * Three to six tools worth offering at the end of `route`, best first.
 *
 * The last slot is kept for the best candidate from a different workbench when
 * everything above it came from the same one, so a page is a junction in the
 * site rather than a member of a fourteen-way clique. That slot is only filled
 * by a candidate that scored on its own merits; nothing is padded in just to
 * reach a number.
 *
 * Returns an empty list for a route that is not a live single-tool page, which
 * is the honest answer for a workbench landing page and for a URL that does
 * not resolve to a tool at all.
 */
export function relatedToolsFor(
  route: string,
  count = 4,
): readonly RelatedTool[] {
  const key = `${route}#${count}`;
  const memoized = MEMO.get(key);
  if (memoized) return memoized;

  const from = PAGE_BY_HREF.get(route);
  if (!from || count < 1) return [];

  const ranked = TOOL_PAGES.filter((page) => page.href !== from.href)
    .map((page) => ({ page, value: score(from, page) }))
    .filter((candidate) => candidate.value >= MINIMUM_SCORE)
    .sort(
      (a, b) => b.value - a.value || a.page.href.localeCompare(b.page.href),
    );

  const chosen = ranked.slice(0, count);
  if (
    chosen.length === count &&
    chosen.every((candidate) => candidate.page.prefix === from.prefix)
  ) {
    // A tool that only ever points back into its own workbench leaves the site
    // fourteen closed cliques. One slot goes to the best tool outside it —
    // but only to one that earned its place by sharing the category or a
    // specific word, never to whatever happened to rank highest.
    const outside = ranked.find(
      ({ page }) =>
        page.prefix !== from.prefix &&
        (page.category === from.category ||
          sharpestSharedWord(from, page) !== undefined),
    );
    if (outside) chosen.splice(count - 1, 1, outside);
  }

  const related = chosen.map(({ page }) => ({
    href: page.href,
    name: page.name,
    description: page.description,
    relationship: relationship(from, page),
  }));

  MEMO.set(key, related);
  return related;
}

/**
 * Every route this module will suggest from or to. The test walks it, so a
 * page that ships with no way out is a failing run rather than a discovery.
 */
export function linkableToolRoutes(): readonly string[] {
  return TOOL_PAGES.map((page) => page.href);
}

/**
 * Live tool routes this module holds no opinion about: workbench landing
 * pages, which list their own tools, and nothing else. Named so the test can
 * assert the exception stays that small.
 */
export function unlinkedLiveRoutes(): readonly string[] {
  return LIVE_TOOL_ROUTES.filter((route) => !PAGE_BY_HREF.has(route));
}
