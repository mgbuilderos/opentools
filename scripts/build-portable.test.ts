import { describe, expect, it } from 'vitest';
import { humanBytes } from './build-portable.mjs';

describe('portable bundle reporting', () => {
  it('reports a size a person can read', () => {
    expect(humanBytes(512)).toBe('512 B');
    expect(humanBytes(2048)).toBe('2.0 KiB');
    expect(humanBytes(5 * 1024 ** 2)).toBe('5.0 MiB');
    expect(humanBytes(2 * 1024 ** 3)).toBe('2.00 GiB');
  });
});
