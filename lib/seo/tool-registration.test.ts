import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LIVE_TOOL_ROUTES } from './live-tools';

/**
 * Building a tool and registering it are separate steps, and the build stays
 * green when the second one is skipped.
 *
 * On 2026-09-20 `/documents/metadata`, `/pdf/bates` and `/web/file-to-html`
 * were live for hours while `isLiveToolUrl` returned false for all three -- so
 * they were in no sitemap, had no guide page, and no CTA or dropzone would
 * offer them. 2,850 lines of working tool reachable only by typing the URL,
 * and nothing failed. It is the same shape of defect as the `.slice(0, 50)`
 * that left 523 guides unbuilt the same morning: a step skipped in silence.
 *
 * This is the check that fails instead.
 */
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

/** Routes that are the site itself, not a tool. Every other page is a tool. */
const SITE_PAGES = new Set(['/', '/blog', '/guides', '/support', '/templates']);

/**
 * Pages deliberately not registered, with the reason. An entry here is a
 * decision somebody made and can be asked about; an unregistered page in
 * neither list is an accident, and the first test fails on it.
 *
 * Emptying this list is the registration step: delete the entry and add the
 * route to `DEDICATED_TOOL_ROUTES` in `lib/seo/live-tools.ts`, and the tool
 * becomes findable in the same commit.
 */
const HELD_BACK: ReadonlyMap<string, string> = new Map([
  [
    '/data/lists',
    'Antigravity phase 5, 2026-09-20. The owner is holding every new tool for ' +
      'a tech review before it is published.',
  ],
  ['/image/colour', 'Antigravity phase 4, 2026-09-20. Same review hold.'],
  ['/image/svg', 'Antigravity phase 4, 2026-09-20. Same review hold.'],
]);

function appRoutes(): string[] {
  const routes: string[] = [];
  const walk = (dir: string, route: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, `${route}/${entry}`);
        continue;
      }
      if (entry === 'page.tsx') routes.push(route === '' ? '/' : route);
    }
  };
  walk(path.join(projectRoot, 'app'), '');
  // Parameterised routes render from the catalogue rather than being a tool.
  return routes.filter((route) => !route.includes('[')).sort();
}

describe('every tool page is registered as a live tool', () => {
  it('leaves no page built but unreachable', () => {
    const unregistered = appRoutes().filter(
      (route) =>
        !SITE_PAGES.has(route) &&
        !HELD_BACK.has(route) &&
        !LIVE_TOOL_ROUTES.includes(route),
    );

    expect(
      unregistered,
      'built but invisible -- no sitemap entry, no guide, and no CTA or ' +
        'dropzone will offer them. Add each to DEDICATED_TOOL_ROUTES or ' +
        'OPERATION_IDS_BY_ROUTE in lib/seo/live-tools.ts, to SITE_PAGES here ' +
        `if it is not a tool, or to HELD_BACK with a reason: ${unregistered.join(', ')}`,
    ).toEqual([]);
  });

  it('holds back nothing that has since been registered or deleted', () => {
    const stale = [...HELD_BACK.keys()].filter(
      (route) =>
        LIVE_TOOL_ROUTES.includes(route) ||
        !existsSync(path.join(projectRoot, 'app', route, 'page.tsx')),
    );

    expect(
      stale,
      'listed as held back but no longer held back -- remove them from ' +
        `HELD_BACK so the list stays a true record: ${stale.join(', ')}`,
    ).toEqual([]);
  });

  it('claims no live tool that has no page', () => {
    const missing = LIVE_TOOL_ROUTES.filter(
      (route) => !existsSync(path.join(projectRoot, 'app', route, 'page.tsx')),
    );

    expect(
      missing,
      `registered as live but there is no page to open: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
