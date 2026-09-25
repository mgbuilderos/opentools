import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { getLiveCategories } from './live-tools';
import { CATEGORY_DESCRIPTIONS } from './internal-linking-graph';

/**
 * Every page must carry a meta description of its own, long enough to be the
 * snippet and unlike every other page's.
 *
 * On 2026-09-23 a sweep of the live site found 115 pages whose description was
 * under 50 characters -- `/math/proportion-calculator` served 16, the whole of
 * "Solve a:b = c:x." -- and three more sharing one sentence between them. None
 * of those strings was wrong. They were in-app labels written for a card in a
 * menu, and they became the description because `generateMetadata` passes the
 * operation's own `description` straight through. Nothing in the repo looked
 * broken, and 116 pages went to Google with a snippet Google was free to
 * ignore.
 *
 * Under 50 characters is the threshold `scripts/audit-live-seo.mjs` reports
 * against production, so this test is the same rule one step earlier: it fails
 * the build instead of waiting for the next live sweep.
 *
 * THE RESOLUTION IS THE POINT. A description may come from a static `metadata`
 * export, from a `generateMetadata` that reads a workbench operation, a depth
 * entry, a catalogue row or a category pillar, or from a sibling `layout.tsx`
 * -- and the failure this guards against is precisely the one where a source
 * that looks fine in isolation produces a bad string at the page. So the test
 * imports each page module and calls the real `generateMetadata` for every
 * param `generateStaticParams` returns, which is what Next itself does. No
 * substring search over the source could see any of that. It is also why
 * `vitest.config.ts` has to alias `next/navigation` and `next/image`: a page
 * module cannot be imported without them.
 */
const APP_DIR = path.join(__dirname, '..', '..', 'app');

/** Matches `scripts/audit-live-seo.mjs`, which is what production is judged by. */
const MIN_LENGTH = 50;

/**
 * Routes `app/robots.ts` disallows are never crawled, so their snippet is nobody's
 * problem. Read from robots.ts rather than listed here, so opening a path to
 * crawlers also brings it under this guard.
 */
const DISALLOWED: readonly string[] = (() => {
  const robots = readFileSync(path.join(APP_DIR, 'robots.ts'), 'utf8');
  const found = new Set<string>();
  for (const list of robots.matchAll(/disallow:\s*\[([^\]]*)\]/g)) {
    for (const entry of list[1].matchAll(/'([^']+)'/g)) found.add(entry[1]);
  }
  return [...found];
})();

function pageFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) pageFiles(full, found);
    else if (entry === 'page.tsx') found.push(full);
  }
  return found;
}

/** `/app/pdf/merge/page.tsx` -> `/pdf/merge`; the root page -> `/`. */
function routeFor(file: string): string {
  const rel = path.relative(APP_DIR, path.dirname(file));
  return rel === '' ? '/' : `/${rel}`;
}

interface Resolved {
  route: string;
  description: string | null;
}

/**
 * Every description one page file produces, the way Next would produce it.
 *
 * A client component cannot export `metadata`, so a few routes state theirs in
 * a sibling `layout.tsx`. That counts -- a page inheriting from further up does
 * not, because the root layout's site-wide sentence is the same on every page
 * that falls back to it, which the duplicate assertion below then catches.
 */
async function resolve(file: string): Promise<Resolved[]> {
  const route = routeFor(file);
  const page = await import(file);
  const siblingLayout = path.join(path.dirname(file), 'layout.tsx');
  const fromLayout = existsSync(siblingLayout)
    ? ((await import(siblingLayout)).metadata?.description ?? null)
    : null;

  if (typeof page.generateMetadata !== 'function') {
    return [{ route, description: page.metadata?.description ?? fromLayout }];
  }

  const params: Array<Record<string, string>> =
    typeof page.generateStaticParams === 'function'
      ? await page.generateStaticParams()
      : [{}];

  return Promise.all(
    params.map(async (param) => {
      const metadata = await page.generateMetadata({
        params: Promise.resolve(param),
      });
      return {
        route: Object.entries(param).reduce(
          (acc, [key, value]) => acc.replace(`[${key}]`, value),
          route,
        ),
        description: metadata?.description ?? fromLayout,
      };
    }),
  );
}

describe('description coverage', () => {
  const files = pageFiles(APP_DIR).filter(
    (file) => !DISALLOWED.some((prefix) => routeFor(file).startsWith(prefix)),
  );

  let cache: Resolved[] | undefined;
  async function all(): Promise<Resolved[]> {
    if (!cache) {
      const resolved: Resolved[] = [];
      for (const file of files) resolved.push(...(await resolve(file)));
      cache = resolved;
    }
    return cache;
  }

  it('finds the app routes at all, so an empty sweep cannot pass', async () => {
    expect(files.length).toBeGreaterThan(50);
    // The live sitemap carried 1,392 URLs when this was written. A resolution
    // that collapses to a handful would otherwise pass every assertion below.
    expect((await all()).length).toBeGreaterThan(1_000);
  }, 600_000);

  it('gives every page a description of its own', async () => {
    const missing = (await all())
      .filter((entry) => !entry.description)
      .map((entry) => entry.route)
      .sort();
    expect(missing).toEqual([]);
  }, 600_000);

  it('never serves a description too short to be the snippet', async () => {
    const short = (await all())
      .filter(
        (entry) => entry.description && entry.description.length < MIN_LENGTH,
      )
      .map((entry) => `${entry.route} (${entry.description!.length} chars)`)
      .sort();
    expect(short).toEqual([]);
  }, 600_000);

  it('lets no two pages share a description', async () => {
    const byDescription = new Map<string, string[]>();
    for (const entry of await all()) {
      if (!entry.description) continue;
      byDescription.set(entry.description, [
        ...(byDescription.get(entry.description) ?? []),
        entry.route,
      ]);
    }
    const shared = [...byDescription]
      .filter(([, routes]) => routes.length > 1)
      .map(([description, routes]) => `${routes.join(', ')} :: ${description}`)
      .sort();
    expect(shared).toEqual([]);
  }, 600_000);

  /**
   * `getCategoryPillar` falls back to "In-browser utilities for <x> tasks." for
   * a category nobody wrote a sentence for, and that fallback is what
   * `/guides/category/pdf-and-documents` served. It is long enough to pass the
   * assertions above once a category name is long enough, so the absence is
   * asserted directly rather than left to the length rule to catch by accident.
   */
  it('writes a real sentence for every live category pillar', () => {
    const unwritten = getLiveCategories()
      .filter((category) => !CATEGORY_DESCRIPTIONS[category])
      .sort();
    expect(unwritten).toEqual([]);
  });
});
