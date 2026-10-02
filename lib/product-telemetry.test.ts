import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COMPLETION_EVENT, announceCompletion } from './completion';
import {
  PRODUCT_SIGNALS,
  SIGNAL_PATHS,
  TELEMETRY_OPT_OUT_KEY,
  TELEMETRY_PREFIX,
  inFlightSignalCount,
  isStandaloneDocument,
  productSignalsEnabled,
  recordCompletionSignal,
  recordProductSignal,
  resetProductTelemetryForTests,
  setProductSignalsEnabled,
  signalsSuppressed,
  type ProductSignal,
} from './product-telemetry';

const projectRoot = path.resolve(import.meta.dirname, '..');
const read = (relative: string) =>
  readFileSync(path.join(projectRoot, relative), 'utf8');

/**
 * A browser, assembled from the smallest set of globals this module touches.
 *
 * `requested` is every URL an `Image` was pointed at, verbatim and in order —
 * the whole surface of what leaves the page. Every privacy assertion below is
 * made against that array rather than against what the source says it does.
 */
interface FakeBrowser {
  requested: string[];
  settle: (how: 'load' | 'error') => void;
  store: Map<string, string>;
}

function browser(
  options: {
    standalone?: boolean;
    safariStandalone?: boolean;
    gpc?: boolean;
    dnt?: string | null;
    optedOut?: boolean;
    imageThrows?: boolean;
    offline?: boolean;
  } = {},
): FakeBrowser {
  const requested: string[] = [];
  const pending: { onload?: () => void; onerror?: () => void }[] = [];
  const store = new Map<string, string>();
  if (options.optedOut) store.set(TELEMETRY_OPT_OUT_KEY, 'off');

  class FakeImage {
    onload?: () => void;
    onerror?: () => void;
    decoding = 'auto';
    #src = '';
    constructor() {
      if (options.imageThrows) throw new Error('images are unavailable here');
      pending.push(this);
    }
    set src(value: string) {
      this.#src = value;
      requested.push(value);
    }
    get src() {
      return this.#src;
    }
  }

  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({
      matches: Boolean(options.standalone) && query.includes('standalone'),
    }),
  });
  vi.stubGlobal('navigator', {
    // `onLine` is left absent unless asked for, so every other case here runs
    // the path a real online browser runs: `undefined === false` is false.
    ...(options.offline ? { onLine: false } : {}),
    ...(options.safariStandalone ? { standalone: true } : {}),
    ...(options.gpc ? { globalPrivacyControl: true } : {}),
    ...(options.dnt === undefined ? {} : { doNotTrack: options.dnt }),
  });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });

  return {
    requested,
    store,
    settle: (how) => {
      for (const image of pending.splice(0)) image[`on${how}`]?.();
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetProductTelemetryForTests();
});

