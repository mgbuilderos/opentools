import { DEFAULT_STREAM_CHUNK_BYTES } from './stream';
import type { KernelOperationDescriptor } from './types';

export interface DeviceMemorySnapshot {
  /** JavaScript heap ceiling reported by the runtime, when available. */
  heapLimitBytes?: number;
  /** Coarse physical-memory hint reported by the browser, when available. */
  deviceMemoryBytes?: number;
}

export interface OperationCapabilityReport {
  streamable: boolean;
  chunkSizeBytes: number | null;
  maxInputBytes: number | null;
  limitingFactor:
    | 'streaming'
    | 'operation'
    | 'device-heap'
    | 'operation-and-device-heap'
    | 'unknown';
  device: DeviceMemorySnapshot;
}

type PerformanceWithMemory = Performance & {
  memory?: { jsHeapSizeLimit?: number };
};

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

function positiveFinite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

export function detectDeviceMemory(): DeviceMemorySnapshot {
  const performanceMemory = (
    globalThis.performance as PerformanceWithMemory | undefined
  )?.memory;
  const deviceMemoryGiB = positiveFinite(
    (globalThis.navigator as NavigatorWithMemory | undefined)?.deviceMemory,
  );
  return {
    ...(positiveFinite(performanceMemory?.jsHeapSizeLimit) !== undefined
      ? {
          heapLimitBytes: Math.floor(
            positiveFinite(performanceMemory?.jsHeapSizeLimit)!,
          ),
        }
      : {}),
    ...(deviceMemoryGiB !== undefined
      ? { deviceMemoryBytes: Math.floor(deviceMemoryGiB * 1024 ** 3) }
      : {}),
  };
}

/**
 * Returns only ceilings supported by operation data and runtime evidence.
 * `null` means the browser exposes no honest numeric ceiling; callers should
 * show that uncertainty instead of inventing a file-size limit.
 */
export function reportOperationCapability(
  operation: KernelOperationDescriptor,
  device: DeviceMemorySnapshot = detectDeviceMemory(),
): OperationCapabilityReport {
  const streamable = operation.streamable === true;
  if (streamable) {
    return {
      streamable: true,
      chunkSizeBytes: operation.chunkSizeBytes ?? DEFAULT_STREAM_CHUNK_BYTES,
      maxInputBytes: operation.inputLimitBytes ?? null,
      limitingFactor:
        operation.inputLimitBytes === undefined ? 'streaming' : 'operation',
      device,
    };
  }

  const declaredValue = positiveFinite(operation.inputLimitBytes);
  const declared =
    declaredValue === undefined ? undefined : Math.floor(declaredValue);
  const multiplier = positiveFinite(operation.workingSetMultiplier);
  const heapLimitValue = positiveFinite(device.heapLimitBytes);
  const heapLimit =
    heapLimitValue === undefined ? undefined : Math.floor(heapLimitValue);
  const heapBound =
    heapLimit !== undefined && multiplier !== undefined
      ? Math.floor(heapLimit / multiplier)
      : undefined;
  const candidates = [declared, heapBound].filter(
    (value): value is number => value !== undefined,
  );
  const maxInputBytes = candidates.length ? Math.min(...candidates) : null;

  let limitingFactor: OperationCapabilityReport['limitingFactor'] = 'unknown';
  if (declared !== undefined && heapBound !== undefined) {
    limitingFactor =
      declared === heapBound
        ? 'operation-and-device-heap'
        : declared < heapBound
          ? 'operation'
          : 'device-heap';
  } else if (declared !== undefined) {
    limitingFactor = 'operation';
  } else if (heapBound !== undefined) {
    limitingFactor = 'device-heap';
  }

  return {
    streamable: false,
    chunkSizeBytes: null,
    maxInputBytes,
    limitingFactor,
    device,
  };
}
