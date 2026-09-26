import type { ToolPageDepth } from '../seo/tool-page-depth-types';

/*
  The eight non-English locales the tool pages are published in.

  WHY THESE EIGHT, AND WHY NOT THE INDIAN LANGUAGES. `docs/GROWTH_IDEAS.md` §5
  records "India-first vernacular tool pages" as deferred by the owner on
  2026-09-19; that deferral stands and nothing here touches it. This set is the
  other half of the argument: the European and East Asian markets that already
  lead the visit log. `docs/REVENUE_OPERATIONS.md` §1 reports traffic leading
  from Germany, Canada, Brazil and Spain, which is `de`, `fr`, `pt` and `es`
  without having to guess; `ja` and `ru` were named explicitly in the proposal
  that opened this work; `it` and `id` complete the set of large markets for
  free file tools where every incumbent publishes in English only.

  WHY A SMALL SET OF ROUTES AND NOT THE WHOLE CATALOGUE. Eight locales across
  all 1,413 sitemap URLs is ~11,300 addresses, asked of a crawler that on
  2026-09-23 had already left 534 of the ones it knows "Discovered - currently
  not indexed" (`docs/SEARCH_CONSOLE_BASELINE_2026-09-23.md`). So this ships
  the family that cannot be answered inside the results page instead: a unit
  conversion is answered by Google's own widget -- 512 such pages produced 15
  page-opens on 2026-09-23, see `lib/seo/format-pairs.ts` -- while converting
  a file needs a converter the person has to open. Five file tools in eight
  languages is 40 pages, plus eight hubs.

  WHY THE COPY IS WRITTEN AND NOT MACHINE-TRANSLATED. Constraint C4 forbids a
  new family of near-template pages and C9 forbids spending money, which leaves
  exactly one honest option: a bounded set, written in the words each market
  actually types. `comprimir pdf` is not a translation of `compress pdf`, it is
  the query. Every entry below states what the tool refuses as plainly as what
  it does, because that is what the English pages do.
*/

/** A published locale. `en` is the default and is not in this list. */
export interface Locale {
  /** URL segment and `hreflang` value. */
  code: string;
  /** `lang` attribute for the localised subtree. */
  htmlLang: string;
  /** `og:locale`. */
  ogLocale: string;
  /** How the language names itself, for the switcher. */
  nativeName: string;
  /** How the language is named in English, for tests and logs. */
  englishName: string;
}

export const LOCALES: readonly Locale[] = [
  {
    code: 'es',
    htmlLang: 'es',
    ogLocale: 'es_ES',
    nativeName: 'Español',
    englishName: 'Spanish',
  },
  {
    code: 'pt',
    htmlLang: 'pt-BR',
    ogLocale: 'pt_BR',
    nativeName: 'Português',
    englishName: 'Portuguese',
  },
  {
    code: 'fr',
    htmlLang: 'fr',
    ogLocale: 'fr_FR',
    nativeName: 'Français',
    englishName: 'French',
  },
  {
    code: 'de',
    htmlLang: 'de',
    ogLocale: 'de_DE',
    nativeName: 'Deutsch',
    englishName: 'German',
  },
  {
    code: 'it',
    htmlLang: 'it',
    ogLocale: 'it_IT',
    nativeName: 'Italiano',
    englishName: 'Italian',
  },
  {
    code: 'ja',
    htmlLang: 'ja',
    ogLocale: 'ja_JP',
    nativeName: '日本語',
    englishName: 'Japanese',
  },
  {
    code: 'ru',
    htmlLang: 'ru',
    ogLocale: 'ru_RU',
    nativeName: 'Русский',
    englishName: 'Russian',
  },
  {
    code: 'id',
    htmlLang: 'id',
    ogLocale: 'id_ID',
    nativeName: 'Bahasa Indonesia',
    englishName: 'Indonesian',
  },
] as const;

export const LOCALE_CODES: readonly string[] = LOCALES.map(
  (locale) => locale.code,
);

export function localeByCode(code: string): Locale | undefined {
  return LOCALES.find((locale) => locale.code === code);
}

/**
 * The locale for a code that must exist, for page files.
 *
 * Loud on a miss for the same reason `requireToolPageDepth` is: a page that
 * renders English chrome because a lookup returned `undefined` is the failure
 * this module exists to prevent, so the build stops with the code named.
 */
export function requireLocale(code: string): Locale {
  const locale = localeByCode(code);
  if (!locale) throw new Error(`No locale is registered for "${code}"`);
  return locale;
}

/** The copy a locale's hub page (`/es`, `/ja`, ...) is built from. */
export interface LocaleHubCopy {
  title: string;
  description: string;
  heading: string;
  /** One paragraph stating the promise in the reader's own language. */
  intro: string;
  /** The heading above the tool list. */
  toolsHeading: string;
  /** The heading above the privacy explanation. */
  privacyHeading: string;
  /** Two or three sentences on why nothing is uploaded. */
  privacyBody: readonly string[];
  /**
   * The two headings `components/page-depth-content.tsx` renders around a
   * page's steps and FAQs. They are the only strings in that component that do
   * not come from the depth entry, so without them a localised page shows
   * "Step by step" in English directly above prose in its own language.
   */
  stepsHeading: string;
  faqsHeading: string;
  /** Label for the language switcher, e.g. "Idioma". */
  switcherLabel: string;
  /** Link text back to the English edition. */
  englishLinkLabel: string;
}

/** Everything published in one locale. */
export interface LocaleCopy {
  hub: LocaleHubCopy;
  /** Keyed by the English route, e.g. `/pdf/merge`. */
  tools: Readonly<Record<string, ToolPageDepth>>;
}
