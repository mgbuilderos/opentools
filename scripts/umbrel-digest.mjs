#!/usr/bin/env node
/**
 * Pin `packaging/umbrel/docker-compose.yml` to the published image's digest.
 *
 *   node scripts/umbrel-digest.mjs            # the version CHANGELOG.md names
 *   node scripts/umbrel-digest.mjs v0.2.0     # a specific one
 *   node scripts/umbrel-digest.mjs --check    # print, change nothing
 *
 * **Why this is a script and not a line in a runbook.** Umbrel is the only
 * catalogue that requires `repo:tag@sha256:<digest>`, and the digest cannot
 * exist until the release is published, so the manifest necessarily ships with
 * a placeholder and is corrected afterwards. A step that happens after the
 * interesting part of a release, by hand, from a command someone has to find,
 * is a step that gets skipped -- and skipping it is silent, because the file
 * stays valid YAML naming a real image.
 *
 * **Why it refuses rather than guesses.** If the tag is not published, there is
 * no digest to write and the only safe thing is to stop. Writing anything else
 * would produce a manifest that passes every check here and installs for
 * nobody.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'mgbuilderos/opentools';
const REGISTRY = 'https://ghcr.io';
const MANIFEST_PATH = 'packaging/umbrel/docker-compose.yml';
/** Umbrel requires both, and rejects an image that is missing either. */
const REQUIRED_PLATFORMS = ['amd64', 'arm64'];

const projectRoot = path.join(import.meta.dirname, '..');

/**
 * The version a bare invocation means: the newest section of the changelog,
 * which is the same thing the release workflow builds from.
 */
export function newestChangelogVersion(changelog) {
  const heading = String(changelog).match(/^## v?(\d+\.\d+\.\d+\S*)/mu);
  return heading?.[1];
}

/**
 * `source` with the Umbrel image's digest replaced, leaving the tag alone.
 *
 * Returns `undefined` when the file has no digest-pinned reference to this
 * repository, which means the manifest changed shape and a blind regex
 * substitution would be the wrong tool.
 */
export function withDigest(source, digest) {
  const reference = new RegExp(
    `(ghcr\\.io/${REPOSITORY}:[A-Za-z0-9._-]+@)sha256:[0-9a-f]{64}`,
    'u',
  );
  if (!reference.test(source)) return undefined;
  return source.replace(reference, `$1${digest}`);
}

async function anonymousToken() {
  const url = `${REGISTRY}/token?scope=repository:${REPOSITORY}:pull&service=ghcr.io`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`token request failed: ${response.status}`);
  return (await response.json()).token;
}

/**
 * The multi-arch manifest digest for a tag, as the registry reports it, plus
 * the platforms inside it. Umbrel wants the index digest rather than any one
 * architecture's, which is why this reads the header rather than hashing a
 * per-platform manifest.
 */
async function publishedIndex(tag) {
  const token = await anonymousToken();
  const response = await fetch(
    `${REGISTRY}/v2/${REPOSITORY}/manifests/${tag}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        accept: [
          'application/vnd.oci.image.index.v1+json',
          'application/vnd.docker.distribution.manifest.list.v2+json',
        ].join(', '),
      },
    },
  );
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`registry said ${response.status}`);

  const digest = response.headers.get('docker-content-digest');
  const body = await response.json();
  const platforms = (body.manifests ?? [])
    .map((entry) => entry.platform?.architecture)
    .filter((architecture) => architecture && architecture !== 'unknown');
  return { digest, platforms };
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const requested = args.find((argument) => !argument.startsWith('--'));
  const version =
    requested?.replace(/^v/iu, '') ??
    newestChangelogVersion(
      readFileSync(path.join(projectRoot, 'CHANGELOG.md')),
    );

  if (!version) {
    process.stderr.write('No version given and CHANGELOG.md names none.\n');
    process.exit(1);
  }

  const index = await publishedIndex(version);

  if (!index) {
    process.stderr.write(
      `ghcr.io/${REPOSITORY}:${version} is not published, so there is no ` +
        `digest to pin.\nPush the v${version} tag and let the self-host image ` +
        `workflow finish, then run this again.\n`,
    );
    process.exit(1);
  }

  const missing = REQUIRED_PLATFORMS.filter(
    (architecture) => !index.platforms.includes(architecture),
  );
  if (missing.length > 0) {
    process.stderr.write(
      `ghcr.io/${REPOSITORY}:${version} is missing ${missing.join(' and ')}, ` +
        `which Umbrel requires. Found: ` +
        `${index.platforms.join(', ') || 'none'}.\n`,
    );
    process.exit(1);
  }

  const absolute = path.join(projectRoot, MANIFEST_PATH);
  const updated = withDigest(readFileSync(absolute, 'utf8'), index.digest);
  if (!updated) {
    process.stderr.write(
      `${MANIFEST_PATH} has no digest-pinned ghcr.io/${REPOSITORY} reference ` +
        `to replace. Fix it by hand rather than letting this guess.\n`,
    );
    process.exit(1);
  }

  process.stdout.write(
    `${version}  ${index.digest}  (${index.platforms.join(', ')})\n`,
  );
  if (checkOnly) return;

  writeFileSync(absolute, updated);
  process.stdout.write(`Wrote it into ${MANIFEST_PATH}. Run npm test.\n`);
}

/* Importing this for its exported helpers must not run the command. */
const runAsCommand =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runAsCommand) await main();
