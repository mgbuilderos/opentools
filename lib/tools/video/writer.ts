/**
 * Writing an MP4 from samples copied out of another one.
 *
 * This is the half of the trick that makes codec-free video editing possible.
 * `mp4.ts` finds where each compressed frame lives; this file writes a new
 * container around a chosen subset of them. The frames themselves are copied
 * byte for byte and never decoded, so:
 *
 * - there is no quality loss, because nothing is re-encoded
 * - there is no encoder, so no patent surface and no WebAssembly payload
 * - it runs at the speed of a memory copy rather than of a video encoder
 *
 * **The one trick worth knowing.** A player cannot decode H.264 or AAC without
 * the codec's configuration — the `avcC` or `esds` blob that carries the SPS and
 * PPS. That blob lives inside `stsd`, it is codec-specific, and understanding it
 * would be a project of its own. So it is never parsed: the whole `stsd` box is
 * **copied verbatim** from the source file. The output describes its audio and
 * video exactly as the input did, because those bytes are the input's.
 *
 * Only the tables whose values genuinely change are rebuilt: which samples
 * exist, how long they last, and where they now sit.
 *
 * **Layout.** Everything goes in a single chunk per track, which makes `stsc`
 * one row and `stco` one offset. Real encoders interleave many small chunks so a
 * player can stream without seeking; that matters for a 4 GB film over a
 * network, and not at all for a file already sitting on the reader's disk.
 */

import type { Mp4File, Mp4Sample, Mp4Track } from './mp4';

const NOW = 0;

function fourccBytes(text: string): number[] {
  return [
    text.charCodeAt(0),
    text.charCodeAt(1),
    text.charCodeAt(2),
    text.charCodeAt(3),
  ];
}

function u32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function u16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function u64(value: number): number[] {
  const high = Math.floor(value / 4_294_967_296);
  const low = value >>> 0;
  return [...u32(high), ...u32(low)];
}

