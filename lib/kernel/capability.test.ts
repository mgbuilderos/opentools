import { describe, expect, it } from 'vitest';
import type { KernelOperationDescriptor } from './types';
import { detectDeviceMemory, reportOperationCapability } from './capability';
import { KERNEL_MANIFEST } from './manifest';

const MIB = 1024 * 1024;

function descriptor(
  overrides: Partial<KernelOperationDescriptor> = {},
): KernelOperationDescriptor {
  return {
    id: 'sample',
    source: 'test',
    name: 'Sample',
    description: 'Sample operation',
    input: 'file',
    params: [],
    output: { kind: 'files' },
    runtime: 'pure',
    deterministic: true,
    streamable: false,
    ...overrides,
  };
}

describe('operation capability report', () => {
  it('publishes an explicit streamable boolean for every registered operation', () => {
    expect(KERNEL_MANIFEST.length).toBeGreaterThan(0);
    expect(
      KERNEL_MANIFEST.every(
        (operation) => typeof operation.streamable === 'boolean',
      ),
    ).toBe(true);
  });

  it('reports streaming as heap-independent and exposes its declared chunk', () => {
    expect(
      reportOperationCapability(
        descriptor({ streamable: true, chunkSizeBytes: 2 * MIB }),
        { heapLimitBytes: 128 * MIB },
      ),
    ).toEqual({
      streamable: true,
      chunkSizeBytes: 2 * MIB,
      maxInputBytes: null,
      limitingFactor: 'streaming',
      device: { heapLimitBytes: 128 * MIB },
    });
  });

  it('uses the smaller of a declared ceiling and measured working-set ceiling', () => {
    const operation = descriptor({
      inputLimitBytes: 400 * MIB,
      workingSetMultiplier: 2,
    });

    expect(
      reportOperationCapability(operation, {
        heapLimitBytes: 512 * MIB,
        deviceMemoryBytes: 8 * 1024 * MIB,
      }),
    ).toMatchObject({
      streamable: false,
      maxInputBytes: 256 * MIB,
      limitingFactor: 'device-heap',
    });
  });

  it('returns unknown instead of inventing a ceiling without evidence', () => {
    expect(reportOperationCapability(descriptor(), {})).toMatchObject({
      maxInputBytes: null,
      limitingFactor: 'unknown',
    });
  });

  it('detects memory without requiring browser-only metrics', () => {
    expect(detectDeviceMemory()).toEqual(expect.any(Object));
  });
});
