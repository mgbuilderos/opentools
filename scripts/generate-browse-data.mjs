#!/usr/bin/env node
/**
 * Regenerates `lib/tools/browse/*.ts` from `toolSubsectionsForGroup`.
 *
 * `lib/tools/browse.ts` has always described those seventeen files as
 * generated, and `browse.test.ts` has always failed when one of them drifted
 * from the catalogue — but there was no command that did the generating, so
 * "regenerate" meant editing seventeen files by hand against a failing deep
 * equality assertion. Renaming a single operation was enough to send someone
 * into that. This is the missing half: the test says when they have drifted,
 * and this says how to put them back.
 *
 * Only the data matters — `browse.test.ts` compares parsed JSON, not text —
 * so the output is deliberately plain and `npm run format` settles the rest.
 *
 * Static specifier, same as `generate-live-tool-routes.mjs`: a computed import
 * path is too dynamic for vite-node, so run this with
 * `npx tsx scripts/generate-browse-data.mjs`.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'lib/tools/browse');

const { toolGroups, toolSubsectionsForGroup } =
  await import('../lib/tools/catalog.ts');

const HEADER = [
  '// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,',
  '// and browse.test.ts, which fails if this file drifts from the catalogue.',
  '//',
  '// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.',
  "import type { BrowseSection } from '../browse';",
  '',
  'export const SECTIONS: readonly BrowseSection[] = ',
].join('\n');

let written = 0;
let destinations = 0;

for (const group of toolGroups) {
  const sections = toolSubsectionsForGroup(group);
  destinations += sections.reduce(
    (total, section) => total + section.destinations.length,
    0,
  );
  // Round-tripped through JSON so the emitted literal holds exactly the own,
  // serialisable properties the test compares, and nothing else.
  const body = JSON.stringify(JSON.parse(JSON.stringify(sections)), null, 2);
  writeFileSync(
    path.join(OUT, `${group.id}.ts`),
    `${HEADER}${body};\n`,
    'utf8',
  );
  written += 1;
}

process.stdout.write(
  `browse data: ${written} categories, ${destinations} destinations\n`,
);
