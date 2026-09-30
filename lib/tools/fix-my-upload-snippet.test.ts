import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  FIX_PROTOCOL,
  FIX_PROTOCOL_VERSION,
  INTEGRATOR_HELLO,
  OPENTOOLS_CANCELLED,
  OPENTOOLS_READY,
  OPENTOOLS_RESULT,
} from './fix-my-upload';

/**
 * The copy-paste snippet on `/fix` must stay the protocol the page speaks.
 *
 * WHY THIS IS WORTH A TEST. The snippet runs on somebody else's website. If a
 * message name is renamed here and the example is not, the integrator's console
 * says nothing, the popup sits there, and the failure looks like our bug on
 * their site — with no one on this side able to see it. The component builds the
 * snippet from these constants rather than spelling them out, and this is what
 * keeps that true: rename one and the assertion below fails in the same commit.
 *
 * It reads the component's source rather than rendering it, deliberately. What
 * is being checked is that the *generator* names the constants — a rendering
 * test would pass just as well against hard-coded text that happened to match
 * today, which is the drift this exists to catch.
 *
 * This file also exists because a doc comment in that component claimed a test
 * like it already did this, and the claim was false for several hours. A
 * comment asserting a guard that does not exist is worse than no comment: it
 * stops the next reader looking.
 */
const source = readFileSync(
  path.join(
    // `fileURLToPath`, not `new URL(...).pathname`: this repository lives under
    // a directory with a space in it, and the raw pathname arrives percent-
    // encoded, so `readFileSync` looks for a path containing a literal `%20`.
    path.dirname(fileURLToPath(import.meta.url)),
    '../../components/fix-my-upload-integration.tsx',
  ),
  'utf8',
);

describe('the snippet a site owner copies', () => {
  it('is generated from the protocol constants, not typed beside them', () => {
    // Each of these must appear as an interpolated identifier in the snippet
    // builders. A literal string would satisfy a rendering test and drift the
    // moment the constant changed.
    for (const identifier of [
      'FIX_PROTOCOL',
      'FIX_PROTOCOL_VERSION',
      'INTEGRATOR_HELLO',
      'OPENTOOLS_READY',
      'OPENTOOLS_RESULT',
      'OPENTOOLS_CANCELLED',
    ]) {
      expect(
        source,
        `${identifier} is not interpolated into the snippet`,
      ).toContain(
        `\${JSON.stringify(${identifier})}`.replace(
          'JSON.stringify(FIX_PROTOCOL_VERSION)',
          'FIX_PROTOCOL_VERSION',
        ),
      );
    }
  });

  it('never writes the message names as bare strings in the snippet', () => {
    /*
     * The failure this guards is subtle: someone "simplifies" the template by
     * pasting the current value in. It reads identically today and stops
     * tracking the constant forever after.
     */
    const builders = source.slice(
      source.indexOf('function plainLinkSnippet'),
      source.indexOf('function CopyBlock'),
    );
    expect(builders.length).toBeGreaterThan(200);
    for (const literal of [
      `'${FIX_PROTOCOL}'`,
      `"${FIX_PROTOCOL}"`,
      `'${INTEGRATOR_HELLO}'`,
      `'${OPENTOOLS_READY}'`,
      `'${OPENTOOLS_RESULT}'`,
      `'${OPENTOOLS_CANCELLED}'`,
    ]) {
      expect(builders, `${literal} is hard-coded in the snippet`).not.toContain(
        literal,
      );
    }
  });

  it('carries no absolute-URL literal, so a self-hosted copy names itself', () => {
    // `lib/tools/local-source-policy.test.ts` enforces this repository-wide;
    // asserted here too because this is the one file whose whole job is to emit
    // a URL, and it must emit the running instance's own origin.
    expect(source).not.toMatch(/['"`]https?:\/\//u);
    expect(source).toContain('window.location.origin');
  });

  it('points the snippet at the route that actually exists', () => {
    expect(source).toContain('/fix/');
    // The version parameter the recipient page requires; a snippet without it
    // would produce links `readAskLink` refuses.
    expect(source).toContain('FIX_PROTOCOL_VERSION');
  });

  it('keeps the protocol values themselves stable', () => {
    // These strings are on other people's websites once anyone integrates.
    // Changing one is a breaking change and should require editing this test.
    expect(FIX_PROTOCOL).toBe('opentools.fix-my-upload');
    expect(FIX_PROTOCOL_VERSION).toBe(1);
    expect(INTEGRATOR_HELLO).toBe('hello');
    expect(OPENTOOLS_READY).toBe('ready');
    expect(OPENTOOLS_RESULT).toBe('result');
    expect(OPENTOOLS_CANCELLED).toBe('cancelled');
  });
});
