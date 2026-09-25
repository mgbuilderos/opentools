'use client';

import {
  ArrowDown,
  ArrowUp,
  Download,
  Save,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getOperation } from '@/lib/kernel';
import type { KernelOperation } from '@/lib/kernel/types';
import {
  deserialisePipeline,
  serialisePipeline,
} from '@/lib/pipeline/serialise';
import {
  deletePipeline,
  listPipelines,
  loadPipeline,
  savePipeline,
} from '@/lib/pipeline/store';
import type { Pipeline } from '@/lib/pipeline/types';
import { validate } from '@/lib/pipeline/validate';
import {
  buildRecipeSearch,
  readRecipeValues,
  type RecipeDefinition,
} from '@/lib/tools/recipe-link';

interface PipelineEditorProps {
  operation: KernelOperation;
  params: Readonly<Record<string, string>>;
  pipeline: Pipeline;
  onChange: (pipeline: Pipeline) => void;
  disabled?: boolean;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function recipeDefinition(serialised: string): RecipeDefinition {
  return {
    id: 'bench-pipeline',
    path: '/batch',
    fields: [
      {
        kind: 'choice',
        param: 'pipeline',
        label: 'Pipeline settings',
        choices: [{ value: serialised, label: 'Pipeline settings' }],
      },
    ],
  };
}

export function PipelineEditor({
  operation,
  params,
  pipeline,
  onChange,
  disabled,
}: PipelineEditorProps) {
  const importInput = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<readonly Pipeline[]>([]);
  const [selectedSaved, setSelectedSaved] = useState('');
  const [status, setStatus] = useState('');
  const errors = useMemo(() => validate(pipeline), [pipeline]);
  const active = pipeline.steps.length > 0;

  const refreshSaved = useCallback(async () => {
    try {
      const items = await listPipelines();
      setSaved(items);
      setSelectedSaved((current) =>
        items.some((item) => item.name === current)
          ? current
          : (items[0]?.name ?? ''),
      );
    } catch (cause) {
      setStatus(
        cause instanceof Error
          ? cause.message
          : 'Saved pipelines are unavailable.',
      );
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshSaved();
      const candidate = new URLSearchParams(window.location.search).get(
        'pipeline',
      );
      if (!candidate) return;
      try {
        const definition = recipeDefinition(candidate);
        const values = readRecipeValues(definition, window.location.search);
        if (typeof values.pipeline !== 'string') return;
        onChange(deserialisePipeline(values.pipeline));
        setStatus(
          'Loaded settings-only pipeline link. Add your own files to run it.',
        );
      } catch (cause) {
        setStatus(
          cause instanceof Error
            ? cause.message
            : 'The pipeline link is invalid.',
        );
      }
    });
  }, [onChange, refreshSaved]);

  const updateSteps = (steps: Pipeline['steps']) =>
    onChange({ ...pipeline, steps });

