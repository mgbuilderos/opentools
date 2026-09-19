/**
 * Reading an MP4's structure, so video can be edited without a codec.
 *
 * **The insight this whole module exists to exploit.** Three of the four things
 * people want from a video tool need no decoding at all:
 *
 * - **Trim** — copy the compressed samples for the range you want. The pixels
 *   are never touched, so there is no quality loss and no encoder.
 * - **Mute** — drop the audio track from the container.
 * - **Extract the audio** — keep the audio track and drop the video.
 *
 * All three are rewriting a filing system, not re-encoding a film. That is the
 * same trick the MP3 toolkit uses on MPEG frames, and it is why this project can
 * offer video editing without shipping a megabyte of WebAssembly, without a
 * patent surface, and without making the output worse than the input.
 *
 * Only turning video into a GIF genuinely needs decoding.
 *
 * **How an MP4 stores its samples**, because nothing about it is guessable. The
 * frames themselves sit in one big `mdat` box with no delimiters — you cannot
 * find a frame by looking at the bytes. Everything you need is in five parallel
 * tables inside `stbl`, and a frame's position is the *product* of them:
 *
 * - `stsz` — how many bytes each sample occupies
 * - `stco` — where each *chunk* begins in the file (`co64` for large files)
 * - `stsc` — how many samples are packed into each chunk
 * - `stts` — how long each sample lasts
 * - `stss` — which samples are keyframes (video only; absent means all are)
 *
 * So to find sample 400 you walk `stsc` to learn which chunk holds it, take
 * that chunk's offset from `stco`, then add the sizes of the samples before it
 * inside that chunk. Get any one of those wrong and you produce a file that
 * looks plausible and plays as garbage.
 *
 * Reading only. Writing is `writer.ts`, and it depends on this being right.
 */

export type TrackKind = 'video' | 'audio' | 'other';

export interface Mp4Sample {
  /** Byte offset in the file where this sample's compressed data begins. */
  offset: number;
  size: number;
  /** Decode timestamp, in the track's own timescale. */
  timestamp: number;
  duration: number;
  /**
   * How far this sample's *presentation* time sits from its decode time.
   *
   * Modern video reorders frames: a B-frame is decoded after the frames it
   * refers to but shown between them, so decode order and display order differ.
   * `ctts` records that difference and **losing it is not cosmetic** — the
   * player shows frames in decode order, and timestamps go backwards. ffmpeg
   * reports it as "non monotonically increasing dts", which is precisely what
   * happened the first time this writer omitted the box.
   *
   * Zero for audio, and for video without reordering.
   */
  compositionOffset: number;
  /**
   * Whether this sample can be decoded without any earlier one. A trim may only
   * begin at one of these: start anywhere else and the first frames reference
   * pixels that were never decoded, which is the smeared mess everyone has seen
   * in a badly cut clip.
   */
  isKeyframe: boolean;
}

export interface Mp4Track {
  id: number;
  kind: TrackKind;
  /** The four-character code of the codec, e.g. `avc1`, `mp4a`, `hvc1`. */
  codec: string;
  /** Ticks per second for this track's timestamps. */
  timescale: number;
  duration: number;
  samples: Mp4Sample[];
  width: number | null;
  height: number | null;
  channels: number | null;
  sampleRate: number | null;
  /**
   * The track's whole `stsd` box, exactly as it appeared in the source.
   *
   * It carries the codec's own configuration — `avcC` for H.264, `esds` for AAC
   * — which a player cannot decode a single frame without, and which is far too
   * codec-specific to be worth understanding. Keeping the bytes means a new file
   * can describe its media exactly as the original did, because these *are* the
   * original's bytes. See `writer.ts`.
   */
  sampleDescription: Uint8Array;
}

export interface Mp4File {
  /** Ticks per second for the presentation as a whole, from `mvhd`. */
  timescale: number;
  durationSeconds: number;
  tracks: Mp4Track[];
}

interface Box {
  type: string;
  /** First byte of the box's payload. */
  body: number;
  /** One past the box's last byte. */
  end: number;
}

function fourcc(bytes: Uint8Array, at: number): string {
  if (at + 4 > bytes.length) return '';
  return String.fromCharCode(
    bytes[at],
    bytes[at + 1],
    bytes[at + 2],
    bytes[at + 3],
  );
}

