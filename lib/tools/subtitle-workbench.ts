/**
 * The subtitle workbench: convert between subtitle formats, fix timing that
 * has drifted, join and trim files, clean up auto-captions, and check a file
 * against the usual broadcast readability limits.
 *
 * Everything runs on the text of the file. No dependency, no upload, and no
 * step that silently discards a cue.
 */

import {
  FORMAT_NAMES,
  formatSubtitles,
  formatTimecode,
  type OutputFormat,
  parseOffset,
  parseSubtitles,
  parseTimecode,
  readSubtitleInput,
  type SourceEncoding,
  type SubtitleDocument,
  type SubtitleFormat,
} from './subtitles/core';
import {
  checkSubtitles,
  convertFrameRate,
  fixOverlaps,
  FRAME_RATES,
  MAX_CHARS_PER_SECOND,
  MAX_LINE_LENGTH,
  mergeDocuments,
  removeEmptyCues,
  scaleCues,
  shiftCues,
  sortCues,
  splitAt,
  stripFormatting,
  syncToAnchors,
  trimToRange,
} from './subtitles/transform';
import {
  area,
  file,
  number as numberField,
  select,
  type StandardOperation,
  text,
} from './workbench-helpers';

const SAMPLE_SRT = [
  '1',
  '00:00:01,000 --> 00:00:03,400',
  'Everything here runs in your browser.',
  '',
  '2',
  '00:00:03,600 --> 00:00:07,000',
  'The file never leaves this device.',
  '',
  '3',
  '00:00:07,200 --> 00:00:10,500',
  '<i>Not even to check the format.</i>',
].join('\n');

const SUBTITLE_ACCEPT = '.srt,.vtt,.sbv,.lrc,.ass,.ssa,.txt,text/plain';
const MAX_SUBTITLE_BYTES = 8_000_000;

const SOURCE_FORMATS = [
  { value: 'auto', label: 'Detect automatically' },
  { value: 'srt', label: 'SubRip (.srt)' },
  { value: 'vtt', label: 'WebVTT (.vtt)' },
  { value: 'sbv', label: 'YouTube SBV (.sbv)' },
  { value: 'lrc', label: 'LRC lyrics (.lrc)' },
  { value: 'ass', label: 'SubStation Alpha (.ass/.ssa)' },
] as const;

const KEEP_FORMATS = [
  { value: 'srt', label: 'SubRip (.srt)' },
  { value: 'vtt', label: 'WebVTT (.vtt)' },
  { value: 'sbv', label: 'YouTube SBV (.sbv)' },
  { value: 'lrc', label: 'LRC lyrics (.lrc)' },
  { value: 'txt', label: 'Plain text (.txt)' },
] as const;

/** File chooser, paste box and a format override, in that order. */
function sourceFields(prefix = '') {
  const fileId = prefix ? `${prefix}File` : 'subtitleFile';
  const textId = prefix ? prefix : 'subtitles';
  const label = prefix === 'second' ? 'second' : 'first';
  return [
    file(
      fileId,
      prefix
        ? `Choose the ${label} subtitle file`
        : 'Choose a subtitle file (.srt, .vtt, .sbv, .lrc, .ass)',
      SUBTITLE_ACCEPT,
      MAX_SUBTITLE_BYTES,
    ),
    area(
      textId,
      prefix
        ? `Or paste the ${label} file here`
        : 'Or paste the subtitles here',
      prefix ? '' : SAMPLE_SRT,
    ),
    select(
      prefix ? `${prefix}Format` : 'sourceFormat',
      prefix ? `Format of the ${label} file` : 'Format of your file',
      [...SOURCE_FORMATS],
      'auto',
    ),
  ];
}

const targetField = select(
  'targetFormat',
  'Save the result as',
  [...KEEP_FORMATS],
  'srt',
);

