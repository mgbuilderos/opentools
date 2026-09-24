/** Messages between the HEIC decode worker and its caller. */

export interface HeicDecodeRequest {
  /** The HEIC bytes. Transferred, not copied. */
  buffer: ArrayBuffer;
}

export interface HeicDecodeSuccess {
  ok: true;
  /** Raw RGBA, width * height * 4 bytes. Transferred back. */
  pixels: ArrayBuffer;
  width: number;
  height: number;
}

export interface HeicDecodeFailure {
  ok: false;
  /** Already phrased for a reader; the worker never leaks a stack. */
  message: string;
}

export type HeicDecodeResponse = HeicDecodeSuccess | HeicDecodeFailure;

/**
 * Where the decoder binary is served from.
 *
 * SAME-ORIGIN AND SEPARATE, both deliberate. Same-origin because our own CSP
 * allows no other source for a wasm binary (precedent: `public/models/u2netp.onnx`).
 * Separate — rather than the `libheif-bundle.js` build, which embeds the same
 * binary as base64 — because the owner's LGPL-3.0 approval of 2026-09-24 rests on
 * the decoder staying a replaceable artefact. Inlining it would breach that, and
 * the bundled build is also the larger one: 0.66 MB gzipped against 0.45 MB.
 */
export const HEIC_WASM_PATH = '/wasm/libheif.wasm';
