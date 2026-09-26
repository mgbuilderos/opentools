/**
 * Every localised page declares its own language, and no other page moved.
 *
 * The guard on `localize-html-lang.mjs`. That script edits one attribute on 48
 * built files; this one re-reads the whole of `dist/client` and checks the
 * result from the outside, so a bug in the rewrite -- a missed file, a wrong
 * tag, an English page caught by a loose pattern -- fails the build here rather
 * than shipping a page that lies about what language it is in.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

import { expectedLangByRoute } from './lib/localized-pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLIENT = path.join(ROOT, 'dist', 'client');

const expectedByRoute = expectedLangByRoute();

function htmlFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) htmlFiles(full, found);
    else if (entry.endsWith('.html')) found.push(full);
  }
  return found;
}

if (!existsSync(CLIENT)) {
  console.error('\n  verify-html-lang: dist/client is missing.\n');
  process.exit(1);
}

/** `dist/client/es/pdf/merge.html` -> `/es/pdf/merge`; `es.html` -> `/es`. */
function routeOf(file) {
  const rel = path.relative(CLIENT, file).split(path.sep).join('/');
  return `/${rel.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`;
}

const faults = [];
let localised = 0;
let english = 0;

for (const file of htmlFiles(CLIENT)) {
  const html = readFileSync(file, 'utf8');
  const match = /<html\b[^>]*?\blang="([^"]*)"/.exec(html);
  if (!match) continue;
  const route = routeOf(file);
  const expected = expectedByRoute.get(route);
  if (expected === undefined) {
    // Every page that is not one of the 48 must still be English.
    if (match[1] !== 'en')
      faults.push(`${route}: lang="${match[1]}", expected "en"`);
    else english += 1;
    continue;
  }
  if (match[1] !== expected) {
    faults.push(`${route}: lang="${match[1]}", expected "${expected}"`);
  } else {
    localised += 1;
  }
}

const seen = new Set(
  htmlFiles(CLIENT)
    .map(routeOf)
    .filter((route) => expectedByRoute.has(route)),
);
for (const route of expectedByRoute.keys()) {
  if (!seen.has(route)) faults.push(`${route}: no built HTML file`);
}

if (faults.length > 0) {
  console.error(
    `\n  verify-html-lang: ${faults.length} pages declare the wrong language.\n\n` +
      faults.map((fault) => `    ${fault}`).join('\n') +
      '\n\n  A page whose <html lang> is wrong is read aloud in the wrong\n' +
      '  voice by a screen reader. Fix scripts/localize-html-lang.mjs.\n',
  );
  process.exit(1);
}

console.log(
  `  Verified <html lang> on ${localised} localised pages and ${english} English pages`,
);
