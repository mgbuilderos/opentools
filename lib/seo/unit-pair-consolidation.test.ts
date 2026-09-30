import { describe, expect, it } from 'vitest';
import { MATH_OPERATIONS } from '../tools/math-workbench';
import { CONVERSION_PAIRS, conversionPairById } from './conversion-pairs';
import { LIVE_TOOL_ROUTES } from './live-tools';
import { FORMAT_PAIRS } from './format-pairs';
import { IMAGE_PAIRS } from './image-pairs';
import { siteRedirect } from './site-redirects';
import {
  UNIT_PAIR_KEEP_LIST,
  UNIT_PAIR_KEEP_RULE,
} from './unit-pair-keep-list';
import {
  type UnitPairConsolidationState,
  consolidatedUnitPairRedirect,
  hasPublishedUnitPair,
  publishedUnitPairs,
  unitPairTarget,
} from './unit-pair-consolidation';

const ON: UnitPairConsolidationState = {
  enabled: true,
  keepIds: new Set(UNIT_PAIR_KEEP_LIST.map((entry) => entry.id)),
};
const OFF: UnitPairConsolidationState = { enabled: false, keepIds: ON.keepIds };

describe('the keep list is data about real pages', () => {
  /*
   * The failure this catches: a unit renamed in a converter changes its slug,
   * the keep-list id stops matching, and a page the owner asked to keep folds
   * silently on the next build. It costs nothing to check and there is no
   * other place that would notice.
   */
  it('names only pairs that exist', () => {
    const missing = UNIT_PAIR_KEEP_LIST.filter(
      (entry) => !conversionPairById(entry.id),
    );
    expect(missing).toEqual([]);
  });

  it('obeys the rule recorded beside it', () => {
    const breaking = UNIT_PAIR_KEEP_LIST.filter(
      (entry) =>
        entry.impressions < UNIT_PAIR_KEEP_RULE.minImpressions ||
        entry.position >= UNIT_PAIR_KEEP_RULE.maxPosition,
    );
    expect(breaking).toEqual([]);
  });

  it('has no duplicates', () => {
    const ids = UNIT_PAIR_KEEP_LIST.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('what is published', () => {
  it('publishes the keep list and nothing else when on', () => {
    const published = publishedUnitPairs(ON).map((pair) => pair.id);
    expect([...published].sort()).toEqual(
      UNIT_PAIR_KEEP_LIST.map((entry) => entry.id).sort(),
    );
  });

  it('folds the rest', () => {
    expect(CONVERSION_PAIRS.length).toBe(512);
    expect(publishedUnitPairs(ON)).toHaveLength(11);
    expect(CONVERSION_PAIRS.length - publishedUnitPairs(ON).length).toBe(501);
  });

  it('restores every page when off', () => {
    expect(publishedUnitPairs(OFF)).toHaveLength(CONVERSION_PAIRS.length);
    for (const pair of CONVERSION_PAIRS)
      expect(hasPublishedUnitPair(pair.id, OFF)).toBe(true);
  });

  /*
   * The whole point of the fold is that it touches ONE of the three families
   * sharing `/convert`. The file-format and image pairs are the half Google
   * cannot answer in its own results, and folding them would be the opposite
   * of this change.
   */
  it('leaves the format and image pairs alone', () => {
    for (const pair of [...FORMAT_PAIRS, ...IMAGE_PAIRS]) {
      expect(
        consolidatedUnitPairRedirect(`/convert/${pair.id}`, ON),
      ).toBeNull();
    }
  });
});

describe('where a folded pair goes', () => {
  it('sends it to a converter that really runs it', () => {
    const operations = new Set(
      MATH_OPERATIONS.map((operation) => operation.id),
    );
    for (const pair of CONVERSION_PAIRS) {
      if (ON.keepIds.has(pair.id)) continue;
      const target = consolidatedUnitPairRedirect(`/convert/${pair.id}`, ON);
      expect(target).toBe(`/math/${pair.operationId}`);
      expect(operations.has(pair.operationId)).toBe(true);
      // A redirect into a 404 is worse than the 404 it replaced, so the
      // target is checked against the registry, not just against the
      // operation list.
      expect(LIVE_TOOL_ROUTES, target!).toContain(target);
    }
  });

  it('does not redirect a page that still exists', () => {
    for (const entry of UNIT_PAIR_KEEP_LIST)
      expect(
        consolidatedUnitPairRedirect(`/convert/${entry.id}`, ON),
      ).toBeNull();
  });

  it('ignores paths that are not a unit pair', () => {
    for (const path of ['/convert', '/convert/formats', '/math/workbench', '/'])
      expect(consolidatedUnitPairRedirect(path, ON)).toBeNull();
  });
});

describe('siteRedirect serves it without a chain', () => {
  const folded = CONVERSION_PAIRS.find((pair) => !ON.keepIds.has(pair.id))!;

  it('301s a folded pair', () => {
    const redirect = siteRedirect(`/convert/${folded.id}`, '', undefined, ON);
    expect(redirect).toEqual({
      location: `/math/${folded.operationId}`,
      status: 301,
    });
  });

  /*
   * THE ONE THAT MATTERS. `/convert/kg-to-lbs` is an alias for
   * `/convert/kilograms-to-pounds`, which is now folded. Resolving the alias
   * to a page that itself redirects would serve a two-hop chain — exactly what
   * the contract at the top of `site-redirects.ts` promises never to do, and
   * exactly what a future edit to either module could reintroduce without
   * anything else noticing.
   */
  it('resolves an alias to a folded pair in one hop', () => {
    const first = siteRedirect('/convert/kg-to-lbs', '', undefined, ON);
    expect(first?.location).toBe('/math/mass-converter');
    expect(siteRedirect(first!.location, '', undefined, ON)).toBeNull();
  });

  it('never returns a location that itself redirects', () => {
    for (const pair of CONVERSION_PAIRS.slice(0, 60)) {
      const redirect = siteRedirect(`/convert/${pair.id}`, '', undefined, ON);
      if (!redirect) continue;
      const [path] = redirect.location.split('?');
      expect(siteRedirect(path!, '', undefined, ON)).toBeNull();
    }
  });

  it('serves nothing for a folded pair when consolidation is off', () => {
    expect(
      siteRedirect(`/convert/${folded.id}`, '', undefined, OFF),
    ).toBeNull();
  });
});

describe('unitPairTarget', () => {
  it('points at the dedicated converter page for the pair', () => {
    const pair = conversionPairById('kilograms-to-pounds')!;
    expect(unitPairTarget(pair)).toBe('/math/mass-converter');
  });
});