export const SUBTITLE_OPERATIONS: readonly StandardOperation[] = [
  {
    id: 'subtitle-to-srt',
    name: 'Convert subtitles to SubRip (.srt)',
    description:
      'Turn a WebVTT, SBV, LRC or SubStation file into the .srt format almost every player accepts.',
    notice:
      'Positioning, fonts and colours are not carried across — SubRip has no way to store them. The words and the times are exact.',
    outputExtension: 'srt',
    fields: sourceFields(),
  },
  {
    id: 'subtitle-to-vtt',
    name: 'Convert subtitles to WebVTT (.vtt)',
    description:
      'Turn an .srt or other subtitle file into the WebVTT format the HTML video element needs.',
    notice:
      'WebVTT cue identifiers and positioning settings are kept when the source had them.',
    outputExtension: 'vtt',
    fields: sourceFields(),
  },
  {
    id: 'subtitle-to-sbv',
    name: 'Convert subtitles to YouTube SBV (.sbv)',
    description: 'Produce the .sbv format YouTube Studio accepts for uploads.',
    outputExtension: 'sbv',
    fields: sourceFields(),
  },
  {
    id: 'subtitle-to-lrc',
    name: 'Convert subtitles to LRC lyrics (.lrc)',
    description:
      'Produce a timed lyrics file for music players from any subtitle file.',
    notice:
      'LRC stores a start time only, so end times are dropped and each cue is written on one line. Converting back cannot recover them.',
    outputExtension: 'lrc',
    fields: sourceFields(),
  },
  {
    id: 'subtitle-to-text',
    name: 'Subtitles to a plain transcript',
    description:
      'Strip the numbering and timings and keep only what is said, as readable text.',
    outputExtension: 'txt',
    fields: [
      ...sourceFields(),
      select(
        'joinLines',
        'Line breaks',
        [
          { value: 'cue', label: 'One block per subtitle' },
          { value: 'flow', label: 'Join into flowing paragraphs' },
        ],
        'cue',
      ),
      select(
        'clean',
        'Formatting tags',
        [
          { value: 'strip', label: 'Remove them' },
          { value: 'keep', label: 'Keep them' },
        ],
        'strip',
      ),
    ],
  },
  {
    id: 'subtitle-shift',
    name: 'Shift subtitle timing',
    description:
      'Move every subtitle earlier or later by the same amount, when they run consistently ahead or behind.',
    notice:
      'A shift that would push the first subtitle before the start of the video is refused, rather than flattening those cues onto 00:00.',
    outputExtension: 'srt',
    outputExtensionField: 'targetFormat',
    fields: [
      ...sourceFields(),
      text(
        'offset',
        'Shift by (seconds, or a timecode; negative moves earlier)',
        '2.5',
        '2.5, -1.25 or 00:00:02,500',
      ),
      targetField,
    ],
  },
  {
    id: 'subtitle-sync',
    name: 'Sync subtitles to two known moments',
    description:
      'Fix subtitles that start about right but drift further out as the video goes on, by giving the true time of the first and last line.',
    notice:
      'This stretches and shifts the whole file so both moments land exactly. It is the fix a plain shift cannot make.',
    outputExtension: 'srt',
    outputExtensionField: 'targetFormat',
    fields: [
      ...sourceFields(),
      text('firstActual', 'True time of the FIRST subtitle', '00:00:02,000'),
      text('lastActual', 'True time of the LAST subtitle', '00:00:11,000'),
      targetField,
    ],
  },
  {
    id: 'subtitle-framerate',
    name: 'Convert subtitle frame rate',
    description:
      'Retime a file made for one frame rate so it matches a video at another — the usual cause of subtitles that slip by seconds over an hour.',
    outputExtension: 'srt',
    outputExtensionField: 'targetFormat',
    fields: [
      ...sourceFields(),
      select('fromFps', 'The subtitles were timed for', [...FRAME_RATES], '25'),
      select('toFps', 'The video actually runs at', [...FRAME_RATES], '23.976'),
      targetField,
    ],
  },
  {
    id: 'subtitle-speed',
    name: 'Retime subtitles for a speed change',
    description:
      'Match subtitles to a video that was sped up or slowed down, such as a 1.25× re-export.',
    outputExtension: 'srt',
    outputExtensionField: 'targetFormat',
    fields: [
      ...sourceFields(),
      numberField(
        'speed',
        'The video plays at this speed (1 = unchanged)',
        '1.25',
      ),
      targetField,
    ],
  },
  {
    id: 'subtitle-merge',
    name: 'Join two subtitle files',
    description:
      'Put a second subtitle file after the first, for a video assembled from two parts.',
    notice:
      'The second file starts at the offset you give — normally the exact length of the first video.',
    outputExtension: 'srt',
    outputExtensionField: 'targetFormat',
    fields: [
      ...sourceFields(),
      ...sourceFields('second'),
      text(
        'secondStart',
        'The second file starts at',
        '00:00:12,000',
        'Length of the first video',
      ),
      targetField,
    ],
  },
  {
    id: 'subtitle-split',
    name: 'Split a subtitle file in two',
    description:
      'Take the part before or after a moment, for a video that was cut into two files.',
    outputExtension: 'srt',
    outputExtensionField: 'targetFormat',
    fields: [
      ...sourceFields(),
      text('splitAt', 'Split at', '00:00:05,000'),
      select(
        'side',
        'Keep',
        [
          { value: 'before', label: 'Everything before the split' },
          { value: 'after', label: 'Everything from the split onward' },
        ],
        'before',
      ),
      select(
        'rebase',
        'Times in the second part',
        [
          { value: 'rebase', label: 'Restart from 00:00' },
          { value: 'keep', label: 'Keep the original times' },
        ],
        'rebase',
      ),
      targetField,
    ],
  },
  {
    id: 'subtitle-trim',
    name: 'Keep only part of a subtitle file',
    description:
      'Keep the subtitles inside a time range and drop the rest, for a clip taken out of a longer video.',
    outputExtension: 'srt',
    outputExtensionField: 'targetFormat',
    fields: [
      ...sourceFields(),
      text('from', 'From', '00:00:03,000'),
      text('to', 'To', '00:00:09,000'),
      select(
        'rebase',
        'Times in the result',
        [
          { value: 'rebase', label: 'Restart from 00:00' },
          { value: 'keep', label: 'Keep the original times' },
        ],
        'rebase',
      ),
      targetField,
    ],
  },
  {
    id: 'subtitle-clean',
    name: 'Clean up a subtitle file',
    description:
      'Remove formatting tags, drop empty cues, pull apart overlapping lines and renumber — the usual repair for auto-generated captions.',
    notice:
      'Every change is counted and reported at the top of the result, so you can see what was altered.',
    outputExtension: 'srt',
    outputExtensionField: 'targetFormat',
    fields: [
      ...sourceFields(),
      select(
        'tags',
        'Formatting tags such as <i> and {\\an8}',
        [
          { value: 'strip', label: 'Remove them' },
          { value: 'keep', label: 'Keep them' },
        ],
        'strip',
      ),
      select(
        'blanks',
        'Cues with no words',
        [
          { value: 'drop', label: 'Remove them' },
          { value: 'dropMusic', label: 'Remove them, and music-only cues (♪)' },
          { value: 'keep', label: 'Keep them' },
        ],
        'drop',
      ),
      numberField(
        'minDuration',
        'Shortest time on screen (milliseconds)',
        '700',
      ),
      numberField('minGap', 'Smallest gap between cues (milliseconds)', '40'),
      targetField,
    ],
  },
  {
    id: 'subtitle-check',
    name: 'Check subtitles for problems',
    description:
      'Report overlaps, out-of-order cues, lines that are too long and text that goes past too fast to read.',
    notice:
      'Nothing is changed. The limits used are the common broadcast ones and are named in the report.',
    outputExtension: 'txt',
    fields: sourceFields(),
  },
];

