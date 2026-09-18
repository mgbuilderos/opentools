/**
 * Lossless MP3 editing: cut, join, re-tag and analyse, entirely by copying
 * whole MPEG frames. No decoder and no encoder is involved, so the audio that
 * comes out is bit-for-bit the audio that went in — only shorter, joined, or
 * differently tagged.
 *
 * The one honest limitation is time resolution. A frame is a fixed number of
 * samples (26.1 ms at 44.1 kHz for MPEG-1 Layer III), so a cut lands on a frame
 * boundary, not on an arbitrary millisecond. `sliceMp3` reports the boundary it
 * actually used so the page can show it instead of implying sample accuracy.
 */

import {
  buildId3v2,
  findApeTag,
  findId3v1,
  findId3v2,
  type Id3Tags,
  readTags,
} from './id3';
import {
  buildXingFrame,
  type ChannelMode,
  decodeFrameHeader,
  findFrameSync,
  framesAreCompatible,
  type MpegLayer,
  type MpegVersion,
  type Mp3Frame,
  readVbrHeader,
  type VbrHeader,
} from './mp3-frames';

export interface Mp3File {
  bytes: Uint8Array;
  /** Audio frames in stream order. The Xing/Info header frame is excluded. */
  frames: readonly Mp3Frame[];
  /** The Xing/Info/VBRI header frame, when the file carries one. */
  header: { frame: Mp3Frame; vbr: VbrHeader } | null;
  tags: Id3Tags;
  id3v2Size: number;
  trailerSize: number;
  audioStart: number;
  audioEnd: number;
  durationMs: number;
  audioBytes: number;
  averageBitrateKbps: number;
  variableBitrate: boolean;
  version: MpegVersion;
  layer: MpegLayer;
  sampleRate: number;
  channels: 1 | 2;
  channelMode: ChannelMode;
  /** Bytes between frames that were not part of any frame. */
  skippedBytes: number;
}

/** Frame scanning gives up rather than looping forever on a hostile file. */
const MAX_FRAMES = 4_000_000;

function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

/**
 * Reads an MP3 into frames and tags. Throws with a plain-language reason when
 * the bytes are not an MP3 this library can edit losslessly.
 */
export function parseMp3(input: Uint8Array): Mp3File {
  const bytes = input;
  if (bytes.length < 4) {
    throw new Error('This file is too small to be an MP3.');
  }

  const id3v2 = findId3v2(bytes);
  const audioStart = id3v2 ? id3v2.size : 0;

  let audioEnd = bytes.length;
  const id3v1 = findId3v1(bytes);
  if (id3v1) audioEnd = id3v1.offset;
  const ape = findApeTag(bytes, audioEnd);
  if (ape && ape.offset > audioStart) audioEnd = ape.offset;
  const trailerSize = bytes.length - audioEnd;

  if (audioEnd - audioStart < 4) {
    throw new Error('This file has tags but no MPEG audio in it.');
  }

  const firstOffset = findFrameSync(bytes, audioStart, audioEnd);
  if (firstOffset < 0) {
    throw new Error(
      'No MPEG audio frames were found. If this is an M4A, WAV, FLAC or OGG file, it is not an MP3 and cannot be cut losslessly here.',
    );
  }

  const first = decodeFrameHeader(bytes, firstOffset);
  if (!first) {
    throw new Error('The first audio frame could not be read.');
  }

  const frames: Mp3Frame[] = [];
  let skippedBytes = firstOffset - audioStart;
  let cursor = firstOffset;

  while (cursor + 4 <= audioEnd && frames.length < MAX_FRAMES) {
    const frame = decodeFrameHeader(bytes, cursor);
    if (frame && framesAreCompatible(first, frame)) {
      if (cursor + frame.length > audioEnd) break; // truncated final frame
      frames.push(frame);
      cursor += frame.length;
      continue;
    }
    const next = findFrameSync(bytes, cursor + 1, audioEnd);
    if (next < 0) {
      skippedBytes += audioEnd - cursor;
      break;
    }
    const candidate = decodeFrameHeader(bytes, next);
    if (!candidate || !framesAreCompatible(first, candidate)) {
      skippedBytes += audioEnd - cursor;
      break;
    }
    skippedBytes += next - cursor;
    cursor = next;
  }

  if (!frames.length) {
    throw new Error('No complete MPEG audio frames were found in this file.');
  }

  const headerFrame = frames[0];
  const vbr = readVbrHeader(bytes, headerFrame);
  const header = vbr ? { frame: headerFrame, vbr } : null;
  const audioFrames = header ? frames.slice(1) : frames;

  if (!audioFrames.length) {
    throw new Error(
      'This file contains only a bitrate header and no audio frames.',
    );
  }

  let durationMs = 0;
  let audioBytes = 0;
  let variableBitrate = vbr?.kind === 'Xing' || vbr?.kind === 'VBRI';
  const firstBitrate = audioFrames[0].bitrateKbps;
  for (const frame of audioFrames) {
    durationMs += frame.durationMs;
    audioBytes += frame.length;
    if (frame.bitrateKbps !== firstBitrate) variableBitrate = true;
  }

  const averageBitrateKbps =
    durationMs > 0 ? (audioBytes * 8) / durationMs : firstBitrate;

  return {
    bytes,
    frames: audioFrames,
    header,
    tags: readTags(bytes),
    id3v2Size: audioStart,
    trailerSize,
    audioStart,
    audioEnd,
    durationMs,
    audioBytes,
    averageBitrateKbps,
    variableBitrate,
    version: headerFrame.version,
    layer: headerFrame.layer,
    sampleRate: headerFrame.sampleRate,
    channels: headerFrame.channels,
    channelMode: headerFrame.channelMode,
    skippedBytes,
  };
}

