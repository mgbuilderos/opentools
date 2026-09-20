import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { publicTools } from '../tools/catalog';
import { LIVE_TOOL_ROUTES, isLiveToolUrl } from './live-tools';

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

const toolPages = findPageFiles(path.join(projectRoot, 'app'))
  .map((file) => ({
    file,
    route: routeFor(file),
    component: TOOL_COMPONENT_IMPORT.exec(readFileSync(file, 'utf8'))?.[1],
  }))
  .filter(
    (page): page is { file: string; route: string; component: string } =>
      page.component !== undefined,
  );

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
    const missing = toolPages
      .filter((page) => !LIVE_TOOL_ROUTES.includes(page.route))
      .map((page) => page.route);

    expect(
      missing,
      `built and shipped, but in no sitemap and behind no link: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('answers isLiveToolUrl for each of them', () => {
    // Belt and braces: a route can be in the list and still be refused by the
    // gate, because the gate also checks the `?tool=` operation for workbenches.
    const refused = toolPages
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
      .filter((page) => !workbench.test(page.route))
      .filter((page) => !registeredComponents.has(page.component))
      .map((page) => page.route);

    expect(
      unlisted,
      `no entry in publicTools, so listed in no workspace: ${unlisted.join(', ')}`,
    ).toEqual([]);
  });
});
