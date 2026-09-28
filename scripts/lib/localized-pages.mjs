/**
 * The localised routes and the `lang` each one must declare.
 *
 * Read out of `lib/i18n/` rather than imported from it: these are `.mjs` build
 * scripts run by plain Node, which cannot resolve a TypeScript module's
 * extensionless imports. Parsed rather than restated, so a locale added to the
 * registry is covered here without this file being edited -- and
 * `localeRegistry()` throws when it parses nothing, which is the failure mode
 * that would otherwise let a checker sweep zero pages and pass.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

/** `[{ code: 'es', htmlLang: 'es' }, ...]`, in registry order. */
export function localeRegistry() {
  const source = readFileSync(
    path.join(ROOT, 'lib', 'i18n', 'locales.ts'),
    'utf8',
  );
  const locales = [];
  const entry = /code:\s*'([a-z]{2})',\s*\n\s*htmlLang:\s*'([A-Za-z-]+)'/g;
  let match;
  while ((match = entry.exec(source))) {
    locales.push({ code: match[1], htmlLang: match[2] });
  }
  if (locales.length === 0) {
    throw new Error(
      'localized-pages: parsed no locales out of lib/i18n/locales.ts. ' +
        'The registry shape changed; fix this parser rather than the registry.',
    );
  }
  return locales;
}

/** The English routes that have a localised edition. */
export function localizedToolRoutes() {
  const source = readFileSync(
    path.join(ROOT, 'lib', 'i18n', 'routes.ts'),
    'utf8',
  );
  // `= [` rather than the first `[`: the declaration is
  // `LOCALIZED_TOOL_ROUTES: readonly string[] = [`, and the `[]` in the type
  // annotation is what a looser pattern matches instead of the array.
  const block = /LOCALIZED_TOOL_ROUTES[^=]*=\s*\[([\s\S]*?)\]\s*as const/.exec(
    source,
  );
  if (!block) {
    throw new Error(
      'localized-pages: could not find LOCALIZED_TOOL_ROUTES in lib/i18n/routes.ts',
    );
  }
  const routes = [...block[1].matchAll(/'(\/[^']+)'/g)].map((m) => m[1]);
  if (routes.length === 0) {
    throw new Error('localized-pages: LOCALIZED_TOOL_ROUTES parsed empty');
  }
  return routes;
}

/** `Map<'/es/pdf/merge', 'es'>` -- every localised page and its `lang`. */
export function expectedLangByRoute() {
  const map = new Map();
  for (const locale of localeRegistry()) {
    for (const route of ['', ...localizedToolRoutes()]) {
      map.set(`/${locale.code}${route}`, locale.htmlLang);
    }
  }
  return map;
}
