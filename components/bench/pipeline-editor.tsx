'use client';

import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Link2,
  Plus,
  Save,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getOperation, KERNEL_OPERATIONS } from '@/lib/kernel/registry';
import { chainVerdict } from '@/lib/pipeline/chain';
import type { KernelOperation, OperationInputKind } from '@/lib/kernel/types';
import {
  buildRecipeSearch,
  readRecipe,
  recipeParamNames,
  unshareableParams,
  type UnshareableParam,
} from '@/lib/pipeline/recipe';
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
import {
  candidateCount,
  candidateOperations,
  lastOperation,
  pipelineShape,
} from '@/lib/pipeline/suggest';
import type { Pipeline, PipelineStep } from '@/lib/pipeline/types';
import { validate } from '@/lib/pipeline/validate';
import { searchTools } from '@/lib/tools/catalog';

interface PipelineEditorProps {
  operation: KernelOperation;
  params: Readonly<Record<string, string>>;
  pipeline: Pipeline;
  onChange: (pipeline: Pipeline) => void;
  disabled?: boolean;
}

const SHAPE_LABEL: Readonly<Record<OperationInputKind, string>> = {
  none: 'nothing',
  text: 'text',
  file: 'a file',
  files: 'files',
};

function keyOf(operation: Pick<KernelOperation, 'id' | 'source'>) {
  return `${operation.source}:${operation.id}`;
}

