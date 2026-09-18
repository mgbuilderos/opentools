# Audio → WAV conversion

`/audio/convert`. Built 2026-09-19 on branch `claude/audio-convert`, worktree
`apps/claude-archive`, off `origin/main` `5e952a8`.

This is T2 on `CTO_TOOL_ROADMAP.md`. Read this before changing anything under
`lib/tools/audio/{wav,pcm,probe,decode}.ts`.

---

## What it does

Takes an audio file, decodes it with the decoders the browser already carries,
and writes a WAV. On the way through it can trim, fold to mono or pick one
channel, change the sample rate, fade, and normalise the peak.

## Why the output is WAV, and why that is not a limitation being hidden

There is **no MP3 encoder in this project and there will not be one** unless the
owner decides otherwise. A license-clean encoder is not something that can be
shipped casually, and a WebAssembly one would be roughly a megabyte of
dependency to produce output *worse* than the input. Re-encoding lossy audio to
another lossy format always loses something.

So the honest conversion is to WAV: uncompressed, universally readable, and
lossless with respect to whatever the browser decoded. **The page says this
outright**, in the box under the file picker, and `e2e/audio-convert.spec.ts`
has a test that fails if that sentence disappears.

---

## The trap this tool is built around

`decodeAudioData` **resamples its output to the sample rate of the
`AudioContext` it was called on, and says nothing about having done so.**

Decode a 44,100 Hz recording on a 48,000 Hz context and you get a 48,000 Hz
result. Nothing in the returned `AudioBuffer` records that this happened — the
original rate is simply gone. A converter written the obvious way
(`new AudioContext()` then `decodeAudioData`) silently resamples every file it
touches, and would then be free to call its output lossless.

**The fix is `lib/tools/audio/probe.ts`:** the sample rate is read out of the
file's own header first, and the `OfflineAudioContext` is built at that rate.
Nothing is resampled unless the person asks for it. When the decoded rate ends
up different anyway — Opus always decodes at 48 kHz, some containers do not
expose a rate without decoding — `DecodeResult.resampledFrom` carries the
declared rate and **the page displays the discrepancy** rather than hiding it.

If you touch `decode.ts`, keep that property. It is the difference between this
tool and the obvious version of it.

---

## The four modules

| File | Pure? | What it holds |
|---|---|---|
| `wav.ts` | yes | RIFF reader and writer. 8/16/24/32-bit integer and 32/64-bit float in; 16/24-bit integer and 32-bit float out. |
| `pcm.ts` | yes | trim, mono downmix, channel pick, peak measure, normalise, gain, fade. |
| `probe.ts` | yes | container and sample-rate detection from headers. |
| `decode.ts` | **no** | the only browser-dependent file: `OfflineAudioContext` decode and resample. |

Keeping the first three pure is what makes 74 unit tests possible without a
browser. Do not move browser APIs into them.

### Traps already handled, each pinned by a test

- **8-bit WAV samples are unsigned**, centred on 128. Every wider integer depth
  is signed. Reading 8-bit as signed gives a loud buzz.
- **RIFF chunks are padded to an even boundary.** A 5-byte `LIST` chunk occupies
  6. Skipping only 5 misaligns every chunk after it, including the audio.
- **Every length in a file is a claim, not a fact.** A `data` chunk can say it
  holds 4 GB inside a 2 KB file. All sizes are clamped to what is present;
  `DecodedWav.truncated` records when one lied.
- **MP4 boxes are size-then-type**, the reverse of RIFF and AIFF. Reading the
  type at the box start gets four bytes of the size and matches nothing. *This
  was a real bug during the build — it made every M4A report "unrecognised" —
  and it was caught only because the tests assert `ffprobe`'s answer rather than
  this code's answer.*
- **FLAC's STREAMINFO is a bit field**, not a byte layout: the sample rate is 20
  bits starting partway through byte 10.
- **AIFF stores its sample rate as an 80-bit float**, a type JavaScript does not
  have. Assembled by hand in `readExtendedFloat`.
- **Opus always decodes at 48 kHz** whatever it was recorded at. The rate in
  `OpusHead` is the *original* and does not control playback.
- **Full-scale positive cannot round-trip** through integer PCM: +1.0 comes back
  one step short. That is the format, not a bug, and there is a test saying so.

---

## The fixtures, and why they come from ffmpeg

`lib/tools/audio/__fixtures__/tone-*` — ten files, each a **440 Hz sine of
exactly 0.1 seconds at exactly 0.8 of full scale**, written by ffmpeg.

They are generated, not hand-built, on purpose. **A test that builds its own
fixture with the same assumptions as the reader will agree with a reader that is
wrong.** These come from a different program, and what the tests assert is
arithmetic that was true before either program existed: 440 cycles a second
means 44 cycles in a tenth of a second, whichever tool wrote the file.

