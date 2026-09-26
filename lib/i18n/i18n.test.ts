import { describe, expect, it } from 'vitest';

import { buildSitemap } from '../seo/sitemap-entries';
import { TITLE_SUFFIX_LENGTH } from '../seo/title-budget';
import { toolPageDepth, toolPageMetadata } from '../seo/tool-page-depth';
import type { ToolPageDepth } from '../seo/tool-page-depth-types';
import { LOCALE_COPY } from './copy';
import { LOCALE_CODES, LOCALES } from './locales';
import {
  hubLanguageAlternates,
  languageAlternates,
  LOCALIZED_TOOL_ROUTES,
  localizedPath,
  localizedSitemapRoutes,
  requireLocalizedDepth,
} from './routes';

/**
 * The rules a localised edition has to satisfy before it can ship.
 *
 * The failure this file exists to prevent is a half-translated locale: a code
 * added to `LOCALES` whose copy file was never written, or a sixth route added
 * to `LOCALIZED_TOOL_ROUTES` that only three languages have. Either one ships
 * a URL in the sitemap that renders English prose under a Spanish address, or
 * throws at build time in a file that does not say why. Both are checked here
 * instead.
 *
 * The length budgets are the same ones `meta-lengths.test.ts` holds the whole
 * sitemap to; they are repeated here so a bad translation fails in the file
 * that owns it rather than in a sweep of 1,400 URLs.
 */

const TITLE_MIN = 15;
const TITLE_MAX = 70;
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 165;

describe('locale registry', () => {
  it('has copy for every registered locale, and no copy for anything else', () => {
    expect(Object.keys(LOCALE_COPY).sort()).toEqual([...LOCALE_CODES].sort());
  });

  it('gives every locale a unique, lowercase two-letter code', () => {
    for (const locale of LOCALES) {
      expect(locale.code).toMatch(/^[a-z]{2}$/u);
      expect(locale.nativeName.length).toBeGreaterThan(0);
      expect(locale.englishName.length).toBeGreaterThan(0);
      expect(locale.ogLocale).toMatch(/^[a-z]{2}_[A-Z]{2}$/u);
    }
    expect(new Set(LOCALE_CODES).size).toBe(LOCALE_CODES.length);
  });

  it('does not publish a locale the deferred India-first decision covers', () => {
    // docs/GROWTH_IDEAS.md §5: India-first vernacular pages are the owner's to
    // un-defer. This set is the European and East Asian half and must stay so.
    const indian = ['hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur'];
    for (const code of indian) expect(LOCALE_CODES).not.toContain(code);
  });
});

