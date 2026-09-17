import { afterEach, describe, expect, it, vi } from 'vitest';

import { COMPLETION_EVENT, announceCompletion } from '../completion';
import { contentSecurityPolicy } from '../security/content-security-policy';
import { publicTools } from '../tools/catalog';
import { processingRecordFilename } from './download';
import {
  installNetworkObservers,
  measureNetworkDuringJob,
  type EventTargetLike,
  type NetworkObserverEnvironment,
  type PerformanceLike,
} from './network';
import {
  PROCESSING_RECORD_EVENT,
  buildProcessingRecord,
  getLatestProcessingRecord,
  toJson,
  toText,
  type ProcessingRecord,
} from './record';

interface FakeEntry {
  name: string;
  startTime: number;
  initiatorType: string;
}

function fakeBrowser({
  entries = [] as FakeEntry[],
  supportsResource = true,
  hasGetEntries = true,
  now = 1_000,
} = {}) {
  const performanceListeners = new Map<string, () => void>();
  const documentListeners = new Map<string, (event: never) => void>();
  let clock = now;
  const setBufferSize = vi.fn();
  const performance: PerformanceLike = {
    now: () => clock,
    ...(hasGetEntries ? { getEntriesByType: () => entries } : {}),
    setResourceTimingBufferSize: setBufferSize,
    addEventListener: (type, listener) =>
      performanceListeners.set(type, listener),
  };
  const violationTarget: EventTargetLike = {
    addEventListener: (type, listener) => documentListeners.set(type, listener),
  };
  const environment: NetworkObserverEnvironment = {
    performance,
    supportedEntryTypes: supportsResource
      ? ['navigation', 'resource']
      : ['navigation'],
    violationTarget,
  };
  const observers = installNetworkObservers(environment);
  return {
    observers,
    entries,
    setBufferSize,
    setNow: (value: number) => {
      clock = value;
    },
    fireBufferFull: () =>
      performanceListeners.get('resourcetimingbufferfull')!(),
    fireViolation: (event: {
      effectiveDirective?: string;
      blockedURI?: string;
    }) =>
      (
        documentListeners.get('securitypolicyviolation') as unknown as (
          event: object,
        ) => void
      )(event),
  };
}

const CANARY_FILENAME = 'CANARY-secret-filename.pdf';
const CANARY_SIZE = '12345678';
const CANARY_QUERY = 'CANARYQUERY';

function everyKey(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => everyKey(item, keys));
  else if (value && typeof value === 'object')
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      everyKey(nested, keys);
    }
  return keys;
}

