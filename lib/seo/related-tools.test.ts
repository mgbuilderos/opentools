import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  linkableToolRoutes,
  relatedToolsFor,
  unlinkedLiveRoutes,
  WITHHELD_ROUTES,
} from './related-tools';
import {
  isLiveToolUrl,
  LIVE_TOOL_ROUTES,
  routedToolPrefixes,
} from './live-tools';

/**
 * A suggestion that goes nowhere is worse than no suggestion. It spends the
 * one click a visitor was willing to give on a 404, and it teaches a crawler
 * that this site links to pages that do not exist.
 *
 * Two failures are specifically in scope, because both have happened here:
 *
 *   - Linking a tool that was built but never registered. Six shipped that way
 *     on 2026-09-20, invisible to every CTA and every sitemap.
 *   - Linking one of the three pages the owner asked to hold back. Those are
 *     finished and passing their own tests, so nothing except a deliberate
 *     check keeps them out of a list assembled by score.
 *
 * And the failure this whole change exists to end: a tool page with no way out
 * of it.
 */

const projectRoot = path.resolve(import.meta.dirname, '..', '..');

/**
 * Two live tools have fewer than three honest neighbours, and padding their
 * lists would mean linking strangers.
 *
 * `/video/trim` is the only Video tool on the site and `/audio/mp3-toolkit` is
 * one of two Audio tools, so after the same-category and shared-word signals
 * are exhausted there is genuinely nothing else a person doing that job wants
 * next. Both still get the real neighbours they have. Any third route joining
 * this list is a regression in the scoring, not a new exception to write in.
 */
const SHORT_BY_NATURE = new Set(['/video/trim', '/audio/mp3-toolkit']);

const ROUTES = linkableToolRoutes();