describe('localised routes', () => {
  it('localises only routes that exist in English and carry depth content', () => {
    for (const route of LOCALIZED_TOOL_ROUTES) {
      expect(
        toolPageDepth(route),
        `${route} has no English depth`,
      ).toBeDefined();
    }
  });

  it('gives every locale every localised route', () => {
    const missing: string[] = [];
    for (const code of LOCALE_CODES) {
      for (const route of LOCALIZED_TOOL_ROUTES) {
        if (!LOCALE_COPY[code]?.tools[route]) missing.push(`${code}${route}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('registers no copy for a route that is not published', () => {
    const stray: string[] = [];
    for (const code of LOCALE_CODES) {
      for (const route of Object.keys(LOCALE_COPY[code]?.tools ?? {})) {
        if (!LOCALIZED_TOOL_ROUTES.includes(route))
          stray.push(`${code}${route}`);
      }
    }
    expect(stray).toEqual([]);
  });
});

describe('translated copy', () => {
  const every: { id: string; depth: ToolPageDepth }[] = LOCALE_CODES.flatMap(
    (code) =>
      LOCALIZED_TOOL_ROUTES.map((route) => ({
        id: `${code}${route}`,
        depth: requireLocalizedDepth(code, route),
      })),
  );

  it('fits every title and description into a search result', () => {
    const wrong = every
      .filter(({ depth }) => {
        const title = depth.title.length + TITLE_SUFFIX_LENGTH;
        return (
          title < TITLE_MIN ||
          title > TITLE_MAX ||
          depth.description.length < DESCRIPTION_MIN ||
          depth.description.length > DESCRIPTION_MAX
        );
      })
      .map(
        ({ id, depth }) =>
          `${id} (title ${depth.title.length + TITLE_SUFFIX_LENGTH}, description ${depth.description.length})`,
      );
    expect(wrong).toEqual([]);
  });

  it('gives every localised page prose, steps and questions of its own', () => {
    const thin = every
      .filter(
        ({ depth }) =>
          depth.heading.trim() === '' ||
          depth.directAnswer.trim() === '' ||
          depth.lead.trim() === '' ||
          depth.steps.length === 0 ||
          depth.sections.length === 0 ||
          depth.faqs.length === 0,
      )
      .map(({ id }) => id);
    expect(thin).toEqual([]);
  });

  it('never leaves an English string standing in for a translation', () => {
    const untranslated = every
      .filter(({ id, depth }) => {
        const route = `/${id.split('/').slice(1).join('/')}`;
        const english = toolPageDepth(route);
        return (
          english !== undefined &&
          (english.title === depth.title ||
            english.description === depth.description)
        );
      })
      .map(({ id }) => id);
    expect(untranslated).toEqual([]);
  });

  it('gives every title and description to exactly one page', () => {
    const titles = every.map(({ depth }) => depth.title);
    const descriptions = every.map(({ depth }) => depth.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('translates the depth-block headings the component owns', () => {
    // `page-depth-content.tsx` renders these two itself rather than reading
    // them from the depth entry, so an untranslated one shows English directly
    // above prose in another language.
    for (const code of LOCALE_CODES) {
      const hub = LOCALE_COPY[code]?.hub;
      expect(hub?.stepsHeading, code).toBeTruthy();
      expect(hub?.faqsHeading, code).toBeTruthy();
      expect(hub?.stepsHeading).not.toBe('Step by step');
      expect(hub?.faqsHeading).not.toBe('Questions people ask');
    }
  });

  it('fills in every hub', () => {
    for (const code of LOCALE_CODES) {
      const hub = LOCALE_COPY[code]?.hub;
      expect(hub, code).toBeDefined();
      if (!hub) continue;
      expect(hub.privacyBody.length).toBeGreaterThan(0);
      for (const field of [
        hub.title,
        hub.description,
        hub.heading,
        hub.intro,
        hub.toolsHeading,
        hub.privacyHeading,
        hub.stepsHeading,
        hub.faqsHeading,
        hub.switcherLabel,
        hub.englishLinkLabel,
      ]) {
        expect(field.trim(), `${code} hub field`).not.toBe('');
      }
    }
  });
});

/**
 * The numbers a translation is not allowed to drift on.
 *
 * A translated page is a second place the tool's limits are written down, and
 * the failure mode is quiet: "hasta 20 archivos" is checked by nobody, so a
 * translator raising it to 50 would ship a page that promises what the code
 * refuses. These are the figures the English depth entries state, and every
 * locale has to state the same ones.
 *
 * Matched as plain substrings rather than with `\b`, because a word boundary
 * does not exist between "20" and a Japanese character -- the first draft of
 * this check reported seven false misses in `ja` for exactly that reason.
 * Decimal separators vary by locale, so `595.28` also matches `595,28`.
 */
const DOCUMENTED_LIMITS: Readonly<Record<string, readonly string[]>> = {
  '/pdf/merge': ['20', '150'],
  '/pdf/compress': ['40', '95'],
  '/pdf/images-to-pdf': [
    '40',
    '100',
    '595.28',
    '841.89',
    '612',
    '792',
    '12',
    '24',
    '36',
  ],
  '/pdf/to-word': ['150'],
  '/image/optimize': ['25', '4000', '3000', '1200', '900', '640', '480'],
};

function renderedText(depth: ToolPageDepth): string {
  return [
    depth.title,
    depth.description,
    depth.heading,
    depth.directAnswer,
    depth.lead,
    ...depth.steps.flatMap((step) => [step.name, step.text]),
    ...depth.sections.flatMap((section) => [section.heading, ...section.body]),
    ...depth.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join(' ');
}

describe('documented limits', () => {
  it('states the same figures in every language', () => {
    const drifted: string[] = [];
    for (const code of LOCALE_CODES) {
      for (const [route, tokens] of Object.entries(DOCUMENTED_LIMITS)) {
        const text = renderedText(requireLocalizedDepth(code, route));
        for (const token of tokens) {
          const alternatives = token.includes('.')
            ? [token, token.replace('.', ',')]
            : [token];
          if (!alternatives.some((value) => text.includes(value))) {
            drifted.push(`${code}${route}: does not state ${token}`);
          }
        }
      }
    }
    expect(drifted).toEqual([]);
  });

  it('covers every published route, so a new tool cannot skip the check', () => {
    expect(Object.keys(DOCUMENTED_LIMITS).sort()).toEqual(
      [...LOCALIZED_TOOL_ROUTES].sort(),
    );
  });
});

describe('hreflang', () => {
  const origin = ['https:', '//', 'getopentools.com'].join('');

  it('names every edition, itself and an x-default on each tool route', () => {
    for (const route of LOCALIZED_TOOL_ROUTES) {
      const cluster = languageAlternates(route);
      expect(Object.keys(cluster).sort()).toEqual(
        ['en', 'x-default', ...LOCALE_CODES].sort(),
      );
      expect(cluster.en).toBe(`${origin}${route}`);
      expect(cluster['x-default']).toBe(`${origin}${route}`);
      for (const code of LOCALE_CODES) {
        expect(cluster[code]).toBe(`${origin}${localizedPath(code, route)}`);
      }
    }
  });

  it('names every edition on the hubs', () => {
    const cluster = hubLanguageAlternates();
    expect(Object.keys(cluster).sort()).toEqual(
      ['en', 'x-default', ...LOCALE_CODES].sort(),
    );
    expect(cluster['x-default']).toBe(`${origin}/`);
  });

  /*
    The reciprocity rule: an annotation Google honours has to be two-way, so
    the English page must point at the translations as well. A canonical that
    stopped being self-referential would be the 2026-09-23 bug again, so it is
    asserted here too rather than assumed.
  */
  it('is emitted by the English page as well', () => {
    for (const route of LOCALIZED_TOOL_ROUTES) {
      const metadata = toolPageMetadata(route);
      expect(metadata.alternates?.canonical).toBe(`${origin}${route}`);
      expect(metadata.alternates?.languages).toEqual(languageAlternates(route));
    }
  });

  it('is not emitted by an English page that has no translation', () => {
    const untranslated = '/pdf/sign';
    expect(LOCALIZED_TOOL_ROUTES).not.toContain(untranslated);
    expect(
      toolPageMetadata(untranslated).alternates?.languages,
    ).toBeUndefined();
  });
});

describe('sitemap', () => {
  const origin = ['https:', '//', 'getopentools.com'].join('');
  const urls = new Set(buildSitemap().map((entry) => String(entry.url)));

  it('offers every locale hub and every localised tool page', () => {
    const expected = localizedSitemapRoutes();
    expect(expected.length).toBe(
      LOCALE_CODES.length * (LOCALIZED_TOOL_ROUTES.length + 1),
    );
    const missing = expected.filter((route) => !urls.has(`${origin}${route}`));
    expect(missing).toEqual([]);
  });

  it('still offers the English originals beside them', () => {
    for (const route of LOCALIZED_TOOL_ROUTES) {
      expect(urls.has(`${origin}${route}`), route).toBe(true);
    }
  });
});
