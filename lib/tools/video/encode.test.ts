import { describe, expect, it } from 'vitest';
import {
  assertSupportedVideoCodec,
  buildAvc1SampleDescription,
  estimateTargetBitrate,
  getAvcCodecString,
  getDecoderConfig,
  isWebCodecsSupported,
} from './encode';
import { type Mp4Track } from './mp4';

describe('WebCodecs video encoding utilities', () => {
  it('detects WebCodecs support state safely in Node test environment', () => {
    // In Node (non-browser), isWebCodecsSupported returns false without throwing
    expect(isWebCodecsSupported()).toBe(false);
  });

  describe('getAvcCodecString dimension mapping', () => {
    it('selects Baseline Level 3.0 for standard definition (<= 720x480)', () => {
      expect(getAvcCodecString(640, 480)).toBe('avc1.42001e');
      expect(getAvcCodecString(720, 480)).toBe('avc1.42001e');
      expect(getAvcCodecString(160, 120)).toBe('avc1.42001e');
    });

    it('selects Baseline Level 3.1 for 720p HD (<= 1280x720)', () => {
      expect(getAvcCodecString(1280, 720)).toBe('avc1.42001f');
      expect(getAvcCodecString(854, 480)).toBe('avc1.42001f');
      expect(getAvcCodecString(720, 1280)).toBe('avc1.42001f'); // Portrait 720p
    });

    it('selects Main Level 4.2 for 1080p Full HD (<= 1920x1080)', () => {
      expect(getAvcCodecString(1920, 1080)).toBe('avc1.4d002a');
      expect(getAvcCodecString(1080, 1920)).toBe('avc1.4d002a'); // Portrait 1080p
      expect(getAvcCodecString(1440, 1080)).toBe('avc1.4d002a');
    });

    it('selects High Level 5.1 for 4K UHD (> 1080p)', () => {
      expect(getAvcCodecString(3840, 2160)).toBe('avc1.640033');
      expect(getAvcCodecString(2560, 1440)).toBe('avc1.640033');
    });
  });

  describe('assertSupportedVideoCodec', () => {
    it('accepts avc1 and avc3 without throwing', () => {
      expect(() =>
        assertSupportedVideoCodec({ codec: 'avc1' } as Mp4Track),
      ).not.toThrow();
      expect(() =>
        assertSupportedVideoCodec({ codec: 'avc3' } as Mp4Track),
      ).not.toThrow();
    });

    it('refuses HEVC by name with an informative message', () => {
      expect(() =>
        assertSupportedVideoCodec({ codec: 'hvc1' } as Mp4Track),
      ).toThrow(/HEVC \(H\.265\)/);
      expect(() =>
        assertSupportedVideoCodec({ codec: 'hev1' } as Mp4Track),
      ).toThrow(/HEVC \(H\.265\)/);
    });

    it('refuses AV1 by name with an informative message', () => {
      expect(() =>
        assertSupportedVideoCodec({ codec: 'av01' } as Mp4Track),
      ).toThrow(/AV1/);
    });

    it('refuses other unknown codecs', () => {
      expect(() =>
        assertSupportedVideoCodec({ codec: 'vp09' } as Mp4Track),
      ).toThrow(/vp09/);
    });
  });

  describe('buildAvc1SampleDescription and container round-trip', () => {
    it('builds an stsd box that readMp4 parses with exact width, height, and codec', () => {
      // Mock avcC payload (minimum 7 bytes: version 1, profile, flags, level, lengthSize, spsCount, etc.)
      const mockAvcC = new Uint8Array([
        0x01, 0x4d, 0x00, 0x2a, 0xff, 0xe1, 0x00, 0x0a, 0x67, 0x4d, 0x00, 0x2a,
        0x9d, 0xa0, 0x1e, 0x00, 0x89, 0xf9, 0x01, 0x00, 0x04, 0x68, 0xee, 0x3c,
        0x80,
      ]);

      const stsd = buildAvc1SampleDescription(1280, 720, mockAvcC);
      expect(stsd.length).toBeGreaterThan(86);

      // Verify findBoxPayload can extract avcC
      const track: Mp4Track = {
        id: 1,
        kind: 'video',
        codec: 'avc1',
        timescale: 1000,
        duration: 1000,
        width: 1280,
        height: 720,
        channels: null,
        sampleRate: null,
        sampleDescription: stsd,
        samples: [],
      };

      const config = getDecoderConfig(track);
      expect(config.codec).toBe('avc1.4d002a');
      expect(config.description).toEqual(mockAvcC);
    });
  });

  describe('estimateTargetBitrate', () => {
    it('calculates bitrate from target size and duration', () => {
      const bps = estimateTargetBitrate(1920, 1080, 10, {
        targetSizeBytes: 5 * 1024 * 1024, // 5 MB in 10s -> ~4 Mbps
      });
      // 5 MB = 40 Mb. In 10s = 4 Mbps. Minus audio/overhead = ~3.9 Mbps
      expect(bps).toBeGreaterThan(3_000_000);
      expect(bps).toBeLessThan(4_500_000);
    });

    it('calculates quality-based bitrate presets', () => {
      const high = estimateTargetBitrate(1920, 1080, 10, { quality: 'high' });
      const med = estimateTargetBitrate(1920, 1080, 10, { quality: 'medium' });
      const low = estimateTargetBitrate(1920, 1080, 10, { quality: 'low' });

      expect(high).toBeGreaterThan(med);
      expect(med).toBeGreaterThan(low);
      expect(low).toBeGreaterThanOrEqual(250_000);
    });
  });
});
