/**
 * Processing record (owner decision 15).
 *
 * A record lists only facts measured in this page at completion time or known
 * when the site was built. It copies the tool's operation name and reported
 * duration from the completion event, and deliberately NOT its `summary` or
 * `metrics`: tools put file facts there (sizes, page counts, results that can
 * include filenames), and `docs/LOCAL_PROCESSING_ASSURANCE.md` forbids those in
 * a receipt. It never claims that nothing left the device.
 *
 * The record lives in this module's memory. Nothing here sends it anywhere; it
 * leaves the page only when the person downloads it.
 */
import {
  contentSecurityPolicy,
  loadsLocalModel,
} from '../security/content-security-policy';
import { publicTools } from '../tools/catalog';
import {
  measureNetworkDuringJob,
  pageNetworkObservers,
  type NetworkMeasurement,
  type NetworkObserverState,
} from './network';

export const PROCESSING_RECORD_SCHEMA = 'opentools.processing-record/1';
/** Fired on `window` after a new record is stored. Carries no detail. */
export const PROCESSING_RECORD_EVENT = 'tools:processing-record';

export interface ProcessingRecord {
  schema: typeof PROCESSING_RECORD_SCHEMA;
  generatedAt: string;
  /** Pathname only: no query string, no fragment. */
  page: string;
  tool: {
    id: string | null;
    version: string | null;
    executionMode: string;
    basis: 'tool-manifest' | 'no-manifest-for-page';
  };
  operation: string;
  /** As reported by the tool, rounded to 0.1 ms. */
  durationMs: number;
  network: NetworkMeasurement & {
    method: 'resource-timing';
    window: 'requests-started-during-job';
  };
  policy: {
    contentSecurityPolicy: string;
    basis: 'configured-for-route';
    build: 'production' | 'development';
  };
  limitations: string[];
}

export const PROCESSING_RECORD_LIMITATIONS: readonly string[] = [
  'Measured by this page only. It cannot see browser extensions, other tabs, the operating system, or other devices.',
  'Requests made inside background workers are kept in the worker’s own timeline and are not listed here; blocked attempts inside workers are not counted either.',
  'Only requests that started during the job are listed. Requests still in progress when the job ended are not included.',
  'The job window is reconstructed from the duration the tool reported, so its edges can be off by a few milliseconds.',
  'If the browser’s timing buffer filled up, the request list may be incomplete.',
  'Blocked attempts appear only when the browser reported a policy violation to this page.',
  'The Content-Security-Policy shown is the one this build is configured to send for this page, not a copy of the headers the browser received.',
  'This record is not proof that no data left this device, and it is not an audit opinion or a certification.',
];

function manifestFor(pathname: string) {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/u, '') : pathname;
  return publicTools.find((tool) => tool.href === normalized);
}

function isDevelopmentBuild() {
  try {
    return process.env.NODE_ENV === 'development';
  } catch {
    return false;
  }
}

export interface BuildProcessingRecordInput {
  operation: string;
  durationMs: number;
  /** `location.pathname`; anything after `?` or `#` is discarded. */
  pathname: string;
  /** `performance.now()` at completion. */
  completedAt: number;
  generatedAt?: Date;
  observers?: NetworkObserverState;
  development?: boolean;
}

