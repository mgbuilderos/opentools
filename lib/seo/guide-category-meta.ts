import { TITLE_SUFFIX_LENGTH } from './title-budget';

/*
  The `<title>` of a `/guides/category/<slug>` page.

  It used to be `${name} Tools — Free In-Browser ${name} Utilities`, which
  names the category twice. For "Audio" that is 45 characters and reads well;
  for "Date, Time & Productivity" it was 99 with the site suffix, and Google
  showed about the first 60 -- so the page's own subject was cut off by a
  repetition of itself. Seventeen of the twenty category pages were over the
  limit on 2026-09-23.

  So the phrasing is chosen against the space available rather than assumed to
  fit: the fullest wording that still fits a result snippet wins, and a long
  category name simply gets a shorter sentence around it. It lives here, and
  not inline in the page, so `meta-lengths.test.ts` can measure the same string
  the page renders instead of a copy of it.
*/
const CANDIDATES: readonly ((name: string) => string)[] = [
  (name) => `${name} Tools — Free In-Browser Utilities`,
  (name) => `Free In-Browser ${name} Tools`,
  (name) => `${name} Tools`,
];

/** What a search result can show before it truncates. */
const SNIPPET_LIMIT = 60;

export function guideCategoryMetaTitle(categoryName: string): string {
  const fits = CANDIDATES.map((build) => build(categoryName)).find(
    (title) => title.length + TITLE_SUFFIX_LENGTH <= SNIPPET_LIMIT,
  );
  return fits ?? `${categoryName} Tools`;
}
