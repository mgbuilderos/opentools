import { describe, expect, it } from 'vitest';

import { createRunQueue } from './workbench-run-queue';

/**
 * A run whose completion this test decides, so none of these cases depends on
 * a timer or on how fast the machine is.
 */
function deferred() {
  let settle!: () => void;
  const promise = new Promise<void>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

describe('createRunQueue', () => {
  it('runs a single request', async () => {
    const seen: string[] = [];
    const queue = createRunQueue<string>(async (input) => {
      seen.push(input);
    });

    queue.request('a');
    await queue.settled();

    expect(seen).toEqual(['a']);
  });

  it('keeps a request that arrives while a run is in flight', async () => {
    // This is the whole point of the module. The old scheduler answered this
    // case with `if (!running) execute()` and lost 'b' for good.
    const seen: string[] = [];
    const first = deferred();
    const queue = createRunQueue<string>(async (input) => {
      seen.push(input);
      if (input === 'a') await first.promise;
    });

    queue.request('a');
    expect(seen).toEqual(['a']);

    queue.request('b'); // lands mid-run
    expect(seen).toEqual(['a']); // not started yet — one run at a time

    first.settle();
    await queue.settled();

    expect(seen).toEqual(['a', 'b']);
  });

  it('keeps only the newest of several requests made during one run', async () => {
    const seen: string[] = [];
    const first = deferred();
    const queue = createRunQueue<string>(async (input) => {
      seen.push(input);
      if (input === 'a') await first.promise;
    });

    queue.request('a');
    queue.request('b');
    queue.request('c');
    queue.request('d');
    first.settle();
    await queue.settled();

    // 'b' and 'c' were overtaken before they ever started: nobody is waiting
    // for a keystroke that has already been typed through.
    expect(seen).toEqual(['a', 'd']);
  });

  it('never runs two at once', async () => {
    let concurrent = 0;
    let peak = 0;
    const gates = [deferred(), deferred()];
    const queue = createRunQueue<number>(async (input) => {
      concurrent += 1;
      peak = Math.max(peak, concurrent);
      await gates[input % gates.length]!.promise;
      concurrent -= 1;
    });

    queue.request(0);
    queue.request(1);
    for (const gate of gates) gate.settle();
    await queue.settled();

    expect(peak).toBe(1);
  });

  it('tells a run that it has been superseded', async () => {
    const verdicts: Array<{ input: string; superseded: boolean }> = [];
    const first = deferred();
    const queue = createRunQueue<string>(async (input, superseded) => {
      if (input === 'a') await first.promise;
      verdicts.push({ input, superseded: superseded() });
    });

    queue.request('a');
    queue.request('b'); // 'a' is now stale before it has finished
    first.settle();
    await queue.settled();

    expect(verdicts).toEqual([
      { input: 'a', superseded: true },
      { input: 'b', superseded: false },
    ]);
  });

  it('does not strand a waiting request when a run fails', async () => {
    const seen: string[] = [];
    const first = deferred();
    const queue = createRunQueue<string>(async (input) => {
      seen.push(input);
      if (input === 'a') {
        await first.promise;
        throw new Error('this run failed');
      }
    });

    queue.request('a');
    queue.request('b');
    first.settle();
    await queue.settled();

    expect(seen).toEqual(['a', 'b']);
  });

  it('reports busy once around a whole drain, not once per run', async () => {
    const changes: boolean[] = [];
    const first = deferred();
    const queue = createRunQueue<string>(
      async (input) => {
        if (input === 'a') await first.promise;
      },
      (busy) => changes.push(busy),
    );

    expect(queue.busy).toBe(false);
    queue.request('a');
    expect(queue.busy).toBe(true);
    queue.request('b');
    first.settle();
    await queue.settled();

    // Two runs, but the indicator goes on once and off once: it must not
    // flicker between a run and the one queued behind it.
    expect(changes).toEqual([true, false]);
    expect(queue.busy).toBe(false);
  });

  it('starts a fresh drain after it has gone idle', async () => {
    const seen: string[] = [];
    const queue = createRunQueue<string>(async (input) => {
      seen.push(input);
    });

    queue.request('a');
    await queue.settled();
    queue.request('b');
    await queue.settled();

    expect(seen).toEqual(['a', 'b']);
    expect(queue.busy).toBe(false);
  });
});
