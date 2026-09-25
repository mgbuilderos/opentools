import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  FILE_INPUT_COUNT,
  OPERATION_COUNT,
  PURE_OPERATIONS,
  coerceParams,
  runOperation,
  searchOperations,
} from './bridge';
import { isContained, safeFileName } from './fs-boundary';
import type { FsBoundary } from './fs-boundary';
import { handleRequest, serverInstructions, TOOLS } from './protocol';
import { parseArgv } from './server';

let root = '';
let readOnly: FsBoundary;
let writable: FsBoundary;
const signal = new AbortController().signal;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'opentools-mcp-'));
  readOnly = { root, allowWrite: false };
  writable = { root, allowWrite: true };
  await writeFile(join(root, 'sample.csv'), 'name,value\nalpha,1\nbeta,2\n');
  await writeFile(
    join(root, 'sample.qif'),
    '!Type:Bank\nD01/02/2026\nT-12.34\nPCoffee\n^\n',
  );
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('tool surface', () => {
  it('declares three tools, not one per operation', () => {
    // The whole point of the meta-tool shape: a 637-entry tools/list would be
    // billed to the client's context on every single request.
    expect(TOOLS).toHaveLength(3);
    expect(TOOLS.map((tool) => tool.name)).toEqual([
      'search_operations',
      'describe_operation',
      'run_operation',
    ]);
  });

  it('exposes only pure operations', () => {
    expect(PURE_OPERATIONS.length).toBeGreaterThan(0);
    expect(
      PURE_OPERATIONS.every((operation) => operation.runtime === 'pure'),
    ).toBe(true);
  });

  it('counts its own catalogue instead of stating a number', () => {
    // Guards the failure lib/seo/stated-numbers.test.ts was written for: a
    // count that was true once, typed into a sentence, and never re-checked.
    const instructions = serverInstructions();
    expect(instructions).toContain(String(OPERATION_COUNT));
    expect(instructions).toContain(String(FILE_INPUT_COUNT));
    expect(FILE_INPUT_COUNT).toBeLessThan(OPERATION_COUNT);
  });
});

describe('path boundary', () => {
  it('contains descendants and rejects escapes', () => {
    expect(isContained('/a/b', '/a/b')).toBe(true);
    expect(isContained('/a/b', '/a/b/c.txt')).toBe(true);
    expect(isContained('/a/b', '/a/bc')).toBe(false);
    expect(isContained('/a/b', '/a')).toBe(false);
    expect(isContained('/a/b', '/tmp/x')).toBe(false);
  });

  it('reduces an output name to a bare filename', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('a/b/c.pdf')).toBe('c.pdf');
    expect(safeFileName('..')).toBe('output.bin');
    expect(safeFileName('')).toBe('output.bin');
  });

  it('refuses to read outside the root', async () => {
    await expect(
      runOperation(
        {
          id: 'file-compressor',
          source: 'file-workbench',
          inputPaths: ['../../../etc/passwd'],
          outputDir: '.',
        },
        writable,
        signal,
      ),
    ).rejects.toThrow(/outside the server root|No readable file/u);
  });

  it('refuses to write when started read-only', async () => {
    await expect(
      runOperation(
        {
          id: 'file-compressor',
          source: 'file-workbench',
          inputPaths: ['sample.csv'],
          outputDir: '.',
        },
        readOnly,
        signal,
      ),
    ).rejects.toThrow(/--allow-write/u);
  });
});

describe('parameters', () => {
  it('fills defaults and coerces non-strings', () => {
    const operation = PURE_OPERATIONS.find(
      (candidate) => candidate.params.length > 0,
    )!;
    const first = operation.params[0]!;
    expect(coerceParams(operation, {})[first.id]).toBe(first.defaultValue);
    expect(coerceParams(operation, { [first.id]: 42 })[first.id]).toBe('42');
  });

  it('rejects an undeclared parameter rather than dropping it', () => {
    const operation = PURE_OPERATIONS[0]!;
    expect(() => coerceParams(operation, { nonsense: 'x' })).toThrow(
      /Unknown parameter/u,
    );
  });
});

describe('ambiguous ids', () => {
  it('refuses an id that exists in more than one source', async () => {
    // csv-to-json is defined by both developer-data and spreadsheet. Guessing
    // between them would hand the agent a different tool than it asked for.
    await expect(
      runOperation({ id: 'csv-to-json', text: 'a,b\n1,2\n' }, readOnly, signal),
    ).rejects.toThrow(/multiple sources/u);
  });
});

