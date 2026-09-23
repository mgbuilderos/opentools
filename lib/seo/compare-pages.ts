/**
 * The hand-written comparison pages.
 *
 * Pillar 5 of `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md` permits **at most
 * three**, each hand-written, each with a working tool on it, each making the
 * architectural point (server-side upload versus in-tab execution) with
 * specifics that are true on the day of writing and dated. It explicitly bars
 * a programmatic `/compare/*` family, because constraint C4 forbids spawning a
 * new near-template page family while decision 11 is consolidating the last
 * one — and business rule 22 forbids doorway pages besides.
 *
 * So this file is a list of three routes and nothing else. It is deliberately
 * NOT a content model: there is no shared template, no per-competitor record
 * and no generator. Each page is its own file, written once, by hand. If a
 * later change turns this into a data structure that renders pages, that
 * change has crossed C4 and needs the owner, not a bigger array.
 *
 * `lib/seo/compare-pages.test.ts` holds the cap at three and checks each page
 * against the rules the playbook sets.
 */
export const COMPARE_ROUTES = [
  '/compare/pdf-tools-that-dont-upload',
  '/compare/browser-based-vs-cloud-file-tools',
  '/compare/open-source-pdf-tools',
] as const;

/** The most pages Pillar 5 allows. Raising it is an owner decision. */
export const MAX_COMPARE_PAGES = 3;
