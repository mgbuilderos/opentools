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

export function formatCompletionDuration(durationMs: number) {
  const safe = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  return safe < 1000
    ? `${safe.toFixed(safe < 10 ? 1 : 0)} ms`
    : `${(safe / 1000).toFixed(2)} s`;
}

export function announceCompletion(detail: CompletionDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<CompletionDetail>(COMPLETION_EVENT, {
      detail: {
        operation: detail.operation.trim() || 'Tool',
        durationMs: Number.isFinite(detail.durationMs)
          ? Math.max(0, detail.durationMs)
          : 0,
        summary: detail.summary?.trim() || undefined,
        metrics: detail.metrics?.slice(0, 3).map((metric) => ({
          label: metric.label.trim(),
          value: metric.value.trim(),
        })),
      },
    }),
  );
}
