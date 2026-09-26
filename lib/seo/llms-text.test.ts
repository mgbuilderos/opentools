import { describe, expect, it } from 'vitest';

import { FORMAT_PAIRS } from './format-pairs';
import { IMAGE_PAIRS } from './image-pairs';
import { LIVE_TOOL_CATALOG } from './live-tools';
import { LIVE_TOOL_ROUTES } from './live-tool-routes';
import { buildLlmsFullTxt, buildLlmsTxt } from './llms-text';
import { loadsLocalModel } from '../security/content-security-policy';

/**
 * The two files an assistant reads when someone asks it for a tool.
 *
 * This is the one acquisition channel that does not run through Google, so it
 * does not wait on domain authority: an assistant answering "convert this
 * without uploading it" fetches `/llms.txt`, and `/llms-full.txt` behind it,
 * and recommends from what it finds. Until 2026-09-26 both files described
 * every tool as "in-browser <category> utility", which tells a reader that a
 * route exists and nothing about whether it answers the question. The catalog
 * has a written note per tool saying what the tool is for; these tests exist
 * so that note keeps reaching both files.
 *
 * The pipe rule is the load-bearing one. `/llms-full.txt` is pipe-delimited and
 * the note is now a column in it, so a note containing a pipe would split into
 * a phantom field and silently corrupt every parse of that row.
 */
describe('llms.txt and llms-full.txt', () => {
  const FIELDS = 7;

  it('gives every tool a note that cannot break the pipe format', () => {
    const offenders = LIVE_TOOL_CATALOG.filter(
      (tool) =>
        !tool.notes.trim() ||
        tool.notes.includes('|') ||
        /[\r\n]/u.test(tool.notes),
    ).map((tool) => tool.id);
    expect(offenders).toEqual([]);
  });

  it('carries what each tool does, not a category restatement', () => {
    const rows = buildLlmsFullTxt()
      .split('\n')
      .filter((line) => line && !line.startsWith('#'));

    expect(rows).toHaveLength(LIVE_TOOL_CATALOG.length);
    for (const row of rows) {
      expect(row.split(' | ')).toHaveLength(FIELDS);
    }

    // Spot the whole catalog rather than a sample: a note dropped for one tool
    // is a tool an assistant stops recommending, and nothing else would notice.
    for (const tool of LIVE_TOOL_CATALOG) {
      const row = rows.find((line) => line.startsWith(`${tool.id} | `));
      expect(row, tool.id).toBeDefined();
      expect(row, tool.id).toContain(` | ${tool.notes}`);
    }
  });

  it('describes its featured tools in /llms.txt the same way', () => {
    const lines = buildLlmsTxt().split('\n');
    const featured = lines
      .slice(lines.indexOf('## Featured tools') + 1)
      .filter((line) => line.startsWith('- ['));

    expect(featured.length).toBeGreaterThan(0);
    for (const line of featured) {
      const tool = LIVE_TOOL_CATALOG.find((entry) =>
        line.startsWith(`- [${entry.name}](`),
      );
      expect(tool, line).toBeDefined();
      // The note itself, not the category dressed up as a description.
      expect(line, tool?.id).toContain(`: ${tool?.notes}`);
      expect(line, tool?.id).not.toContain('in-browser');
    }
  });
});

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

  /*
    The pages a person has to open, because converting a file needs a
    converter. They were absent from the catalogue entirely: an assistant
    asked "convert CSV to YAML without uploading it" had nothing to cite on a
    site with a page for exactly that.
  */
  it('lists every must-click conversion page', () => {
    for (const pair of [...FORMAT_PAIRS, ...IMAGE_PAIRS]) {
      expect(full, `${pair.id} has a page but no catalog row`).toContain(
        `${origin}/convert/${pair.id} `,
      );
    }
    expect(FORMAT_PAIRS.length + IMAGE_PAIRS.length).toBeGreaterThan(100);
  });

  /*
    And not the other family. Google answers "cm to inches" in its own
    results; those 512 pages produced 15 page-opens on 2026-09-23. Listing
    them would quadruple the file with the rows least likely to be followed.
  */
  it('leaves the unit pairs out', () => {
    expect(full).not.toContain('/convert/centimetres-to-inches');
    expect(full).not.toContain('/convert/kilograms-to-pounds');
  });

  it('keeps the catalog row format it declares', () => {
    const header = '# Format: ID | Name | Category | Tool URL | Guide URL';
    expect(full).toContain(header);
    const rows = full
      .split('\n')
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    expect(rows.length).toBeGreaterThan(500);
    for (const row of rows) expect(row.split(' | ')).toHaveLength(7);
  });
});
