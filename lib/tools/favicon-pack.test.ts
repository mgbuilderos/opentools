import { describe, expect, it } from 'vitest';
import { encodeIco, type IcoFrame } from './favicon-pack';

describe('favicon pack and ICO encoder', () => {
  it('encodes multiple frames into a valid Microsoft ICO binary buffer', () => {
    // 1x1 dummy PNG bytes
    const png16 = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01,
    ]);
    const png32 = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x02,
    ]);

    const frames: IcoFrame[] = [
      { width: 16, height: 16, pngBytes: png16 },
      { width: 32, height: 32, pngBytes: png32 },
    ];

    const icoBytes = encodeIco(frames);
    expect(icoBytes.length).toBe(6 + 2 * 16 + png16.length + png32.length);

    // Header validation
    expect(icoBytes[0]).toBe(0);
    expect(icoBytes[1]).toBe(0);
    expect(icoBytes[2]).toBe(1); // Type 1 = ICO
    expect(icoBytes[3]).toBe(0);
    expect(icoBytes[4]).toBe(2); // Count = 2 frames
    expect(icoBytes[5]).toBe(0);

    // First directory entry
    expect(icoBytes[6]).toBe(16); // Width
    expect(icoBytes[7]).toBe(16); // Height
  });

  it('rejects empty frame arrays', () => {
    expect(() => encodeIco([])).toThrow('At least one image frame is required');
  });
});
