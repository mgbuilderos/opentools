import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  pinnedRscBuildIdentity,
  pinnedRscCompatibilityId,
  resolvePinnedBuildId,
  VINEXT_SHARED_RSC_BUILD_IDENTITY_ENV,
  VINEXT_SHARED_RSC_COMPATIBILITY_ID_ENV,
} from './build-identity';

const appRoot = path.resolve(import.meta.dirname, '../..');

const identities = [
  ['compatibility id', pinnedRscCompatibilityId],
  ['build identity', pinnedRscBuildIdentity],
] as const;

describe('the RSC identities that make the build reproducible', () => {
  it.each(identities)(
    'gives the same commit the same %s, and a different commit a different one',
    (_name, pin) => {
      const commit = 'a'.repeat(40);
      expect(pin(commit)).toBe(pin(commit));
      expect(pin(commit)).not.toBe(pin('b'.repeat(40)));
    },
  );

  it.each(identities)(
    'does not put the build ID itself on the wire (%s)',
    (_name, pin) => {
      const commit = 'a'.repeat(40);
      const id = pin(commit);
      expect(id).not.toBeNull();
      expect(id).not.toContain(commit);
      // Header-safe, and the shape vinext's own random value has.
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    },
  );

  it.each(identities)(
    'stays unpinned when the build ID is, so a dirty tree keeps its own %s',
    (_name, pin) => {
      expect(pin(null)).toBeNull();
    },
  );

  it('keeps the two identities distinct for one commit', () => {
    const commit = 'a'.repeat(40);
    expect(pinnedRscCompatibilityId(commit)).not.toBe(
      pinnedRscBuildIdentity(commit),
    );
  });

  it('reads OPENTOOLS_BUILD_ID ahead of git, so CI can supply the SHA', () => {
    const previous = process.env.OPENTOOLS_BUILD_ID;
    process.env.OPENTOOLS_BUILD_ID = '  deadbeef  ';
    try {
      expect(resolvePinnedBuildId()).toBe('deadbeef');
    } finally {
      if (previous === undefined) delete process.env.OPENTOOLS_BUILD_ID;
      else process.env.OPENTOOLS_BUILD_ID = previous;
    }
  });

  /**
   * The pins only work because `vite.config.ts` hands the ids to vinext through
   * these variables, and vinext's own CLI overwrites both with random values
   * just before the builds start. If either half moves, the build silently goes
   * back to a fresh identity per run. `vite.config.ts` catches that at build
   * time for the compatibility id, which is the one that costs a visitor
   * something; this catches the rename in the dependency for both, at test
   * time, which is cheaper and names the cause.
   */
  it.each([
    VINEXT_SHARED_RSC_COMPATIBILITY_ID_ENV,
    VINEXT_SHARED_RSC_BUILD_IDENTITY_ENV,
  ])('names %s, the variable vinext actually reads', (variable) => {
    const vinextConfig = readFileSync(
      path.join(appRoot, 'node_modules/vinext/dist/index.js'),
      'utf8',
    );
    const vinextCli = readFileSync(
      path.join(appRoot, 'node_modules/vinext/dist/cli.js'),
      'utf8',
    );
    expect(vinextConfig).toContain(`process.env.${variable}`);
    expect(vinextCli).toContain(`process.env.${variable}`);
  });

  it('is wired into the Vite config ahead of vinext', () => {
    const viteConfig = readFileSync(
      path.join(appRoot, 'vite.config.ts'),
      'utf8',
    );
    const pin = viteConfig.indexOf('pinRscIdentities(),');
    const vinext = viteConfig.indexOf('vinext({');
    expect(pin).toBeGreaterThan(-1);
    expect(vinext).toBeGreaterThan(-1);
    expect(pin).toBeLessThan(vinext);
  });
});
