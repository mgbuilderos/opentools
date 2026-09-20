import { describe, expect, it } from 'vitest';
import { isLiveToolUrl } from '../lib/seo/live-tools';
import { SMART_DROPZONE_ACTIONS } from './smart-dropzone-actions';

describe('smart dropzone actions', () => {
  it('asserts every dropzone action href passes isLiveToolUrl()', () => {
    const invalidActions: Array<{ type: string; label: string; href: string }> =
      [];

    for (const [type, actions] of Object.entries(SMART_DROPZONE_ACTIONS)) {
      for (const action of actions) {
        if (!isLiveToolUrl(action.href)) {
          invalidActions.push({ type, label: action.label, href: action.href });
        }
      }
    }

    expect(invalidActions).toEqual([]);
  });

  it('contains at least one primary action for every detected input type', () => {
    for (const [type, actions] of Object.entries(SMART_DROPZONE_ACTIONS)) {
      const hasPrimary = actions.some((act) => act.isPrimary);
      expect(
        hasPrimary,
        `Expected input type ${type} to have a primary action`,
      ).toBe(true);
    }
  });

  it('describes true JSON capabilities without claiming schema validation', async () => {
    const { detectInput } = await import('./smart-dropzone');
    const dummyFile = new File(['{}'], 'data.json', {
      type: 'application/json',
    });
    const fileResult = detectInput('', dummyFile);
    expect(fileResult?.details).toBe(
      'Format and check the JSON, or generate TypeScript types or a Zod schema from it.',
    );
    expect(fileResult?.details).not.toContain('validate against schema');

    const textResult = detectInput('{"foo": "bar"}');
    expect(textResult?.details).toBe(
      'Format and check the JSON, or generate TypeScript types or a Zod schema from it.',
    );
    expect(textResult?.details).not.toContain('validate against schema');
  });

  it('handles subtitles, videos, and audio correctly when tools are not live (fallback to generic file)', async () => {
    const liveToolsModule = await import('../lib/seo/live-tools');
    const origIsLive = liveToolsModule.isLiveToolUrl;
    const { vi } = await import('vitest');
    const spy = vi
      .spyOn(liveToolsModule, 'isLiveToolUrl')
      .mockImplementation((url: string) => {
        if (
          url === '/subtitles/workbench' ||
          url === '/audio/mp3-toolkit' ||
          url === '/audio/convert' ||
          url === '/video/trim' ||
          url === '/image/metadata'
        ) {
          return false;
        }
        return origIsLive(url);
      });

    try {
      const { detectInput } = await import('./smart-dropzone');
      const srtFile = new File(
        ['1\n00:00:01,000 --> 00:00:02,000\nHello'],
        'test.srt',
        {
          type: 'text/plain',
        },
      );
      const mp3File = new File(['ID3fakebytes'], 'audio.mp3', {
        type: 'audio/mpeg',
      });
      const videoFile = new File(['fakevideo'], 'clip.mp4', {
        type: 'video/mp4',
      });
      const flacFile = new File(['fakeflac'], 'sound.flac', {
        type: 'audio/flac',
      });

      const srtResult = detectInput('', srtFile);
      expect(srtResult?.category).toBe('File');
      expect(srtResult?.typeLabel).toBe('SRT File');
      expect(
        srtResult?.actions.some((a) => a.href === '/subtitles/workbench'),
      ).toBe(false);

      const mp3Result = detectInput('', mp3File);
      expect(mp3Result?.category).toBe('File');
      expect(mp3Result?.typeLabel).toBe('MP3 File');
      expect(
        mp3Result?.actions.some((a) => a.href === '/audio/mp3-toolkit'),
      ).toBe(false);

      const videoResult = detectInput('', videoFile);
      expect(videoResult?.category).toBe('File');
      expect(videoResult?.typeLabel).toBe('MP4 File');
      expect(videoResult?.actions.some((a) => a.href === '/video/trim')).toBe(
        false,
      );

      const flacResult = detectInput('', flacFile);
      expect(flacResult?.category).toBe('File');
      expect(flacResult?.typeLabel).toBe('FLAC File');
      expect(flacResult?.actions.some((a) => a.href === '/audio/convert')).toBe(
        false,
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('suggests Subtitle workbench and MP3 toolkit when isLiveToolUrl returns true', async () => {
    const liveToolsModule = await import('../lib/seo/live-tools');
    const origIsLive = liveToolsModule.isLiveToolUrl;

    const { vi } = await import('vitest');
    const spy = vi
      .spyOn(liveToolsModule, 'isLiveToolUrl')
      .mockImplementation((url: string) => {
        if (url === '/subtitles/workbench' || url === '/audio/mp3-toolkit') {
          return true;
        }
        return origIsLive(url);
      });

    try {
      const { detectInput } = await import('./smart-dropzone');
      const subtitleExtensions = ['srt', 'vtt', 'sbv', 'lrc', 'ass', 'ssa'];

      for (const ext of subtitleExtensions) {
        const file = new File(['data'], `sample.${ext}`, {
          type: 'text/plain',
        });
        const result = detectInput('', file);
        expect(result?.category).toBe('Subtitles & Captions');
        expect(result?.typeLabel).toBe(`${ext.toUpperCase()} Subtitle File`);
        expect(result?.actions[0].href).toBe('/subtitles/workbench');
        expect(result?.actions[0].label).toBe('Subtitle workbench');
        expect(result?.actions[0].isPrimary).toBe(true);
      }

      const mp3ByExt = new File(['data'], 'song.mp3', {
        type: 'application/octet-stream',
      });
      const mp3ByExtResult = detectInput('', mp3ByExt);
      expect(mp3ByExtResult?.category).toBe('Audio');
      expect(mp3ByExtResult?.typeLabel).toBe('MP3 Audio');
      expect(mp3ByExtResult?.actions[0].href).toBe('/audio/mp3-toolkit');
      expect(mp3ByExtResult?.actions[0].label).toBe('MP3 toolkit');
      expect(mp3ByExtResult?.actions[0].isPrimary).toBe(true);

      const mp3ByMime = new File(['data'], 'audio-file', {
        type: 'audio/mpeg',
      });
      const mp3ByMimeResult = detectInput('', mp3ByMime);
      expect(mp3ByMimeResult?.category).toBe('Audio');
      expect(mp3ByMimeResult?.typeLabel).toBe('MP3 Audio');
      expect(mp3ByMimeResult?.actions[0].href).toBe('/audio/mp3-toolkit');
      expect(mp3ByMimeResult?.actions[0].label).toBe('MP3 toolkit');
      expect(mp3ByMimeResult?.actions[0].isPrimary).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('suggests Video trim for .mp4, .mov, and .m4v when isLiveToolUrl returns true', async () => {
    const liveToolsModule = await import('../lib/seo/live-tools');
    const origIsLive = liveToolsModule.isLiveToolUrl;

    const { vi } = await import('vitest');
    const spy = vi
      .spyOn(liveToolsModule, 'isLiveToolUrl')
      .mockImplementation((url: string) => {
        if (url === '/video/trim') return true;
        return origIsLive(url);
      });

    try {
      const { detectInput } = await import('./smart-dropzone');
      const videoFormats = ['mp4', 'mov', 'm4v'];

      for (const ext of videoFormats) {
        const file = new File(['videodata'], `clip.${ext}`, {
          type:
            ext === 'mp4'
              ? 'video/mp4'
              : ext === 'mov'
                ? 'video/quicktime'
                : 'video/x-m4v',
        });
        const result = detectInput('', file);
        expect(result?.category).toBe('Video');
        expect(result?.actions[0].href).toBe('/video/trim');
        expect(result?.actions[0].label).toBe(
          'Trim, mute or extract the audio',
        );
        expect(result?.actions[0].isPrimary).toBe(true);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it('suggests Convert to WAV for audio formats (.m4a, .flac, .ogg, .opus, .aiff, .wav)', async () => {
    const liveToolsModule = await import('../lib/seo/live-tools');
    const origIsLive = liveToolsModule.isLiveToolUrl;

    const { vi } = await import('vitest');
    const spy = vi
      .spyOn(liveToolsModule, 'isLiveToolUrl')
      .mockImplementation((url: string) => {
        if (url === '/audio/convert') return true;
        return origIsLive(url);
      });

    try {
      const { detectInput } = await import('./smart-dropzone');
      const audioFormats = ['m4a', 'flac', 'ogg', 'opus', 'aiff', 'wav'];

      for (const ext of audioFormats) {
        const file = new File(['audiodata'], `track.${ext}`, {
          type: 'application/octet-stream',
        });
        const result = detectInput('', file);
        expect(result?.category).toBe('Audio');
        expect(result?.actions[0].href).toBe('/audio/convert');
        expect(result?.actions[0].label).toBe('Convert to WAV');
        expect(result?.actions[0].isPrimary).toBe(true);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it('suggests both MP3 toolkit and Convert to WAV for .mp3 when both are live', async () => {
    const liveToolsModule = await import('../lib/seo/live-tools');
    const origIsLive = liveToolsModule.isLiveToolUrl;

    const { vi } = await import('vitest');
    const spy = vi
      .spyOn(liveToolsModule, 'isLiveToolUrl')
      .mockImplementation((url: string) => {
        if (url === '/audio/mp3-toolkit' || url === '/audio/convert')
          return true;
        return origIsLive(url);
      });

    try {
      const { detectInput } = await import('./smart-dropzone');
      const file = new File(['mp3data'], 'podcast.mp3', { type: 'audio/mpeg' });
      const result = detectInput('', file);
      expect(result?.category).toBe('Audio');
      expect(result?.actions).toHaveLength(2);
      expect(result?.actions[0].href).toBe('/audio/mp3-toolkit');
      expect(result?.actions[0].label).toBe('MP3 toolkit');
      expect(result?.actions[0].isPrimary).toBe(true);
      expect(result?.actions[1].href).toBe('/audio/convert');
      expect(result?.actions[1].label).toBe('Convert to WAV');
      expect(result?.actions[1].isPrimary).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('suggests Photo metadata for image formats (.jpg, .jpeg, .png, .webp) when isLiveToolUrl returns true', async () => {
    const liveToolsModule = await import('../lib/seo/live-tools');
    const origIsLive = liveToolsModule.isLiveToolUrl;

    const { vi } = await import('vitest');
    const spy = vi
      .spyOn(liveToolsModule, 'isLiveToolUrl')
      .mockImplementation((url: string) => {
        if (url === '/image/metadata') return true;
        return origIsLive(url);
      });

    try {
      const { detectInput } = await import('./smart-dropzone');
      const photoFormats = ['jpg', 'jpeg', 'png', 'webp'];

      for (const ext of photoFormats) {
        const file = new File(['imagedata'], `photo.${ext}`, {
          type:
            ext === 'png'
              ? 'image/png'
              : ext === 'webp'
                ? 'image/webp'
                : 'image/jpeg',
        });
        const result = detectInput('', file);
        expect(result?.category).toBe('Media');
        const metadataAction = result?.actions.find(
          (a) => a.href === '/image/metadata',
        );
        expect(metadataAction).toBeDefined();
        expect(metadataAction?.label).toBe('See what this photo reveals');
      }

      // Non-photo image format like SVG should not offer photo metadata
      const svgFile = new File(['<svg></svg>'], 'vector.svg', {
        type: 'image/svg+xml',
      });
      const svgResult = detectInput('', svgFile);
      expect(svgResult?.actions.some((a) => a.href === '/image/metadata')).toBe(
        false,
      );
    } finally {
      spy.mockRestore();
    }
  });

  it('excludes Photo metadata when isLiveToolUrl(/image/metadata) is false', async () => {
    const liveToolsModule = await import('../lib/seo/live-tools');
    const origIsLive = liveToolsModule.isLiveToolUrl;

    const { vi } = await import('vitest');
    const spy = vi
      .spyOn(liveToolsModule, 'isLiveToolUrl')
      .mockImplementation((url: string) => {
        if (url === '/image/metadata') return false;
        return origIsLive(url);
      });

    try {
      const { detectInput } = await import('./smart-dropzone');
      const file = new File(['imagedata'], 'photo.jpg', { type: 'image/jpeg' });
      const result = detectInput('', file);
      expect(result?.actions.some((a) => a.href === '/image/metadata')).toBe(
        false,
      );
    } finally {
      spy.mockRestore();
    }
  });
});
