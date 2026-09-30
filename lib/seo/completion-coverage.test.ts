import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { LIVE_TOOL_ROUTES } from './live-tool-routes';

/**
 * How much of the live catalogue can produce a completion signal at all.
 *
 * `lib/completion.ts` is the single boundary every finished job goes through,
 * and `recordCompletionSignal` hangs off it — so "did this visit succeed" is
 * measurable for exactly the routes whose page can reach that boundary, and
 * unmeasurable for any that cannot. A tool that renders its result without
 * announcing it is invisible to the number, and the number would under-report
 * by however many of those exist, silently, forever.
 *
 * So the population is measured rather than asserted. **Every route in
 * `LIVE_TOOL_ROUTES`**, not a sample, each resolved to the page that actually
 * serves it — including the dynamic `[tool]` and `[pair]` segments, where a
 * first pass at this audit wrongly reported 631 routes as uncovered because it
 * only followed `[tool]`.
 *
 * THE COUNT MOVES, SO DO NOT PIN IT. It was 1,362 when this was written and
 * 862 a day later: the unit-pair fold (PR #82) turned 501 `/convert` pages
 * into redirects in one commit. A test that asserted the exact figure, or a
 * floor just beneath it, would have failed on a change that is none of its
 * business. The floor below exists for one reason only — an empty or truncated
 * route list would make every assertion here vacuously true — so it is set far
 * enough down to survive ordinary catalogue churn and still catch that.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT. It proves the boundary is *reachable*
 * from every live route's component graph. It does not prove each component
 * calls it on every successful path — an import graph cannot say that. The
 * shared workbenches each have exactly one `announceCompletion` at their one
 * success boundary, which is the design this relies on; `e2e/product-telemetry.spec.ts`
 * then drives real tools in Chromium and WebKit and counts the requests that
 * actually leave the page. The two together are the evidence. Neither alone is.
 */
const projectRoot = path.resolve(import.meta.dirname, '../..');

/** Four hops covers page → tool component → shared workbench → completion. */
const MAX_HOPS = 4;

function resolveImport(specifier: string, fromFile: string): string | null {
  let base: string | null = null;
  if (specifier.startsWith('@/'))
    base = path.join(projectRoot, specifier.slice(2));
  else if (specifier.startsWith('.'))
    base = path.resolve(path.dirname(fromFile), specifier);
  if (!base) return null;
  for (const suffix of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    if (existsSync(base + suffix)) return base + suffix;
  }
  return existsSync(base) && statSync(base).isFile() ? base : null;
}

const reachable = new Map<string, boolean>();

function reachesCompletion(
  file: string,
  depth = 0,
  seen = new Set<string>(),
): boolean {
  if (depth > MAX_HOPS || seen.has(file)) return false;
  seen.add(file);
  const cached = reachable.get(file);
  if (cached !== undefined) return cached;

  let source: string;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    return false;
  }
  if (source.includes('announceCompletion')) {
    reachable.set(file, true);
    return true;
  }
  for (const match of source.matchAll(/from\s+'([^']+)'/gu)) {
    const target = resolveImport(match[1], file);
    if (!target) continue;
    // Only this project's own UI and logic. Following node_modules would make
    // the walk unbounded and could never find the boundary anyway.
    if (!target.includes('/components/') && !target.includes('/lib/')) continue;
    if (reachesCompletion(target, depth + 1, seen)) {
      reachable.set(file, true);
      return true;
    }
  }
  reachable.set(file, false);
  return false;
}

/** The file that serves a route, following any dynamic segment above it. */
function pageFor(route: string): string | null {
  const segments = route.replace(/^\//u, '').split('/').filter(Boolean);
  const literal = path.join(projectRoot, 'app', ...segments, 'page.tsx');
  if (existsSync(literal)) return literal;

  for (let depth = segments.length - 1; depth >= 0; depth -= 1) {
    const directory = path.join(
      projectRoot,
      'app',
      ...segments.slice(0, depth),
    );
    if (!existsSync(directory)) continue;
    for (const entry of readdirSync(directory)) {
      if (!entry.startsWith('[')) continue;
      const dynamic = path.join(directory, entry, 'page.tsx');
      if (existsSync(dynamic)) return dynamic;
    }
  }
  return null;
}

describe('every live tool can report that it finished', () => {
  const population = [...new Set(LIVE_TOOL_ROUTES)];

  it('has a population big enough that a pass means something', () => {
    // A guard against the guard: an empty or truncated route list would make
    // every assertion below vacuously true. This is the shape of failure that
    // let a hollow `catalog.test.ts` pass on 2026-09-20.
    //
    // 500, not 1,000, and not the live figure. See the note above: the
    // catalogue legitimately lost 501 routes in a single commit, and a floor
    // set just under yesterday's count is a tripwire for other people's work
    // rather than a guard on this one.
    expect(population.length).toBeGreaterThan(500);
  });

  it('resolves every live route to a page that actually exists', () => {
    const unresolved = population.filter((route) => pageFor(route) === null);
    expect(unresolved, unresolved.slice(0, 20).join('\n')).toEqual([]);
  });

  it('reaches announceCompletion from every one of them', () => {
    const uncovered = population.filter(
      (route) => !reachesCompletion(pageFor(route)!),
    );
    expect(
      uncovered,
      `${uncovered.length} of ${population.length} live routes cannot ` +
        'produce a completion signal, so the success count under-reports by ' +
        `that much:\n${uncovered.slice(0, 30).join('\n')}`,
    ).toEqual([]);
  });

  it('keeps each shared workbench announcing at one boundary, not none', () => {
    // The shared components are what make the 100% above meaningful: one
    // `announceCompletion` at the single success path covers every operation
    // behind that workbench. Dropping it would take hundreds of tools out of
    // the measurement at once, and the import-graph check above would still
    // pass on the page that imports it.
    for (const component of [
      'components/schema-workbench-tool.tsx',
      'components/math-workbench-tool.tsx',
      'components/text-workbench-tool.tsx',
      'components/file-workbench-tool.tsx',
      'components/tool-workspace.tsx',
      'components/format-converter-tool.tsx',
    ]) {
      const source = readFileSync(path.join(projectRoot, component), 'utf8');
      expect(
        (source.match(/announceCompletion\(/gu) ?? []).length,
        component,
      ).toBeGreaterThan(0);
    }
  });
});
