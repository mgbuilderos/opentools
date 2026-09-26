import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * App-store manifests are copies of facts that live elsewhere: the image name,
 * the port inside the container, the version being released. No store's own
 * validator catches a manifest that is internally valid and points at the wrong
 * thing, and nobody opens these files again until a submission is rejected.
 *
 * Every check here is a mistake that was actually made in this directory rather
 * than one that was imagined: manifests left pinned to a superseded release, an
 * Umbrel image without the digest that store requires, and a CasaOS manifest
 * missing the single field its validator hard-fails on.
 */

const projectRoot = path.resolve(import.meta.dirname, '..');
const imageRepository = 'ghcr.io/mgbuilderos/opentools';
/** The port the image listens on, set by `PORT` in the Dockerfile. */
const internalPort = '8796';
/** Umbrel requires a digest pin; this is the stand-in until one is published. */
const placeholderDigest = `sha256:${'0'.repeat(64)}`;

/** Every file that names the image, and so can name it wrongly. */
const manifests = [
  'docker-compose.yml',
  'packaging/casaos/docker-compose.yml',
  'packaging/portainer/template.json',
  'packaging/runtipi/docker-compose.yml',
  'packaging/umbrel/docker-compose.yml',
  'packaging/unraid/opentools.xml',
];

/**
 * Files that restate the release in a metadata field of their own, where a
 * store shows it to somebody deciding whether to install. The Umbrel compose
 * file is absent on purpose: it carries the version only inside the image
 * reference, which the tag check already covers.
 */
const versionedManifests = [
  'packaging/casaos/docker-compose.yml',
  'packaging/runtipi/config.json',
  'packaging/umbrel/umbrel-app.yml',
];

function read(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

/**
 * The release these manifests belong to: the newest section of `CHANGELOG.md`.
 *
 * Not `package.json`, which this project deliberately leaves behind the
 * release, and not a constant here, which would be one more copy to forget.
 * The changelog is the file `.github/workflows/selfhost-image.yml` already
 * reads to build the release, so a manifest agreeing with it agrees with what
 * is actually published.
 */
function releasedVersion(): string {
  const heading = read('CHANGELOG.md').match(/^## v?(\d+\.\d+\.\d+\S*)/mu);
  if (!heading) throw new Error('CHANGELOG.md has no version heading');
  return heading[1];
}

/** Image references, with any tag and any digest, as written in the file. */
function imageReferences(source: string): string[] {
  const pattern =
    /ghcr\.io\/[a-z0-9._\-/]+(?::[A-Za-z0-9._-]+)?(?:@sha256:[0-9a-f]{64})?/gu;
  return source.match(pattern) ?? [];
}

describe('app-store packaging manifests', () => {
  it('name only the published image repository', () => {
    for (const relativePath of manifests) {
      const references = imageReferences(read(relativePath));
      expect(
        references.length,
        `${relativePath} names no image`,
      ).toBeGreaterThan(0);
      for (const reference of references) {
        expect(reference, relativePath).toMatch(
          new RegExp(`^${imageRepository}(?::|@|$)`, 'u'),
        );
      }
    }
  });

  it('pin either the current release or a moving tag, never a stale one', () => {
    const version = releasedVersion();
    for (const relativePath of manifests) {
      for (const reference of imageReferences(read(relativePath))) {
        const tag = reference.slice(imageRepository.length + 1).split('@')[0];
        // `latest` is deliberate where a store's update check follows a moving
        // tag; a pinned digest there would read as permanently up to date.
        if (tag === 'latest') continue;
        expect(tag, `${relativePath} pins a superseded release`).toBe(version);
      }
    }
  });

  it('restate the current release and nothing older', () => {
    const version = releasedVersion();
    for (const relativePath of versionedManifests) {
      const source = read(relativePath);
      const declared = source.match(/"?version"?:\s*"([0-9][^"]*)"/u);
      expect(declared, `${relativePath} declares no version`).not.toBeNull();
      expect(declared?.[1], relativePath).toBe(version);
    }
  });

  it('agree on the port inside the container', () => {
    for (const relativePath of manifests) {
      expect(read(relativePath), relativePath).toContain(internalPort);
    }
  });

  it('keep the Umbrel image pinned to a digest', () => {
    // Umbrel rejects a moving tag outright and wants the multi-arch manifest
    // digest, so this one reference always carries one -- the placeholder
    // before a release, a real digest after it.
    const [reference] = imageReferences(
      read('packaging/umbrel/docker-compose.yml'),
    );
    expect(reference).toMatch(/@sha256:[0-9a-f]{64}$/u);
  });

  it('do not mix a real digest with the placeholder', () => {
    // Guards the half-finished state: a release that filled in one digest and
    // left another behind would install for nobody and fail no other check.
    const digests = new Set<string>();
    for (const relativePath of manifests) {
      for (const match of read(relativePath).matchAll(
        /@(sha256:[0-9a-f]{64})/gu,
      )) {
        digests.add(match[1]);
      }
    }
    if (digests.size > 0 && !digests.has(placeholderDigest)) return;
    expect([...digests]).toStrictEqual([placeholderDigest]);
  });

  it('give CasaOS the reverse-domain id its validator requires', () => {
    // The store's validator hard-fails on this one and warns about the rest,
    // and the manifest shipped without it once already.
    const id = read('packaging/casaos/docker-compose.yml').match(
      /^\s{2}id:\s*(\S+)/mu,
    );
    expect(id, 'casaos manifest declares no x-casaos id').not.toBeNull();
    expect(id?.[1]).toMatch(/^[a-z0-9]+(\.[a-z0-9-]+){2,}$/u);
  });

  it('give CasaOS the en_US strings it falls back to', () => {
    // Locale keys are case-sensitive there and `en_US` is the documented
    // fallback, so `en_us` silently leaves a listing with no text at all.
    const source = read('packaging/casaos/docker-compose.yml');
    expect(source).toContain('en_US');
    expect(source).not.toMatch(/\ben_us\b/u);
  });
});