  const addStep = () => {
    updateSteps([
      ...pipeline.steps,
      { op: operation.id, source: operation.source, params: { ...params } },
    ]);
    setStatus('');
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pipeline.steps.length) return;
    const steps = [...pipeline.steps];
    [steps[index], steps[target]] = [steps[target]!, steps[index]!];
    updateSteps(steps);
  };

  const removeStep = (index: number) => {
    updateSteps(pipeline.steps.filter((_, stepIndex) => stepIndex !== index));
    setStatus('');
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(deserialisePipeline(await file.text()));
      setStatus(`Imported ${file.name}.`);
    } catch (cause) {
      setStatus(
        cause instanceof Error
          ? cause.message
          : 'The pipeline file is invalid.',
      );
    }
  };

  const save = async () => {
    if (errors.length) return;
    try {
      const safe = await savePipeline(pipeline);
      onChange(safe);
      await refreshSaved();
      setSelectedSaved(safe.name);
      setStatus(`Saved ${safe.name} in this browser.`);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Save failed.');
    }
  };

  const load = async () => {
    if (!selectedSaved) return;
    try {
      const stored = await loadPipeline(selectedSaved);
      if (!stored) throw new Error(`${selectedSaved} was not found.`);
      onChange(stored);
      setStatus(`Loaded ${stored.name}.`);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Load failed.');
    }
  };

  const removeSaved = async () => {
    if (!selectedSaved) return;
    try {
      const removed = selectedSaved;
      await deletePipeline(removed);
      await refreshSaved();
      setStatus(`Deleted ${removed}.`);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Delete failed.');
    }
  };

  const exportPipeline = () => {
    if (errors.length) return;
    download(
      new Blob([serialisePipeline(pipeline)], {
        type: 'application/json;charset=utf-8',
      }),
      `${pipeline.name.replace(/[^A-Za-z0-9_-]+/gu, '-').toLowerCase() || 'pipeline'}.json`,
    );
  };

  const share = async () => {
    if (errors.length) return;
    try {
      const serialised = serialisePipeline(pipeline);
      const search = buildRecipeSearch(recipeDefinition(serialised), {
        pipeline: serialised,
      });
      await navigator.clipboard.writeText(
        `${window.location.origin}/batch?${search}`,
      );
      setStatus(
        'Copied a settings-only link. No file names or content are included.',
      );
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Link copy failed.');
    }
  };

  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-5"
      aria-labelledby="pipeline-heading"
    >
      <div className="space-y-1">
        <h2 id="pipeline-heading" className="text-lg font-semibold">
          Pipeline (optional)
        </h2>
        <p className="text-sm text-muted-foreground">
          Add operations in order. Until you add a step, the existing
          single-operation run stays unchanged.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-56 flex-1 gap-1 text-sm">
          Pipeline name
          <input
            value={pipeline.name}
            onChange={(event) =>
              onChange({ ...pipeline, name: event.target.value })
            }
            className="h-10 rounded-lg border bg-background px-3"
          />
        </label>
        <Button variant="outline" disabled={disabled} onClick={addStep}>
          Add {operation.name} as step
        </Button>
      </div>

      {active ? (
        <ol className="divide-y rounded-lg border" data-testid="pipeline-steps">
          {pipeline.steps.map((step, index) => {
            const descriptor = getOperation(step.op, step.source);
            return (
              <li
                key={`${index}:${step.source}:${step.op}`}
                className="flex flex-wrap items-center gap-2 p-3 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <strong>
                    {index + 1}. {descriptor?.name ?? step.op}
                  </strong>{' '}
                  <span className="text-muted-foreground">— {step.source}</span>
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Move step ${index + 1} up`}
                  disabled={disabled || index === 0}
                  onClick={() => moveStep(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Move step ${index + 1} down`}
                  disabled={disabled || index === pipeline.steps.length - 1}
                  onClick={() => moveStep(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Remove step ${index + 1}`}
                  disabled={disabled}
                  onClick={() => removeStep(index)}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ol>
      ) : null}

      {active && errors.length ? (
        <div
          role="alert"
          data-testid="pipeline-validation"
          className="rounded-lg border p-3 text-sm text-destructive"
        >
          <p className="font-semibold">
            Fix this pipeline before saving or running:
          </p>
          <ul className="list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!active || errors.length > 0 || disabled}
          onClick={() => void save()}
        >
          <Save /> Save locally
        </Button>
        <Button
          variant="outline"
          disabled={!active || errors.length > 0 || disabled}
          onClick={exportPipeline}
        >
          <Download /> Export JSON
        </Button>
        <Button
          variant="outline"
          disabled={!active || errors.length > 0 || disabled}
          onClick={() => void share()}
        >
          <Share2 /> Copy settings-only link
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => importInput.current?.click()}
        >
          <Upload /> Import JSON
        </Button>
        <input
          ref={importInput}
          className="hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Import pipeline JSON"
          onChange={(event) => void importFile(event.target.files?.[0])}
        />
      </div>

      <div
        className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void importFile(event.dataTransfer.files[0]);
        }}
      >
        Drop a pipeline JSON file here to import settings only.
      </div>

      {saved.length ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-56 flex-1 gap-1 text-sm">
            Saved pipelines
            <select
              aria-label="Saved pipelines"
              value={selectedSaved}
              onChange={(event) => setSelectedSaved(event.target.value)}
              className="h-10 rounded-lg border bg-background px-3"
            >
              {saved.map((item) => (
                <option key={item.name}>{item.name}</option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => void load()}
          >
            Load
          </Button>
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => void removeSaved()}
          >
            <Trash2 /> Delete saved
          </Button>
        </div>
      ) : null}

      {status ? <output className="text-sm">{status}</output> : null}
    </section>
  );
}
