/**
 * The companies this site's user-facing copy may not name.
 *
 * ## Why the rule exists
 *
 * `lib/seo/compare-pages.test.ts` states it: a comparison page may be drawn
 * against an *architecture*, never against a named company we have no verified
 * source for. Naming a rival converts an argument we can prove — the file never
 * leaves the tab, and `e2e/egress-proof.spec.ts` measures it — into a claim
 * about someone else's product that we cannot keep current and did not measure.
 *
 * Their prices change without telling us. Their free tiers change. A page that
 * says a rival charges $X is wrong the day they discount, and the reader who
 * checks finds us inaccurate about the one thing we asked them to trust us on.
 *
 * ## Why this list grew on 2026-09-25
 *
 * It held nine names, all PDF and image tools, because those were the only
 * categories the site competed in. `UNIVERSE_MAP.md` (2026-09-25) extended the
 * roadmap into audio, video, transcription, translation, spreadsheets, email,
 * archives and developer tooling, and named the incumbent in each — Otter,
 * Kapwing, Topaz, LALAL.AI, Rev, Grammarly and the rest — with their published
 * prices, so the build order could be argued from evidence.
 *
 * **Those prices are for choosing what to build. They are not page copy.**
 * A brief that reads "replaces Otter.ai at $16.99/month" is describing why a
 * tool is worth building, not what its page may say. The list below closes that
 * gap before twenty-six new pages are written against those briefs.
 *
 * ## How to extend it
 *
 * Add a name when the roadmap starts competing with that company, not when
 * someone mentions it. Each pattern must be unable to match ordinary English or
 * a file-format term: `Rev.com`, not `Rev`; `remove.bg`, not `remove`. Format
 * and standard names are deliberately absent — a page must be free to say Word,
 * Excel, PowerPoint, PDF, DICOM or SQLite, because those name the file, not a
 * company.
 *
 * Nothing here is a claim that these companies do anything wrong. Several
 * describe their own architecture accurately and publicly. The rule is about
 * what *we* can substantiate, not about them.
 */

export interface ForbiddenCompetitor {
  /**
   * Matched against source text, case-insensitive, word-bounded.
   *
   * `i` and not `iu`, which matters more than it looks. Every pattern here is
   * ASCII, so the `u` flag adds nothing but V8's Unicode case-folding path --
   * and that path is **17x slower**: `/\bAdobe\b/iu` takes 2,106ms over the
   * built site where `/\bAdobe\b/i` takes 121ms. Across 64 names that is the
   * difference between a two-second sweep and a 126-second one.
   *
   * `served-copy-policy.test.ts` allows the sweep 120 seconds. It was taking
   * 126, so it had already crossed, and it did not degrade gracefully on the way
   * -- the suite passed until the day it timed out. The comment in that file
   * still records the 2.4s it cost when this list held nine names; it holds
   * sixty-four now, and nobody re-measured.
   *
   * What `u` changed behaviourally was that an exotic look-alike -- U+212A
   * KELVIN SIGN for `k`, U+0130 for `i` -- would fold to its ASCII letter. This
   * guard exists to catch our own writers naming a company by accident, not to
   * defeat an adversary spelling one in homoglyphs, and nothing on this site
   * emits those codepoints. `competitor-names.test.ts` pins that every name
   * still matches its own spelling in any case.
   */
  readonly pattern: RegExp;
  /** Why this name is on the list — the category we compete with them in. */
  readonly reason: string;
}

