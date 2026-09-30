import {
  reportOperationCapability,
  type DeviceMemorySnapshot,
  type OperationCapabilityReport,
} from '@/lib/kernel/capability';
import { formatBytes } from '@/lib/pipeline/capacity';

export interface ToolFileLimit {
  /** The ceiling this page states, whatever the device turns out to be. */
  inputLimitBytes: number;
  /**
   * The page reads the file in bounded slices instead of buffering it whole.
   *
   * This is not a nicety: the nine video pages all hand the engine a
   * `ByteSource` built by `sourceFromFile`, so a four-gigabyte film is sliced
   * through `File.slice()` and the output assembled as a `Blob`. Their ceiling
   * is about what browser file handling will carry, not about memory, and a
   * page that said "up to 2 GB, because the whole thing is read in this tab"
   * would be describing a page that does not exist. A streaming page says the
   * file is never held whole, which is the part worth knowing.
   */
  streams?: boolean;
  /**
   * Peak working-set bytes per byte of input, where the page knows it.
   *
   * WHY MOST PAGES LEAVE THIS OUT. With a multiplier the report can divide a
   * measured heap ceiling by it and refuse a file this device cannot actually
   * hold, which is better than letting the tab die. Without one it reports the
   * stated ceiling alone. That is the honest default, because the number is
   * only worth having if it was measured: a guessed multiplier refuses work the
   * browser would have completed, and it does so invisibly. So a page declares
   * one when its own handling is known and says nothing when it is not, which
   * is the same discipline `reportOperationCapability` applies to a ceiling it
   * has no evidence for.
   */
  workingSetMultiplier?: number;
  /** Why the ceiling exists, in the page's own words. Completes "because …". */
  because: string;
}

/**
 * What a tool page can accept, from the same report the kernel uses.
 *
 * A tool page is not a kernel operation — most of these pages predate the
 * manifest and none of them are registered in it — but the report only ever
 * needed a descriptor's numbers, so a page can hand it those directly and get
 * the same treatment: the stated ceiling, narrowed by this device where there
 * is evidence to narrow it by, and never widened past what was declared.
 */
export function toolCapability(
  limit: ToolFileLimit,
  device: DeviceMemorySnapshot,
): OperationCapabilityReport {
  return reportOperationCapability(
    {
      id: 'tool-page',
      source: 'tool-page',
      name: 'Tool page',
      description: 'A tool page that holds its input in the tab.',
      input: 'file',
      params: [],
      output: { kind: 'files' },
      runtime: 'web',
      deterministic: true,
      streamable: limit.streams === true,
      inputLimitBytes: limit.inputLimitBytes,
      ...(limit.workingSetMultiplier !== undefined
        ? { workingSetMultiplier: limit.workingSetMultiplier }
        : {}),
    },
    device,
  );
}

/**
 * The ceiling to enforce. A declared limit always gives the report a number,
 * so the fallback is only there to keep the type honest.
 */
export function ceilingBytes(
  report: OperationCapabilityReport,
  limit: ToolFileLimit,
): number {
  return report.maxInputBytes ?? limit.inputLimitBytes;
}

/** The ceiling as the page states it, saying so when this device set it. */
export function ceilingSentence(
  report: OperationCapabilityReport,
  limit: ToolFileLimit,
): string {
  const ceiling = formatBytes(ceilingBytes(report, limit));
  if (report.streamable)
    return `Up to ${ceiling} per file, because ${limit.because}. The file is read in slices, never held in memory whole.`;
  const narrowed =
    report.limitingFactor === 'device-heap' ||
    report.limitingFactor === 'operation-and-device-heap';
  return narrowed
    ? `Up to ${ceiling} per file on this device, because ${limit.because}.`
    : `Up to ${ceiling} per file, because ${limit.because}.`;
}

/** The refusal for a file that is over the ceiling, or `null` when it fits. */
export function oversizeMessage(
  report: OperationCapabilityReport,
  bytes: number,
  limit: ToolFileLimit,
  name?: string,
): string | null {
  if (bytes <= ceilingBytes(report, limit)) return null;
  const subject = name
    ? `${name} is ${formatBytes(bytes)}`
    : `That file is ${formatBytes(bytes)}`;
  return `${subject}. ${ceilingSentence(report, limit)}`;
}
