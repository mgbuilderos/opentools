#!/usr/bin/env node
/**
 * The part of `AGENT_BOARD.md` that kept being wrong, derived from git instead
 * of typed by hand.
 *
 * **What went wrong with the prose.** The board is the only shared state
 * between the agents working this repo, and it is a markdown file several of
 * them edit at once. Two failure modes showed up repeatedly on 2026-09-17 and
 * again on 2026-09-21:
 *
 * 1. **It described dead work as in flight.** `claude/engine`,
 *    `claude/selfhost`, `claude/exact-size`, `claude/id-mask` and
 *    `claude/offline` were all listed as active when they were uncommitted
 *    trees, or commits with no branch pointing at them, with no process
 *    attached. Prose cannot notice that it has gone stale.
 * 2. **Concurrent edits silently clobbered each other.** Two sessions wrote
 *    the deploy-lock paragraph within an hour and the second overwrote the
 *    first — a read-modify-write race on a whole file.
 *
 * So this does two things and nothing else:
 *
 * - `status` reports what git actually says about every worktree, and what is
 *   at risk. Nothing here is typed by a person, so nothing here can go stale.
 *   It runs in about two seconds, which is the difference between a command
 *   agents use and one they skip.
 * - `append` adds a line to the Done log with `O_APPEND`, which the kernel
 *   makes atomic for writes this size, so two agents appending at once both
 *   survive instead of one winning.
 *
 * `sync` writes the status into the board between markers, replacing only the
 * generated block and writing through a temp file and `rename`, so a reader
 * never sees a half-written board.
 *
 * What it deliberately does NOT do: decide anything. It reports
 * "unreferenced, and I could not find this patch on main" — never "lost". A
 * rebase leaves the same content under a new hash, so an unmatched commit is a
 * thing to check, not a thing to panic about.
 */

import { execFile, execFileSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const BEGIN = '<!-- BEGIN generated worktree status — scripts/board.mjs -->';
const END = '<!-- END generated worktree status -->';

const argv = process.argv.slice(2);
const command = argv[0] ?? 'status';
const valueOf = (name) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? null : (argv[at + 1] ?? null);
};

const here = path.dirname(fileURLToPath(import.meta.url));

