import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPARE_ROUTES, MAX_COMPARE_PAGES } from './compare-pages';
import { buildSitemap } from './sitemap-entries';

/**
 * The rules Pillar 5 of `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` sets for
 * comparison pages, as something that runs.
 *
 * The genre is dangerous in two specific ways, and both have a check below.
 *
 * The first is scale. "Comparison page" is one search-and-replace away from a
 * hundred near-identical doorway pages — which is exactly what constraint C4
 * bars while guide consolidation is running, and what business rule 22 and
 * learning 24 call a trust and search risk. The cap is therefore enforced, not
 * merely written down.
 *
 * The second is the other party. These pages exist to say we are different
 * from something, and the tempting way to say it is to describe a named
 * company's limits or handling of your files. The project has no verified
 * source for such a fact: `AGENTS.md` forbids treating a search snippet or a
 * vendor's own privacy claim as validated evidence. `local-source-policy.test.ts`
 * already fails the build on nine competitor names anywhere under app/ or
 * components/; this file adds the second half of that rule — the comparison
 * may only be drawn against an architecture, and a page may not smuggle the
 * missing brand name in through its metadata either.
 */
const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const APP_DIR = path.join(projectRoot, 'app');
const COMPARE_DIR = path.join(APP_DIR, 'compare');

function pageFileFor(route: string): string {
  return path.join(APP_DIR, ...route.split('/').filter(Boolean), 'page.tsx');
}

function sourceFor(route: string): string {
  return readFileSync(pageFileFor(route), 'utf8');
}

/** Every `page.tsx` that actually exists under app/compare, whatever the list says. */
function pagesOnDisk(dir: string, found: string[] = []): string[] {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) pagesOnDisk(full, found);
    else if (entry === 'page.tsx') found.push(full);
  }
  return found;
}

/**
 * Read a string literal out of the exported metadata. Deliberately a source
 * match rather than an import: importing the route module pulls in the whole
 * component tree for a check about two strings.
 */