function expectNoForbiddenClaims(output: string) {
  for (const phrase of [
    '0 file bytes uploaded',
    'zero egress',
    'zero network egress',
    '100%',
    'secure',
    'guarantee',
    'certified',
    'compliant',
  ])
    expect(output.toLowerCase()).not.toContain(phrase);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('processing record: no user content', () => {
  it('copies neither summary, metrics, filename, size nor query string', () => {
    const browser = fakeBrowser({
      entries: [
        {
          name: `https://localhost:8788/_next/static/chunk.js?file=${CANARY_FILENAME}&size=${CANARY_SIZE}#${CANARY_QUERY}`,
          startTime: 950,
          initiatorType: 'script',
        },
      ],
    });
    const dispatched: Event[] = [];
    vi.stubGlobal('window', {
      location: {
        pathname: '/pdf/compress',
        search: `?name=${CANARY_FILENAME}&q=${CANARY_QUERY}`,
        href: `https://localhost:8788/pdf/compress?name=${CANARY_FILENAME}&q=${CANARY_QUERY}`,
      },
      dispatchEvent: (event: Event) => dispatched.push(event),
    });
    vi.stubGlobal('performance', { now: () => 1_000 });

    announceCompletion({
      operation: 'PDF compressor',
      durationMs: 100,
      summary: `${CANARY_FILENAME} was ${CANARY_SIZE} bytes`,
      metrics: [
        { label: 'File', value: CANARY_FILENAME },
        { label: 'Before', value: `${CANARY_SIZE} B` },
      ],
    });

    const stored = getLatestProcessingRecord();
    expect(stored).not.toBeNull();
    // The stored record was measured with the page observers (none in Node);
    // rebuild the same completion against the fake browser to cover URLs too.
    const record = buildProcessingRecord({
      operation: stored!.operation,
      durationMs: stored!.durationMs,
      pathname: `/pdf/compress?name=${CANARY_FILENAME}#${CANARY_QUERY}`,
      completedAt: 1_000,
      observers: browser.observers,
      development: false,
    });

    for (const candidate of [stored!, record]) {
      const outputs = [toJson(candidate), toText(candidate)];
      for (const output of outputs) {
        expect(output).not.toContain('CANARY');
        expect(output).not.toContain(CANARY_SIZE);
        expect(output).not.toContain('?');
        expect(output).not.toContain('chunk.js');
        expectNoForbiddenClaims(output);
      }
      const forbiddenKey =
        /^(file ?name|name|filename|size|file ?size|bytes|\w*bytes|\w*size|hash|sha\d*|checksum|content|text|summary|metrics|query|search|url|href)$/iu;
      expect(
        everyKey(candidate).filter((key) => forbiddenKey.test(key)),
      ).toEqual([]);
      expect(candidate.operation).toBe('PDF compressor');
    }
    expect(record.page).toBe('/pdf/compress');
    expect(record.network.origins).toEqual([
      { origin: 'https://localhost:8788', initiatorType: 'script', count: 1 },
    ]);
  });

  it('keeps the completion event payload unchanged and notifies after it', () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent, location: { pathname: '/' } });

    announceCompletion({
      operation: 'Merge PDF',
      durationMs: 12,
      summary: 'Two PDFs merged.',
      metrics: [{ label: 'Files', value: '2' }],
    });

    const [first, second] = dispatchEvent.mock.calls.map(
      ([event]) => event as CustomEvent,
    );
    expect(first!.type).toBe(COMPLETION_EVENT);
    expect(first!.detail).toEqual({
      operation: 'Merge PDF',
      durationMs: 12,
      summary: 'Two PDFs merged.',
      metrics: [{ label: 'Files', value: '2' }],
    });
    expect(second!.type).toBe(PROCESSING_RECORD_EVENT);
    expect((second as CustomEvent).detail ?? null).toBeNull();
  });

  it('names downloads after the operation and time, never a file', () => {
    const record = buildProcessingRecord({
      operation: 'Image optimizer',
      durationMs: 5,
      pathname: '/image/optimize',
      completedAt: 10,
      generatedAt: new Date(2026, 8, 17, 9, 5),
      observers: fakeBrowser().observers,
    });
    expect(processingRecordFilename(record, 'text')).toBe(
      'processing-record-image-optimizer-20260917-0905.txt',
    );
    expect(processingRecordFilename(record, 'json')).toBe(
      'processing-record-image-optimizer-20260917-0905.json',
    );
  });
});

