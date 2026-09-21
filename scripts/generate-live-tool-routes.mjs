#!/usr/bin/env node
/**
 * Regenerates `lib/seo/live-tool-routes.ts` from `lib/seo/live-tools.ts`.
 *
 * The light copy exists so `smart-dropzone.tsx` can answer "is this URL a real
 * tool" without importing all eighteen workbench operation modules and dragging
 * the whole catalogue onto every page that accepts a file. It was being kept in
 * step by hand, with only `live-tool-routes.test.ts` to catch the drift -- which
 * it duly did, the first time a change added routes. This makes regenerating it
 * a command instead of a transcription.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TARGET = path.join(ROOT, 'lib/seo/live-tool-routes.ts');

// Static specifier: a computed import path is "too dynamic" for vite-node, so
// run this with `npx tsx scripts/generate-live-tool-routes.mjs`.
const { LIVE_TOOL_ROUTES, operationIdsForRoute } =
  await import('../lib/seo/live-tools.ts');

const routes = LIVE_TOOL_ROUTES.map((route) => `  '${route}',`).join('\n');

const entries = LIVE_TOOL_ROUTES.flatMap((route) => {
  const ids = operationIdsForRoute(route);
  if (!ids) return [];
  const body = [...ids].map((id) => `          '${id}',`).join('\n');
  return [
    `      [\n        '${route}',\n        [\n${body}\n        ],\n      ],`,
  ];
}).join('\n');

const source = readFileSync(TARGET, 'utf8');
const next = source
  .replace(
    /(export const LIVE_TOOL_ROUTES: readonly string\[\] = \[\n)[\s\S]*?(\n\];)/u,
    (_m, a, b) => `${a}${routes}${b}`,
  )
  .replace(
    /(const OPERATION_IDS_BY_ROUTE = new Map<string, ReadonlySet<string>>\(\n  \(\n    \[\n)[\s\S]*?(\n    \])/u,
    (_m, a, b) => `${a}${entries}${b}`,
  );

writeFileSync(TARGET, next);

// Format what we just wrote. Without this the generated file fails the FORMAT
// gate, which is how it shipped unformatted the first time: the generator ran
// after the last `npm run format` of the session, so nothing caught it.
execFileSync(path.join(ROOT, 'node_modules/.bin/oxfmt'), [TARGET], {
  cwd: ROOT,
  stdio: 'inherit',
});

console.log(
  `live-tool-routes.ts: ${LIVE_TOOL_ROUTES.length} routes, ` +
    `${LIVE_TOOL_ROUTES.filter((r) => operationIdsForRoute(r)).length} with operation ids`,
);