describe('related tools are real, live and never the withheld three', () => {
  it('finds the tool pages at all, so a passing run means something', () => {
    // Every assertion below is a loop over ROUTES. If the module ever returned
    // an empty catalogue they would all pass while checking nothing.
    expect(ROUTES.length).toBeGreaterThan(500);
    for (const anchor of [
      '/math/median-calculator',
      '/data/csv-to-json',
      '/qr/wi-fi-qr-code',
      '/pdf/merge',
      '/text/word-counter',
    ]) {
      expect(ROUTES, `${anchor} should be a linkable tool page`).toContain(
        anchor,
      );
    }
  });

  // 20s, not the 5s default. This walks every one of ~679 routes and scores
  // each against the whole catalogue, so it sits near the default budget on an
  // idle machine and crosses it whenever anything else is compiling — which,
  // in a repo several lanes build in at once, is most of the time. The
  // assertion is about dead links and is unchanged; only the clock moved.
  it(
    'suggests nothing that is not a live tool URL',
    { timeout: 20_000 },
    () => {
      // `isLiveToolUrl` is the gate every other surface on this site checks
      // before offering a destination. A suggestion that fails it is a link to a
      // page that is in no sitemap and may not answer at all.
      const dead: string[] = [];
      for (const route of ROUTES) {
        for (const tool of relatedToolsFor(route)) {
          if (!isLiveToolUrl(tool.href)) dead.push(`${route} -> ${tool.href}`);
        }
      }

      expect(
        dead,
        `suggestions pointing at a dead route: ${dead.join(', ')}`,
      ).toEqual([]);
    },
  );

  it('suggests none of the three pages held back for the tech review', () => {
    const withheld: string[] = [];
    for (const route of ROUTES) {
      for (const tool of relatedToolsFor(route)) {
        if (WITHHELD_ROUTES.has(tool.href)) {
          withheld.push(`${route} -> ${tool.href}`);
        }
      }
    }

    expect(
      withheld,
      `linked a page the owner asked to hold back: ${withheld.join(', ')}`,
    ).toEqual([]);
    for (const route of WITHHELD_ROUTES) {
      expect(ROUTES, `${route} must not be linkable`).not.toContain(route);
      expect(relatedToolsFor(route), route).toEqual([]);
    }
  });

  it('holds back exactly what tool-page-registration.test.ts holds back', () => {
    // Releasing one of the three means deleting its entry there and restoring
    // its route in live-tools.ts. Without this, the second lock in
    // related-tools.ts would quietly keep it out of every suggestion after it
    // had been published on purpose.
    const source = readFileSync(
      path.join(import.meta.dirname, 'tool-page-registration.test.ts'),
      'utf8',
    );
    const block = /const HELD_BACK[\s\S]*?\n\]\);/u.exec(source)?.[0];
    expect(
      block,
      'HELD_BACK is no longer where this test looks for it',
    ).toBeDefined();
    const heldBack = [...block!.matchAll(/'(\/[a-z0-9/-]+)'/gu)].map(
      (match) => match[1],
    );

    expect(heldBack.length).toBe(3);
    expect(new Set(heldBack)).toEqual(WITHHELD_ROUTES);
  });

  it('leaves no tool page without a way out of it', () => {
    const empty = ROUTES.filter((route) => relatedToolsFor(route).length === 0);
    expect(
      empty,
      `tool pages that suggest nothing, which is the dead end this module ` +
        `exists to remove: ${empty.join(', ')}`,
    ).toEqual([]);

    const thin = ROUTES.filter(
      (route) =>
        !SHORT_BY_NATURE.has(route) && relatedToolsFor(route).length < 3,
    );
    expect(
      thin,
      `fewer than three suggestions, and not one of the two tools that has ` +
        `no third honest neighbour: ${thin.join(', ')}`,
    ).toEqual([]);

    for (const route of SHORT_BY_NATURE) {
      expect(relatedToolsFor(route).length, route).toBeGreaterThan(0);
    }
  });

  it('never suggests the page you are already on, or the same tool twice', () => {
    const faults: string[] = [];
    for (const route of ROUTES) {
      const hrefs = relatedToolsFor(route).map((tool) => tool.href);
      if (hrefs.includes(route)) faults.push(`${route} links to itself`);
      if (new Set(hrefs).size !== hrefs.length) {
        faults.push(`${route} repeats a suggestion`);
      }
    }

    expect(faults).toEqual([]);
  });

  it('sends people to a tool, never to a workbench landing page', () => {
    // A workbench answers on one URL for every operation it hosts, so a link
    // to one is a link to a dropdown rather than to the tool someone was about
    // to need. Those pages are the only live routes this module skips.
    const hubs: string[] = [];
    for (const route of ROUTES) {
      for (const tool of relatedToolsFor(route)) {
        if (/\/(?:bench|workbench|advanced|writing)$/u.test(tool.href)) {
          hubs.push(`${route} -> ${tool.href}`);
        }
      }
    }

    expect(hubs).toEqual([]);
    // Apart from the landing pages, two live routes are invisible here, and on
    // purpose: `/image/background-remover` is a second address for the tool at
    // `/image/editor`, and `/pdf/compress-offline` is a second address for the
    // one at `/pdf/compress`. Neither has a manifest of its own to take a name
    // and a description from, and linking both addresses of one tool would
    // offer it twice under two names. Each is instead linked from its category
    // pillar through `CATEGORY_HUB_LINKS` in `internal-linking-graph.ts`, which
    // is the surface built for exactly this case -- and
    // `scripts/verify-no-orphans.mjs` reads the rendered HTML on every build, so
    // a route listed here is still required to have a real inbound link.
    // Anything else appearing in this list is a tool nothing can point at,
    // which is the failure this file is here to catch.
    expect(
      unlinkedLiveRoutes().filter(
        (route) => !/\/(?:bench|workbench|advanced|writing)$/u.test(route),
      ),
      'a live tool route this module cannot see is a page nothing will link to',
    ).toEqual([
      '/pdf/compress-offline',
      '/image/background-remover',
      // `/image/heic-to-png` is the third of these: the same component as
      // `/image/heic-to-jpg` with a different encoder, sharing its manifest.
      // The JPG page links to it in its own words, which is the inbound link
      // `scripts/verify-no-orphans.mjs` checks for on every build.
      '/image/heic-to-png',
    ]);
    expect(unlinkedLiveRoutes().length).toBeLessThan(
      LIVE_TOOL_ROUTES.length / 10,
    );
  });

  it('carries a name, a description and a reason on every suggestion', () => {
    for (const route of ROUTES) {
      for (const tool of relatedToolsFor(route)) {
        expect(tool.name.length, `${route} -> ${tool.href}`).toBeGreaterThan(2);
        expect(
          tool.description.length,
          `${route} -> ${tool.href}`,
        ).toBeGreaterThan(10);
        expect(tool.relationship, `${route} -> ${tool.href}`).toBeTruthy();
      }
    }
  });

  it('answers the same way twice, so the build is reproducible', () => {
    for (const route of ROUTES.slice(0, 50)) {
      expect(relatedToolsFor(route)).toEqual(relatedToolsFor(route));
    }
  });
});

