import { describe, expect, it, vi } from 'vitest';

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  COMPLETION_EVENT,
  announceCompletion,
  formatCompletionDuration,
} from './completion';

/**
 * The share leaves from the receipt, so the settings have to reach it — and
 * nothing else may ride along. `recipe-link.test.ts` proves the filter; these
 * prove the event actually applies it, which is the part that would rot if a
 * later edit passed `detail.recipe` straight through.
 */
describe('the settings the receipt may offer to share', () => {
  const announced = (recipe: unknown) => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    announceCompletion({
      operation: 'Image optimizer',
      durationMs: 12,
      metrics: [{ label: 'After', value: '2 KB' }],
      recipe: recipe as never,
    });
    const event = dispatchEvent.mock.calls[0][0] as CustomEvent;
    vi.unstubAllGlobals();
    return event.detail.recipe;
  };

  it('carries a declared recipe through to the receipt', () => {
    expect(
      announced({
        id: 'image-optimize',
        values: { format: 'png', quality: 70 },
      }),
    ).toEqual({ id: 'image-optimize', values: { format: 'png', quality: 70 } });
  });

  // THE GATE, restated at this boundary. A tool handing over its whole state
  // object must not be able to put a filename into a link someone pastes into
  // a group chat.
  it('drops everything the definition does not declare', () => {
    expect(
      announced({
        id: 'image-optimize',
        values: {
          format: 'png',
          filename: 'passport-scan.png',
          text: 'confidential board minutes',
        },
      }),
    ).toEqual({ id: 'image-optimize', values: { format: 'png' } });
  });

  it('offers no share at all rather than a broken one', () => {
    expect(announced(undefined)).toBeUndefined();
    // An id nothing declares.
    expect(
      announced({ id: 'made-up', values: { format: 'png' } }),
    ).toBeUndefined();
    // Declared, but every value invalid — a share button here would copy a
    // link carrying nothing, which is worse than no button.
    expect(
      announced({ id: 'image-optimize', values: { format: 'gif' } }),
    ).toBeUndefined();
    expect(announced({ id: 'image-optimize', values: {} })).toBeUndefined();
  });
});

describe('completion value receipt', () => {
  it('formats measured durations without exaggerating precision', () => {
    expect(formatCompletionDuration(2.34)).toBe('2.3 ms');
    expect(formatCompletionDuration(24.8)).toBe('25 ms');
    expect(formatCompletionDuration(1250)).toBe('1.25 s');
    expect(formatCompletionDuration(Number.NaN)).toBe('0.0 ms');
  });

  it('dispatches only bounded, normalized display facts', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });

    announceCompletion({
      operation: '  Merge PDF  ',
      durationMs: -4,
      summary: '  Two PDFs merged.  ',
      metrics: [
        { label: ' Files ', value: ' 2 ' },
        { label: 'Input', value: '1 MB' },
        { label: 'Output', value: '500 KB' },
        { label: 'Ignored', value: 'Extra' },
      ],
    });

    const event = dispatchEvent.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe(COMPLETION_EVENT);
    expect(event.detail).toEqual({
      operation: 'Merge PDF',
      durationMs: 0,
      summary: 'Two PDFs merged.',
      metrics: [
        { label: 'Files', value: '2' },
        { label: 'Input', value: '1 MB' },
        { label: 'Output', value: '500 KB' },
      ],
    });
    vi.unstubAllGlobals();
  });

  it('removes control characters and bounds receipt copy', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });

    announceCompletion({
      operation: `\u0000${'A'.repeat(100)}`,
      durationMs: Number.POSITIVE_INFINITY,
      summary: `line one\n${'B'.repeat(220)}`,
      metrics: [
        { label: '  ', value: 'ignored' },
        { label: 'Rows\tcounted', value: '  12  ' },
      ],
    });

    const event = dispatchEvent.mock.calls[0][0] as CustomEvent;
    expect(event.detail.operation).toHaveLength(80);
    expect(event.detail.durationMs).toBe(0);
    expect(event.detail.summary).not.toContain('\n');
    expect(event.detail.summary.length).toBeLessThanOrEqual(180);
    expect(event.detail.metrics).toEqual([
      { label: 'Rows counted', value: '12' },
    ]);
    vi.unstubAllGlobals();
  });
});

/**
 * The support ask is the only thing on the site that asks for money inside a
 * tool, and it is offered from one place: `CompletionValueDialog` listens for a
 * completion, then waits for a click on `[data-receipt-download]`. It drops the
 * offer silently unless **both** hold — `detail.metrics` is non-empty, and the
 * element clicked carries the receipt attribute.
 *
 * Silently is the problem. On 2026-09-18 an audit of the shipped bundle found
 * `math-workbench-tool.tsx` announcing completions with no receipt element
 * anywhere in the file, and two of the six calls in `utility-tools.tsx` passing
 * no metrics. Those tools could never ask, and nothing failed to say so. This
 * is the check that would have caught it.
 */
describe('every tool that announces a completion can actually offer support', () => {
  const componentsDir = path.join(import.meta.dirname, '..', 'components');
  const files = readdirSync(componentsDir)
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => ({
      name,
      source: readFileSync(path.join(componentsDir, name), 'utf8'),
    }))
    .filter(({ source }) => source.includes('announceCompletion('));

  it('finds the tools that announce completions', () => {
    // A guard that silently matches nothing is worse than no guard.
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => f.name))(
    '%s passes metrics on every announceCompletion call',
    (name) => {
      const { source } = files.find((f) => f.name === name)!;
      // Each call spans from `announceCompletion(` to its closing `});`.
      const calls = source.split('announceCompletion(').slice(1);
      for (const call of calls) {
        const body = call.slice(0, call.indexOf('});'));
        expect(
          body,
          `a call in ${name} omits metrics, so it can never offer`,
        ).toContain('metrics:');
      }
    },
  );

  it.each(files.map((f) => f.name))(
    '%s marks something with data-receipt-download',
    (name) => {
      const { source } = files.find((f) => f.name === name)!;
      expect(
        source,
        `${name} announces a completion the dialog can never act on`,
      ).toContain('data-receipt-download');
    },
  );
});
