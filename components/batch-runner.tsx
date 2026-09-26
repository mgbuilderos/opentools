'use client';

import { Archive, ArrowDownToLine, CheckCircle2, XCircle } from 'lucide-react';
import { useToolUi } from '@/components/locale-edition-provider';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  createBatchZip,
  runBatch,
  type BatchFileOutput,
  type BatchOutcome,
  type BatchProcessResult,
  type BatchProgress,
} from '@/lib/batch/run';

export type FileBatchOutcome = BatchOutcome<File, BatchFileOutput>;

export interface FileBatchRunner {
  cancelRequested: boolean;
  outcomes: readonly FileBatchOutcome[];
  progress: BatchProgress<File, BatchFileOutput> | null;
  running: boolean;
  cancel: () => void;
  reset: () => void;
  start: (
    files: readonly File[],
    process: (
      file: File,
      index: number,
      signal: AbortSignal,
    ) => Promise<BatchProcessResult<BatchFileOutput>>,
  ) => Promise<void>;
}

export function useFileBatchRunner(): FileBatchRunner {
  const controllerRef = useRef<AbortController | null>(null);
  const [running, setRunning] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [outcomes, setOutcomes] = useState<readonly FileBatchOutcome[]>([]);
  const [progress, setProgress] = useState<BatchProgress<
    File,
    BatchFileOutput
  > | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const reset = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRunning(false);
    setCancelRequested(false);
    setOutcomes([]);
    setProgress(null);
  };

  const cancel = () => {
    if (!controllerRef.current) return;
    setCancelRequested(true);
    controllerRef.current.abort();
  };

  const start: FileBatchRunner['start'] = async (files, process) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);
    setCancelRequested(false);
    setOutcomes([]);
    setProgress({
      completed: 0,
      current: files[0] ?? null,
      outcomes: [],
      total: files.length,
    });

    try {
      const nextOutcomes = await runBatch({
        inputs: files,
        process,
        signal: controller.signal,
        onProgress: (next) => {
          setProgress(next);
          setOutcomes(next.outcomes);
        },
      });
      setOutcomes(nextOutcomes);
      setProgress({
        completed: nextOutcomes.length,
        current: null,
        outcomes: nextOutcomes,
        total: files.length,
      });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setRunning(false);
      }
    }
  };

  return {
    cancelRequested,
    outcomes,
    progress,
    running,
    cancel,
    reset,
    start,
  };
}

export function BatchLocalPromise() {
  /* Localised chrome strings; the English bundle on every English page. */
  const t = useToolUi();
  return (
    <p className="mt-2 text-xs leading-5 text-muted-foreground">
      {t.batchLocalPromise}
    </p>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function BatchRunnerPanel({
  files,
  onClear,
  onStart,
  runner,
  startLabel,
  zipName,
}: {
  files: readonly File[];
  onClear: () => void;
  onStart: () => void;
  runner: FileBatchRunner;
  startLabel: string;
  zipName: string;
}) {
  const [buildingZip, setBuildingZip] = useState(false);
  const done = useMemo(
    () => runner.outcomes.filter((outcome) => outcome.status === 'done'),
    [runner.outcomes],
  );
  const failed = runner.outcomes.filter(
    (outcome) => outcome.status === 'failed',
  ).length;
  const skipped = runner.outcomes.filter(
    (outcome) => outcome.status === 'skipped',
  ).length;
  const complete = runner.outcomes.length === files.length && !runner.running;
  const completed = runner.progress?.completed ?? 0;

  const downloadZip = async () => {
    if (done.length === 0 || buildingZip) return;
    setBuildingZip(true);
    try {
      const bytes = await createBatchZip(done.map((outcome) => outcome.output));
      downloadBlob(
        new Blob([bytes as BlobPart], { type: 'application/zip' }),
        zipName,
      );
    } finally {
      setBuildingZip(false);
    }
  };

  return (
    <section
      data-batch-runner
      aria-label="Batch processing"
      className="mt-6 overflow-hidden rounded-2xl border bg-card"
    >
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">
            Batch of {files.length} files
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Files run one at a time. A failed file is named and does not stop
            the rest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {runner.running ? (
            <Button
              type="button"
              variant="outline"
              disabled={runner.cancelRequested}
              onClick={runner.cancel}
            >
              {runner.cancelRequested ? 'Stopping…' : 'Cancel'}
            </Button>
          ) : complete ? (
            <>
              <Button
                type="button"
                data-batch-download-all
                disabled={done.length === 0 || buildingZip}
                onClick={() => void downloadZip()}
              >
                <Archive aria-hidden="true" />
                {buildingZip ? 'Building ZIP…' : 'Download all as ZIP'}
              </Button>
              <Button type="button" variant="outline" onClick={onClear}>
                Clear batch
              </Button>
            </>
          ) : (
            <>
              <Button type="button" onClick={onStart}>
                {startLabel}
              </Button>
              <Button type="button" variant="outline" onClick={onClear}>
                Clear
              </Button>
            </>
          )}
        </div>
      </div>

      {runner.running ? (
        <div aria-live="polite" className="border-b p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold">
              File {Math.min(completed + 1, files.length)} of {files.length}
            </span>
            <span className="max-w-full truncate text-muted-foreground">
              {runner.cancelRequested
                ? 'Finishing the current step, then stopping'
                : runner.progress?.current?.name}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-foreground transition-[width]"
              style={{ width: `${(completed / files.length) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {complete ? (
        <div aria-live="polite" className="border-b p-5 text-sm">
          <span className="font-semibold">{done.length} done</span>
          <span className="text-muted-foreground">
            {' · '}
            {failed} failed · {skipped} skipped
          </span>
        </div>
      ) : null}

      <ol className="divide-y">
        {(runner.outcomes.length > 0 ? runner.outcomes : files).map(
          (item, index) => {
            if (item instanceof File) {
              return (
                <li key={`${item.name}-${index}`} className="p-4 text-sm">
                  <span className="break-all font-medium">{item.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Waiting
                  </span>
                </li>
              );
            }

            return (
              <li
                key={`${item.input.name}-${item.index}`}
                data-batch-result={item.status}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    {item.status === 'done' ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-4 shrink-0 text-success"
                      />
                    ) : (
                      <XCircle
                        aria-hidden="true"
                        className="size-4 shrink-0 text-destructive"
                      />
                    )}
                    <span className="break-all">{item.input.name}</span>
                  </p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {item.status === 'done'
                      ? `Done · ${item.output.fileName}`
                      : `${item.status === 'failed' ? 'Failed' : 'Skipped'} · ${item.reason}`}
                  </p>
                </div>
                {item.status === 'done' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Download ${item.output.fileName}`}
                    onClick={() =>
                      downloadBlob(item.output.blob, item.output.fileName)
                    }
                  >
                    <ArrowDownToLine aria-hidden="true" /> Download
                  </Button>
                ) : null}
              </li>
            );
          },
        )}
      </ol>
    </section>
  );
}
