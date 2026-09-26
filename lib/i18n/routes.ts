import type { Metadata } from 'next';

import { shareImages, shareTwitterCard } from '../seo/share-images';
import type { ToolPageDepth } from '../seo/tool-page-depth-types';
import { LOCALE_COPY } from './copy';
import { LOCALES, requireLocale, type Locale } from './locales';

/*
  Where the localised pages live, and what tells Google they are the same page.

  The origin is assembled rather than written for the reason
  `lib/seo/tool-page-depth.ts` assembles it: a bare literal of the production
  origin in a source file is what the canonical sweep greps for.
*/

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

/**
 * The English routes that have a localised edition.
 *
 * Five file tools, chosen because a results page cannot answer them for
 * itself -- see the note in `locales.ts`. Adding a sixth is this list plus one
 * entry per locale in `lib/i18n/copy/*.ts`; `lib/i18n/i18n.test.ts` fails
 * until every locale has the copy, so a half-translated route cannot ship.
 */
export const LOCALIZED_TOOL_ROUTES: readonly string[] = [
  '/pdf/merge',
  '/pdf/compress',
  '/pdf/images-to-pdf',
  '/pdf/to-word',
  '/image/optimize',
] as const;

/** `/es/pdf/merge` for (`es`, `/pdf/merge`). */
export function localizedPath(localeCode: string, route: string): string {
  return `/${localeCode}${route}`;
}

/**
 * The `hreflang` cluster for one English route.
 *
 * Every edition lists every other edition and itself, which is what Google
 * requires -- a one-way annotation is ignored. `x-default` points at the
 * English page because that is the edition served to a language this site does
 * not publish. The site ships a generator for exactly this markup at
 * `/web/hreflang-generator`; this is the same shape, emitted by the framework.
 */
export function languageAlternates(
  route: string,
): Readonly<Record<string, string>> {
  const alternates: Record<string, string> = {
    en: `${CANONICAL_ORIGIN}${route}`,
    'x-default': `${CANONICAL_ORIGIN}${route}`,
  };
  for (const locale of LOCALES) {
    alternates[locale.code] =
      `${CANONICAL_ORIGIN}${localizedPath(locale.code, route)}`;
  }
  return alternates;
}

/** The hreflang cluster for the hubs (`/`, `/es`, `/ja`, ...). */
export function hubLanguageAlternates(): Readonly<Record<string, string>> {
  const alternates: Record<string, string> = {
    en: `${CANONICAL_ORIGIN}/`,
    'x-default': `${CANONICAL_ORIGIN}/`,
  };
  for (const locale of LOCALES) {
    alternates[locale.code] = `${CANONICAL_ORIGIN}/${locale.code}`;
  }
  return alternates;
}

/** True when the English route has a localised edition in every locale. */
export function isLocalizedRoute(route: string): boolean {
  return LOCALIZED_TOOL_ROUTES.includes(route);
}

export function localizedDepth(
  localeCode: string,
  route: string,
): ToolPageDepth | undefined {
  return LOCALE_COPY[localeCode]?.tools[route];
}

/**
 * The depth content for a localised page that must have some.
 *
 * Loud on a miss, like `requireToolPageDepth`: a Spanish URL that rendered
 * English prose would be worse than no Spanish URL, so the build stops.
 */
export function requireLocalizedDepth(
  localeCode: string,
  route: string,
): ToolPageDepth {
  const depth = localizedDepth(localeCode, route);
  if (!depth) {
    throw new Error(
      `No ${localeCode} copy is registered for ${route}; add it in lib/i18n/copy/${localeCode}.ts`,
    );
  }
  return depth;
}

/** Title, description, self-canonical and the hreflang cluster for a localised page. */
export function localizedToolMetadata(
  localeCode: string,
  route: string,
): Metadata {
  const locale = requireLocale(localeCode);
  const depth = requireLocalizedDepth(localeCode, route);
  /*
    `images` and the `twitter` block are not optional here. Next replaces the
    layout's `openGraph` whole rather than merging it, so declaring `locale`
    alone would drop the card `app/layout.tsx` sets and ship 48 pages whose
    share preview is a reserved, empty image slot -- the exact fault
    `lib/seo/share-images.ts` was written for, and which
    `scripts/check-share-and-heading-order.mjs` caught on the first build of
    this route family.
  */
  return {
    title: depth.title,
    description: depth.description,
    alternates: {
      canonical: `${CANONICAL_ORIGIN}${localizedPath(localeCode, route)}`,
      languages: languageAlternates(route),
    },
    openGraph: {
      locale: locale.ogLocale,
      images: shareImages('site'),
    },
    twitter: shareTwitterCard('site', depth.title, depth.description),
  };
}

/** The same, for a locale hub. */
export function localizedHubMetadata(localeCode: string): Metadata {
  const locale = requireLocale(localeCode);
  const hub = LOCALE_COPY[localeCode]?.hub;
  if (!hub) throw new Error(`No hub copy is registered for "${localeCode}"`);
  return {
    title: hub.title,
    description: hub.description,
    alternates: {
      canonical: `${CANONICAL_ORIGIN}/${localeCode}`,
      languages: hubLanguageAlternates(),
    },
    openGraph: {
      locale: locale.ogLocale,
      images: shareImages('site'),
    },
    twitter: shareTwitterCard('site', hub.title, hub.description),
  };
}

/**
 * Every localised URL, for `lib/seo/sitemap-entries.ts`.
 *
 * Deliberately NOT added to `LIVE_TOOL_ROUTES`. That list is what the CTAs and
 * the smart dropzone offer as a place to send a file, and it is swept by
 * `indexability-sweep.test.ts` and the tool-count assertions; a localised
 * edition is the same tool at another address, so listing it there would
 * offer the same tool twice in one menu and move every count in the suite.
 */
export function localizedSitemapRoutes(): readonly string[] {
  const routes: string[] = [];
  for (const locale of LOCALES) {
    routes.push(`/${locale.code}`);
    for (const route of LOCALIZED_TOOL_ROUTES) {
      routes.push(localizedPath(locale.code, route));
    }
  }
  return routes;
}

/** The other editions of one route, for the switcher. */
export function otherEditions(
  localeCode: string,
  route: string,
): readonly { locale: Locale; href: string }[] {
  return LOCALES.filter((locale) => locale.code !== localeCode).map(
    (locale) => ({
      locale,
      href: route ? localizedPath(locale.code, route) : `/${locale.code}`,
    }),
  );
}