describe('the event set is closed', () => {
  it('declares exactly nine signals and a path for each', () => {
    expect(PRODUCT_SIGNALS).toHaveLength(9);
    expect(Object.keys(SIGNAL_PATHS).sort()).toEqual(
      [...PRODUCT_SIGNALS].sort(),
    );
    expect(new Set(Object.values(SIGNAL_PATHS)).size).toBe(9);
  });

  it('maps every signal to a literal path under the versioned prefix', () => {
    for (const signal of PRODUCT_SIGNALS) {
      const target = SIGNAL_PATHS[signal];
      expect(target.startsWith(TELEMETRY_PREFIX), target).toBe(true);
      expect(target.endsWith('.svg'), target).toBe(true);
      // MUTATION GUARD. Replacing a fixed path with a query-bearing or
      // cache-busted one fails here, which is the whole point of the map
      // being literal rather than templated from the event name.
      expect(target).not.toMatch(/[?#]/u);
      expect(target).toMatch(/^\/telemetry\/v1\/[a-z-]+\.svg$/u);
    }
  });

  it('refuses an event that is not one of the nine', () => {
    const fake = browser();
    for (const rejected of [
      'completed-web?tool=pdf-merge',
      '/telemetry/v1/completed-web.svg',
      'toString',
      'constructor',
      '__proto__',
      '',
    ]) {
      expect(recordProductSignal(rejected as ProductSignal)).toBe(false);
    }
    expect(fake.requested).toEqual([]);
  });

  it('builds no query string, fragment, body or absolute host', () => {
    const fake = browser();
    for (const signal of PRODUCT_SIGNALS) recordProductSignal(signal);
    expect(fake.requested).toEqual(PRODUCT_SIGNALS.map((s) => SIGNAL_PATHS[s]));
    for (const url of fake.requested) {
      expect(url).not.toContain('?');
      expect(url).not.toContain('#');
      expect(url).not.toContain('://');
      expect(url.startsWith('/telemetry/v1/')).toBe(true);
    }
  });
});

describe('no user, file or tool content can reach a signal', () => {
  it('takes one closed-union argument and nothing else', () => {
    // `recordProductSignal` has arity 1 and `recordCompletionSignal` arity 0,
    // so there is no parameter a caller could hang a detail on. Checked at
    // runtime as well as in the types, because a type is erased and this is
    // the property the privacy claim rests on.
    expect(recordProductSignal.length).toBe(1);
    expect(recordCompletionSignal.length).toBe(0);
  });

  it('sends nothing derived from a completed job', () => {
    const fake = browser();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      dispatchEvent,
      matchMedia: () => ({ matches: false }),
    });

    announceCompletion({
      operation: 'Merge PDF',
      durationMs: 1234.5,
      summary: 'Merged passport-scan.pdf and bank-statement.pdf',
      metrics: [{ label: 'Pages', value: '42' }],
      recipe: { id: 'image-optimize', values: { format: 'png' } },
    });

    // The receipt still receives everything it always did.
    expect(dispatchEvent).toHaveBeenCalled();
    // The counter received one fixed path and no trace of any of it.
    expect(fake.requested).toEqual(['/telemetry/v1/completed-web.svg']);
    const sent = fake.requested.join(' ');
    for (const secret of [
      'passport-scan',
      'bank-statement',
      'Merge PDF',
      'merge',
      '1234',
      '42',
      'Pages',
      'image-optimize',
      'png',
    ]) {
      expect(sent.toLowerCase()).not.toContain(secret.toLowerCase());
    }
  });

  it('names no third-party host anywhere in the module', () => {
    const source = read('lib/product-telemetry.ts');
    const urls = source.match(/https?:\/\/[^\s'"`)]+/gu) ?? [];
    expect(urls).toEqual([]);
    expect(source).not.toMatch(/getopentools\.com/u);
  });

  it('uses no network primitive other than an image', () => {
    const source = read('lib/product-telemetry.ts');
    for (const primitive of [
      'fetch(',
      'XMLHttpRequest',
      'sendBeacon',
      'WebSocket',
      'EventSource',
      'navigator.connection',
    ]) {
      // The prose above mentions these by name, so only code is inspected.
      const code = source.replace(/\/\*[\s\S]*?\*\//gu, '');
      expect(code, primitive).not.toContain(primitive);
    }
  });
});

describe('one success per document', () => {
  it('sends exactly one signal for the first completion', () => {
    const fake = browser();
    expect(recordCompletionSignal()).toBe(true);
    expect(fake.requested).toEqual(['/telemetry/v1/completed-web.svg']);
  });

  it('sends nothing for a second completion in the same document', () => {
    const fake = browser();
    recordCompletionSignal();
    expect(recordCompletionSignal()).toBe(false);
    expect(recordCompletionSignal()).toBe(false);
    expect(fake.requested).toEqual(['/telemetry/v1/completed-web.svg']);
  });

  it('is not defeated by announceCompletion being called repeatedly', () => {
    const fake = browser();
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
      matchMedia: () => ({ matches: false }),
    });
    for (let run = 0; run < 5; run += 1) {
      announceCompletion({ operation: `run ${run}`, durationMs: run });
    }
    expect(fake.requested).toHaveLength(1);
  });

  it('chooses the PWA path in standalone display mode', () => {
    const fake = browser({ standalone: true });
    expect(isStandaloneDocument()).toBe(true);
    recordCompletionSignal();
    expect(fake.requested).toEqual(['/telemetry/v1/completed-pwa.svg']);
  });

  it("honours Safari's own standalone flag, which predates the media query", () => {
    const fake = browser({ safariStandalone: true });
    expect(isStandaloneDocument()).toBe(true);
    recordCompletionSignal();
    expect(fake.requested).toEqual(['/telemetry/v1/completed-pwa.svg']);
  });

  it('chooses the web path in an ordinary browser tab', () => {
    const fake = browser();
    expect(isStandaloneDocument()).toBe(false);
    recordCompletionSignal();
    expect(fake.requested).toEqual(['/telemetry/v1/completed-web.svg']);
  });
});

describe('the request is held against garbage collection', () => {
  it('keeps the image until it loads or fails, then releases it', () => {
    const fake = browser();
    recordProductSignal('completed-web');
    expect(inFlightSignalCount()).toBe(1);
    fake.settle('load');
    expect(inFlightSignalCount()).toBe(0);

    recordProductSignal('pwa-launch');
    expect(inFlightSignalCount()).toBe(1);
    fake.settle('error');
    expect(inFlightSignalCount()).toBe(0);
  });

  it('never retries a failed signal', () => {
    const fake = browser();
    recordProductSignal('completed-web');
    fake.settle('error');
    expect(fake.requested).toEqual(['/telemetry/v1/completed-web.svg']);
  });
});

describe('a browser that knows it has no network is not asked to count', () => {
  /*
    The offline payload does not hold these assets, on purpose: ADR-020's
    promise is that an installed app opened with no network sends nothing and
    the event is permanently uncounted. Issuing a request that can only fail
    kept the second half of that and broke the first, and
    `e2e/offline-cold-start.spec.ts` failed on exactly that — it records every
    request that fails while offline and requires the list to be empty, so eight
    precached tools reported `/telemetry/v1/completed-web.svg
    (net::ERR_INTERNET_DISCONNECTED)`.
  */
  it('sends nothing when navigator.onLine is false', () => {
    const fake = browser({ offline: true });
    expect(recordProductSignal('completed-web')).toBe(false);
    expect(fake.requested).toEqual([]);
  });

  it('spends the once-per-document completion even on a lost signal', () => {
    // The guard is about counting a visit once, not about how many times the
    // attempt was made, so an offline attempt still consumes it. Asserting the
    // behaviour either way beats discovering it later: a visitor who finishes a
    // job offline is uncounted for that document, which ADR-020 records as one
    // of the known undercounts.
    const fake = browser({ offline: true });
    expect(recordCompletionSignal()).toBe(false);
    expect(fake.requested).toEqual([]);
  });

  it('queues nothing, so reconnecting replays no missed signal', () => {
    // The offline completion is spent. Coming back online must not release it:
    // a replay would be state held about somebody's work, and ADR-020 takes the
    // undercount instead. Nothing above asserts this — the once-per-document
    // flag and the offline guard are separate, and only their combination says
    // a reconnection sends nothing.
    const offlineBrowser = browser({ offline: true });
    expect(recordCompletionSignal()).toBe(false);
    expect(offlineBrowser.requested).toEqual([]);

    vi.stubGlobal('navigator', { onLine: true });
    recordCompletionSignal();
    expect(
      offlineBrowser.requested,
      'a signal was held while offline and sent on reconnection',
    ).toEqual([]);
  });

  it('counts normally when onLine is true, and when it is absent', () => {
    // The negative direction only. A browser reporting online may still have no
    // route out, and that case must keep attempting: it is indistinguishable
    // from a working network until the request fails.
    const absent = browser();
    expect(recordProductSignal('completed-web')).toBe(true);
    expect(absent.requested).toEqual(['/telemetry/v1/completed-web.svg']);

    // And the half the title promises but a first version of this did not
    // cover: an explicit `true`, which is the captive-portal case.
    resetProductTelemetryForTests();
    const online = browser();
    vi.stubGlobal('navigator', { onLine: true });
    expect(recordProductSignal('pwa-launch')).toBe(true);
    expect(online.requested).toEqual(['/telemetry/v1/pwa-launch.svg']);
  });
});

describe('a refusal to be counted is honoured', () => {
  it('sends nothing under Global Privacy Control', () => {
    const fake = browser({ gpc: true });
    expect(signalsSuppressed()).toBe(true);
    expect(recordProductSignal('completed-web')).toBe(false);
    expect(fake.requested).toEqual([]);
  });

  it('sends nothing under Do Not Track', () => {
    for (const value of ['1', 'yes']) {
      const fake = browser({ dnt: value });
      expect(recordProductSignal('completed-web')).toBe(false);
      expect(fake.requested).toEqual([]);
      vi.unstubAllGlobals();
    }
  });

  it('sends nothing when this browser has opted out locally', () => {
    const fake = browser({ optedOut: true });
    expect(productSignalsEnabled()).toBe(false);
    expect(recordProductSignal('completed-web')).toBe(false);
    expect(recordCompletionSignal()).toBe(false);
    expect(fake.requested).toEqual([]);
  });

  it('can be switched off and back on from the privacy page', () => {
    const fake = browser();
    expect(productSignalsEnabled()).toBe(true);
    setProductSignalsEnabled(false);
    expect(productSignalsEnabled()).toBe(false);
    expect(recordProductSignal('pwa-launch')).toBe(false);
    setProductSignalsEnabled(true);
    expect(recordProductSignal('pwa-launch')).toBe(true);
    expect(fake.requested).toEqual(['/telemetry/v1/pwa-launch.svg']);
  });

  it('counts nothing at all during server rendering', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('Image', undefined);
    expect(recordProductSignal('completed-web')).toBe(false);
    expect(isStandaloneDocument()).toBe(false);
  });
});

