import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { publicTools } from '../tools/catalog';
import { LOCALE_CODES } from '../i18n/locales';
import { localizedSitemapRoutes } from '../i18n/routes';
import {
  LIVE_TOOL_ROUTES,
  isLiveToolUrl,
  routedToolIdsForPrefix,
} from './live-tools';

/**
 * Building a tool and registering it are separate steps, and the second one is
 * easy to forget because nothing breaks when you do. The page builds, the tests
 * pass, the route answers 200 if you type it — and no link anywhere points at
 * it, it is absent from the sitemap, and `isLiveToolUrl` returns false, which is
 * the gate every CTA and the smart dropzone check before offering a
 * destination.
 *
 * That happened six times in one day on 2026-09-20: `/documents/metadata`,
 * `/pdf/bates`, `/web/file-to-html`, `/image/svg`, `/image/colour` and
 * `/data/lists` were all built, tested, committed and shipped invisible. Each
 * was noticed by a person reading a report, which is not a mechanism.
 *
 * This is the mechanism. It walks `app/` rather than any list, so a new tool
 * page is found the moment it exists.
 */
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

/**
 * Pages that render a tool are recognised by importing a component from
 * `@/components` whose name contains "tool". That is the convention every tool
 * page in the repo already follows, and it is checked below so the convention
 * cannot quietly stop being true.
 */
const TOOL_COMPONENT_IMPORT = /from '@\/components\/([\w-]*tool[\w-]*)'/;

function findPageFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      findPageFiles(full, found);
    } else if (entry === 'page.tsx') {
      found.push(full);
    }
  }
  return found;
}

function routeFor(pageFile: string): string {
  const rel = path.relative(
    path.join(projectRoot, 'app'),
    path.dirname(pageFile),
  );
  return rel === '' ? '/' : `/${rel.split(path.sep).join('/')}`;
}

/**
 * A dynamic segment is not one route, it is every route it generates.
 *
 * `app/math/[tool]/page.tsx` renders all 67 math calculators, one static page
 * each at `/math/<id>`. Checking the literal `/math/[tool]` would test a path
 * that never exists, and — worse — would pass or fail as a single unit while
 * saying nothing about the 67 addresses that actually ship. So the segment is
 * expanded to the ids its own source names, and each one is then held to
 * exactly the same standard as a hand-written page.
 *
 * The segment's own name is not the point — `app/convert/[pair]/page.tsx`
 * expands the same way, to one route per from→to unit pair. What matters is
 * that the prefix is registered in `ROUTED_TOOL_PREFIXES`, which is the single
 * source the route file, the registry and this check all read. A bracketed
 * path whose prefix is not registered still throws: that is the case where
 * nobody can say what ships behind it.
 *
 * Read from the source rather than imported, because importing a route module
 * pulls in the whole client component tree for a check about file layout.
 */
function expandDynamic(page: {
  file: string;
  route: string;
  component: string;
}): { file: string; route: string; component: string }[] {
  if (!page.route.includes('[')) return [page];

  /*
    `app/[locale]/pdf/merge/page.tsx` is the eight localised editions of one
    English tool page, so it expands to `/es/pdf/merge` and its seven
    siblings. The bracket is the FIRST segment here rather than the last,
    which is why it cannot go through the `ROUTED_TOOL_PREFIXES` path below:
    that one expands a trailing `[tool]` into operation ids. Each expanded
    route is then held to the registration rule like any other page -- see the
    localised branch in the "live tool route" check.
  */
  if (page.route.startsWith('/[locale]/')) {
    return LOCALE_CODES.map((code) => ({
      ...page,
      route: page.route.replace('/[locale]/', `/${code}/`),
    }));
  }

  const prefix = page.route.slice(0, page.route.lastIndexOf('/'));
  const segment = page.route.slice(page.route.lastIndexOf('/') + 1);
  const operations = routedToolIdsForPrefix(prefix);
  if (/^\[[a-z]+\]$/u.test(segment) && operations) {
    // The same source the route file and the registry both read, so the three
    // cannot disagree about which pages exist.
    return operations.map((operation) => ({
      ...page,
      route: `${prefix}/${operation.id}`,
    }));
  }

  throw new Error(
    `${page.route} is a dynamic tool route this check does not know how to ` +
      `expand. Add its prefix to ROUTED_TOOL_PREFIXES in lib/seo/live-tools.ts ` +
      `— do not let a bracketed path through unchecked, or every route behind ` +
      `it ships unverified.`,
  );
}

const toolPages = findPageFiles(path.join(projectRoot, 'app'))
  .map((file) => ({
    file,
    route: routeFor(file),
    component: TOOL_COMPONENT_IMPORT.exec(readFileSync(file, 'utf8'))?.[1],
  }))
  .filter(
    (page): page is { file: string; route: string; component: string } =>
      page.component !== undefined,
  )
  .flatMap(expandDynamic);

/**
 * Tool pages deliberately not registered, and why.
 *
 * Registering a tool is what puts it in the sitemap, gives it a guide page and
 * lets every CTA offer it -- so registration is publication, and the owner
 * asked on 2026-09-20 that no new tool is published before a tech review.
 * Without somewhere to say that, the checks below fail on a decision somebody
 * made on purpose, and the obvious way to get a green run is to publish the
 * tool. That is the wrong repair, so the decision is written down instead.
 *
 * An entry here is a hold someone can be asked about. A page in neither this
 * list nor `LIVE_TOOL_ROUTES` is an accident, and the checks still fail on it.
 * Releasing a tool means deleting its entry here and restoring its route in
 * `lib/seo/live-tools.ts`, in one commit.
 */