Regenerate with (note `aevalsrc`, not `sine` — `sine` defaults to 0.125
amplitude and `-ac 2` adds a −3 dB upmix, so neither number is stated anywhere):

```bash
M="aevalsrc=0.8*sin(2*PI*440*t):d=0.1"
S="aevalsrc=0.8*sin(2*PI*440*t)|0.8*sin(2*PI*440*t):d=0.1:c=stereo"
ffmpeg -y -f lavfi -i "${S}:s=44100" -c:a pcm_s16le tone-44k-stereo-s16.wav
ffmpeg -y -f lavfi -i "${M}:s=48000" -c:a pcm_f32le tone-48k-mono-f32.wav
ffmpeg -y -f lavfi -i "${M}:s=8000"  -c:a pcm_u8    tone-8k-mono-u8.wav
ffmpeg -y -f lavfi -i "${M}:s=44100" -c:a pcm_s24le tone-44k-mono-s24.wav
ffmpeg -y -f lavfi -i "${S}:s=44100" -c:a flac -compression_level 0 tone-44k-stereo.flac
ffmpeg -y -f lavfi -i "${S}:s=44100" -c:a vorbis -strict -2 -q:a 3 tone-44k-stereo.ogg
ffmpeg -y -f lavfi -i "${M}:s=48000" -c:a libopus -b:a 32k tone-48k-mono.opus
ffmpeg -y -f lavfi -i "${S}:s=44100" -c:a aac -b:a 64k tone-44k-stereo.m4a
ffmpeg -y -f lavfi -i "${M}:s=22050" -c:a pcm_s16be tone-22k-mono.aiff
ffmpeg -y -f lavfi -i "${S}:s=44100" -c:a alac tone-44k-stereo-alac.m4a
```

**The FLAC and ALAC fixtures are 24-bit, not 16.** `ffprobe -show_entries
stream=bits_per_sample` says so; an early test expectation of 16 was wrong and
was corrected against ffprobe, not against this code.

---

## What is verified, and how

- **74 unit tests** across `wav.test.ts` (19), `probe.test.ts` (22),
  `pcm.test.ts` (33).
- **12 browser tests** in `e2e/audio-convert.spec.ts`, green in **Chromium and
  WebKit**. They decode the downloaded file with `decodeWav` and count frames —
  0.04 s at 44,100 Hz is 1,764 frames — rather than reading labels off screen.
- **Mutation-checked.** Three deliberate bugs were introduced and each turned
  the suite red: 8-bit read as signed (1 failure), chunk padding dropped
  (1 failure), 24-bit sign extension removed (2 failures).
- **Verified against an independent program.** WAVs written by `encodeWav` were
  read back by `ffprobe`, which reported the right codec, rate, channels, bit
  depth and duration at all three depths; decoding them with `ffmpeg` and
  measuring gave a peak of 0.79999 / 0.80000 / 0.80000 against the 0.8 written.
  **This is the check worth repeating after any change to the writer** — the
  unit tests only prove this code agrees with itself.

---

## Known limits, stated rather than papered over

1. **Which files open depends on the browser, not on this page.** Chromium
   builds without proprietary codecs will refuse AAC and MP3 that Chrome
   accepts. The e2e tests therefore round-trip **WAV and FLAC**, which every
   browser decodes, and the page tells the reader that support varies instead of
   printing a format list it cannot honour.
2. **Peak normalisation is not loudness normalisation.** It matches the loudest
   instant to a ceiling; it does not make two files *sound* equally loud. That
   needs LUFS — a filter bank and a gating algorithm. The page says this in the
   control's own help text.
3. **Input is capped at 100 MB, output at 500 MB.** Decoded audio is float32:
   one minute of 44.1 kHz stereo is about 21 MB in memory and 10.6 MB as a
   16-bit WAV. Past the output cap the tab runs out of memory instead of saving
   a file, so it refuses with a message naming the size.
4. **Mono downmix cancels out-of-phase material.** Averaging a signal with its
   own negative is silence. That is arithmetic, and there is a test for it; the
   page shows the peak after conversion so it is visible when it happens.
5. **No resampling code of our own.** Rate changes go through
   `OfflineAudioContext`, which contains a good resampler. A naive
   nearest-sample implementation aliases audibly; writing a windowed-sinc one
   was not worth it when the browser already has one.

## Not done

- **No waveform display.** It would help trimming considerably and is the
  obvious next addition.
- **Trim times are typed in seconds**, not `mm:ss`. `parseTimecode` in
  `lib/tools/audio/mp3.ts` already parses the friendlier form and could be
  reused.
- **WebM/Matroska and CAF are detected but not parsed**, so their sample rate is
  unknown before decoding and the browser's rate is used. Parsing EBML would fix
  it. Reported as `null` rather than guessed.
