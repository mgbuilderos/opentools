import { describe, expect, it } from 'vitest';
import { parseSubtitles } from './subtitles/core';
import {
  runSubtitleOperation,
  SUBTITLE_OPERATIONS,
} from './subtitle-workbench';

const SRT = [
  '1',
  '00:00:01,000 --> 00:00:03,400',
  'First line.',
  '',
  '2',
  '00:00:03,600 --> 00:00:07,000',
  'Second line.',
  '',
  '3',
  '00:00:07,200 --> 00:00:10,500',
  '<i>Third line.</i>',
].join('\n');

const SECOND_SRT = [
  '1',
  '00:00:00,500 --> 00:00:02,000',
  'Part two begins.',
].join('\n');

/** Default values for one operation, as the page would submit them. */
function defaults(operationId: string): Record<string, string> {
  const operation = SUBTITLE_OPERATIONS.find(
    (item) => item.id === operationId,
  )!;
  const values = Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
  values.subtitles = SRT;
  if ('second' in values) values.second = SECOND_SRT;
  return values;
}

function run(operationId: string, overrides: Record<string, string> = {}) {
  return runSubtitleOperation(operationId, {
    ...defaults(operationId),
    ...overrides,
  });
}

/** Output formats that must come back as a file a player can read. */
const SUBTITLE_OUTPUTS = new Set(['srt', 'vtt', 'sbv', 'lrc']);

describe('the operation list itself', () => {
  it('gives every operation a unique id and every field a unique id', () => {
    const ids = SUBTITLE_OPERATIONS.map((operation) => operation.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const operation of SUBTITLE_OPERATIONS) {
      const fieldIds = operation.fields.map((field) => field.id);
      expect(new Set(fieldIds).size, `${operation.id} repeats a field id`).toBe(
        fieldIds.length,
      );
    }
  });

  it('points every outputExtensionField at a real field whose values are extensions', () => {
    for (const operation of SUBTITLE_OPERATIONS) {
      if (!operation.outputExtensionField) continue;
      const field = operation.fields.find(
        (item) => item.id === operation.outputExtensionField,
      );
      expect(
        field,
        `${operation.id} names a field that is not there`,
      ).toBeDefined();
      for (const option of field!.options ?? []) {
        expect(option.value).toMatch(/^[a-z0-9]{1,5}$/u);
      }
    }
  });

  it('describes every operation and gives it an output extension', () => {
    for (const operation of SUBTITLE_OPERATIONS) {
      expect(operation.name.length, operation.id).toBeGreaterThan(8);
      expect(operation.description.length, operation.id).toBeGreaterThan(30);
      expect(operation.outputExtension, operation.id).toBeTruthy();
      expect(operation.fields.length, operation.id).toBeGreaterThan(0);
    }
  });

  it('refuses an operation id it does not have', () => {
    expect(() =>
      runSubtitleOperation('subtitle-nope', { subtitles: SRT }),
    ).toThrow('Unknown subtitle operation');
  });
});

describe('every operation, on its own defaults', () => {
  it.each(SUBTITLE_OPERATIONS.map((operation) => operation.id))(
    '%s produces a result that reads back',
    (operationId) => {
      const output = run(operationId);
      expect(output.trim().length).toBeGreaterThan(0);

      const operation = SUBTITLE_OPERATIONS.find(
        (item) => item.id === operationId,
      )!;
      const extension = operation.outputExtensionField
        ? defaults(operationId)[operation.outputExtensionField]
        : operation.outputExtension;

      // A file we say is a subtitle file has to be readable as one.
      if (SUBTITLE_OUTPUTS.has(extension!)) {
        const reparsed = parseSubtitles(output);
        expect(reparsed.cues.length, operationId).toBeGreaterThan(0);
        expect(reparsed.warnings, operationId).toEqual([]);
      }
    },
  );

  it.each(
    SUBTITLE_OPERATIONS.filter(
      (operation) => operation.outputExtensionField,
    ).map((operation) => operation.id),
  )('%s writes a readable file in every format it offers', (operationId) => {
    for (const format of ['srt', 'vtt', 'sbv', 'lrc']) {
      const output = run(operationId, { targetFormat: format });
      const reparsed = parseSubtitles(output);
      expect(reparsed.format, `${operationId} as ${format}`).toBe(format);
      expect(reparsed.warnings).toEqual([]);
    }
    expect(run(operationId, { targetFormat: 'txt' })).not.toContain('-->');
  });
});

