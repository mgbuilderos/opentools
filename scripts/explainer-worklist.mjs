#!/usr/bin/env node
/**
 * Which tool pages still have no hand-written explainer.
 *
 *   node scripts/explainer-worklist.mjs                 # every remaining tool
 *   node scripts/explainer-worklist.mjs --batch 3       # batch 3 of --size
 *   node scripts/explainer-worklist.mjs --size 40       # tools per batch
 *   node scripts/explainer-worklist.mjs --count         # just the number
 *
 * Output is TSV: slug, id, name, category, rank, destinationUrl. The SLUG is
 * the key to write into GUIDE_DETAILS; the id is what a page passes to
 * `getToolExplainerById` at run time.
 *
 * WHY THIS EXISTS. The worklist was being carried around in a file under /tmp,
 * which is a list that is right once and silently wrong afterwards — every
 * entry written to GUIDE_DETAILS makes it staler. Deriving it from the
 * catalogue and from DIFFERENTIATED_GUIDE_SLUGS means it cannot disagree with
 * the code, and two people working in parallel cannot be handed the same tool.
 *
 * `/convert/` pages are excluded: all 512 of them get their questions from
 * `PairQuestions` in components/math-workbench-tool.tsx, generated from the
 * converter's own measured output, so they need no entry here.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { runnerImport } from 'vite';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const { values } = parseArgs({
  options: {
    batch: { type: 'string' },
    size: { type: 'string', default: '40' },
    count: { type: 'boolean', default: false },
  },
});

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

const [liveTools, guideContent] = await Promise.all([
  load('lib/seo/live-tools.ts'),
  load('lib/seo/guide-content.ts'),
]);

const covered = guideContent.DIFFERENTIATED_GUIDE_SLUGS;
const remaining = liveTools.LIVE_TOOL_CATALOG.filter(
  (tool) =>
    !covered.has(tool.slug) && !tool.destinationUrl.startsWith('/convert/'),
).toSorted(
  // `rank` is each tool's standing WITHIN its category, so ordering by rank
  // first interleaves the categories: batch 1 is the strongest tool in all
  // twenty categories, batch 2 the second-strongest, and so on. If the run
  // stops half way, every category is still covered at its top rather than
  // four categories being finished and sixteen untouched.
  (a, b) =>
    a.rank === b.rank
      ? a.category === b.category
        ? a.slug.localeCompare(b.slug)
        : a.category.localeCompare(b.category)
      : a.rank - b.rank,
);

if (values.count) {
  console.log(String(remaining.length));
  process.exit(0);
}

const size = Number(values.size);
if (!Number.isInteger(size) || size < 1) {
  console.error(`--size must be a positive integer, got ${values.size}`);
  process.exit(1);
}

let selected = remaining;
if (values.batch !== undefined) {
  const batch = Number(values.batch);
  if (!Number.isInteger(batch) || batch < 1) {
    console.error(`--batch must be a positive integer, got ${values.batch}`);
    process.exit(1);
  }
  const start = (batch - 1) * size;
  if (start >= remaining.length) {
    console.error(
      `batch ${batch} is past the end: ${remaining.length} tools remain, ` +
        `${Math.ceil(remaining.length / size)} batches of ${size}`,
    );
    process.exit(1);
  }
  selected = remaining.slice(start, start + size);
}

for (const tool of selected) {
  console.log(
    [
      tool.slug,
      tool.id,
      tool.name,
      tool.category,
      String(tool.rank),
      tool.destinationUrl,
    ].join('\t'),
  );
}
console.error(
  `${selected.length} of ${remaining.length} remaining` +
    (values.batch === undefined
      ? ` (${Math.ceil(remaining.length / size)} batches of ${size})`
      : ` — batch ${values.batch} of ${Math.ceil(remaining.length / size)}`),
);
