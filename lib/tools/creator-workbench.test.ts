import { describe, expect, it } from 'vitest';

import { CREATOR_OPERATIONS, runCreatorOperation } from './creator-workbench';

function defaults(id: string) {
  const operation = CREATOR_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('creator and social workbench', () => {
  it('publishes 50 unique operations whose defaults all run', () => {
    expect(CREATOR_OPERATIONS).toHaveLength(50);
    expect(new Set(CREATOR_OPERATIONS.map((item) => item.id)).size).toBe(50);
    for (const operation of CREATOR_OPERATIONS) {
      expect(
        runCreatorOperation(operation.id, defaults(operation.id)),
      ).not.toBe('');
    }
  });

  it('validates and normalizes ascending chapters and timestamps', () => {
    expect(
      runCreatorOperation('youtube-chapter-generator', {
        chapters: '00:00 | Intro\n01:05 | Demo',
      }),
    ).toBe('0:00 Intro\n1:05 Demo');
    expect(
      runCreatorOperation('youtube-timestamp-formatter', {
        timestamps: '0 | Intro\n3661 | Long section',
      }),
    ).toContain('1:01:01 Long section');
    expect(() =>
      runCreatorOperation('youtube-chapter-generator', {
        chapters: '00:10 | Too late',
      }),
    ).toThrow('start at 0:00');
  });

  it('deduplicates tags and reports user-selected limits honestly', () => {
    expect(
      runCreatorOperation('hashtag-deduplicator', {
        tags: '#Privacy #privacy BrowserTools',
      }),
    ).toContain('2 unique hashtags');
    expect(
      runCreatorOperation('x-post-character-counter', {
        content: 'Hello world',
        limit: '5',
      }),
    ).toContain('6 over limit');
  });

  it('packs a thread without splitting paragraphs', () => {
    const output = runCreatorOperation('x-thread-formatter', {
      content: 'First short paragraph.\n\nSecond short paragraph.',
      limit: '35',
    });
    expect(output).toContain('1/2');
    expect(output).toContain('2/2');
  });

  it('escapes generated RSS and link-in-bio HTML', () => {
    expect(
      runCreatorOperation('rss-feed-builder', {
        title: 'A & B',
        link: 'https://example.com/',
        description: '<Updates>',
        items: 'Launch | https://example.com/launch | A & B',
      }),
    ).toContain('A &amp; B');
    expect(
      runCreatorOperation('link-in-bio-page-exporter', {
        name: '<Asha>',
        bio: 'Tools & notes',
        links: 'Open | https://example.com/',
      }),
    ).toContain('&lt;Asha&gt;');
  });

  it('calculates creator economics from explicit inputs', () => {
    expect(
      runCreatorOperation('sponsorship-cpm-calculator', {
        cost: '1500',
        impressions: '75000',
      }),
    ).toBe('20.00 cost units per 1,000 impressions');
    expect(
      runCreatorOperation('engagement-rate-calculator', {
        engagements: '1250',
        audience: '50000',
      }),
    ).toBe('2.50%');
    expect(
      runCreatorOperation('follower-growth-calculator', {
        start: '10000',
        end: '11250',
      }),
    ).toContain('12.50%');
  });

  it('sorts calendars and expands a bounded idea matrix', () => {
    expect(
      runCreatorOperation('content-calendar-maker', {
        entries: '2026-09-10 | Video | Demo\n2026-09-01 | Email | Launch',
      }).split('\n')[0],
    ).toContain('2026-09-01');
    expect(
      runCreatorOperation('content-idea-matrix', {
        audiences: 'Save time\nProtect files',
        pillars: 'How-to\nCase study',
      }).split('\n'),
    ).toHaveLength(4);
  });

  it('produces deterministic palettes and portable filenames', () => {
    const palette = runCreatorOperation('brand-palette-generator', {
      seed: 'Private Tools',
    });
    expect(palette.match(/#[\da-f]{6}/gu)).toHaveLength(5);
    expect(
      runCreatorOperation('creator-file-naming-tool', {
        date: '2026-09-06',
        project: 'Private Tools',
        asset: 'Launch Video',
        version: 'v03',
        extension: '.MP4',
      }),
    ).toBe('2026-09-06_private-tools_launch-video_v03.mp4');
  });

  it('rejects non-web URLs and invalid numeric denominators', () => {
    expect(() =>
      runCreatorOperation('social-share-preview', {
        title: 'Bad link',
        description: 'Unsafe',
        url: 'javascript:alert(1)',
      }),
    ).toThrow('HTTP or HTTPS');
    expect(() =>
      runCreatorOperation('engagement-rate-calculator', {
        engagements: '1',
        audience: '0',
      }),
    ).toThrow('audience must be positive');
  });

  it('converts, trims, and extracts clean 16-bit PCM WAV audio', () => {
    const converted = runCreatorOperation('audio-format-converter', {
      audio: '',
      targetFormat: 'wav',
      sampleRate: '44100',
      channels: 'stereo',
    });
    expect(converted).toMatch(/^data:audio\/wav;base64,/);

    const trimmed = runCreatorOperation('audio-trimmer', {
      audio: converted,
      start: '0:00',
      end: '0:02',
      gain: '1.2',
      fade: 'fade-both',
    });
    expect(trimmed).toMatch(/^data:audio\/wav;base64,/);

    const extracted = runCreatorOperation('video-to-audio-extractor', {
      video: '',
      sampleRate: '48000',
      channels: 'mono',
    });
    expect(extracted).toMatch(/^data:audio\/wav;base64,/);
  });

  it('converts and shifts subtitles bidirectionally', () => {
    const srtInput =
      '1\n00:00:01,000 --> 00:00:04,000\nWelcome to local tools.\n\n2\n00:00:05,000 --> 00:00:09,000\nZero remote egress.';
    const vttOutput = runCreatorOperation('subtitle-converter', {
      subtitles: srtInput,
      targetFormat: 'vtt',
      offset: '1.5',
    });
    expect(vttOutput).toContain('WEBVTT');
    expect(vttOutput).toContain('00:00:02.500 --> 00:00:05.500');
    expect(vttOutput).toContain('00:00:06.500 --> 00:00:10.500');

    const srtOutput = runCreatorOperation('subtitle-converter', {
      subtitles: vttOutput,
      targetFormat: 'srt',
      offset: '-1.5',
    });
    expect(srtOutput).not.toContain('WEBVTT');
    expect(srtOutput).toContain('00:00:01,000 --> 00:00:04,000');
    expect(srtOutput).toContain('Welcome to local tools.');
  });

  it('encodes animated GIF loops with valid GIF89a header', () => {
    const gifOutput = runCreatorOperation('video-to-gif', {
      video: '',
      fps: '10',
      width: '320',
      duration: '2',
    });
    expect(typeof gifOutput === 'string' ? gifOutput : '').toMatch(
      /^data:image\/gif;base64,/,
    );
    const base64Data = (gifOutput as string).replace(
      'data:image/gif;base64,',
      '',
    );
    const raw = Buffer.from(base64Data, 'base64').toString('ascii', 0, 6);
    expect(raw).toBe('GIF89a');
  });

  it('converts SVG markup to typed React TSX and JSX components', () => {
    const tsxOutput = runCreatorOperation('svg-to-react', {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>',
      componentName: 'ArrowRight',
      format: 'tsx',
    });
    expect(tsxOutput).toContain("import type { SVGProps } from 'react';");
    expect(tsxOutput).toContain(
      'export function ArrowRight(props: SVGProps<SVGSVGElement>)',
    );
    expect(tsxOutput).toContain('strokeWidth="2"');
    expect(tsxOutput).toContain('<svg {...props}');

    const jsxOutput = runCreatorOperation('svg-to-react', {
      svg: '<svg class="icon" fill-rule="evenodd"><circle cx="10" cy="10" r="5"/></svg>',
      componentName: 'Dot',
      format: 'jsx',
    });
    expect(jsxOutput).not.toContain('SVGProps');
    expect(jsxOutput).toContain('className="icon"');
    expect(jsxOutput).toContain('fillRule="evenodd"');
  });

  it('generates Glassmorphism CSS and Box Shadow declarations', () => {
    const glass = runCreatorOperation('css-glassmorphism', {
      blur: '20',
      opacity: '50',
      bgColor: '#ffffff',
      borderOpacity: '30',
      shadowBlur: '30',
    });
    expect(glass).toContain('backdrop-filter: blur(20px);');
    expect(glass).toContain('background: rgba(255, 255, 255, 0.50);');
    expect(glass).toContain('border: 1px solid rgba(255, 255, 255, 0.30);');

    const shadow = runCreatorOperation('css-box-shadow', {
      xOffset: '0',
      yOffset: '8',
      blur: '20',
      spread: '-4',
      color: '#000000',
      opacity: '20',
      type: 'outset',
    });
    expect(shadow).toContain('0px 8px 20px -4px rgba(0, 0, 0, 0.20)');
  });

  it('converts px to rem and generates favicon and flexbox/grid snippets', () => {
    const remResult = runCreatorOperation('px-to-rem', {
      pixels: '32',
      baseSize: '16',
    });
    expect(remResult).toContain('REM:         2rem');

    const faviconResult = runCreatorOperation('favicon-generator', {
      appName: 'OpenTools',
      themeColor: '#121212',
      emoji: '⚡',
    });
    expect(faviconResult).toContain('<link rel="icon"');
    expect(faviconResult).toContain('theme-color');
    expect(faviconResult).toContain('OpenTools');

    const flexResult = runCreatorOperation('css-flexbox-grid', {
      layout: 'flex',
      direction: 'column',
      justify: 'center',
      align: 'center',
      gap: '12',
    });
    expect(flexResult).toContain('flex-direction: column;');
    expect(flexResult).toContain('gap: 12px;');
  });

  it('calculates image compression budget for strict portal limits', () => {
    const budget = runCreatorOperation('exact-kb-image-compressor', {
      targetKb: '50',
      originalKb: '500',
      width: '1200',
      height: '800',
      format: 'image/jpeg',
    });
    expect(budget).toContain('Target File Size:        ≤ 50 KB');
    expect(budget).toContain('Required Size Reduction: 90.0%');
    expect(budget).toContain('Recommended Quality:');
    expect(budget).toContain('canvas.toDataURL');
  });
});
