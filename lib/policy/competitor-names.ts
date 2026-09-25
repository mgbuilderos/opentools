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
  /** Matched against source text, case-insensitive, word-bounded. */
  readonly pattern: RegExp;
  /** Why this name is on the list — the category we compete with them in. */
  readonly reason: string;
}

export const FORBIDDEN_COMPETITORS: readonly ForbiddenCompetitor[] = [
  // The original nine: PDF and image, guarded since the comparison pages shipped.
  { pattern: /\bAdobe\b/iu, reason: 'PDF, image, audio and video' },
  { pattern: /\bAcrobat\b/iu, reason: 'PDF editing, OCR, conversion' },
  { pattern: /\biLovePDF\b/iu, reason: 'PDF task suite' },
  { pattern: /\bSmallpdf\b/iu, reason: 'PDF task suite' },
  { pattern: /\biLoveIMG\b/iu, reason: 'image task suite' },
  { pattern: /\bCanva\b/iu, reason: 'image and design' },
  { pattern: /\bSejda\b/iu, reason: 'PDF task suite' },
  { pattern: /\bPDF24\b/iu, reason: 'PDF task suite' },
  { pattern: /\bTinyPNG\b/iu, reason: 'image compression' },

  // Added 2026-09-25 with the universe map, category by category.
  { pattern: /\bPhotoshop\b/iu, reason: 'image editing' },
  { pattern: /\bLightroom\b/iu, reason: 'image editing, RAW' },
  { pattern: /\bPDFfiller\b/iu, reason: 'PDF forms' },
  { pattern: /\bPDFelement\b/iu, reason: 'PDF editing' },
  { pattern: /\bWondershare\b/iu, reason: 'PDF, video' },
  { pattern: /\bNitro\s?PDF\b/iu, reason: 'PDF editing' },
  { pattern: /\bFoxit\b/iu, reason: 'PDF editing' },
  { pattern: /\bABBYY\b/iu, reason: 'OCR, PDF' },
  { pattern: /\bFineReader\b/iu, reason: 'OCR and scanned PDF' },
  { pattern: /\bDocuSign\b/iu, reason: 'e-signature' },
  { pattern: /\bConvertio\b/iu, reason: 'format conversion' },
  { pattern: /\bCloudConvert\b/iu, reason: 'format conversion' },
  { pattern: /\bZamzar\b/iu, reason: 'format conversion' },
  { pattern: /\bFreeConvert\b/iu, reason: 'format conversion' },
  { pattern: /\bremove\.bg\b/iu, reason: 'background removal' },
  { pattern: /\bPicflow\b/iu, reason: 'HEIC conversion' },
  { pattern: /\bTopaz\b/iu, reason: 'image and video upscaling' },
  { pattern: /\bGigapixel\b/iu, reason: 'image upscaling' },
  { pattern: /\bKapwing\b/iu, reason: 'video editing, captions' },
  { pattern: /\bVEED\b/u, reason: 'video editing, captions' },
  { pattern: /\bDescript\b/iu, reason: 'audio and video editing' },
  { pattern: /\bOtter\b/iu, reason: 'transcription' },
  { pattern: /\bRev\.com\b/iu, reason: 'transcription, captions' },
  { pattern: /\bLALAL\b/iu, reason: 'audio stem separation' },
  { pattern: /\bAuphonic\b/iu, reason: 'audio loudness and denoise' },
  { pattern: /\bGrammarly\b/iu, reason: 'writing and spelling' },
  { pattern: /\bDeepL\b/iu, reason: 'translation' },
  { pattern: /\bNanonets\b/iu, reason: 'document data extraction' },
  { pattern: /\bDocparser\b/iu, reason: 'document data extraction' },
  { pattern: /\bPostman\b/iu, reason: 'developer tooling' },

  /*
   * The professional tools four live pages named, with prices, until
   * 2026-09-25. None of those prices had a source anywhere in this repository.
   * They are listed here so the same copy cannot come back.
   */
  { pattern: /\bEnfocus\b/iu, reason: 'PDF print preflight' },
  { pattern: /\bPitStop\b/iu, reason: 'PDF print preflight' },
  { pattern: /\bFlightCheck\b/iu, reason: 'PDF print preflight' },
  { pattern: /\bBluebeam\b/iu, reason: 'drawing sets, title blocks' },
  { pattern: /\bEverMap\b/iu, reason: 'PDF splitting' },
  { pattern: /\bAutoSplit\b/iu, reason: 'PDF splitting' },
  { pattern: /\bPDF-?eXPLODE\b/iu, reason: 'PDF splitting' },
  { pattern: /\bNUGEN\b/iu, reason: 'audio loudness metering' },
  { pattern: /\bVisLM\b/iu, reason: 'audio loudness metering' },

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
  { pattern: /\bIllustrator\b/iu, reason: 'vector editing' },
  { pattern: /\bCorelDRAW\b/iu, reason: 'vector editing' },
  { pattern: /\bInkscape\b/iu, reason: 'vector editing' },
  { pattern: /\bFigma\b/iu, reason: 'interface design' },
  { pattern: /\bPremiere\s?Pro\b/iu, reason: 'video editing' },
  { pattern: /\bFinal\s?Cut\b/iu, reason: 'video editing' },
  { pattern: /\bDaVinci\s?Resolve\b/iu, reason: 'video editing' },
  { pattern: /\bAutodesk\b/iu, reason: 'CAD and BIM' },
  { pattern: /\bAutoCAD\b/iu, reason: 'CAD drafting' },
  { pattern: /\bRevit\b/iu, reason: 'BIM authoring' },
  { pattern: /\bArchiCAD\b/iu, reason: 'BIM authoring' },
  { pattern: /\bGraphisoft\b/iu, reason: 'BIM authoring' },
  { pattern: /\bVectorworks\b/iu, reason: 'CAD drafting' },
  { pattern: /\bNemetschek\b/iu, reason: 'CAD drafting' },
  { pattern: /\bMicroStation\b/iu, reason: 'CAD drafting' },
  { pattern: /\bProcore\b/iu, reason: 'construction document management' },
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
  return FORBIDDEN_COMPETITORS.filter(({ pattern }) =>
    pattern.test(source),
  ).map(
    ({ pattern, reason }) =>
      `${label} names a competitor matching ${pattern.source} (${reason})`,
  );
}
