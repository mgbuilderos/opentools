import { describe, expect, it } from 'vitest';
import {
  buildXingFrame,
  decodeFrameHeader,
  findFrameSync,
  framesAreCompatible,
  hasFrameSync,
  readVbrHeader,
  sideInfoSize,
  samplesPerFrame,
} from './mp3-frames';

/** Builds a 4-byte MPEG header from the fields the standard packs into it. */
function header(options: {
  versionBits: number;
  layerBits: number;
  bitrateIndex: number;
  sampleRateIndex: number;
  padding?: 0 | 1;
  channelBits?: number;
  protection?: 0 | 1;
}): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = 0xff;
  bytes[1] =
    0xe0 |
    (options.versionBits << 3) |
    (options.layerBits << 1) |
    (options.protection ?? 1);
  bytes[2] =
    (options.bitrateIndex << 4) |
    (options.sampleRateIndex << 2) |
    ((options.padding ?? 0) << 1);
  bytes[3] = (options.channelBits ?? 0) << 6;
  return bytes;
}

function pad(bytes: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  out.set(bytes, 0);
  return out;
}

describe('MPEG frame header decoding', () => {
  it('reads an MPEG-1 Layer III 128 kbps 44.1 kHz stereo frame', () => {
    // 144 * 128000 / 44100 = 417.9 -> 417 bytes, no padding.
    const bytes = pad(
      header({
        versionBits: 0b11,
        layerBits: 0b01,
        bitrateIndex: 9,
        sampleRateIndex: 0,
      }),
      600,
    );
    const frame = decodeFrameHeader(bytes, 0);
    expect(frame).not.toBeNull();
    expect(frame?.version).toBe('MPEG1');
    expect(frame?.layer).toBe(3);
    expect(frame?.bitrateKbps).toBe(128);
    expect(frame?.sampleRate).toBe(44_100);
    expect(frame?.channelMode).toBe('stereo');
    expect(frame?.channels).toBe(2);
    expect(frame?.samples).toBe(1152);
    expect(frame?.length).toBe(417);
    expect(frame?.durationMs).toBeCloseTo(26.1224, 3);
    expect(frame?.crcProtected).toBe(false);
  });

  it('adds one byte for the padding bit', () => {
    const bytes = pad(
      header({
        versionBits: 0b11,
        layerBits: 0b01,
        bitrateIndex: 9,
        sampleRateIndex: 0,
        padding: 1,
      }),
      600,
    );
    expect(decodeFrameHeader(bytes, 0)?.length).toBe(418);
    expect(decodeFrameHeader(bytes, 0)?.padded).toBe(true);
  });

  it('reads an MPEG-2 Layer III 32 kbps 22.05 kHz mono frame', () => {
    // MPEG-2 Layer III is 576 samples: 72 * 32000 / 22050 = 104.4 -> 104 bytes.
    const bytes = pad(
      header({
        versionBits: 0b10,
        layerBits: 0b01,
        bitrateIndex: 4,
        sampleRateIndex: 0,
        channelBits: 0b11,
      }),
      200,
    );
    const frame = decodeFrameHeader(bytes, 0);
    expect(frame?.version).toBe('MPEG2');
    expect(frame?.sampleRate).toBe(22_050);
    expect(frame?.bitrateKbps).toBe(32);
    expect(frame?.channels).toBe(1);
    expect(frame?.samples).toBe(576);
    expect(frame?.length).toBe(104);
  });

  it('uses the four-byte slot size for Layer I', () => {
    // Layer I: (12 * 32000 / 32000 + 0) * 4 = 48 bytes.
    const bytes = pad(
      header({
        versionBits: 0b11,
        layerBits: 0b11,
        bitrateIndex: 1,
        sampleRateIndex: 2,
      }),
      100,
    );
    const frame = decodeFrameHeader(bytes, 0);
    expect(frame?.layer).toBe(1);
    expect(frame?.samples).toBe(384);
    expect(frame?.length).toBe(48);
  });

  it('marks CRC-protected frames', () => {
    const bytes = pad(
      header({
        versionBits: 0b11,
        layerBits: 0b01,
        bitrateIndex: 9,
        sampleRateIndex: 0,
        protection: 0,
      }),
      600,
    );
    expect(decodeFrameHeader(bytes, 0)?.crcProtected).toBe(true);
  });

  it.each([
    [
      'the reserved MPEG version',
      {
        versionBits: 0b01,
        layerBits: 0b01,
        bitrateIndex: 9,
        sampleRateIndex: 0,
      },
    ],
    [
      'the reserved layer',
      {
        versionBits: 0b11,
        layerBits: 0b00,
        bitrateIndex: 9,
        sampleRateIndex: 0,
      },
    ],
    [
      'the free-format bitrate',
      {
        versionBits: 0b11,
        layerBits: 0b01,
        bitrateIndex: 0,
        sampleRateIndex: 0,
      },
    ],
    [
      'the invalid bitrate index',
      {
        versionBits: 0b11,
        layerBits: 0b01,
        bitrateIndex: 15,
        sampleRateIndex: 0,
      },
    ],
    [
      'the reserved sample rate',
      {
        versionBits: 0b11,
        layerBits: 0b01,
        bitrateIndex: 9,
        sampleRateIndex: 3,
      },
    ],
  ])('refuses %s', (_label, options) => {
    const bytes = pad(header(options), 600);
    expect(decodeFrameHeader(bytes, 0)).toBeNull();
  });

  it('refuses a missing sync word and an out-of-range offset', () => {
    expect(
      decodeFrameHeader(new Uint8Array([0x00, 0x00, 0x00, 0x00]), 0),
    ).toBeNull();
    expect(decodeFrameHeader(new Uint8Array([0xff, 0xfb]), 0)).toBeNull();
    expect(decodeFrameHeader(new Uint8Array(600), 700)).toBeNull();
    expect(hasFrameSync(new Uint8Array([0xff, 0xfb]), 0)).toBe(true);
    expect(hasFrameSync(new Uint8Array([0xff, 0x0b]), 0)).toBe(false);
  });

  it('knows how many samples and side-info bytes each shape carries', () => {
    expect(samplesPerFrame('MPEG1', 3)).toBe(1152);
    expect(samplesPerFrame('MPEG2', 3)).toBe(576);
    expect(samplesPerFrame('MPEG2.5', 3)).toBe(576);
    expect(samplesPerFrame('MPEG2', 2)).toBe(1152);
    expect(samplesPerFrame('MPEG1', 1)).toBe(384);
    expect(sideInfoSize('MPEG1', 'stereo')).toBe(32);
    expect(sideInfoSize('MPEG1', 'mono')).toBe(17);
    expect(sideInfoSize('MPEG2', 'stereo')).toBe(17);
    expect(sideInfoSize('MPEG2.5', 'mono')).toBe(9);
  });
});

