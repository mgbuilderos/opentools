# Video editing without a codec — spike result

Branch `claude/video`, 2026-09-19. **Verdict: it works, for three of the four
operations, with no new dependency.** The tool shipped the same day at
`/video/trim`; this document is the record of *why* the approach was chosen and
what it cannot do.

## The question the spike had to answer

Can this project edit video without shipping a video encoder? An encoder means
either ffmpeg.wasm (rejected on the register: megabytes of payload, a patent
surface, and a licence that fights an MIT repo) or WebCodecs, which is real work
and uneven on iPhone.

## The answer, and why it is better than expected

**Three of the four operations need no codec at all.** They are container
surgery, not transcoding:

| Operation | What it actually is | Codec needed |
|---|---|---|
| **Trim** | copy the compressed frames for the chosen range | none |
| **Mute** | leave the audio track out of the new file | none |
| **Extract audio** | leave the video track out | none |
| **→ GIF** | decode frames, then encode a GIF | yes, decode |

This is the same trick the MP3 toolkit uses on MPEG frames. The frames are copied
byte for byte, so the output is not just lossless — it is **the same bytes**.

## Measured, not assumed

Against `lib/tools/video/__fixtures__/tone-video.mp4` (2s, H.264 160x120 at
15 fps, 30 frames, plus mono AAC, 88 frames, `-g 15` so two keyframes):

| Output | ffprobe | `ffmpeg -f null -` full decode |
|---|---|---|
| copy both tracks | h264 30 frames, aac 88 | clean |
| mute | h264 30 frames | clean |
| audio only | aac 88 frames | clean |
| trim from 1.0s | h264 15 frames, aac 44 | clean |

And the strongest single result: **the trimmed file's first frame decodes to bytes
identical to the original decoded at 1.0s** — same length, same CRC32. Nothing
was re-encoded.

`ffmpeg` is not a dependency of this project, so those checks were run by hand.
**Re-run them after any change to `writer.ts`** — the unit tests only prove the
reader and writer agree with each other.

## The bug the spike caught, which is the reason to spike

The first working version produced files that ffmpeg rejected on all three video
outputs: *"non monotonically increasing dts"*. The audio-only file was fine.

Cause: the writer omitted **`ctts`**. Modern video reorders frames — a B-frame is
decoded after the frames it refers to but displayed between them — and `ctts`
records the gap between decode order and display order. Drop it and the player
shows frames in decode order.

The lesson worth keeping: **the easy track passed throughout.** Testing only the
audio path would have shipped a video tool that plays video wrongly.

## What is in the engine

- `lib/tools/video/mp4.ts` — reads the box tree and combines the five sample
  tables (`stsz`, `stco`/`co64`, `stsc`, `stts`, `stss`, plus `ctts`) into a flat
  list of samples with byte offsets. 15 tests.
- `lib/tools/video/writer.ts` — writes a new MP4 around a chosen subset of those
  samples. 10 tests.

**The one trick to understand before changing either.** A player cannot decode a
frame without the codec's configuration — `avcC` for H.264, `esds` for AAC. That
lives in `stsd`, it is deeply codec-specific, and it is never parsed here: the
whole `stsd` box is **copied verbatim**. The output describes its media exactly
as the input did because those are the input's own bytes.

### Traps already handled, each pinned by a test

- **MP4 boxes are size-then-type**, the reverse of RIFF and AIFF.
- **`stsz` can declare one size for every sample** and then omit the table.
  Mutation testing found this branch untested — removing it left all 12 MP4 tests
  green, because H.264 and AAC both have variable-size frames. The `.mov` fixture
  with PCM audio exists to cover it.
- **`stss` counts samples from 1**, not 0.
- **A trim may only begin at a keyframe.** Anywhere else and the opening frames
  reference pixels that were never decoded. `keyframeAtOrBefore` moves the cut
  back, and the page must say that it did — the same honesty the MP3 cutter
  applies to frame boundaries.
- **`ctts` may be signed** (version 1) or unsigned (version 0).
- **The index states where the frames begin, and its own size depends on how many
  frames there are**, so `writeMp4` builds it twice and refuses if the two passes
  disagree.

## What is not done

*Updated 2026-09-19 after the tool shipped.*

1. ~~No UI.~~ **Shipped** at `/video/trim` — trim, mute and extract-audio, with
   `lib/tools/video/edit.ts` as the pure layer between the engine and the page.
   12 browser tests, green in Chromium and WebKit.
2. **GIF is not started.** It needs real decoding — `VideoDecoder` from WebCodecs
   for the frames, plus a GIF encoder (LZW, writable by hand, a few hundred
   lines). This is the only part that needs WebCodecs, and therefore the only
   part with an iPhone support question. Everything else works anywhere.
3. **Trim only cuts from the start.** Cutting an end is the same filtering with
   an upper bound; the shape is there.
4. **No `edts`/`elst` handling.** An edit list can offset a track's start, and a
   file that uses one will be a frame or two out. iPhone recordings sometimes
   carry one, so this needs checking against a real phone video before launch.
5. **`moov` must be present.** A file still being written has none, and is
   refused by name.
6. **Fragmented MP4 (`moof`) is not supported** — no sample tables to read. Worth
   detecting and naming rather than failing obscurely.

## Recommendation

Build trim, mute and extract-audio as the first video tool. They are done at the
engine level, they need no codec, and they are honestly describable: *"the frames
are copied, not re-encoded, so nothing is lost."*

Leave GIF for a second pass, where the WebCodecs and iPhone questions can be
answered on their own rather than holding up three operations that already work.