// ---------------------------------------------------------------------------

function optionalFormat(value: string | undefined): SubtitleFormat | undefined {
  return value && value !== 'auto' ? (value as SubtitleFormat) : undefined;
}

/**
 * Resolves the input for one source: the chosen file wins over the paste box,
 * because choosing a file is the more deliberate act.
 */
function readSource(
  values: Record<string, string>,
  prefix = '',
): { document: SubtitleDocument; encoding: SourceEncoding } {
  const fileId = prefix ? `${prefix}File` : 'subtitleFile';
  const textId = prefix || 'subtitles';
  const formatId = prefix ? `${prefix}Format` : 'sourceFormat';

  const chosen = (values[fileId] ?? '').trim();
  const pasted = values[textId] ?? '';
  const raw = chosen || pasted;
  if (!raw.trim()) {
    throw new Error(
      prefix
        ? 'Choose or paste the second subtitle file.'
        : 'Choose a subtitle file, or paste subtitles into the box.',
    );
  }

  const { text: decoded, encoding } = readSubtitleInput(raw);
  const document = parseSubtitles(decoded, optionalFormat(values[formatId]));

  // A block that could not be read is lost work, so it stops the run instead
  // of riding along as a note the reader may never see.
  const skipped = document.warnings.filter((line) =>
    line.startsWith('Skipped'),
  );
  if (skipped.length) {
    const shown = skipped
      .slice(0, 3)
      .map((line) => `  • ${line}`)
      .join('\n');
    const more =
      skipped.length > 3 ? `\n  • …and ${skipped.length - 3} more` : '';
    throw new Error(
      `${skipped.length} part${skipped.length === 1 ? '' : 's'} of this file could not be read as ${FORMAT_NAMES[document.format]}, so nothing was produced:\n${shown}${more}\nIf the format was detected wrongly, choose it instead of leaving it on automatic.`,
    );
  }

  return { document, encoding };
}

