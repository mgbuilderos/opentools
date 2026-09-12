import { describe, expect, it } from 'vitest';
import {
  mayOfferSupport,
  supportPreference,
  SUPPORT_COOLDOWN_MS,
} from './support-preference';

describe('optional support frequency boundary', () => {
  it('suppresses across navigation and reloads until exactly seven days', () => {
    const stored = supportPreference(1000);
    expect(mayOfferSupport(stored, 1001)).toBe(false);
    expect(mayOfferSupport(stored, 1000 + SUPPORT_COOLDOWN_MS - 1)).toBe(false);
    expect(mayOfferSupport(stored, 1000 + SUPPORT_COOLDOWN_MS)).toBe(true);
  });
  it('honors never even long after the cooldown', () => {
    expect(
      mayOfferSupport(
        supportPreference(1000, true),
        1000 + SUPPORT_COOLDOWN_MS * 100,
      ),
    ).toBe(false);
  });
  it('handles missing, malformed and unexpected storage safely', () => {
    for (const value of [
      null,
      '',
      '{bad',
      'null',
      'false',
      '12',
      '{}',
      '{"lastOffered":"yesterday"}',
    ])
      expect(mayOfferSupport(value, 1000)).toBe(true);
  });
  it('does not immediately repeat when the device clock moves backward', () => {
    expect(mayOfferSupport(supportPreference(1000), 500)).toBe(false);
  });
  it('stores only the preference and timing, never job facts', () => {
    expect(Object.keys(JSON.parse(supportPreference(123, true)))).toEqual([
      'lastOffered',
      'never',
    ]);
  });
});
