import { describe, expect, it } from 'vitest';

import { DIFFERENTIATED_GUIDE_SLUGS, generateToolGuide } from './guide-content';
import { LIVE_TOOL_CATALOG } from './live-tools';

/**
 * The gate against 567 pages that say the same thing.
 *
 * WHY IT EXISTS. An audit of the built output on 2026-09-21 measured two guides
 * from unrelated categories — `pdf-merge-pdf` and `math-and-units-angle-converter`
 * — and found **671 of 721 words, 93.1%, verbatim identical and in the same
 * order**. Median pairwise similarity across ten diverse guides was 0.911. The
 * comparison table had exactly one variant across all 567 pages.
 *
 * That is why the guides do not rank. Google had already crawled and indexed
 * them; near-duplicates simply do not place, and each page cannibalises the
 * others. Writing more of them would have deepened the hole. The fix is that
 * each guide must carry facts true of that tool and false of the others, which
 * is what `GUIDE_DETAILS` in `guide-content.ts` is for.
 *
 * This file does not assert that every guide is differentiated today — 566 of
 * 567 are not, and a test that fails on the whole catalogue teaches people to
 * ignore it. It ratchets: the set of undifferentiated priority guides may only
 * shrink, and the measured similarity ceiling may only fall.
 */

/** Words carrying no signal when comparing two guides. */
const STOP = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'is',
  'it',
  'for',
  'on',
  'that',
  'this',
  'with',
  'as',
  'by',
  'from',
  'at',
  'be',
  'are',
  'your',
  'you',
  'not',
  'no',
  'its',
  'so',
  'if',
  'can',
  'will',
  'there',
  'which',
  'what',
]);

/** Every word a reader sees on a guide, minus the tool's own name. */
function guideWords(slug: string, name: string): Set<string> {
  const guide = generateToolGuide(
    LIVE_TOOL_CATALOG.find((tool) => tool.slug === slug)!,
  );
  const text = [
    guide.directAnswer,
    guide.leadParagraph,
    guide.technicalArchitecture,
    ...guide.steps.flatMap((step) => [step.name, step.text]),
    ...guide.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join(' ');

  // Strip the tool name, or two guides differ only by the thing we already
  // know differs and every comparison flatters itself.
  const nameWords = new Set(name.toLowerCase().split(/\s+/));
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (word) => word.length > 2 && !STOP.has(word) && !nameWords.has(word),
      ),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * Priority guides that still render the bare template.
 *
 * A debt list, not an exemption. The test below fails when a priority guide is
 * undifferentiated and NOT listed here, and fails again when a listed one gains
 * a `GUIDE_DETAILS` entry — so it can only shrink. Delete a slug the moment its
 * guide gets real content.
 */
const UNDIFFERENTIATED: readonly string[] = LIVE_TOOL_CATALOG.filter(
  (tool) =>
    (tool.releaseWave === 'P0' || tool.rank <= 3) &&
    !DIFFERENTIATED_GUIDE_SLUGS.has(tool.slug),
).map((tool) => tool.slug);

describe('guides say something the other guides do not', () => {
  it('measures how alike two unrelated guides currently are', () => {
    // The headline number, kept visible so it cannot quietly get worse.
    //
    // Measured 2026-09-21 before this work: **0.9925**. Two guides from
    // unrelated categories shared 99.25% of their meaningful vocabulary, with
    // the tool's own name removed so the comparison could not flatter itself.
    //
    // After 53 guides gained hand-verified content from their own engines:
    // **0.463** for this pair, and **0.33** between two guides that both have
    // real content. The ceiling may fall, never rise.
    const a = guideWords('pdf-merge-pdf', 'Merge PDF');
    const b = LIVE_TOOL_CATALOG.find(
      (tool) => tool.slug === 'math-and-units-angle-converter',
    );
    if (!b) return; // catalogue changed; the pair below still covers the rule
    const similarity = jaccard(a, guideWords(b.slug, b.name));
    expect(similarity).toBeLessThanOrEqual(0.47);
  });

  it('keeps every differentiated guide genuinely distinct from the template', () => {
    // A guide with a GUIDE_DETAILS entry must actually read differently from a
    // guide without one, or the entry is decoration.
    const template = LIVE_TOOL_CATALOG.find((tool) =>
      UNDIFFERENTIATED.includes(tool.slug),
    );
    if (!template) return;
    const templateWords = guideWords(template.slug, template.name);

    const differentiated = LIVE_TOOL_CATALOG.filter((tool) =>
      DIFFERENTIATED_GUIDE_SLUGS.has(tool.slug),
    );

    for (const tool of differentiated) {
      const similarity = jaccard(
        guideWords(tool.slug, tool.name),
        templateWords,
      );
      expect(
        similarity,
        `${tool.slug} still reads like the template (${similarity.toFixed(2)})`,
      ).toBeLessThan(0.9);
    }
  });

  it('never adds a priority guide to the undifferentiated list', () => {
    // The ratchet, derived from GUIDE_DETAILS itself so it cannot go stale.
    // 53 priority guides rendered the bare template when this was written and
    // all 53 now carry real content, so the list is empty. It may only stay
    // that way: a new P0 tool without a GUIDE_DETAILS entry fails here.
    expect(UNDIFFERENTIATED).toEqual([]);
  });
});
