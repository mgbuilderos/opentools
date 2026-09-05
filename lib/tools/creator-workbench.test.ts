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
  it('publishes 38 unique operations whose defaults all run', () => {
    expect(CREATOR_OPERATIONS).toHaveLength(38);
    expect(new Set(CREATOR_OPERATIONS.map((item) => item.id)).size).toBe(38);
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
});
