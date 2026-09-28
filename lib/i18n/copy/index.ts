import type { LocaleCopy } from '../locales';
import { DE } from './de';
import { ES } from './es';
import { FR } from './fr';
import { ID } from './id';
import { IT } from './it';
import { JA } from './ja';
import { PT } from './pt';
import { RU } from './ru';

/**
 * Every locale's copy, keyed by the code in `LOCALES`.
 *
 * `lib/i18n/i18n.test.ts` asserts that this map has exactly the codes the
 * registry declares and that each one carries every route in
 * `LOCALIZED_TOOL_ROUTES`, so a locale added to one file and forgotten in the
 * other fails the suite instead of shipping a half-translated edition.
 */
export const LOCALE_COPY: Readonly<Record<string, LocaleCopy>> = {
  es: ES,
  pt: PT,
  fr: FR,
  de: DE,
  it: IT,
  ja: JA,
  ru: RU,
  id: ID,
};
