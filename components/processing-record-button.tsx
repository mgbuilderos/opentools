'use client';

import { FileText } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import {
  downloadProcessingRecord,
  type ProcessingRecordFormat,
} from '@/lib/attestation/download';
import {
  getLatestProcessingRecord,
  PROCESSING_RECORD_EVENT,
} from '@/lib/attestation/record';
import { cn } from '@/lib/utils';

function subscribe(onChange: () => void) {
  window.addEventListener(PROCESSING_RECORD_EVENT, onChange);
  return () => window.removeEventListener(PROCESSING_RECORD_EVENT, onChange);
}

const noRecordOnServer = () => null;

/**
 * Offers the latest processing record (owner decision 15) as a local download.
 * Renders nothing until a job has completed in this page. The record is read
 * from memory and saved through the browser; nothing is sent anywhere.
 */
export function ProcessingRecordButton({ className }: { className?: string }) {
  const record = useSyncExternalStore(
    subscribe,
    getLatestProcessingRecord,
    noRecordOnServer,
  );
  if (!record) return null;

  const save = (format: ProcessingRecordFormat) =>
    downloadProcessingRecord(record, format);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 text-xs font-medium"
        onClick={() => save('text')}
      >
        <FileText aria-hidden="true" />
        Download processing record
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 font-mono text-xs"
        onClick={() => save('json')}
        aria-label="Download processing record as JSON"
      >
        JSON
      </Button>
    </div>
  );
}