/**
 * Walks one level of boxes. A box is its size first and its four-character type
 * second — the reverse of RIFF and AIFF, and reading the type at the box start
 * is a mistake this project has already made once, in the audio prober.
 *
 * Every size is clamped to what the file actually contains, because a size
 * field is a claim and a malformed one must not walk off the end of the buffer.
 */
function boxes(
  bytes: Uint8Array,
  view: DataView,
  from: number,
  to: number,
): Box[] {
  const found: Box[] = [];
  let at = from;
  while (at + 8 <= to) {
    let size = view.getUint32(at, false);
    const type = fourcc(bytes, at + 4);
    let body = at + 8;
    if (size === 1) {
      if (at + 16 > to) break;
      size =
        view.getUint32(at + 8, false) * 4_294_967_296 +
        view.getUint32(at + 12, false);
      body = at + 16;
    } else if (size === 0) {
      size = to - at;
    }
    if (size < body - at) break;
    const end = Math.min(to, at + size);
    found.push({ type, body, end });
    if (end <= at) break;
    at = end;
  }
  return found;
}

function find(list: Box[], type: string): Box | undefined {
  return list.find((box) => box.type === type);
}

/** A `stsc` row: from `firstChunk` onward, each chunk holds this many samples. */
interface ChunkRun {
  firstChunk: number;
  samplesPerChunk: number;
}

function readStsc(view: DataView, stbl: Box[]): ChunkRun[] {
  const box = find(stbl, 'stsc');
  if (!box) return [];
  const count = view.getUint32(box.body + 4, false);
  const runs: ChunkRun[] = [];
  for (let index = 0; index < count; index += 1) {
    const at = box.body + 8 + index * 12;
    if (at + 12 > box.end) break;
    runs.push({
      firstChunk: view.getUint32(at, false),
      samplesPerChunk: view.getUint32(at + 4, false),
    });
  }
  return runs;
}

function readChunkOffsets(view: DataView, stbl: Box[]): number[] {
  const small = find(stbl, 'stco');
  const large = find(stbl, 'co64');
  const box = small ?? large;
  if (!box) return [];
  const count = view.getUint32(box.body + 4, false);
  const offsets: number[] = [];
  for (let index = 0; index < count; index += 1) {
    if (small) {
      const at = box.body + 8 + index * 4;
      if (at + 4 > box.end) break;
      offsets.push(view.getUint32(at, false));
    } else {
      const at = box.body + 8 + index * 8;
      if (at + 8 > box.end) break;
      // A 64-bit offset assembled by multiplication: shifts wrap at 32 bits.
      offsets.push(
        view.getUint32(at, false) * 4_294_967_296 +
          view.getUint32(at + 4, false),
      );
    }
  }
  return offsets;
}

function readSampleSizes(view: DataView, stbl: Box[]): number[] {
  const box = find(stbl, 'stsz');
  if (!box) return [];
  const uniform = view.getUint32(box.body + 4, false);
  const count = view.getUint32(box.body + 8, false);
  // A non-zero size means every sample is that size and no table follows —
  // common for uncompressed audio and easy to miss.
  if (uniform !== 0) return Array.from({ length: count }, () => uniform);
  const sizes: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const at = box.body + 12 + index * 4;
    if (at + 4 > box.end) break;
    sizes.push(view.getUint32(at, false));
  }
  return sizes;
}

/** Expands `stts`'s run-length encoding into one duration per sample. */
function readDurations(view: DataView, stbl: Box[], total: number): number[] {
  const box = find(stbl, 'stts');
  const durations: number[] = [];
  if (!box) return Array.from({ length: total }, () => 0);
  const count = view.getUint32(box.body + 4, false);
  for (let index = 0; index < count; index += 1) {
    const at = box.body + 8 + index * 8;
    if (at + 8 > box.end) break;
    const runLength = view.getUint32(at, false);
    const delta = view.getUint32(at + 4, false);
    for (let n = 0; n < runLength && durations.length < total; n += 1) {
      durations.push(delta);
    }
  }
  while (durations.length < total)
    durations.push(durations[durations.length - 1] ?? 0);
  return durations;
}

/**
 * Expands `ctts` into one composition offset per sample.
 *
 * Version 0 stores unsigned offsets, version 1 signed — a negative offset lets
 * an encoder avoid shifting the whole timeline, and reading it as unsigned turns
 * a small negative into roughly four billion.
 */
