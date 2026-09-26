#!/usr/bin/env node
/**
 * The release notes for a tag, read out of `CHANGELOG.md`.
 *
 *   node scripts/release-notes.mjs v1.0.0    # print the 1.0.0 section
 *
 * **Why the changelog and not the tag message.** `selfhost-image.yml` creates
 * the GitHub release, so the body has to come from somewhere, and an annotated
 * tag loses on every count: it is written once at a keyboard with no review, it
 * is invisible in the pull request that ships the change, and correcting it
 * means moving a tag that an image has already been published against. A
 * section in this repository is reviewed before it is ever published under the
 * project's name.
 *
 * **Why a missing section is a hard failure.** A tag pushed with no notes would
 * otherwise publish an empty release, and the audience for these notes is
 * exactly the one that reads nothing else: somebody deciding whether to run a
 * container on their own machine, and the `awesome-selfhosted` reviewer whose
 * four-month clock starts at the first release. An empty release is worse for
 * both than a failed workflow, which is loud and takes a minute to fix.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHANGELOG = path.join(import.meta.dirname, '..', 'CHANGELOG.md');

/**
 * A tag, a heading token or a bare version, reduced to the version itself.
 *
 * Accepts the `v` prefix because that is what the tag carries and what
 * `GITHUB_REF_NAME` hands the workflow, and strips the brackets of the
 * `## [1.0.0]` style so switching the changelog to it later does not silently
 * stop matching.
 */
export function normaliseVersion(value) {
  return String(value ?? '')
    .trim()
    .replace(/^\[|\]$/gu, '')
    .replace(/^v/iu, '');
}

/**
 * The body under the `## <version>` heading, up to the next `## ` heading, or
 * `undefined` when this changelog has no section for that version.
 *
 * Only `## ` ends a section, so a release's own `### ` subheadings stay inside
 * it. The heading may carry anything after the version — `## 1.0.0 — 2026-09-25`
 * is matched on its first token — because a date there is worth keeping and
 * should not have to be parsed.
 */
export function sectionFor(changelog, version) {
  const wanted = normaliseVersion(version);
  if (wanted === '') return undefined;

  const lines = String(changelog).split('\n');
  let start = -1;

  for (const [index, line] of lines.entries()) {
    const heading = /^##[ \t]+(\S+)/u.exec(line);
    if (!heading) continue;
    if (start === -1) {
      if (normaliseVersion(heading[1]) === wanted) start = index + 1;
      continue;
    }
    return lines.slice(start, index).join('\n').trim();
  }

  return start === -1 ? undefined : lines.slice(start).join('\n').trim();
}

function main() {
  const requested = process.argv[2];
  if (!requested) {
    console.error('usage: node scripts/release-notes.mjs <tag or version>');
    process.exit(1);
  }

  const version = normaliseVersion(requested);
  const notes = sectionFor(readFileSync(CHANGELOG, 'utf8'), version);

  if (notes === undefined || notes === '') {
    console.error(
      `\n  release-notes: CHANGELOG.md has no section for ${version}\n\n` +
        `  Add a "## ${version}" heading with the notes for this release, then\n` +
        '  move the tag. The release body is published under the project name\n' +
        '  and is the only thing a self-hoster or a directory reviewer reads,\n' +
        '  so an empty one is worse than a failed workflow.\n',
    );
    process.exit(1);
  }

  process.stdout.write(`${notes}\n`);
}

/**
 * Only read the changelog when run as a command, so the test can import the
 * parser without needing the file to hold any particular version.
 */
const runAsCommand =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (runAsCommand) main();
