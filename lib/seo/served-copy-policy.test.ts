import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findForbiddenCompetitors,
  findUnsourcedPriceClaims,
} from '@/lib/policy/competitor-names';

/**
 * The competitor rule, checked against what is actually served.
 *
 * `lib/tools/local-source-policy.test.ts` scans source under `app/` and
 * `components/`. That is where a person writes copy, so it catches the common
 * case — but most of this site's pages are not written there. Guides, tool page
 * bodies and metadata are generated from `lib/seo/` and `lib/tools/`, and a
 * brand name introduced in a generator reaches a thousand pages without
 * crossing either of that test's roots.
 *
 * Widening those roots to all of `lib/` is not the fix. `lib/tools/metadata/
 * jpeg.ts` legitimately names the "Adobe colour transform (APP14)" and the
 * "Adobe XMP metadata packet" — those are the JPEG specification's own names
 * for marker segments, they are what the tool must call them, and a test that
 * forbade them would be deleted within a week.
 *
 * So the check moves to the output. `dist/client` after a build is the copy a
 * visitor actually reads, whatever produced it, and it cannot tell the
 * difference between a hand-written page and a generated one. That is the
 * property worth asserting.
 *
 * Requires a build, exactly like `indexability-sweep.test.ts` beside it.
 */
const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const CLIENT_DIR = path.join(projectRoot, 'dist', 'client');

function htmlFiles(directory: string, found: string[] = []): string[] {
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory)) {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) htmlFiles(absolute, found);
    else if (entry.endsWith('.html')) found.push(absolute);
  }
  return found;
}

describe('served copy names no competitor', () => {
  it('has a build to check', () => {
    expect(
      existsSync(CLIENT_DIR),
      'run `npm run build` before this suite',
    ).toBe(true);
  });

  it('names no competitor on any served page', () => {
    const pages = htmlFiles(CLIENT_DIR);

    // Guards the guard: an empty or near-empty dist would pass every assertion
    // below while checking nothing at all.
    expect(pages.length).toBeGreaterThan(1000);

    const violations = pages.flatMap((file) =>
      findForbiddenCompetitors(
        readFileSync(file, 'utf8'),
        path.relative(CLIENT_DIR, file),
      ),
    );

    expect(
      violations.slice(0, 20),
      `${violations.length} served pages name a competitor`,
    ).toEqual([]);
  });

  it('attributes no price to anybody but us on any served page', () => {
    const pages = htmlFiles(CLIENT_DIR);
    expect(pages.length).toBeGreaterThan(1000);

    const violations = pages.flatMap((file) =>
      findUnsourcedPriceClaims(
        readFileSync(file, 'utf8'),
        path.relative(CLIENT_DIR, file),
      ),
    );

    expect(
      violations.slice(0, 20),
      `${violations.length} served pages attribute a price we never measured`,
    ).toEqual([]);
  });
});
