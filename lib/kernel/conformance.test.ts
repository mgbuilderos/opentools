import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KERNEL_OPERATIONS } from './registry';
import type {
  KernelOperation,
  OperationContext,
  OperationResult,
} from './types';

const bytes = new TextEncoder().encode('name,value\nalpha,1\nbeta,2\n');
const file = {
  name: 'sample.txt',
  type: 'text/plain',
  size: bytes.length,
  lastModified: 0,
  bytes,
};

function contextFor(operation: KernelOperation): OperationContext {
  return {
    text: '',
    files:
      operation.input === 'none' || operation.input === 'text' ? [] : [file],
    params: Object.fromEntries(
      operation.params.map((param) => [param.id, param.defaultValue]),
    ),
    signal: new AbortController().signal,
  };
}

async function outcome(
  operation: KernelOperation,
): Promise<{ ok: true; value: OperationResult } | { ok: false; error: Error }> {
  try {
    return { ok: true, value: await operation.run(contextFor(operation)) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

const networkNames = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
] as const;
const originalGlobals = new Map<string, PropertyDescriptor | undefined>();

beforeEach(() => {
  const blocked = () => {
    throw new Error('Kernel operation attempted network access.');
  };
  for (const name of networkNames) {
    originalGlobals.set(
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    );
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: blocked,
    });
  }
  originalGlobals.set(
    'navigator',
    Object.getOwnPropertyDescriptor(globalThis, 'navigator'),
  );
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { sendBeacon: blocked },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const [name, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  originalGlobals.clear();
});

describe('kernel conformance', () => {
  it('executes or refuses every default without empty or generic success', async () => {
    let successes = 0;
    let refusals = 0;
    for (const operation of KERNEL_OPERATIONS) {
      const result = await outcome(operation);
      if (result.ok) {
        successes += 1;
        if (result.value.kind === 'text')
          expect(
            result.value.text,
            `${operation.source}:${operation.id}`,
          ).not.toBe('');
        else
          expect(
            result.value.files.length,
            `${operation.source}:${operation.id}`,
          ).toBeGreaterThan(0);
      } else {
        refusals += 1;
        expect(
          result.error.message,
          `${operation.source}:${operation.id}`,
        ).toMatch(/\S.{5,}/u);
        expect(result.error.message).not.toMatch(
          /choose a supported .*operation/iu,
        );
        expect(result.error.message).not.toBe(
          'Kernel operation attempted network access.',
        );
        if (operation.runtime === 'pure') {
          expect(result.error).not.toBeInstanceOf(ReferenceError);
        }
      }
    }
    expect({ successes, refusals }).toEqual({ successes: 593, refusals: 38 });
  }, 30_000);

  it('is deterministic when the descriptor says it is', async () => {
    for (const operation of KERNEL_OPERATIONS.filter(
      (candidate) => candidate.deterministic,
    )) {
      const first = await outcome(operation);
      const second = await outcome(operation);
      expect(second, `${operation.source}:${operation.id}`).toEqual(first);
    }
  }, 30_000);

  it('rejects every already-cancelled operation', async () => {
    for (const operation of KERNEL_OPERATIONS) {
      const controller = new AbortController();
      controller.abort();
      await expect(
        operation.run({ ...contextFor(operation), signal: controller.signal }),
        `${operation.source}:${operation.id}`,
      ).rejects.toMatchObject({ name: 'AbortError' });
    }
  }, 30_000);
});
