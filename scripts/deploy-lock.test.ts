import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BLUEPRINT_MARKER,
  findBlueprintRoot,
  resolveLockDir,
} from './deploy-lock-root.mjs';

const run = promisify(execFile);

const worktree = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const script = path.join(worktree, 'scripts', 'deploy-lock.mjs');

/**
 * Every test gets its own lock and token file.
 *
 * The first version used the real `.deploy-lock.json`, so `npm test` would
 * have deleted a lock an agent was actually holding — a test that can
 * sabotage production. It also made the suite flaky, because parallel files
 * raced for one path.
 */
let sandbox: string;
let lockFile: string;
let tokenFile: string;

beforeEach(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), 'deploy-lock-'));
  lockFile = path.join(sandbox, 'lock.json');
  tokenFile = path.join(sandbox, 'token');
});

afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

const lockPath = () => lockFile;
const tokenPath = () => tokenFile;

/** Exit code and output, without throwing on a non-zero exit. */
async function lock(...args: string[]) {
  const env = {
    ...process.env,
    DEPLOY_LOCK_FILE: lockFile,
    DEPLOY_LOCK_TOKEN_FILE: tokenFile,
  };
  try {
    const { stdout, stderr } = await run('node', [script, ...args], { env });
    return { code: 0, out: stdout + stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

const clean = () => {
  rmSync(lockFile, { force: true });
  rmSync(tokenFile, { force: true });
};

describe('the deploy lock', () => {
  /**
   * The reason this file exists. The lock it replaced was a paragraph in
   * `AGENT_BOARD.md`: two agents read "FREE", both wrote, and the second
   * silently overwrote the first. Markdown has no compare-and-set, so the only
   * assertion that matters is that concurrent acquisition has exactly one
   * winner.
   */
  it('gives exactly one winner when many agents race for it', async () => {
    clean();
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        lock('acquire', '--owner', `agent-${i}`),
      ),
    );
    const winners = results.filter((r) => r.code === 0);
    const losers = results.filter((r) => r.code !== 0);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(11);
    for (const loser of losers) {
      expect(loser.out).toMatch(/DEPLOY LOCK IS HELD|Lost the race/);
    }
  });

  it('refuses a second acquire and names the holder', async () => {
    await lock('acquire', '--owner', 'first');
    const second = await lock('acquire', '--owner', 'second');
    expect(second.code).toBe(1);
    expect(second.out).toContain('first');
  });

  it('lets the holder prove it, by a token the lock file does not contain', async () => {
    await lock('acquire', '--owner', 'holder');
    expect((await lock('assert')).code).toBe(0);

    // The lock is world-readable so others can see who holds it, so it must
    // not carry the secret that grants release.
    const record = JSON.parse(readFileSync(lockPath(), 'utf8'));
    const token = readFileSync(tokenPath(), 'utf8').trim();
    expect(record.tokenHash).not.toBe(token);
    expect(JSON.stringify(record)).not.toContain(token);
  });

  it('refuses assert from a worktree that does not hold it', async () => {
    await lock('acquire', '--owner', 'holder');
    const saved = readFileSync(tokenPath(), 'utf8');
    rmSync(tokenPath());
    const denied = await lock('assert');
    expect(denied.code).toBe(1);
    expect(denied.out).toContain('REFUSING TO DEPLOY');
    writeFileSync(tokenPath(), saved);
  });

  it('refuses release by anyone but the holder', async () => {
    await lock('acquire', '--owner', 'holder');
    const saved = readFileSync(tokenPath(), 'utf8');
    rmSync(tokenPath());
    expect((await lock('release')).code).toBe(1);
    expect(existsSync(lockPath())).toBe(true);
    writeFileSync(tokenPath(), saved);
  });

  it('refuses to steal a lock that is not stale', async () => {
    await lock('acquire', '--owner', 'holder');
    const stolen = await lock('acquire', '--owner', 'thief', '--steal');
    expect(stolen.code).toBe(1);
    expect(stolen.out).toContain('Refusing to steal');
  });

  it('records the previous holder when a stale lock is taken', async () => {
    await lock('acquire', '--owner', 'ghost');
    // Age the lock past the staleness window rather than waiting 90 minutes.
    const record = JSON.parse(readFileSync(lockPath(), 'utf8'));
    record.takenAt = new Date(Date.now() - 1000 * 60 * 120).toISOString();
    writeFileSync(lockPath(), JSON.stringify(record));
    rmSync(tokenPath());

    const taken = await lock('acquire', '--owner', 'successor', '--steal');
    expect(taken.code).toBe(0);
    const after = JSON.parse(readFileSync(lockPath(), 'utf8'));
    expect(after.owner).toBe('successor');
    // Erasing who was there is how the markdown lock hid its own failures.
    expect(after.previousHolder?.owner).toBe('ghost');
  });

  /**
   * Atomicity is only half the fix. The old lock also failed because nothing
   * was obliged to consult it: `npm run deploy` called wrangler directly, so a
   * correctly-held lock could still be deployed straight over. If this
   * assertion ever fails, the lock is decoration again.
   */
  it('is enforced by npm run deploy, not merely advisory', () => {
    const pkg = JSON.parse(
      readFileSync(path.join(worktree, 'package.json'), 'utf8'),
    );
    expect(pkg.scripts.deploy).toMatch(/deploy-lock\.mjs assert/);
    expect(pkg.scripts.deploy.indexOf('deploy-lock.mjs assert')).toBeLessThan(
      pkg.scripts.deploy.indexOf('wrangler deploy'),
    );
  });

  it('reports FREE when nothing holds it', async () => {
    clean();
    const status = await lock('status');
    expect(status.code).toBe(0);
    expect(status.out).toContain('FREE');
  });
});

/**
 * Where the lock file goes.
 *
 * This is the part that had no test, and it is the part that broke: a checkout
 * with no `AGENT_BOARD.md` above it threw, and because `npm run deploy` runs
 * `assert` first, the lock made deploying impossible from a plain clone rather
 * than merely unguarded. Every test above passes `DEPLOY_LOCK_FILE`, so none of
 * them ever reached this code.
 *
 * The resolution is tested as a pure function against a synthetic directory
 * tree. Running the real script would decide the answer from whatever is above
 * the repository on the machine running the suite, which is the owner's laptop
 * in one case and a container in the other — a test whose result depends on the
 * checkout is not a test.
 */
describe('where the lock file goes', () => {
  it('prefers the blueprint root, however deep the checkout is', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'blueprint-'));
    const deep = path.join(root, 'lanes', 'lane-a', 'scripts');
    mkdirSync(deep, { recursive: true });
    writeFileSync(path.join(root, BLUEPRINT_MARKER), 'board');

    expect(findBlueprintRoot(deep)).toBe(root);
    expect(
      resolveLockDir({ startDir: deep, env: {}, home: '/home/nobody' }),
    ).toEqual({
      dir: root,
      kind: 'blueprint',
    });

    rmSync(root, { recursive: true, force: true });
  });

  it('falls back to a machine-wide directory when there is no blueprint root', () => {
    const lonely = mkdtempSync(path.join(tmpdir(), 'standalone-'));

    expect(findBlueprintRoot(lonely)).toBeNull();
    // Machine-wide, not inside the checkout: two clones on one machine deploy
    // to the same Worker, so a lock inside one is invisible to the other.
    const resolved = resolveLockDir({
      startDir: lonely,
      env: {},
      home: '/home/nobody',
    });
    expect(resolved.kind).toBe('machine');
    expect(resolved.dir).toBe('/home/nobody/.local/state/opentools');
    expect(resolved.dir.startsWith(lonely)).toBe(false);

    rmSync(lonely, { recursive: true, force: true });
  });

  it('honours XDG_STATE_HOME for the fallback', () => {
    const lonely = mkdtempSync(path.join(tmpdir(), 'standalone-'));

    expect(
      resolveLockDir({
        startDir: lonely,
        env: { XDG_STATE_HOME: '/var/state' },
        home: '/home/nobody',
      }).dir,
    ).toBe('/var/state/opentools');

    rmSync(lonely, { recursive: true, force: true });
  });

  it('does not stop searching at the first directory', () => {
    // A marker directly beside the script would have worked under the old code
    // too. The regression was about depth, so the walk is what matters.
    const root = mkdtempSync(path.join(tmpdir(), 'blueprint-'));
    const deep = path.join(root, 'a', 'b', 'c', 'd');
    mkdirSync(deep, { recursive: true });
    writeFileSync(path.join(root, BLUEPRINT_MARKER), 'board');

    expect(findBlueprintRoot(deep)).toBe(root);

    rmSync(root, { recursive: true, force: true });
  });
});