function metadataField(source: string, field: 'title' | 'description'): string {
  const match = source.match(
    new RegExp(`${field}:\\s*\\n?\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'u'),
  );
  if (!match) throw new Error(`no ${field} literal in metadata`);
  return match[1].replace(/\\'/gu, "'");
}

describe('hand-written comparison pages', () => {
  it('has a page on disk for every listed route, and lists every page on disk', () => {
    for (const route of COMPARE_ROUTES) {
      expect(existsSync(pageFileFor(route)), `${route} has no page.tsx`).toBe(
        true,
      );
    }

    const onDisk = pagesOnDisk(COMPARE_DIR)
      .map((file) => `/${path.relative(APP_DIR, path.dirname(file))}`)
      .sort();
    expect(onDisk).toEqual([...COMPARE_ROUTES].sort());
  });

  it('stays inside the three Pillar 5 allows', () => {
    // C4 is the reason this number is small. Raising it is an owner decision
    // about a recorded constraint, not a tidy-up — so it fails here first.
    expect(MAX_COMPARE_PAGES).toBe(3);
    expect(COMPARE_ROUTES.length).toBeLessThanOrEqual(MAX_COMPARE_PAGES);
  });

  it('is written by hand, not generated from a shared template', () => {
    // A dynamic segment under app/compare would be the doorway family C4 bars,
    // arriving one directory at a time.
    for (const route of COMPARE_ROUTES) {
      expect(
        route,
        'a dynamic comparison route is the doorway family',
      ).not.toContain('[');
    }

    // Three files sharing a rendering function are a template with extra
    // steps. Each page must own its own markup.
    const bodies = COMPARE_ROUTES.map((route) =>
      sourceFor(route).replace(/\s+/gu, ' '),
    );
    expect(new Set(bodies).size).toBe(COMPARE_ROUTES.length);
  });

  it('gives each page a self-canonical', () => {
    // lib/seo/canonical-coverage.test.ts sweeps app/ for the declaration; this
    // checks the value, which that sweep skips for a non-literal canonical.
    for (const route of COMPARE_ROUTES) {
      const source = sourceFor(route);
      expect(source, `${route} declares no canonical`).toMatch(
        /canonical\s*:/u,
      );
      expect(source, `${route} canonicalises to the wrong URL`).toContain(
        `'${route}',\n].join('')`,
      );
    }
  });

  it('submits each page in the sitemap exactly once', () => {
    const urls = buildSitemap().map((entry) => entry.url);
    for (const route of COMPARE_ROUTES) {
      const matches = urls.filter((url) => url.endsWith(route));
      expect(
        matches,
        `${route} is in the sitemap ${matches.length} times`,
      ).toHaveLength(1);
    }
  });

  it('gives each page a unique title and description inside snippet length', () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const route of COMPARE_ROUTES) {
      const source = sourceFor(route);
      const title = metadataField(source, 'title');
      const description = metadataField(source, 'description');

      /*
       * Measured as the browser and Google see it, not as it is typed.
       * `app/layout.tsx` sets `template: '%s · OpenTools'`, so twelve
       * characters are appended to every page title on the site. A page whose
       * literal is 60 renders at 72 and gets cut where the words that earn the
       * click are — and worse, a literal ending in "— OpenTools" renders the
       * brand twice, which is how `/proof` currently reads.
       *
       * Target: 50 to 60 as served.
       */
      const rendered = `${title} · OpenTools`;

      expect(
        title,
        `${route} repeats the brand the layout template already appends`,
      ).not.toMatch(/OpenTools/u);
      expect(
        rendered.length,
        `${route} renders a ${rendered.length}-char title: ${rendered}`,
      ).toBeGreaterThanOrEqual(50);
      expect(
        rendered.length,
        `${route} renders a ${rendered.length}-char title: ${rendered}`,
      ).toBeLessThanOrEqual(60);
      expect(
        description.length,
        `${route} description is ${description.length} chars`,
      ).toBeGreaterThanOrEqual(120);
      expect(
        description.length,
        `${route} description is ${description.length} chars`,
      ).toBeLessThanOrEqual(160);

      titles.add(title);
      descriptions.add(description);
    }

    expect(titles.size).toBe(COMPARE_ROUTES.length);
    expect(descriptions.size).toBe(COMPARE_ROUTES.length);
  });

  it('names no competitor, in the body or in the metadata', () => {
    /*
     * The same nine names local-source-policy.test.ts refuses under app/ and
     * components/, restated here for one reason: that test's roots could be
     * narrowed, or a page's title could be moved into lib/ where its scan does
     * not reach. A comparison page is precisely where someone would be tempted
     * to do that, so the rule is asserted where the temptation is.
     */
    const forbidden = [
      /\bAdobe\b/iu,
      /\bAcrobat\b/iu,
      /\biLovePDF\b/iu,
      /\bSmallpdf\b/iu,
      /\biLoveIMG\b/iu,
      /\bCanva\b/iu,
      /\bSejda\b/iu,
      /\bPDF24\b/iu,
      /\bTinyPNG\b/iu,
    ];

    const violations = COMPARE_ROUTES.flatMap((route) => {
      const source = sourceFor(route);
      return forbidden
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${route} names ${pattern.source}`);
    });

    expect(
      violations,
      'a comparison page may be drawn against an architecture, never against a named company we have no verified source for',
    ).toEqual([]);
  });

  it('never states the policy without stating the two routes that differ', () => {
    /*
     * `connect-src 'none'` is true of the tool routes and NOT of
     * `/image/background-remover` or `/image/editor`, which are served
     * `connect-src 'self'` so the background remover can load its ONNX model
     * and WebAssembly runtime from this origin
     * (`lib/security/content-security-policy.ts`, `LOCAL_MODEL_PATHS`).
     *
     * A page that states the first half and drops the second is the worst
     * outcome available here: it reads as a stronger claim, and the first
     * reader who follows our own instructions and opens the Network panel on
     * the background remover finds a request we told them could not exist.
     * They will not conclude that one route is special. They will conclude the
     * page lied, and they would be right to.
     */
    const violations = COMPARE_ROUTES.filter((route) => {
      const source = sourceFor(route);
      if (!source.includes('connect-src &apos;none&apos;')) return false;
      return !source.includes('connect-src &apos;self&apos;');
    });

    expect(
      violations,
      "states connect-src 'none' without the 'self' exception for the model routes",
    ).toEqual([]);
  });

  it('makes no speed claim, which nothing here measures', () => {
    // AGENTS.md: never claim speed without a test substantiating the exact
    // wording. Nothing compares this site's timings against anyone else's, so
    // the comparative forms are barred outright rather than argued about.
    const speedClaims = [
      /\bfaster than\b/iu,
      /\bquicker than\b/iu,
      /\bfastest\b/iu,
    ];
    const violations = COMPARE_ROUTES.flatMap((route) => {
      const source = sourceFor(route);
      return speedClaims
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${route} matched ${pattern.source}`);
    });

    expect(violations).toEqual([]);
  });

  it('dates every measured egress figure from the receipt rather than typing it', () => {
    /*
     * C2: a measured-privacy claim belongs to the release that was measured.
     * Two of the three pages restate the egress result, and both must read the
     * date from `egress-receipt.json` — which only `scripts/egress-receipt.mjs`
     * writes, after running the protocol against the deployed build. A
     * hand-typed date would keep looking fresh through a release that was
     * never tested.
     */
    for (const route of COMPARE_ROUTES) {
      const source = sourceFor(route);
      if (!/off-origin host/u.test(source)) continue;
      expect(source, `${route} states a measured result`).toContain(
        "from '@/lib/seo/egress-receipt.json'",
      );
      expect(source, `${route} states a measured result`).toContain(
        'egressReceipt.verifiedAt',
      );
    }
  });

  it('puts a working tool on every page', () => {
    // Pillar 5: "each a genuine comparison with a working tool on it". A
    // comparison page with nothing to click is an essay, and the reader who
    // arrived ready to do the job leaves without doing it.
    for (const route of COMPARE_ROUTES) {
      const source = sourceFor(route);
      const toolLinks = [
        ...source.matchAll(/['"](\/(?:pdf|image)\/[a-z-]+)['"]/gu),
      ];
      expect(
        toolLinks.length,
        `${route} links to no tool`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('links every page into the graph from something that is already crawled', () => {
    /*
     * An orphan page is worth close to nothing: nothing points at it, so
     * nothing flows to it. Each page must be reachable from a page that is
     * itself linked — either one of the always-linked surfaces below, or
     * another comparison page that is.
     */
    const entryPoints = [
      path.join(projectRoot, 'components', 'home-workspace.tsx'),
      path.join(APP_DIR, 'proof', 'page.tsx'),
      path.join(APP_DIR, 'security', 'page.tsx'),
    ];
    const reachable = new Set(
      COMPARE_ROUTES.filter((route) =>
        entryPoints.some((file) =>
          readFileSync(file, 'utf8').includes(`"${route}"`),
        ),
      ),
    );

    expect(
      [...reachable],
      'no comparison page is linked from the home page, /proof or /security',
    ).not.toEqual([]);

    // Walk outward: anything a reachable page links to is reachable too.
    const queue = [...reachable];
    while (queue.length > 0) {
      const from = queue.pop()!;
      for (const to of COMPARE_ROUTES) {
        if (reachable.has(to)) continue;
        if (sourceFor(from).includes(`"${to}"`)) {
          reachable.add(to);
          queue.push(to);
        }
      }
    }

    expect(
      COMPARE_ROUTES.filter((route) => !reachable.has(route)),
      'unreachable except by typing the URL',
    ).toEqual([]);

    // And each page links onward to both of its siblings, so the three form a
    // cluster rather than three dead ends.
    for (const route of COMPARE_ROUTES) {
      const source = sourceFor(route);
      for (const sibling of COMPARE_ROUTES) {
        if (sibling === route) continue;
        expect(source, `${route} does not link ${sibling}`).toContain(
          `"${sibling}"`,
        );
      }
    }
  });

  it('carries the section that admits what the other model does better', () => {
    /*
     * The rule that makes the genre credible, and the first thing that would
     * be quietly dropped in a rewrite: a comparison admitting nothing reads as
     * marketing, earns no links, and is not honest about a real trade-off.
     */
    const concession =
      /(does better|loses|not give you|does not claim|neither model)/iu;
    for (const route of COMPARE_ROUTES) {
      expect(
        concession.test(sourceFor(route)),
        `${route} never says what the other side does better`,
      ).toBe(true);
    }
  });
});