const HELD_BACK: ReadonlyMap<string, string> = new Map([
  [
    '/image/svg',
    "Antigravity phase 4, 2026-09-20 — awaiting the owner's tech review.",
  ],
  [
    '/image/colour',
    "Antigravity phase 4, 2026-09-20 — awaiting the owner's tech review.",
  ],
  [
    '/data/lists',
    "Antigravity phase 5, 2026-09-20 — awaiting the owner's tech review.",
  ],
]);

describe('every tool page in app/ is reachable by something other than the URL bar', () => {
  it('finds the tool pages at all, so a passing run means something', () => {
    // If the convention above ever stops holding, this test would silently
    // check nothing. These are the anchors: routes known to be tool pages.
    const routes = toolPages.map((page) => page.route);

    expect(routes.length).toBeGreaterThan(40);
    for (const anchor of [
      '/pdf/merge',
      '/image/svg',
      '/data/lists',
      '/web/file-to-html',
      '/documents/metadata',
    ]) {
      expect(routes, `${anchor} is a tool page and was not found`).toContain(
        anchor,
      );
    }
  });

  it('lists each of them as a live tool route', () => {
    // `LIVE_TOOL_ROUTES` is what `app/sitemap.ts` submits and what
    // `isLiveToolUrl` answers from, so this is the single fact that decides
    // whether a finished tool is findable.
    /*
      A localised edition is registered by `lib/i18n/routes.ts` instead, and
      the next assertion holds it to that. It is deliberately NOT in
      `LIVE_TOOL_ROUTES`: that list is what every CTA and the smart dropzone
      offer as a place to send a file, and listing the same tool nine times
      would put nine copies of "Merge PDF" in one menu. Being absent from it
      is therefore a decision, not the accident this check hunts for -- but
      absent from BOTH registries is still an accident, which is why the
      localised routes are checked rather than skipped.
    */
    const localized = new Set(localizedSitemapRoutes());
    const missing = toolPages
      .filter(
        (page) =>
          !LIVE_TOOL_ROUTES.includes(page.route) &&
          !HELD_BACK.has(page.route) &&
          !localized.has(page.route),
      )
      .map((page) => page.route);

    expect(
      missing,
      `built and shipped, but in no sitemap and behind no link: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('puts every localised edition in the sitemap', () => {
    // The equivalent of the check above, for the pages it just exempted: a
    // localised page absent from `localizedSitemapRoutes()` is in no sitemap
    // and behind no link, which is exactly the failure this file exists for.
    const localized = new Set(localizedSitemapRoutes());
    const unregistered = toolPages
      .filter((page) =>
        LOCALE_CODES.some((code) => page.route.startsWith(`/${code}/`)),
      )
      .map((page) => page.route)
      .filter((route) => !localized.has(route));

    expect(
      unregistered,
      `localised tool pages in no sitemap: ${unregistered.join(', ')}`,
    ).toEqual([]);
  });

  it('holds back nothing that has since been registered or deleted', () => {
    const pages = new Set(toolPages.map((page) => page.route));
    const stale = [...HELD_BACK.keys()].filter(
      (route) => LIVE_TOOL_ROUTES.includes(route) || !pages.has(route),
    );

    expect(
      stale,
      `listed as held back but no longer held back — remove them from HELD_BACK ` +
        `so the list stays a true record: ${stale.join(', ')}`,
    ).toEqual([]);
  });

  it('answers isLiveToolUrl for each of them', () => {
    // Belt and braces: a route can be in the list and still be refused by the
    // gate, because the gate also checks the `?tool=` operation for workbenches.
    // Localised editions are exempt for the reason given above: they are not
    // in `LIVE_TOOL_ROUTES`, so the gate refusing them is the intended
    // behaviour -- a CTA must offer one address per tool, in one language.
    const localized = new Set(localizedSitemapRoutes());
    const refused = toolPages
      .filter((page) => !HELD_BACK.has(page.route))
      .filter((page) => !localized.has(page.route))
      .filter((page) => !isLiveToolUrl(page.route))
      .map((page) => page.route);

    expect(
      refused,
      `isLiveToolUrl says these are not live, so every CTA to them stays hidden: ${refused.join(', ')}`,
    ).toEqual([]);
  });

  it('gives every tool a manifest, so it appears in a workspace', () => {
    // `catalog.test.ts` checks the other direction — that every manifest has a
    // page. Without this direction a page can exist with no manifest, which is
    // how a tool ends up absent from the home page's own navigation.
    //
    // Matched by component rather than by route, because one tool legitimately
    // answers on two URLs: `/image/editor` and `/image/background-remover` are
    // both `image-editor-tool`, and the second is a landing page for the same
    // tool rather than a tool of its own. A workbench is registered through its
    // operation list instead, so it is not expected here.
    const routeToComponent = new Map(
      toolPages.map((page) => [page.route, page.component]),
    );
    const registeredComponents = new Set(
      publicTools
        .map((tool) => routeToComponent.get(tool.href.split('?')[0]!))
        .filter((component): component is string => component !== undefined),
    );
    const workbench = /\/workbench$|\/advanced$|\/writing$/;

    const unlisted = toolPages
      .filter((page) => !HELD_BACK.has(page.route))
      .filter((page) => !workbench.test(page.route))
      .filter((page) => !registeredComponents.has(page.component))
      .map((page) => page.route);

    expect(
      unlisted,
      `no entry in publicTools, so listed in no workspace: ${unlisted.join(', ')}`,
    ).toEqual([]);
  });
});
