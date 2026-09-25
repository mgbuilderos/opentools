import type {
  KernelOperation,
  KernelOperationDescriptor,
} from '@/lib/kernel/types';

export function descriptorFor(
  operation: KernelOperation,
): KernelOperationDescriptor {
  return {
    id: operation.id,
    source: operation.source,
    name: operation.name,
    description: operation.description,
    input: operation.input,
    params: operation.params,
    output: operation.output,
    runtime: operation.runtime,
    deterministic: operation.deterministic,
    streamable: operation.streamable ?? false,
    ...(operation.inputLimitBytes !== undefined
      ? { inputLimitBytes: operation.inputLimitBytes }
      : {}),
    ...(operation.workingSetMultiplier !== undefined
      ? { workingSetMultiplier: operation.workingSetMultiplier }
      : {}),
    ...(operation.chunkSizeBytes !== undefined
      ? { chunkSizeBytes: operation.chunkSizeBytes }
      : {}),
    ...(operation.transfer ? { transfer: operation.transfer } : {}),
    ...(operation.notice ? { notice: operation.notice } : {}),
  };
}

export function descriptorKey(
  operation: Pick<KernelOperationDescriptor, 'id' | 'source'>,
): string {
  return `${operation.source}\u0000${operation.id}`;
}