/** A box is its length, then its type, then its payload. */
function box(type: string, ...parts: (number[] | Uint8Array)[]): Uint8Array {
  let length = 8;
  for (const part of parts) length += part.length;
  const out = new Uint8Array(length);
  out.set(u32(length), 0);
  out.set(fourccBytes(type), 4);
  let at = 8;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** The identity transform, as a 3x3 fixed-point matrix. */
export const UNITY_MATRIX = [
  ...u32(0x00010000),
  ...u32(0),
  ...u32(0),
  ...u32(0),
  ...u32(0x00010000),
  ...u32(0),
  ...u32(0),
  ...u32(0),
  ...u32(0x40000000),
];

/** Run-length encodes per-sample durations back into an `stts` table. */
function timeToSample(samples: Mp4Sample[]): Uint8Array {
  const runs: { count: number; delta: number }[] = [];
  for (const sample of samples) {
    const last = runs[runs.length - 1];
    if (last && last.delta === sample.duration) last.count += 1;
    else runs.push({ count: 1, delta: sample.duration });
  }
  const body = [...u32(0), ...u32(runs.length)];
  for (const run of runs) body.push(...u32(run.count), ...u32(run.delta));
  return box('stts', body);
}

/**
 * Rebuilds `ctts` from the samples' composition offsets.
 *
 * Omitted when every offset is zero, which is the common case and what audio
 * always looks like. Written as version 0 unless an offset is negative, since
 * only version 1 can carry a signed one.
 */
function compositionOffsets(samples: Mp4Sample[]): Uint8Array | null {
  if (samples.every((sample) => sample.compositionOffset === 0)) return null;
  const runs: { count: number; offset: number }[] = [];
  for (const sample of samples) {
    const last = runs[runs.length - 1];
    if (last && last.offset === sample.compositionOffset) last.count += 1;
    else runs.push({ count: 1, offset: sample.compositionOffset });
  }
  const signed = runs.some((run) => run.offset < 0);
  const body = [...u32(signed ? 0x01000000 : 0), ...u32(runs.length)];
  for (const run of runs) {
    body.push(
      ...u32(run.count),
      ...u32(run.offset < 0 ? run.offset + 0x100000000 : run.offset),
    );
  }
  return box('ctts', body);
}

function sampleSizes(samples: Mp4Sample[]): Uint8Array {
  const uniform =
    samples.length > 0 && samples.every((s) => s.size === samples[0].size);
  if (uniform) {
    // One size for all of them, and no table — the same shortcut uncompressed
    // audio uses, and a third of the bytes for a PCM track.
    return box('stsz', [
      ...u32(0),
      ...u32(samples[0].size),
      ...u32(samples.length),
    ]);
  }
  const body = [...u32(0), ...u32(0), ...u32(samples.length)];
  for (const sample of samples) body.push(...u32(sample.size));
  return box('stsz', body);
}

/** Sample numbers that are keyframes, counted from 1. Omitted when all are. */
function syncSamples(samples: Mp4Sample[]): Uint8Array | null {
  const keyframes: number[] = [];
  samples.forEach((sample, index) => {
    if (sample.isKeyframe) keyframes.push(index + 1);
  });
  if (keyframes.length === samples.length) return null;
  const body = [...u32(0), ...u32(keyframes.length)];
  for (const number of keyframes) body.push(...u32(number));
  return box('stss', body);
}

function mediaHeader(track: Mp4Track, duration: number): Uint8Array {
  return box('mdhd', [
    ...u32(0),
    ...u32(NOW),
    ...u32(NOW),
    ...u32(track.timescale),
    ...u32(duration),
    // 'und' packed as five-bit offsets from 0x60, plus a predefined zero.
    ...u16(0x55c4),
    ...u16(0),
  ]);
}

function handler(track: Mp4Track): Uint8Array {
  const code =
    track.kind === 'video' ? 'vide' : track.kind === 'audio' ? 'soun' : 'hint';
  const name = `${track.kind}\0`;
  const nameBytes = new Uint8Array(name.length);
  for (let index = 0; index < name.length; index += 1)
    nameBytes[index] = name.charCodeAt(index);
  return box(
    'hdlr',
    [
      ...u32(0),
      ...u32(0),
      ...fourccBytes(code),
      ...Array.from({ length: 12 }, () => 0),
    ],
    nameBytes,
  );
}

/** Says the media is in this same file, which is the only case here. */
function dataInformation(): Uint8Array {
  return box(
    'dinf',
    box('dref', [...u32(0), ...u32(1)], box('url ', [...u32(1)])),
  );
}

export interface TrackPlan {
  track: Mp4Track;
  samples: Mp4Sample[];
  /** The source file's `stsd` box, copied whole — see the note at the top. */
  sampleDescription: Uint8Array;
}

function trackBox(
  plan: TrackPlan,
  movieTimescale: number,
  chunkOffset: number,
): Uint8Array {
  const { track, samples } = plan;
  const mediaDuration = samples.reduce(
    (sum, sample) => sum + sample.duration,
    0,
  );
  const movieDuration = Math.round(
    (mediaDuration / track.timescale) * movieTimescale,
  );

  const header = box('tkhd', [
    ...u32(0x00000003), // enabled, and part of the presentation
    ...u32(NOW),
    ...u32(NOW),
    ...u32(track.id),
    ...u32(0),
    ...u32(movieDuration),
    ...Array.from({ length: 8 }, () => 0),
    ...u16(0), // layer
    ...u16(0), // alternate group
    ...u16(track.kind === 'audio' ? 0x0100 : 0), // full volume for audio only
    ...u16(0),
    ...(plan.track.matrix ? Array.from(plan.track.matrix) : UNITY_MATRIX),
    ...u32((track.width ?? 0) << 16),
    ...u32((track.height ?? 0) << 16),
  ]);

  const mediaInformationHeader =
    track.kind === 'video'
      ? box('vmhd', [
          ...u32(0x00000001),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u16(0),
        ])
      : box('smhd', [...u32(0), ...u16(0), ...u16(0)]);

  const sync = syncSamples(samples);
  const composition = compositionOffsets(samples);
  const table = box(
    'stbl',
    plan.sampleDescription,
    timeToSample(samples),
    ...(composition ? [composition] : []),
    // One chunk holding every sample: first chunk 1, all samples, description 1.
    box('stsc', [
      ...u32(0),
      ...u32(1),
      ...u32(1),
      ...u32(samples.length),
      ...u32(1),
    ]),
    sampleSizes(samples),
    chunkOffset >= 0x100000000
      ? box('co64', [...u32(0), ...u32(1), ...u64(chunkOffset)])
      : box('stco', [...u32(0), ...u32(1), ...u32(chunkOffset)]),
    ...(sync ? [sync] : []),
  );

  return box(
    'trak',
    header,
    box(
      'mdia',
      mediaHeader(track, mediaDuration),
      handler(track),
      box('minf', mediaInformationHeader, dataInformation(), table),
    ),
  );
}

/**
 * Builds a new MP4 containing exactly the samples in `plans`.
 *
 * The header has to state where the sample data begins, and the header's own
 * length depends on how many samples there are — so the whole `moov` is built
 * once against a provisional offset, measured, then rebuilt against the real
 * one. Two passes is the honest way; guessing a header size and padding it is
 * how files end up with a mysterious run of zeroes in them.
 */
import type { ByteSource } from './source';

export interface WriteOptions {
  /** Target container brand. Default 'mp4' (or 'm4a' for audio-only). */
  format?: 'mp4' | 'mov' | 'm4a';
}

function buildFtyp(format?: 'mp4' | 'mov' | 'm4a'): Uint8Array {
  if (format === 'mov') {
    return box('ftyp', fourccBytes('qt  '), u32(0x200), fourccBytes('qt  '));
  }
  if (format === 'm4a') {
    return box(
      'ftyp',
      fourccBytes('M4A '),
      u32(0),
      fourccBytes('M4A '),
      fourccBytes('mp42'),
      fourccBytes('isom'),
    );
  }
  return box('ftyp', [
    ...fourccBytes('isom'),
    ...u32(0x200),
    ...fourccBytes('isom'),
    ...fourccBytes('iso2'),
    ...fourccBytes('avc1'),
    ...fourccBytes('mp41'),
  ]);
}

function buildMdatHeader(payloadLength: number): Uint8Array {
  const isLarge = payloadLength + 8 >= 0x100000000;
  if (isLarge) {
    const header = new Uint8Array(16);
    header.set(u32(1), 0);
    header.set(fourccBytes('mdat'), 4);
    const total = 16 + payloadLength;
    const view = new DataView(header.buffer);
    view.setUint32(8, Math.floor(total / 4_294_967_296), false);
    view.setUint32(12, total >>> 0, false);
    return header;
  }
  const header = new Uint8Array(8);
  header.set(u32(8 + payloadLength), 0);
  header.set(fourccBytes('mdat'), 4);
  return header;
}

/**
 * Builds a new MP4 containing exactly the samples in `plans`.
 *
 * The header has to state where the sample data begins, and the header's own
 * length depends on how many samples there are — so the whole `moov` is built
 * once against a provisional offset, measured, then rebuilt against the real
 * one. Two passes is the honest way; guessing a header size and padding it is
 * how files end up with a mysterious run of zeroes in them.
 */
export function writeMp4(
  source: Uint8Array,
  plans: TrackPlan[],
  movie: Mp4File,
  options?: WriteOptions,
): Uint8Array {
  if (!plans.length) throw new Error('There are no tracks to write.');
  for (const plan of plans) {
    if (!plan.samples.length) {
      throw new Error(
        `The ${plan.track.kind} track has no frames in the range chosen.`,
      );
    }
  }

  const ftyp = buildFtyp(options?.format);

  const longest = Math.max(
    ...plans.map(
      (plan) =>
        plan.samples.reduce((sum, sample) => sum + sample.duration, 0) /
        plan.track.timescale,
    ),
  );
  const movieDuration = Math.round(longest * movie.timescale);

  const header = box('mvhd', [
    ...u32(0),
    ...u32(NOW),
    ...u32(NOW),
    ...u32(movie.timescale),
    ...u32(movieDuration),
    ...u32(0x00010000), // normal rate
    ...u16(0x0100), // full volume
    ...Array.from({ length: 10 }, () => 0),
    ...UNITY_MATRIX,
    ...Array.from({ length: 24 }, () => 0),
    ...u32(Math.max(...plans.map((plan) => plan.track.id)) + 1),
  ]);

  const build = (chunkStart: number) =>
    box(
      'moov',
      header,
      ...plans.map((plan, index) => {
        let offset = chunkStart;
        for (let earlier = 0; earlier < index; earlier += 1) {
          offset += plans[earlier].samples.reduce(
            (sum, sample) => sum + sample.size,
            0,
          );
        }
        return trackBox(plan, movie.timescale, offset);
      }),
    );

  const payloadLength = plans.reduce(
    (sum, plan) =>
      sum + plan.samples.reduce((inner, sample) => inner + sample.size, 0),
    0,
  );
  const mdatHeader = buildMdatHeader(payloadLength);

  // First pass measures; second pass is correct.
  const provisional = build(0);
  const dataStart = ftyp.length + provisional.length + mdatHeader.length;
  const moov = build(dataStart);
  if (moov.length !== provisional.length) {
    throw new Error(
      'The index changed size between passes, so the frame offsets would be wrong.',
    );
  }

  const mdat = new Uint8Array(mdatHeader.length + payloadLength);
  mdat.set(mdatHeader, 0);
  let at = mdatHeader.length;
  for (const plan of plans) {
    for (const sample of plan.samples) {
      mdat.set(source.subarray(sample.offset, sample.offset + sample.size), at);
      at += sample.size;
    }
  }

  return concat([ftyp, moov, mdat]);
}

/**
 * Builds an MP4/MOV Blob directly from a ByteSource without loading the entire
 * file into memory. Ideal for multi-gigabyte video files in the browser.
 */
export async function writeMp4Source(
  source: ByteSource,
  plans: TrackPlan[],
  movie: Mp4File,
  options?: WriteOptions,
): Promise<{ blob: Blob; size: number }> {
  if (!plans.length) throw new Error('There are no tracks to write.');
  for (const plan of plans) {
    if (!plan.samples.length) {
      throw new Error(
        `The ${plan.track.kind} track has no frames in the range chosen.`,
      );
    }
  }

  const ftyp = buildFtyp(options?.format);

  const longest = Math.max(
    ...plans.map(
      (plan) =>
        plan.samples.reduce((sum, sample) => sum + sample.duration, 0) /
        plan.track.timescale,
    ),
  );
  const movieDuration = Math.round(longest * movie.timescale);

  const header = box('mvhd', [
    ...u32(0),
    ...u32(NOW),
    ...u32(NOW),
    ...u32(movie.timescale),
    ...u32(movieDuration),
    ...u32(0x00010000), // normal rate
    ...u16(0x0100), // full volume
    ...Array.from({ length: 10 }, () => 0),
    ...UNITY_MATRIX,
    ...Array.from({ length: 24 }, () => 0),
    ...u32(Math.max(...plans.map((plan) => plan.track.id)) + 1),
  ]);

  const build = (chunkStart: number) =>
    box(
      'moov',
      header,
      ...plans.map((plan, index) => {
        let offset = chunkStart;
        for (let earlier = 0; earlier < index; earlier += 1) {
          offset += plans[earlier].samples.reduce(
            (sum, sample) => sum + sample.size,
            0,
          );
        }
        return trackBox(plan, movie.timescale, offset);
      }),
    );

  const payloadLength = plans.reduce(
    (sum, plan) =>
      sum + plan.samples.reduce((inner, sample) => inner + sample.size, 0),
    0,
  );
  const mdatHeader = buildMdatHeader(payloadLength);

  const provisional = build(0);
  const dataStart = ftyp.length + provisional.length + mdatHeader.length;
  const moov = build(dataStart);
  if (moov.length !== provisional.length) {
    throw new Error(
      'The index changed size between passes, so the frame offsets would be wrong.',
    );
  }

  const ranges: { source: ByteSource; start: number; end: number }[] = [];
  for (const plan of plans) {
    for (const sample of plan.samples) {
      const sampleSource = sample.source ?? source;
      const last = ranges[ranges.length - 1];
      if (last && last.source === sampleSource && last.end === sample.offset) {
        last.end += sample.size;
      } else {
        ranges.push({
          source: sampleSource,
          start: sample.offset,
          end: sample.offset + sample.size,
        });
      }
    }
  }

  const parts: (BlobPart | Uint8Array)[] = [ftyp, moov, mdatHeader];
  for (const range of ranges) {
    if (range.source.sliceBlob) {
      parts.push(range.source.sliceBlob(range.start, range.end));
    } else {
      parts.push(await range.source.slice(range.start, range.end));
    }
  }

  const isAudioOnly = plans.length === 1 && plans[0].track.kind === 'audio';
  const mime =
    options?.format === 'mov'
      ? 'video/quicktime'
      : options?.format === 'm4a' || isAudioOnly
        ? 'audio/mp4'
        : 'video/mp4';

  const blob = new Blob(parts as BlobPart[], { type: mime });
  return {
    blob,
    size: ftyp.length + moov.length + mdatHeader.length + payloadLength,
  };
}
