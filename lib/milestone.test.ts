import { describe, expect, it } from 'vitest';

import {
  MILESTONES,
  milestoneToOffer,
  milestonesReached,
  parseCelebrated,
  parseUsageCount,
} from './milestone';

describe('usage milestones', () => {
  it('reads a count, and reads anything else as none', () => {
    expect(parseUsageCount('50')).toBe(50);
    expect(parseUsageCount('0')).toBe(0);
    expect(parseUsageCount('-3')).toBe(0);
    expect(parseUsageCount('not a number')).toBe(0);
    expect(parseUsageCount(null)).toBe(0);
  });

  it('reads the celebrated list, and survives anything stored under that key', () => {
    expect(parseCelebrated('[10,50]')).toEqual([10, 50]);
    expect(parseCelebrated(null)).toEqual([]);
    expect(parseCelebrated('{')).toEqual([]);
    expect(parseCelebrated('"10"')).toEqual([]);
    expect(parseCelebrated('[10,"50",null,100]')).toEqual([10, 100]);
  });

  it('offers nothing below the first milestone', () => {
    expect(milestoneToOffer(0, [])).toBeNull();
    expect(milestoneToOffer(9, [])).toBeNull();
  });

  it('offers a milestone once and never again', () => {
    expect(milestoneToOffer(10, [])).toBe(10);
    expect(milestoneToOffer(10, [10])).toBeNull();
    expect(milestoneToOffer(49, [10])).toBeNull();
  });

  /**
   * The count can jump: someone who finds the site and runs sixty things in an
   * afternoon has passed 10 and 50 in one sitting. They are told once, about
   * the higher one, and the lower one must not resurface later.
   */
  it('offers the highest milestone passed when the count jumps', () => {
    expect(milestoneToOffer(60, [])).toBe(50);
    expect(milestonesReached(60, [])).toEqual([10, 50]);
    expect(milestoneToOffer(60, [10, 50])).toBeNull();
  });

  it('still offers 100 to someone who was shown the earlier two', () => {
    expect(milestoneToOffer(100, [10, 50])).toBe(100);
    expect(milestoneToOffer(250, [10, 50, 100])).toBeNull();
  });

  it('names three milestones and no more', () => {
    // A fourth would be nagging: the ask is capped by mayOfferSupport too.
    expect([...MILESTONES]).toEqual([10, 50, 100]);
  });
});