describe('processing record: network measurement', () => {
  function record(
    browser: ReturnType<typeof fakeBrowser>,
    overrides: Partial<Parameters<typeof buildProcessingRecord>[0]> = {},
  ): ProcessingRecord {
    return buildProcessingRecord({
      operation: 'PDF merge',
      durationMs: 200,
      pathname: '/pdf/merge',
      completedAt: 1_000,
      observers: browser.observers,
      development: false,
      ...overrides,
    });
  }

  it('says the network was not measured when Resource Timing is unsupported', () => {
    for (const browser of [
      fakeBrowser({ supportsResource: false }),
      fakeBrowser({ hasGetEntries: false }),
    ]) {
      const result = record(browser);
      expect(result.network.measured).toBe(false);
      expect(result.network.complete).toBe(false);
      expect(result.network.requestsDuringJob).toBeNull();
      const text = toText(result);
      expect(text).toContain('Not measured');
      expect(text).not.toMatch(/Requests started during the job: 0/u);
      expect(text).not.toMatch(/\b0 requests\b/u);
    }
  });

  it('marks the list incomplete when the timing buffer filled up', () => {
    const browser = fakeBrowser({
      entries: [
        {
          name: 'https://localhost:8788/a.js',
          startTime: 900,
          initiatorType: 'script',
        },
      ],
    });
    expect(record(browser).network.complete).toBe(true);
    browser.setNow(850);
    browser.fireBufferFull();
    const result = record(browser);
    expect(result.network.measured).toBe(true);
    expect(result.network.complete).toBe(false);
    expect(toText(result)).toContain('may be incomplete');
  });

  it('marks the list incomplete when the buffer is already at its limit', () => {
    const browser = fakeBrowser();
    expect(browser.setBufferSize).toHaveBeenCalledWith(1000);
    for (let index = 0; index < 1000; index += 1)
      browser.entries.push({
        name: `https://localhost:8788/early-${index}.js`,
        startTime: 1,
        initiatorType: 'script',
      });
    expect(record(browser).network.complete).toBe(false);
  });

  it('counts only requests that started inside the job window, by origin', () => {
    const browser = fakeBrowser({
      entries: [
        {
          name: 'https://localhost:8788/before.js?x=1',
          startTime: 799.9,
          initiatorType: 'script',
        },
        {
          name: 'https://localhost:8788/_next/static/worker.js?v=abc',
          startTime: 800,
          initiatorType: 'other',
        },
        {
          name: 'https://localhost:8788/chunk-1.js',
          startTime: 850,
          initiatorType: 'script',
        },
        {
          name: 'https://localhost:8788/chunk-2.js?token=secret',
          startTime: 999,
          initiatorType: 'script',
        },
        {
          name: 'https://third-party.example/pixel.gif?id=42',
          startTime: 1_000,
          initiatorType: 'img',
        },
        {
          name: 'https://third-party.example/late.js',
          startTime: 1_000.1,
          initiatorType: 'script',
        },
        {
          name: 'data:image/png;base64,AAAA',
          startTime: 900,
          initiatorType: 'img',
        },
      ],
    });
    const result = record(browser);
    expect(result.network.requestsDuringJob).toBe(5);
    expect(result.network.origins).toEqual([
      { origin: 'data:', initiatorType: 'img', count: 1 },
      { origin: 'https://localhost:8788', initiatorType: 'other', count: 1 },
      { origin: 'https://localhost:8788', initiatorType: 'script', count: 2 },
      { origin: 'https://third-party.example', initiatorType: 'img', count: 1 },
    ]);
    for (const output of [toJson(result), toText(result)]) {
      for (const leaked of [
        'before.js',
        'worker.js',
        'chunk-',
        'token',
        'secret',
        'pixel.gif',
        'id=42',
        'base64',
        'late.js',
        '/_next/',
      ])
        expect(output).not.toContain(leaked);
    }
  });

  it('counts blocked attempts only inside the window, by directive and origin', () => {
    const browser = fakeBrowser();
    browser.setNow(700);
    browser.fireViolation({
      effectiveDirective: 'connect-src',
      blockedURI: 'https://collector.example/before?leak=1',
    });
    browser.setNow(900);
    browser.fireViolation({
      effectiveDirective: 'connect-src',
      blockedURI:
        'https://collector.example/upload?name=CANARY-secret-filename.pdf',
    });
    browser.fireViolation({
      effectiveDirective: 'connect-src',
      blockedURI: 'https://collector.example/other/path',
    });
    browser.fireViolation({
      effectiveDirective: 'img-src',
      blockedURI: 'https://pixels.example/p.gif',
    });
    browser.fireViolation({
      effectiveDirective: 'script-src-elem',
      blockedURI: 'inline',
    });
    browser.setNow(1_200);
    browser.fireViolation({
      effectiveDirective: 'connect-src',
      blockedURI: 'https://collector.example/after',
    });

    const result = record(browser);
    expect(result.network.blockedAttemptsMeasured).toBe(true);
    expect(result.network.blockedAttemptsComplete).toBe(true);
    expect(result.network.blockedAttempts).toEqual([
      {
        directive: 'connect-src',
        origin: 'https://collector.example',
        count: 2,
      },
      { directive: 'img-src', origin: 'https://pixels.example', count: 1 },
    ]);
    const text = toText(result);
    expect(text).toContain('Blocked attempts reported to this page: 3');
    for (const output of [text, toJson(result)]) {
      expect(output).not.toContain('/upload');
      expect(output).not.toContain('CANARY');
      expect(output).not.toContain('p.gif');
      expect(output).not.toContain('leak');
    }
  });

  it('says blocked attempts were not measured without a violation listener', () => {
    const observers = installNetworkObservers({
      performance: { now: () => 0, getEntriesByType: () => [] },
    });
    const result = measureNetworkDuringJob(observers, 0, 10);
    expect(result.blockedAttemptsMeasured).toBe(false);
    const text = toText(
      buildProcessingRecord({
        operation: 'UUID generator',
        durationMs: 10,
        pathname: '/developer/uuid-generator',
        completedAt: 10,
        observers,
      }),
    );
    expect(text).toContain(
      'Not measured: this page could not listen for policy violation reports.',
    );
  });
});

