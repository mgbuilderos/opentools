'use client';

import { useSyncExternalStore } from 'react';
import {
  detectDeviceMemory,
  type DeviceMemorySnapshot,
} from '@/lib/kernel/capability';

/**
 * This device's memory figures, safe to read during a prerender.
 *
 * `detectDeviceMemory` reads browser-only globals and builds a fresh object
 * each call, so the measurement is memoised: `useSyncExternalStore` compares
 * snapshots by reference and would re-render forever on a new one. The server
 * snapshot is empty because prerendering has no device to measure, which keeps
 * the build machine's memory out of the static HTML and makes the prerendered
 * copy the one that quotes no device figure.
 */
const NO_DEVICE: DeviceMemorySnapshot = {};
let measured: DeviceMemorySnapshot | undefined;

function measure(): DeviceMemorySnapshot {
  measured ??= detectDeviceMemory();
  return measured;
}

function subscribe(): () => void {
  return () => {};
}

export function useDeviceMemory(): DeviceMemorySnapshot {
  return useSyncExternalStore(subscribe, measure, () => NO_DEVICE);
}
