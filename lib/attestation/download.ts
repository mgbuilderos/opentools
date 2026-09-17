import { toJson, toText, type ProcessingRecord } from './record';

export type ProcessingRecordFormat = 'text' | 'json';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

/**
 * `processing-record-<operation-slug>-<yyyymmdd-hhmm>.<txt|json>`, from the
 * operation name and the record's own timestamp (local time). Never a user
 * filename.
 */
export function processingRecordFilename(
  record: ProcessingRecord,
  format: ProcessingRecordFormat,
) {
  const slug =
    record.operation
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 40)
      .replace(/-+$/u, '') || 'job';
  const at = new Date(record.generatedAt);
  const stamp = Number.isNaN(at.getTime())
    ? 'undated'
    : `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}`;
  return `processing-record-${slug}-${stamp}.${format === 'json' ? 'json' : 'txt'}`;
}

/** Saves the record through the browser's own download. No network request. */
export function downloadProcessingRecord(
  record: ProcessingRecord,
  format: ProcessingRecordFormat = 'text',
) {
  const blob =
    format === 'json'
      ? new Blob([toJson(record)], { type: 'application/json' })
      : new Blob([toText(record)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = processingRecordFilename(record, format);
  link.rel = 'noopener';
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari can abort a download whose object URL is revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
