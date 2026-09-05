import { describe, expect, it } from 'vitest';

import {
  calculatePercentage,
  calendarAge,
  convertTimestamp,
  dateDifference,
  decodeBase64Text,
  encodeBase64Text,
  generateUuids,
  hashBytes,
} from './utility';

describe('base64 text', () => {
  it('round-trips Unicode text', () => {
    const value = 'Private tools — नमस्ते 🌍';
    expect(decodeBase64Text(encodeBase64Text(value))).toBe(value);
  });

  it('rejects malformed and non-UTF-8 input', () => {
    expect(() => decodeBase64Text('not base64')).toThrow(/valid standard/u);
    expect(() => decodeBase64Text('//8=')).toThrow(/UTF-8/u);
  });
});

describe('developer utilities', () => {
  it('generates RFC-shaped unique UUIDs', () => {
    const values = generateUuids(10);
    expect(new Set(values).size).toBe(10);
    for (const value of values) {
      expect(value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      );
    }
  });

  it('converts seconds, milliseconds, and ISO input', () => {
    expect(convertTimestamp('0').iso).toBe('1970-01-01T00:00:00.000Z');
    expect(convertTimestamp('1704067200000').unixSeconds).toBe(1704067200);
    expect(convertTimestamp('2024-01-01T00:00:00Z').unixMilliseconds).toBe(
      1704067200000,
    );
    expect(() => convertTimestamp('90071992547409910')).toThrow(/exact/u);
  });

  it('hashes bytes with the selected digest', async () => {
    const bytes = new TextEncoder().encode('abc').buffer;
    await expect(hashBytes(bytes, 'SHA-256')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('everyday calculations', () => {
  it('calculates common percentage questions', () => {
    expect(calculatePercentage('percent-of', 20, 150)).toBe(30);
    expect(calculatePercentage('what-percent', 30, 150)).toBe(20);
    expect(calculatePercentage('change', 80, 100)).toBe(25);
    expect(() => calculatePercentage('change', 0, 100)).toThrow(/starting/u);
  });

  it('uses calendar dates rather than local daylight-saving time', () => {
    expect(dateDifference('2024-02-28', '2024-03-01')).toBe(2);
    expect(dateDifference('2024-03-01', '2024-02-28')).toBe(2);
  });

  it('returns calendar age and rejects future births', () => {
    expect(calendarAge('2000-01-15', '2026-09-05')).toEqual({
      years: 26,
      months: 7,
      days: 21,
      totalDays: 9730,
    });
    expect(calendarAge('2000-02-29', '2025-02-28').years).toBe(25);
    expect(() => calendarAge('2030-01-01', '2026-01-01')).toThrow(/after/u);
  });
});
