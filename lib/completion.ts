/* oxlint-disable */
import {
  captureProcessingRecord,
  notifyProcessingRecord,
} from './attestation/record';

export {
  getLatestProcessingRecord,
  PROCESSING_RECORD_EVENT,
  type ProcessingRecord,
} from './attestation/record';

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
  try {
    const count =
      parseInt(localStorage.getItem('tool_usage_count') || '0', 10) + 1;
    localStorage.setItem('tool_usage_count', count.toString());
    window.dispatchEvent(new CustomEvent('tool-executed'));
  } catch (e) {}

  const operation = boundedDisplayText(detail.operation, 80) || 'Tool';
  const durationMs = Number.isFinite(detail.durationMs)
    ? Math.max(0, detail.durationMs)
    : 0;
  // Measured before any listener runs, so the job window ends now. The record
  // copies only the operation and duration: summary and metrics carry file
  // facts. It stays in memory until the person downloads it.
  captureProcessingRecord({ operation, durationMs });

  window.dispatchEvent(
    new CustomEvent<CompletionDetail>(COMPLETION_EVENT, {
      detail: {
        operation,
        durationMs,
        summary: detail.summary
          ? boundedDisplayText(detail.summary, 180) || undefined
          : undefined,
        metrics: metrics?.length ? metrics : undefined,
      },
    }),
  );
  notifyProcessingRecord();
}
