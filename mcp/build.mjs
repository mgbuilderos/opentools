/**
 * Bundles the server to a single runnable file, the way
 * lib/kernel/generate-manifest.mjs bundles the adapters: esbuild, the `@`
 * alias pointed at the repository root, Node platform.
 *
 * This is the "no package entry, no process boundary" pair from
 * engine/README.md closed for the MCP case — inside this repository only. It
 * publishes nothing.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
// Deliberately NOT under dist/. lib/edge-cache-headers.test.ts treats a dist/
// that exists without dist/client/_headers as a site build that dropped the
// file, which is the dangerous case it is there to catch. Writing MCP output
// into dist/ would trip that guard with an unrelated artefact.
const outDirectory = resolve(root, 'build/mcp');
const outfile = resolve(outDirectory, 'server.mjs');
const entry = resolve(outDirectory, 'entry.ts');

await mkdir(outDirectory, { recursive: true });
await writeFile(
  entry,
  `import { main } from '@/mcp/server';\nawait main(process.argv.slice(2));\n`,
  'utf8',
);

const result = await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  alias: { '@': root },
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
  metafile: true,
});

await chmod(outfile, 0o755);
const bytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0;
process.stdout.write(`Bundled ${outfile} (${Math.round(bytes / 1024)} KB)\n`);