function sharedRoot() {
  let dir = here;
  for (let up = 0; up < 8; up += 1) {
    if (existsSync(path.join(dir, 'AGENT_BOARD.md'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not find AGENT_BOARD.md above this script.');
}

const ROOT = sharedRoot();
/** Overridable so tests can exercise `sync` and `append` on a throwaway file. */
const BOARD = process.env.BOARD_FILE ?? path.join(ROOT, 'AGENT_BOARD.md');

const gitAsync = promisify(execFile);

/** Same as `git` but concurrent — 24 worktrees serially is 20 seconds. */
async function gitP(args, cwd = path.resolve(here, '..')) {
  try {
    const { stdout } = await gitAsync('git', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

function git(args, cwd = path.resolve(here, '..')) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Stash bookkeeping, not work anybody is about to lose.
 *
 * Exported because the first version wrote the alternatives with their own
 * trailing spaces — `On ` followed by the group's ` ` meant `On  `, which
 * matched nothing, so every stash commit was reported as work at risk. A
 * warning list full of noise is a warning list people stop reading.
 */
export function isStashCommit(subject) {
  return /^(index on|On|untracked files on|WIP on) /.test(subject ?? '');
}

/** Every worktree git knows about, with the facts prose kept getting wrong. */
async function worktrees() {
  const out = [];
  let current = null;
  for (const line of git(['worktree', 'list', '--porcelain']).split('\n')) {
    if (line.startsWith('worktree ')) {
      current = { dir: line.slice(9) };
      out.push(current);
    } else if (line.startsWith('branch ') && current) {
      current.branch = line.slice(7).replace('refs/heads/', '');
    } else if (line === 'detached' && current) {
      current.branch = null;
    }
  }

  await Promise.all(
    out.map(async (tree) => {
      tree.name = path.basename(tree.dir);
      // Three calls, run together: status, one log line, one ahead/behind.
      const [dirty, head, counts] = await Promise.all([
        gitP(['status', '--porcelain'], tree.dir),
        gitP(['log', '-1', '--format=%h%x00%cr'], tree.dir),
        gitP(
          ['rev-list', '--left-right', '--count', 'origin/main...HEAD'],
          tree.dir,
        ),
      ]);
      tree.dirty = dirty ? dirty.split('\n').filter(Boolean).length : 0;
      const [sha, when] = head.split('\0');
      tree.head = sha ?? '';
      tree.lastCommit = when ?? 'unknown';
      const [behind, ahead] = counts.split(/\s+/);
      tree.behind = Number(behind ?? 0);
      tree.ahead = Number(ahead ?? 0);
    }),
  );
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Commits no branch points at.
 *
 * Most are ordinary rebase debris, so each is checked against main by
 * patch-id. A match means the same change landed under a different hash and
 * the commit can be ignored. **A non-match is not proof of loss** — a rebase
 * that also modified the commit changes its patch-id too — so unmatched ones
 * are reported as "verify", never as "lost".
 */
async function unreferenced() {
  const raw = git(['fsck', '--unreachable', '--no-progress']);
  const commits = raw
    .split('\n')
    .filter((line) => line.startsWith('unreachable commit '))
    .map((line) => line.slice('unreachable commit '.length).trim());
  if (commits.length === 0) return [];

  const described = commits
    .map((sha) => {
      const meta = git(['log', '-1', '--format=%ct%x00%cr%x00%s', sha]);
      if (!meta) return null;
      const [when, relative, subject] = meta.split('\0');
      return { sha, when: Number(when), relative, subject };
    })
    .filter(Boolean)
    // Stash bookkeeping commits are not work anybody is about to lose.
    .filter(
      // Each alternative must NOT carry its own trailing space: the ` ` after
      // the group supplies it, and `On ` here meant `On  ` — which matched
      // nothing, so every stash commit leaked into the report as if it were
      // work at risk.
      (c) => !isStashCommit(c.subject),
    );
  if (described.length === 0) return [];

  // Ask main whether it already has a commit saying the same thing.
  //
  // The first version indexed every recent commit on main by patch-id, which
  // meant about 1,200 extra git processes and 25 seconds — slow enough that
  // nobody would run this, which would make the whole thing pointless. A
  // subject lookup is one call per candidate and catches the ordinary case: a
  // rebase keeps the message and changes the hash.
  //
  // It misses a commit whose message was reworded on the way, which is the
  // safe direction to be wrong in — it gets reported for a human to check
  // rather than quietly dropped.
  await Promise.all(
    described.map(async (commit) => {
      const twin = await gitP([
        'log',
        '--format=%H',
        '--fixed-strings',
        `--grep=${commit.subject}`,
        '-1',
        'origin/main',
      ]);
      commit.duplicate = Boolean(twin);
    }),
  );
  return described.sort((a, b) => b.when - a.when);
}

async function report() {
  const [trees, loose] = await Promise.all([worktrees(), unreferenced()]);
  const unmatched = loose.filter((c) => !c.duplicate);

  const lines = [];
  lines.push(
    `_Generated by \`npm run board\` at ${new Date().toISOString()}._`,
  );
  lines.push('');
  lines.push(
    'Nothing in this block is typed by hand, so it cannot go stale the way the',
    'prose above it did. `ahead`/`behind` are against `origin/main`.',
    '',
  );
  lines.push(
    '| worktree | branch | ahead | behind | uncommitted | last commit |',
  );
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  for (const t of trees) {
    lines.push(
      `| \`${t.name}\` | ${t.branch ? `\`${t.branch}\`` : '**detached**'} | ${t.ahead} | ${t.behind} | ${t.dirty} | ${t.lastCommit} |`,
    );
  }

  const risky = trees.filter((t) => t.dirty > 0 || t.ahead > 0 || !t.branch);
  lines.push('');
  if (risky.length === 0) {
    lines.push(
      '**Nothing is at risk:** every worktree is clean and level with `origin/main`.',
    );
  } else {
    lines.push(
      '**Work that exists only here.** Not a reprimand — just what would be lost if these trees were cleaned:',
    );
    lines.push('');
    for (const t of risky) {
      const bits = [];
      if (!t.branch) bits.push('**detached HEAD**');
      if (t.ahead > 0) bits.push(`${t.ahead} commit(s) not on \`origin/main\``);
      if (t.dirty > 0) bits.push(`${t.dirty} uncommitted file(s)`);
      lines.push(`- \`${t.name}\` — ${bits.join(', ')}`);
    }
  }

  lines.push('');
  if (unmatched.length === 0) {
    lines.push(
      `**No unreferenced work.** ${loose.length} unreachable commit(s) exist and every one says something already on \`origin/main\`, i.e. ordinary rebase debris.`,
    );
  } else {
    lines.push(
      '**Commits no branch points at, saying something `origin/main` does not say.**',
      'A rebase keeps the message and changes the hash, so anything whose subject is',
      'already on main is filtered out as ordinary debris. What is left is a list to',
      '**check** — a reworded commit lands here too — not proof anything was lost.',
      'Rescue one with',
      '`git branch rescue/<name> <sha>`:',
      '',
    );
    for (const c of unmatched.slice(0, 15)) {
      lines.push(`- \`${c.sha.slice(0, 8)}\` (${c.relative}) — ${c.subject}`);
    }
    if (unmatched.length > 15) {
      lines.push(`- …and ${unmatched.length - 15} more`);
    }
  }
  return { text: lines.join('\n'), trees, loose, unmatched };
}

async function status() {
  const { text } = await report();
  console.log('\n' + text + '\n');
}

/** Replaces only the generated block, atomically. */
async function sync() {
  const { text } = await report();
  const board = readFileSync(BOARD, 'utf8');
  const block = `${BEGIN}\n\n${text}\n\n${END}`;

  let next;
  if (board.includes(BEGIN) && board.includes(END)) {
    const before = board.slice(0, board.indexOf(BEGIN));
    const after = board.slice(board.indexOf(END) + END.length);
    next = before + block + after;
  } else {
    // First run: put it at the top of section 4, which is the section that
    // kept being wrong.
    const marker = '## 4. In progress\n';
    const at = board.indexOf(marker);
    if (at === -1)
      throw new Error('No "## 4. In progress" heading to anchor to.');
    const cut = at + marker.length;
    next = board.slice(0, cut) + '\n' + block + '\n' + board.slice(cut);
  }

  // Temp file plus rename, so a concurrent reader never sees half a board.
  const temp = `${BOARD}.${process.pid}.tmp`;
  writeFileSync(temp, next);
  renameSync(temp, BOARD);
  console.log(`  board: generated block written to ${path.basename(BOARD)}`);
}

/**
 * Appends one line to the Done log with O_APPEND.
 *
 * The board's own history is append-only, and appending is the one edit that
 * does not need read-modify-write. The kernel keeps a single `O_APPEND` write
 * of this size atomic, so two agents recording a result at the same moment
 * both keep theirs — which is exactly what did not happen to the deploy-lock
 * entry on 2026-09-21.
 */
function append() {
  const text = valueOf('text');
  if (!text) {
    console.error('append needs --text "<one line for the done log>"');
    process.exit(2);
  }
  const who = valueOf('by') ?? 'unknown agent';
  const stamp = new Date().toISOString().slice(0, 10);
  const line = `\n- ${stamp} · ${who} · ${text}\n`;
  const fd = openSync(BOARD, 'a');
  writeSync(fd, line);
  closeSync(fd);
  console.log('  board: appended to the done log');
}

const commands = { status, sync, append };

// Only act when run as a program. Imported by a test, this file must define
// things and do nothing — the same property `prerender-to-assets.mjs` lacks,
// which is why its logic had to be moved out to be tested at all.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const run = commands[command];
  if (!run) {
    console.error(`Unknown command '${command}'. Use: status | sync | append`);
    process.exit(2);
  }
  run();
}

export { append, status, sync };
