import { describe, expect, it } from 'vitest';
import { parseSubtitles, type SubtitleDocument } from './core';
import {
  checkSubtitles,
  convertFrameRate,
  fixOverlaps,
  mergeDocuments,
  plainText,
  removeEmptyCues,
  scaleCues,
  shiftCues,
  sortCues,
  splitAt,
  stripFormatting,
  syncToAnchors,
  trimToRange,
} from './transform';

function document(cues: readonly [number, number, string][]): SubtitleDocument {
  return {
    format: 'srt',
    cues: cues.map(([startMs, endMs, text]) => ({ startMs, endMs, text })),
    warnings: [],
  };
}

const THREE = document([
  [1000, 3000, 'One'],
  [4000, 6000, 'Two'],
  [7000, 9000, 'Three'],
]);

const times = (doc: SubtitleDocument) =>
  doc.cues.map((cue) => [cue.startMs, cue.endMs]);

describe('shifting', () => {
  it('moves every cue by the same amount', () => {
    expect(times(shiftCues(THREE, 1500))).toEqual([
      [2500, 4500],
      [5500, 7500],
      [8500, 10_500],
    ]);
  });

  it('moves cues earlier', () => {
    expect(times(shiftCues(THREE, -500))).toEqual([
      [500, 2500],
      [3500, 5500],
      [6500, 8500],
    ]);
  });

  it('refuses a shift that would push the first cue before the video starts', () => {
    expect(() => shiftCues(THREE, -2000)).toThrow(
      /would move the first subtitle before the start/u,
    );
    // The message says exactly how far back is allowed.
    expect(() => shiftCues(THREE, -2000)).toThrow('1.000s or less');
  });

  it('allows a shift that lands the first cue exactly on zero', () => {
    expect(times(shiftCues(THREE, -1000))[0]).toEqual([0, 2000]);
  });
});

describe('stretching', () => {
  it('multiplies the times and rounds to whole milliseconds', () => {
    expect(times(scaleCues(THREE, 1.5))).toEqual([
      [1500, 4500],
      [6000, 9000],
      [10_500, 13_500],
    ]);
  });

  it('refuses a factor that is not a positive number', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => scaleCues(THREE, bad)).toThrow('positive number');
    }
  });

  it('converts between frame rates by their ratio', () => {
    // A file timed for 25 fps runs slow on a 23.976 fps video by 25/23.976.
    const converted = convertFrameRate(THREE, 25, 23.976);
    expect(converted.cues[0].startMs).toBe(Math.round(1000 * (25 / 23.976)));
    expect(converted.cues[2].endMs).toBe(Math.round(9000 * (25 / 23.976)));
  });

  it('refuses a frame-rate conversion that would change nothing', () => {
    expect(() => convertFrameRate(THREE, 25, 25)).toThrow('the same');
  });
});

describe('syncing to two known moments', () => {
  it('lands both anchors exactly where they were said to be', () => {
    const result = syncToAnchors(THREE, 2000, 10_000);
    expect(result.document.cues[0].startMs).toBe(2000);
    expect(result.document.cues[2].startMs).toBe(10_000);
    // First cue starts at 1000 and last at 7000, so 6000 must become 8000.
    expect(result.factor).toBeCloseTo(8000 / 6000, 12);
  });

  it('reduces to a plain shift when the two moments are the same distance apart', () => {
    const result = syncToAnchors(THREE, 3000, 9000);
    expect(result.factor).toBeCloseTo(1, 12);
    expect(result.offsetMs).toBeCloseTo(2000, 6);
    expect(times(result.document)).toEqual([
      [3000, 5000],
      [6000, 8000],
      [9000, 11_000],
    ]);
  });

  it('refuses anchors that are in the wrong order', () => {
    expect(() => syncToAnchors(THREE, 9000, 3000)).toThrow(
      'must be later than',
    );
  });

  it('refuses a file whose first and last cue start together', () => {
    const flat = document([
      [1000, 2000, 'a'],
      [1000, 2000, 'b'],
    ]);
    expect(() => syncToAnchors(flat, 0, 5000)).toThrow('nothing to stretch');
  });
});

describe('joining, splitting and trimming', () => {
  it('puts the second file after the first at the offset given', () => {
    const second = document([[0, 1000, 'Next part']]);
    const merged = mergeDocuments(THREE, second, 10_000);
    expect(merged.cues).toHaveLength(4);
    expect(times(merged)[3]).toEqual([10_000, 11_000]);
  });

  it('splits into two parts and can restart the second from zero', () => {
    const parts = splitAt(THREE, 4000, true);
    expect(times(parts.before)).toEqual([[1000, 3000]]);
    expect(times(parts.after)).toEqual([
      [0, 2000],
      [3000, 5000],
    ]);
  });

  it('keeps the original times when asked not to rebase', () => {
    const parts = splitAt(THREE, 4000, false);
    expect(times(parts.after)).toEqual([
      [4000, 6000],
      [7000, 9000],
    ]);
  });

  it('refuses a split that leaves one side empty', () => {
    expect(() => splitAt(THREE, 0, true)).toThrow('leaves one side empty');
    expect(() => splitAt(THREE, 99_000, true)).toThrow('leaves one side empty');
  });

  it('keeps only the cues overlapping a range, clipped to it', () => {
    const trimmed = trimToRange(THREE, 2000, 8000, false);
    expect(times(trimmed)).toEqual([
      [2000, 3000],
      [4000, 6000],
      [7000, 8000],
    ]);
  });

  it('restarts a trimmed range from zero when asked', () => {
    expect(times(trimToRange(THREE, 4000, 9000, true))).toEqual([
      [0, 2000],
      [3000, 5000],
    ]);
  });

  it('refuses a range with no subtitles in it, or one that runs backwards', () => {
    expect(() => trimToRange(THREE, 20_000, 30_000, false)).toThrow(
      'would be empty',
    );
    expect(() => trimToRange(THREE, 5000, 1000, false)).toThrow(
      'must be later than',
    );
  });
});

