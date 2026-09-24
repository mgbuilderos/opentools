#!/usr/bin/env node
/**
 * Give every sitemap URL a `lastmod` that is true.
 *
 * WHY. Google uses `lastmod` to decide what to recrawl first, and on
 * 2026-09-23 only 31 of this site's 1,392 entries carried one. The other 1,361
 * gave the crawler nothing to prioritise on, which is part of why 552 URLs sit
 * in Search Console as "not indexed".
 *
 * WHY NOT `Date.now()`. It is the obvious shortcut and it is worse than having
 * no lastmod at all. Stamping the build time on every URL tells Google that
 * all 1,392 pages changed on every deploy; once that turns out to be false,
 * Google stops believing the field for this domain and the signal is gone for
 * good. Google's own documentation says a lastmod it does not trust is
 * ignored. So this date has to come from something that only moves when the
 * page's content really moves.
 *
 * WHERE THE DATE COMES FROM. The commit date of the source that renders the
 * page: its own `page.tsx`, plus every module in this repository that file
 * imports directly. `/creator/caption-generator` therefore takes the newest of
 * `app/creator/[tool]/page.tsx`, `components/creator-workbench-tool.tsx` and
 * `lib/tools/creator-workbench.ts` -- change any of the three and that page's
 * bytes really do change, so the date really did move.
 *
 * One level of imports, not the whole graph, and that is a deliberate ceiling:
 * at depth three practically every page on this site reaches practically every
 * module, so every URL would carry one identical date and the field would be
 * back to saying nothing. One level is coarse -- a change to a shared workbench
 * module moves the date on all of its tool pages at once -- but it is never
 * *wrong*, because when that module changes those pages genuinely re-render
 * differently. Coarse and true is the trade this file is making; precise and
 * invented is the one it refuses.
 *
 * Blog posts are the exception and keep their own `publishedAt`, which is a
 * real editorial date rather than an inference from the code. That stays in
 * `lib/seo/sitemap-entries.ts` where it already was.
 *
 *   node scripts/build-sitemap-lastmod.mjs            # rewrite the generated map
 *   node scripts/build-sitemap-lastmod.mjs --check    # fail if it is stale
 *
 * Run it after adding routes or changing page sources, and commit the result.
 * `lib/seo/sitemap-lastmod.test.ts` fails when the map has drifted from the
 * sitemap, so a forgotten run does not ship silently.
 *
 * It needs the route list, which only the TypeScript modules can expand
 * (`[tool]`, `[slug]` and `[pair]` stand for 1,300-odd URLs between them), so
 * it reads `dist/client/sitemap.xml` from the last build rather than
 * reimplementing that expansion and getting it subtly different.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'app');
const SITEMAP = path.join(ROOT, 'dist/client/sitemap.xml');
const OUT = path.join(ROOT, 'lib/seo/sitemap-lastmod.generated.ts');
const CHECK_ONLY = process.argv.includes('--check');

function fail(message) {
  console.error(`\n  build-sitemap-lastmod: ${message}\n`);
  process.exit(1);
}

if (!existsSync(SITEMAP)) {
  fail(
    'dist/client/sitemap.xml is missing. Run `npm run build` first -- the\n' +
      '  route list comes from the built sitemap, not from a second copy of\n' +
      '  the route expansion logic.',
  );
}

const routes = [
  ...readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g),
].map((match) => new URL(match[1]).pathname.replace(/\/$/, '') || '/');

if (routes.length === 0) fail('the built sitemap is empty.');

/* ---------------------------------------------------------------- git dates */

/**
 * The last commit that touched each tracked path, in one pass.
 *
 * `git log` is newest-first, so the first time a path appears is its most
 * recent change. One process beats one `git log` per file: there are a few
 * hundred distinct source files behind these routes, and per-file invocation
 * took longer than the rest of this script put together.
 *
 * Renames are not followed (`--no-renames`): a moved file is a changed page as
 * far as a crawler is concerned, and following the rename would report the old
 * location's older date.
 */
