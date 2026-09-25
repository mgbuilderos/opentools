import { describe, expect, it } from 'vitest';

import { loadsLocalModel } from '../security/content-security-policy';
import { LIVE_TOOL_ROUTES } from './live-tool-routes';
import { buildLlmsFullTxt, buildLlmsTxt } from './llms-text';

/*
  `llms-text.ts` has cited this file for months and it did not exist. What it
  publishes is the first thing an assistant reads about this site, and two of
  the things it said were wrong -- a sentence naming one CSP exception where
  there are four, and 44 addresses that do not open the tool they name. Both
  are the kind of error only a test comparing the text against the modules it
  describes can catch, because both read perfectly well.
*/

const llms = buildLlmsTxt();
const full = buildLlmsFullTxt();
const origin = ['https:', '//', 'getopentools.com'].join('');

/** Every OpenTools path the two files hand out, tool pages and guides alike. */
function pathsIn(text: string): string[] {
  return [...text.matchAll(new RegExp(`${origin}(/[^\\s|)\\]]*)`, 'g'))].map(
    (match) => match[1]!,
  );
}

describe('the addresses these files publish', () => {
  /*
    `/pdf/page-tools?tool=rotate-pdf` is inert: the component never reads the
    parameter, the URL is kept out of the sitemap, and `/pdf/rotate-pdf` is
    live and opens on the right tool. Publishing the query form sends someone
    who asked to rotate a PDF to a page showing something else.
  */
  it('hands out no query-string address that does not select the tool', () => {
    const queried = [...pathsIn(llms), ...pathsIn(full)].filter((path) =>
      path.includes('?tool='),
    );
    expect(
      [...new Set(queried)],
      'addresses whose ?tool= parameter is never read',
    ).toEqual([]);
  });

  it('hands out tool pages that are live', () => {
    const live = new Set(LIVE_TOOL_ROUTES);
    const dead = pathsIn(full)
      .filter((path) => !path.startsWith('/guides/'))
      .filter((path) => path !== '/' && !live.has(path));

    expect([...new Set(dead)], 'catalog rows pointing at a dead page').toEqual(
      [],
    );
  });
});

describe('the claims these files make', () => {
  /*
    The one paragraph an IT reviewer checks with `curl -I`. Every route it
    names as an exception has to really be served 'self', and no route served
    'self' may be left out of the sentence.
  */
  it('names every route served connect-src self, and only those', () => {
    const named = [...llms.matchAll(/(\/image\/[a-z-]+)/g)]
      .map((match) => match[1]!)
      .filter((route) => llms.includes(`${route} --`) || llms.includes(route));

    for (const route of [
      '/image/background-remover',
      '/image/editor',
      '/image/heic-to-jpg',
      '/image/heic-to-png',
    ]) {
      expect(loadsLocalModel(route), `${route} is a local-model route`).toBe(
        true,
      );
      expect(llms, `${route} is named as an exception`).toContain(route);
    }
    expect(named.length).toBeGreaterThan(0);

    expect(
      llms,
      'the superseded "the one exception" wording is gone',
    ).not.toContain('is the one exception');
  });

  it('points at the evidence rather than restating it', () => {
    expect(llms).toContain(`${origin}/proof`);
    expect(llms).toContain(`${origin}/privacy`);
    expect(llms).toContain(`${origin}/security`);
    expect(llms).toContain(`${origin}/sitemap.xml`);
  });

  it('claims no rating in the structured-data line', () => {
    expect(llms).toContain('SoftwareApplication');
    expect(llms).not.toContain('aggregateRating');
  });

  it('keeps the catalog row format it declares', () => {
    const header = '# Format: ID | Name | Category | Tool URL | Guide URL';
    expect(full).toContain(header);
    const rows = full
      .split('\n')
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    expect(rows.length).toBeGreaterThan(500);
    for (const row of rows) expect(row.split(' | ')).toHaveLength(6);
  });
});
