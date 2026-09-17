import { describe, expect, it, vi } from 'vitest';

import {
  DIMENSION_LADDER,
  QUALITY_CEILING,
  QUALITY_FLOOR,
  fitPdfToSize,
  type PdfFitSettings,
} from './fit-to-size';
import {
  MAX_TARGET_BYTES,
  MIN_TARGET_BYTES,
  PORTAL_PRESETS,
  PRESET_MAX_AGE_DAYS,
  bytesToKib,
  findPreset,
  kibToBytes,
  presetAgeInDays,
  presetsOverdue,
  validateTarget,
} from './size-targets';

/**
 * A stand-in compressor. Size rises with quality and with the pixel ceiling,
 * which is how a real photo-heavy PDF behaves, without needing pdf-lib or a
 * canvas here.
 */
function model(perQuality: number, perPixel: number) {
  return ({ quality, maxImageDimension }: PdfFitSettings) =>
    Promise.resolve({
      byteLength: Math.round(
        quality * perQuality + maxImageDimension * perPixel,
      ),
      value: `q${quality}-d${maxImageDimension}`,
    });
}

describe('fitPdfToSize', () => {
  it('changes nothing when the file is already under the target', async () => {
    const attempt = vi.fn(model(10, 0));
    const result = await fitPdfToSize({
      targetBytes: 1000,
      originalBytes: 500,
      attempt,
    });

    expect(result.outcome).toBe('already-under');
    expect(result.chosen).toBeNull();
    expect(result.settings).toBeNull();
    expect(result.attempts).toBe(0);
    expect(attempt).not.toHaveBeenCalled();
  });

  it('keeps the ceiling quality when the whole range fits', async () => {
    const result = await fitPdfToSize({
      targetBytes: 1000,
      originalBytes: 5000,
      attempt: model(10, 0),
    });

    expect(result.outcome).toBe('met');
    expect(result.settings?.quality).toBe(QUALITY_CEILING);
    expect(result.settings?.maxImageDimension).toBe(DIMENSION_LADDER[0]);
    expect(result.chosen?.byteLength).toBe(920);
    // Floor then ceiling, and no bisection once the ceiling is known to fit.
    expect(result.attempts).toBe(2);
  });

  it('bisects to the highest quality that fits', async () => {
    const result = await fitPdfToSize({
      targetBytes: 600,
      originalBytes: 5000,
      attempt: model(10, 0),
    });

    expect(result.outcome).toBe('met');
    expect(result.settings?.quality).toBe(59);
    expect(result.chosen?.byteLength).toBe(590);
    expect(result.chosen?.byteLength).toBeLessThanOrEqual(600);
  });

  it('drops to smaller images only when quality alone cannot get under', async () => {
    const result = await fitPdfToSize({
      targetBytes: 900,
      originalBytes: 50_000,
      attempt: model(10, 0.5),
    });

    expect(result.outcome).toBe('met');
    expect(result.settings?.maxImageDimension).toBe(1000);
    expect(result.chosen?.byteLength).toBeLessThanOrEqual(900);
    // The three larger rungs are rejected on one floor probe each.
    expect(result.attempts).toBe(10);
  });

  it('reports over-max and still hands back the smallest attempt', async () => {
    const result = await fitPdfToSize({
      targetBytes: 100,
      originalBytes: 50_000,
      attempt: model(10, 0.5),
    });

    expect(result.outcome).toBe('over-max');
    expect(result.attempts).toBe(DIMENSION_LADDER.length);
    expect(result.settings).toEqual({
      quality: QUALITY_FLOOR,
      maxImageDimension: DIMENSION_LADDER.at(-1),
    });
    expect(result.chosen?.byteLength).toBe(650);
  });

  it('stops at the attempt budget', async () => {
    const attempt = vi.fn(model(10, 0.5));
    const result = await fitPdfToSize({
      targetBytes: 900,
      originalBytes: 50_000,
      attempt,
      maxAttempts: 3,
    });

    expect(attempt).toHaveBeenCalledTimes(3);
    expect(result.attempts).toBe(3);
    expect(result.outcome).toBe('over-max');
  });

  it('judges every attempt on measured bytes, not on its neighbours', async () => {
    // Quality 61 encodes worse than quality 92. An implementation that assumed
    // size rises with quality would hand back a file over the target here.
    const spiky = ({ quality, maxImageDimension }: PdfFitSettings) =>
      Promise.resolve({
        byteLength: quality === 61 ? 5000 : quality * 10,
        value: `q${quality}-d${maxImageDimension}`,
      });

    const result = await fitPdfToSize({
      targetBytes: 600,
      originalBytes: 50_000,
      attempt: spiky,
    });

    expect(result.outcome).toBe('met');
    expect(result.chosen?.byteLength).toBeLessThanOrEqual(600);
    expect(result.settings?.quality).toBe(59);
  });
});

