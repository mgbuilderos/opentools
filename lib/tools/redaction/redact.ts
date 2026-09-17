import {
  DETECTION_CATEGORIES,
  DETECTORS,
  detectorById,
  findDetections,
  verifyRedacted,
  type DetectionCategory,
} from './detectors';

export type PlaceholderStyle = 'numbered' | 'generic';

export interface RedactionResult {
  text: string;
  /** Redactions per placeholder label, in detector order. */
  counts: ReadonlyArray<readonly [label: string, count: number]>;
}

/**
 * Replaces every detection with a placeholder. Overlapping detections are
 * merged into one placeholder so no part of either span survives; the label
 * comes from the detection that starts first.
 */
export function redactSecrets(
  text: string,
  categories: Iterable<DetectionCategory>,
  style: PlaceholderStyle,
): RedactionResult {
  const merged: Array<{ label: string; start: number; end: number }> = [];
  for (const detection of findDetections(text, categories)) {
    const last = merged.at(-1);
    if (last && detection.start < last.end) {
      last.end = Math.max(last.end, detection.end);
      continue;
    }
    const label = detectorById(detection.detectorId)?.label ?? 'SECRET';
    merged.push({ label, start: detection.start, end: detection.end });
  }

  const tally = new Map<string, number>();
  let output = '';
  let cursor = 0;
  merged.forEach(({ label, start, end }, index) => {
    tally.set(label, (tally.get(label) ?? 0) + 1);
    output += text.slice(cursor, start);
    output +=
      style === 'generic'
        ? `[REDACTED_${label}]`
        : `[REDACTED_${label}_${index + 1}]`;
    cursor = end;
  });
  output += text.slice(cursor);

  const labels = [...new Set(DETECTORS.map((detector) => detector.label))];
  const counts = labels.flatMap((label) => {
    const count = tally.get(label);
    return count ? [[label, count] as const] : [];
  });
  return { text: output, counts };
}

const CATEGORY_NOUNS: Record<DetectionCategory, readonly [string, string]> = {
  'private-key': ['private key', 'private keys'],
  key: ['API key or credential', 'API keys or credentials'],
  email: ['email address', 'email addresses'],
  ip: ['IPv4 address', 'IPv4 addresses'],
  card: ['payment card number', 'payment card numbers'],
};

/**
 * Re-checks scrubbed output with the same detectors and throws if anything
 * remains. The message names categories and counts, never the matched text.
 */
export function assertNothingRemains(
  output: string,
  categories: Iterable<DetectionCategory>,
): void {
  const remaining = verifyRedacted(output, categories);
  if (remaining.length === 0) return;

  const perCategory = new Map<DetectionCategory, number>();
  for (const { category } of remaining) {
    perCategory.set(category, (perCategory.get(category) ?? 0) + 1);
  }
  const parts = DETECTION_CATEGORIES.flatMap((category) => {
    const count = perCategory.get(category);
    if (!count) return [];
    const [singular, plural] = CATEGORY_NOUNS[category];
    return [`${count} ${count === 1 ? singular : plural}`];
  });
  const list =
    parts.length > 1
      ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
      : parts[0];
  throw new Error(
    `Scrub stopped: ${list} could not be removed. No output is shown.`,
  );
}