function defaultsFor(operation: KernelOperation): Record<string, string> {
  return Object.fromEntries(
    operation.params.map((param) => [param.id, param.defaultValue]),
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Drops the recipe keys from the address bar once the link has been answered. */
function clearRecipeFromUrl() {
  const url = new URL(window.location.href);
  for (const name of recipeParamNames(url.search))
    url.searchParams.delete(name);
  window.history.replaceState(
    null,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function StepParams({
  operation,
  step,
  disabled,
  onChange,
}: {
  operation: KernelOperation;
  step: PipelineStep;
  disabled?: boolean;
  onChange: (params: Record<string, string>) => void;
}) {
  if (!operation.params.length)
    return (
      <p className="text-sm text-muted-foreground">
        This operation has no settings.
      </p>
    );

  const set = (id: string, value: string) =>
    onChange({ ...step.params, [id]: value });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {operation.params.map((param) => {
        const value = step.params[param.id] ?? param.defaultValue;
        return (
          <label key={param.id} className="grid gap-1 text-sm">
            <span>
              {param.label}
              {param.serialisable ? null : (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  not in links
                </span>
              )}
            </span>
            {param.type === 'select' ? (
              <select
                value={value}
                disabled={disabled}
                onChange={(event) => set(param.id, event.target.value)}
                className="h-10 rounded-lg border bg-background px-3"
              >
                {param.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : param.type === 'boolean' ? (
              <input
                type="checkbox"
                checked={value === 'true'}
                disabled={disabled}
                onChange={(event) =>
                  set(param.id, String(event.target.checked))
                }
              />
            ) : param.type === 'textarea' ? (
              <textarea
                value={value}
                disabled={disabled}
                rows={3}
                onChange={(event) => set(param.id, event.target.value)}
                className="rounded-lg border bg-background p-3"
              />
            ) : (
              <input
                type={param.type === 'number' ? 'number' : 'text'}
                value={value}
                disabled={disabled}
                onChange={(event) => set(param.id, event.target.value)}
                className="h-10 rounded-lg border bg-background px-3"
              />
            )}
          </label>
        );
      })}
    </div>
  );
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
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState('');
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [link, setLink] = useState('');
  const [arrival, setArrival] = useState<{
    pipeline: Pipeline;
    unshareable: readonly UnshareableParam[];
  } | null>(null);

  const errors = useMemo(() => validate(pipeline), [pipeline]);
  const active = pipeline.steps.length > 0;
  const shape = useMemo(
    () => pipelineShape(pipeline, getOperation),
    [pipeline],
  );
  const previous = useMemo(
    () => lastOperation(pipeline, getOperation),
    [pipeline],
  );

  // Only the operations that can legally follow the last step. The rule is the
  // validator's own, so the picker can never offer a step it would then reject.
  const candidates = useMemo(
    () =>
      candidateOperations(KERNEL_OPERATIONS, previous, {
        query,
        boostIds: query.trim()
          ? new Set(searchTools(query).map((item) => item.resultId ?? item.id))
          : undefined,
      }),
    [previous, query],
  );
  const followCount = useMemo(
    () => candidateCount(KERNEL_OPERATIONS, previous),
    [previous],
  );
  const chosen = useMemo(
    () => candidates.find((item) => keyOf(item) === picked) ?? candidates[0],
    [candidates, picked],
  );
  // The bench's own operation is a shortcut into the chain, so it answers to
  // the same rule as the picker: offer it only where it would actually run.
  const benchBlocked = useMemo(() => {
    if (!previous) return '';
    const verdict = chainVerdict(previous, operation);
    if (verdict.ok) return '';
    return verdict.code === 'input-none'
      ? `${operation.name} takes no input, so it can only be the first step.`
      : `${operation.name} needs ${SHAPE_LABEL[verdict.accepts]}, and ${previous.name} produces ${verdict.produced}.`;
  }, [operation, previous]);

  const missingSettings = useMemo(
    () => (active ? unshareableParams(pipeline, getOperation) : []),
    [active, pipeline],
  );

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
      const result = readRecipe(window.location.search);
      if (result.kind === 'recipe') {
        setArrival({
          pipeline: result.pipeline,
          unshareable: result.unshareable,
        });
      } else if (result.kind === 'invalid') {
        setStatus(result.reason);
        clearRecipeFromUrl();
      }
    });
  }, [refreshSaved]);

  const updateSteps = (steps: Pipeline['steps']) => {
    onChange({ ...pipeline, steps });
    setLink('');
  };

  const addStep = (
    next: KernelOperation,
    stepParams?: Record<string, string>,
  ) => {
    updateSteps([
      ...pipeline.steps,
      {
        op: next.id,
        source: next.source,
        params: stepParams ?? defaultsFor(next),
      },
    ]);
    setStatus(`Added ${next.name} as step ${pipeline.steps.length + 1}.`);
    setQuery('');
    setPicked('');
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pipeline.steps.length) return;
    const steps = [...pipeline.steps];
    [steps[index], steps[target]] = [steps[target]!, steps[index]!];
    updateSteps(steps);
    setOpenStep(null);
  };

  const removeStep = (index: number) => {
    updateSteps(pipeline.steps.filter((_unused, at) => at !== index));
    setOpenStep(null);
    setStatus('');
  };

  const setStepParams = (index: number, next: Record<string, string>) => {
    updateSteps(
      pipeline.steps.map((step, at) =>
        at === index ? { ...step, params: next } : step,
      ),
    );
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(deserialisePipeline(await file.text()));
      setLink('');
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
      setLink('');
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

  const copyLink = async () => {
    if (errors.length) return;
    let url: string;
    try {
      const { search, oversize } = buildRecipeSearch(pipeline);
      url = `${window.location.origin}${window.location.pathname}?${search}`;
      setLink(url);
      setStatus(
        oversize
          ? 'This link is long enough that some apps will cut it — export JSON for a chain this size.'
          : 'The link carries the steps and their settings. No file, no file name, not even the pipeline name.',
      );
    } catch (cause) {
      setStatus(
        cause instanceof Error ? cause.message : 'The link could not be built.',
      );
      return;
    }
    // The link is already on screen, so a blocked clipboard is a smaller
    // failure than it sounds: say what happened rather than claiming a copy.
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      setStatus(
        'The link is below. Copying it automatically was blocked, so select it and copy it yourself.',
      );
    }
  };

  const acceptArrival = () => {
    if (!arrival) return;
    onChange(arrival.pipeline);
    setArrival(null);
    setLink('');
    clearRecipeFromUrl();
    setStatus('Steps loaded. Add your own files to run them.');
  };

  const dismissArrival = () => {
    setArrival(null);
    clearRecipeFromUrl();
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
          Chain operations so each one runs on what the last produced. Until you
          add a step, the single-operation run below stays unchanged.
        </p>
      </div>

      {arrival ? (
        <section
          className="space-y-3 rounded-lg border p-4"
          data-testid="recipe-arrival"
          aria-labelledby="recipe-arrival-heading"
        >
          <h3 id="recipe-arrival-heading" className="font-semibold">
            Someone shared these steps with you
          </h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {arrival.pipeline.steps.map((step, index) => {
              const descriptor = getOperation(step.op, step.source);
              const settings = (descriptor?.params ?? [])
                .filter(
                  (param) =>
                    param.serialisable && step.params[param.id] !== undefined,
                )
                .map((param) => `${param.label}: ${step.params[param.id]}`)
                .join(', ');
              return (
                <li key={`${index}:${step.source}:${step.op}`}>
                  {descriptor?.name ?? step.op}{' '}
                  <span className="text-muted-foreground">
                    — {step.source}
                    {settings ? ` · ${settings}` : ''}
                  </span>
                </li>
              );
            })}
          </ol>
          {arrival.unshareable.length ? (
            <p className="text-sm text-muted-foreground">
              Links never carry these settings, so they are on their defaults:{' '}
              {arrival.unshareable
                .map((item) => `${item.label} (step ${item.step})`)
                .join(', ')}
              .
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            No file came with this link, and none can. Whatever you run through
            these steps stays on this device.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={acceptArrival} disabled={disabled}>
              <Check /> Use these steps
            </Button>
            <Button variant="outline" onClick={dismissArrival}>
              <X /> Dismiss
            </Button>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-56 flex-1 gap-1 text-sm">
          Pipeline name
          <input
            value={pipeline.name}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...pipeline, name: event.target.value })
            }
            className="h-10 rounded-lg border bg-background px-3"
          />
        </label>
      </div>

      {active ? (
        <>
          <p
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            data-testid="pipeline-shape"
          >
            Shape: {SHAPE_LABEL[shape[0]!.accepts]} →{' '}
            {shape.map((item) => item.produces).join(' → ')}
          </p>
          <ol
            className="divide-y rounded-lg border"
            data-testid="pipeline-steps"
          >
            {pipeline.steps.map((step, index) => {
              const descriptor = getOperation(step.op, step.source);
              const open = openStep === index;
              return (
                <li key={`${index}:${step.source}:${step.op}`} className="p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <strong>
                        {index + 1}. {descriptor?.name ?? step.op}
                      </strong>{' '}
                      <span className="text-muted-foreground">
                        — {step.source}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Settings for step ${index + 1}`}
                      aria-expanded={open}
                      disabled={disabled || !descriptor}
                      onClick={() => setOpenStep(open ? null : index)}
                    >
                      <Settings2 />
                    </Button>
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
                  </div>
                  {open && descriptor ? (
                    <div className="mt-3 border-t pt-3">
                      <StepParams
                        operation={descriptor}
                        step={step}
                        disabled={disabled}
                        onChange={(next) => setStepParams(index, next)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </>
      ) : null}

      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">
          {active
            ? `Add step ${pipeline.steps.length + 1}`
            : 'Add the first step'}
        </h3>
        <p
          className="text-sm text-muted-foreground"
          data-testid="candidate-count"
        >
          {previous
            ? `${followCount.toLocaleString()} operations can take what ${previous.name} produces.`
            : `${followCount.toLocaleString()} operations can start a pipeline.`}
        </p>
        <input
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search operations"
          aria-label="Search operations that can come next"
          className="h-10 w-full rounded-lg border bg-background px-3"
        />
        <select
          aria-label="Operation for this step"
          value={chosen ? keyOf(chosen) : ''}
          disabled={disabled || !candidates.length}
          onChange={(event) => setPicked(event.target.value)}
          size={6}
          className="w-full rounded-lg border bg-background p-2"
        >
          {candidates.map((item) => (
            <option key={keyOf(item)} value={keyOf(item)}>
              {item.name} — {item.source}
            </option>
          ))}
        </select>
        {chosen ? (
          <p className="text-sm text-muted-foreground">{chosen.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No operation matches that search here. Clear the search to see what
            can come next.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={disabled || !chosen}
            onClick={() => chosen && addStep(chosen)}
          >
            <Plus /> Add {chosen ? chosen.name : 'step'}
          </Button>
          <Button
            variant="outline"
            disabled={disabled || Boolean(benchBlocked)}
            onClick={() => addStep(operation, { ...params })}
          >
            <Plus /> Add the operation set up below
          </Button>
        </div>
        {benchBlocked ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="bench-step-blocked"
          >
            {benchBlocked}
          </p>
        ) : null}
      </div>

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
          onClick={() => void copyLink()}
        >
          <Link2 /> Copy recipe link
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

      {link ? (
        <div className="space-y-2">
          <label className="grid gap-1 text-sm">
            Recipe link — read it before you send it
            <input
              readOnly
              value={link}
              data-testid="recipe-link"
              onFocus={(event) => event.currentTarget.select()}
              className="h-10 rounded-lg border bg-background px-3 font-mono text-xs"
            />
          </label>
          {missingSettings.length ? (
            <p className="text-sm text-muted-foreground">
              Held back, because a link never carries them:{' '}
              {missingSettings
                .map((item) => `${item.label} (step ${item.step})`)
                .join(', ')}
              .
            </p>
          ) : null}
        </div>
      ) : null}

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
