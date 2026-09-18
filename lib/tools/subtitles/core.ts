/**
 * Subtitle reading and writing: SubRip (.srt), WebVTT (.vtt), YouTube SBV
 * (.sbv), LRC lyrics and SubStation Alpha (.ass/.ssa) in; SRT, VTT, SBV, LRC
 * and plain text out.
 *
 * Every time is held as whole milliseconds, so a conversion is exact rather
 * than a float that drifts. Nothing here touches the network and nothing needs
 * a dependency — a subtitle file is text, and this is the grammar of it.
 */

export type SubtitleFormat = 'srt' | 'vtt' | 'sbv' | 'lrc' | 'ass';
export type OutputFormat = 'srt' | 'vtt' | 'sbv' | 'lrc' | 'txt';

export interface Cue {
  startMs: number;
  endMs: number;
  /** Cue text, newline-separated, with the source's line breaks kept. */
  text: string;
  /** WebVTT cue identifier, when the source had one. */
  id?: string;
  /** WebVTT positioning settings such as `line:90% align:center`. */
  settings?: string;
}

export interface SubtitleDocument {
  format: SubtitleFormat;
  cues: Cue[];
  /** Anything skipped or repaired while reading, so it can be shown. */
  warnings: string[];
}

/** How the bytes were turned into text, reported so it is never a guess. */
export type SourceEncoding =
  | 'text'
  | 'utf-8'
  | 'utf-8 (BOM)'
  | 'utf-16le (BOM)'
  | 'utf-16be (BOM)'
  | 'windows-1252';

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/**
 * The 32 code points Windows-1252 puts in 0x80–0x9F, where ISO-8859-1 has
 * unused control codes. Everything else in the two is identical, so a table of
 * these is a complete CP1252 decoder — and a hand-rolled one works in every
 * runtime, including ones whose TextDecoder only knows UTF-8.
 */
const CP1252_HIGH = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6,
  0x2030, 0x0160, 0x2039, 0x0152, 0x008d, 0x017d, 0x008f, 0x0090, 0x2018,
  0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161,
  0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
];

function decodeCp1252(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) {
    out += String.fromCharCode(
      byte >= 0x80 && byte <= 0x9f ? CP1252_HIGH[byte - 0x80] : byte,
    );
  }
  return out;
}

function decodeUtf16(bytes: Uint8Array, littleEndian: boolean): string {
  let out = '';
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    out += String.fromCharCode(
      littleEndian
        ? bytes[index] | (bytes[index + 1] << 8)
        : (bytes[index] << 8) | bytes[index + 1],
    );
  }
  return out;
}

function base64ToBytes(value: string): Uint8Array {
  const binary =
    typeof atob === 'function'
      ? atob(value)
      : Buffer.from(value, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/**
 * Turns a chosen file into text.
 *
 * Subtitle files are very often not UTF-8 — a Spanish, Hindi or Polish file
 * saved by an older tool is usually Windows-1252 or UTF-16, and reading those
 * bytes as UTF-8 turns every accented character into mojibake. So the byte
 * order mark is honoured first, UTF-8 is tried strictly, and Windows-1252 is
 * the fallback. Which one was used is returned, never assumed silently.
 */
export function decodeSubtitleBytes(bytes: Uint8Array): {
  text: string;
  encoding: SourceEncoding;
} {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      text: decodeUtf16(bytes.subarray(2), true),
      encoding: 'utf-16le (BOM)',
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return {
      text: decodeUtf16(bytes.subarray(2), false),
      encoding: 'utf-16be (BOM)',
    };
  }
  const hasUtf8Bom =
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf;
  const body = hasUtf8Bom ? bytes.subarray(3) : bytes;

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
    return { text, encoding: hasUtf8Bom ? 'utf-8 (BOM)' : 'utf-8' };
  } catch {
    return { text: decodeCp1252(body), encoding: 'windows-1252' };
  }
}

/**
 * Reads whatever the workbench passes in: text typed into the box, or a chosen
 * file, which arrives as a `data:` URL.
 */
