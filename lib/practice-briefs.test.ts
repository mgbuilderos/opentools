import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { PRACTICE_BRIEFS, practiceBrief } from './practice-briefs';
import { LIVE_TOOL_ROUTES, isLiveToolUrl } from './seo/live-tools';

/**
 * `tool-page-registration.test.ts` walks `app/` and fails when a page that
 * exists is in no sitemap and behind no link. This is the same check arriving
 * from the other direction: a brief is a page written for one profession, and
 * a brief aimed at a route that does not exist, or that exists but is not
 * registered, is prose nobody will ever read.
 *
 * It also holds the two promises the briefs themselves make — that each page
 * says something different from the others, and that no portal figure is
 * frozen into a page a search engine will cache (constraint C3).
 */
const projectRoot = path.resolve(import.meta.dirname, '..');

function pageFileFor(route: string) {
  return path.join(
    projectRoot,
    'app',
    ...route.slice(1).split('/'),
    'page.tsx',
  );
}

function prose(brief: (typeof PRACTICE_BRIEFS)[number]) {
  return [
    brief.eyebrow,
    brief.heading,
    brief.lede,
    ...brief.steps,
    ...brief.limits,
  ].join('\n');
}

/**
 * A stated file-size ceiling. Numbers like this move without announcement and
 * a cached title or meta description outlives the change by months, so they
 * belong in `lib/portal-presets.ts` next to the page they were read from and
 * the date they were read — never in a brief and never in a page's metadata.
 */
const SIZE_FIGURE = /\b\d+(?:\.\d+)?\s*(?:KB|MB|GB|KiB|MiB)\b/iu;

describe('practice briefs', () => {
  it('writes a brief for at least five jobs, each with a unique id', () => {
    expect(PRACTICE_BRIEFS.length).toBeGreaterThanOrEqual(5);
    const ids = PRACTICE_BRIEFS.map((brief) => brief.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('aims every brief at a route that is registered and live', () => {
    // Registration is publication: it is what puts the route in the sitemap
    // and lets a CTA offer it. An unregistered route is reachable only by
    // typing it.
    const unregistered = PRACTICE_BRIEFS.filter(
      (brief) =>
        !LIVE_TOOL_ROUTES.includes(brief.route) || !isLiveToolUrl(brief.route),
    ).map((brief) => brief.route);

    expect(
      unregistered,
      `written for, but in no sitemap and behind no link: ${unregistered.join(', ')}`,
    ).toEqual([]);
  });

  it('has a page at each of those routes, wired to that brief by id', () => {
    const broken = PRACTICE_BRIEFS.filter((brief) => {
      const file = pageFileFor(brief.route);
      if (!existsSync(file)) return true;
      return !readFileSync(file, 'utf8').includes(
        `practiceBrief('${brief.id}')`,
      );
    }).map((brief) => `${brief.route} (${brief.id})`);

    expect(
      broken,
      `no page renders these briefs, so the audience wording ships nowhere: ${broken.join(', ')}`,
    ).toEqual([]);
  });

  it('gives every page a distinct heading', () => {
    // Two pages under one title split whatever ranking either would earn and
    // leave a search engine to pick a canonical on our behalf.
    const headings = PRACTICE_BRIEFS.map((brief) => brief.heading);
    expect(new Set(headings).size).toBe(headings.length);
    for (const heading of headings)
      expect(heading.trim().length).toBeGreaterThan(10);
  });

  it('says what happens and what will not, in useful numbers', () => {
    for (const brief of PRACTICE_BRIEFS) {
      expect(brief.steps.length, `${brief.id} steps`).toBeGreaterThanOrEqual(3);
      expect(brief.limits.length, `${brief.id} limits`).toBeGreaterThanOrEqual(
        3,
      );
      expect(brief.lede.trim().length).toBeGreaterThan(80);
    }
  });

  it('states no portal figure in a brief or in the page that caches it', () => {
    const offenders: string[] = [];
    for (const brief of PRACTICE_BRIEFS) {
      if (SIZE_FIGURE.test(prose(brief))) offenders.push(`brief ${brief.id}`);
      const file = pageFileFor(brief.route);
      if (existsSync(file) && SIZE_FIGURE.test(readFileSync(file, 'utf8'))) {
        offenders.push(`page ${brief.route}`);
      }
    }

    expect(
      offenders,
      `a limit stated here is cached long after the portal moves it; put it in ` +
        `lib/portal-presets.ts with its source and check date: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('holds citations to no URL of its own', () => {
    // Same rule the guarded roots are held to. A brief is prose; every link it
    // implies belongs to a preset that carries its own source and date.
    const source = readFileSync(
      path.join(projectRoot, 'lib/practice-briefs.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/https?:\/\//u);
    expect(source).not.toMatch(/\bfetch\s*\(/u);
  });

  it('writes dates the way an Indian practice reads them', () => {
    for (const brief of PRACTICE_BRIEFS) {
      const text = prose(brief);
      expect(text, `${brief.id} uses month-first dates`).not.toMatch(
        /\bMM\/DD\b/u,
      );
      // A bare US-style date would be as wrong as the token: 04/01/2026 means
      // the first of April here, and nothing should imply otherwise.
      expect(text, `${brief.id} names a month-first format`).not.toMatch(
        /\bMM-DD-YYYY\b/u,
      );
    }
  });

  it('throws on an id that does not exist, rather than rendering nothing', () => {
    expect(() => practiceBrief('not-a-brief')).toThrow(/No practice brief/u);
  });
});
