import { DE_TOOL_UI } from './de';
import { ES_TOOL_UI } from './es';
import { FR_TOOL_UI } from './fr';
import { ID_TOOL_UI } from './id';
import { IT_TOOL_UI } from './it';
import { JA_TOOL_UI } from './ja';
import { EN_TOOL_UI, type ToolUiMessages } from './messages';
import { PT_TOOL_UI } from './pt';
import { RU_TOOL_UI } from './ru';

export { EN_TOOL_UI, fillMessage, type ToolUiMessages } from './messages';

/**
 * A locale's tool-control strings, keyed by the code in `LOCALES`.
 *
 * `lib/i18n/i18n.test.ts` checks that this map has exactly the published
 * locales and that every bundle fills every key with something other than the
 * English default, so a locale added to the registry and forgotten here fails
 * the suite rather than shipping a half-English tool.
 */
export const TOOL_UI: Readonly<Record<string, ToolUiMessages>> = {
  es: ES_TOOL_UI,
  pt: PT_TOOL_UI,
  fr: FR_TOOL_UI,
  de: DE_TOOL_UI,
  it: IT_TOOL_UI,
  ja: JA_TOOL_UI,
  ru: RU_TOOL_UI,
  id: ID_TOOL_UI,
};

/** The bundle for a locale, or the English one for anything unpublished. */
export function toolUiFor(localeCode: string | undefined): ToolUiMessages {
  if (!localeCode) return EN_TOOL_UI;
  return TOOL_UI[localeCode] ?? EN_TOOL_UI;
}
