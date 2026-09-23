import { getOperation } from '@/lib/kernel';
import type { KernelOperation } from '@/lib/kernel/types';
import type { Pipeline } from './types';

export type PipelineOperationResolver = (
  id: string,
  source: string,
) => KernelOperation | undefined;

function stepLabel(
  index: number,
  operation: KernelOperation | undefined,
  id: string,
  source: string,
): string {
  const identity = source ? `${id} @ ${source}` : id;
  return `step ${index + 1} "${operation?.name ?? identity}"`;
}

export function validate(
  pipeline: Pipeline,
  resolveOperation: PipelineOperationResolver = getOperation,
): readonly string[] {
  const errors: string[] = [];
  if (pipeline.version !== 1)
    errors.push(
      `Pipeline version ${String(pipeline.version)} is not supported.`,
    );
  if (!pipeline.name.trim()) errors.push('Pipeline name is required.');
  if (!pipeline.steps.length) errors.push('Add at least one pipeline step.');

  const operations = pipeline.steps.map((step, index) => {
    if (!step.source?.trim()) {
      errors.push(
        `${stepLabel(index, undefined, step.op, '')} is invalid: source is required for ${step.op}.`,
      );
      return undefined;
    }
    const operation = resolveOperation(step.op, step.source);
    if (!operation) {
      errors.push(
        `${stepLabel(index, undefined, step.op, step.source)} is unknown; no operation matches ${step.op} from ${step.source}.`,
      );
    }
    return operation;
  });

  for (let index = 0; index < operations.length - 1; index += 1) {
    const current = operations[index];
    const next = operations[index + 1];
    if (!current || !next) continue;
    const currentLabel = stepLabel(
      index,
      current,
      pipeline.steps[index]!.op,
      pipeline.steps[index]!.source,
    );
    const nextLabel = stepLabel(
      index + 1,
      next,
      pipeline.steps[index + 1]!.op,
      pipeline.steps[index + 1]!.source,
    );

    if (next.input === 'none') {
      errors.push(
        `${currentLabel} cannot feed ${nextLabel}: ${nextLabel} accepts no input and may only be first.`,
      );
      continue;
    }
    if (current.output.kind === 'text' && next.input !== 'text') {
      errors.push(
        `${currentLabel} outputs text, but ${nextLabel} accepts ${next.input}; both operations cannot be chained.`,
      );
    }
    if (
      current.output.kind === 'files' &&
      next.input !== 'file' &&
      next.input !== 'files'
    ) {
      errors.push(
        `${currentLabel} outputs files, but ${nextLabel} accepts ${next.input}; both operations cannot be chained.`,
      );
    }
  }

  return errors;
}

export const validatePipeline = validate;