export function readSubtitleInput(value: string): {
  text: string;
  encoding: SourceEncoding;
} {
  const trimmed = value.trim();
  if (!trimmed.startsWith('data:')) return { text: value, encoding: 'text' };

  const comma = trimmed.indexOf(',');
  if (comma < 0) return { text: value, encoding: 'text' };
  const meta = trimmed.slice(0, comma);
  const body = trimmed.slice(comma + 1);

  if (meta.includes(';base64')) return decodeSubtitleBytes(base64ToBytes(body));

  // A percent-encoded data URL is already characters, not bytes.
  try {
    return { text: decodeURIComponent(body), encoding: 'text' };
  } catch {
    return { text: body, encoding: 'text' };
  }
}

// ---------------------------------------------------------------------------
// Timecodes
// ---------------------------------------------------------------------------

export function formatTimecode(
  totalMs: number,
  format: 'srt' | 'vtt' | 'sbv' | 'lrc' | 'ass',
): string {
  const clamped = Math.max(0, Math.round(totalMs));
  const ms = clamped % 1000;
  const totalSeconds = Math.floor(clamped / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');

  if (format === 'srt') {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(ms, 3)}`;
  }
  if (format === 'vtt') {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(ms, 3)}`;
  }
  if (format === 'sbv') {
    return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(ms, 3)}`;
  }
  if (format === 'ass') {
    return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(
      Math.floor(ms / 10),
    )}`;
  }
  // LRC counts in minutes and hundredths, with no hours field at all.
  const lrcMinutes = Math.floor(clamped / 60_000);
  return `${pad(lrcMinutes)}:${pad(seconds)}.${pad(Math.floor(ms / 10))}`;
}

const TIMECODE = /^(?:(\d+):)?(\d{1,3}):(\d{1,2})[.,](\d{1,3})$/u;
const SHORT_TIMECODE = /^(\d{1,4}):(\d{1,2})[.,](\d{1,3})$/u;

/**
 * Reads `01:02:03,456`, `1:02:03.456`, `02:03.45` and plain `83.5` into
 * milliseconds. Returns `null` rather than throwing, so a caller can decide
 * whether a bad line is a warning or an error.
 */
export function parseTimecode(value: string): number | null {
  const text = value.trim();
  if (!text) return null;

  const full = TIMECODE.exec(text);
  if (full) {
    const [, hours, minutes, seconds, fraction] = full;
    const ms = Number(fraction.padEnd(3, '0'));
    return (
      Number(hours ?? 0) * 3_600_000 +
      Number(minutes) * 60_000 +
      Number(seconds) * 1000 +
      ms
    );
  }

  const short = SHORT_TIMECODE.exec(text);
  if (short) {
    const [, minutes, seconds, fraction] = short;
    return (
      Number(minutes) * 60_000 +
      Number(seconds) * 1000 +
      Number(fraction.padEnd(3, '0'))
    );
  }

  if (/^-?\d+(?:\.\d+)?$/u.test(text)) return Math.round(Number(text) * 1000);
  return null;
}

/** Parses a duration that may be negative: `-2`, `1.5`, `00:00:02,500`. */
export function parseOffset(value: string, label: string): number {
  const text = value.trim();
  if (!text) throw new Error(`Enter ${label}.`);
  const negative = text.startsWith('-');
  const magnitude = parseTimecode(negative ? text.slice(1) : text);
  if (magnitude === null) {
    throw new Error(
      `${label} must be seconds such as 2.5, or a timecode such as 00:00:02,500.`,
    );
  }
  return negative ? -magnitude : magnitude;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

function normalizeNewlines(text: string): string {
  return text.replace(/^﻿/u, '').replace(/\r\n?/gu, '\n');
}

export function detectFormat(text: string): SubtitleFormat {
  const body = normalizeNewlines(text).trimStart();
  if (body.startsWith('WEBVTT')) return 'vtt';
  if (/^\[Script Info\]/iu.test(body) || /^Dialogue:/mu.test(body)) {
    return 'ass';
  }
  if (/-->/u.test(body)) {
    // SubRip separates the two times with a comma; WebVTT uses a full stop.
    return /\d{2},\d{3}\s*-->/u.test(body) ? 'srt' : 'vtt';
  }
  if (/^\d{1,2}:\d{2}:\d{2}[.,]\d{1,3},\d{1,2}:\d{2}:\d{2}/mu.test(body)) {
    return 'sbv';
  }
  if (/^\[\d{1,3}:\d{2}[.:]\d{2}\]/mu.test(body)) return 'lrc';
  return 'srt';
}

function parseCueBlocks(
  body: string,
  separator: string,
  warnings: string[],
): Cue[] {
  const cues: Cue[] = [];
  const blocks = body.split(/\n{2,}/u);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('WEBVTT')) continue;
    if (/^(NOTE|STYLE|REGION)\b/u.test(trimmed)) continue;

    const lines = trimmed.split('\n');
    const timingIndex = lines.findIndex((line) => line.includes(separator));
    if (timingIndex < 0) {
      warnings.push(
        `Skipped a block with no timing line: "${trimmed.split('\n')[0].slice(0, 40)}"`,
      );
      continue;
    }

    const timing = lines[timingIndex];
    const [startRaw, rest = ''] = timing.split(separator);
    const restParts = rest.trim().split(/\s+/u);
    const endRaw = restParts.shift() ?? '';
    const settings = restParts.join(' ');

    const startMs = parseTimecode(startRaw);
    const endMs = parseTimecode(endRaw);
    if (startMs === null || endMs === null) {
      warnings.push(
        `Skipped a cue with an unreadable timing line: "${timing.trim().slice(0, 48)}"`,
      );
      continue;
    }

    // Anything above the timing line is a number or a WebVTT cue id.
    const above = lines.slice(0, timingIndex).join('\n').trim();
    const id = above && !/^\d+$/u.test(above) ? above : undefined;
    const text = lines
      .slice(timingIndex + 1)
      .join('\n')
      .trim();

    cues.push({
      startMs,
      endMs,
      text,
      ...(id ? { id } : {}),
      ...(settings ? { settings } : {}),
    });
  }

  return cues;
}

