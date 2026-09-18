/**
 * Everything that changes a subtitle document once it has been read: timing
 * fixes, joining, splitting, cleaning and checking.
 *
 * Each function returns a new document. None of them lose a cue without
 * saying so, and the ones that can produce an impossible result — a negative
 * time, an overlap, an empty file — refuse instead.
 */

import type { Cue, SubtitleDocument } from './core';

function withCues(document: SubtitleDocument, cues: Cue[]): SubtitleDocument {
  return { ...document, cues };
}

/** Times never go below zero; a cue pushed past the start is clamped there. */
function clampCue(cue: Cue): Cue {
  const startMs = Math.max(0, Math.round(cue.startMs));
  const endMs = Math.max(startMs, Math.round(cue.endMs));
  return { ...cue, startMs, endMs };
}

export function sortCues(document: SubtitleDocument): SubtitleDocument {
  return withCues(
    document,
    [...document.cues].sort(
      (a, b) => a.startMs - b.startMs || a.endMs - b.endMs,
    ),
  );
}

/**
 * Moves every cue by the same amount. A shift that would push cues before
 * zero is refused rather than silently flattening them onto 00:00.
 */
export function shiftCues(
  document: SubtitleDocument,
  offsetMs: number,
): SubtitleDocument {
  if (offsetMs < 0) {
    const earliest = Math.min(...document.cues.map((cue) => cue.startMs));
    if (earliest + offsetMs < 0) {
      throw new Error(
        `Shifting back by ${(-offsetMs / 1000).toFixed(3)}s would move the first subtitle before the start of the video — it begins at ${(earliest / 1000).toFixed(3)}s. Use ${(earliest / 1000).toFixed(3)}s or less.`,
      );
    }
  }
  return withCues(
    document,
    document.cues.map((cue) =>
      clampCue({
        ...cue,
        startMs: cue.startMs + offsetMs,
        endMs: cue.endMs + offsetMs,
      }),
    ),
  );
}

/**
 * Multiplies every time by `factor`, then shifts by `offsetMs`.
 * This is the shape of every drift fix: subtitles that start right and end
 * late are wrong by a rate, not by a constant.
 */
export function scaleCues(
  document: SubtitleDocument,
  factor: number,
  offsetMs = 0,
): SubtitleDocument {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error('The speed factor must be a positive number.');
  }
  return withCues(
    document,
    document.cues.map((cue) =>
      clampCue({
        ...cue,
        startMs: cue.startMs * factor + offsetMs,
        endMs: cue.endMs * factor + offsetMs,
      }),
    ),
  );
}

/** The frame rates a subtitle file actually gets mistimed between. */
export const FRAME_RATES = [
  { value: '23.976', label: '23.976 fps (NTSC film)' },
  { value: '24', label: '24 fps (cinema)' },
  { value: '25', label: '25 fps (PAL)' },
  { value: '29.97', label: '29.97 fps (NTSC video)' },
  { value: '30', label: '30 fps' },
] as const;

export function convertFrameRate(
  document: SubtitleDocument,
  fromFps: number,
  toFps: number,
): SubtitleDocument {
  if (
    !Number.isFinite(fromFps) ||
    !Number.isFinite(toFps) ||
    fromFps <= 0 ||
    toFps <= 0
  ) {
    throw new Error('Both frame rates must be positive numbers.');
  }
  if (fromFps === toFps) {
    throw new Error(
      'The two frame rates are the same, so nothing would change.',
    );
  }
  // A file timed for 25 fps played at 23.976 runs slow by exactly that ratio.
  return scaleCues(document, fromFps / toFps);
}

/**
 * Two-point sync. You give the true time of the first and last subtitle, and
 * the whole file is stretched and shifted so both land exactly there.
 *
 * This fixes the common case a plain offset cannot: subtitles that are right
 * at the start and progressively wrong by the end.
 */
export function syncToAnchors(
  document: SubtitleDocument,
  firstActualMs: number,
  lastActualMs: number,
): { document: SubtitleDocument; factor: number; offsetMs: number } {
  const sorted = sortCues(document).cues;
  const firstCurrent = sorted[0].startMs;
  const lastCurrent = sorted[sorted.length - 1].startMs;

  if (lastCurrent === firstCurrent) {
    throw new Error(
      'The first and last subtitles start at the same time, so there is nothing to stretch between.',
    );
  }
  if (lastActualMs <= firstActualMs) {
    throw new Error(
      'The last subtitle’s true time must be later than the first one’s.',
    );
  }

  const factor = (lastActualMs - firstActualMs) / (lastCurrent - firstCurrent);
  const offsetMs = firstActualMs - firstCurrent * factor;
  return { document: scaleCues(document, factor, offsetMs), factor, offsetMs };
}