describe('cleaning', () => {
  it('removes HTML-style tags and SubStation overrides, keeping the words', () => {
    const messy = document([
      [0, 1000, '<i>Hello</i> <font color="#fff">there</font>'],
      [1000, 2000, '{\\an8}Up top\\Nsecond row'],
    ]);
    const cleaned = stripFormatting(messy);
    expect(cleaned.cues[0].text).toBe('Hello there');
    expect(cleaned.cues[1].text).toBe('Up top second row');
  });

  it('leaves ordinary punctuation and braces alone', () => {
    expect(plainText('He said {not a tag} <3 and 5 > 2')).toBe(
      'He said {not a tag} <3 and 5 > 2',
    );
  });

  it('drops cues with no words, and music-only cues when asked', () => {
    const noisy = document([
      [0, 1000, 'Real line'],
      [1000, 2000, '   '],
      [2000, 3000, '♪'],
      [3000, 4000, '<i></i>'],
    ]);
    const plain = removeEmptyCues(noisy, false);
    expect(plain.removed).toBe(2);
    expect(plain.document.cues.map((cue) => cue.text)).toEqual([
      'Real line',
      '♪',
    ]);

    const alsoMusic = removeEmptyCues(noisy, true);
    expect(alsoMusic.removed).toBe(3);
    expect(alsoMusic.document.cues).toHaveLength(1);
  });

  it('refuses to remove every cue', () => {
    expect(() => removeEmptyCues(document([[0, 1000, '  ']]), false)).toThrow(
      'nothing would be left',
    );
  });
});

describe('repairing timing', () => {
  it('pulls back a cue that runs into the next one', () => {
    const overlapping = document([
      [0, 5000, 'One'],
      [3000, 6000, 'Two'],
    ]);
    const result = fixOverlaps(overlapping, 0, 40);
    expect(times(result.document)).toEqual([
      [0, 2960],
      [3000, 6000],
    ]);
    expect(result.changed).toBe(1);
  });

  it('gives a too-short cue the minimum time on screen', () => {
    const brief = document([[0, 100, 'Blink']]);
    expect(times(fixOverlaps(brief, 700, 40).document)).toEqual([[0, 700]]);
  });

  it('never produces an end at or before its own start', () => {
    // Two cues 20 ms apart cannot both have a 700 ms minimum and a 40 ms gap.
    const tight = document([
      [0, 10, 'One'],
      [20, 900, 'Two'],
    ]);
    const result = fixOverlaps(tight, 700, 40);
    for (const cue of result.document.cues) {
      expect(cue.endMs).toBeGreaterThan(cue.startMs);
    }
  });

  it('reports nothing changed when the timing is already fine', () => {
    expect(fixOverlaps(THREE, 700, 40).changed).toBe(0);
  });

  it('refuses negative limits', () => {
    expect(() => fixOverlaps(THREE, -1, 0)).toThrow('cannot be negative');
  });

  it('sorts cues that arrived out of order', () => {
    const jumbled = document([
      [5000, 6000, 'Later'],
      [1000, 2000, 'Earlier'],
    ]);
    expect(sortCues(jumbled).cues[0].text).toBe('Earlier');
  });
});

describe('checking a file', () => {
  it('finds nothing wrong with a well-formed file', () => {
    const report = checkSubtitles(THREE);
    expect(report.issues).toEqual([]);
    expect(report.cueCount).toBe(3);
    expect(report.firstStartMs).toBe(1000);
    expect(report.lastEndMs).toBe(9000);
  });

  it('names each kind of problem against the cue it is in', () => {
    const broken = parseSubtitles(
      [
        '1',
        '00:00:00,000 --> 00:00:05,000',
        'Fine.',
        '',
        '2',
        '00:00:04,000 --> 00:00:04,100',
        'Overlaps the one above and is far too brief.',
        '',
        '3',
        '00:00:10,000 --> 00:00:10,000',
        '',
        '',
        '4',
        '00:00:20,000 --> 00:00:21,000',
        'A single line that is comfortably longer than forty-two characters.',
      ].join('\n'),
    );
    const problems = checkSubtitles(broken).issues.map(
      (issue) => `${issue.cueNumber}: ${issue.problem}`,
    );

    expect(problems).toContain('2: Overlaps cue 1 by 1000 ms');
    expect(problems).toContain('2: On screen for only 100 ms');
    expect(problems.some((line) => line.startsWith('2: Reads at'))).toBe(true);
    expect(problems).toContain('3: No text');
    expect(problems).toContain('3: Ends at or before it starts');
    const longLine = problems.find((line) => line.startsWith('4: A line is'));
    expect(longLine).toBeDefined();
    expect(Number(/A line is (\d+)/u.exec(longLine!)![1])).toBeGreaterThan(42);
  });

  it('counts a cue with more rows than the usual two', () => {
    const tall = document([[0, 5000, 'One\nTwo\nThree']]);
    expect(checkSubtitles(tall).issues[0].problem).toContain('3 lines');
  });
});