function framesBytes(file: Mp3File, frames: readonly Mp3Frame[]): Uint8Array {
  let total = 0;
  for (const frame of frames) total += frame.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const frame of frames) {
    out.set(
      file.bytes.subarray(frame.offset, frame.offset + frame.length),
      cursor,
    );
    cursor += frame.length;
  }
  return out;
}

/**
 * Assembles a playable MP3 from a set of frames, writing a correct bitrate
 * header for it rather than copying the source's stale one.
 */
function assemble(options: {
  tag: Uint8Array;
  audio: Uint8Array;
  frameCount: number;
  needsXing: boolean;
  version: MpegVersion;
  layer: MpegLayer;
  sampleRate: number;
  channelMode: ChannelMode;
}): Uint8Array {
  const { tag, audio, frameCount, needsXing } = options;
  if (!needsXing || options.layer !== 3) {
    return concatBytes([tag, audio]);
  }

  const shape = {
    version: options.version,
    layer: options.layer,
    sampleRate: options.sampleRate,
    channelMode: options.channelMode,
  };
  // The frame's length depends only on its shape, so measure it first, then
  // write the real counts into a second frame of the same size. The byte count
  // covers the MPEG stream only and excludes the ID3 tag, which is what LAME
  // writes and what players expect when they derive an average bitrate.
  const probe = buildXingFrame({ ...shape, frameCount: 0, byteCount: 0 });
  const xing = buildXingFrame({
    ...shape,
    frameCount,
    byteCount: probe.length + audio.length,
  });
  return concatBytes([tag, xing, audio]);
}

export interface Mp3SliceResult {
  bytes: Uint8Array;
  /** Where the cut actually landed, on the nearest frame boundary. */
  startMs: number;
  endMs: number;
  /** How far each edge moved from what was asked for. */
  startDriftMs: number;
  endDriftMs: number;
  frameCount: number;
  durationMs: number;
}

export interface SliceOptions {
  /** Carry the source's title/artist/album across. Default true. */
  keepTags?: boolean;
  /** Replace the tags instead of copying them. */
  tags?: Id3Tags;
}

/**
 * Cuts `[startMs, endMs)` out of an MP3 by copying whole frames.
 *
 * Both edges expand to the enclosing frame boundaries, so the result always
 * contains everything that was asked for and at most one frame more at each
 * edge. The drift is returned so it can be shown rather than hidden. Because
 * MP3 frames may
 * reference up to 511 bytes of the previous frame's data — the bit reservoir —
 * the first frames after a cut can decode slightly differently from the
 * original. That is inherent to every lossless MP3 cutter and is disclosed on
 * the page.
 */
