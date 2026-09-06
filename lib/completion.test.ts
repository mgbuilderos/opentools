import { describe, expect, it, vi } from 'vitest';

import {
  COMPLETION_EVENT,
  announceCompletion,
  formatCompletionDuration,
} from './completion';

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
});
