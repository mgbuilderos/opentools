import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildSitemap } from './sitemap-entries';
import { SITEMAP_LASTMOD } from './sitemap-lastmod.generated';

/**
 * Every sitemap entry carries a `lastmod`, and every one of them is true.
 *
 * Google uses `lastmod` to decide what to recrawl first. On 2026-09-23, 31 of
 * this site's 1,392 entries had one and 1,361 did not, so the crawler had
 * nothing to prioritise on -- and 552 URLs sat in Search Console as "not
 * indexed". Dates now come from `scripts/build-sitemap-lastmod.mjs`.
 *
 * The assertions below are all about the one way this feature fails badly.
 * A lastmod that moves when the page did not is not a smaller version of the
 * benefit: Google's documentation says it ignores the field on sites where it
 * finds it unreliable, so a single deploy that stamps 1,392 URLs as changed
 * can cost the signal permanently. `Date.now()` does that on purpose; a shared
 * import can do it by accident, which is the failure this file is really
 * guarding, and which the first run of the generator actually produced.
 */
describe('sitemap lastmod', () => {
  const entries = buildSitemap();

  it('builds the sitemap at all, so an empty sweep cannot pass', () => {
    expect(entries.length).toBeGreaterThan(1000);
  });

  it('carries a lastmod on every entry', () => {
    const missing = entries
      .filter((entry) => !entry.lastModified)
      .map((entry) => entry.url);
    expect(missing).toEqual([]);
  });

  it('dates nothing in the future', () => {
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    const ahead = entries
      .filter(
        (entry) => new Date(entry.lastModified as string).getTime() > tomorrow,
      )
      .map((entry) => entry.url);
    expect(ahead).toEqual([]);
  });

  it('parses every date it emits', () => {
    const unparseable = entries
      .filter((entry) =>
        Number.isNaN(new Date(entry.lastModified as string).getTime()),
      )
      .map((entry) => entry.url);
    expect(unparseable).toEqual([]);
  });

  /**
   * The generated map is committed, so it goes stale the moment a route is
   * added without rerunning the generator. Silence would mean the new page
   * ships with no lastmod at all, which is the state this work set out to fix.
   */
  it('covers every route currently in the sitemap', () => {
    const origin = ['https:', '//', 'getopentools.com'].join('');
    const blogPrefix = `${origin}/blog/`;
    const uncovered = entries
      .map((entry) => entry.url)
      // Blog posts are dated from their own `publishedAt`, not the generator.
      .filter((url) => !url.startsWith(blogPrefix))
      .map((url) => url.replace(origin, '').replace(/\/$/, '') || '/')
      .filter((route) => !SITEMAP_LASTMOD[route]);
    expect(uncovered).toEqual([]);
  });

  /**
   * The whole point is to prioritise, and a field with one value prioritises
   * nothing. A single date across the site is the signature of `Date.now()` or
   * of a shared module standing in for page content -- excluded by the CHROME
   * list in the generator, and asserted here so removing that list is loud.
   */
  it('does not give the whole site one date, unless one really changed it', () => {
    const distinct = new Set(
      Object.values(SITEMAP_LASTMOD).map((value) => value.slice(0, 10)),
    );
    if (distinct.size > 1) return;

    /*
     * One date across the site is usually the bug this guard was written for.
     * It is not always. On 2026-09-23 a metadata pass rewrote the title and
     * description of every page, touching all 1,413 page files in one release,
     * so a single date was the honest answer and suppressing it would have
     * been the lie. What must never happen is that single date coming from the
     * clock instead of a commit -- checked directly here, because the sibling
     * "simply now" test only rejects the current minute, and a release dated
     * uniformly to midnight would slip past it.
     */
    const [only] = distinct;
    const commitDays = new Set(
      execFileSync('git', ['log', '--pretty=format:%cI', '-n', '400'], {
        cwd: path.join(__dirname, '..', '..'),
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean)
        .map((iso) => iso.slice(0, 10)),
    );
    expect(commitDays.has(only)).toBe(true);
  });

  /**
   * The generator must never reach for the clock: that is the one
   * implementation that guarantees the field is ignored.
   */
  it('emits no date that is simply now', () => {
    const now = new Date().toISOString().slice(0, 16);
    const stampedNow = Object.entries(SITEMAP_LASTMOD)
      .filter(([, value]) => new Date(value).toISOString().slice(0, 16) === now)
      .map(([route]) => route);
    expect(stampedNow).toEqual([]);
  });
});
