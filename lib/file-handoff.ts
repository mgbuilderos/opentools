/**
 * Carrying a dropped file from the smart dropzone to the tool you picked.
 *
 * The dropzone used to read a file's name to guess a tool and then throw the
 * file away, so picking a tool landed you on an empty page with the file still
 * sitting on your desk. On a phone, choosing it again is most of the work.
 *
 * Every link in this app is a plain `<a>`, so every navigation is a full page
 * load and nothing in memory survives it. The file therefore has to be put
 * somewhere the next page can reach:
 *
 * - **IndexedDB, not `sessionStorage`.** IndexedDB stores a Blob as it is;
 *   `sessionStorage` holds strings, so a file would have to be base64'd — a
 *   third larger, and over the ~5 MB limit for most real PDFs.
 * - **It never leaves the device.** This is the browser's own storage on the
 *   same machine the file already came from. Nothing is uploaded, and the
 *   page's `connect-src 'none'` means nothing could be.
 * - **It is deleted the moment it is picked up**, and anything older than a few
 *   minutes is discarded on read, so a file cannot be left behind by someone
 *   who changed their mind.
 *
 * Every failure here is silent and harmless: if storage is unavailable — a
 * private window, a browser with it switched off — the tool page simply opens
 * empty, which is exactly what it did before.
 */

const DATABASE = 'opentools-handoff';
const STORE = 'pending';
const KEY = 'file';

/**
 * Where IndexedDB is unavailable — measured: WebKit refuses to open it on this
 * site, and mobile Safari is WebKit, which is where this bug was reported —
 * the file goes through `sessionStorage` instead. That means base64, a third
 * larger and capped by the ~5 MB string limit, so it only applies to files
 * small enough to survive the trip. Anything larger simply is not carried, and
 * the tool page opens empty exactly as it did before.
 */
const SESSION_KEY = 'opentools-handoff-file';

/**
 * A cheap synchronous marker saying a file is waiting.
 *
 * Without it, every page load on the whole site opened IndexedDB just to
 * discover there was nothing there. Measured: in WebKit that stalled unrelated
 * pages — `e2e/pdf-sign.spec.ts` went from 14/14 in 13s to two tests timing out
 * at three minutes each, purely from mounting the collector. Checking a flag
 * first means a normal page load touches no storage at all.
 */
const WAITING_KEY = 'opentools-handoff-waiting';
export const SESSION_FALLBACK_MAX_BYTES = 3 * 1024 * 1024;

/** A file nobody collected is not worth keeping. */
export const HANDOFF_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * The file is stored as **bytes plus its name and type**, not as a `File`.
 *
 * WebKit refuses to put a `Blob` or a `File` into IndexedDB on this site: the
 * write transaction errors, `tx.error` is `null`, `put()` throws nothing, and
 * the write simply never lands. A string, an `ArrayBuffer` and a typed array
 * all store fine in the same database and the same kind of transaction.
 * Measured per value kind, each in its own transaction, against the production
 * build:
 *
 *   WebKit    string stored · ArrayBuffer stored · Uint8Array stored
 *             Blob  TX ERROR · File        TX ERROR
 *   Chromium  all five stored
 *
 * That is why this handoff worked in Chrome and not on an iPhone. It is also
 * why the `sessionStorage` fallback never helped: it is reached only when
 * IndexedDB is *unavailable*, and here IndexedDB opens perfectly well — it is
 * the write that fails.
 *
 * An older record holding a `File` fails the `instanceof ArrayBuffer` check
 * below and is discarded like any other unusable record, so no migration is
 * needed.
 */
interface StoredHandoff {
  bytes: ArrayBuffer;
  name: string;
  type: string;
  storedAt: number;
}

/** Storage that never answers is storage that is not available. */
const OPEN_TIMEOUT_MS = 2000;

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    // `indexedDB.open` can hang rather than fail. Never let it hold anything up.
    const giveUp = setTimeout(() => resolve(null), OPEN_TIMEOUT_MS);
    const settle = (value: IDBDatabase | null) => {
      clearTimeout(giveUp);
      resolve(value);
    };
    if (typeof indexedDB === 'undefined') {
      settle(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE, 1);
    } catch {
      settle(null);
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => settle(request.result);
    request.onerror = () => settle(null);
    request.onblocked = () => settle(null);
  });
}

function finish(database: IDBDatabase) {
  try {
    database.close();
  } catch {
    // A database that will not close is still a database we are done with.
  }
}