export function sliceMp3(
  file: Mp3File,
  startMs: number,
  endMs: number,
  options: SliceOptions = {},
): Mp3SliceResult {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error('Enter a start and end time in seconds.');
  }
  if (startMs < 0) throw new Error('The start time cannot be negative.');
  if (endMs <= startMs) {
    throw new Error('The end time must be later than the start time.');
  }
  if (startMs >= file.durationMs) {
    throw new Error(
      `The start time is past the end of this ${(file.durationMs / 1000).toFixed(2)}s file.`,
    );
  }

  let elapsed = 0;
  let startIndex = -1;
  let endIndex = file.frames.length;
  let actualStart = 0;
  let actualEnd = file.durationMs;

  for (let index = 0; index < file.frames.length; index += 1) {
    const frame = file.frames[index];
    const frameEnd = elapsed + frame.durationMs;
    if (startIndex < 0 && frameEnd > startMs) {
      startIndex = index;
      actualStart = elapsed;
    }
    if (startIndex >= 0 && elapsed >= endMs) {
      endIndex = index;
      actualEnd = elapsed;
      break;
    }
    elapsed = frameEnd;
  }

  if (startIndex < 0) {
    throw new Error('The start time is past the end of this file.');
  }
  if (endIndex >= file.frames.length) {
    endIndex = file.frames.length;
    actualEnd = file.durationMs;
  }
  // Expanding outward guarantees at least one frame: the end time is always
  // later than the start of the frame the start time falls in.
  const selected = file.frames.slice(startIndex, endIndex);
  const audio = framesBytes(file, selected);
  const keepTags = options.keepTags ?? true;
  const tagSource = options.tags ?? (keepTags ? file.tags : {});
  const tag = buildId3v2(tagSource);

  let durationMs = 0;
  let variable = false;
  const firstBitrate = selected[0].bitrateKbps;
  for (const frame of selected) {
    durationMs += frame.durationMs;
    if (frame.bitrateKbps !== firstBitrate) variable = true;
  }

  const bytes = assemble({
    tag,
    audio,
    frameCount: selected.length,
    needsXing: variable || file.variableBitrate,
    version: file.version,
    layer: file.layer,
    sampleRate: file.sampleRate,
    channelMode: file.channelMode,
  });

  return {
    bytes,
    startMs: actualStart,
    endMs: actualEnd,
    startDriftMs: actualStart - startMs,
    endDriftMs: actualEnd - endMs,
    frameCount: selected.length,
    durationMs,
  };
}

export interface Mp3JoinResult {
  bytes: Uint8Array;
  frameCount: number;
  durationMs: number;
}

/**
 * Joins MP3s end to end by copying frames.
 *
 * Files whose sample rate or channel count differ cannot be concatenated into
 * one valid stream, so they are refused by name rather than producing a file
 * that plays at the wrong speed after the join point. Differing bitrates are
 * fine — the result is simply variable bitrate, and gets a correct Xing header.
 */
export function joinMp3(
  files: readonly { name: string; file: Mp3File }[],
  options: SliceOptions = {},
): Mp3JoinResult {
  if (files.length < 2) {
    throw new Error('Choose at least two MP3 files to join.');
  }

  const [first, ...rest] = files;
  for (const entry of rest) {
    if (entry.file.sampleRate !== first.file.sampleRate) {
      throw new Error(
        `${entry.name} is ${entry.file.sampleRate} Hz but ${first.name} is ${first.file.sampleRate} Hz. Files must share a sample rate to be joined without re-encoding.`,
      );
    }
    if (entry.file.channels !== first.file.channels) {
      throw new Error(
        `${entry.name} is ${entry.file.channels === 1 ? 'mono' : 'stereo'} but ${first.name} is ${first.file.channels === 1 ? 'mono' : 'stereo'}. Files must share a channel count to be joined without re-encoding.`,
      );
    }
    if (
      entry.file.version !== first.file.version ||
      entry.file.layer !== first.file.layer
    ) {
      throw new Error(
        `${entry.name} is ${entry.file.version} Layer ${entry.file.layer} but ${first.name} is ${first.file.version} Layer ${first.file.layer}. Files must share a format to be joined without re-encoding.`,
      );
    }
  }

  const chunks: Uint8Array[] = [];
  let frameCount = 0;
  let durationMs = 0;
  let variable = false;
  const firstBitrate = first.file.frames[0].bitrateKbps;

  for (const entry of files) {
    chunks.push(framesBytes(entry.file, entry.file.frames));
    frameCount += entry.file.frames.length;
    durationMs += entry.file.durationMs;
    if (entry.file.variableBitrate) variable = true;
    for (const frame of entry.file.frames) {
      if (frame.bitrateKbps !== firstBitrate) variable = true;
    }
  }

  const keepTags = options.keepTags ?? true;
  const tagSource = options.tags ?? (keepTags ? first.file.tags : {});

  const bytes = assemble({
    tag: buildId3v2(tagSource),
    audio: concatBytes(chunks),
    frameCount,
    needsXing: variable,
    version: first.file.version,
    layer: first.file.layer,
    sampleRate: first.file.sampleRate,
    channelMode: first.file.channelMode,
  });

  return { bytes, frameCount, durationMs };
}