export const FORBIDDEN_COMPETITORS: readonly ForbiddenCompetitor[] = [
  // The original nine: PDF and image, guarded since the comparison pages shipped.
  { pattern: /\bAdobe\b/i, reason: 'PDF, image, audio and video' },
  { pattern: /\bAcrobat\b/i, reason: 'PDF editing, OCR, conversion' },
  { pattern: /\biLovePDF\b/i, reason: 'PDF task suite' },
  { pattern: /\bSmallpdf\b/i, reason: 'PDF task suite' },
  { pattern: /\biLoveIMG\b/i, reason: 'image task suite' },
  { pattern: /\bCanva\b/i, reason: 'image and design' },
  { pattern: /\bSejda\b/i, reason: 'PDF task suite' },
  { pattern: /\bPDF24\b/i, reason: 'PDF task suite' },
  { pattern: /\bTinyPNG\b/i, reason: 'image compression' },

  // Added 2026-09-25 with the universe map, category by category.
  { pattern: /\bPhotoshop\b/i, reason: 'image editing' },
  { pattern: /\bLightroom\b/i, reason: 'image editing, RAW' },
  { pattern: /\bPDFfiller\b/i, reason: 'PDF forms' },
  { pattern: /\bPDFelement\b/i, reason: 'PDF editing' },
  { pattern: /\bWondershare\b/i, reason: 'PDF, video' },
  { pattern: /\bNitro\s?PDF\b/i, reason: 'PDF editing' },
  { pattern: /\bFoxit\b/i, reason: 'PDF editing' },
  { pattern: /\bABBYY\b/i, reason: 'OCR, PDF' },
  { pattern: /\bFineReader\b/i, reason: 'OCR and scanned PDF' },
  { pattern: /\bDocuSign\b/i, reason: 'e-signature' },
  { pattern: /\bConvertio\b/i, reason: 'format conversion' },
  { pattern: /\bCloudConvert\b/i, reason: 'format conversion' },
  { pattern: /\bZamzar\b/i, reason: 'format conversion' },
  { pattern: /\bFreeConvert\b/i, reason: 'format conversion' },
  { pattern: /\bremove\.bg\b/i, reason: 'background removal' },
  { pattern: /\bPicflow\b/i, reason: 'HEIC conversion' },
  { pattern: /\bTopaz\b/i, reason: 'image and video upscaling' },
  { pattern: /\bGigapixel\b/i, reason: 'image upscaling' },
  { pattern: /\bKapwing\b/i, reason: 'video editing, captions' },
  { pattern: /\bVEED\b/u, reason: 'video editing, captions' },
  { pattern: /\bDescript\b/i, reason: 'audio and video editing' },
  { pattern: /\bOtter\b/i, reason: 'transcription' },
  { pattern: /\bRev\.com\b/i, reason: 'transcription, captions' },
  { pattern: /\bLALAL\b/i, reason: 'audio stem separation' },
  { pattern: /\bAuphonic\b/i, reason: 'audio loudness and denoise' },
  { pattern: /\bGrammarly\b/i, reason: 'writing and spelling' },
  { pattern: /\bDeepL\b/i, reason: 'translation' },
  { pattern: /\bNanonets\b/i, reason: 'document data extraction' },
  { pattern: /\bDocparser\b/i, reason: 'document data extraction' },
  { pattern: /\bPostman\b/i, reason: 'developer tooling' },

  /*
   * The professional tools four live pages named, with prices, until
   * 2026-09-25. None of those prices had a source anywhere in this repository.
   * They are listed here so the same copy cannot come back.
   */
  { pattern: /\bEnfocus\b/i, reason: 'PDF print preflight' },
  { pattern: /\bPitStop\b/i, reason: 'PDF print preflight' },
  { pattern: /\bFlightCheck\b/i, reason: 'PDF print preflight' },
  { pattern: /\bBluebeam\b/i, reason: 'drawing sets, title blocks' },
  { pattern: /\bEverMap\b/i, reason: 'PDF splitting' },
  { pattern: /\bAutoSplit\b/i, reason: 'PDF splitting' },
  { pattern: /\bPDF-?eXPLODE\b/i, reason: 'PDF splitting' },
  { pattern: /\bNUGEN\b/i, reason: 'audio loudness metering' },
  { pattern: /\bVisLM\b/i, reason: 'audio loudness metering' },

  /*
   * Owner instruction, 2026-09-25: "we dont want to name any other brand."
   *
   * The names below were never a competitive claim — they were compatibility
   * lists, of the form "the output opens cleanly in X, Y and Z". That is a
   * friendlier kind of mention and it was genuinely useful to a reader, which
   * is exactly why the rule has to be a rule: once naming is allowed for a good
   * reason, the boundary is someone's judgement on a deadline.
   *
   * The replacement copy says what the output *is* — standard SVG, a vector PDF
   * with a text layer — which is more durable than a list of products that
   * rename and get acquired.
   */
  { pattern: /\bIllustrator\b/i, reason: 'vector editing' },
  { pattern: /\bCorelDRAW\b/i, reason: 'vector editing' },
  { pattern: /\bInkscape\b/i, reason: 'vector editing' },
  { pattern: /\bFigma\b/i, reason: 'interface design' },
  { pattern: /\bPremiere\s?Pro\b/i, reason: 'video editing' },
  { pattern: /\bFinal\s?Cut\b/i, reason: 'video editing' },
  { pattern: /\bDaVinci\s?Resolve\b/i, reason: 'video editing' },
  { pattern: /\bAutodesk\b/i, reason: 'CAD and BIM' },
  { pattern: /\bAutoCAD\b/i, reason: 'CAD drafting' },
  { pattern: /\bRevit\b/i, reason: 'BIM authoring' },
  { pattern: /\bArchiCAD\b/i, reason: 'BIM authoring' },
  { pattern: /\bGraphisoft\b/i, reason: 'BIM authoring' },
  { pattern: /\bVectorworks\b/i, reason: 'CAD drafting' },
  { pattern: /\bNemetschek\b/i, reason: 'CAD drafting' },
  { pattern: /\bMicroStation\b/i, reason: 'CAD drafting' },
  { pattern: /\bProcore\b/i, reason: 'construction document management' },
];

