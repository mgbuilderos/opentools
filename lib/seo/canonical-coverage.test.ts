import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Every page must state its own canonical URL.
 *
 * On 2026-09-23 a live sweep of all 1,295 sitemap URLs found 59 of them
 * serving `<link rel="canonical" href="https://getopentools.com">` -- every
 * PDF tool, every image tool and all fourteen workbenches telling Google they
 * are duplicates of the home page. None of those files was wrong on its own
 * terms: they simply omitted `alternates.canonical`, and Next.js inherited the
 * one `app/layout.tsx` declared for `/`. The omission was invisible in source
 * and only visible in the served HTML, which is exactly what a guard is for.
 *
 * The rule is deliberately about the declaration, not the value being
 * non-empty: a page that inherits silently is the failure mode.
 */
const APP_DIR = path.join(__dirname, '..', '..', 'app');

/**
 * Routes `app/robots.ts` disallows are never crawled, so a canonical on them
 * would say nothing to anyone. Read from robots.ts rather than listed here,
 * so opening a path to crawlers also brings it under this guard.
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
    if (statSync(full).isDirectory()) {
      pageFiles(full, found);
    } else if (entry === 'page.tsx') {
      found.push(full);
    }
  }
  return found;
}

function layouts(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) layouts(full, found);
    else if (entry === 'layout.tsx') found.push(full);
  }
  return found;
}

/**
 * A real declaration, not the word in prose. `app/layout.tsx` carries a
 * comment explaining why it no longer sets one, and a substring match on
 * "canonical" counted that comment as a declaration.
 */
const DECLARES = /canonical\s*:/;

/**
 * A page may set its canonical through a helper instead of a literal, so that
 * the title, description and canonical of a tool page stay one decision. Each
 * helper named here is itself asserted below to set a self-canonical -- the
 * indirection is allowed, not the omission.
 */
const CANONICAL_HELPERS: ReadonlyArray<
  readonly [name: string, source: string]
> = [['toolPageMetadata', 'lib/seo/tool-page-depth.ts']];

function declaresIn(file: string): boolean {
  const source = readFileSync(file, 'utf8');
  if (DECLARES.test(source)) return true;
  return CANONICAL_HELPERS.some(([name]) => source.includes(`${name}(`));
}

/** `/app/pdf/merge/page.tsx` -> `/pdf/merge`; the root page -> `/`. */
function routeFor(file: string): string {
  const rel = path.relative(APP_DIR, path.dirname(file));
  return rel === '' ? '/' : `/${rel}`;
}

describe('canonical coverage', () => {
  const files = pageFiles(APP_DIR).filter(
    (file) => !DISALLOWED.some((prefix) => routeFor(file).startsWith(prefix)),
  );
  const layoutFiles = layouts(APP_DIR);

  it('finds the app routes at all, so an empty sweep cannot pass', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  /**
   * A client component cannot export `metadata`, so a few routes state their
   * canonical in a sibling `layout.tsx` instead. That counts -- what must not
   * happen is a page stating it nowhere and picking one up from an ancestor.
   */
  function declaresCanonical(file: string): boolean {
    if (declaresIn(file)) return true;
    const sibling = path.join(path.dirname(file), 'layout.tsx');
    return existsSync(sibling) && declaresIn(sibling);
  }

  it('declares a canonical on every page', () => {
    const missing = files
      .filter((file) => !declaresCanonical(file))
      .map(routeFor)
      .sort();
    expect(missing).toEqual([]);
  });

  /**
   * The 2026-09-23 failure again, one level down: a `layout.tsx` canonical is
   * inherited by every descendant page that omits its own. A layout may state
   * one for its own route, but no page below it may rely on that.
   */
  it('lets no page inherit a canonical from a layout above it', () => {
    const inheriting: string[] = [];
    for (const file of files) {
      if (declaresIn(file)) continue;
      const own = path.join(path.dirname(file), 'layout.tsx');
      for (const layout of layoutFiles) {
        if (layout === own) continue;
        const scope = path.dirname(layout);
        const withinScope = !path.relative(scope, file).startsWith('..');
        if (withinScope && declaresIn(layout)) {
          inheriting.push(
            `${routeFor(file)} <- ${path.relative(APP_DIR, layout)}`,
          );
        }
      }
    }
    expect(inheriting).toEqual([]);
  });

  /**
   * The indirection above is only safe while the helper really does set one.
   * If `toolPageMetadata` ever stops emitting a canonical, every page that
   * delegates to it goes silent at once -- which is the 2026-09-23 failure at
   * scale, so it is asserted directly rather than trusted.
   */
  it('has every canonical helper actually set a self-canonical', () => {
    const broken: string[] = [];
    for (const [name, source] of CANONICAL_HELPERS) {
      const full = path.join(APP_DIR, '..', source);
      if (!existsSync(full)) {
        broken.push(`${name}: ${source} is missing`);
        continue;
      }
      const text = readFileSync(full, 'utf8');
      if (!DECLARES.test(text))
        broken.push(`${name}: ${source} sets no canonical`);
      if (!text.includes('route'))
        broken.push(`${name}: ${source} ignores the route`);
    }
    expect(broken).toEqual([]);
  });

  it('never re-declares a site-wide canonical on the root layout', () => {
    const layout = readFileSync(path.join(APP_DIR, 'layout.tsx'), 'utf8');
    const declaration = /alternates:[\s\S]*?canonical\s*:/;
    expect(declaration.test(layout)).toBe(false);
  });

  it('points each static route at itself, not at another page', () => {
    const wrong: string[] = [];
    for (const file of files) {
      const route = routeFor(file);
      if (route.includes('[')) continue;
      const source = readFileSync(file, 'utf8');
      const match = source.match(/canonical:\s*'([^']+)'/);
      if (!match) continue;
      if (match[1] !== route) wrong.push(`${route} -> ${match[1]}`);
    }
    expect(wrong).toEqual([]);
  });
});
