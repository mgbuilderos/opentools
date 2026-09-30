/**
 * One run at a time, and never lose the last request.
 *
 * Every workbench on this site computes on its own: a debounced timer fires a
 * quarter of a second after the last change and runs the operation. That
 * scheduler needs an answer to one question — what should happen when the
 * timer fires while a run is still in flight?
 *
 * Until 2026-09-30 the answer was `if (!running) execute()`, which is wrong
 * twice over. `running` was read from the closure the effect was created in,
 * so it could be stale; and `running` was not a dependency of that effect, so
 * when the run in flight finished, nothing re-armed the tick that had been
 * skipped. The change the visitor made during a run was therefore dropped for
 * good, and the panel went on showing a result for input that was no longer on
 * screen — with no spinner and no error to say so.
 *
 * This queue answers it the other way: a request that arrives during a run is
 * kept and performed when that run finishes. Only the newest waiting request
 * survives, because an intermediate keystroke nobody is waiting for is not
 * worth computing.
 *
 * It is a plain module with no React in it so the behaviour can be tested
 * directly — this repository's browser gate cannot observe the case at all
 * (see `workbench-run-queue.test.ts` and the note in the spec of the same
 * name).
 */

export interface RunQueue<T> {
  /**
   * Ask for a run with these inputs. Safe to call at any time, including while
   * a run is in flight and from inside `perform` itself.
   */
  request: (input: T) => void;
  /**
   * Resolves once the queue has run everything asked of it and gone idle, or
   * immediately if it already is. Lets a test await the queue instead of
   * guessing at a delay, which is the only way to assert any of this without
   * writing a timing-dependent test of a scheduler.
   */
  settled: () => Promise<void>;
  /** True while a run is in flight. */
  readonly busy: boolean;
}

export function createRunQueue<T>(
  /**
   * Does the work. It is handed the inputs of the request it is serving and a
   * `superseded` predicate: true once a newer request is waiting, which is the
   * signal to abandon a result nobody is looking at any more rather than paint
   * it for the instant before the next one lands.
   *
   * A rejection is treated as "this run is over". `perform` is expected to
   * report its own failures; the queue only makes sure one failing run cannot
   * strand the request waiting behind it.
   */
  perform: (input: T, superseded: () => boolean) => Promise<void>,
  /**
   * Told when the queue starts and stops working, so a caller can drive a
   * "Working..." indicator. It fires once around a whole drain, not once per
   * request, so two runs back to back do not flicker the indicator off and on.
   */
  onBusyChange: (busy: boolean) => void = () => {},
): RunQueue<T> {
  let busy = false;
  let waiting: { input: T } | undefined;
  let idle: Array<() => void> = [];

  const superseded = () => waiting !== undefined;

  async function drain() {
    busy = true;
    onBusyChange(true);
    try {
      while (waiting) {
        const { input } = waiting;
        waiting = undefined;
        try {
          await perform(input, superseded);
        } catch {
          // Deliberately swallowed: see `perform` above. Letting this out
          // would abandon a request that is already waiting, which is the
          // exact failure this queue exists to prevent.
        }
      }
    } finally {
      busy = false;
      onBusyChange(false);
      // Taken first: a waiter is free to queue more work, and that belongs to
      // the next drain rather than to the list this one is settling.
      const waiters = idle;
      idle = [];
      for (const resolve of waiters) resolve();
    }
  }

  return {
    request(input: T) {
      // Latest wins. A request that has not started yet has been overtaken,
      // so it is replaced rather than queued behind: the visitor is waiting
      // for the state they can see, not for each one they typed through.
      waiting = { input };
      if (!busy) void drain();
    },
    settled() {
      if (!busy) return Promise.resolve();
      return new Promise<void>((resolve) => {
        idle.push(resolve);
      });
    },
    get busy() {
      return busy;
    },
  };
}
