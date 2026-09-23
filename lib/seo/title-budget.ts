/*
  How many characters of a page's own title the site suffix spends.

  `app/layout.tsx` sets `title.template` to `'%s · OpenTools'`, so every page
  ships twelve characters it did not write. A title chosen against 60 without
  counting them is a title that gets truncated at 60. Kept in its own tiny
  module because both the generators and `meta-lengths.test.ts` need the
  number, and neither should import the other.
*/

/** `' · OpenTools'`, the tail `app/layout.tsx` appends to every page title. */
export const TITLE_SUFFIX = ' · OpenTools';

export const TITLE_SUFFIX_LENGTH = TITLE_SUFFIX.length;
