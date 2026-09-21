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
 * **Why this table is not under `lib/tools/`.** `lib/tools/local-source-policy.test.ts`
 * forbids any `http(s)://` literal in `lib/tools`, `workers`, `components`,
 * `app` and `proxy.ts`, so that no tool code can hold a network target. A
 * `sourceUrl` here is a citation for a person to click, not something this
 * code ever opens, and keeping it out of the engine path lets both rules hold
 * at once. `portal-presets.test.ts` asserts this module reaches the network no
 * more than the engine does.
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
  /*
   * The three Indian filing ceilings below are the ones a practice is bounced
   * by, and they are per-file rather than per-submission: getting one document
   * under the number here does not answer the separate caps each portal puts
   * on how many documents you may attach, which is why those caps are stated
   * in `note` rather than left for the rejection screen to teach.
   */
  {
    id: 'income-tax-e-proceedings-attachment',
    portal: 'Income Tax e-filing',
    field: 'Each attachment on a response to a notice (e-Proceedings)',
    limitBytes: decimalMbToKib(5),
    note: 'Per attachment. The same page caps a response at 10 attachments and 50 MB across all of them, so a bundle can pass this ceiling and still be refused.',
    sourceUrl:
      'https://www.incometax.gov.in/iec/foportal/help/respond-to-e-proceedings-faq',
    checkedOn: '2026-09-21',
  },
  {
    id: 'gst-appeal-supporting-document',
    portal: 'GST appeal',
    field: 'Each supporting document on an appeal application',
    limitBytes: decimalMbToKib(5),
    note: 'Per document, PDF or JPEG only, and at most 4 supporting documents on the application.',
    sourceUrl: 'https://tutorial.gst.gov.in/userguide/appeal/appeal_manual.htm',
    checkedOn: '2026-09-21',
  },
  {
    id: 'gst-registration-document',
    portal: 'GST registration',
    field: 'Each proof document on a new registration application',
    limitBytes: decimalMbToKib(1),
    note: 'Per document, PDF or JPEG only. The same form takes the authorised signatory photograph at 100 KB and e-KYC documents at 2 MB, so check which field you are filling.',
    sourceUrl:
      'https://tutorial.gst.gov.in/userguide/registration/Apply_for_Registration_Normal_Taxpayer.htm',
    checkedOn: '2026-09-21',
  },
];

export const PRESET_MAX_AGE_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function findPreset(id: string) {
  return PORTAL_PRESETS.find((preset) => preset.id === id) ?? null;
}

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