/**
 * Attributing a price to somebody else, in any wording.
 *
 * The name list above will always lag: it can only forbid a company someone
 * already thought of. This forbids the *sentence shape* instead, which is what
 * actually went wrong — on 2026-09-25 four live tool pages read "X charges
 * $N/mo … this runs in your browser", naming eight companies and eight prices,
 * and the nine-name list of the day matched none of them.
 *
 * A price we did not measure cannot be kept true. Their pricing changes without
 * telling us, and the reader who checks one number and finds it stale has been
 * given a reason to doubt the only claim that matters here, which is the one
 * about where their file goes.
 *
 * Our own prices are deliberately not caught: `/support` says "$5 / month" with
 * no attribution, because it is ours to state.
 */
const UNSOURCED_PRICE_CLAIM =
  /\b(charges|costs|bills you|is priced at|priced from|subscription of)\s+(?:about\s+|around\s+|roughly\s+|from\s+)?[$€£₹]\s?\d/giu;

/** Returns one message per price attributed to another party in `source`. */
export function findUnsourcedPriceClaims(
  source: string,
  label: string,
): string[] {
  return [...source.matchAll(UNSOURCED_PRICE_CLAIM)].map(
    (match) =>
      `${label} attributes a price we never measured: ${JSON.stringify(match[0].trim())}`,
  );
}

/**
 * Returns one message per forbidden name found in `source`.
 *
 * `label` identifies the file or route to the reader of a failing test; the
 * message names the pattern rather than quoting the surrounding copy, so a
 * failure never reprints a page's text into CI output.
 */
export function findForbiddenCompetitors(
  source: string,
  label: string,
): string[] {
  // The fast path, and why it exists: see ANY_COMPETITOR below.
  if (!ANY_COMPETITOR.some((union) => union.test(source))) return [];

  return FORBIDDEN_COMPETITORS.filter(({ pattern }) =>
    pattern.test(source),
  ).map(
    ({ pattern, reason }) =>
      `${label} names a competitor matching ${pattern.source} (${reason})`,
  );
}

/**
 * The whole list as one alternation per flag set, used only to decide whether
 * the per-pattern scan needs to run at all.
 *
 * ## Why
 *
 * `served-copy-policy.test.ts` runs this over every built page — 143 MB of
 * markup across ~1,480 files. One `RegExp.test` per name meant 65 full passes
 * over all of it, and the cost had quietly gone from the 2.4s that file's
 * comment records to **126s**, six seconds under its own 120s timeout, because
 * the comment was measured when this list held nine names and it now holds
 * sixty-five. It did not fail gradually; it passed until it did not.
 *
 * Almost every page matches nothing, so the answer to "does this page name
 * anybody" is one pass instead of sixty-five, and the per-pattern scan runs
 * only on the rare page that already failed. Same patterns, same messages,
 * same result — `competitor-names.test.ts` asserts the two paths agree.
 *
 * ## Two unions, not one
 *
 * `VEED` is deliberately case-sensitive while every other entry is not, and
 * folding it into a case-insensitive union would make it match "veed" in
 * ordinary English. The patterns are grouped by flag so the union is exactly
 * the union of what it replaces.
 *
 * Derived from `FORBIDDEN_COMPETITORS` rather than written out, so a name
 * added to the list is in the fast path by construction and cannot be missed
 * by it.
 */
const ANY_COMPETITOR: readonly RegExp[] = (() => {
  const byFlags = new Map<string, string[]>();
  for (const { pattern } of FORBIDDEN_COMPETITORS) {
    const flags = pattern.flags.replace(/[gy]/gu, '');
    const group = byFlags.get(flags);
    if (group) group.push(pattern.source);
    else byFlags.set(flags, [pattern.source]);
  }
  return [...byFlags].map(
    ([flags, sources]) => new RegExp(sources.join('|'), flags),
  );
})();
