import type { OcrBox, OcrWord } from './types';

export interface RawOcrWord {
  text: string;
  confidence: number;
  box: OcrBox;
}

export const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 75;

function centreY(word: RawOcrWord) {
  return (word.box.y0 + word.box.y1) / 2;
}

function height(word: RawOcrWord) {
  return Math.max(1, word.box.y1 - word.box.y0);
}

function median(values: number[]): number {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 1) + (sorted[middle] ?? 1)) / 2
    : (sorted[middle] ?? 1);
}

/**
 * Assemble recogniser word boxes into deterministic top-to-bottom lines.
 * Geometry, ordering and the confidence threshold stay independent from the
 * OCR runtime so fixed boxes can prove them without loading WebAssembly.
 */
export function assembleOcrLayout(
  input: readonly RawOcrWord[],
  lowConfidenceThreshold = DEFAULT_LOW_CONFIDENCE_THRESHOLD,
): { text: string; words: OcrWord[] } {
  const words = input
    .filter((word) => word.text.trim().length > 0)
    .map((word) => ({
      ...word,
      text: word.text.trim(),
      confidence: Math.max(0, Math.min(100, word.confidence)),
      lowConfidence: word.confidence < lowConfidenceThreshold,
    }));
  if (words.length === 0) return { text: '', words: [] };

  const lineTolerance = Math.max(2, median(words.map(height)) * 0.55);
  const readingOrder = [...words].sort(
    (a, b) => centreY(a) - centreY(b) || a.box.x0 - b.box.x0,
  );
  const lines: OcrWord[][] = [];

  for (const word of readingOrder) {
    const target = lines.find(
      (line) =>
        Math.abs(
          centreY(word) -
            line.reduce((sum, item) => sum + centreY(item), 0) / line.length,
        ) <= lineTolerance,
    );
    if (target) target.push(word);
    else lines.push([word]);
  }

  lines.sort(
    (a, b) =>
      Math.min(...a.map((word) => word.box.y0)) -
      Math.min(...b.map((word) => word.box.y0)),
  );
  for (const line of lines) line.sort((a, b) => a.box.x0 - b.box.x0);

  return {
    text: lines
      .map((line) => line.map((word) => word.text).join(' '))
      .join('\n'),
    words: lines.flat(),
  };
}