function readCompositionOffsets(
  view: DataView,
  stbl: Box[],
  total: number,
): number[] {
  const box = find(stbl, 'ctts');
  if (!box) return Array.from({ length: total }, () => 0);
  const version = view.getUint8(box.body);
  const count = view.getUint32(box.body + 4, false);
  const offsets: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const at = box.body + 8 + index * 8;
    if (at + 8 > box.end) break;
    const runLength = view.getUint32(at, false);
    const offset =
      version === 1
        ? view.getInt32(at + 4, false)
        : view.getUint32(at + 4, false);
    for (let n = 0; n < runLength && offsets.length < total; n += 1)
      offsets.push(offset);
  }
  while (offsets.length < total) offsets.push(0);
  return offsets;
}

/** Sample numbers that are keyframes. An absent `stss` means every sample is. */
function readSyncSamples(view: DataView, stbl: Box[]): Set<number> | null {
  const box = find(stbl, 'stss');
  if (!box) return null;
  const count = view.getUint32(box.body + 4, false);
  const sync = new Set<number>();
  for (let index = 0; index < count; index += 1) {
    const at = box.body + 8 + index * 4;
    if (at + 4 > box.end) break;
    sync.add(view.getUint32(at, false));
  }
  return sync;
}

/**
 * Turns the five tables into one flat list of samples.
 *
 * This is where a mistake becomes a file that plays as garbage, so the walk is
 * written out plainly rather than cleverly: step through chunks in order, and
 * for each chunk lay its samples end to end from the chunk's own offset.
 */
function buildSamples(
  sizes: number[],
  durations: number[],
  composition: number[],
  chunkOffsets: number[],
  runs: ChunkRun[],
  sync: Set<number> | null,
): Mp4Sample[] {
  const samples: Mp4Sample[] = [];
  let sampleIndex = 0;
  let timestamp = 0;

  for (
    let chunk = 1;
    chunk <= chunkOffsets.length && sampleIndex < sizes.length;
    chunk += 1
  ) {
    // The last run that has started covers this chunk.
    let perChunk = runs.length ? runs[0].samplesPerChunk : 0;
    for (const run of runs) {
      if (run.firstChunk <= chunk) perChunk = run.samplesPerChunk;
      else break;
    }

    let offset = chunkOffsets[chunk - 1];
    for (let n = 0; n < perChunk && sampleIndex < sizes.length; n += 1) {
      const size = sizes[sampleIndex];
      const duration = durations[sampleIndex] ?? 0;
      samples.push({
        offset,
        size,
        timestamp,
        duration,
        compositionOffset: composition[sampleIndex] ?? 0,
        // `stss` counts samples from 1, not 0.
        isKeyframe: sync === null || sync.has(sampleIndex + 1),
      });
      offset += size;
      timestamp += duration;
      sampleIndex += 1;
    }
  }
  return samples;
}

