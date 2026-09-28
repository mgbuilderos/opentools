import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseHeaderRules } from '../scripts/lib/headers-policy.mjs';
import {
  IMMUTABLE_ASSET_VERSIONS,
  immutableAssetUrl,
  type ImmutableAssetPath,
} from './immutable-assets';

/**
 * `public/_headers` promises a year and `immutable` for `/ort/*`, `/models/*`
 * and `/wasm/*`. That promise is keepable only while the URL carries a version
 * that tracks the bytes, because the filenames themselves come from the upstream
 * package and do not change between versions.
 *
 * So the failure this file exists to catch is a quiet one: someone replaces a
 * vendored binary — a newer onnxruntime-web, a quantized u2netp, a rebuilt
 * libheif — and does not update the token. Nothing breaks in development, where
 * nothing is cached for a year. In production every visitor who already holds
 * the old bytes keeps them, at the same URL, for up to a year, with no
 * revalidation that could ever tell them otherwise.
 */
const projectRoot = path.resolve(import.meta.dirname, '..');

const entries = Object.entries(IMMUTABLE_ASSET_VERSIONS) as [
  ImmutableAssetPath,
  string,
][];

describe('immutable asset versions', () => {
  it('covers something, so an empty manifest cannot pass', () => {
    expect(entries.length).toBeGreaterThanOrEqual(4);
  });

  it.each(entries)(
    '%s is versioned by the bytes actually in public/',
    (assetPath, token) => {
      const bytes = readFileSync(path.join(projectRoot, 'public', assetPath));
      const digest = createHash('sha256').update(bytes).digest('hex');
      expect(
        token,
        `${assetPath} changed without its version token. A visitor holding the ` +
          'old bytes would keep them for a year, because the URL never changed. ' +
          `Set the token to ${digest.slice(0, 16)}.`,
      ).toBe(digest.slice(0, 16));
    },
  );

  it('puts the version in the query string, not the path', () => {
    // The path has to keep matching both the file on disk and the `_headers`
    // rule. Only the query may carry the version.
    for (const [assetPath] of entries) {
      expect(immutableAssetUrl(assetPath)).toMatch(
        new RegExp(`^${assetPath}\\?v=[0-9a-f]{16}$`),
      );
    }
  });
});

/**
 * A token in the URL buys nothing on its own. If the response still says
 * `max-age=0, must-revalidate` — which is what the catch-all gives anything
 * without a rule of its own, and what all three of these prefixes were served
 * until 2026-09-27 — then the visitor asks the server about every one of these
 * files on every visit regardless.
 */
describe('public/_headers backs the version with a policy', () => {
  const rules = parseHeaderRules(
    readFileSync(path.join(projectRoot, 'public/_headers'), 'utf8'),
  );

  const prefixes = [...new Set(entries.map(([p]) => `/${p.split('/')[1]}/*`))];

  it('has a rule for every prefix these assets are served from', () => {
    expect(prefixes.sort()).toEqual(['/models/*', '/ort/*', '/wasm/*']);
  });

  it.each(prefixes)('serves %s immutable for a year', (prefix) => {
    const rule = rules.find((candidate) => candidate.pattern === prefix);
    expect(rule, `public/_headers has no ${prefix} rule`).toBeDefined();

    const values = rule!.lines
      .filter((line) => line.kind === 'set' && line.name === 'Cache-Control')
      .map((line) => line.value);
    expect(values, `${prefix} must set exactly one Cache-Control`).toHaveLength(
      1,
    );
    expect(values[0]).toBe('public, max-age=31536000, immutable');
  });
});