function outputFormat(values: Record<string, string>): OutputFormat {
  const value = values.targetFormat;
  return value === 'vtt' ||
    value === 'sbv' ||
    value === 'lrc' ||
    value === 'txt'
    ? value
    : 'srt';
}

/** A short line saying how the file was read. */
function readNote(
  document: SubtitleDocument,
  encoding: SourceEncoding,
): string[] {
  return [
    `Read ${document.cues.length} subtitles as ${FORMAT_NAMES[document.format]}${
      encoding === 'text' ? '' : `, decoded as ${encoding}`
    }.`,
  ];
}

/**
 * Attaches the working notes to the result **only where the format has a way
 * to carry them**. WebVTT has `NOTE`; SubRip, SBV and LRC have no comment
 * syntax at all, so a note added to those would be text a player tries to
 * display. A clean, valid file matters more than a note, so everything else
 * comes back exactly as the format defines it.
 */
function withNotes(
  lines: string[],
  body: string,
  format: OutputFormat,
): string {
  if (format !== 'vtt' || !lines.length) return body;
  const notes = lines.map((line) => `NOTE ${line}`).join('\n\n');
  return body.replace(/^WEBVTT\n/u, `WEBVTT\n\n${notes}\n`);
}

function requireTime(
  values: Record<string, string>,
  key: string,
  label: string,
) {
  const parsed = parseTimecode(values[key] ?? '');
  if (parsed === null || parsed < 0) {
    throw new Error(
      `${label} must be a timecode such as 00:01:23,500 or a number of seconds such as 83.5.`,
    );
  }
  return parsed;
}

function finiteNumber(
  values: Record<string, string>,
  key: string,
  label: string,
  minimum: number,
  maximum: number,
): number {
  const value = Number((values[key] ?? '').trim());
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(
      `${label} must be a number between ${minimum} and ${maximum}.`,
    );
  }
  return value;
}

