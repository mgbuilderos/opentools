import { describe, expect, it } from 'vitest';
import { EMPTY_READING, formatEgressBytes, readingFrom } from './egress-meter';

describe('egress meter', () => {
  it("ignores the page's own assets", () => {
    const reading = readingFrom([
      { initiatorType: 'script', transferSize: 40_000 },
      { initiatorType: 'css', transferSize: 9_000 },
      { initiatorType: 'img', transferSize: 120_000 },
      { initiatorType: 'link', transferSize: 2_000 },
    ]);
    expect(reading).toEqual({ requests: 0, bytes: 0, measurable: true });
  });

  it('counts every request type that could carry a file body', () => {
    const reading = readingFrom([
      { initiatorType: 'fetch', transferSize: 100 },
      { initiatorType: 'xmlhttprequest', transferSize: 50 },
      { initiatorType: 'beacon', transferSize: 25 },
    ]);
    expect(reading.requests).toBe(3);
    expect(reading.bytes).toBe(175);
  });

  it('matches initiator type regardless of case', () => {
    expect(readingFrom([{ initiatorType: 'XMLHttpRequest' }]).requests).toBe(1);
  });

  it('accumulates onto a previous reading rather than replacing it', () => {
    const first = readingFrom([{ initiatorType: 'fetch', transferSize: 10 }]);
    const second = readingFrom(
      [{ initiatorType: 'fetch', transferSize: 5 }],
      first,
    );
    expect(second).toEqual({ requests: 2, bytes: 15, measurable: true });
  });

  it('survives entries with no transferSize', () => {
    const reading = readingFrom([{ initiatorType: 'fetch' }], EMPTY_READING);
    expect(reading).toEqual({ requests: 1, bytes: 0, measurable: true });
  });

  it('formats a reading of nothing as an exact zero', () => {
    expect(formatEgressBytes(0)).toBe('0 bytes');
    expect(formatEgressBytes(Number.NaN)).toBe('0 bytes');
    expect(formatEgressBytes(512)).toBe('512 bytes');
    expect(formatEgressBytes(2048)).toBe('2.0 KiB');
  });
});