describe('converting', () => {
  it('turns SubRip into WebVTT with the header and full stops', () => {
    const output = run('subtitle-to-vtt');
    expect(output.startsWith('WEBVTT')).toBe(true);
    expect(output).toContain('00:00:01.000 --> 00:00:03.400');
    expect(output).not.toContain('00:00:01,000');
  });

  it('turns WebVTT back into SubRip with commas and numbering', () => {
    const vtt = run('subtitle-to-vtt');
    const srt = runSubtitleOperation('subtitle-to-srt', {
      subtitles: vtt,
      sourceFormat: 'auto',
      subtitleFile: '',
    });
    expect(srt).toContain('00:00:01,000 --> 00:00:03,400');
    expect(srt.split('\n')[0]).toBe('1');
    // A SubRip file carries no comment syntax, so nothing may be prepended.
    expect(srt.startsWith('1\n')).toBe(true);
  });

  it('writes SubStation dialogue out as SubRip', () => {
    const ass = [
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
      'Dialogue: 0,0:00:01.00,0:00:03.40,Default,,0,0,0,,{\\an8}Hello there',
    ].join('\n');
    const srt = runSubtitleOperation('subtitle-to-srt', {
      subtitles: ass,
      sourceFormat: 'auto',
      subtitleFile: '',
    });
    expect(srt).toContain('00:00:01,000 --> 00:00:03,400');
    expect(srt).toContain('{\\an8}Hello there');
  });

  it('makes a transcript, optionally as flowing text', () => {
    const blocks = run('subtitle-to-text');
    expect(blocks).toBe('First line.\nSecond line.\nThird line.\n');
    expect(run('subtitle-to-text', { joinLines: 'flow' })).toBe(
      'First line. Second line. Third line.\n',
    );
    // Keeping the tags must really keep them.
    expect(run('subtitle-to-text', { clean: 'keep' })).toContain(
      '<i>Third line.</i>',
    );
  });

  it('honours an explicit source format over detection', () => {
    // Read as LRC, a SubRip file has no timestamps at the start of its lines,
    // so the wrong choice is reported rather than half-read.
    expect(() => run('subtitle-to-srt', { sourceFormat: 'lrc' })).toThrow(
      'This was read as LRC',
    );
  });
});

describe('timing', () => {
  it('shifts every cue and refuses a shift that would go below zero', () => {
    expect(run('subtitle-shift', { offset: '2.5' })).toContain(
      '00:00:03,500 --> 00:00:05,900',
    );
    expect(run('subtitle-shift', { offset: '-1' })).toContain(
      '00:00:00,000 --> 00:00:02,400',
    );
    expect(() => run('subtitle-shift', { offset: '-5' })).toThrow(
      'before the start of the video',
    );
    expect(() => run('subtitle-shift', { offset: '0' })).toThrow(
      'would change nothing',
    );
    expect(() => run('subtitle-shift', { offset: 'soon' })).toThrow(
      'must be seconds',
    );
  });

  it('syncs to two moments so both land exactly', () => {
    const output = run('subtitle-sync', {
      firstActual: '00:00:02,000',
      lastActual: '00:00:11,000',
    });
    const cues = parseSubtitles(output).cues;
    expect(cues[0].startMs).toBe(2000);
    expect(cues[cues.length - 1].startMs).toBe(11_000);
  });

  it('refuses sync anchors that run backwards or are unreadable', () => {
    expect(() =>
      run('subtitle-sync', {
        firstActual: '00:00:11,000',
        lastActual: '00:00:02,000',
      }),
    ).toThrow('must be later than');
    expect(() => run('subtitle-sync', { firstActual: 'soon' })).toThrow(
      'must be a timecode',
    );
  });

  it('retimes between frame rates by the ratio of the two', () => {
    const output = run('subtitle-framerate', {
      fromFps: '25',
      toFps: '23.976',
    });
    const first = parseSubtitles(output).cues[0];
    expect(first.startMs).toBe(Math.round(1000 * (25 / 23.976)));
  });

  it('retimes for a speed change, faster meaning earlier', () => {
    const output = run('subtitle-speed', { speed: '1.25' });
    expect(parseSubtitles(output).cues[0].startMs).toBe(800);
    expect(() => run('subtitle-speed', { speed: '1' })).toThrow(
      'would change nothing',
    );
    expect(() => run('subtitle-speed', { speed: '0' })).toThrow(
      'must be a number between',
    );
  });
});

describe('joining, splitting and trimming', () => {
  it('joins a second file at the offset given', () => {
    const output = run('subtitle-merge', {
      second: SECOND_SRT,
      secondStart: '00:00:12,000',
    });
    const cues = parseSubtitles(output).cues;
    expect(cues).toHaveLength(4);
    expect(cues[3].startMs).toBe(12_500);
  });

  it('asks for the second file rather than joining a file to nothing', () => {
    expect(() => run('subtitle-merge', { second: '', secondFile: '' })).toThrow(
      'second subtitle file',
    );
  });

  it('keeps either side of a split, restarting the second from zero', () => {
    const before = run('subtitle-split', {
      splitAt: '00:00:05,000',
      side: 'before',
    });
    expect(parseSubtitles(before).cues).toHaveLength(2);

    const after = run('subtitle-split', {
      splitAt: '00:00:05,000',
      side: 'after',
      rebase: 'rebase',
    });
    expect(parseSubtitles(after).cues[0].startMs).toBe(2200);

    const kept = run('subtitle-split', {
      splitAt: '00:00:05,000',
      side: 'after',
      rebase: 'keep',
    });
    expect(parseSubtitles(kept).cues[0].startMs).toBe(7200);
  });

  it('keeps only a range, clipped and restarted', () => {
    const output = run('subtitle-trim', {
      from: '00:00:03,600',
      to: '00:00:07,000',
      rebase: 'rebase',
    });
    const cues = parseSubtitles(output).cues;
    expect(cues).toHaveLength(1);
    expect([cues[0].startMs, cues[0].endMs]).toEqual([0, 3400]);
  });

  it('refuses a range with nothing in it', () => {
    expect(() =>
      run('subtitle-trim', { from: '00:01:00,000', to: '00:02:00,000' }),
    ).toThrow('would be empty');
  });
});

