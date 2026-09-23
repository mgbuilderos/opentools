/**
 * Guides that keep their full page while guide consolidation is enabled
 * (lib/seo/guide-consolidation-config.ts). Every other live guide redirects to
 * its tool page with a 301 and leaves the sitemap.
 *
 * `traffic` entries are rewritten by `npm run seo:guide-keep-list`; `distinct`
 * entries are hand-picked and preserved by that script. Review the diff before
 * committing. See docs/seo/guide-consolidation.md.
 *
 * WHY EVERY ENTRY IS `distinct` TODAY. Search Console had no rows when the
 * owner checked on 2026-09-17, so there is no traffic to select on. These were
 * chosen on the evidence `npm run seo:guide-distinctness` measures — a tool's
 * own route, a blog article about that exact tool URL, a template linking to
 * it, an end-to-end spec, a local model — and confirmed by the owner on
 * 2026-09-21. Re-run the generator when an export exists; it keeps these and
 * fills the remaining slots from traffic.
 *
 * WHY SEVEN PDF AND IMAGE GUIDES LEFT THE LIST ON 2026-09-23. The reason all
 * fifteen were kept was distinctness: the guide said something about the tool
 * that the tool page did not. For `pdf-merge-pdf`, `pdf-compress-pdf`,
 * `pdf-pdf-to-word`, `pdf-pdf-to-excel`, `pdf-pdf-bates-numbering`,
 * `image-background-remover` and `image-resize-image-to-exact-kb` that stopped
 * being true in the same commit that removed them: their whole substance —
 * the steps, the limits, the refusals, the questions people ask — now renders
 * on the tool page itself, from `lib/seo/tool-page-depth.ts`.
 *
 * With the text on both, the two URLs compete for one query and the one that
 * wins may be the page that cannot do the job. Measured on 2026-09-23,
 * `/pdf/merge` carried 281 words and the title `Merge PDF`, while
 * `/guides/pdf-merge-pdf` carried 1,348 and `Merge PDF — free, in your
 * browser, no upload`. The tool page is the one that should rank, so the guide
 * now 301s to it through the ordinary consolidation path and leaves the
 * sitemap with the other 550-odd. This extends the owner's decision (§11) on
 * its own terms rather than reversing it: a guide is kept while it has
 * something distinct to say, and these no longer do.
 *
 * Last generated from: hand-picked from the distinctness report, owner
 * decision 2026-09-21; seven entries retired 2026-09-23 when their content
 * moved onto their tool pages; no Search Console export exists yet
 */

export type GuideKeepReason = 'traffic' | 'distinct';

export interface GuideKeepEntry {
  /** Guide slug, as in /guides/<slug>. */
  slug: string;
  reason: GuideKeepReason;
  /** Numbers from the export (traffic) or the owner's note (distinct). */
  evidence: string;
}

export const GUIDE_KEEP_LIST: readonly GuideKeepEntry[] = [
  {
    // "Lossless MP3 cutting" is a claim that needs a page to justify it.
    slug: 'audio-mp3-cutter',
    reason: 'distinct',
    evidence:
      'distinctness 9: own page /audio/mp3-toolkit, blog what-lossless-mp3-cutting-actually-means, template podcast-episode-release-and-show-notes-pack, e2e, P0. Chosen over the joiner and tag editor, which share this URL.',
  },
  {
    // Two articles and a template already cover the CSV-to-JSON workflow.
    slug: 'spreadsheet-and-data-csv-to-json',
    reason: 'distinct',
    evidence:
      'distinctness 9: own page /data/csv-to-json, blog clean-csv-transform-to-json-browser and digital-marketer-data-and-asset-workflow, template digital-marketing-campaign-launch-checklist, e2e',
  },
  {
    slug: 'developer-and-data-base64-encoder',
    reason: 'distinct',
    evidence:
      'distinctness 7: own page /developer/base64-encoder, blog safe-base64-encode-decode-developer-guide, P0',
  },
  {
    slug: 'developer-and-data-unix-timestamp-converter',
    reason: 'distinct',
    evidence:
      'distinctness 7: own page /developer/unix-timestamp, blog convert-unix-epoch-timestamp-utc-local, P0',
  },
  {
    slug: 'developer-and-data-uuid-generator',
    reason: 'distinct',
    evidence:
      'distinctness 7: own page /developer/uuid-generator, blog cryptographically-secure-uuidv4-generation, P0',
  },
  {
    // The resampling trap is the whole reason this conversion needs prose.
    slug: 'audio-audio-to-wav',
    reason: 'distinct',
    evidence:
      'distinctness 6: own page /audio/convert, blog audio-to-wav-conversion-silent-resampling-trap, e2e. Chosen over the m4a and flac guides, which share this URL.',
  },
  {
    slug: 'math-and-units-percentage-calculator',
    reason: 'distinct',
    evidence:
      'distinctness 6: own page /math/percentage-calculator, template saas-unit-economics-metrics-tracker, P0',
  },
  {
    slug: 'date-time-and-productivity-date-difference-calculator',
    reason: 'distinct',
    evidence:
      'distinctness 6: own page /date/date-difference, template freelance-time-tracking-invoicing-model, P0',
  },
];
