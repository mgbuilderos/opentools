import { expect, test } from '@playwright/test';

import { LOCALE_CODES } from '../lib/i18n/locales';
import { LOCALIZED_TOOL_ROUTES } from '../lib/i18n/routes';

/**
 * The translated pages declare each other, and must keep doing so.
 *
 * No defect prompted this. The opposite: I went looking for a missing
 * hreflang cluster on the 40 translated pages, reported one, and was wrong —
 * `grep -rl hreflang dist/client` returns nothing because the links render as
 * `hrefLang`, and HTML attribute names are case-insensitive. The cluster was
 * there all along, complete and correct, emitted from `alternates.languages`
 * in `lib/i18n/routes.ts`.
 *
 * The guard is worth keeping anyway, for the reason the false alarm was
 * plausible: eight translations that stop declaring each other become eight
 * pages competing for one query, and nothing about the site would look wrong.
 * It is the same silent shape as the canonical self-exclusion that de-indexed
 * 59 tool pages.
 *
 * It asserts on what the **browser parsed**, not on the HTML text — that is
 * the check my grep should have been, and the one that cannot be fooled by
 * casing.
 */
test.describe('hreflang clusters', () => {
  const route = LOCALIZED_TOOL_ROUTES[0]!;

  for (const page_ of [route, `/${LOCALE_CODES[0]}${route}`]) {
    test(`${page_} declares every sibling translation`, async ({ page }) => {
      await page.goto(page_);

      // Read the property, not the attribute: this is the parsed value.
      const declared = await page.evaluate(() =>
        [...document.querySelectorAll('link[rel="alternate"]')]
          .map((link) => ({
            lang: (link as HTMLLinkElement).hreflang,
            href: (link as HTMLLinkElement).href,
          }))
          .filter((entry) => entry.lang),
      );

      const langs = declared.map((entry) => entry.lang).sort();
      expect(
        langs,
        'the browser parsed no hreflang at all on this page',
      ).not.toEqual([]);

      // Every locale, plus English and x-default.
      for (const code of [...LOCALE_CODES, 'en', 'x-default']) {
        expect(langs, `${code} is missing from the cluster`).toContain(code);
      }

      // x-default and en both point at the untranslated route.
      const xDefault = declared.find((entry) => entry.lang === 'x-default');
      expect(xDefault?.href).toContain(route);
      expect(xDefault?.href).not.toMatch(
        new RegExp(`/(${LOCALE_CODES.join('|')})/`, 'u'),
      );

      // Each locale points at its own edition, not at somebody else's.
      for (const code of LOCALE_CODES) {
        const entry = declared.find((item) => item.lang === code);
        expect(entry?.href, `${code} points somewhere unexpected`).toContain(
          `/${code}${route}`,
        );
      }
    });
  }
});
