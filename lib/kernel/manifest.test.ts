import { describe, expect, it } from 'vitest';
import { ALL_ADAPTER_OPERATIONS } from './adapters';
import { descriptorFor, descriptorKey } from './descriptor';
import { KERNEL_MANIFEST } from './manifest';

describe('kernel manifest', () => {
  it('is the exact small descriptor view of every adapter', () => {
    expect(KERNEL_MANIFEST).toEqual(ALL_ADAPTER_OPERATIONS.map(descriptorFor));
  });

  it('registers every measured workbench operation once per source', () => {
    expect(KERNEL_MANIFEST).toHaveLength(648);
    expect(new Set(KERNEL_MANIFEST.map(descriptorKey)).size).toBe(648);
    expect(new Set(KERNEL_MANIFEST.map((item) => item.source)).size).toBe(22);
  });
});
