import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

import { isStashCommit } from './board.mjs';

const run = promisify(execFile);
const script = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'board.mjs',
);

const dirs: string[] = [];
function throwawayBoard(body: string) {
  const dir = mkdtempSync(path.join(tmpdir(), 'board-'));
  dirs.push(dir);
  const file = path.join(dir, 'AGENT_BOARD.md');
  writeFileSync(file, body);
  return file;
}
const board = (file: string, ...args: string[]) =>
  run('node', [script, ...args], { env: { ...process.env, BOARD_FILE: file } });

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe('telling stash bookkeeping from work', () => {
  /**
   * The first version wrote `On ` as an alternative *and* a space after the
   * group, so it looked for `On  ` and matched nothing. Every stash commit
   * then showed up as work at risk, and a warning list full of noise is a
   * warning list nobody reads.
   */
  it('recognises the four shapes git actually writes', () => {
    expect(isStashCommit('On claude/nav-ia: nav-ia-wip-46e70847')).toBe(true);
    expect(isStashCommit('index on claude/x: 851d7fa feat(nav): list')).toBe(
      true,
    );
    expect(isStashCommit('untracked files on claude/x: 851d7fa')).toBe(true);
    expect(isStashCommit('WIP on main: 1234567 something')).toBe(true);
  });

  it('does not swallow real commits that merely start with similar words', () => {
    expect(isStashCommit('feat(subtitles): a subtitle workbench')).toBe(false);
    expect(isStashCommit('Online docs: fix a typo')).toBe(false);
    expect(isStashCommit('')).toBe(false);
    expect(isStashCommit(undefined)).toBe(false);
  });
});

describe('appending to the done log', () => {
  /**
   * The failure this exists for: on 2026-09-21 two sessions wrote the board
   * within an hour and the second silently overwrote the first, because a
   * whole-file read-modify-write has a window. An O_APPEND write of this size
   * is atomic, so concurrent writers all keep their line.
   */
  it('keeps every line when many agents append at once', async () => {
    const file = throwawayBoard('## 8. Done log\n');
    await Promise.all(
      Array.from({ length: 24 }, (_, i) =>
        board(file, 'append', '--by', `agent-${i}`, '--text', `entry ${i}`),
      ),
    );
    const text = readFileSync(file, 'utf8');
    for (let i = 0; i < 24; i += 1) {
      expect(text).toContain(`agent-${i}`);
      expect(text).toContain(`entry ${i}`);
    }
    // Nothing interleaved mid-line.
    const entries = text.split('\n').filter((l) => l.startsWith('- 20'));
    expect(entries).toHaveLength(24);
    for (const line of entries)
      expect(line).toMatch(/^- \d{4}-\d{2}-\d{2} · agent-\d+ · entry \d+$/);
  });

  it('refuses an append with no text rather than writing a blank entry', async () => {
    const file = throwawayBoard('## 8. Done log\n');
    await expect(board(file, 'append')).rejects.toMatchObject({ code: 2 });
    expect(readFileSync(file, 'utf8')).toBe('## 8. Done log\n');
  });
});

describe('the generated block', () => {
  /**
   * These two shell out to git across every worktree in the repo — two dozen
   * of them — so they are slower than a unit test and slower still when the
   * whole suite runs in parallel. The timeout is about that, not about
   * tolerating a slow `sync`: `npm run board` takes about two seconds on its
   * own, which is the number that matters for whether agents run it.
   */
  it(
    'is inserted under section 4 on the first run',
    { timeout: 60_000 },
    async () => {
      const file = throwawayBoard(
        '# Board\n\n## 4. In progress\n\nprose here\n',
      );
      await board(file, 'sync');
      const text = readFileSync(file, 'utf8');
      expect(text).toContain('BEGIN generated worktree status');
      expect(text).toContain('END generated worktree status');
      // The prose it sits above is left alone.
      expect(text).toContain('prose here');
      expect(text.indexOf('## 4. In progress')).toBeLessThan(
        text.indexOf('BEGIN generated worktree status'),
      );
    },
  );

  it(
    'replaces only itself on a second run, leaving hand-written text intact',
    { timeout: 60_000 },
    async () => {
      const file = throwawayBoard(
        '# Board\n\n## 4. In progress\n\nKEEP THIS CLAIM\n',
      );
      await board(file, 'sync');
      const first = readFileSync(file, 'utf8');
      await board(file, 'sync');
      const second = readFileSync(file, 'utf8');

      expect(second).toContain('KEEP THIS CLAIM');
      // Exactly one block, not one per run.
      expect(second.match(/BEGIN generated worktree status/g)).toHaveLength(1);
      expect(second.match(/END generated worktree status/g)).toHaveLength(1);
      expect(first.split('BEGIN')[0]).toBe(second.split('BEGIN')[0]);
    },
  );
});
