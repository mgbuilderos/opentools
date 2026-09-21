#!/usr/bin/env node
/**
 * Builds lib/seo/guide-keep-list.ts from a Search Console performance export.
 *
 *   npm run seo:guide-keep-list -- <export.zip | Pages.csv> [options]
 *
 * Options:
 *   --queries <Queries.csv>   Site-wide queries, used only as review evidence
 *                             (read from the ZIP when not given).
 *   --dry-run                 Print the selection; do not write the file.
 *   --min-clicks <n>          Override MIN_CLICKS for this run.
 *   --min-impressions <n>     Override MIN_IMPRESSIONS for this run.
 *   --max-kept <n>            Override MAX_KEPT_GUIDES for this run.
 *
 * `distinct` entries already in the keep list are preserved; `traffic` entries
 * are recomputed. Nothing is enabled by this script: flipping
 * GUIDE_CONSOLIDATION_ENABLED is a separate, reviewed change
 * (docs/seo/guide-consolidation.md).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { runnerImport } from 'vite';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const keepListPath = path.join(appRoot, 'lib/seo/guide-keep-list.ts');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    queries: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'min-clicks': { type: 'string' },
    'min-impressions': { type: 'string' },
    'max-kept': { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || positionals.length !== 1) {
  process.stdout.write(
    'Usage: npm run seo:guide-keep-list -- <export.zip | Pages.csv> [--queries Queries.csv] [--dry-run] [--min-clicks n] [--min-impressions n] [--max-kept n]\n',
  );
  process.exit(values.help ? 0 : 2);
}

/** Loads a TypeScript module the way the app resolves it (`@/` alias). */
async function load(relativePath) {
  const { module } = await runnerImport(path.join(appRoot, relativePath), {
    configFile: false,
    root: appRoot,
    logLevel: 'error',
    resolve: { alias: { '@': appRoot } },
  });
  return module;
}

const [selection, zip, liveTools, keepList] = await Promise.all([
  load('scripts/guide-keep-list/selection.ts'),
  load('scripts/guide-keep-list/zip.ts'),
  load('lib/seo/live-tools.ts'),
  load('lib/seo/guide-keep-list.ts'),
]);

const inputPath = path.resolve(positionals[0]);
const input = readFileSync(inputPath);
const decode = (bytes) => new TextDecoder().decode(bytes);

let pagesCsv;
let queriesCsv;
let filters = {};
if (inputPath.toLowerCase().endsWith('.zip')) {
  const entries = zip.readZipEntries(input);
  const pages = zip.findZipEntry(entries, 'Pages.csv');
  if (!pages) {
    throw new Error(
      `${path.basename(inputPath)} has no Pages.csv. Export from Performance > Search results with the Pages tab available.`,
    );
  }
  pagesCsv = decode(pages);
  const queries = zip.findZipEntry(entries, 'Queries.csv');
  if (queries) queriesCsv = decode(queries);
  const filterFile = zip.findZipEntry(entries, 'Filters.csv');
  if (filterFile) filters = selection.parseFiltersCsv(decode(filterFile));
} else {
  pagesCsv = decode(input);
}
if (values.queries) queriesCsv = readFileSync(values.queries, 'utf8');

const number = (value, fallback, flag) => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a whole number, got "${value}"`);
  }
  return parsed;
};
const thresholds = {
  minClicks: number(values['min-clicks'], selection.MIN_CLICKS, '--min-clicks'),
  minImpressions: number(
    values['min-impressions'],
    selection.MIN_IMPRESSIONS,
    '--min-impressions',
  ),
  maxKept: number(values['max-kept'], selection.MAX_KEPT_GUIDES, '--max-kept'),
};

const catalog = liveTools.LIVE_TOOL_CATALOG;
const result = selection.selectKeepList({
  pages: selection.parsePagesCsv(pagesCsv),
  liveSlugs: new Set(catalog.map((tool) => tool.slug)),
  distinct: keepList.GUIDE_KEEP_LIST,
  queries: queriesCsv ? selection.parseQueriesCsv(queriesCsv) : undefined,
  toolNames: new Map(catalog.map((tool) => [tool.slug, tool.name])),
  thresholds,
});

const out = (line = '') => process.stdout.write(`${line}\n`);
const warnings = [];
if (filters['Search type'] && filters['Search type'] !== 'Web') {
  warnings.push(`Search type is "${filters['Search type']}", expected "Web".`);
}
if (filters.Date && !/(3|6|12|16) months/iu.test(filters.Date)) {
  warnings.push(
    `Date range is "${filters.Date}"; export at least the last 3 months.`,
  );
}
if (!filters.Date) {
  warnings.push(
    'No Filters.csv: confirm the export covers at least 3 months of Web search.',
  );
}
for (const slug of result.distinctNotLive) {
  warnings.push(`distinct guide "${slug}" is no longer live and was dropped.`);
}

out(`Export: ${path.basename(inputPath)}`);
for (const [key, value] of Object.entries(filters)) out(`  ${key}: ${value}`);
out(
  `Thresholds: >= ${thresholds.minClicks} clicks or >= ${thresholds.minImpressions} impressions; at most ${thresholds.maxKept} kept guides.`,
);
out(`Live guides today: ${catalog.length}`);
out();
out(`Kept (${result.entries.length}):`);
for (const entry of result.entries) {
  out(`  [${entry.reason}] ${entry.slug} - ${entry.evidence}`);
}
out();
out(
  `Would redirect to their tool page: ${catalog.length - result.entries.length} guides`,
);
out(`Below both thresholds (in export): ${result.belowThreshold}`);
out(`In export but not live (already 404): ${result.notLive.length}`);
if (result.overCap.length > 0) {
  out(`Qualified but over the cap (${result.overCap.length}):`);
  for (const guide of result.overCap) {
    out(
      `  ${guide.slug} - ${guide.clicks} clicks, ${guide.impressions} impressions`,
    );
  }
}
for (const warning of warnings) out(`WARNING: ${warning}`);

if (values['dry-run']) {
  out();
  out('Dry run: lib/seo/guide-keep-list.ts not written.');
  process.exit(0);
}

const source = [
  path.basename(inputPath),
  filters.Date,
  filters['Search type'],
  `thresholds ${thresholds.minClicks} clicks / ${thresholds.minImpressions} impressions / max ${thresholds.maxKept}`,
  new Date().toISOString().slice(0, 10),
]
  .filter(Boolean)
  .join(', ');
writeFileSync(
  keepListPath,
  selection.renderKeepListModule(result.entries, source),
);
const format = spawnSync(
  process.execPath,
  [path.join(appRoot, 'node_modules/oxfmt/bin/oxfmt'), keepListPath],
  { cwd: appRoot, stdio: 'inherit' },
);
if (format.status !== 0) {
  process.stderr.write(
    'oxfmt failed; run `npm run format` before committing.\n',
  );
}
out();
out(
  `Wrote ${path.relative(appRoot, keepListPath)}. Review the diff, then follow docs/seo/guide-consolidation.md.`,
);