/**
 * Rewrites the file with a new set of tags, or with none at all. Audio frames
 * are copied untouched and any trailing ID3v1 or APE tag is dropped, so the
 * tags you see are the only tags in the file.
 */
export function retagMp3(file: Mp3File, tags: Id3Tags): Uint8Array {
  return assemble({
    tag: buildId3v2(tags),
    audio: framesBytes(file, file.frames),
    frameCount: file.frames.length,
    needsXing: file.variableBitrate,
    version: file.version,
    layer: file.layer,
    sampleRate: file.sampleRate,
    channelMode: file.channelMode,
  });
}

/** Removes every tag, leaving only the MPEG stream. */
export function stripTags(file: Mp3File): Uint8Array {
  return retagMp3(file, {});
}

export function formatDurationMs(durationMs: number): string {
  const totalSeconds = durationMs / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(Math.floor(value)).padStart(2, '0');
  const secondsText =
    seconds < 10 ? `0${seconds.toFixed(2)}` : seconds.toFixed(2);
  return hours > 0
    ? `${hours}:${pad(minutes)}:${secondsText}`
    : `${minutes}:${secondsText}`;
}

/**
 * Parses `1:23.5`, `83.5` or `1:02:03` into milliseconds.
 * Used for the cut fields so people can paste a timestamp from a player.
 */
export function parseTimecode(value: string, label: string): number {
  const text = value.trim();
  if (!text) throw new Error(`Enter ${label}.`);
  const parts = text.split(':');
  if (parts.length > 3) {
    throw new Error(`${label} must look like 1:23.5, 83.5 or 1:02:03.`);
  }
  let seconds = 0;
  for (const part of parts) {
    const piece = part.trim();
    if (!/^\d*\.?\d*$/.test(piece) || piece === '' || piece === '.') {
      throw new Error(`${label} must look like 1:23.5, 83.5 or 1:02:03.`);
    }
    seconds = seconds * 60 + Number(piece);
  }
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`${label} must be a positive time.`);
  }
  return seconds * 1000;
}

export interface Mp3Report {
  label: string;
  value: string;
}

const CHANNEL_LABELS: Record<ChannelMode, string> = {
  stereo: 'Stereo',
  'joint-stereo': 'Joint stereo',
  'dual-channel': 'Dual channel',
  mono: 'Mono',
};

/** The analysis rows shown on the page. Every value is measured, not guessed. */
export function describeMp3(file: Mp3File): Mp3Report[] {
  const rows: Mp3Report[] = [
    { label: 'Duration', value: formatDurationMs(file.durationMs) },
    {
      label: 'Format',
      value: `${file.version} Layer ${file.layer}`,
    },
    {
      label: 'Bitrate',
      value: file.variableBitrate
        ? `Variable, ${Math.round(file.averageBitrateKbps)} kbps average`
        : `Constant, ${file.frames[0].bitrateKbps} kbps`,
    },
    { label: 'Sample rate', value: `${file.sampleRate.toLocaleString()} Hz` },
    { label: 'Channels', value: CHANNEL_LABELS[file.channelMode] },
    { label: 'Audio frames', value: file.frames.length.toLocaleString() },
    {
      label: 'Frame length',
      value: `${file.frames[0].durationMs.toFixed(2)} ms — a cut lands on one of these boundaries`,
    },
    {
      label: 'Bitrate header',
      value: file.header ? `${file.header.vbr.kind} header present` : 'None',
    },
    {
      label: 'ID3v2 tag',
      value: file.id3v2Size
        ? `${file.id3v2Size.toLocaleString()} bytes at the start`
        : 'None',
    },
    {
      label: 'Trailing tag',
      value: file.trailerSize
        ? `${file.trailerSize.toLocaleString()} bytes after the audio`
        : 'None',
    },
    {
      label: 'CRC protection',
      value: file.frames[0].crcProtected ? 'On' : 'Off',
    },
  ];

  if (file.skippedBytes > 0) {
    rows.push({
      label: 'Bytes outside any frame',
      value: `${file.skippedBytes.toLocaleString()} — skipped when copying`,
    });
  }

  return rows;
}
