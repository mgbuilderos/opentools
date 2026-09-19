#!/usr/bin/env node
/**
 * Optional cross-check of media output against programs that are not ours.
 *
 * **This is deliberately not part of `npm run qc`, and must never become part
 * of it.** The gate has to pass on any machine with nothing installed — that is
 * what makes a green suite mean the same thing everywhere. These tools are not
 * installed everywhere and cannot be assumed: ffmpeg is a Homebrew package here
 * and absent on plenty of machines, and LibreOffice was found to be a dangling
 * symlink on this one after being assumed present.
 *
 * So what this script does is confirm, when it can, that the **golden files** in
 * `lib/tools/video/__fixtures__` are still what an independent decoder accepts.
 * Those files are the real guarantee: they are committed bytes, and
 * `golden.test.ts` compares the writer against them on every machine, with
 * nothing installed. This script is what re-earns them after a deliberate change.
 *
 * Missing tools are reported and skipped. It never fails for absence — only for
 * a file that is genuinely broken.
 *
 *     node scripts/verify-media.mjs
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(root, 'lib', 'tools', 'video', '__fixtures__');

function have(tool) {
  // No shell: passing a tool name through one is both a deprecation warning and
  // a place for an injected argument to hide.
  return spawnSync('which', [tool], { stdio: 'ignore' }).status === 0;
}

const checks = [
  {
    file: 'golden-trim-from-1s.mp4',
    expect: 'h264 15 frames plus aac 44 frames',
  },
  { file: 'golden-audio-only.m4a', expect: 'aac 88 frames' },
  { file: 'tone-video.mp4', expect: 'the source fixture itself' },
];

let failures = 0;
let skipped = 0;

if (!have('ffmpeg')) {
  console.log(
    'SKIP  ffmpeg is not installed, so the media cross-check did not run.',
  );
  console.log('      This is not a failure. The golden files in');
  console.log(
    '      lib/tools/video/__fixtures__ are compared byte for byte by',
  );
  console.log(
    '      golden.test.ts, which needs nothing installed and runs in `npm run qc`.',
  );
  console.log(
    '      Install ffmpeg only if you have changed the writer and need to',
  );
  console.log('      re-earn those files.');
  skipped += checks.length;
} else {
  for (const check of checks) {
    const target = path.join(fixtures, check.file);
    if (!existsSync(target)) {
      console.log(`MISS  ${check.file} is not there.`);
      failures += 1;
      continue;
    }
    // ffmpeg reports decode trouble on stderr and says nothing when happy, so
    // stderr is the result. `spawnSync` gives both streams; `execFileSync`
    // returns stdout only, and reading that as stderr made every file look
    // broken while every file was fine.
    const run = spawnSync(
      'ffmpeg',
      ['-v', 'error', '-i', target, '-f', 'null', '-'],
      {
        encoding: 'utf8',
      },
    );
    const complaint = (run.stderr ?? '').trim();
    if (run.status !== 0 || complaint) {
      console.log(
        `FAIL  ${check.file}: ${complaint.split('\n')[0] || `exit ${run.status}`}`,
      );
      failures += 1;
    } else {
      console.log(`OK    ${check.file} decodes clean (${check.expect})`);
    }
  }
}

if (failures > 0) {
  console.log(`\n${failures} file(s) an independent decoder would not accept.`);
  process.exit(1);
}
console.log(
  skipped
    ? '\nNothing checked; nothing broken.'
    : '\nAll media output verified.',
);
