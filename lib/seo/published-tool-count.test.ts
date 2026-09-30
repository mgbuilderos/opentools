import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { publicTools } from '../tools/catalog';
import { LIVE_TOOL_CATALOG } from './live-tools';

/**
 * Every page that tells a reader how many tools this site has must count them
 * from the same registry.
 *
 * WHY. `lib/seo/stated-numbers.test.ts` already forbids a hand-written tool
 * count in `app/` and `components/`, and it works. What it cannot see is which
 * registry a *computed* count came from, and on 2026-09-30 that turned out to
 * matter: this site publishes two different tool counts at the same time, both
 * counted from a registry, and nothing anywhere noticed.
 *
 *   /self-host  "All 86 tools, and every guide, from the one image."
 *   /about      "OpenTools is 568 everyday tools across 19 categories"
 *   /privacy    "All 568 tools on this site run inside the browser tab"
 *   llms.txt    "an open-source web app with 568 ... utilities"
 *
 * `app/self-host/page.tsx` reads `publicTools.length`; the other three read
 * `LIVE_TOOL_CATALOG.length`. Both are honest counts of different things —
 * `publicTools` holds the tool manifests the app ships, `LIVE_TOOL_CATALOG`
 * holds the catalogue rows that pass `isLiveToolUrl` — and neither author did
 * anything careless. `self-host/page.tsx` even carries a comment explaining
 * that it counts from the registry rather than typing a number, which is the
 * right instinct and still landed on a different answer to the page next door.
 *
 * The same split reaches the copy that gets posted. `packaging/packaging.test.ts`
 * holds the CasaOS, Umbrel and Unraid manifests to `publicTools.length`, and
 * `scripts/launch-claims.test.ts` holds `docs/LAUNCH_KIT.md` to the same, while
 * the site a reader then visits says the larger number on three of its pages and
 * in the machine-readable index that AI crawlers read.
 *
 * WHAT THIS TEST DOES, AND DOES NOT, DECIDE. It does not pick the number. Which
 * figure this site should claim publicly is the owner's call — it goes verbatim
 * into a Hacker News title and three app-store listings — and it is on
 * `AGENT_BOARD.md` awaiting that decision. Until then the divergence stays, and
 * this test's job is to stop it from growing and to make it impossible to
 * forget: a new surface has to be declared below, no third registry may become a
 * published count, and the day the two agree this file fails and says to delete
 * the exception.
 *
 * Deliberately not asserted: the values 86 and 568. Both move whenever a tool
 * ships, so writing them down here would make this file the next stale claim.
 * What is asserted is the shape — two registries, each read by the surfaces
 * named below.
 */

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

/** The registries that can answer "how many tools does this site have". */
const REGISTRIES = {
  publicTools: 'publicTools',
  liveToolCatalog: 'LIVE_TOOL_CATALOG',
} as const;
type Registry = (typeof REGISTRIES)[keyof typeof REGISTRIES];

/**
 * How a published count is spelled in shipped source.
 *
 * `getLiveToolsByCategory(...).length` is here because the 19 category hubs
 * render it as a tool count in prose ("OpenTools has 68 working tools in ..."),
 * and it is `LIVE_TOOL_CATALOG` filtered by category — the same registry,
 * reached by a different call.
 */
const COUNT_EXPRESSIONS: readonly (readonly [RegExp, Registry])[] = [
  [/\bpublicTools\.length\b/u, REGISTRIES.publicTools],
  [/\bLIVE_TOOL_CATALOG\.length\b/u, REGISTRIES.liveToolCatalog],
  [/\bgetLiveToolsByCategory\b/u, REGISTRIES.liveToolCatalog],
];

/**
 * Every shipped file that turns one of those into something a reader or a
 * crawler sees, and the registry it uses. Measured 2026-09-30 on `1efd87a`.
 *
 * Adding a surface means adding it here. That is the point: the declaration is
 * where somebody has to look at the registry they picked and notice whether the
 * page next to theirs picked the other one.
 */
const PUBLISHED_COUNTS: Readonly<Record<string, Registry>> = {
  'app/about/page.tsx': REGISTRIES.liveToolCatalog,
  'app/privacy/page.tsx': REGISTRIES.liveToolCatalog,
  'app/guides/category/[category]/page.tsx': REGISTRIES.liveToolCatalog,
  'lib/seo/llms-text.ts': REGISTRIES.liveToolCatalog,
  'app/self-host/page.tsx': REGISTRIES.publicTools,
};