describe('processing record: build facts', () => {
  it('uses the CSP configured for a local-model route and a normal route', () => {
    const observers = fakeBrowser().observers;
    const build = (pathname: string) =>
      buildProcessingRecord({
        operation: 'Job',
        durationMs: 1,
        pathname,
        completedAt: 1,
        observers,
        development: false,
      });

    const localModel = build('/image/editor');
    expect(localModel.policy).toEqual({
      contentSecurityPolicy: contentSecurityPolicy({ localModel: true }),
      basis: 'configured-for-route',
      build: 'production',
    });
    expect(localModel.policy.contentSecurityPolicy).toContain(
      "connect-src 'self'",
    );

    const normal = build('/pdf/merge');
    expect(normal.policy.contentSecurityPolicy).toBe(contentSecurityPolicy());
    expect(normal.policy.contentSecurityPolicy).toContain("connect-src 'none'");
    expect(toText(normal)).toContain('not read from the response headers');
  });

  it('takes execution mode from the manifest for the page, or says not recorded', () => {
    const observers = fakeBrowser().observers;
    for (const manifest of publicTools) {
      const result = buildProcessingRecord({
        operation: 'Job',
        durationMs: 1,
        pathname: `${manifest.href}/`,
        completedAt: 1,
        observers,
      });
      expect(result.tool).toEqual({
        id: manifest.id,
        version: manifest.version,
        executionMode: manifest.execution.mode,
        basis: 'tool-manifest',
      });
    }

    const unknown = buildProcessingRecord({
      operation: 'AI background remover',
      durationMs: 1,
      pathname: '/image/background-remover',
      completedAt: 1,
      observers,
    });
    expect(unknown.tool.executionMode).toBe('not recorded');
    expect(toText(unknown)).toContain('Execution mode: not recorded');
  });

  it('states its limits and makes no guarantee language', () => {
    const result = buildProcessingRecord({
      operation: 'Job',
      durationMs: 1,
      pathname: '/text/workbench',
      completedAt: 1,
      observers: fakeBrowser().observers,
    });
    const text = toText(result);
    for (const limit of [
      'browser extensions',
      'other tabs',
      'operating system',
      'other devices',
      'still in progress',
      'may be incomplete',
      'not a copy of the headers',
      'not proof that no data left this device',
      'certification',
    ])
      expect(text).toContain(limit);
    expectNoForbiddenClaims(text);
    expectNoForbiddenClaims(toJson(result));
  });
});
