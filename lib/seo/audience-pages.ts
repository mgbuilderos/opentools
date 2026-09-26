/**
 * Pages addressed to a person's job rather than to a file format.
 *
 * WHY THESE EXIST. Every page on this site is named after an operation —
 * "merge PDF", "compress image" — because that is what the code does. It is
 * not what anybody searches. A paralegal does not look for "redact pdf", they
 * look for how to black out a name on an exhibit before it goes to the other
 * side. A registrar does not want "image to text", they want a patient's name
 * off a scan. The operation is the answer; the job is the question, and until
 * now the site only published answers.
 *
 * WHY THIS IS AN OWNER DECISION AND NOT A DRIFT. Constraint C4 of
 * `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` bars a new family of
 * near-template pages while guide consolidation runs, and business rule 22
 * bars doorway pages. Both were raised with the owner, who
 * overrode them on 2026-09-25 and asked for these pages explicitly. The
 * override is recorded rather than assumed, and it comes with the condition
 * that made it defensible:
 * **each page is written once, by hand, about a different working day.** A
 * family of near-identical pages is not merely against the rule, it does not
 * work — thin duplicates get filtered, so a templated version of this would
 * cost the traffic it was built to win.
 *
 * WHAT THAT MEANS IN PRACTICE. This file is a list of routes and their nav
 * copy. It is deliberately NOT a content model: there is no per-profession
 * record holding paragraphs, and no generator. Each page's prose lives in its
 * own file under `app/`, and two pages that could be produced by filling in
 * the same blanks should not both exist.
 *
 * NO STATUTORY OR REGULATORY FIGURE APPEARS ON THESE PAGES. Retention
 * periods, filing thresholds and portal limits move without announcement and a
 * cached page outlives the change by months. Where a profession's rule matters
 * the page says what the tool does and leaves the rule to the reader — the
 * same discipline `lib/practice-briefs.ts` keeps for constraint C3.
 */

export interface AudienceRoute {
  route: string;
  /** Link text on the surfaces that list these. */
  name: string;
  /** One line, for the card that links here. Not the meta description. */
  blurb: string;
}

/**
 * Jobs, one page each. Written for the person, not the format.
 *
 * Six professions, chosen because all three of the project's filters hold at
 * once: the work requires handing a file to a tool, the file is genuinely
 * sensitive, and the established options charge for it. That last overlap is
 * the only place where "it never leaves your browser" stops being a nicety and
 * becomes the whole reason to choose this.
 */
export const PROFESSION_HUBS: readonly AudienceRoute[] = [
  {
    route: '/for/lawyers',
    name: 'Lawyers and paralegals',
    blurb:
      'Bates numbering, exhibit redaction and bundle assembly, without the file leaving your machine.',
  },
  {
    route: '/for/doctors',
    name: 'Doctors and clinics',
    blurb:
      'Strip patient identifiers from scans and reports before they go anywhere.',
  },
  {
    route: '/for/accountants',
    name: 'Accountants and bookkeepers',
    blurb:
      'Bank statements to spreadsheets, and returns compressed to fit a portal.',
  },
  {
    route: '/for/hr',
    name: 'HR and recruitment',
    blurb:
      'Salary slips, ID scans and CVs — the files you are least allowed to upload.',
  },
  {
    route: '/for/teachers',
    name: 'Teachers and lecturers',
    blurb:
      'Assemble worksheets, split marked scripts and flatten what you hand out.',
  },
  {
    route: '/for/architects',
    name: 'Architects and engineers',
    blurb:
      'Drawing registers, revision comparison and issue sheets for large sets.',
  },
];

/**
 * The folder runner, entered through the job somebody has rather than through
 * the word "batch".
 *
 * Each is a different shape of work — one file kind at scale, filenames rather
 * than contents, a format nobody chose — and the page says which, because
 * three pages that differ only in a noun would be the doorway family.
 */
export const BATCH_LANDINGS: readonly AudienceRoute[] = [
  {
    route: '/batch/compress-pdfs',
    name: 'Compress 500 PDFs at once',
    blurb: 'A folder of scans that each need to be smaller, done in one pass.',
  },
  {
    route: '/batch/rename-files',
    name: 'Rename 2,000 files',
    blurb:
      'Rules over filenames — numbering, prefixes, dates — across a whole folder.',
  },
  {
    route: '/batch/heic-photos',
    name: 'Convert a folder of HEIC photos',
    blurb:
      'Every photo an iPhone took, in a format the rest of the world opens.',
  },
];

export const PROFESSION_HUB_ROUTES = PROFESSION_HUBS.map((page) => page.route);
export const BATCH_LANDING_ROUTES = BATCH_LANDINGS.map((page) => page.route);
export const AUDIENCE_ROUTES = [
  ...PROFESSION_HUB_ROUTES,
  ...BATCH_LANDING_ROUTES,
];
