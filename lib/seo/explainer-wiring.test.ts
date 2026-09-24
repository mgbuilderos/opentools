import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Every routed tool page must be able to show an explainer.
 *
 * WHY THIS EXISTS. `ToolExplainerSection` began as a local helper inside
 * `components/schema-workbench-tool.tsx`. Most workbenches delegate to that
 * component, so they inherited it — but five did not: `file-workbench-tool`
 * (27 tools in the backlog alone), `math-workbench-tool`, `text-workbench-tool`,
 * `image-editor-tool` and `pdf-page-tools`.
 *
 * The failure was silent in the worst possible way. An explainer written for
 * one of those tools was stored in `GUIDE_DETAILS`, type-checked, counted by
 * `scripts/explainer-worklist.mjs` as done, and rendered nowhere. Nothing
 * failed; the page simply stayed thin. Measured on 2026-09-23, five of the
 * nineteen components a routed page can render had no path to the explainer.
 *
 * This test reads the real route files rather than a list, so a component
 * added later is covered the day it appears.
 */
const appRoot = path.resolve(import.meta.dirname, '../..');

/** Each `[tool]` route file, with the component files it renders. */
function routedPages(): Array<{ route: string; components: string[] }> {
  const routes = readdirSync(path.join(appRoot, 'app'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    /*
     * `app/embed/[tool]` is the one routed tool page deliberately outside this
     * sweep. An explainer is search-facing depth content, and an embed is the
     * opposite of search-facing: `noindex`, disallowed in robots.txt, and
     * rendered inside a stranger's page where several hundred extra words of
     * our prose would be an imposition rather than a service. The route exists
     * to run one tool and link home. ADR-019.
     *
     * Excluded by name, not by a pattern, so a second unexplained exemption
     * has to be argued for here rather than slipped in.
     */
    .filter((entry) => entry.name !== 'embed')
    .map((entry) => path.join('app', entry.name, '[tool]', 'page.tsx'))
    .filter((file) => existsSync(path.join(appRoot, file)));

  return routes.map((route) => {
    const source = readFileSync(path.join(appRoot, route), 'utf8');
    const components = new Set<string>();
    for (const match of source.matchAll(/<([A-Z][A-Za-z]*)\b/gu)) {
      // The route's own imports say which file each tag comes from. A tag with
      // no `@/components/` import line — a Metadata type, shell chrome — has no
      // file to check and is skipped.
      const from = new RegExp(
        String.raw`import\s*\{[^}]*\b${match[1]}\b[^}]*\}\s*from\s*'@/components/([\w-]+)'`,
        'u',
      ).exec(source);
      if (from) components.add(`components/${from[1]}.tsx`);
    }
    return { route, components: [...components] };
  });
}

/** True when the file shows an explainer, or delegates to one that does. */
function reachesExplainer(relative: string, seen = new Set<string>()): boolean {
  if (seen.has(relative)) return false;
  seen.add(relative);
  const file = path.join(appRoot, relative);
  if (!existsSync(file)) return false;
  const source = readFileSync(file, 'utf8');
  if (source.includes('<ToolExplainerSection')) return true;
  return [...source.matchAll(/from '@\/components\/([\w-]+)'/gu)].some((m) =>
    reachesExplainer(`components/${m[1]}.tsx`, seen),
  );
}

describe('every routed tool page can render its explainer', () => {
  const pages = routedPages();

  it('finds the routed pages at all', () => {
    // Guards against the scan silently matching nothing after a refactor,
    // which would turn every assertion below into a vacuous pass.
    expect(pages.length).toBeGreaterThan(10);
    expect(pages.every((page) => page.components.length > 0)).toBe(true);
  });

  // Per route rather than per component: a route legitimately renders
  // providers and chrome alongside its tool, and only the tool needs to carry
  // the explainer.
  it.each(pages.map((page) => [page.route, page.components] as const))(
    '%s renders something that reaches ToolExplainerSection',
    (route, components) => {
      const reached = components.filter((file) => reachesExplainer(file));
      expect(
        reached.length,
        `${route} renders ${components.join(', ')} and none of them renders ` +
          'ToolExplainerSection, so any explainer written for its tools is ' +
          'stored and never shown',
      ).toBeGreaterThan(0);
    },
  );
});