function lastCommitDates() {
  let log;
  try {
    log = execFileSync(
      'git',
      [
        '-C',
        ROOT,
        'log',
        '--no-merges',
        '--no-renames',
        '--date-order',
        '--format=%x01%cI',
        '--name-only',
      ],
      { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
    );
  } catch (error) {
    fail(
      `git log failed: ${error.message}\n` +
        '  This script needs repository history to date anything. In a shallow\n' +
        '  or export-only checkout, keep the committed generated file instead\n' +
        '  of regenerating it.',
    );
  }

  const dates = new Map();
  let current;
  for (const line of log.split('\n')) {
    if (line.startsWith('')) {
      current = line.slice(1).trim();
    } else if (line && current && !dates.has(line)) {
      dates.set(line, current);
    }
  }
  return dates;
}

/* ------------------------------------------------------- route -> page file */

const APP_ENTRIES = new Map();
function entriesOf(directory) {
  const cached = APP_ENTRIES.get(directory);
  if (cached) return cached;
  const listed = existsSync(directory) ? readdirSync(directory) : [];
  APP_ENTRIES.set(directory, listed);
  return listed;
}

/**
 * `/creator/caption-generator` -> `app/creator/[tool]/page.tsx`.
 *
 * A literal segment always wins over a dynamic one, which is the same
 * precedence the router applies -- `app/pdf/merge` and `app/pdf/[tool]` both
 * exist here, and `/pdf/merge` must resolve to the folder.
 */
function pageFileFor(route) {
  let directory = APP;
  const segments = route === '/' ? [] : route.slice(1).split('/');
  for (const segment of segments) {
    const literal = path.join(directory, segment);
    if (existsSync(literal) && statSync(literal).isDirectory()) {
      directory = literal;
      continue;
    }
    const dynamic = entriesOf(directory).find((entry) => entry.startsWith('['));
    if (!dynamic) return undefined;
    directory = path.join(directory, dynamic);
  }
  const page = path.join(directory, 'page.tsx');
  return existsSync(page) ? page : undefined;
}

/* --------------------------------------------- page file -> its own sources */

const IMPORTS = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*'([^']+)'/g;

/**
 * Modules whose commit date must not become a page's `lastmod`.
 *
 * This list is the difference between a useful field and a useless one. The
 * first run of this script dated 1,387 of 1,392 URLs to the same minute,
 * because `app-shell.tsx` -- the chrome every page is wrapped in -- had been
 * committed that afternoon. Every one of those dates was *true*: the pages'
 * bytes really had changed. It was still worthless, and worse than worthless
 * going forward, because it means every future tweak to the header or the
 * footer republishes all 1,392 URLs as freshly changed. That is the same
 * pathology as `Date.now()`, arriving by a different route.
 *
 * Google asks for the date of the last *significant* content change and says
 * plainly that it ignores a lastmod it finds unreliable. Boilerplate that
 * renders identically on every page is not a content change to the page, so
 * these are excluded:
 *
 *  - the site shell and design primitives: same markup on all 1,392 URLs;
 *  - the route registries: they decide which pages exist, not what any page
 *    says. Adding a tool elsewhere must not redate every existing tool.
 *
 * Nothing that carries a page's own words belongs here. `guide-content.ts` and
 * `tool-catalog-data.ts` are deliberately absent: they hold the text readers
 * see, so when they change the affected pages really did change.
 */
const CHROME = new Set([
  'components/app-shell.tsx',
  'components/ui/button.tsx',
  'lib/utils.ts',
  'lib/seo/live-tools.ts',
  'lib/seo/live-tool-routes.ts',
  // Title and description tables read by every tool page. Rewording one tool's
  // description must not claim that all 1,413 pages changed -- which is what
  // happened on the 2026-09-23 release, where a metadata pass across ~58 files
  // gave the whole site a single date and the guard below rejected it. These
  // hold search-facing metadata, not the words a reader sees on the page.
  'lib/seo/tool-search-copy.ts',
  'lib/seo/hub-tool-meta.ts',
  'lib/seo/meta-inventory.ts',
  'lib/seo/tool-page-depth.ts',
  'lib/seo/tool-page-depth-pdf.ts',
  'lib/seo/tool-page-depth-image.ts',
  'lib/seo/tool-page-depth-types.ts',
  'components/page-depth-content.tsx',
  'components/page-depth-provider.tsx',
]);

/** Resolve one import specifier to a file in this repository, or nothing. */
function resolveImport(specifier, fromFile) {
  let base;
  if (specifier.startsWith('@/')) base = path.join(ROOT, specifier.slice(2));
  else if (specifier.startsWith('.'))
    base = path.resolve(path.dirname(fromFile), specifier);
  else return undefined; // a package, which package-lock.json already dates

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}

