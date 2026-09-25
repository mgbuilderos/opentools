import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
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

/*
  One streaming pass, because the cost here is memory rather than CPU.

  Measured against a real 1,478-page build: reading the set costs 609ms, the
  competitor scan 2,398ms and the price scan 446ms — about 3.5s of actual work.
  Yet CI failed this suite at a 60s timeout. The difference was the heap. An
  earlier version of this file held every page's HTML so both sweeps could
  share it: 134MB of markup, 280MB heap, in one of several vitest workers on a
  shared runner. That GC pressure, not the scanning, is what took a 446ms sweep
  past a minute.

  So read one page at a time, run both scanners on it, keep only the findings
  and let the markup go. Peak memory is one page; the set is still read once.
*/
type Finding = ReturnType<typeof findForbiddenCompetitors>[number];

const competitorFindings: Finding[] = [];
const priceFindings: Finding[] = [];
let pagesSwept = 0;

beforeAll(() => {
  for (const file of htmlFiles(CLIENT_DIR)) {
    const html = readFileSync(file, 'utf8');
    const rel = path.relative(CLIENT_DIR, file);
    competitorFindings.push(...findForbiddenCompetitors(html, rel));
    priceFindings.push(...findUnsourcedPriceClaims(html, rel));
    pagesSwept += 1;
  }
}, 120_000);

describe('served copy names no competitor', () => {
  it('has a build to check', () => {
    expect(
      existsSync(CLIENT_DIR),
      'run `npm run build` before this suite',
    ).toBe(true);
  });

  it('names no competitor on any served page', () => {
    // Guards the guard: an empty or near-empty dist would pass every assertion
    // below while checking nothing at all.
    expect(pagesSwept).toBeGreaterThan(1000);

    expect(
      competitorFindings.slice(0, 20),
      `${competitorFindings.length} served pages name a competitor`,
    ).toEqual([]);
  });

  it('attributes no price to anybody but us on any served page', () => {
    expect(pagesSwept).toBeGreaterThan(1000);

    expect(
      priceFindings.slice(0, 20),
      `${priceFindings.length} served pages attribute a price we never measured`,
    ).toEqual([]);
  });
});