describe('a counter can never make a finished job look unfinished', () => {
  /**
   * `announceCompletion` dispatches two events — the receipt and the older
   * `tool-executed` the milestone counter listens for — so counting every
   * dispatch would pass whether or not the receipt was among them.
   */
  const receipts = (dispatchEvent: ReturnType<typeof vi.fn>) =>
    dispatchEvent.mock.calls.filter(
      ([event]) => (event as Event).type === COMPLETION_EVENT,
    ).length;

  it('still dispatches the receipt when the image constructor throws', () => {
    browser({ imageThrows: true });
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      dispatchEvent,
      matchMedia: () => ({ matches: false }),
    });
    expect(() =>
      announceCompletion({ operation: 'Merge PDF', durationMs: 5 }),
    ).not.toThrow();
    expect(receipts(dispatchEvent)).toBe(1);
  });

  it('still dispatches the receipt when storage is unreadable', () => {
    browser();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      dispatchEvent,
      matchMedia: () => ({ matches: false }),
    });
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
      removeItem() {
        throw new Error('blocked');
      },
    });
    expect(() =>
      announceCompletion({ operation: 'Merge PDF', durationMs: 5 }),
    ).not.toThrow();
    expect(receipts(dispatchEvent)).toBe(1);
  });
});

describe('the install funnel says only what the browser said', () => {
  const source = read('lib/pwa-install.ts');

  it('counts an installation only from the appinstalled event', () => {
    // MUTATION GUARD. Moving `pwa-installed` onto `beforeinstallprompt`, or
    // onto the install button, fails here.
    const installedAt = source.indexOf("recordProductSignal('pwa-installed')");
    expect(installedAt).toBeGreaterThan(-1);
    const beforeBlock = source.slice(
      source.indexOf("addEventListener('beforeinstallprompt'"),
      source.indexOf("addEventListener('appinstalled'"),
    );
    expect(beforeBlock).not.toContain('recordProductSignal');
  });

  it('reads acceptance from userChoice rather than inferring it from a tap', () => {
    expect(source).toContain('event.userChoice');
    const dialog = source.slice(
      source.indexOf('export async function showInstallDialog'),
    );
    expect(dialog).toContain("recordProductSignal('install-prompt-accepted')");
    expect(dialog).toContain("recordProductSignal('install-prompt-dismissed')");
    // A dismissal must not be able to reach the installation counter.
    expect(dialog).not.toContain("recordProductSignal('pwa-installed')");
  });

  it('announces the prompt only when this product actually shows it', () => {
    const banner = read('components/install-prompt.tsx');
    expect(banner).toContain("recordProductSignal('install-prompt-shown')");
    // MUTATION GUARD. The signal has to be gated on the banner being visible,
    // not on Chrome having fired `beforeinstallprompt` — the `deferred` store
    // is true for visitors who are never asked anything.
    expect(banner).toMatch(
      /if \(!visible \|\| announcedShown\.current\) return;/u,
    );
  });
});