/** Shipped source only: a count inside a test is a fixture, not a claim. */
function shippedSources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(path.join(ROOT, dir))) {
    const rel = path.posix.join(dir, name);
    if (statSync(path.join(ROOT, rel)).isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      out.push(...shippedSources(rel));
    } else if (
      (name.endsWith('.ts') || name.endsWith('.tsx')) &&
      !name.includes('.test.')
    ) {
      out.push(rel);
    }
  }
  return out;
}

/** Source with comments removed: a registry named in a comment is a note. */
function visibleSource(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8')
    .replaceAll(/\/\*[\s\S]*?\*\//gu, '')
    .replaceAll(/^\s*\/\/.*$/gmu, '');
}

function scanPublishedCounts(): Map<string, Set<Registry>> {
  const found = new Map<string, Set<Registry>>();
  for (const rel of [
    ...shippedSources('app'),
    ...shippedSources('components'),
    ...shippedSources('lib'),
  ]) {
    const source = visibleSource(rel);
    const used = new Set<Registry>();
    for (const [expression, registry] of COUNT_EXPRESSIONS) {
      if (expression.test(source)) used.add(registry);
    }
    if (used.size > 0) found.set(rel, used);
  }
  return found;
}

/**
 * The registries a file reads, minus the ones it only reads to build the
 * catalogue itself. `live-tools.ts` defines `LIVE_TOOL_CATALOG`, and the SEO
 * modules that consume it to build a link graph or a sitemap are not stating a
 * number to anybody.
 */
const NOT_A_PUBLISHED_CLAIM: readonly string[] = [
  'lib/seo/live-tools.ts',
  'lib/seo/internal-linking-graph.ts',
  'lib/seo/guide-content.ts',
  'lib/seo/guide-consolidation.ts',
];

describe('the tool count this site publishes', () => {
  it('finds the surfaces at all, so a passing run means something', () => {
    const scanned = scanPublishedCounts();

    expect(
      scanned.size,
      'no file in app/, components/ or lib/ reads a tool count from a ' +
        'registry. Either every published count was removed, or the ' +
        'expressions above stopped matching how they are spelled.',
    ).toBeGreaterThan(Object.keys(PUBLISHED_COUNTS).length);
  });

  it('declares every shipped surface that publishes a tool count', () => {
    const scanned = scanPublishedCounts();
    const undeclared = [...scanned.keys()]
      .filter((rel) => !(rel in PUBLISHED_COUNTS))
      .filter((rel) => !NOT_A_PUBLISHED_CLAIM.includes(rel))
      .toSorted();

    expect(
      undeclared,
      'these files read a tool count from a registry and are not declared in ' +
        'PUBLISHED_COUNTS. If the number reaches a reader or a crawler, add it ' +
        'there with the registry it uses — and check that it matches the ' +
        'surfaces beside it, because two of them currently disagree. If the ' +
        'count never leaves the module, add it to NOT_A_PUBLISHED_CLAIM with ' +
        'the reason.',
    ).toEqual([]);
  });

  it('keeps each declared surface on the registry it was declared with', () => {
    const scanned = scanPublishedCounts();
    const moved = Object.entries(PUBLISHED_COUNTS)
      .filter(([rel, declared]) => {
        const used = scanned.get(rel);
        return used === undefined || !used.has(declared);
      })
      .map(([rel, declared]) => `${rel} no longer reads ${declared}`);

    expect(
      moved,
      'a declared surface stopped reading the registry it was declared with. ' +
        'If that is the resolution of the two-number split, update ' +
        'PUBLISHED_COUNTS and delete whichever half is now empty.',
    ).toEqual([]);
  });

  it('lets no third registry become a published tool count', () => {
    const declared = new Set<Registry>(Object.values(PUBLISHED_COUNTS));

    expect(
      [...declared].toSorted(),
      'a published tool count is being read from a registry that is not one ' +
        'of the two this site already disagrees with. Three would be worse ' +
        'than two.',
    ).toEqual([REGISTRIES.liveToolCatalog, REGISTRIES.publicTools].toSorted());
  });

  /*
   * The exception, and the condition for removing it.
   *
   * This asserts that the split is still real rather than asserting the two
   * numbers, because both move whenever a tool ships. When the owner picks one
   * registry and the surfaces are moved onto it, the two counts become equal,
   * this fails, and the message says what to do — which is the only way an
   * exception recorded in a test gets taken out again.
   */
  it('still has two different published counts, pending the owner decision', () => {
    expect(
      new Set([publicTools.length, LIVE_TOOL_CATALOG.length]).size,
      'the two registries now report the same tool count, so the split this ' +
        'file exists to contain is over. Delete this test, collapse ' +
        'PUBLISHED_COUNTS onto the one registry, and clear the open question ' +
        'on AGENT_BOARD.md.',
    ).toBe(2);
  });
});
