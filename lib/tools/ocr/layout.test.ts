import { describe, expect, it } from 'vitest';

import { assembleOcrLayout } from './layout';

describe('assembleOcrLayout', () => {
  it('orders shuffled boxes by line and then from left to right', () => {
    const result = assembleOcrLayout([
      { text: 'line', confidence: 98, box: { x0: 44, y0: 40, x1: 75, y1: 52 } },
      {
        text: 'world',
        confidence: 96,
        box: { x0: 56, y0: 10, x1: 94, y1: 22 },
      },
      {
        text: 'Second',
        confidence: 94,
        box: { x0: 8, y0: 41, x1: 40, y1: 53 },
      },
      { text: 'Hello', confidence: 97, box: { x0: 7, y0: 9, x1: 50, y1: 21 } },
    ]);

    expect(result.text).toBe('Hello world\nSecond line');
    expect(result.words.map((word) => word.text)).toEqual([
      'Hello',
      'world',
      'Second',
      'line',
    ]);
  });

  it('marks only measured confidences below the configured threshold', () => {
    const result = assembleOcrLayout(
      [
        {
          text: 'certain',
          confidence: 75,
          box: { x0: 0, y0: 0, x1: 10, y1: 10 },
        },
        {
          text: 'check',
          confidence: 74.9,
          box: { x0: 20, y0: 0, x1: 30, y1: 10 },
        },
      ],
      75,
    );

    expect(result.words.map(({ lowConfidence }) => lowConfidence)).toEqual([
      false,
      true,
    ]);
  });

  it('drops blank recogniser tokens and clamps confidence facts', () => {
    const result = assembleOcrLayout([
      { text: ' ', confidence: 80, box: { x0: 0, y0: 0, x1: 1, y1: 1 } },
      { text: 'word', confidence: 120, box: { x0: 2, y0: 0, x1: 12, y1: 10 } },
    ]);
    expect(result.text).toBe('word');
    expect(result.words[0]?.confidence).toBe(100);
  });
});
