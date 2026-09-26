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

/**
 * The longest title a result can show in full, suffix included.
 *
 * Lived in `meta-lengths.test.ts` until a generator needed it too. A limit
 * that a generator and its test each hold a private copy of is a limit that
 * drifts, and the drift shows up as truncated titles in results rather than
 * as a failure.
 */
export const TITLE_MAX = 70;

/**
 * React escapes these when it writes the head, so the bytes a crawler reads
 * are longer than the string a page wrote. `Docker & Compose generator &
 * cheatsheet` is 39 characters in source and 47 on the wire.
 *
 * Lived in `meta-inventory.ts` until `tool-search-copy.ts` needed it to size a
 * generated title. `meta-inventory` imports that file, so it could not import
 * back; and a generator measuring source while its test measures the wire is
 * how a title goes over the limit without anything failing.
 */
const ESCAPES: ReadonlyArray<readonly [RegExp, string]> = [
  [/&/g, '&amp;'],
  [/</g, '&lt;'],
  [/>/g, '&gt;'],
  [/"/g, '&quot;'],
  [/'/g, '&#x27;'],
];

/** `value` as the head ships it, which is what a length must be measured on. */
export function asServed(value: string): string {
  return ESCAPES.reduce((text, [from, to]) => text.replace(from, to), value);
}
