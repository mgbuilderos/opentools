/**
 * Guides that keep their full page when guide consolidation is enabled
 * (lib/seo/guide-consolidation-config.ts). Every other live guide redirects to
 * its tool page.
 *
 * Enable only after the owner supplies Search Console data (DECISION_LOG §11).
 *
 * `traffic` entries are rewritten by `npm run seo:guide-keep-list`; `distinct`
 * entries are hand-picked by the owner and preserved by that script. Review the
 * diff before committing. See docs/seo/guide-consolidation.md.
 *
 * Last generated from: nothing yet; the owner has not supplied Search Console data
 */

export type GuideKeepReason = 'traffic' | 'distinct';

export interface GuideKeepEntry {
  /** Guide slug, as in /guides/<slug>. */
  slug: string;
  reason: GuideKeepReason;
  /** Numbers from the export (traffic) or the owner's note (distinct). */
  evidence: string;
}

export const GUIDE_KEEP_LIST: readonly GuideKeepEntry[] = [];
