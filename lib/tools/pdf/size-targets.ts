/**
 * Upload ceilings for the portals people most often get bounced from.
 *
 * Owner decision 16 (2026-09-17, amending decision 9) sets the terms these
 * rows exist on. Every row carries the page that states the limit, published
 * by the portal itself, and the date a person last read the number off it.
 * `presetsOverdue()` backs a test that fails the build once any row passes
 * `PRESET_MAX_AGE_DAYS`, so a limit that moved becomes loud instead of quietly
 * wrong. Re-checking means opening `sourceUrl` again and either updating
 * `checkedOn` or deleting the row — never carrying a number forward on trust.
 *
 * The number belongs in the app, beside its source link and date, and stays
 * editable after it fills the target box. It must not reach a page title,
 * heading, meta description, structured data or the sitemap: search engines
 * keep serving those long after a limit moves.
 *
 * Portals state limits in decimal MB more often than in MiB, and none of them
 * say which they mean. Every row below therefore reads the stated figure as
 * decimal and rounds **down** to whole KiB, so a file that meets the preset is
 * under the ceiling on either reading.
 */

const KIB = 1024;
const MIB = 1024 * KIB;

/** Whole KiB at or below `mb` decimal megabytes. Never rounds up. */
function decimalMbToKib(mb: number) {
  return Math.floor((mb * 1_000_000) / KIB) * KIB;
}

export type PortalPreset = {
  id: string;
  /** What someone calls the place they are uploading to. */
  portal: string;
  /** The form or field, since a portal often has more than one ceiling. */
  field: string;
  limitBytes: number;
  /** What the ceiling applies to, so a wrong preset is obvious before running. */
  note: string;
  /**
   * The page stating this limit, published by the portal itself — not a blog,
   * a forum answer or another tool's website. Shown next to the number so a
   * user can check it in one click.
   */
  sourceUrl: string;
  /** ISO date (YYYY-MM-DD) a person last read this number off `sourceUrl`. */
  checkedOn: string;
};

export const PORTAL_PRESETS: readonly PortalPreset[] = [
  {
    id: 'uscis-online-filing',
    portal: 'USCIS',
    field: 'Any document uploaded with an online form',
    limitBytes: decimalMbToKib(12),
    note: 'One ceiling for every upload; PDF, JPG and JPEG, plus TIF/TIFF on some forms.',
    sourceUrl: 'https://www.uscis.gov/file-online/tips-for-filing-forms-online',
    checkedOn: '2026-09-17',
  },
  {
    id: 'gmail-attachment',
    portal: 'Gmail',
    field: 'Total attachment size on a personal account',
    limitBytes: decimalMbToKib(25),
    note: 'Personal accounts. A Workspace administrator sets their own limit for work and school accounts.',
    sourceUrl: 'https://support.google.com/mail/answer/6584',
    checkedOn: '2026-09-17',
  },
];

export const PRESET_MAX_AGE_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between `checkedOn` and `now`. */
export function presetAgeInDays(preset: PortalPreset, now: Date) {
  const checked = Date.parse(`${preset.checkedOn}T00:00:00Z`);
  if (Number.isNaN(checked)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor((now.getTime() - checked) / MS_PER_DAY);
}

/**
 * Presets whose number is older than `PRESET_MAX_AGE_DAYS` and has to be
 * re-read from its source or removed. A test fails the build when this is not
 * empty, per owner decision 16.
 */
export function presetsOverdue(now: Date) {
  return PORTAL_PRESETS.filter(
    (preset) => presetAgeInDays(preset, now) > PRESET_MAX_AGE_DAYS,
  );
}

export function findPreset(id: string) {
  return PORTAL_PRESETS.find((preset) => preset.id === id) ?? null;
}

/**
 * Target in whole KiB, which is the unit portals state their limits in and the
 * unit the custom box accepts.
 */
export function kibToBytes(kib: number) {
  return Math.floor(kib) * KIB;
}

export function bytesToKib(bytes: number) {
  return Math.floor(bytes / KIB);
}

export const MIN_TARGET_BYTES = 10 * KIB;
export const MAX_TARGET_BYTES = 150 * MIB;

/** Null when the target is usable; otherwise the reason it is not. */
export function validateTarget(targetBytes: number): string | null {
  if (!Number.isFinite(targetBytes) || targetBytes <= 0) {
    return 'Enter a target size in KB.';
  }
  if (targetBytes < MIN_TARGET_BYTES) {
    return `The smallest target this tool accepts is ${bytesToKib(MIN_TARGET_BYTES)} KB.`;
  }
  if (targetBytes > MAX_TARGET_BYTES) {
    return `The largest target this tool accepts is ${bytesToKib(MAX_TARGET_BYTES)} KB.`;
  }
  return null;
}
