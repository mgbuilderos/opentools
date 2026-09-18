import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PORTAL_PRESETS,
  PRESET_MAX_AGE_DAYS,
  findPreset,
  presetAgeInDays,
  presetsOverdue,
} from './portal-presets';
import { MAX_TARGET_BYTES, MIN_TARGET_BYTES } from './tools/pdf/size-targets';

describe('portal presets', () => {
  it('states every preset in whole KiB the tool can aim at', () => {
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
    expect(findPreset('uscis-online-filing')?.limitBytes).toBeLessThanOrEqual(
      12 * 1_000_000,
    );
    expect(findPreset('gmail-attachment')?.limitBytes).toBeLessThanOrEqual(
      25 * 1_000_000,
    );
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

  /**
   * This module is the one place a portal URL is allowed to be written down,
   * so it carries the rest of the local-source policy itself: the URLs are
   * citations for a person to click, and nothing here opens one.
   */
  it('holds citations only, and no way to reach the network', () => {
    const source = readFileSync(
      path.join(import.meta.dirname, 'portal-presets.ts'),
      'utf8',
    );
    for (const primitive of [
      /\bfetch\s*\(/u,
      /\bXMLHttpRequest\b/u,
      /\bWebSocket\s*\(/u,
      /\bEventSource\s*\(/u,
      /\bsendBeacon\s*\(/u,
      /\bimport\s*\(/u,
    ]) {
      expect(source).not.toMatch(primitive);
    }
  });
});