describe('finding the start of a stream', () => {
  function realFrames(count: number, leading: Uint8Array): Uint8Array {
    const one = header({
      versionBits: 0b11,
      layerBits: 0b01,
      bitrateIndex: 9,
      sampleRateIndex: 0,
    });
    const out = new Uint8Array(leading.length + count * 417);
    out.set(leading, 0);
    for (let index = 0; index < count; index += 1) {
      out.set(one, leading.length + index * 417);
    }
    return out;
  }

  it('skips a byte pair that looks like a sync but leads nowhere', () => {
    // 0xFF 0xFB is a perfectly valid-looking header, but nothing follows it in
    // the right place, so the chain check must reject it.
    const decoy = new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x11, 0x22]);
    const bytes = realFrames(4, decoy);
    expect(findFrameSync(bytes, 0, bytes.length)).toBe(decoy.length);
  });

  it('returns -1 when there is no stream at all', () => {
    const noise = new Uint8Array(4096);
    noise.fill(0x41);
    expect(findFrameSync(noise, 0, noise.length)).toBe(-1);
  });

  it('accepts a stream that is shorter than the confirmation chain', () => {
    const bytes = realFrames(1, new Uint8Array(0));
    expect(findFrameSync(bytes, 0, bytes.length)).toBe(0);
  });

  it('compares the fields that must not change inside one stream', () => {
    const a = decodeFrameHeader(realFrames(1, new Uint8Array(0)), 0);
    const mono = pad(
      header({
        versionBits: 0b11,
        layerBits: 0b01,
        bitrateIndex: 9,
        sampleRateIndex: 0,
        channelBits: 0b11,
      }),
      600,
    );
    const b = decodeFrameHeader(mono, 0);
    expect(a && b && framesAreCompatible(a, b)).toBe(false);
    expect(a && framesAreCompatible(a, a)).toBe(true);
  });
});

describe('Xing header construction', () => {
  it('writes a frame that decodes as a real MPEG frame and reads back', () => {
    const frameBytes = buildXingFrame({
      version: 'MPEG1',
      layer: 3,
      sampleRate: 44_100,
      channelMode: 'stereo',
      frameCount: 1234,
      byteCount: 567_890,
    });

    const frame = decodeFrameHeader(frameBytes, 0);
    expect(frame).not.toBeNull();
    expect(frame?.length).toBe(frameBytes.length);
    expect(frame?.version).toBe('MPEG1');
    expect(frame?.layer).toBe(3);
    expect(frame?.sampleRate).toBe(44_100);
    expect(frame?.channelMode).toBe('stereo');

    const vbr = frame && readVbrHeader(frameBytes, frame);
    expect(vbr?.kind).toBe('Xing');
    expect(vbr?.frameCount).toBe(1234);
    expect(vbr?.byteCount).toBe(567_890);
  });

  it('works for mono MPEG-2, where the side info is shorter', () => {
    const frameBytes = buildXingFrame({
      version: 'MPEG2',
      layer: 3,
      sampleRate: 22_050,
      channelMode: 'mono',
      frameCount: 41,
      byteCount: 4284,
    });
    const frame = decodeFrameHeader(frameBytes, 0);
    expect(frame?.channels).toBe(1);
    const vbr = frame && readVbrHeader(frameBytes, frame);
    expect(vbr?.frameCount).toBe(41);
    expect(vbr?.byteCount).toBe(4284);
  });

  it('refuses shapes it cannot describe', () => {
    expect(() =>
      buildXingFrame({
        version: 'MPEG1',
        layer: 2,
        sampleRate: 44_100,
        channelMode: 'stereo',
        frameCount: 1,
        byteCount: 1,
      }),
    ).toThrow('only defined for MPEG Layer III');

    expect(() =>
      buildXingFrame({
        version: 'MPEG1',
        layer: 3,
        sampleRate: 22_050,
        channelMode: 'stereo',
        frameCount: 1,
        byteCount: 1,
      }),
    ).toThrow('not a valid sample rate for MPEG1');
  });
});
