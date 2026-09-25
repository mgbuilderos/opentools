import { describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { auditRenderedPages } from '../../scripts/check-share-and-heading-order.mjs';

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
 *
 * A `disallow` array may spread a named const -- `SCANNER_PATHS` holds the two
 * dozen vulnerability-scanner prefixes, and writing them out twice would let
 * the two rules drift apart. The spread is resolved here so the guard still
 * sees the whole list: if it silently did not, every one of those prefixes
 * would quietly stop excluding anything, which is the failure this reads
 * robots.ts to avoid in the first place.
 */
const DISALLOWED: readonly string[] = (() => {
  const robots = readFileSync(path.join(APP_DIR, 'robots.ts'), 'utf8');
  const literalsIn = (source: string) =>
    [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const found = new Set<string>();
  for (const list of robots.matchAll(/disallow:\s*\[([^\]]*)\]/g)) {
    for (const entry of literalsIn(list[1])) found.add(entry);
    for (const spread of list[1].matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)) {
      const declaration = robots.match(
        new RegExp(`const ${spread[1]}\\s*=\\s*\\[([^\\]]*)\\]`),
      );
      if (!declaration) {
        throw new Error(
          `robots.ts spreads ...${spread[1]} into a disallow list, but no ` +
            `\`const ${spread[1]} = [...]\` was found to resolve it.`,
        );
      }
      for (const entry of literalsIn(declaration[1])) found.add(entry);
    }
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
> = [
  ['toolPageMetadata', 'lib/seo/tool-page-depth.ts'],
  // The nineteen category hubs. Every one of them is four lines calling this
  // helper, which is the point: one place states the canonical, so it cannot
  // be right on eighteen pages and missing on the nineteenth.
  ['categoryHubMetadata', 'lib/seo/category-hub-metadata.ts'],
];

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
   * The disallow reader above is a regex over another file, so it can fail
   * open: a change to how robots.ts writes its lists would leave `DISALLOWED`
   * empty and every assertion below would still pass, having quietly stopped
   * excluding `/guides-cached/`. Assert what it must always contain.
   */
  it('reads the disallow list out of robots.ts, spreads included', () => {
    expect(DISALLOWED).toContain('/api/');
    expect(DISALLOWED).toContain('/guides-cached/');
    expect(DISALLOWED).toContain('/embed/');
    expect(DISALLOWED).toContain('/wp-json/');
  });

  /**
   * A disallowed prefix removes every matching route from this sweep, so a
   * prefix that shadows a real route disables the guard for it silently. The
   * scanner prefixes are meant to match nothing under `app/`; the two real
   * ones are named here so the check is about the accident, not the intent.
   */
  it('has no scanner prefix shadowing a real route', () => {
    // `/embed/` joined the two on 2026-09-24. It shadows `app/embed/[tool]`
    // on purpose: those pages are the framable copies other sites embed, they
    // are disallowed so a crawler never indexes a stripped duplicate of a page
    // this site is trying to rank, and they deliberately declare no canonical
    // -- pointing one at the real tool page would invite Google to treat the
    // two as one document and prefer the stripped copy. ADR-019 and
    // `lib/security/embed-framing.test.ts`. `/embed` itself is not disallowed,
    // is in the sitemap, and is swept like any other page.
    const intentional = new Set(['/api/', '/guides-cached/', '/embed/']);
    const shadowing = DISALLOWED.filter(
      (prefix) =>
        !intentional.has(prefix) &&
        pageFiles(APP_DIR).some((file) => routeFor(file).startsWith(prefix)),
    );
    expect(shadowing).toEqual([]);
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

  /**
   * Dynamic routes (`[tool]` and `[pair]`) generate 1,200+ of the site's pages.
   * Skipping them in the static test let dynamic pages ship without their
   * prefix-bound canonical targets being checked.
   */
  it('guarantees every dynamic page file generates self-canonical URLs with its route prefix', () => {
    const dynamicFiles = files.filter((file) => routeFor(file).includes('['));
    const wrong: string[] = [];
    for (const file of dynamicFiles) {
      const source = readFileSync(file, 'utf8');
      const route = routeFor(file);
      const prefix = route.slice(0, route.indexOf('[') - 1);
      const usesHelper = CANONICAL_HELPERS.some(([name]) =>
        source.includes(`${name}(`),
      );
      const bindsPrefix =
        source.includes(`${prefix}/`) ||
        source.includes(`BASE = '${prefix}'`) ||
        source.includes(`BASE = "${prefix}"`) ||
        source.includes(`'${prefix}'`);
      const declaresCanon = DECLARES.test(source);
      if (!declaresCanon && !usesHelper) {
        wrong.push(`${route}: missing canonical declaration`);
      } else if (!usesHelper && !bindsPrefix) {
        wrong.push(
          `${route}: canonical does not bind route prefix "${prefix}"`,
        );
      }
    }
    expect(wrong).toEqual([]);
  });
});

/**
 * The half of this claim that source cannot make.
 *
 * Everything above greps `app/**` for a `canonical:` declaration. That is a
 * statement about what the pages ASK FOR, and the 2026-09-23 fault was not a
 * missing declaration -- it was an INHERITED one, which no page file contains.
 * Nothing in this file reads a byte of built HTML, so prerendering was
 * unguarded: source correct, live bytes checked only after a deploy had already
 * shown Google the fault, and the step in between checked by nothing.
 *
 * `scripts/check-share-and-heading-order.mjs` closes that, on every build,
 * using the same `canonicalFault` the live gate uses. These two tests prove the
 * build actually runs it -- a guard that has quietly become a no-op is worse
 * than none, which is the argument `share-card-coverage.test.ts` makes for its
 * own detectors.
 */
describe('the build guards canonicals in the prerendered bytes', () => {
  /** A throwaway `dist/client` holding one route, so the guard has bytes to read. */
  function fakeClientDir(canonicalTags: string): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'canon-guard-'));
    const origin = ['https:', '//', 'getopentools.com'].join('');
    writeFileSync(
      path.join(dir, 'sitemap.xml'),
      `<urlset><url><loc>${origin}/pdf/merge</loc></url></urlset>`,
    );
    mkdirSync(path.join(dir, 'pdf'), { recursive: true });
    /* Everything the other three checks want, so the only fault that can be
     * reported is the canonical one under test. */
    writeFileSync(
      path.join(dir, 'pdf', 'merge.html'),
      `<!doctype html><html lang="en"><head>
<meta property="og:title" content="Merge PDF"/>
<meta property="og:description" content="Merge PDF files in your browser."/>
<meta property="og:image" content="${origin}/og.png"/>
${canonicalTags}
</head><body><h1>Merge PDF</h1><h2>How</h2></body></html>`,
    );
    return dir;
  }

  const self = ['https:', '//', 'getopentools.com', '/pdf/merge'].join('');
  const home = ['https:', '//', 'getopentools.com'].join('');
  const foreign = ['https:', '//', 'evil.test', '/pdf/merge'].join('');

  /* `auditRenderedPages` returns null when it finds no sitemap to read, which
   * would make every assertion below vacuous. The fixture always writes one, so
   * a null here is the fixture being wrong and must be loud. */
  const canonicalFaults = (tags: string) => {
    const audited = auditRenderedPages(fakeClientDir(tags));
    if (audited === null) throw new Error('fixture wrote no sitemap.xml');
    return audited.faults.filter(
      (fault: { check: string }) => fault.check === 'canonical',
    );
  };

  it('passes a prerendered page that names itself', () => {
    expect(canonicalFaults(`<link rel="canonical" href="${self}"/>`)).toEqual(
      [],
    );
  });

  /** The 2026-09-23 fault itself, caught one stage before a deploy. */
  it('fails a prerendered page whose canonical points at the home page', () => {
    const [fault] = canonicalFaults(`<link rel="canonical" href="${home}"/>`);
    expect(fault?.detail).toContain('points at');
    expect(fault?.detail).toContain(home);
  });

  it('fails a prerendered page carrying no canonical at all', () => {
    expect(canonicalFaults('')[0]?.detail).toBe('no canonical');
  });

  /**
   * The same fault mid-fix: a page that declares its own canonical and still
   * inherits one serves two, the correct one first. Google honours neither.
   */
  it('fails a second canonical hiding behind a correct one', () => {
    const [fault] = canonicalFaults(
      `<link rel="canonical" href="${self}"/><link rel="canonical" href="${home}"/>`,
    );
    expect(fault?.detail).toContain('2 canonical tags');
  });

  /** A matching path on someone else's origin is not this page. */
  it('fails a canonical whose path matches on a foreign origin', () => {
    expect(
      canonicalFaults(`<link rel="canonical" href="${foreign}"/>`)[0]?.detail,
    ).toContain('evil.test');
  });

  /**
   * And over the real population when a build is present, so `vitest run` after
   * a build proves the whole thing rather than the fixture.
   *
   * Measured against the `5a1a6a8` build on 2026-09-26: 1,464 sitemap URLs, 0
   * canonical faults -- the same 1,464 the live sweep reads. The two prerendered
   * files with no canonical, `404.html` and `embed/table-converter.html`, are
   * correctly out of scope: neither is a sitemap URL, `/embed/` is disallowed in
   * `robots.txt` and that page ships `noindex`.
   */
  it('finds no canonical fault in the current build, if there is one', () => {
    const clientDir = path.join(__dirname, '..', '..', 'dist', 'client');
    if (!existsSync(path.join(clientDir, 'sitemap.xml'))) return;
    const result = auditRenderedPages(clientDir);
    if (result === null)
      throw new Error(`${clientDir} has a sitemap but read null`);
    expect(
      result.faults.filter(
        (fault: { check: string }) => fault.check === 'canonical',
      ),
    ).toEqual([]);
    expect(result.checked).toBeGreaterThan(1000);
  });
});
