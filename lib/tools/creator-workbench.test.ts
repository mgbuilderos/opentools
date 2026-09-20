import { describe, expect, it } from 'vitest';

import {
  CREATOR_OPERATIONS,
  countWordFrequencies,
  estimateTextWidth,
  generateWordCloudSvg,
  runCreatorOperation,
} from './creator-workbench';

function defaults(id: string) {
  const operation = CREATOR_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

// Three seconds of silent 16-bit mono PCM at 8 kHz, as a WAV data URL.
function silentPcmWav() {
  const sampleRate = 8000;
  const dataSize = 3 * sampleRate * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF', 0, 'ascii');
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write('WAVEfmt ', 8, 'ascii');
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36, 'ascii');
  wav.writeUInt32LE(dataSize, 40);
  return `data:audio/wav;base64,${wav.toString('base64')}`;
}

describe('creator and social workbench', () => {
  it('publishes 49 unique operations whose defaults all run', () => {
    expect(CREATOR_OPERATIONS).toHaveLength(49);
    expect(new Set(CREATOR_OPERATIONS.map((item) => item.id)).size).toBe(49);
    for (const operation of CREATOR_OPERATIONS) {
      expect(
        runCreatorOperation(
          operation.id,
          operation.id === 'audio-trimmer'
            ? { ...defaults(operation.id), audio: silentPcmWav() }
            : defaults(operation.id),
        ),
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

  it('trims clean 16-bit PCM WAV audio', () => {
    const trimmed = runCreatorOperation('audio-trimmer', {
      audio: silentPcmWav(),
      start: '0:00',
      end: '0:02',
      gain: '1.2',
      fade: 'fade-both',
    });
    expect(trimmed).toMatch(/^data:audio\/wav;base64,/);
  });

  it('rejects missing and non-WAV audio instead of generating a tone', () => {
    expect(() =>
      runCreatorOperation('audio-trimmer', { audio: '', start: '0', end: '1' }),
    ).toThrow('Choose a WAV audio file');
    const mp3Header = `data:audio/mpeg;base64,${Buffer.from([0x49, 0x44, 0x33, 0x03, 0, 0, 0, 0, 0, 0]).toString('base64')}`;
    expect(() =>
      runCreatorOperation('audio-trimmer', {
        audio: mp3Header,
        start: '0',
        end: '1',
      }),
    ).toThrow('Only uncompressed PCM WAV files are supported');
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

  it('generates App Store screenshot mockups as SVG', () => {
    const mockup = runCreatorOperation('app-store-mockup-generator', {
      appName: 'OpenTools Mobile',
      tagline: 'Private Offline Utilities',
      subheadline: '100% Client-Side',
      deviceFrame: 'modern-phone-notch',
      themeColor: 'midnight-blue',
      screenPlaceholder: 'analytics-dashboard',
    });
    expect(mockup).toContain('<svg');
    expect(mockup).toContain('OPENTOOLS MOBILE');
    expect(mockup).toContain('Private Offline Utilities');
    expect(mockup).toContain('Security Dashboard');
    expect(mockup).toContain('1,248,920');
  });

  it('formats plain text into mathematical Unicode styles and bulleted lists', () => {
    const boldSans = runCreatorOperation('social-media-post-formatter', {
      text: 'Hello World 123',
      style: 'bold-sans',
      bulletStyle: 'none',
    });
    // 'Hello World 123' in bold sans: 𝗛𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱 𝟭𝟮𝟯
    expect(boldSans).toContain('𝗛𝗲𝗹𝗹𝗼');
    expect(boldSans).toContain('𝗪𝗼𝗿𝗹𝗱');

    const bullets = runCreatorOperation('social-media-post-formatter', {
      text: '1. Fast\n2. Private\n3. Free',
      style: 'bold-sans',
      bulletStyle: 'bullet-arrow',
    });
    expect(bullets).toContain('➤');
    expect(bullets).toContain('𝗙𝗮𝘀𝘁');
  });
});

describe('word cloud generator', () => {
  const settings = (overrides: Record<string, string> = {}) => ({
    text: 'alpha alpha alpha beta beta gamma delta epsilon zeta',
    maxWords: '60',
    minLength: '3',
    palette: 'ocean',
    background: 'white',
    stopwords: 'english',
    extraStopwords: '',
    ...overrides,
  });

  /** Every `<text>` box, in the same coordinates the SVG places them. */
  function boxes(svg: string) {
    return [
      ...svg.matchAll(
        /<text x="([\d.]+)" y="([\d.]+)" font-size="([\d.]+)"[^>]*>(?:<title>[^<]*<\/title>)?([^<]+)<\/text>/gu,
      ),
    ].map((match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      size: Number(match[3]),
      word: match[4],
    }));
  }

  it('sizes words by how often they appear', () => {
    const found = boxes(generateWordCloudSvg(settings()));
    const alpha = found.find((box) => box.word === 'alpha');
    const zeta = found.find((box) => box.word === 'zeta');

    expect(alpha).toBeDefined();
    expect(zeta).toBeDefined();
    expect(alpha!.size).toBeGreaterThan(zeta!.size);
  });

  it('gives the same picture for the same text, every time', () => {
    // The layout carries no random seed on purpose: a cloud a user cannot
    // reproduce is a cloud they cannot put in a document and re-export later.
    const once = generateWordCloudSvg(settings());
    const twice = generateWordCloudSvg(settings());

    expect(twice).toBe(once);
  });

  it('lays words out without overlapping each other', () => {
    // The regression this guards: the search spiral used a fixed growth rate,
    // so a page of large words exhausted every attempt and each one was left
    // at the position of its last try -- the same position for all of them.
    // Forty words came out as forty words in a single pile, and every other
    // assertion here still passed.
    const found = boxes(
      generateWordCloudSvg(
        settings({
          text: Array.from({ length: 40 }, (_, index) =>
            `subject${index} `.repeat(index + 1),
          ).join(' '),
        }),
      ),
    );

    expect(found).toHaveLength(40);
    expect(new Set(found.map((box) => `${box.x},${box.y}`)).size).toBe(40);

    for (let a = 0; a < found.length; a += 1) {
      for (let b = a + 1; b < found.length; b += 1) {
        const one = found[a]!;
        const two = found[b]!;
        // `x` is already the box centre (text-anchor is middle), but `y` is the
        // baseline, which the generator drops 0.34 of the font size below the
        // centre. Comparing baselines directly measures two different-sized
        // words against a shifted axis and reports overlaps that are not there.
        const centre = (box: { y: number; size: number }) =>
          box.y - box.size * 0.34;
        const horizontal =
          Math.abs(one.x - two.x) * 2 <
          estimateTextWidth(one.word, one.size) +
            estimateTextWidth(two.word, two.size);
        const vertical =
          Math.abs(centre(one) - centre(two)) * 2 <
          one.size * 1.06 + two.size * 1.06;
        expect(horizontal && vertical, `${one.word} overlaps ${two.word}`).toBe(
          false,
        );
      }
    }
  });

  it('removes English filler words unless told to keep them', () => {
    const text = 'the cat and the hat and the mat';

    expect(generateWordCloudSvg(settings({ text }))).not.toContain('>the<');
    expect(
      generateWordCloudSvg(settings({ text, stopwords: 'none' })),
    ).toContain('>the<');
  });

  it('also drops words the user names', () => {
    const svg = generateWordCloudSvg(
      settings({
        text: 'acme widget acme widget sprocket',
        extraStopwords: 'acme, widget',
      }),
    );

    expect(svg).toContain('>sprocket<');
    expect(svg).not.toContain('>acme<');
    expect(svg).not.toContain('>widget<');
  });

  it('cannot carry markup into the SVG it writes', () => {
    // Words are cut on anything that is not a letter, digit, apostrophe or
    // hyphen, so a tag in the input cannot survive as a word -- and `escapeXml`
    // is the second line for the characters that do survive.
    const svg = generateWordCloudSvg(
      settings({
        text: '<script>alert(1)</script> ordinary ordinary "quoted" & more',
        stopwords: 'none',
      }),
    );

    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('alert(1)');
    expect(svg).toContain('>ordinary<');
    expect(svg).toContain('>script<');
    // Well-formed enough for a parser: one root element, tags all closed.
    expect(svg.match(/<text /gu)?.length).toBe(svg.match(/<\/text>/gu)?.length);
  });

  it('keeps every word inside the viewBox it declares', () => {
    const svg = generateWordCloudSvg(
      settings({ text: 'one two three four five six seven eight nine ten' }),
    );
    const viewBox = /viewBox="0 0 (\d+) (\d+)"/u.exec(svg);

    expect(viewBox).not.toBeNull();
    const width = Number(viewBox![1]);
    const height = Number(viewBox![2]);
    for (const box of boxes(svg)) {
      expect(box.x).toBeGreaterThan(0);
      expect(box.x).toBeLessThan(width);
      expect(box.y).toBeGreaterThan(0);
      expect(box.y).toBeLessThan(height);
    }
  });

  it('counts words without being fooled by punctuation or case', () => {
    const counts = countWordFrequencies(
      "Report, report; REPORT. well-known don't",
    );

    expect(counts[0]).toEqual({ word: 'report', count: 3 });
    expect(counts.map((entry) => entry.word)).toContain('well-known');
    expect(counts.map((entry) => entry.word)).toContain("don't");
  });

  it('orders equal counts alphabetically, so nothing shuffles between runs', () => {
    const counts = countWordFrequencies('pear apple mango');

    expect(counts.map((entry) => entry.word)).toEqual([
      'apple',
      'mango',
      'pear',
    ]);
  });

  it('explains itself when filtering leaves nothing to draw', () => {
    expect(() =>
      generateWordCloudSvg(
        settings({ text: 'the and of to', stopwords: 'english' }),
      ),
    ).toThrow(/No words left after filtering/u);
  });

  it('refuses a word limit outside the range it can lay out', () => {
    expect(() => generateWordCloudSvg(settings({ maxWords: '9000' }))).toThrow(
      /whole number from 5 to 300/u,
    );
  });
});