/**
 * Hands a file to whichever tool page opens next. Resolves once the file is
 * safely stored, so the caller can navigate straight afterwards.
 */
async function offerViaSession(file: File): Promise<boolean> {
  if (typeof sessionStorage === 'undefined') return false;
  if (file.size > SESSION_FALLBACK_MAX_BYTES) return false;
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (const byte of buffer) binary += String.fromCharCode(byte);
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        name: file.name,
        type: file.type,
        storedAt: Date.now(),
        base64: btoa(binary),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

function takeFromSession(): File | null {
  if (typeof sessionStorage === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as {
      name: string;
      type: string;
      storedAt: number;
      base64: string;
    };
    if (Date.now() - stored.storedAt > HANDOFF_MAX_AGE_MS) return null;
    const binary = atob(stored.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes as BlobPart], stored.name, { type: stored.type });
  } catch {
    return null;
  }
}

function markWaiting() {
  try {
    sessionStorage?.setItem(WAITING_KEY, '1');
  } catch {
    // Without the marker the file simply is not collected. Nothing breaks.
  }
}

function clearWaiting(): boolean {
  try {
    const waiting = sessionStorage?.getItem(WAITING_KEY) === '1';
    sessionStorage?.removeItem(WAITING_KEY);
    return waiting;
  } catch {
    return false;
  }
}

export async function offerFile(file: File): Promise<boolean> {
  markWaiting();

  // Read the bytes before opening anything. An IndexedDB transaction commits
  // as soon as it goes idle, so it cannot survive an `await` in the middle.
  let payload: StoredHandoff;
  try {
    payload = {
      bytes: await file.arrayBuffer(),
      name: file.name,
      type: file.type,
      storedAt: Date.now(),
    };
  } catch {
    return offerViaSession(file);
  }

  const database = await openDatabase();
  if (!database) return offerViaSession(file);

  return new Promise<boolean>((resolve) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(STORE, 'readwrite');
    } catch {
      finish(database);
      resolve(false);
      return;
    }
    transaction.objectStore(STORE).put(payload, KEY);
    transaction.oncomplete = () => {
      finish(database);
      resolve(true);
    };
    transaction.onerror = () => {
      finish(database);
      void offerViaSession(file).then(resolve);
    };
    transaction.onabort = () => {
      finish(database);
      void offerViaSession(file).then(resolve);
    };
  });
}

/**
 * Collects the handed-over file, if there is one, and deletes it either way.
 * Returns `null` when there is nothing waiting, when it is stale, or when
 * storage is unavailable.
 */
export async function takeOfferedFile(): Promise<File | null> {
  // Nothing was handed over, which is almost every page load. Touch no storage.
  if (!clearWaiting()) return null;

  const database = await openDatabase();
  if (!database) return takeFromSession();

  return new Promise<File | null>((resolve) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(STORE, 'readwrite');
    } catch {
      finish(database);
      resolve(null);
      return;
    }
    const store = transaction.objectStore(STORE);
    const request = store.get(KEY);
    // Delete unconditionally: collected or stale, it is not wanted again.
    store.delete(KEY);

    let taken: File | null = null;
    request.onsuccess = () => {
      const stored = request.result as StoredHandoff | undefined;
      if (
        stored?.bytes instanceof ArrayBuffer &&
        Date.now() - stored.storedAt <= HANDOFF_MAX_AGE_MS
      ) {
        taken = new File([stored.bytes], stored.name || 'file', {
          type: stored.type || 'application/octet-stream',
        });
      }
    };
    transaction.oncomplete = () => {
      finish(database);
      resolve(taken);
    };
    transaction.onerror = () => {
      finish(database);
      resolve(null);
    };
    transaction.onabort = () => {
      finish(database);
      resolve(null);
    };
  });
}

/**
 * Whether a file input is willing to take this file, going by its `accept`.
 * An input with no `accept` takes anything.
 */
export function inputAccepts(accept: string, file: File): boolean {
  const patterns = accept
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  if (!patterns.length) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) return name.endsWith(pattern);
    if (pattern.endsWith('/*')) {
      return type.startsWith(`${pattern.slice(0, -1)}`);
    }
    return type === pattern;
  });
}

/**
 * Puts the file into a file input as though the person had chosen it there,
 * so every tool's existing change handler runs unmodified.
 */
export function fillFileInput(input: HTMLInputElement, file: File): boolean {
  if (typeof DataTransfer === 'undefined') return false;
  try {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch {
    // Some engines refuse to let a script set `files`. Nothing is broken; the
    // page just opens empty, as it always did.
    return false;
  }
}
