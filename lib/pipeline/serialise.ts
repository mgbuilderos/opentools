import { getOperation } from '@/lib/kernel';
import type { KernelOperation } from '@/lib/kernel/types';
import type { Pipeline, PipelineStep } from './types';
import { validate, type PipelineOperationResolver } from './validate';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function droppedIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 80 &&
    /^[A-Za-z][A-Za-z0-9_.-]*$/u.test(value)
  );
}

function operationFor(
  step: PipelineStep,
  index: number,
  resolveOperation: PipelineOperationResolver,
): KernelOperation {
  if (!step.source)
    throw new Error(`Step ${index + 1} (${step.op}) requires a source.`);
  const operation = resolveOperation(step.op, step.source);
  if (!operation)
    throw new Error(
      `Step ${index + 1} is unknown: ${step.op} from ${step.source}.`,
    );
  return operation;
}

function addDropped(target: string[], seen: Set<string>, id: string) {
  if (seen.has(id)) return;
  seen.add(id);
  target.push(id);
}

export function sanitisePipeline(
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver = getOperation,
): Pipeline {
  const errors = validate(pipeline, resolveOperation);
  if (errors.length) throw new Error(`Invalid pipeline: ${errors.join(' ')}`);

  const dropped: string[] = [];
  const droppedSeen = new Set<string>();
  for (const id of pipeline.droppedParams ?? []) {
    if (droppedIdentifier(id)) addDropped(dropped, droppedSeen, id);
  }

  const steps = pipeline.steps.map((step, index) => {
    const operation = operationFor(step, index, resolveOperation);
    const present = new Set(
      Object.getOwnPropertyNames(step.params).filter(droppedIdentifier),
    );
    const params: Record<string, string> = {};

    for (const descriptor of operation.params) {
      if (!present.has(descriptor.id)) continue;
      present.delete(descriptor.id);
      if (!descriptor.serialisable) {
        addDropped(dropped, droppedSeen, descriptor.id);
        continue;
      }
      const value = step.params[descriptor.id];
      if (typeof value === 'string') params[descriptor.id] = value;
    }
    for (const id of present) addDropped(dropped, droppedSeen, id);

    return { op: operation.id, source: operation.source, params };
  });

  return {
    version: 1,
    name: pipeline.name.trim(),
    steps,
    ...(dropped.length ? { droppedParams: dropped } : {}),
  };
}

export function serialisePipeline(
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver = getOperation,
): string {
  return JSON.stringify(sanitisePipeline(pipeline, resolveOperation), null, 2);
}

function parseStep(value: unknown, index: number): PipelineStep {
  if (!isRecord(value)) throw new Error(`Step ${index + 1} must be an object.`);
  if (typeof value.op !== 'string' || !value.op)
    throw new Error(`Step ${index + 1} requires an operation id.`);
  if (typeof value.source !== 'string' || !value.source)
    throw new Error(`Step ${index + 1} (${value.op}) requires a source.`);
  if (!isRecord(value.params))
    throw new Error(`Step ${index + 1} (${value.op}) requires parameters.`);

  const params: Record<string, string> = {};
  for (const id of Object.getOwnPropertyNames(value.params)) {
    const setting = value.params[id];
    if (typeof setting !== 'string')
      throw new Error(`Step ${index + 1} parameter ${id} must be text.`);
    params[id] = setting;
  }
  return { op: value.op, source: value.source, params };
}

export function deserialisePipeline(
  json: string,
  resolveOperation: PipelineOperationResolver = getOperation,
): Pipeline {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('The pipeline file is not valid JSON.');
  }
  if (!isRecord(value)) throw new Error('The pipeline must be an object.');
  if (value.version !== 1)
    throw new Error(
      `Pipeline version ${String(value.version)} is not supported.`,
    );
  if (typeof value.name !== 'string')
    throw new Error('The pipeline requires a name.');
  if (!Array.isArray(value.steps))
    throw new Error('The pipeline requires a steps list.');
  const droppedParams = Array.isArray(value.droppedParams)
    ? value.droppedParams.filter(droppedIdentifier)
    : undefined;
  return sanitisePipeline(
    {
      version: 1,
      name: value.name,
      steps: value.steps.map(parseStep),
      ...(droppedParams?.length ? { droppedParams } : {}),
    },
    resolveOperation,
  );
}

export const serialise = serialisePipeline;
export const deserialise = deserialisePipeline;
