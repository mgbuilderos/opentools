import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The guard on the guards.
 *
 * Every check in `npm run build` protects something that used to be protected
 * by someone remembering it. That only holds while the check is still in the
 * build script — and a check can be removed from one line of `package.json`
 * with nothing to show for it. The build would go green, faster than before,
 * and the invariant would quietly go back to being a thing people are supposed
 * to know.
 *
 * So the wiring itself is asserted here. Deleting a guard now fails the test
 * suite, which means the deletion has to be a decision someone makes on
 * purpose and can be asked about, rather than a line that went missing.
 *
 * Each entry says what the guard is for. If a guard is genuinely no longer
 * needed, remove it from the build AND from this list, in the same commit,
 * with the reason in the commit message.
 */
const BUILD_GUARDS: { script: string; protects: string }[] = [
  {
    script: 'scripts/prerender-to-assets.mjs',
    protects:
      'moves prerendered pages into dist/client and captures sitemap.xml, ' +
      'robots.txt and the llms files — without it those are rebuilt by the ' +
      'Worker on every request, on a 10ms CPU budget',
  },
  {
    script: 'scripts/verify-static-coverage.mjs',
    protects:
      'every sitemap URL has a file to answer it. 183 of 670 URLs returned ' +
      '503 on 2026-09-20 while the build reported success',
  },
  {
    script: 'scripts/verify-indexnow-key.mjs',
    protects:
      'the IndexNow key file exists, matches its own name, and reaches ' +
      'dist/client. Losing it makes every submission fail with a bare 403',
  },
  {
    script: 'scripts/verify-built-headers.mjs',
    protects:
      'dist/client/_headers is the reviewed file and still carries the cache ' +
      'policy. It is the only header source the Cloudflare deploy ships',
  },
  {
    script: 'scripts/build-service-worker-precache.mjs',
    protects:
      'the service worker ships its offline payload and is stamped with the ' +
      'build it belongs to',
  },
];

const projectRoot = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(
  readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
) as { scripts: Record<string, string> };

describe('the guards that make the build the thing you have to trust', () => {
  it.each(BUILD_GUARDS)(
    'runs $script on every build',
    ({ script, protects }) => {
      expect(
        packageJson.scripts.build,
        `\`npm run build\` no longer runs ${script}.\n\n` +
          `It guards: ${protects}.\n\n` +
          'If that is intentional, remove it from BUILD_GUARDS in this file ' +
          'too, in the same commit, and say why.',
      ).toContain(script);
    },
  );

  it.each(BUILD_GUARDS)('has $script on disk', ({ script }) => {
    expect(
      existsSync(path.join(projectRoot, script)),
      `${script} is referenced by \`npm run build\` but does not exist, so ` +
        'every build fails at that step',
    ).toBe(true);
  });

  it('runs the guards in an order where each has something to inspect', () => {
    // They read dist/, so they must come after the build that writes it.
    const build = packageJson.scripts.build;
    for (const { script } of BUILD_GUARDS) {
      expect(
        build.indexOf(script),
        `${script} runs before \`vinext build\`, so dist/ is either absent ` +
          'or left over from a previous run — which is the stale-artifact ' +
          'failure these guards exist to catch',
      ).toBeGreaterThan(build.indexOf('vinext build'));
    }
  });

  it('exposes the post-deploy verification as a command', () => {
    // A verification nobody can run is a verification nobody runs.
    expect(packageJson.scripts['verify:live']).toContain(
      'scripts/verify-live.mjs',
    );
    expect(existsSync(path.join(projectRoot, 'scripts/verify-live.mjs'))).toBe(
      true,
    );
  });

  it('keeps audit:360 and verify:live reading from one list of checks', () => {
    // The report a person reads and the gate that blocks a deploy must agree
    // about what a fault is. Two copies of the check list is how they stop
    // agreeing, and the gate is the copy nobody reads until it matters.
    for (const script of ['scripts/audit-360.mjs', 'scripts/verify-live.mjs']) {
      expect(
        readFileSync(path.join(projectRoot, script), 'utf8'),
        `${script} no longer imports the shared check definitions`,
      ).toContain("from './lib/site-checks.mjs'");
    }
  });

  it('derives the IndexNow key in one place', () => {
    // The guard and the submitter must agree on which file is the key. A
    // guard holding its own copy would keep passing after the submitter's
    // idea of the key had changed — the exact failure it exists to prevent.
    expect(
      readFileSync(
        path.join(projectRoot, 'scripts/verify-indexnow-key.mjs'),
        'utf8',
      ),
    ).toContain("from './submit-indexnow.mjs'");
    expect(
      readFileSync(
        path.join(projectRoot, 'scripts/submit-indexnow.mjs'),
        'utf8',
      ),
      'submit-indexnow.mjs no longer exports keyFromPublicDir',
    ).toContain('export function keyFromPublicDir');
  });

  it('does not submit to IndexNow merely because the guard imported it', () => {
    // An import with a side effect would turn a build step into 600 live
    // submissions, and the protocol discourages resubmitting unchanged URLs.
    const source = readFileSync(
      path.join(projectRoot, 'scripts/submit-indexnow.mjs'),
      'utf8',
    );
    expect(source).toMatch(/if\s*\(runAsCommand\)/u);
    expect(
      /^main\(\)/mu.test(source),
      'main() is called at module scope, so importing this file submits',
    ).toBe(false);
  });
});
