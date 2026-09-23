import { describe, expect, it } from 'vitest';
import type { Pipeline } from './types';
import {
  createPipelineStore,
  type PipelineStoreDriver,
  type StoredPipeline,
} from './store';

function memoryDriver(): PipelineStoreDriver {
  const records = new Map<string, StoredPipeline>();
  return {
    async put(record) {
      records.set(record.name, structuredClone(record));
    },
    async get(name) {
      const record = records.get(name);
      return record ? structuredClone(record) : undefined;
    },
    async getAll() {
      return Array.from(records.values(), (record) => structuredClone(record));
    },
    async delete(name) {
      records.delete(name);
    },
  };
}

function pipeline(name: string): Pipeline {
  return {
    version: 1,
    name,
    steps: [
      {
        op: 'line-sorter',
        source: 'text',
        params: {
          sortDirection: 'descending',
          filename: 'private.txt',
        },
      },
    ],
  };
}

describe('pipeline store', () => {
  it('saves only safe settings, lists by name, loads, and deletes', async () => {
    const store = createPipelineStore(memoryDriver());
    const saved = await store.save(pipeline('Zulu'));
    await store.save(pipeline('Alpha'));

    expect(saved.steps[0]?.params).toEqual({ sortDirection: 'descending' });
    expect(saved.droppedParams).toEqual(['filename']);
    expect((await store.list()).map((item) => item.name)).toEqual([
      'Alpha',
      'Zulu',
    ]);
    expect(await store.load('Zulu')).toEqual(saved);

    await store.delete('Zulu');
    expect(await store.load('Zulu')).toBeNull();
  });
});