describe('the suggestions reach the page', () => {
  /*
    Found by looking for a dynamic segment under a prefix the tool registry
    knows about -- not by looking for the literal name `[tool]`.

    This scan used to join `app/<dir>/[tool]/page.tsx`, so it saw fourteen
    routes and missed `app/convert/[pair]/page.tsx` entirely: 512 conversion
    pages, 28% of the site, published with no way out of the converter and no
    failing test, because the segment was called `[pair]`. The name of a
    directory is not what makes a page a tool page. Being under a prefix in
    `routedToolPrefixes()` is, and that is the registry the sitemap and
    `generateStaticParams` already read.

    `/blog`, `/guides` and `/templates` also have dynamic segments; none of
    them is a routed tool prefix, so none is scanned here.
  */
  const routePages = routedToolPrefixes().flatMap((prefix) => {
    const dir = path.join(projectRoot, 'app', prefix.replace(/^\//u, ''));
    let segments: string[];
    try {
      segments = readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && /^\[.+\]$/u.test(entry.name))
        .map((entry) => entry.name);
    } catch {
      return [];
    }
    return segments
      .map((segment) => path.join(dir, segment, 'page.tsx'))
      .filter((file) => {
        try {
          readFileSync(file);
          return true;
        } catch {
          return false;
        }
      });
  });

  it('finds every per-tool route file', () => {
    // Fifteen: the fourteen `[tool]` routes plus `convert/[pair]`. If a prefix
    // is registered and its route file stops being found, every assertion
    // below silently stops checking it.
    expect(routePages.length).toBeGreaterThanOrEqual(15);
    expect(
      routePages.map((file) => path.relative(projectRoot, file)),
    ).toContain('app/convert/[pair]/page.tsx');
  });

  it('computes them in every per-tool route file', () => {
    // The route file is a server component, so this is where the catalogue can
    // be read without putting it in the browser's bundle. A new routed
    // category that forgets this line ships 60 more dead ends.
    const missing = routePages
      .filter(
        (file) => !readFileSync(file, 'utf8').includes('relatedToolsFor('),
      )
      .map((file) => path.relative(projectRoot, file));

    expect(
      missing,
      `route files that render tool pages with no suggestions: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('hands them to every tool component those route files render', () => {
    // Walks from the route files to the components they import, so wiring a
    // fifteenth workbench and forgetting the prop fails here rather than being
    // noticed by somebody reading a report.
    const components = new Set<string>();
    for (const file of routePages) {
      for (const match of readFileSync(file, 'utf8').matchAll(
        // The component that renders the tool, by the naming convention
        // `lib/seo/tool-page-registration.test.ts` relies on as well. A route
        // file may import other things from `@/components` -- since 2026-09-23
        // these files also pull in `page-depth-provider`, which supplies the
        // page's written half and has no business rendering a link strip.
        /from '@\/components\/([\w-]*tool[\w-]*)'/gu,
      )) {
        components.add(match[1]!);
      }
    }
    expect(components.size).toBeGreaterThanOrEqual(15);

    const unwired = [...components].filter((component) => {
      const source = readFileSync(
        path.join(projectRoot, 'components', `${component}.tsx`),
        'utf8',
      );
      // Either it renders the strip itself, or it passes the prop to whatever
      // does. Both are how the fifteen components in this chain behave.
      return (
        !source.includes('<RelatedTools') &&
        !source.includes('relatedTools={relatedTools}')
      );
    });

    expect(
      unwired,
      `components rendered by a per-tool route that drop the suggestions: ${unwired.join(', ')}`,
    ).toEqual([]);
  });

  it('renders them as plain anchors a crawler can follow', () => {
    // `next/link` is banned repo-wide by local-source-policy.test.ts, and this
    // is the file where the temptation is greatest. Checked here as well so
    // the reason sits next to the links.
    const source = readFileSync(
      path.join(projectRoot, 'components/related-tools.tsx'),
      'utf8',
    );

    expect(source).toContain('<a');
    expect(source).toContain('href={tool.href}');
    expect(source).not.toContain("from 'next/link'");
    expect(source).not.toContain('onClick');
  });
});
