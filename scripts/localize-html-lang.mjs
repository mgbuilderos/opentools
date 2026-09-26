/**
 * Sets `<html lang>` on the prerendered localised pages, and proves it.
 *
 * WHY THIS IS A BUILD STEP AND NOT A ROUTE GROUP. `<html lang>` has to state
 * the language the page is really in: a Japanese page served as `lang="en"`
 * makes a screen reader read Japanese with an English voice, and tells a
 * browser there is nothing to offer to translate. App Router only lets the
 * *root* layout render `<html>`, and a root layout receives no `params`, so
 * the locale cannot reach the attribute from `app/[locale]/`.
 *
 * The framework answer is two root layouts in two route groups. That was
 * built, and it works -- every localised page served the right `lang`, and all
 * 2,645 tests passed. It was reverted for one reason: moving `app/` into an
 * `(en)` group stopped vinext (1.0.0-beta.9) prerendering `/image`, while the
 * eighteen sibling category hubs built unchanged. Reproduced on a clean build
 * with the `(intl)` group deleted outright, so the cause is the group itself
 * and not the translations, and neither `export const dynamic = 'force-static'`
 * nor dropping the layout's `generateStaticParams` recovered it. A page missing
 * from the static build renders per request on a Worker capped at 10ms CPU and
 * returns 503 under crawl load, which is a worse fault than the one being
 * fixed. `scripts/verify-static-coverage.mjs` is what caught it.
 *
 * So the attribute is set here instead, on the built HTML, where the change is
 * exact and cannot affect any other route. This is a rewrite of one attribute
 * on 48 known files -- not a transform over the output -- and
 * `verify-html-lang.mjs` fails the build if any of the 48 is wrong or if any
 * other page was touched.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { expectedLangByRoute, localeRegistry } from './lib/localized-pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLIENT = path.join(ROOT, 'dist', 'client');

function fail(message) {
  console.error(`\n  localize-html-lang: ${message}\n`);
  process.exit(1);
}

/** Every built file for one localised route, `.html` or `dir/index.html`. */
function builtFile(route) {
  for (const candidate of [
    path.join(CLIENT, `${route.slice(1)}.html`),
    path.join(CLIENT, route.slice(1), 'index.html'),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

if (!existsSync(CLIENT)) {
  fail('dist/client is missing. Run the prerender step first.');
}

let rewritten = 0;
const missing = [];
const expectedLang = expectedLangByRoute();

for (const [route, lang] of expectedLang) {
  const file = builtFile(route);
  if (!file) {
    missing.push(route);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  /*
    Anchored on the opening tag, and only the first one: `lang="en"` appears
    later in the body too -- the language switcher sets `hrefLang="en"` on its
    link to the English edition -- and a blanket replace would corrupt it.
  */
  const match = /<html\b[^>]*?\blang="([^"]*)"/.exec(html);
  if (!match) fail(`${route} has no <html lang> to set`);
  if (match[1] === lang) continue;
  if (match[1] !== 'en') {
    fail(`${route} declares lang="${match[1]}", expected "en" or "${lang}"`);
  }
  const tag = match[0].replace('lang="en"', `lang="${lang}"`);
  writeFileSync(
    file,
    html.slice(0, match.index) +
      tag +
      html.slice(match.index + match[0].length),
  );
  rewritten += 1;
}

if (missing.length > 0) {
  fail(
    `${missing.length} localised pages have no built file: ${missing.join(', ')}`,
  );
}

console.log(
  `  Set <html lang> on ${rewritten} of ${expectedLang.size} localised pages ` +
    `(${localeRegistry()
      .map((locale) => locale.htmlLang)
      .join(', ')})`,
);
