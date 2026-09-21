import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  contentSecurityPolicy,
  loadsLocalModel,
} from './content-security-policy';

const projectRoot = path.resolve(import.meta.dirname, '../..');

describe('content security policy', () => {
  it('blocks every connection and WebAssembly on ordinary routes', () => {
    const policy = contentSecurityPolicy();
    expect(policy).toContain("connect-src 'none'");
    expect(policy).toContain("webrtc 'block'");
    expect(policy).not.toContain('wasm-unsafe-eval');
  });

  it('allows only same-origin assets and WebAssembly for the local model', () => {
    const policy = contentSecurityPolicy({ localModel: true });
    expect(policy).toContain("connect-src 'self';");
    expect(policy).toContain("'wasm-unsafe-eval'");
    expect(policy).toContain("webrtc 'block'");
    expect(policy).not.toMatch(/https?:|\*/u);
  });

  it('scopes the exception to local-model pages and asset workers', () => {
    expect(loadsLocalModel('/image/background-remover')).toBe(true);
    expect(loadsLocalModel('/ocr/worker.min.js')).toBe(true);
    expect(loadsLocalModel('/ocr/core/tesseract-core-lstm.wasm')).toBe(true);
    expect(loadsLocalModel('/image/to-text')).toBe(false);
    expect(loadsLocalModel('/pdf/ocr')).toBe(false);
    expect(loadsLocalModel('/image/editor/')).toBe(true);
    expect(
      loadsLocalModel(
        '/_next/static/workers/background-removal.worker-BT6PDDHJ.js',
      ),
    ).toBe(true);
    expect(loadsLocalModel('/')).toBe(false);
    expect(loadsLocalModel('/pdf/merge')).toBe(false);
    expect(loadsLocalModel('/image/editor-evil')).toBe(false);
    expect(loadsLocalModel('/_next/static/workers/pdf-merge.worker.js')).toBe(
      false,
    );
  });

  it('keeps public/_headers in sync with the generated policies', () => {
    const headers = readFileSync(
      path.join(projectRoot, 'public/_headers'),
      'utf8',
    );
    const policies = [...headers.matchAll(/Content-Security-Policy: (.+)/gu)];
    expect(policies.map((match) => match[1])).toEqual([
      contentSecurityPolicy(),
      contentSecurityPolicy({ localModel: true }),
      contentSecurityPolicy({ localModel: true }),
      contentSecurityPolicy({ localModel: true }),
      contentSecurityPolicy({ localModel: true }),
    ]);
  });
});