/**
 * Puts one file after another. `offsetMs` is where the second file's own
 * 00:00 lands — normally the length of the first video.
 */
export function mergeDocuments(
  first: SubtitleDocument,
  second: SubtitleDocument,
  offsetMs: number,
): SubtitleDocument {
  const moved = shiftCues(second, offsetMs).cues;
  return {
    format: first.format,
    cues: [...first.cues, ...moved].sort((a, b) => a.startMs - b.startMs),
    warnings: [...first.warnings, ...second.warnings],
  };
}

/**
 * Keeps only what falls inside a window. `rebase` makes the kept range start
 * at zero, which is what you want after cutting the video itself.
 */
export function trimToRange(
  document: SubtitleDocument,
  fromMs: number,
  toMs: number,
  rebase: boolean,
): SubtitleDocument {
  if (toMs <= fromMs) {
    throw new Error('The end of the range must be later than the start.');
  }
  const kept = document.cues.filter(
    (cue) => cue.endMs > fromMs && cue.startMs < toMs,
  );
  if (!kept.length) {
    throw new Error(
      'No subtitles fall inside that range, so the result would be empty.',
    );
  }
  const clipped = kept.map((cue) =>
    clampCue({
      ...cue,
      startMs: Math.max(cue.startMs, fromMs) - (rebase ? fromMs : 0),
      endMs: Math.min(cue.endMs, toMs) - (rebase ? fromMs : 0),
    }),
  );
  return withCues(document, clipped);
}

/** Splits into the part before `atMs` and the part from `atMs` onward. */
export function splitAt(
  document: SubtitleDocument,
  atMs: number,
  rebaseSecond: boolean,
): { before: SubtitleDocument; after: SubtitleDocument } {
  const before = document.cues.filter((cue) => cue.startMs < atMs);
  const after = document.cues.filter((cue) => cue.startMs >= atMs);
  if (!before.length || !after.length) {
    throw new Error(
      'That split point leaves one side empty. Choose a time with subtitles on both sides of it.',
    );
  }
  return {
    before: withCues(document, before),
    after: withCues(
      document,
      rebaseSecond
        ? after.map((cue) =>
            clampCue({
              ...cue,
              startMs: cue.startMs - atMs,
              endMs: cue.endMs - atMs,
            }),
          )
        : after,
    ),
  };
}

const MARKUP = /<\/?(?:i|b|u|s|v|c|ruby|rt|lang|font|br)\b[^>]*>/giu;
const ASS_OVERRIDE = /\{\\[^}]*\}/gu;
const ASS_ESCAPES = /\\[Nnh]/gu;

/** Text with tags and styling removed, used by both cleaning and checking. */
export function plainText(text: string): string {
  return text
    .replace(ASS_OVERRIDE, '')
    .replace(MARKUP, '')
    .replace(ASS_ESCAPES, ' ')
    .replace(/[ \t]+/gu, ' ')
    .trim();
}

export function stripFormatting(document: SubtitleDocument): SubtitleDocument {
  return withCues(
    document,
    document.cues.map((cue) => ({
      ...cue,
      text: cue.text
        .split('\n')
        .map((line) => plainText(line))
        .join('\n')
        .trim(),
      settings: undefined,
    })),
  );
}

/** Drops cues with no words in them — a common artefact of auto-captioning. */
export function removeEmptyCues(
  document: SubtitleDocument,
  alsoDropMusicOnly: boolean,
): { document: SubtitleDocument; removed: number } {
  const kept = document.cues.filter((cue) => {
    const text = plainText(cue.text);
    if (!text) return false;
    if (alsoDropMusicOnly && /^[♪♫\s.,-]+$/u.test(text)) return false;
    return true;
  });
  if (!kept.length) {
    throw new Error('Every cue would be removed, so nothing would be left.');
  }
  return {
    document: withCues(document, kept),
    removed: document.cues.length - kept.length,
  };
}

/**
 * Makes the timing playable: sorts, enforces a minimum on screen, and pulls
 * back any cue that runs into the next one.
 */
