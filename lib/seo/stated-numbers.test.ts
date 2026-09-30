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

/**
 * Nouns that make a number a claim about the size of this site.
 *
 * The number does not have to sit against the noun. Until 2026-09-30 this
 * required `\d+` immediately before it, and the copy this site actually writes
 * puts adjectives in between: "86 MIT-licensed browser tools", "30+ on-device
 * converters", "33 related tools". A guard that only sees the bare form is
 * green while the claims it exists to catch go past it, which is how two typed
 * counts — `app/templates/page.tsx` and `components/text-workbench-tool.tsx` —
 * shipped under it.
 *
 * Two intervening words, because that is what the copy needs and no more. It is
 * the same fix, and the same day, as the one made to `scripts/launch-claims.test.ts`
 * after its own matcher went blind and took the unit gate down for every lane;
 * `SCALE_NOUN` had the identical blind spot and was still passing.
 */
const SCALE_NOUN =
  /\d{1,3}(?:,\d{3})*\+?(?:[ \n\t]+[\w'’-]+){0,2}[ \n\t]+(?:tools|tool pages|pages|utilities|guides|calculators|converters|categories)\b/giu;

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

/**
 * Offences this guard could not see until 2026-09-30, in a file this lane may
 * not edit.
 *
 * This is NOT `ALLOWED`. Every entry above is a number that cannot rot. Every
 * entry here is a number that can, is expected to, and is only listed so that
 * widening `SCALE_NOUN` does not redden the unit gate on somebody else's file
 * while they are asked to fix it. An entry leaves this list by the count being
 * computed from a registry, not by anybody deciding it is fine.
 */
const AWAITING_ANOTHER_LANE: ReadonlyArray<{
  file: string;
  text: string;
  why: string;
}> = [
  {
    file: 'app/templates/page.tsx',
    text: '30+ on-device converters',
    why: 'Antigravity owns app/templates/** under AGENT_BOARD.md §2; requested there on 2026-09-30 that it read the registry, and it also hedges twice ("over 30+")',
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
        const excused = [...ALLOWED, ...AWAITING_ANOTHER_LANE].some(
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

  /*
   * Guards the guard.
   *
   * `scripts/launch-claims.test.ts` spent an unknown number of days checking
   * nothing because its matcher stopped matching, and the only reason anybody
   * found out is that it had an assertion like this one. A pattern that can go
   * blind needs something that fails when it does, so the pattern is checked
   * against phrasings taken from the copy it is supposed to catch.
   */
  it('still recognises a stated count, however it is phrased', () => {
    const shouldMatch = [
      '645+ pages',
      '86 tools',
      '33 related tools',
      '30+ on-device converters',
      '86 MIT-licensed browser tools',
      '1,464 pages',
      '19 categories',
    ];
    const missed = shouldMatch.filter(
      (phrase) => !new RegExp(SCALE_NOUN.source, 'giu').test(phrase),
    );
    expect(
      missed,
      'SCALE_NOUN no longer matches these, so this guard is checking less ' +
        'than it reports. Every one of them is a count of this site stated to ' +
        'a reader.',
    ).toEqual([]);

    const shouldNotMatch = ['500 KB per tool', 'v0.2.0', '8796'];
    const overreach = shouldNotMatch.filter((phrase) =>
      new RegExp(SCALE_NOUN.source, 'giu').test(phrase),
    );
    expect(
      overreach,
      'SCALE_NOUN now matches something that is not a count of this site, ' +
        'which turns every file size and version into an offence.',
    ).toEqual([]);
  });

  it('keeps the excuse list honest', () => {
    // An allowance for a file that no longer says it is an allowance nobody
    // re-read. It must describe something still in the source.
    for (const entry of [...ALLOWED, ...AWAITING_ANOTHER_LANE]) {
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
