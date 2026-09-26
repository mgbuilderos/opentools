#!/usr/bin/env node
/**
 * Regenerates `lib/command/catalogue.generated.ts` from `buildCommandCatalogue`.
 *
 * The same arrangement `scripts/generate-browse-data.mjs` has, for the same
 * reason: the browser must not import `lib/tools/catalog.ts` or the kernel
 * manifest, so the index is written out ahead of time -- and a generated file
 * nobody regenerates is a lie with a timestamp, so `lib/command/catalogue.test.ts`
 * fails when this output drifts from the registries it came from.
 *
 * Static specifier, as in the other generators: a computed import path is too
 * dynamic for vite-node, so run this with
 * `npx tsx scripts/generate-command-index.mjs`.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'lib/command/catalogue.generated.ts');

const { NOT_OFFERED, buildCommandCatalogue } =
  await import('../lib/command/build-catalogue.ts');
const { LIVE_TOOL_ROUTES } = await import('../lib/seo/live-tools.ts');

const catalogue = buildCommandCatalogue();

// A live tool missing from the index is a tool the command bar cannot reach, and
// a box that answers "nothing here does this" about a tool that exists is worse
// than no box. The test asserts this too; failing here as well means the file is
// never written in that state.
const indexed = new Set(catalogue.map((entry) => entry.href.split('?')[0]));
const unreachable = LIVE_TOOL_ROUTES.filter(
  (route) => !indexed.has(route) && !NOT_OFFERED[route],
);
if (unreachable.length) {
  process.stderr.write(
    `command index: ${unreachable.length} live tool route(s) have no entry:\n${unreachable
      .slice(0, 20)
      .map((route) => `  ${route}`)
      .join('\n')}\n`,
  );
  process.exit(1);
}

const HEADER = [
  '// Generated from `buildCommandCatalogue` -- see lib/command/build-catalogue.ts',
  '// for why, and catalogue.test.ts, which fails if this file drifts from the',
  '// registries it was built from.',
  '//',
  '// Regenerate with `npx tsx scripts/generate-command-index.mjs`.',
  "import type { CommandCatalogueEntry } from './types';",
  '',
  'export const COMMAND_CATALOGUE: readonly CommandCatalogueEntry[] = ',
].join('\n');

// Round-tripped through JSON so the literal holds exactly the own, serialisable
// properties the test compares, and nothing else.
const body = JSON.stringify(JSON.parse(JSON.stringify(catalogue)), null, 2);
writeFileSync(OUT, `${HEADER}${body};\n`, 'utf8');

const runnable = catalogue.filter((entry) => entry.op).length;
process.stdout.write(
  `command index: ${catalogue.length} tools, ${runnable} runnable as a pipeline step, ${Math.round(
    body.length / 1024,
  )} KB\n`,
);