export function fixOverlaps(
  document: SubtitleDocument,
  minDurationMs: number,
  minGapMs: number,
): { document: SubtitleDocument; changed: number } {
  if (minDurationMs < 0 || minGapMs < 0) {
    throw new Error('The minimum duration and gap cannot be negative.');
  }
  const cues = sortCues(document).cues.map((cue) => ({ ...cue }));
  let changed = 0;

  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    const before = `${cue.startMs}:${cue.endMs}`;

    if (cue.endMs < cue.startMs + minDurationMs) {
      cue.endMs = cue.startMs + minDurationMs;
    }
    const next = cues[index + 1];
    if (next) {
      const latestEnd = next.startMs - minGapMs;
      if (cue.endMs > latestEnd) cue.endMs = latestEnd;
      // A cue that cannot fit even its minimum keeps at least a single frame,
      // rather than becoming an end before its own start.
      if (cue.endMs <= cue.startMs) cue.endMs = cue.startMs + 1;
    }
    if (`${cue.startMs}:${cue.endMs}` !== before) changed += 1;
  }

  return { document: withCues(document, cues), changed };
}

export interface SubtitleIssue {
  cueNumber: number;
  atMs: number;
  problem: string;
}

export interface SubtitleCheck {
  cueCount: number;
  firstStartMs: number;
  lastEndMs: number;
  totalTextMs: number;
  characters: number;
  issues: SubtitleIssue[];
}

/**
 * Broadcast and streaming subtitle guidance converges on these: no more than
 * two lines, about 42 characters a line, and a reading speed around 20
 * characters a second. They are reported as things to look at, never
 * "corrected" silently.
 */
export const MAX_LINE_LENGTH = 42;
export const MAX_LINES = 2;
export const MAX_CHARS_PER_SECOND = 21;
export const MIN_DURATION_MS = 700;

export function checkSubtitles(document: SubtitleDocument): SubtitleCheck {
  const issues: SubtitleIssue[] = [];
  const cues = document.cues;
  let characters = 0;
  let totalTextMs = 0;

  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    const number = index + 1;
    const text = plainText(cue.text);
    const durationMs = cue.endMs - cue.startMs;
    characters += text.length;
    totalTextMs += Math.max(0, durationMs);

    if (!text) {
      issues.push({ cueNumber: number, atMs: cue.startMs, problem: 'No text' });
    }
    if (durationMs <= 0) {
      issues.push({
        cueNumber: number,
        atMs: cue.startMs,
        problem: 'Ends at or before it starts',
      });
    } else if (durationMs < MIN_DURATION_MS) {
      issues.push({
        cueNumber: number,
        atMs: cue.startMs,
        problem: `On screen for only ${durationMs} ms`,
      });
    }

    const previous = cues[index - 1];
    if (previous && cue.startMs < previous.startMs) {
      issues.push({
        cueNumber: number,
        atMs: cue.startMs,
        problem: 'Starts before the cue above it',
      });
    }
    if (previous && cue.startMs < previous.endMs) {
      issues.push({
        cueNumber: number,
        atMs: cue.startMs,
        problem: `Overlaps cue ${number - 1} by ${previous.endMs - cue.startMs} ms`,
      });
    }

    const lines = cue.text.split('\n').filter((line) => line.trim());
    if (lines.length > MAX_LINES) {
      issues.push({
        cueNumber: number,
        atMs: cue.startMs,
        problem: `${lines.length} lines, more than the usual ${MAX_LINES}`,
      });
    }
    for (const line of lines) {
      const length = plainText(line).length;
      if (length > MAX_LINE_LENGTH) {
        issues.push({
          cueNumber: number,
          atMs: cue.startMs,
          problem: `A line is ${length} characters, over the usual ${MAX_LINE_LENGTH}`,
        });
        break;
      }
    }

    if (durationMs > 0 && text.length > 0) {
      const perSecond = text.length / (durationMs / 1000);
      if (perSecond > MAX_CHARS_PER_SECOND) {
        issues.push({
          cueNumber: number,
          atMs: cue.startMs,
          problem: `Reads at ${perSecond.toFixed(1)} characters a second, above the usual ${MAX_CHARS_PER_SECOND}`,
        });
      }
    }
  }

  return {
    cueCount: cues.length,
    firstStartMs: Math.min(...cues.map((cue) => cue.startMs)),
    lastEndMs: Math.max(...cues.map((cue) => cue.endMs)),
    totalTextMs,
    characters,
    issues,
  };
}
