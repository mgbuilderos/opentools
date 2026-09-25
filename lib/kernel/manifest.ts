import { KERNEL_MANIFEST as GENERATED_KERNEL_MANIFEST } from './manifest.generated';
import type { KernelOperationDescriptor } from './types';

/**
 * Older generated manifests predate streaming capabilities. Hydrating the
 * boolean here makes capability discovery total without hand-editing the
 * generated file while another lane owns it.
 */
export const KERNEL_MANIFEST: readonly KernelOperationDescriptor[] =
  GENERATED_KERNEL_MANIFEST.map((descriptor) => {
    const legacy = descriptor as KernelOperationDescriptor;
    return { ...legacy, streamable: legacy.streamable ?? false };
  });
