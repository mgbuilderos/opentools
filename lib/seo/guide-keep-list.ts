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
 * owner checked on 2026-09-17, so there is no traffic to select on. These 15
 * were chosen on the evidence `npm run seo:guide-distinctness` measures — a
 * tool's own route, a blog article about that exact tool URL, a template
 * linking to it, an end-to-end spec, a local model — and confirmed by the
 * owner on 2026-09-21. Re-run the generator when an export exists; it keeps
 * these and fills the remaining slots from traffic.
 *
 * Last generated from: hand-picked from the distinctness report, owner
 * decision 2026-09-21; no Search Console export exists yet
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
    // Highest-scoring guide on the site: its own page, two blog articles and a
    // template all say something about merging PDFs that the tool page cannot.
    slug: 'pdf-merge-pdf',
    reason: 'distinct',
    evidence:
      'distinctness 11: own page /pdf/merge, blog how-to-merge-pdf-contracts-privately and legal-document-workflow-in-browser-privacy, template court-exhibit-binder-assembly-checklist, e2e, P0',
  },
  {
    // The only tool that loads a local model, so its privacy section is the
    // one page on the site where `connect-src 'self'` has to be explained.
    slug: 'image-background-remover',
    reason: 'distinct',
    evidence:
      'distinctness 10: own page /image/background-remover, blog local-ai-image-background-removal-wasm, local model (the CSP exception), e2e, P0',
  },
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
    slug: 'pdf-compress-pdf',
    reason: 'distinct',
    evidence: 'distinctness 6: own page /pdf/compress, e2e, P0',
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
  {
    // An exact KB ceiling at exact pixels and DPI is a promise no other tool
    // on the site makes, and it needs the limits stated alongside it.
    slug: 'image-resize-image-to-exact-kb',
    reason: 'distinct',
    evidence: 'distinctness 5: own page /image/exact-size, e2e',
  },
  {
    slug: 'pdf-pdf-to-word',
    reason: 'distinct',
    evidence: 'distinctness 5: own page /pdf/to-word, e2e',
  },
  {
    slug: 'pdf-pdf-to-excel',
    reason: 'distinct',
    evidence: 'distinctness 5: own page /pdf/to-excel, e2e',
  },
  {
    // The fifteenth pick. Same score as the two other unclaimed 5s
    // (documents-and-office-docx-metadata, web-and-seo-file-to-html) and the
    // same evidence shape, so the tie was broken on search intent: "Bates
    // numbering" is a named legal term with its own conventions -- prefix,
    // start number, page range, exhibit order -- which is material a guide can
    // carry and a tool page cannot. The other two describe generic operations
    // their own page already names.
    slug: 'pdf-pdf-bates-numbering',
    reason: 'distinct',
    evidence: 'distinctness 5: own page /pdf/bates, e2e',
  },
];