describe('the openings that can be told apart, and the one that cannot', () => {
  it('records a file handler only when a file handle actually arrived', () => {
    const landing = read('components/share-target-landing.tsx');
    const consumer = landing.slice(landing.indexOf('queue.setConsumer'));
    expect(consumer).toContain('if (!handle) return;');
    expect(
      consumer.indexOf('if (!handle) return;'),
      'the signal must sit after the guard, or a plain launch is counted',
    ).toBeLessThan(
      consumer.indexOf("recordProductSignal('file-handler-opened')"),
    );
  });

  it('records a share only for an arrival the service worker produced', () => {
    const collector = read('components/handed-over-file.tsx');
    expect(collector).toContain("recordProductSignal('share-target-opened')");
    // The marker has to be read BEFORE `noteFileWaiting` raises it, or every
    // arrival looks like a share.
    expect(collector.indexOf('fileWaitingMarkerPresent()')).toBeLessThan(
      collector.indexOf('noteFileWaiting();'),
    );
  });

  it('never mentions a shared file in anything it records', () => {
    for (const file of [
      'components/share-target-landing.tsx',
      'components/handed-over-file.tsx',
    ]) {
      const calls = read(file).match(/recordProductSignal\([^)]*\)/gu) ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call, file).toMatch(/^recordProductSignal\('[a-z-]+'\)$/u);
      }
    }
  });
});

describe('every call site in the app passes a literal, and only a literal', () => {
  it('has no call anywhere that could carry a variable', () => {
    const files = [
      'lib/completion.ts',
      'lib/pwa-install.ts',
      'components/install-prompt.tsx',
      'components/product-signals.tsx',
      'components/share-target-landing.tsx',
      'components/handed-over-file.tsx',
    ];
    const offenders: string[] = [];
    for (const file of files) {
      for (const call of read(file).match(/recordProductSignal\([^)]*\)/gu) ??
        []) {
        if (!/^recordProductSignal\('[a-z-]+'\)$/u.test(call)) {
          offenders.push(`${file}: ${call}`);
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