export function buildProcessingRecord({
  operation,
  durationMs,
  pathname,
  completedAt,
  generatedAt = new Date(),
  observers = pageNetworkObservers,
  development = isDevelopmentBuild(),
}: BuildProcessingRecordInput): ProcessingRecord {
  const page = (pathname.split(/[?#]/u)[0] || '/').slice(0, 200);
  const safeDuration = Number.isFinite(durationMs)
    ? Math.max(0, durationMs)
    : 0;
  const manifest = manifestFor(page);
  const network = measureNetworkDuringJob(
    observers,
    completedAt - safeDuration,
    completedAt,
  );

  return {
    schema: PROCESSING_RECORD_SCHEMA,
    generatedAt: generatedAt.toISOString(),
    page,
    tool: manifest
      ? {
          id: manifest.id,
          version: manifest.version,
          executionMode: manifest.execution.mode,
          basis: 'tool-manifest',
        }
      : {
          id: null,
          version: null,
          executionMode: 'not recorded',
          basis: 'no-manifest-for-page',
        },
    operation,
    durationMs: Math.round(safeDuration * 10) / 10,
    network: {
      method: 'resource-timing',
      window: 'requests-started-during-job',
      ...network,
    },
    policy: {
      contentSecurityPolicy: contentSecurityPolicy({
        development,
        localModel: loadsLocalModel(page),
      }),
      basis: 'configured-for-route',
      build: development ? 'development' : 'production',
    },
    limitations: [...PROCESSING_RECORD_LIMITATIONS],
  };
}

let latestRecord: ProcessingRecord | null = null;

export function getLatestProcessingRecord(): ProcessingRecord | null {
  return latestRecord;
}

/**
 * Called by `announceCompletion` with its already-normalized operation and
 * duration. Never throws: a failed measurement must not break the tool.
 */
export function captureProcessingRecord(detail: {
  operation: string;
  durationMs: number;
}): ProcessingRecord | null {
  if (typeof window === 'undefined' || typeof performance === 'undefined')
    return null;
  try {
    latestRecord = buildProcessingRecord({
      operation: detail.operation,
      durationMs: detail.durationMs,
      pathname: window.location?.pathname ?? '/',
      completedAt: performance.now(),
    });
    return latestRecord;
  } catch {
    return null;
  }
}

/** Dispatched after the completion event so its listeners are unaffected. */
export function notifyProcessingRecord() {
  if (typeof window === 'undefined' || !latestRecord) return;
  try {
    window.dispatchEvent(new Event(PROCESSING_RECORD_EVENT));
  } catch {
    /* Listeners re-read the record on their next render. */
  }
}

export function toJson(record: ProcessingRecord) {
  return `${JSON.stringify(record, null, 2)}\n`;
}

function formatDuration(durationMs: number) {
  return durationMs < 1000
    ? `${durationMs.toFixed(1)} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function toText(record: ProcessingRecord) {
  const { network, tool, policy } = record;
  const lines = [
    'OpenTools processing record',
    `Schema: ${record.schema}`,
    `Generated: ${record.generatedAt}`,
    '',
    `Page: ${record.page}`,
    tool.basis === 'tool-manifest'
      ? `Tool: ${tool.id} (version ${tool.version})`
      : 'Tool: not recorded (no tool manifest for this page)',
    tool.basis === 'tool-manifest'
      ? `Execution mode: ${tool.executionMode} (as declared in the tool manifest at build time)`
      : 'Execution mode: not recorded',
    `Operation: ${record.operation}`,
    `Duration: ${formatDuration(record.durationMs)} (as reported by the tool)`,
    '',
    'Network requests this page observed during the job',
    'Method: the browser’s Resource Timing list, requests that started during the job',
  ];

  if (!network.measured) {
    lines.push(
      'Not measured: this browser did not let the page read its Resource Timing list, so no request count is given.',
    );
  } else {
    lines.push(
      `Requests started during the job: ${network.requestsDuringJob ?? 0}`,
    );
    for (const entry of network.origins) {
      lines.push(
        `  ${entry.origin} (${entry.initiatorType}): ${plural(entry.count, 'request', 'requests')}`,
      );
    }
    lines.push(
      network.complete
        ? 'List complete: the timing buffer did not fill up.'
        : 'May be incomplete: the browser’s timing buffer filled up, so some requests may be missing from this list.',
    );
  }

  lines.push('', 'Loads blocked by the Content-Security-Policy during the job');
  if (!network.blockedAttemptsMeasured) {
    lines.push(
      'Not measured: this page could not listen for policy violation reports.',
    );
  } else {
    lines.push(
      `Blocked attempts reported to this page: ${network.blockedAttempts.reduce((sum, item) => sum + item.count, 0)}`,
    );
    for (const attempt of network.blockedAttempts) {
      lines.push(
        `  ${attempt.directive} blocked ${attempt.origin}: ${plural(attempt.count, 'time', 'times')}`,
      );
    }
    if (!network.blockedAttemptsComplete)
      lines.push(
        'May be incomplete: older violation reports were discarded to limit memory use.',
      );
  }

  lines.push(
    '',
    `Content-Security-Policy configured for this page in this ${policy.build} build`,
    '(Computed from the site’s build configuration, not read from the response headers.)',
    policy.contentSecurityPolicy,
    '',
    'Limitations',
    ...record.limitations.map((limitation) => `- ${limitation}`),
    '',
  );
  return lines.join('\n');
}