describe('size targets', () => {
  it('states every preset in whole KiB', () => {
    for (const preset of PORTAL_PRESETS) {
      expect(preset.limitBytes % 1024).toBe(0);
      expect(preset.limitBytes).toBeGreaterThanOrEqual(MIN_TARGET_BYTES);
      expect(preset.limitBytes).toBeLessThanOrEqual(MAX_TARGET_BYTES);
    }
  });

  it('gives every preset a unique id', () => {
    const ids = PORTAL_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('looks presets up by id', () => {
    expect(findPreset('uscis-online-filing')?.limitBytes).toBe(11_718 * 1024);
    expect(findPreset('not-a-portal')).toBeNull();
  });

  it('reads a stated decimal-MB ceiling down, never up', () => {
    // USCIS says 12MB and does not say whether it means MB or MiB. Either
    // reading must leave a file that meets the preset under the ceiling.
    const uscis = findPreset('uscis-online-filing');
    expect(uscis?.limitBytes).toBeLessThanOrEqual(12 * 1_000_000);
  });

  it('round-trips KiB and bytes', () => {
    expect(kibToBytes(500)).toBe(512_000);
    expect(bytesToKib(512_000)).toBe(500);
  });

  it('cites a portal-published source and a check date for every preset', () => {
    for (const preset of PORTAL_PRESETS) {
      expect(preset.sourceUrl).toMatch(/^https:\/\//u);
      expect(preset.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
      expect(Number.isNaN(Date.parse(preset.checkedOn))).toBe(false);
      // A row cannot claim it was checked in the future.
      expect(presetAgeInDays(preset, new Date())).toBeGreaterThanOrEqual(0);
    }
  });

  // Owner decision 16: a portal limit that moved must fail the build rather
  // than sit here being quietly wrong. Re-open the row's sourceUrl, then
  // either update checkedOn or delete the row. Never carry the number forward.
  it('has no preset older than the re-check window', () => {
    expect(presetsOverdue(new Date())).toEqual([]);
  });

  it('reports a preset as overdue once past the window', () => {
    const preset = PORTAL_PRESETS[0];
    const checked = Date.parse(`${preset.checkedOn}T00:00:00Z`);
    const dayAfterExpiry = new Date(
      checked + (PRESET_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000,
    );
    expect(presetsOverdue(dayAfterExpiry)).toContain(preset);
    const lastGoodDay = new Date(
      checked + PRESET_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    );
    expect(presetsOverdue(lastGoodDay)).toEqual([]);
  });

  it('rejects targets outside what the tool can honour', () => {
    expect(validateTarget(kibToBytes(500))).toBeNull();
    expect(validateTarget(0)).toBe('Enter a target size in KB.');
    expect(validateTarget(Number.NaN)).toBe('Enter a target size in KB.');
    expect(validateTarget(MIN_TARGET_BYTES - 1)).toContain('smallest target');
    expect(validateTarget(MAX_TARGET_BYTES + 1)).toContain('largest target');
  });
});
