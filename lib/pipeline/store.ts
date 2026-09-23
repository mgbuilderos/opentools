import { deserialisePipeline, serialisePipeline } from './serialise';
import type { Pipeline } from './types';

const DATABASE = 'opentools-pipelines';
const STORE = 'pipelines';

export interface StoredPipeline {
  name: string;
  json: string;
}

export interface PipelineStoreDriver {
  put(record: StoredPipeline): Promise<void>;
  get(name: string): Promise<StoredPipeline | undefined>;
  getAll(): Promise<readonly StoredPipeline[]>;
  delete(name: string): Promise<void>;
}

export interface PipelineStore {
  save(pipeline: Pipeline): Promise<Pipeline>;
  load(name: string): Promise<Pipeline | null>;
  list(): Promise<readonly Pipeline[]>;
  delete(name: string): Promise<void>;
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'name' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB failed.'));
    request.onblocked = () => reject(new Error('Pipeline storage is blocked.'));
  });
}

async function requestFromStore<T>(
  factory: IDBFactory,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase(factory);
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () =>
        reject(request.error ?? new Error('Pipeline storage request failed.'));
      transaction.oncomplete = () => resolve(result!);
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Pipeline storage failed.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Pipeline storage was aborted.'));
    });
  } finally {
    database.close();
  }
}

export function createIndexedDbDriver(
  factory: IDBFactory | undefined = globalThis.indexedDB,
): PipelineStoreDriver {
  const requiredFactory = () => {
    if (!factory)
      throw new Error('This browser does not provide local pipeline storage.');
    return factory;
  };
  return {
    async put(record) {
      await requestFromStore(requiredFactory(), 'readwrite', (store) =>
        store.put(record),
      );
    },
    async get(name) {
      return requestFromStore(requiredFactory(), 'readonly', (store) =>
        store.get(name),
      );
    },
    async getAll() {
      return requestFromStore(requiredFactory(), 'readonly', (store) =>
        store.getAll(),
      );
    },
    async delete(name) {
      await requestFromStore(requiredFactory(), 'readwrite', (store) =>
        store.delete(name),
      );
    },
  };
}

export function createPipelineStore(
  driver: PipelineStoreDriver,
): PipelineStore {
  return {
    async save(pipeline) {
      const json = serialisePipeline(pipeline);
      const safe = deserialisePipeline(json);
      await driver.put({ name: safe.name, json });
      return safe;
    },
    async load(name) {
      const record = await driver.get(name);
      return record ? deserialisePipeline(record.json) : null;
    },
    async list() {
      const pipelines = (await driver.getAll()).map((record) =>
        deserialisePipeline(record.json),
      );
      return pipelines.toSorted((left, right) =>
        left.name.localeCompare(right.name),
      );
    },
    async delete(name) {
      await driver.delete(name);
    },
  };
}

const defaultStore = createPipelineStore(createIndexedDbDriver());

export const savePipeline = defaultStore.save;
export const loadPipeline = defaultStore.load;
export const listPipelines = defaultStore.list;
export const deletePipeline = defaultStore.delete;
