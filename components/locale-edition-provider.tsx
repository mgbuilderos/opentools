'use client';

import { createContext, useContext, type ReactNode } from 'react';

/*
  How a localised page tells the app shell which edition it is.

  Same shape, and the same reason, as `PageDepthProvider`: the element that can
  place a language switcher at the end of `<main>` is twenty components below
  the page file, and threading a prop through all twenty would be twenty
  chances to get it wrong. A page that provides nothing gets `null` and no
  switcher renders, which is every English page on the site.

  The labels are passed in rather than looked up here on purpose. Looking them
  up would mean importing `lib/i18n/copy`, and that would pull every word of
  all eight translations into the client bundle of every page that renders the
  shell.
*/

export interface LocaleEdition {
  /** The locale being read, e.g. `es`. */
  localeCode: string;
  /** The English route this is an edition of, `''` for a locale hub. */
  route: string;
  /** The switcher's own label, in this locale. */
  label: string;
  /** What to call the English edition, in this locale. */
  englishLabel: string;
}

const LocaleEditionContext = createContext<LocaleEdition | null>(null);

export function LocaleEditionProvider({
  edition,
  children,
}: {
  edition: LocaleEdition;
  children: ReactNode;
}) {
  return (
    <LocaleEditionContext.Provider value={edition}>
      {children}
    </LocaleEditionContext.Provider>
  );
}

export function useLocaleEdition(): LocaleEdition | null {
  return useContext(LocaleEditionContext);
}