function parseSbv(body: string, warnings: string[]): Cue[] {
  const cues: Cue[] = [];
  for (const block of body.split(/\n{2,}/u)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split('\n');
    const timing = lines[0];
    const [startRaw, endRaw] = timing.split(',');
    const startMs = parseTimecode(startRaw ?? '');
    const endMs = parseTimecode(endRaw ?? '');
    if (startMs === null || endMs === null) {
      warnings.push(
        `Skipped a block whose first line is not an SBV timing: "${timing.slice(0, 40)}"`,
      );
      continue;
    }
    cues.push({ startMs, endMs, text: lines.slice(1).join('\n').trim() });
  }
  return cues;
}

/** LRC carries a start time only; the end of a line is the start of the next. */
const LRC_TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/gu;
const LRC_TRAILING_GAP_MS = 3000;

function parseLrc(body: string, warnings: string[]): Cue[] {
  const stamped: { startMs: number; text: string }[] = [];
  for (const line of body.split('\n')) {
    if (!line.trim()) continue;
    if (/^\[[a-z]{2,}:/iu.test(line)) continue; // [ar:], [ti:], [length:]
    const tags = [...line.matchAll(LRC_TAG)];
    if (!tags.length) {
      warnings.push(
        `Skipped a line with no LRC timestamp: "${line.trim().slice(0, 40)}"`,
      );
      continue;
    }
    const text = line
      .slice(tags[tags.length - 1].index! + tags[tags.length - 1][0].length)
      .trim();
    for (const tag of tags) {
      const [, minutes, seconds, fraction = '0'] = tag;
      const hundredths =
        fraction.length === 1
          ? Number(fraction) * 100
          : fraction.length === 2
            ? Number(fraction) * 10
            : Number(fraction);
      stamped.push({
        startMs: Number(minutes) * 60_000 + Number(seconds) * 1000 + hundredths,
        text,
      });
    }
  }

  stamped.sort((a, b) => a.startMs - b.startMs);
  return stamped.map((entry, index) => ({
    startMs: entry.startMs,
    endMs:
      index + 1 < stamped.length
        ? stamped[index + 1].startMs
        : entry.startMs + LRC_TRAILING_GAP_MS,
    text: entry.text,
  }));
}

/** SubStation Alpha: read the dialogue, and say that styling is not carried. */
function parseAss(body: string, warnings: string[]): Cue[] {
  const cues: Cue[] = [];
  let fields: string[] = [];
  let sawStyling = false;

  for (const line of body.split('\n')) {
    if (
      line.startsWith('Format:') &&
      /Start/u.test(line) &&
      /End/u.test(line)
    ) {
      fields = line
        .slice('Format:'.length)
        .split(',')
        .map((part) => part.trim());
      continue;
    }
    if (!line.startsWith('Dialogue:')) continue;

    const columns = line.slice('Dialogue:'.length).split(',');
    const startIndex = fields.indexOf('Start');
    const endIndex = fields.indexOf('End');
    const textIndex = fields.indexOf('Text');
    const start = parseTimecode(
      columns[startIndex >= 0 ? startIndex : 1] ?? '',
    );
    const end = parseTimecode(columns[endIndex >= 0 ? endIndex : 2] ?? '');
    if (start === null || end === null) {
      warnings.push(
        `Skipped a Dialogue line with unreadable times: "${line.slice(0, 48)}"`,
      );
      continue;
    }
    // Text is the last field and may itself contain commas.
    const from = textIndex >= 0 ? textIndex : 9;
    const raw = columns.slice(from).join(',');
    if (/\{\\/u.test(raw)) sawStyling = true;
    cues.push({
      startMs: start,
      endMs: end,
      text: raw.replace(/\\N/gu, '\n').trim(),
    });
  }

  if (sawStyling) {
    warnings.push(
      'This file uses SubStation styling overrides such as {\\an8}. The words and times are carried across; positioning, fonts and colours are not.',
    );
  }
  return cues;
}

/**
 * Reads a subtitle file. Blocks that cannot be read are **reported as
 * warnings, not silently dropped** — a converter that quietly loses three cues
 * is worse than one that says it could not read them.
 */
export function parseSubtitles(
  input: string,
  format?: SubtitleFormat,
): SubtitleDocument {
  const body = normalizeNewlines(input).trim();
  if (!body) throw new Error('Paste subtitles, or choose a subtitle file.');

  const resolved = format ?? detectFormat(body);
  const warnings: string[] = [];

  const cues =
    resolved === 'sbv'
      ? parseSbv(body, warnings)
      : resolved === 'lrc'
        ? parseLrc(body, warnings)
        : resolved === 'ass'
          ? parseAss(body, warnings)
          : parseCueBlocks(body, '-->', warnings);

  if (!cues.length) {
    throw new Error(
      `No subtitle cues were found. This was read as ${resolved.toUpperCase()}; if that is wrong, choose the format instead of leaving it on automatic.`,
    );
  }

  return { format: resolved, cues, warnings };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export function formatSubtitles(
  document: SubtitleDocument,
  format: OutputFormat,
): string {
  const { cues } = document;

  if (format === 'srt') {
    return (
      cues
        .map(
          (cue, index) =>
            `${index + 1}\n${formatTimecode(cue.startMs, 'srt')} --> ${formatTimecode(
              cue.endMs,
              'srt',
            )}\n${cue.text}`,
        )
        .join('\n\n') + '\n'
    );
  }

  if (format === 'vtt') {
    const blocks = cues.map((cue) => {
      const timing = `${formatTimecode(cue.startMs, 'vtt')} --> ${formatTimecode(
        cue.endMs,
        'vtt',
      )}${cue.settings ? ` ${cue.settings}` : ''}`;
      return `${cue.id ? `${cue.id}\n` : ''}${timing}\n${cue.text}`;
    });
    return `WEBVTT\n\n${blocks.join('\n\n')}\n`;
  }

  if (format === 'sbv') {
    return (
      cues
        .map(
          (cue) =>
            `${formatTimecode(cue.startMs, 'sbv')},${formatTimecode(
              cue.endMs,
              'sbv',
            )}\n${cue.text}`,
        )
        .join('\n\n') + '\n'
    );
  }

  if (format === 'lrc') {
    return (
      cues
        .map(
          (cue) =>
            `[${formatTimecode(cue.startMs, 'lrc')}]${cue.text.replace(
              /\n/gu,
              ' ',
            )}`,
        )
        .join('\n') + '\n'
    );
  }

  return cues.map((cue) => cue.text).join('\n') + '\n';
}

export const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  srt: 'srt',
  vtt: 'vtt',
  sbv: 'sbv',
  lrc: 'lrc',
  txt: 'txt',
};

export const FORMAT_NAMES: Record<SubtitleFormat | 'txt', string> = {
  srt: 'SubRip (.srt)',
  vtt: 'WebVTT (.vtt)',
  sbv: 'YouTube SBV (.sbv)',
  lrc: 'LRC lyrics (.lrc)',
  ass: 'SubStation Alpha (.ass)',
  txt: 'Plain text (.txt)',
};
