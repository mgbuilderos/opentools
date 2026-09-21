import { createServer, type Server } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { freePort, isPortCollision } from './free-port.mjs';

const open: Server[] = [];
const hold = (port: number) =>
  new Promise<Server>((resolve, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      open.push(server);
      resolve(server);
    });
  });

afterEach(() => {
  for (const server of open.splice(0)) server.close();
});

describe('choosing a capture port', () => {
  /**
   * The bug this replaced: `prerender-to-assets.mjs` hardcoded 8791, so two
   * worktrees building at once asked for the same port and the second build
   * died. Concurrent callers must not be handed the same number.
   */
  it('hands concurrent callers distinct ports', async () => {
    const ports = await Promise.all(Array.from({ length: 8 }, freePort));
    expect(new Set(ports).size).toBe(ports.length);
  });

  it('returns a port that can actually be bound', async () => {
    const port = await freePort();
    await expect(hold(port)).resolves.toBeDefined();
  });

  it('does not return a port already in use', async () => {
    const taken = await freePort();
    await hold(taken);
    const next = await Promise.all(Array.from({ length: 6 }, freePort));
    expect(next).not.toContain(taken);
  });
});

describe('recognising a port collision', () => {
  it('recognises what the OS actually reports', async () => {
    const port = await freePort();
    await hold(port);
    const error = await new Promise<NodeJS.ErrnoException>((resolve) => {
      const clash = createServer();
      clash.on('error', resolve);
      clash.listen(port, '127.0.0.1');
    });
    expect(error.code).toBe('EADDRINUSE');
    expect(isPortCollision(error)).toBe(true);
  });

  it('reads the captured stderr, which is where wrangler says it', () => {
    expect(
      isPortCollision({
        stderr: '[ERROR] listen EADDRINUSE: address already in use',
      }),
    ).toBe(true);
  });

  /**
   * The load-bearing half. If this returned true for everything, a genuine
   * build failure would be retried five times and then reported as a port
   * problem — which is worse than the bug being fixed.
   */
  it('does not mistake a real failure for a collision', () => {
    expect(isPortCollision({ stderr: 'Error: config file not found' })).toBe(
      false,
    );
    expect(isPortCollision({ message: 'wrangler dev exited with 1' })).toBe(
      false,
    );
    expect(isPortCollision(undefined)).toBe(false);
    expect(isPortCollision({})).toBe(false);
  });
});