/** The page file and everything in this repo it imports directly. */
function sourcesFor(pageFile) {
  const sources = new Set([pageFile]);
  const text = readFileSync(pageFile, 'utf8');
  for (const match of text.matchAll(IMPORTS)) {
    const resolved = resolveImport(match[1], pageFile);
    if (resolved) sources.add(resolved);
  }
  return [...sources]
    .map((file) => path.relative(ROOT, file))
    .filter((relative) => !CHROME.has(relative));
}

/* ------------------------------------------------------------------- output */

const dates = lastCommitDates();
const headDate = execFileSync(
  'git',
  ['-C', ROOT, 'log', '-1', '--format=%cI'],
  { encoding: 'utf8' },
).trim();
const sourceCache = new Map();
const lastmod = {};
const undated = [];

for (const route of routes) {
  const pageFile = pageFileFor(route);
  if (!pageFile) {
    undated.push(route);
    continue;
  }
  if (!sourceCache.has(pageFile))
    sourceCache.set(pageFile, sourcesFor(pageFile));

  let newest;
  for (const relative of sourceCache.get(pageFile)) {
    const date = dates.get(relative);
    if (date && (!newest || date > newest)) newest = date;
  }
  if (!newest && headDate) newest = headDate;
  if (newest) lastmod[route] = newest;
  else undated.push(route);
}

const covered = Object.keys(lastmod).length;

if (CHECK_ONLY) {
  const existing = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  const stale = routes.filter((route) => !existing.includes(`'${route}':`));
  if (stale.length > 0) {
    fail(
      `${stale.length} sitemap routes are missing from the generated map.\n` +
        '  Run `npm run sitemap:lastmod` and commit the result.\n\n' +
        stale
          .slice(0, 10)
          .map((route) => `    ${route}`)
          .join('\n'),
    );
  }
  console.log(`  sitemap lastmod map is current for ${routes.length} routes`);
  process.exit(0);
}

const body = Object.keys(lastmod)
  .sort()
  .map((route) => `  '${route}': '${lastmod[route]}',`)
  .join('\n');

writeFileSync(
  OUT,
  `// GENERATED by scripts/build-sitemap-lastmod.mjs -- do not edit by hand.\n` +
    `//\n` +
    `// Each date is the commit date of the newest source file that renders\n` +
    `// that route: its own page.tsx plus the modules it imports directly.\n` +
    `// Regenerate with \`npm run sitemap:lastmod\` after a build, and commit\n` +
    `// the result. See the script for why this is not Date.now().\n` +
    `export const SITEMAP_LASTMOD: Readonly<Record<string, string>> = {\n` +
    `${body}\n};\n`,
);

/**
 * Hand the file straight to the repo formatter.
 *
 * `npm run format:check` covers `lib/`, and oxfmt wraps the longer entries
 * differently from the plain one-per-line emitted above -- so without this,
 * every regeneration left the tree failing its own format gate and the fix was
 * a second manual step that would eventually be forgotten.
 */
const formatter = path.join(ROOT, 'node_modules/.bin/oxfmt');
if (existsSync(formatter)) {
  try {
    execFileSync(formatter, [OUT], { stdio: 'ignore' });
  } catch (error) {
    console.log(`  NOTE: could not format the output (${error.message}).`);
  }
}

console.log(
  `  Wrote lastmod for ${covered} of ${routes.length} sitemap routes ` +
    `-> ${path.relative(ROOT, OUT)}`,
);

/**
 * A lastmod nearly every URL shares is a lastmod that prioritises nothing.
 * It can happen legitimately -- one commit really can regenerate every guide
 * -- so this reports rather than fails, but it is the number to look at before
 * committing the result.
 */
const byDay = new Map();
for (const value of Object.values(lastmod)) {
  const day = value.slice(0, 10);
  byDay.set(day, (byDay.get(day) ?? 0) + 1);
}
const spread = [...byDay].sort((a, b) => b[1] - a[1]);
console.log(
  `  ${byDay.size} distinct days; busiest ` +
    spread
      .slice(0, 3)
      .map(([day, count]) => `${day} (${count})`)
      .join(', '),
);
if (spread[0] && spread[0][1] / covered > 0.75) {
  console.log(
    `\n  NOTE: ${Math.round((spread[0][1] / covered) * 100)}% of URLs share ` +
      `${spread[0][0]}. Check that a shared module is not standing in for\n` +
      '  per-page content -- see the CHROME list above.',
  );
}
if (undated.length > 0) {
  console.log(
    `  ${undated.length} routes have no datable source and are left without ` +
      'a lastmod, which is the correct outcome: ' +
      undated.slice(0, 5).join(', '),
  );
}
