#!/usr/bin/env node
/**
 * The deploy lock, as a lock rather than as a paragraph.
 *
 * **What was wrong with the old one.** §3 of `AGENT_BOARD.md` held the lock as
 * prose. Two things follow from that, and both happened on 2026-09-21 inside
 * one hour:
 *
 * 1. **Nothing was atomic.** Two agents read "FREE", both wrote their own
 *    paragraph, and the second silently overwrote the first. Markdown has no
 *    compare-and-set.
 * 2. **Nothing was enforced.** `npm run deploy` ran `wrangler deploy` directly
 *    and never looked at the board, so a lock nobody is obliged to check is a
 *    comment. An agent could hold it correctly and still be deployed over.
 *
 * Every lane publishes to the same Worker and the last deploy wins, so this is
 * the only thing standing between one agent and another agent's ungated work.
 *
 * **How this fixes each.**
 *
 * *Atomicity* comes from `open(path, 'wx')` — O_EXCL. The kernel guarantees
 * exactly one of two racing processes creates the file; the loser gets EEXIST
 * and is told who holds it. There is no read-then-write window to lose.
 *
 * *Enforcement* comes from `package.json`: `deploy` runs `assert` first, so a
 * deploy without the lock fails instead of succeeding quietly.
 *
 * **Why a token rather than a process id.** An agent runs each shell command as
 * a fresh process, so a pid identifies nothing a minute later. `acquire` mints a
 * random token, stores only its SHA-256 in the lock, and writes the token itself
 * to a file in the holder's own worktree. Proving you hold the lock means
 * presenting the token, which the next command can do and a different agent
 * cannot. The lock file is world-readable by design — it has to be, for others
 * to see who holds it — so it must not contain the secret that grants release.
 *
 * **Where the lock lives.** Beside `AGENT_BOARD.md` at the blueprint root, found
 * by walking up from this script. Worktrees each have their own checkout, so a
 * lock inside one of them would be invisible to the others — which is the same
 * mistake in a different place. A checkout with no blueprint root above it
 * falls back to a machine-wide directory; `deploy-lock-root.mjs` explains why
 * that is machine-wide and not local, and what it still cannot do.
 *
 * Usage:
 *   node scripts/deploy-lock.mjs acquire --owner "<session>" [--note "..."] [--steal]
 *   node scripts/deploy-lock.mjs assert
 *   node scripts/deploy-lock.mjs release [--force]
 *   node scripts/deploy-lock.mjs status
 */

import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLockDir } from './deploy-lock-root.mjs';

/**
 * A lock older than this is treated as abandoned and may be taken with
 * `--steal`. Ninety minutes is longer than any deploy this repo has run — the
 * full gate plus upload is about forty — so a lock this old means the holder
 * stopped, not that it is slow.
 */
const STALE_AFTER_MS = 90 * 60 * 1000;

const LOCK_NAME = '.deploy-lock.json';
const TOKEN_NAME = '.deploy-lock-token';

const argv = process.argv.slice(2);
const command = argv[0] ?? 'status';
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? null : (argv[index + 1] ?? null);
};

/**
 * The directory the lock lives in. See `deploy-lock-root.mjs` for which of the
 * two locations is chosen and why.
 *
 * The directory is created when the machine-wide fallback is used, because
 * `acquire` opens the lock with O_EXCL and would otherwise fail on a path whose
 * parent does not exist yet. It is created on any command rather than only on
 * write: an empty state directory costs nothing, and making `status` and
 * `acquire` disagree about whether a path exists is how this kind of code goes
 * wrong.
 */
function sharedRoot() {
  const { dir, kind } = resolveLockDir({
    startDir: path.dirname(fileURLToPath(import.meta.url)),
    home: homedir(),
  });
  if (kind === 'machine') mkdirSync(dir, { recursive: true });
  return dir;
}

const worktree = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
/**
 * Overridable so the tests never touch the real lock.
 *
 * Without this the suite exercised the live `.deploy-lock.json`: running
 * `npm test` while an agent genuinely held the lock would have deleted it in
 * `afterEach`. A test that can sabotage production is worse than no test.
 */