describe('argument validation', () => {
  it('refuses a non-scalar where a string is required', async () => {
    // Without this, String({}) reaches an operation as "[object Object]" and
    // fails somewhere far from the cause.
    const response = await handleRequest(
      {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: { name: 'run_operation', arguments: { id: { nested: true } } },
      },
      readOnly,
      signal,
    );
    const result = response?.result as {
      content: { text: string }[];
      isError?: boolean;
    };
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('id must be a string');
  });

  it('refuses inputPaths that is not an array', async () => {
    const response = await handleRequest(
      {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'run_operation',
          arguments: { id: 'file-compressor', inputPaths: 'sample.csv' },
        },
      },
      readOnly,
      signal,
    );
    const result = response?.result as { isError?: boolean } | undefined;
    expect(result?.isError).toBe(true);
  });

  it('accepts a number or boolean param and stringifies it', () => {
    const operation = PURE_OPERATIONS.find(
      (candidate) => candidate.params.length > 0,
    )!;
    const first = operation.params[0]!;
    expect(coerceParams(operation, { [first.id]: true })[first.id]).toBe(
      'true',
    );
  });

  it('refuses an object as a parameter value', () => {
    const operation = PURE_OPERATIONS.find(
      (candidate) => candidate.params.length > 0,
    )!;
    const first = operation.params[0]!;
    expect(() => coerceParams(operation, { [first.id]: { a: 1 } })).toThrow(
      /must be a string, number or boolean/u,
    );
  });
});

describe('search', () => {
  it('requires every term to match and caps its page', () => {
    const { matched, returned } = searchOperations('pdf');
    expect(matched).toBeGreaterThan(0);
    expect(returned.length).toBeLessThanOrEqual(40);
    expect(searchOperations('zzzz-no-such-thing').matched).toBe(0);
  });
});

describe('json-rpc', () => {
  it('answers initialize with the protocol version and counted instructions', async () => {
    const response = await handleRequest(
      { jsonrpc: '2.0', id: 1, method: 'initialize' },
      readOnly,
      signal,
    );
    const result = response?.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe('2025-06-18');
    expect(String(result.instructions)).toContain(String(OPERATION_COUNT));
  });

  it('returns no response for a notification', async () => {
    expect(
      await handleRequest(
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        readOnly,
        signal,
      ),
    ).toBeUndefined();
  });

  it('reports an unknown method as a JSON-RPC error', async () => {
    const response = await handleRequest(
      { jsonrpc: '2.0', id: 2, method: 'resources/list' },
      readOnly,
      signal,
    );
    expect(response?.error?.code).toBe(-32601);
  });

  it('runs a text operation end to end through tools/call', async () => {
    const response = await handleRequest(
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'run_operation',
          arguments: {
            id: 'csv-to-json',
            source: 'developer-data',
            text: 'name,value\nalpha,1\n',
          },
        },
      },
      readOnly,
      signal,
    );
    const result = response?.result as {
      content: { text: string }[];
      isError?: boolean;
    };
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toContain('alpha');
  });

  it('surfaces a boundary refusal as tool content, not a transport error', async () => {
    const response = await handleRequest(
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'run_operation',
          arguments: {
            id: 'file-compressor',
            source: 'file-workbench',
            inputPaths: ['/etc/passwd'],
            outputDir: '.',
          },
        },
      },
      readOnly,
      signal,
    );
    const result = response?.result as { isError?: boolean };
    expect(result.isError).toBe(true);
    expect(response?.error).toBeUndefined();
  });
});

describe('cli', () => {
  it('defaults to read-only in the working directory', () => {
    expect(parseArgv([])).toEqual({
      root: resolve(process.cwd()),
      allowWrite: false,
    });
  });

  it('accepts --root in both spellings and --allow-write', () => {
    expect(parseArgv(['--root', '/tmp', '--allow-write'])).toEqual({
      root: resolve('/tmp'),
      allowWrite: true,
    });
    expect(parseArgv(['--root=/tmp']).root).toBe(resolve('/tmp'));
  });
});

describe('file input', () => {
  it('reads a real file from disk and parses it', async () => {
    const outcome = await runOperation(
      {
        id: 'finance-parse-qif',
        source: 'formats-finance',
        inputPaths: ['sample.qif'],
      },
      readOnly,
      signal,
    );
    expect(outcome.text).toContain('Coffee');
  });

  it('refuses file paths for a text-only operation', async () => {
    await expect(
      runOperation(
        {
          id: 'csv-to-json',
          source: 'developer-data',
          inputPaths: ['sample.csv'],
        },
        readOnly,
        signal,
      ),
    ).rejects.toThrow(/not files/u);
  });
});

describe('written output stays inside the root', () => {
  it('writes only into the resolved output directory', async () => {
    const outcome = await runOperation(
      {
        id: 'file-compressor',
        source: 'file-workbench',
        inputPaths: ['sample.csv'],
        outputDir: '.',
      },
      writable,
      signal,
    );
    expect(outcome.writtenFiles?.length).toBeGreaterThan(0);
    for (const written of outcome.writtenFiles ?? []) {
      expect(isContained(root, written)).toBe(true);
      await expect(readFile(written)).resolves.toBeDefined();
    }
  });
});
