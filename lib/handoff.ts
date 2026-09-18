import { useEffect, useRef } from 'react';

/**
 * Carries one file or one block of text from the smart dropzone to the tool
 * page the visitor chose.
 *
 * Why this exists: every link in this app is a plain anchor, because
 * `lib/tools/local-source-policy.test.ts` forbids `next/link` — client-side
 * routing would fetch an RSC payload, and this site makes a no-egress claim.
 * A plain anchor is a full document navigation, so the tool page starts in a
 * fresh JavaScript context and nothing held in React state survives it. That
 * is why dropping a PDF into the dropzone and choosing a tool used to land on
 * an empty file picker.
 *
 * Why IndexedDB and not `sessionStorage`: a `File` goes into IndexedDB by
 * structured clone, with no base64 inflation, and these tools accept files up
 * to 150 MB. `sessionStorage` holds strings and caps out around 5 MB.
 *
 * The record lives in the visitor's own browser, is never read by anything but
 * this origin, is deleted the moment the tool page claims it, and any record
 * older than {@link HANDOFF_MAX_AGE_MS} is purged on the next read or write.
 */

export const HANDOFF_PARAM = 'handoff';
export const HANDOFF_MAX_AGE_MS = 5 * 60 * 1000;
/**
 * How long to wait for the browser's storage before giving up and navigating
 * without the file. IndexedDB can block indefinitely -- another tab holding an
 * upgrade, a device under storage pressure -- and a tool button stuck on
 * "Opening…" forever is worse than one that opens an empty picker.
 */
export const HANDOFF_TIMEOUT_MS = 5000;

function withTimeout<T>(work: Promise<T>, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const finish = (value: T) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => finish(fallback), HANDOFF_TIMEOUT_MS);
    void work
      .then((value) => {
        clearTimeout(timer);
        finish(value);
      })
      .catch(() => {
        clearTimeout(timer);
        finish(fallback);
      });
  });
}

const DATABASE_NAME = 'opentools-handoff';
const DATABASE_VERSION = 1;
const STORE_NAME = 'pending';

export interface HandoffPayload {
  file?: File;
  text?: string;
}

interface StoredHandoff extends HandoffPayload {
  id: string;
  createdAt: number;
}

/**
 * Adds the handoff id to a tool href, keeping any query string the href
 * already carries (`/pdf/page-tools?tool=rotate-pdf`) and any fragment.
 * Pure, so it is unit-tested without a browser.
 */
export function withHandoffParam(href: string, id: string): string {
  if (!id) return href;
  const hashAt = href.indexOf('#');
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  const base = hashAt === -1 ? href : href.slice(0, hashAt);
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${HANDOFF_PARAM}=${encodeURIComponent(id)}${hash}`;
}

/** Reads the handoff id out of a query string. */
export function handoffIdFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get(HANDOFF_PARAM);
  return id && id.length <= 64 ? id : null;
}

function newHandoffId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch {
      // Private browsing and hardened profiles can refuse to open a database.
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

/** Deletes anything stale, so an abandoned handoff never outlives its trip. */
function purgeExpired(store: IDBObjectStore, now: number) {
  const cursorRequest = store.openCursor();
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (!cursor) return;
    const value = cursor.value as StoredHandoff | undefined;
    const createdAt =
      typeof value?.createdAt === 'number' ? value.createdAt : 0;
    if (now - createdAt > HANDOFF_MAX_AGE_MS) cursor.delete();
    cursor.continue();
  };
}

/**
 * Stores one payload and returns the id to put in the destination URL.
 * Returns `null` when the browser will not store it; the caller then
 * navigates without a handoff and the tool page shows its own file picker,
 * which is exactly the behaviour that existed before.
 */
export function stashHandoff(payload: HandoffPayload): Promise<string | null> {
  return withTimeout(stashHandoffUnbounded(payload), null);
}

async function stashHandoffUnbounded(
  payload: HandoffPayload,
): Promise<string | null> {
  if (!payload.file && !payload.text) return null;
  const database = await openDatabase();
  if (!database) return null;

  const record: StoredHandoff = {
    id: newHandoffId(),
    createdAt: Date.now(),
    file: payload.file,
    text: payload.text,
  };

  const stored = await new Promise<boolean>((resolve) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(STORE_NAME, 'readwrite');
    } catch {
      resolve(false);
      return;
    }
    const store = transaction.objectStore(STORE_NAME);
    purgeExpired(store, record.createdAt);
    store.put(record);
    transaction.oncomplete = () => resolve(true);
    // A quota refusal lands here. Navigation still happens, without the file.
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });

  database.close();
  return stored ? record.id : null;
}

/**
 * Reads a payload once and deletes it in the same transaction, so a reload of
 * the tool page never replays a file the visitor has already moved on from.
 */
export function claimHandoff(id: string): Promise<HandoffPayload | null> {
  return withTimeout(claimHandoffUnbounded(id), null);
}

async function claimHandoffUnbounded(
  id: string,
): Promise<HandoffPayload | null> {
  const database = await openDatabase();
  if (!database) return null;

  const record = await new Promise<StoredHandoff | null>((resolve) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(STORE_NAME, 'readwrite');
    } catch {
      resolve(null);
      return;
    }
    const store = transaction.objectStore(STORE_NAME);
    // Requests run in the order they are made, so `get` sees the record that
    // `delete` is about to remove.
    const read = store.get(id);
    let value: StoredHandoff | null = null;
    read.onsuccess = () => {
      value = (read.result as StoredHandoff | undefined) ?? null;
    };
    store.delete(id);
    purgeExpired(store, Date.now());
    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => resolve(null);
    transaction.onabort = () => resolve(null);
  });

  database.close();
  if (!record) return null;
  if (Date.now() - record.createdAt > HANDOFF_MAX_AGE_MS) return null;
  return { file: record.file, text: record.text };
}

/**
 * Tool pages call this once. If the visitor arrived from the dropzone, the
 * file or text they dropped is handed to `accept` and the `handoff` parameter
 * is dropped from the address bar, so the URL stays shareable and a reload
 * does not look like a handoff that failed.
 */
export function useHandoff(accept: (payload: HandoffPayload) => void) {
  const acceptRef = useRef(accept);
  // Kept current in an effect rather than during render: the payload arrives
  // asynchronously, so `accept` must be the callback from the latest render,
  // and writing a ref while rendering is what the react-compiler rule forbids.
  useEffect(() => {
    acceptRef.current = accept;
  });

  useEffect(() => {
    const id = handoffIdFromSearch(window.location.search);
    if (!id) return;

    const url = new URL(window.location.href);
    url.searchParams.delete(HANDOFF_PARAM);
    window.history.replaceState(
      null,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );

    let cancelled = false;
    void claimHandoff(id).then((payload) => {
      if (cancelled || !payload) return;
      acceptRef.current(payload);
    });
    return () => {
      cancelled = true;
    };
  }, []);
}

/** Convenience wrapper for pages that only accept a file. */
export function useHandoffFile(accept: (file: File) => void) {
  useHandoff((payload) => {
    if (payload.file) accept(payload.file);
  });
}

/** Convenience wrapper for pages that only accept text. */
export function useHandoffText(accept: (text: string) => void) {
  useHandoff((payload) => {
    if (payload.text) accept(payload.text);
  });
}