const lockPath =
  process.env.DEPLOY_LOCK_FILE ?? path.join(sharedRoot(), LOCK_NAME);
const tokenPath =
  process.env.DEPLOY_LOCK_TOKEN_FILE ?? path.join(worktree, TOKEN_NAME);

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

function readLock() {
  if (!existsSync(lockPath)) return null;
  try {
    return JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch {
    // A corrupt lock still means someone was here. Report it as held and
    // unreadable rather than deleting it, so `--steal` stays a deliberate act.
    return { corrupt: true };
  }
}

const ageMs = (lock) =>
  lock?.takenAt ? Date.now() - Date.parse(lock.takenAt) : Infinity;
const isStale = (lock) => ageMs(lock) > STALE_AFTER_MS;

function minutes(ms) {
  if (!Number.isFinite(ms)) return 'unknown';
  return `${Math.round(ms / 60000)} min`;
}

function describe(lock) {
  if (lock.corrupt) return '  the lock file exists but could not be parsed';
  return [
    `  owner    ${lock.owner}`,
    `  since    ${lock.takenAt} (${minutes(ageMs(lock))} ago)`,
    `  branch   ${lock.branch ?? 'unknown'} @ ${lock.commit ?? 'unknown'}`,
    `  host     ${lock.host ?? 'unknown'}`,
    lock.note ? `  note     ${lock.note}` : null,
    lock.previousHolder
      ? `  stole from ${lock.previousHolder.owner} (${lock.previousHolder.takenAt})`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function gitFact(args, fallback) {
  try {
    return (
      execFileSync('git', args, { cwd: worktree, encoding: 'utf8' }).trim() ||
      fallback
    );
  } catch {
    return fallback;
  }
}

function acquire() {
  const owner = value('owner');
  if (!owner) {
    console.error(
      'acquire needs --owner "<who you are>", so the next agent can see whose\n' +
        'lock this is and whether you are still running.',
    );
    process.exit(2);
  }

  const existing = readLock();
  if (existing) {
    if (!flag('steal')) {
      console.error('\n  DEPLOY LOCK IS HELD\n');
      console.error(describe(existing));
      console.error(
        isStale(existing)
          ? `\n  It is older than ${minutes(STALE_AFTER_MS)}, so it may be abandoned.\n` +
              '  Check whether that session is still running before you take it.\n' +
              '  If it is not:  node scripts/deploy-lock.mjs acquire --owner "<you>" --steal\n'
          : '\n  Wait for them, or ask them to release it. Do not deploy around it:\n' +
              '  every lane publishes to the same Worker and the last deploy wins.\n',
      );
      process.exit(1);
    }
    if (!isStale(existing) && !flag('force')) {
      console.error(
        `\n  Refusing to steal a lock only ${minutes(ageMs(existing))} old — that is a live\n` +
          '  deploy, not an abandoned one. Add --force only if the owner told you to.\n',
      );
      console.error(describe(existing));
      process.exit(1);
    }
    // Stealing is deliberate, so the previous holder is carried into the new
    // record rather than erased. Losing who was there is how the markdown lock
    // hid its own failures.
    unlinkSync(lockPath);
    return write(owner, existing);
  }
  return write(owner, null);
}

function write(owner, previous) {
  const token = randomBytes(24).toString('hex');
  const record = {
    owner,
    tokenHash: sha256(token),
    takenAt: new Date().toISOString(),
    host: process.env.HOSTNAME ?? gitFact(['config', 'user.name'], 'unknown'),
    branch: gitFact(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown'),
    commit: gitFact(['rev-parse', '--short', 'HEAD'], 'unknown'),
    worktree: path.basename(worktree),
    note: value('note') ?? null,
    previousHolder: previous
      ? {
          owner: previous.owner ?? 'unparseable',
          takenAt: previous.takenAt ?? null,
        }
      : null,
  };

  let fd;
  try {
    // O_EXCL: the kernel decides the winner, so two racing agents cannot both
    // believe they hold this.
    fd = openSync(lockPath, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.error(
        '\n  Lost the race — another agent took the lock between the check and\n' +
          '  the write. That is the bug this file exists to make impossible to\n' +
          '  miss. Run `status` and wait.\n',
      );
      process.exit(1);
    }
    throw error;
  }
  writeSync(fd, JSON.stringify(record, null, 2) + '\n');
  closeSync(fd);
  writeSync(openSync(tokenPath, 'w'), token + '\n');

  console.log('\n  DEPLOY LOCK ACQUIRED\n');
  console.log(describe(record));
  console.log(
    `\n  Token written to ${path.relative(worktree, tokenPath)} (gitignored).\n` +
      '  `npm run deploy` now checks it. Release when the deploy is verified:\n' +
      '    node scripts/deploy-lock.mjs release\n',
  );
}

function heldByMe() {
  const lock = readLock();
  if (!lock || lock.corrupt) return { ok: false, lock };
  if (!existsSync(tokenPath))
    return { ok: false, lock, reason: 'no token here' };
  const token = readFileSync(tokenPath, 'utf8').trim();
  return { ok: sha256(token) === lock.tokenHash, lock };
}

function assert_() {
  const { ok, lock, reason } = heldByMe();
  if (ok) {
    console.log(`  deploy lock: held by ${lock.owner} — proceeding`);
    return;
  }
  console.error('\n  REFUSING TO DEPLOY — you do not hold the deploy lock.\n');
  if (!lock) {
    console.error(
      '  Nobody holds it. Take it first:\n' +
        '    node scripts/deploy-lock.mjs acquire --owner "<you>" --note "<what>"\n',
    );
  } else {
    console.error(
      reason === 'no token here'
        ? '  It is held by another worktree:\n'
        : '  It is held by someone else:\n',
    );
    console.error(describe(lock));
    console.error(
      '\n  Every lane deploys to the same Worker and the last deploy wins, so\n' +
        '  deploying now would publish over their work — possibly ungated.\n',
    );
  }
  process.exit(1);
}

function release() {
  const { ok, lock } = heldByMe();
  if (!lock) {
    console.log('  deploy lock: already free, nothing to release');
    return;
  }
  if (!ok && !flag('force')) {
    console.error('\n  Not yours to release.\n');
    console.error(describe(lock));
    console.error('\n  Add --force only if the owner told you to.\n');
    process.exit(1);
  }
  unlinkSync(lockPath);
  if (existsSync(tokenPath)) unlinkSync(tokenPath);
  console.log(`  deploy lock: RELEASED (was ${lock.owner ?? 'unparseable'})`);
}

function status() {
  const lock = readLock();
  // The path is printed on every status, held or free. Two checkouts can
  // resolve to different lock files -- a worktree lane and a standalone clone
  // will -- and "we both ran status and it said FREE" is exactly the
  // conversation that precedes deploying over each other.
  const where = `  file     ${lockPath}`;
  if (!lock) {
    console.log('\n  deploy lock: FREE\n');
    console.log(where);
    console.log(
      '\n    node scripts/deploy-lock.mjs acquire --owner "<you>" --note "<what>"\n',
    );
    return;
  }
  const { ok } = heldByMe();
  console.log(`\n  deploy lock: HELD${ok ? ' — BY YOU' : ''}\n`);
  console.log(describe(lock));
  console.log(where);
  if (isStale(lock)) {
    console.log(
      `\n  Older than ${minutes(STALE_AFTER_MS)}. If that session is gone:\n` +
        '    node scripts/deploy-lock.mjs acquire --owner "<you>" --steal\n',
    );
  } else {
    console.log('');
  }
}

const commands = { acquire, assert: assert_, release, status };
const run = commands[command];
if (!run) {
  console.error(
    `Unknown command '${command}'. Use: acquire | assert | release | status`,
  );
  process.exit(2);
}
run();
