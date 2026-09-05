import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputDirectory = path.join(projectRoot, 'release');
const outputPath = path.join(outputDirectory, 'sbom.cdx.json');
const result = spawnSync(
  'npm',
  ['sbom', '--sbom-format', 'cyclonedx', '--package-lock-only'],
  {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || 'npm sbom failed\n');
  process.exit(result.status ?? 1);
}

const sbom = JSON.parse(result.stdout);
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');

process.stdout.write(
  `${JSON.stringify(
    {
      output: path.relative(projectRoot, outputPath),
      format: sbom.bomFormat,
      specificationVersion: sbom.specVersion,
      components: Array.isArray(sbom.components) ? sbom.components.length : 0,
    },
    null,
    2,
  )}\n`,
);
