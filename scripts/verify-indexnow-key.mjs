#!/usr/bin/env node
/**
 * Fails the build when the IndexNow key file is gone, wrong, or not shipped.
 *
 * IndexNow proves domain ownership by fetching `https://<host>/<key>.txt` and
 * checking the body is exactly `<key>`. That is the whole mechanism. If the
 * file stops being served, every submission is rejected — and the rejection is
 * a bare `403` whose body explains nothing, on a script that ran fine
 * yesterday. Nothing about the failure points at the missing file.
 *
 * Until now the file survived only because someone remembered it was load
 * bearing. It is a 32-character name in `public/` next to the favicons, it is
 * referenced by no import, no test and no page, and any tidy-up of "unused
 * files" would take it. Then the next `npm run indexnow` would fail, and the
 * reason would have to be rediscovered.
 *
 * Three things have to hold, and all three are checked here:
 *
 *   1. `public/<key>.txt` exists — exactly one of them, because the submitter
 *      derives the key by looking for exactly one.
 *   2. Its contents equal its own filename. A file whose body drifted from its
 *      name serves a 200 and still fails verification.
 *   3. `dist/client/<key>.txt` exists and matches too. `public/` is copied
 *      into the build output, not served directly; a file present in the repo
 *      but absent from the build is served as a 404 to the one client that
 *      matters.
 *
 * The key name is read through `keyFromPublicDir` in
 * `scripts/submit-indexnow.mjs` rather than written here. A guard holding its
 * own copy of the value would keep passing after the submitter's idea of the
 * key had changed, which is the failure it exists to prevent.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { keyFromPublicDir } from './submit-indexnow.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLIENT = path.join(ROOT, 'dist/client');

function fail(message) {
  console.error(`\n  verify-indexnow-key: ${message}\n`);
  process.exit(1);
}

let key;
try {
  key = keyFromPublicDir();
} catch (error) {
  fail(
    `${error.message}\n\n` +
      '  IndexNow verifies ownership by fetching /<key>.txt and comparing the\n' +
      '  body to the key. Without exactly one key file in public/ there is\n' +
      '  nothing to verify against, and every submission returns 403 with no\n' +
      '  explanation. If the file was deleted, restore it from git history —\n' +
      '  the key itself is not a secret, but changing it discards whatever\n' +
      '  trust the old one has accumulated with Bing.',
  );
}

const publicFile = path.join(ROOT, 'public', `${key}.txt`);
const publicBody = readFileSync(publicFile, 'utf8').trim();
if (publicBody !== key) {
  fail(
    `public/${key}.txt does not contain its own key.\n\n` +
      `    filename says  ${key}\n` +
      `    body says      ${JSON.stringify(publicBody.slice(0, 48))}\n\n` +
      '  IndexNow compares the two and rejects the submission when they\n' +
      '  differ. The body must be the key and nothing else.',
  );
}

const builtFile = path.join(CLIENT, `${key}.txt`);
if (!existsSync(builtFile)) {
  fail(
    `dist/client/${key}.txt is missing, so the deploy would not serve it.\n\n` +
      '  The file is in public/ but did not reach the build output. Everything\n' +
      '  under public/ is copied into dist/client/ by the build; if this one\n' +
      '  did not arrive, check that the copy step ran and that nothing in the\n' +
      '  build config excludes it.\n\n' +
      '  A key file that exists in the repo but not in the deploy fails in the\n' +
      '  most confusing way available: the file is right there in git, and\n' +
      '  IndexNow still answers 403.',
  );
}

const builtBody = readFileSync(builtFile, 'utf8').trim();
if (builtBody !== key) {
  fail(
    `dist/client/${key}.txt was shipped with the wrong contents.\n\n` +
      `    expected  ${key}\n` +
      `    found     ${JSON.stringify(builtBody.slice(0, 48))}`,
  );
}

console.log(`  Verified IndexNow key ${key} is present in public/ and shipped`);
