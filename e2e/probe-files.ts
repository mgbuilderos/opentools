/**
 * Probe files, built inside the page.
 *
 * The sweep needs a plausible file for every kind of tool, and committing a
 * binary fixture per format would mean committing files whose provenance has to
 * be stated. These are constructed in the browser instead, from nothing, so
 * there is no provenance question and no personal data can ever be in one.
 *
 * Every probe carries the same distinctive token in its **name**, so a leak can
 * be found by searching request URLs for a string that appears nowhere else on
 * the site. The bytes are deliberately small: the sweep is measuring where bytes
 * go, not how fast a tool is.
 */

/** Appears in every probe filename and nowhere else in the codebase. */
export const PROBE_TOKEN = 'egressweep-4c1d8e';

export type ProbeKind =
  | 'png'
  | 'pdf'
  | 'wav'
  | 'webm'
  | 'text'
  | 'csv'
  | 'eml'
  | 'none';

/**
 * Which probe a route section can accept.
 *
 * `none` is not a gap to be filled quietly — it is recorded and reported.
 * Claiming file-level coverage we did not measure is the one outcome worse than
 * measuring less.
 *
 * Video was `none` in the first draft, on the reasoning that a real encoded
 * video cannot be synthesised in a few lines. That was wrong: the browser has
 * an encoder. `MediaRecorder` over a canvas stream produces a genuinely encoded
 * clip, in whichever container the engine supports, with no fixture to commit
 * and no provenance to state. Twelve video routes moved from load-only to
 * file-level because of it.
 */
export const PROBE_FOR_SECTION: Readonly<Record<string, ProbeKind>> = {
  pdf: 'pdf',
  image: 'png',
  convert: 'png',
  audio: 'wav',
  video: 'webm',
  data: 'csv',
  text: 'text',
  web: 'text',
  developer: 'text',
  documents: 'pdf',
  file: 'png',
  'life-admin': 'png',
  finance: 'csv',
  /*
   * Declared before `/email/reader` exists, deliberately. A new section
   * defaults to `none` and would get a page-load proof while looking, in the
   * report, exactly like a section somebody decided to leave load-only. An
   * email is the most sensitive document most people own, so the decision is
   * recorded here in advance rather than discovered when the route lands.
   */
  email: 'eml',
  subtitles: 'text',
  schema: 'text',
  latex: 'text',
  math: 'none',
  date: 'none',
  bench: 'none',
  // `/batch` runs saved pipelines over whatever you give it, so any real file
  // exercises the intake. Landed after this file was written and caught by the
  // explicit-decision test, which is what that test is for.
  batch: 'png',
};

/**
 * Builds the probe in page context and hands it to the first file input.
 *
 * Returns the filename it used, or null when the page has no file input — which
 * is a fact about the route, not a failure. Several workbench routes take typed
 * text rather than a file.
 */
export const HAND_PROBE_TO_PAGE = (kind: Exclude<ProbeKind, 'none'>, token: string) => {
  const extensionFor: Record<string, string> = {
    text: 'txt',
    webm: 'webm',
    eml: 'eml',
  };
  let name = `${token}.${extensionFor[kind] ?? kind}`;

  function minimalPdf(): Uint8Array {
    // A structurally valid one-page PDF with a correct xref table. Built by
    // hand because a malformed one would be refused by the parser before the
    // tool ever ran, and a refusal proves less than a parse.
    const objects = [
      '<</Type/Catalog/Pages 2 0 R>>',
      '<</Type/Pages/Kids[3 0 R]/Count 1>>',
      '<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Resources<<>>>>',
    ];
    let body = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((object, index) => {
      offsets.push(body.length);
      body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefAt = body.length;
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      body += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`;
    return new TextEncoder().encode(body);
  }

  function silentWav(): Uint8Array {
    // 8 kHz, mono, 16-bit, a tenth of a second. Enough for a decoder to accept.
    const samples = 800;
    const bytes = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(bytes);
    const ascii = (at: number, text: string) => {
      for (let i = 0; i < text.length; i += 1)
        view.setUint8(at + i, text.charCodeAt(i));
    };
    ascii(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    ascii(8, 'WAVE');
    ascii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true);
    view.setUint32(28, 16000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    ascii(36, 'data');
    view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i += 1) {
      // A quiet tone rather than digital silence: some analysers treat an
      // all-zero buffer as an empty file and refuse it before doing any work.
      view.setInt16(44 + i * 2, Math.round(Math.sin(i / 12) * 1200), true);
    }
    return new Uint8Array(bytes);
  }

  async function png(): Promise<Uint8Array> {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 90;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#1B6B47';
    context.fillRect(0, 0, 120, 90);
    context.fillStyle = '#ffffff';
    context.font = '12px monospace';
    context.fillText(token.toUpperCase(), 6, 48);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    return new Uint8Array(await blob!.arrayBuffer());
  }

  async function recordedClip(): Promise<{ bytes: Uint8Array; mime: string }> {
    // A real encoded clip from the browser's own encoder. Half a second of a
    // moving canvas: long enough that the container holds more than a header,
    // short enough that 12 routes do not add a minute to the run.
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const context = canvas.getContext('2d')!;
    const candidates = [
      'video/mp4',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const type =
      candidates.find((candidate) =>
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported(candidate)
          ? true
          : false,
      ) ?? '';
    if (!type) throw new Error('no MediaRecorder container supported');

    const stream = canvas.captureStream(15);
    const recorder = new MediaRecorder(stream, { mimeType: type });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };

    const finished = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();
    const started = performance.now();
    while (performance.now() - started < 500) {
      const t = (performance.now() - started) / 500;
      context.fillStyle = '#1B6B47';
      context.fillRect(0, 0, 160, 120);
      context.fillStyle = '#ffffff';
      context.fillRect(Math.floor(t * 130), 50, 20, 20);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    await finished;

    const blob = new Blob(chunks, { type });
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mime: type,
    };
  }

  return (async () => {
    const input = document.querySelector<HTMLInputElement>('input[type=file]');
    if (!input) return null;

    let bytes: Uint8Array;
    let mime: string;
    if (kind === 'png') {
      bytes = await png();
      mime = 'image/png';
    } else if (kind === 'pdf') {
      bytes = minimalPdf();
      mime = 'application/pdf';
    } else if (kind === 'wav') {
      bytes = silentWav();
      mime = 'audio/wav';
    } else if (kind === 'webm') {
      const clip = await recordedClip();
      bytes = clip.bytes;
      mime = clip.mime;
      // WebKit records MP4, Chromium WebM. A name that disagrees with the bytes
      // is refused by an `accept` filter before the tool ever runs.
      name = `${token}.${clip.mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`;
    } else if (kind === 'eml') {
      // A real RFC 5322 message with a remote image in it. The sweep only
      // asserts that nothing left the device; `email-tracker.spec.ts` is what
      // exercises the full vector list against the rendered document.
      bytes = new TextEncoder().encode(
        [
          'From: sender@example.com',
          'To: reader@example.com',
          `Subject: ${token}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          '',
          `<html><body><p>${token}</p>`,
          '<img src="http://tracker.invalid/pixel.png">',
          '</body></html>',
          '',
        ].join('\r\n'),
      );
      mime = 'message/rfc822';
    } else if (kind === 'csv') {
      bytes = new TextEncoder().encode(
        `name,amount\n${token},1234.56\nsecond,7,89\n`,
      );
      mime = 'text/csv';
    } else {
      bytes = new TextEncoder().encode(`${token}\nprobe line two\n`);
      mime = 'text/plain';
    }

    const file = new File([bytes as unknown as BlobPart], name, { type: mime });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return name;
  })();
};
