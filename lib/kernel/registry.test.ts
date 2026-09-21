import { describe, expect, it } from 'vitest';
import { descriptorKey } from './descriptor';
import { getOperation, KERNEL_OPERATIONS } from './registry';

describe('kernel registry', () => {
  it('addresses every operation by id and source', () => {
    for (const operation of KERNEL_OPERATIONS) {
      expect(getOperation(operation.id, operation.source)).toBe(operation);
    }
    expect(new Set(KERNEL_OPERATIONS.map(descriptorKey)).size).toBe(
      KERNEL_OPERATIONS.length,
    );
  });

  it('requires a source for a duplicate id', () => {
    expect(() => getOperation('url-normalizer')).toThrow(
      /multiple sources: developer-data, web/u,
    );
  });
});
