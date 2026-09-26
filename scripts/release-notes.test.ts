import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { normaliseVersion, sectionFor } from './release-notes.mjs';

const changelog = readFileSync(
  path.join(import.meta.dirname, '..', 'CHANGELOG.md'),
  'utf8',
);

const sample = [
  '# Changelog',
  '',
  'Preamble that belongs to no release.',
  '',
  '## 2.0.0 — 2026-10-01',
  '',
  'The newer one.',
  '',
  '### A subheading inside it',
  '',
  'Still the newer one.',
  '',
  '## 1.0.0 — 2026-09-25',
  '',
  'The older one.',
  '',
].join('\n');

describe('reading the notes for a version', () => {
  it('returns the body under that heading', () => {
    expect(sectionFor(sample, '1.0.0')).toBe('The older one.');
  });

  /**
   * `### ` headings are a release's own structure. Ending a section at any `#`
   * would truncate the notes at the first subheading and publish half of them.
   */
  it('keeps subheadings inside the section', () => {
    expect(sectionFor(sample, '2.0.0')).toBe(
      [
        'The newer one.',
        '',
        '### A subheading inside it',
        '',
        'Still the newer one.',
      ].join('\n'),
    );
  });

  it('stops at the next release rather than running on', () => {
    expect(sectionFor(sample, '2.0.0')).not.toContain('The older one.');
  });

  it('never returns the preamble', () => {
    expect(sectionFor(sample, '1.0.0')).not.toContain('Preamble');
    expect(sectionFor(sample, '2.0.0')).not.toContain('Preamble');
  });

  /**
   * `GITHUB_REF_NAME` hands the workflow `v1.0.0`, and the heading says
   * `1.0.0`. If these did not meet, every release would fail.
   */
  it('accepts the tag exactly as the workflow receives it', () => {
    expect(sectionFor(sample, 'v1.0.0')).toBe('The older one.');
    expect(sectionFor(sample, 'V1.0.0')).toBe('The older one.');
  });

  it('reads the last section in the file, which has no heading after it', () => {
    expect(sectionFor(`## 0.1.0\n\nOnly one.\n`, '0.1.0')).toBe('Only one.');
  });

  it('matches a bracketed heading, in case the style changes', () => {
    expect(sectionFor('## [1.2.3] - 2026-01-01\n\nBody.\n', '1.2.3')).toBe(
      'Body.',
    );
  });

  it('does not match a different version that starts the same way', () => {
    const notes = '## 1.0.0\n\nOne.\n\n## 1.0.0-rc.1\n\nCandidate.\n';
    expect(sectionFor(notes, '1.0.0')).toBe('One.');
    expect(sectionFor(notes, '1.0.0-rc.1')).toBe('Candidate.');
  });

  it('does not match an unrelated heading', () => {
    expect(sectionFor('## Unreleased\n\nNotes.\n', '1.0.0')).toBeUndefined();
  });
});

describe('when there is nothing to publish', () => {
  /**
   * The load-bearing half. If a missing section returned an empty string
   * instead, the workflow would publish an empty release rather than fail —
   * which is the failure this whole script exists to prevent.
   */
  it('is undefined for a version with no section', () => {
    expect(sectionFor(sample, '3.0.0')).toBeUndefined();
    expect(sectionFor('', '1.0.0')).toBeUndefined();
  });

  it('is undefined when no version was asked for', () => {
    expect(sectionFor(sample, '')).toBeUndefined();
    expect(sectionFor(sample, undefined)).toBeUndefined();
  });
});

describe('normalising a version', () => {
  it('strips the tag prefix, brackets and surrounding space', () => {
    expect(normaliseVersion(' v1.2.3 ')).toBe('1.2.3');
    expect(normaliseVersion('[1.2.3]')).toBe('1.2.3');
    expect(normaliseVersion('1.2.3')).toBe('1.2.3');
  });

  it('is empty for nothing at all', () => {
    expect(normaliseVersion(undefined)).toBe('');
    expect(normaliseVersion('')).toBe('');
  });
});

describe('the changelog in this repository', () => {
  /** Every `## ` heading, newest first, as the release job would read them. */
  const headings = [...changelog.matchAll(/^##[ \t]+(\S+)/gmu)].map(
    (match) => match[1],
  );

  it('has at least one release section', () => {
    expect(headings.length).toBeGreaterThan(0);
  });

  /**
   * Every heading has to be a version the release job can match against a tag.
   * A section titled `Unreleased` or `Next` reads fine to a human and is
   * invisible to `gh release create`, so the tag it was written for would
   * publish nothing.
   */
  it('heads every section with a version a tag can match', () => {
    for (const heading of headings) {
      expect(
        normaliseVersion(heading),
        `"## ${heading}" is not a version, so no tag will ever find it`,
      ).toMatch(/^\d+\.\d+\.\d+/u);
    }
  });

  it('gives the newest release real notes rather than a placeholder', () => {
    expect(String(sectionFor(changelog, headings[0])).length).toBeGreaterThan(
      200,
    );
  });

  /**
   * The notes are published under the project's name, so a section that exists
   * but is empty is the failure this whole script was written to prevent.
   */
  it('leaves no section empty', () => {
    for (const heading of headings) {
      expect(
        sectionFor(changelog, heading),
        `"## ${heading}" is empty`,
      ).toBeTruthy();
    }
  });
});