function readTrack(
  bytes: Uint8Array,
  view: DataView,
  trak: Box,
): Mp4Track | null {
  const inside = boxes(bytes, view, trak.body, trak.end);
  const tkhd = find(inside, 'tkhd');
  const mdia = find(inside, 'mdia');
  if (!mdia) return null;

  const mdiaBoxes = boxes(bytes, view, mdia.body, mdia.end);
  const mdhd = find(mdiaBoxes, 'mdhd');
  const hdlr = find(mdiaBoxes, 'hdlr');
  const minf = find(mdiaBoxes, 'minf');
  if (!mdhd || !minf) return null;

  const mdhdVersion = bytes[mdhd.body];
  const timescaleAt = mdhdVersion === 1 ? mdhd.body + 20 : mdhd.body + 12;
  const timescale = view.getUint32(timescaleAt, false);
  const duration =
    mdhdVersion === 1
      ? view.getUint32(timescaleAt + 4, false) * 4_294_967_296 +
        view.getUint32(timescaleAt + 8, false)
      : view.getUint32(timescaleAt + 4, false);

  const handler = hdlr ? fourcc(bytes, hdlr.body + 8) : '';
  const kind: TrackKind =
    handler === 'vide' ? 'video' : handler === 'soun' ? 'audio' : 'other';

  const stblBox = find(boxes(bytes, view, minf.body, minf.end), 'stbl');
  if (!stblBox) return null;
  const stbl = boxes(bytes, view, stblBox.body, stblBox.end);

  let codec = '';
  let width: number | null = null;
  let height: number | null = null;
  let channels: number | null = null;
  let sampleRate: number | null = null;

  const stsd = find(stbl, 'stsd');
  let sampleDescription = new Uint8Array(0);
  if (stsd) {
    // From the box's length field to its last byte: the whole box, copied.
    sampleDescription = bytes.slice(stsd.body - 8, stsd.end);
    // version+flags (4) then entryCount (4), then the first sample entry.
    const entry = stsd.body + 8;
    codec = fourcc(bytes, entry + 4);
    if (kind === 'video' && entry + 36 <= stsd.end) {
      width = view.getUint16(entry + 32, false);
      height = view.getUint16(entry + 34, false);
    } else if (kind === 'audio' && entry + 36 <= stsd.end) {
      channels = view.getUint16(entry + 24, false);
      // A 16.16 fixed-point rate; the integer half is all that is needed, and
      // `mdhd`'s timescale is the authority for rates above 65,535 anyway.
      sampleRate = view.getUint16(entry + 32, false) || timescale;
    }
  }

  const sizes = readSampleSizes(view, stbl);
  const samples = buildSamples(
    sizes,
    readDurations(view, stbl, sizes.length),
    readCompositionOffsets(view, stbl, sizes.length),
    readChunkOffsets(view, stbl),
    readStsc(view, stbl),
    readSyncSamples(view, stbl),
  );

  return {
    id: tkhd
      ? view.getUint32(
          bytes[tkhd.body] === 1 ? tkhd.body + 20 : tkhd.body + 12,
          false,
        )
      : 0,
    kind,
    codec,
    timescale,
    duration,
    samples,
    width,
    height,
    channels,
    sampleRate,
    sampleDescription,
  };
}

export function readMp4(input: Uint8Array): Mp4File {
  if (input.length < 16)
    throw new Error('This file is too small to be an MP4.');
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);

  // Name the format rather than saying "not an MP4" to a real video file. WebM
  // and Matroska are EBML, a completely different container with no box tree and
  // no sample tables, so nothing here could read them.
  if (
    input[0] === 0x1a &&
    input[1] === 0x45 &&
    input[2] === 0xdf &&
    input[3] === 0xa3
  ) {
    throw new Error(
      'This is a WebM or Matroska file. It stores its index in a different format entirely, so this page cannot read it — MP4 and MOV only.',
    );
  }
  if (fourcc(input, 4) !== 'ftyp') {
    throw new Error('This is not an MP4 or MOV file.');
  }

  const top = boxes(input, view, 0, input.length);
  const moov = find(top, 'moov');
  if (!moov) {
    throw new Error(
      'This MP4 has no index, so its frames cannot be located. A file still being written, or one truncated mid-upload, looks like this.',
    );
  }

  const moovBoxes = boxes(input, view, moov.body, moov.end);
  const mvhd = find(moovBoxes, 'mvhd');
  let timescale = 1000;
  let durationSeconds = 0;
  if (mvhd) {
    const version = input[mvhd.body];
    const at = version === 1 ? mvhd.body + 20 : mvhd.body + 12;
    timescale = view.getUint32(at, false) || 1000;
    const duration =
      version === 1
        ? view.getUint32(at + 4, false) * 4_294_967_296 +
          view.getUint32(at + 8, false)
        : view.getUint32(at + 4, false);
    durationSeconds = duration / timescale;
  }

  const tracks: Mp4Track[] = [];
  for (const trak of moovBoxes.filter((box) => box.type === 'trak')) {
    const track = readTrack(input, view, trak);
    if (track) tracks.push(track);
  }
  if (!tracks.length)
    throw new Error('This MP4 contains no tracks this page can read.');

  return { timescale, durationSeconds, tracks };
}

/**
 * The last keyframe at or before `seconds` — where a trim has to begin.
 *
 * Cutting anywhere else means the opening frames refer to pixels that were
 * never decoded. The honest thing is to move the cut and say so, which is what
 * the MP3 toolkit does with frame boundaries.
 */
export function keyframeAtOrBefore(
  track: Mp4Track,
  seconds: number,
): Mp4Sample | null {
  const ticks = seconds * track.timescale;
  let best: Mp4Sample | null = null;
  for (const sample of track.samples) {
    if (sample.timestamp > ticks) break;
    if (sample.isKeyframe) best = sample;
  }
  return best ?? track.samples.find((sample) => sample.isKeyframe) ?? null;
}