export function runSubtitleOperation(
  operationId: string,
  values: Record<string, string>,
): string {
  const { document, encoding } = readSource(values);
  const note = readNote(document, encoding);

  switch (operationId) {
    case 'subtitle-to-srt':
      return formatSubtitles(sortCues(document), 'srt');
    case 'subtitle-to-vtt':
      // WebVTT is the one output format with a comment syntax, so this is the
      // only conversion that can say how the source was read.
      return withNotes(note, formatSubtitles(sortCues(document), 'vtt'), 'vtt');
    case 'subtitle-to-sbv':
      return formatSubtitles(sortCues(document), 'sbv');
    case 'subtitle-to-lrc':
      return formatSubtitles(sortCues(document), 'lrc');

    case 'subtitle-to-text': {
      const cleaned =
        values.clean === 'keep'
          ? sortCues(document)
          : stripFormatting(sortCues(document));
      const body = formatSubtitles(cleaned, 'txt');
      return values.joinLines === 'flow'
        ? body
            .replace(/\n+/gu, ' ')
            .replace(/\s{2,}/gu, ' ')
            .trim() + '\n'
        : body;
    }

    case 'subtitle-shift': {
      const offsetMs = parseOffset(values.offset ?? '', 'the shift');
      if (offsetMs === 0) {
        throw new Error(
          'A shift of zero would change nothing. Enter a time to move by.',
        );
      }
      const shifted = shiftCues(sortCues(document), offsetMs);
      note.push(
        `Moved every subtitle by ${offsetMs > 0 ? '+' : '−'}${formatTimecode(
          Math.abs(offsetMs),
          'srt',
        )}.`,
      );
      return withNotes(
        note,
        formatSubtitles(shifted, outputFormat(values)),
        outputFormat(values),
      );
    }

    case 'subtitle-sync': {
      const firstActual = requireTime(
        values,
        'firstActual',
        'The first subtitle’s true time',
      );
      const lastActual = requireTime(
        values,
        'lastActual',
        'The last subtitle’s true time',
      );
      const result = syncToAnchors(document, firstActual, lastActual);
      note.push(
        `Stretched by ×${result.factor.toFixed(6)} and shifted by ${
          result.offsetMs >= 0 ? '+' : '−'
        }${formatTimecode(Math.abs(result.offsetMs), 'srt')}.`,
      );
      if (Math.abs(result.factor - 1) < 1e-9) {
        note.push(
          'The stretch worked out to exactly 1, so only a shift was needed.',
        );
      }
      return withNotes(
        note,
        formatSubtitles(result.document, outputFormat(values)),
        outputFormat(values),
      );
    }

    case 'subtitle-framerate': {
      const fromFps = Number(values.fromFps);
      const toFps = Number(values.toFps);
      const converted = convertFrameRate(sortCues(document), fromFps, toFps);
      note.push(
        `Retimed from ${fromFps} fps to ${toFps} fps, a factor of ×${(fromFps / toFps).toFixed(6)}.`,
      );
      return withNotes(
        note,
        formatSubtitles(converted, outputFormat(values)),
        outputFormat(values),
      );
    }

    case 'subtitle-speed': {
      const speed = finiteNumber(values, 'speed', 'The speed', 0.1, 10);
      if (speed === 1) {
        throw new Error('A speed of 1 would change nothing.');
      }
      // Playing a video faster means every subtitle must arrive sooner.
      const retimed = scaleCues(sortCues(document), 1 / speed);
      note.push(`Retimed for ${speed}× playback.`);
      return withNotes(
        note,
        formatSubtitles(retimed, outputFormat(values)),
        outputFormat(values),
      );
    }

    case 'subtitle-merge': {
      const second = readSource(values, 'second');
      const secondStart = requireTime(
        values,
        'secondStart',
        'The second file’s start',
      );
      const merged = mergeDocuments(
        sortCues(document),
        sortCues(second.document),
        secondStart,
      );
      note.push(
        ...readNote(second.document, second.encoding).map(
          (line) => `Second file: ${line}`,
        ),
      );
      note.push(
        `Joined into ${merged.cues.length} subtitles, with the second file starting at ${formatTimecode(
          secondStart,
          'srt',
        )}.`,
      );
      return withNotes(
        note,
        formatSubtitles(merged, outputFormat(values)),
        outputFormat(values),
      );
    }

    case 'subtitle-split': {
      const at = requireTime(values, 'splitAt', 'The split point');
      const parts = splitAt(sortCues(document), at, values.rebase !== 'keep');
      const kept = values.side === 'after' ? parts.after : parts.before;
      note.push(
        `Kept the ${values.side === 'after' ? 'second' : 'first'} part: ${kept.cues.length} of ${document.cues.length} subtitles.`,
      );
      return withNotes(
        note,
        formatSubtitles(kept, outputFormat(values)),
        outputFormat(values),
      );
    }

    case 'subtitle-trim': {
      const from = requireTime(values, 'from', 'The start of the range');
      const to = requireTime(values, 'to', 'The end of the range');
      const trimmed = trimToRange(
        sortCues(document),
        from,
        to,
        values.rebase !== 'keep',
      );
      note.push(
        `Kept ${trimmed.cues.length} of ${document.cues.length} subtitles between ${formatTimecode(
          from,
          'srt',
        )} and ${formatTimecode(to, 'srt')}.`,
      );
      return withNotes(
        note,
        formatSubtitles(trimmed, outputFormat(values)),
        outputFormat(values),
      );
    }

    case 'subtitle-clean': {
      const minDuration = finiteNumber(
        values,
        'minDuration',
        'The shortest time on screen',
        0,
        60_000,
      );
      const minGap = finiteNumber(
        values,
        'minGap',
        'The smallest gap',
        0,
        60_000,
      );

      let working = sortCues(document);
      if (values.tags !== 'keep') {
        working = stripFormatting(working);
        note.push('Removed formatting tags.');
      }
      if (values.blanks !== 'keep') {
        const result = removeEmptyCues(working, values.blanks === 'dropMusic');
        working = result.document;
        note.push(
          result.removed
            ? `Removed ${result.removed} cue${result.removed === 1 ? '' : 's'} with no words.`
            : 'No empty cues to remove.',
        );
      }
      const timing = fixOverlaps(working, minDuration, minGap);
      note.push(
        timing.changed
          ? `Adjusted the timing of ${timing.changed} cue${timing.changed === 1 ? '' : 's'}.`
          : 'No timing needed adjusting.',
      );
      return withNotes(
        note,
        formatSubtitles(timing.document, outputFormat(values)),
        outputFormat(values),
      );
    }

    case 'subtitle-check': {
      const report = checkSubtitles(sortCues(document));
      const lines = [
        ...note,
        '',
        `Subtitles: ${report.cueCount}`,
        `First starts at: ${formatTimecode(report.firstStartMs, 'srt')}`,
        `Last ends at: ${formatTimecode(report.lastEndMs, 'srt')}`,
        `Total time on screen: ${formatTimecode(report.totalTextMs, 'srt')}`,
        `Characters of text: ${report.characters.toLocaleString()}`,
        '',
        `Limits used: at most ${MAX_LINE_LENGTH} characters a line, at most ${MAX_CHARS_PER_SECOND} characters a second.`,
        '',
      ];

      if (!report.issues.length) {
        lines.push('No problems found against those limits.');
        return lines.join('\n') + '\n';
      }

      lines.push(
        `${report.issues.length} thing${report.issues.length === 1 ? '' : 's'} to look at:`,
        '',
      );
      for (const issue of report.issues) {
        lines.push(
          `  Subtitle ${issue.cueNumber} at ${formatTimecode(issue.atMs, 'srt')} — ${issue.problem}`,
        );
      }
      return lines.join('\n') + '\n';
    }

    default:
      throw new Error(`Unknown subtitle operation: ${operationId}`);
  }
}
