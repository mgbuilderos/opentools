import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { newestChangelogVersion, withDigest } from './umbrel-digest.mjs';

const projectRoot = path.join(import.meta.dirname, '..');
const manifest = readFileSync(
  path.join(projectRoot, 'packaging/umbrel/docker-compose.yml'),
  'utf8',
);
const digest = `sha256:${'a'.repeat(64)}`;

describe('newestChangelogVersion', () => {
  it('reads the top section of the real changelog', () => {
    const changelog = readFileSync(
      path.join(projectRoot, 'CHANGELOG.md'),
      'utf8',
    );
    expect(newestChangelogVersion(changelog)).toMatch(/^\d+\.\d+\.\d+/u);
  });

  it('takes the first section, not the largest version', () => {
    // Sections are newest-first, so order decides -- a release that had to be
    // numbered below its predecessor still wins by being on top.
    expect(
      newestChangelogVersion('## 0.9.0\n\nOne.\n\n## 1.0.0\n\nTwo.\n'),
    ).toBe('0.9.0');
  });

  it('accepts the v prefix the tag carries', () => {
    expect(newestChangelogVersion('## v2.3.4 — 2026-01-01\n')).toBe('2.3.4');
  });

  it('is undefined when nothing is headed by a version', () => {
    expect(newestChangelogVersion('## Unreleased\n\nNotes.\n')).toBeUndefined();
  });
});

describe('withDigest', () => {
  it('replaces the digest in the real manifest and changes nothing else', () => {
    const updated = withDigest(manifest, digest);
    expect(updated).toBeDefined();
    expect(updated).toContain(`@${digest}`);
    // The tag survives: Umbrel wants tag AND digest, not a bare digest.
    expect(updated).toMatch(
      new RegExp(`ghcr\\.io/mgbuilderos/opentools:[^@\\s]+@${digest}`, 'u'),
    );
    expect(updated?.replace(digest, '')).toBe(
      manifest.replace(/sha256:[0-9a-f]{64}/u, ''),
    );
  });

  it('leaves a manifest with no digest-pinned reference alone', () => {
    // The refusal is the point. A manifest that changed shape needs a person,
    // not a regex that writes a digest onto whatever it happened to match.
    expect(
      withDigest('image: ghcr.io/mgbuilderos/opentools:0.2.0\n', digest),
    ).toBeUndefined();
    expect(withDigest('nothing to see here\n', digest)).toBeUndefined();
  });

  it('ignores a digest belonging to some other image', () => {
    const other = `image: ghcr.io/someone/else:1.0.0@sha256:${'b'.repeat(64)}\n`;
    expect(withDigest(other, digest)).toBeUndefined();
  });
});
