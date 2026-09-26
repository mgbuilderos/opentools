/**
 * Where the deploy lock file lives.
 *
 * Split out of `deploy-lock.mjs` so it can be tested: that file runs its CLI at
 * import time, so importing it in a test executes a command. This module is
 * pure, and the resolution below is the part that was wrong.
 *
 * **Preferred: the blueprint root**, the directory holding `AGENT_BOARD.md`,
 * found by walking up from the script. That is the layout the lock was built
 * for — several worktrees side by side under one root, every one of them
 * publishing to the same Worker, so the lock has to sit above all of them or it
 * is invisible to the lanes it is meant to stop.
 *
 * **Fallback: a machine-wide state directory.** A standalone checkout — a plain
 * `git clone`, or a cloud container — has no `AGENT_BOARD.md` above it, and the
 * old code threw there. That was not a cosmetic failure: `npm run deploy` runs
 * `assert` first, so the lock's own error made deploying impossible from any
 * checkout that was not part of the worktree layout.
 *
 * The fallback is machine-wide rather than inside the checkout **on purpose**.
 * Two clones of this repo on one machine still deploy to the same Worker, so a
 * lock inside one of them would be invisible to the other — the same mistake
 * this file exists to prevent, moved somewhere new. `$XDG_STATE_HOME`, or
 * `~/.local/state`, is visible to both.
 *
 * **What neither location can do is coordinate across machines.** A file lock is
 * only ever as wide as its filesystem, so a laptop and a cloud container can
 * still deploy over each other. That was equally true of the blueprint root and
 * is not made worse here — but it is why `status` now prints the path it is
 * using, so two people comparing notes can see whether they are even looking at
 * the same lock.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

/** The file that marks the blueprint root. */
export const BLUEPRINT_MARKER = 'AGENT_BOARD.md';

/** How far up to look before giving up. */
const MAX_DEPTH = 8;

/**
 * The nearest directory at or above `startDir` holding the marker, or null.
 *
 * @param {string} startDir
 * @param {(p: string) => boolean} [exists]
 * @returns {string | null}
 */
export function findBlueprintRoot(startDir, exists = existsSync) {
  let dir = startDir;
  for (let up = 0; up < MAX_DEPTH; up += 1) {
    if (exists(path.join(dir, BLUEPRINT_MARKER))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * The machine-wide fallback: one directory every checkout on this box shares.
 *
 * `env` is typed as a plain string map rather than as `process.env`: the only
 * variable read is XDG_STATE_HOME, and demanding the full environment shape
 * would mean a caller -- a test especially -- has to fabricate variables this
 * function never looks at.
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} home
 * @returns {string}
 */
export function machineStateDir(env, home) {
  const configured = env.XDG_STATE_HOME?.trim();
  const base = configured || path.join(home, '.local', 'state');
  return path.join(base, 'opentools');
}

/**
 * The directory the lock file belongs in, and which of the two rules chose it.
 * `kind` is reported to the user rather than inferred, because "which lock am I
 * holding" is the question this whole file exists to answer.
 */
/**
 * @param {{
 *   startDir: string,
 *   env?: Record<string, string | undefined>,
 *   home: string,
 *   exists?: (p: string) => boolean,
 * }} options
 * @returns {{ dir: string, kind: 'blueprint' | 'machine' }}
 */
export function resolveLockDir({
  startDir,
  env = process.env,
  home,
  exists = existsSync,
}) {
  const blueprint = findBlueprintRoot(startDir, exists);
  return blueprint
    ? { dir: blueprint, kind: 'blueprint' }
    : { dir: machineStateDir(env, home), kind: 'machine' };
}
