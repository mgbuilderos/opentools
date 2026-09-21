/**
 * Choosing a port that another worktree is not already using.
 *
 * **Why this exists.** `prerender-to-assets.mjs` starts a short-lived
 * `wrangler dev` to capture `/sitemap.xml`, `/robots.txt` and the two llms
 * files, and it used a hardcoded `8791`. Several lanes build at once in this
 * repo, so two builds would ask for the same port and the second died with
 * nothing but `wrangler dev exited with 1` — the same shape of bug as the
 * deploy lock: a shared resource with no arbitration.
 *
 * Kept in its own file because the capture script does its work at import
 * time, which makes it impossible to test. These two functions are the part
 * with the logic in it.
 */

import { createServer } from 'node:net';

/**
 * Asks the OS for a port nothing is listening on, by binding port 0 and reading
 * back what it assigned.
 *
 * **This is not a reservation.** The socket is closed before the port is
 * returned, so another process can take it in the gap before the caller binds
 * it. That gap cannot be closed — a child process cannot inherit a listening
 * socket here — so the caller must retry instead of assuming success.
 */
export function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/**
 * True when a failure was "something else already had that port" rather than a
 * real fault.
 *
 * The distinction decides whether retrying is honest or is just hiding a
 * genuine error behind five attempts, so it reads the message rather than
 * assuming every early exit is a collision.
 */
export function isPortCollision(error) {
  return /EADDRINUSE|address already in use|already in use|listen EACCES/i.test(
    error?.stderr ?? error?.message ?? '',
  );
}
