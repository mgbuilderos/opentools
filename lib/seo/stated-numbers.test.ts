import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * No page may state the size of the site in a hand-written number.
 *
 * WHY. On 2026-09-25 the support page — the page that asks people for money —
 * told every reader "All 645+ pages operate under an optimized cache budget
 * (<125 writes/day)". The sitemap held 1,464 pages and the budget was 900.
 * Both numbers had been true once. Nothing re-checked them, because nothing
 * could: they were words in a sentence.
 *
 * A number a person typed is a number that stops being true the day after it
 * is typed, and the owner of this site cannot audit 1,464 pages by hand. So a
 * count that describes the site has to be counted at build time from the
 * registry that defines it — `buildSitemap()`, `LIVE_TOOL_ROUTES`,
 * `CATEGORY_HUBS` — and this test is what makes that the only option.
 *
 * It does NOT object to numbers generally. Prices, limits, file sizes, years,
 * dates and a tool's own capability ("splits 500+ page statements") are not
 * claims about how big the site is, and are left alone.
 */

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

/** Nouns that make a number a claim about the size of this site. */
const SCALE_NOUN =
  /\d{1,3}(?:,\d{3})*\+?[ \n\t]+(?:tools|tool pages|pages|utilities|guides|calculators|converters|categories)\b/giu;

/**
 * Numbers that are allowed to be literal, each with the reason it cannot rot.
 *
 * Every entry is a number that is NOT a count of this site's own pages. Adding
 * one means saying why a person reading it in a year will still be reading
 * something true.
 */
const ALLOWED: ReadonlyArray<{ file: string; text: string; why: string }> = [
  {
    file: 'components/pdf-burst-tool.tsx',
    text: '500+ page',
    why: 'what the splitter handles in one input file, not a count of this site',
  },
  {
    file: 'components/pdf-drawing-register-tool.tsx',
    text: '500+ page',
    why: 'the size of drawing set the register reads, not a count of this site',
  },
];

function pagesAndComponents(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...pagesAndComponents(full));
    else if (name.endsWith('.tsx') && !name.includes('.test.')) out.push(full);
  }
  return out;
}

/** Source with comments removed: a number in a comment is a note, not a claim. */
function visibleSource(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

describe('numbers stated to a reader', () => {
  it('never hand-writes how many pages or tools this site has', () => {
    const offences: string[] = [];
    for (const file of [
      ...pagesAndComponents(path.join(ROOT, 'app')),
      ...pagesAndComponents(path.join(ROOT, 'components')),
    ]) {
      const relative = path.relative(ROOT, file);
      const source = visibleSource(file);
      for (const match of source.matchAll(SCALE_NOUN)) {
        const phrase = match[0].replace(/\s+/gu, ' ').trim();
        const excused = ALLOWED.some(
          (entry) =>
            entry.file === relative &&
            phrase.startsWith(entry.text.split(' ')[0]!),
        );
        if (excused) continue;
        const line = source.slice(0, match.index).split('\n').length;
        offences.push(
          `${relative}:${line} says "${phrase}" — count it from the registry instead, or add it to ALLOWED with a reason.`,
        );
      }
    }
    expect(offences, offences.join('\n')).toEqual([]);
  });

  it('keeps the excuse list honest', () => {
    // An allowance for a file that no longer says it is an allowance nobody
    // re-read. It must describe something still in the source.
    for (const entry of ALLOWED) {
      const source = visibleSource(path.join(ROOT, entry.file));
      expect(source, `${entry.file} no longer says "${entry.text}"`).toContain(
        entry.text,
      );
      expect(entry.why.length, `${entry.file} needs a reason`).toBeGreaterThan(
        20,
      );
    }
  });
});
