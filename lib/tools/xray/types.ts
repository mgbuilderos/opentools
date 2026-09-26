/**
 * The shape of one thing a file quietly says about the person who made it.
 *
 * **Why a new model over four working parsers.** This repo already reads
 * metadata out of images (`lib/tools/metadata`), PDFs (`lib/tools/pdf/metadata`),
 * Word files (`lib/tools/docx/metadata`) and MP4s (`lib/tools/video/metadata`).
 * Each returns a different shape, and each is right for its own tool page. None
 * of them can answer the question this tool is for: *drop any file, what is in
 * it that you did not mean to send?* Answering that needs one shape, because the
 * ranking is the product.
 *
 * **The ranking is the product.** A page that lists `GPS latitude` next to
 * `Bit depth: 8` has told the reader nothing, because it has not said which of
 * the two matters. The four parsers return fields; a person wants consequences.
 * So every finding here carries two things the underlying parsers do not:
 *
 * - a `category`, which decides where it appears, and
 * - a `consequence`, one sentence of plain English saying what somebody learns
 *   from it.
 *
 * `consequence` is deliberately not optional. A finding nobody can act on is
 * noise, and making the field required is what stops a future adapter from
 * adding a row that shows a hex value and explains nothing.
 *
 * **What this model does not claim.** A coordinate is a coordinate. Turning one
 * into "the street it was taken on" needs a reverse-geocoding service, which is
 * a network request, which this project does not make from tool code -- see
 * rule 1 in `CONTRIBUTING.md`, the production CSP's `connect-src 'none'`, and
 * `lib/tools/local-source-policy.test.ts`, which fails on a literal URL scheme
 * appearing anywhere under `lib/tools` -- including in this comment, which is why
 * it is described rather than quoted. So a location finding reports the coordinates,
 * how precise they are, and offers a link the *reader* may choose to open. It
 * does not resolve an address, and no copy here implies that it has.
 */

/**
 * Where a finding belongs in the report, in the order a reader cares about it.
 *
 * The order of this union is the order of the report, and
 * `CATEGORY_RANK` below is derived from it so the two cannot drift apart.
 */
export type XrayCategory =
  /** Coordinates: where the person was standing. */
  | 'location'
  /** A name: who they are, who they work for. */
  | 'identity'
  /** Text still in the file that the document does not show. */
  | 'hidden-content'
  /** Which machine made it, and which other files that machine made. */
  | 'device'
  /** When it was really written, and for how long. */
  | 'timeline'
  /** True, harmless, and last: dimensions, page counts, exposure. */
  | 'technical';

/**
 * The order categories appear in, derived from the union above.
 *
 * Location first is not a style choice. Of everything these parsers can find,
 * a coordinate pair is the only one that points at a physical place a person
 * can be visited at, so it leads the report whatever else the file contains.
 */
export const CATEGORY_ORDER: readonly XrayCategory[] = [
  'location',
  'identity',
  'hidden-content',
  'device',
  'timeline',
  'technical',
];

/** Rank for sorting; lower sorts first. */
export const CATEGORY_RANK: Readonly<Record<XrayCategory, number>> =
  Object.fromEntries(
    CATEGORY_ORDER.map((category, index) => [category, index]),
  ) as Record<XrayCategory, number>;

/**
 * How much of a problem this particular finding is.
 *
 * Set by the adapter rather than derived from `category`, because category
 * alone does not decide it: under `device`, a camera's serial number ties every
 * photo you have ever published to one body you own, and the string
 * `Microsoft Word` ties you to nothing. Both are `device`; only one is `high`.
 */
export type XraySeverity = 'high' | 'medium' | 'low';

export const SEVERITY_RANK: Readonly<Record<XraySeverity, number>> = {
  high: 0,
  medium: 1,
  low: 2,
};

export interface XrayFinding {
  /** Stable across runs on the same file: a React key and a test anchor. */
  id: string;
  category: XrayCategory;
  severity: XraySeverity;
  /** What it is, short enough for a table cell: "GPS location". */
  label: string;
  /** What the file actually says, as read. Never a summary. */
  value: string;
  /**
   * One sentence on what a recipient learns from it.
   *
   * Required on purpose; see the module comment. Written in the second person
   * and in the present tense, because the reader is the person exposed.
   */
  consequence: string;
  /** The part of the file it came from, for the "where was this" question. */
  source: string;
  /**
   * A map link for a location finding, built by the parser that read the
   * coordinates. Opened only if the reader clicks it; nothing is requested to
   * render the report.
   */
  mapUrl?: string;
}

/** Containers this tool can open. `unsupported` is a real answer, not a failure. */
export type XrayFormat =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'mp4'
  | 'zip'
  | 'unsupported';

export interface XrayReport {
  format: XrayFormat;
  /** How to name the format to a person: "JPEG photo", not "jpeg". */
  formatLabel: string;
  fileName?: string;
  fileSizeBytes: number;
  /** Ranked by category then severity; see `rankFindings`. */
  findings: readonly XrayFinding[];
  /** True when at least one finding is not merely `technical`. */
  hasSensitiveFindings: boolean;
  /**
   * Whether a one-click strip exists for this container.
   *
   * False is honest rather than hidden: a reader who learns their spreadsheet
   * names their employer deserves to be told this tool cannot yet remove it,
   * instead of being shown a button that quietly does nothing.
   */
  canStrip: boolean;
  /** Anything that went wrong while reading, in a person's words. */
  warnings: readonly string[];
}

/**
 * Sorts findings into the order the report shows them.
 *
 * Category first, then severity, then the order the adapter emitted them --
 * which keeps runs on the same bytes identical, so a screenshot taken twice
 * looks the same and a test can assert on position.
 */
export function rankFindings(
  findings: readonly XrayFinding[],
): readonly XrayFinding[] {
  return findings
    .map((finding, index) => ({ finding, index }))
    .sort(
      (a, b) =>
        CATEGORY_RANK[a.finding.category] - CATEGORY_RANK[b.finding.category] ||
        SEVERITY_RANK[a.finding.severity] - SEVERITY_RANK[b.finding.severity] ||
        a.index - b.index,
    )
    .map((entry) => entry.finding);
}

/** How to name each container to a person. */
export const FORMAT_LABELS: Readonly<Record<XrayFormat, string>> = {
  jpeg: 'JPEG photo',
  png: 'PNG image',
  webp: 'WebP image',
  pdf: 'PDF document',
  docx: 'Word document',
  xlsx: 'Excel spreadsheet',
  pptx: 'PowerPoint presentation',
  mp4: 'MP4 video',
  zip: 'ZIP archive',
  unsupported: 'Unrecognised file',
};
