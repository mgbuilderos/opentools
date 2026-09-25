#!/usr/bin/env node
/**
 * Fails the build when the header file the deploy uploads is missing, changed
 * in transit, or no longer states the cache policy.
 *
 * `public/_headers` is the only header source the Cloudflare deploy ships:
 * `headers()` in `next.config.ts` is applied by the Node server and reaches
 * nobody on the Worker. But `public/_headers` is not what gets uploaded —
 * `dist/client/_headers` is, and the build is what puts it there.
 *
 * `lib/edge-cache-headers.test.ts` reads the source file. That is the right
 * file to state the policy in and the wrong file to prove anything about the
 * deploy from: a build that stopped copying `public/` would leave that test
 * green while every page on the live site reverted to the asset layer's
 * `max-age=0, must-revalidate` default — which is precisely the state measured
 * on 2026-09-23, at a 42.55% zone cache hit rate, with each miss costing a
 * Worker invocation on a free plan that has already returned 1,316
 * `exceededResources` 503s in a single hour under crawl load.
 *
 * So this runs after the build, on the bytes that will be uploaded, and asks
 * the same questions the test asks — through the same module, so the two
 * cannot drift.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { auditCachePolicy, parseHeaderRules } from './lib/headers-policy.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'public/_headers');
const BUILT = path.join(ROOT, 'dist/client/_headers');

function fail(message) {
  console.error(`\n  verify-built-headers: ${message}\n`);
  process.exit(1);
}

if (!existsSync(SOURCE)) {
  fail(
    'public/_headers is missing.\n\n' +
      '  It is the only header source the Cloudflare deploy ships. Without it\n' +
      '  the site loses its Content-Security-Policy, X-Frame-Options, and the\n' +
      '  whole cache policy at once, and nothing about the deploy would say so.',
  );
}

if (!existsSync(BUILT)) {
  fail(
    'dist/client/_headers is missing, so the deploy would upload no headers ' +
      'at all.\n\n' +
      '  public/_headers exists but did not reach the build output. Everything\n' +
      '  under public/ is copied into dist/client/; check that the copy step\n' +
      '  ran. Cloudflare reads _headers from the uploaded asset directory and\n' +
      '  nowhere else — a rule that is not in this file does not exist.',
  );
}

const sourceText = readFileSync(SOURCE, 'utf8');
const builtText = readFileSync(BUILT, 'utf8');

if (sourceText !== builtText) {
  fail(
    'dist/client/_headers is not the file in public/_headers.\n\n' +
      `    public/_headers      ${sourceText.length} bytes\n` +
      `    dist/client/_headers ${builtText.length} bytes\n\n` +
      '  Something rewrote the header file between the repo and the build\n' +
      '  output. Whatever the live site is serving, it is not what was\n' +
      '  reviewed — and the test that reads public/_headers cannot see it.',
  );
}

let problems;
try {
  problems = auditCachePolicy(parseHeaderRules(builtText));
} catch (error) {
  fail(`dist/client/_headers could not be parsed: ${error.message}`);
}

if (problems.length > 0) {
  fail(
    `${problems.length} problem(s) in the cache policy that will be ` +
      'uploaded:\n\n' +
      problems.map((problem) => `    - ${problem}`).join('\n\n'),
  );
}

const rules = parseHeaderRules(builtText);
console.log(
  `  Verified dist/client/_headers ships ${rules.length} rules with the ` +
    'cache policy intact',
);
