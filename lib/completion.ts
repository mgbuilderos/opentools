export const COMPLETION_EVENT = 'tools:completion';

export interface CompletionMetric {
  label: string;
  value: string;
}

export interface CompletionDetail {
  operation: string;
  durationMs: number;
  summary?: string;
  metrics?: CompletionMetric[];
}

function boundedDisplayText(value: string, maximum: number) {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? ' ' : character;
  })
    .join('')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maximum);
}

export function formatCompletionDuration(durationMs: number) {
  const safe = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  return safe < 1000
    ? `${safe.toFixed(safe < 10 ? 1 : 0)} ms`
    : `${(safe / 1000).toFixed(2)} s`;
}

export function announceCompletion(detail: CompletionDetail) {
  if (typeof window === 'undefined') return;
  const metrics = detail.metrics
    ?.slice(0, 3)
    .map((metric) => ({
      label: boundedDisplayText(metric.label, 32),
      value: boundedDisplayText(metric.value, 64),
    }))
    .filter((metric) => metric.label && metric.value);
  window.dispatchEvent(
    new CustomEvent<CompletionDetail>(COMPLETION_EVENT, {
      detail: {
        operation: boundedDisplayText(detail.operation, 80) || 'Tool',
        durationMs: Number.isFinite(detail.durationMs)
          ? Math.max(0, detail.durationMs)
          : 0,
        summary: detail.summary
          ? boundedDisplayText(detail.summary, 180) || undefined
          : undefined,
        metrics: metrics?.length ? metrics : undefined,
      },
    }),
  );
}