describe('cleaning and checking', () => {
  it('removes tags, drops empty cues and repairs the timing', () => {
    const messy = [
      '1',
      '00:00:01,000 --> 00:00:05,000',
      '<i>Overlapping</i>',
      '',
      '2',
      '00:00:03,000 --> 00:00:03,100',
      '{\\an8}Too brief',
      '',
      '3',
      '00:00:08,000 --> 00:00:09,000',
      '   ',
    ].join('\n');

    const output = runSubtitleOperation('subtitle-clean', {
      ...defaults('subtitle-clean'),
      subtitles: messy,
    });
    const cues = parseSubtitles(output).cues;

    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe('Overlapping');
    expect(cues[1].text).toBe('Too brief');
    // The first cue is pulled back to leave the 40 ms gap.
    expect(cues[0].endMs).toBe(2960);
    // The second is given its 700 ms minimum.
    expect(cues[1].endMs).toBe(3700);
  });

  it('keeps tags and blanks when told to', () => {
    const output = run('subtitle-clean', { tags: 'keep', blanks: 'keep' });
    expect(output).toContain('<i>Third line.</i>');
  });

  it('reports a clean file as clean', () => {
    const report = run('subtitle-check');
    expect(report).toContain('Subtitles: 3');
    expect(report).toContain('No problems found');
    expect(report).toContain('at most 42 characters a line');
  });

  it('names each problem with the cue and the time it is at', () => {
    const broken = [
      '1',
      '00:00:01,000 --> 00:00:09,000',
      'Runs over the next one.',
      '',
      '2',
      '00:00:05,000 --> 00:00:05,100',
      'Gone in a flash.',
    ].join('\n');
    const report = runSubtitleOperation('subtitle-check', {
      ...defaults('subtitle-check'),
      subtitles: broken,
    });
    expect(report).toContain('Subtitle 2 at 00:00:05,000 — Overlaps cue 1');
    expect(report).toContain('On screen for only 100 ms');
    expect(report).not.toContain('No problems found');
  });
});

describe('what it refuses to do', () => {
  it('stops rather than quietly dropping a block it cannot read', () => {
    const broken = `${SRT}\n\n4\n00:00:12,000 -> 00:00:13,000\nBad arrow.`;
    expect(() =>
      runSubtitleOperation('subtitle-to-vtt', {
        subtitles: broken,
        subtitleFile: '',
        sourceFormat: 'auto',
      }),
    ).toThrow('could not be read as SubRip (.srt), so nothing was produced');
  });

  it('asks for input when there is none', () => {
    expect(() =>
      runSubtitleOperation('subtitle-to-vtt', {
        subtitles: '   ',
        subtitleFile: '',
        sourceFormat: 'auto',
      }),
    ).toThrow('Choose a subtitle file');
  });

  it('says so when the text has no cues in it at all', () => {
    expect(() =>
      runSubtitleOperation('subtitle-to-vtt', {
        subtitles: 'Just some notes I typed.',
        subtitleFile: '',
        sourceFormat: 'auto',
      }),
    ).toThrow('No subtitle cues were found');
  });
});

describe('a chosen file rather than pasted text', () => {
  it('prefers the file, and decodes Windows-1252 without mangling it', () => {
    const windows1252 = Buffer.from([
      ...Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nCaf', 'latin1'),
      0xe9,
      0x20,
      0x97,
      0x20,
      ...Buffer.from('na', 'latin1'),
      0xef,
      ...Buffer.from('ve', 'latin1'),
    ]).toString('base64');

    const output = runSubtitleOperation('subtitle-to-vtt', {
      subtitleFile: `data:text/plain;base64,${windows1252}`,
      subtitles: SRT, // present, and must lose to the chosen file
      sourceFormat: 'auto',
    });

    expect(output).toContain('Café — naïve');
    expect(output).not.toContain('First line.');
    // WebVTT can carry a note, and it says how the file was read.
    expect(output).toContain('NOTE Read 1 subtitles');
    expect(output).toContain('decoded as windows-1252');
    expect(parseSubtitles(output).cues[0].text).toBe('Café — naïve');
  });

  it('adds no note to formats that have no comment syntax', () => {
    const base64 = Buffer.from(SRT, 'utf8').toString('base64');
    const srt = runSubtitleOperation('subtitle-shift', {
      subtitleFile: `data:text/plain;base64,${base64}`,
      subtitles: '',
      sourceFormat: 'auto',
      offset: '1',
      targetFormat: 'srt',
    });
    expect(srt.startsWith('1\n')).toBe(true);
    expect(srt).not.toContain('NOTE');
    expect(srt).not.toContain('#');
  });
});
