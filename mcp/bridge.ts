/**
 * Kernel → MCP bridge.
 *
 * Three tools, not 637. A server that declares one MCP tool per operation
 * spends the client's context on a 637-entry tool list before the agent has
 * asked for anything, on every request. So the operations are addressed as
 * data through `search_operations` / `describe_operation` / `run_operation`,
 * and the catalogue is paged rather than declared.
 *
 * Only `runtime === 'pure'` operations are exposed. That is measured from the
 * manifest at load time, never typed into a string.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { KERNEL_MANIFEST } from '@/lib/kernel/manifest';
import { getOperation } from '@/lib/kernel/registry';
import type {
  KernelOperationDescriptor,
  OperationContext,
  OperationResult,
} from '@/lib/kernel/types';
import {
  joinInRoot,
  resolveForRead,
  resolveForWrite,
  type FsBoundary,
} from './fs-boundary';

/** Operations that run in a bare Node process with no DOM and no network. */
export const PURE_OPERATIONS: readonly KernelOperationDescriptor[] =
  KERNEL_MANIFEST.filter((operation) => operation.runtime === 'pure');

export const OPERATION_COUNT = PURE_OPERATIONS.length;
export const SOURCE_COUNT = new Set(
  PURE_OPERATIONS.map((operation) => operation.source),
).size;
export const FILE_INPUT_COUNT = PURE_OPERATIONS.filter(
  (operation) => operation.input === 'file' || operation.input === 'files',
).length;

const MAX_SEARCH_RESULTS = 40;

function haystack(operation: KernelOperationDescriptor): string {
  return `${operation.id} ${operation.source} ${operation.name} ${operation.description}`.toLowerCase();
}

export function searchOperations(
  query: string,
  limit = MAX_SEARCH_RESULTS,
): {
  matched: number;
  returned: readonly KernelOperationDescriptor[];
} {
  const terms = query.toLowerCase().split(/\s+/u).filter(Boolean);
  const matches =
    terms.length === 0
      ? PURE_OPERATIONS
      : PURE_OPERATIONS.filter((operation) => {
          const text = haystack(operation);
          return terms.every((term) => text.includes(term));
        });
  return { matched: matches.length, returned: matches.slice(0, limit) };
}

/**
 * Params arrive from an agent as JSON of whatever type it chose; the kernel
 * declares every param as a string. Coercion happens here so a boolean `true`
 * or a number `3` does not reach an operation as `[object Object]`.
 */
export function coerceParams(
  operation: KernelOperationDescriptor,
  supplied: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const declared of operation.params) {
    const value = supplied[declared.id];
    if (value === undefined || value === null) {
      params[declared.id] = declared.defaultValue;
      continue;
    }
    if (typeof value === 'string') {
      params[declared.id] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      params[declared.id] = String(value);
    } else {
      throw new TypeError(
        `Parameter ${declared.id} must be a string, number or boolean, not ${Array.isArray(value) ? 'an array' : typeof value}.`,
      );
    }
  }
  const undeclared = Object.keys(supplied).filter(
    (key) => !operation.params.some((param) => param.id === key),
  );
  if (undeclared.length > 0) {
    throw new Error(
      `Unknown parameter(s) for ${operation.source}:${operation.id}: ${undeclared.join(', ')}. Call describe_operation to list the accepted ones.`,
    );
  }
  return params;
}

export interface RunRequest {
  source?: string;
  id: string;
  text?: string;
  params?: Record<string, unknown>;
  inputPaths?: readonly string[];
  outputDir?: string;
}

export interface RunOutcome {
  summary: string;
  text?: string;
  writtenFiles?: readonly string[];
}

export async function runOperation(
  request: RunRequest,
  boundary: FsBoundary,
  signal: AbortSignal,
): Promise<RunOutcome> {
  const operation = getOperation(request.id, request.source);
  if (!operation) {
    throw new Error(
      `No operation ${request.id}${request.source ? ` in ${request.source}` : ''}. Call search_operations first.`,
    );
  }
  if (operation.runtime !== 'pure') {
    throw new Error(
      `${operation.source}:${operation.id} declares runtime "${operation.runtime}" and needs a browser. This server exposes pure operations only.`,
    );
  }

  const wantsFiles = operation.input === 'file' || operation.input === 'files';
  const paths = request.inputPaths ?? [];
  if (wantsFiles && paths.length === 0) {
    throw new Error(
      `${operation.source}:${operation.id} takes ${operation.input === 'file' ? 'a file' : 'files'}; pass inputPaths.`,
    );
  }
  if (!wantsFiles && paths.length > 0) {
    throw new Error(
      `${operation.source}:${operation.id} takes ${operation.input === 'none' ? 'no input' : 'text'}, not files.`,
    );
  }

  const files = [];
  for (const candidate of paths) {
    const real = await resolveForRead(boundary, candidate);
    const bytes = new Uint8Array(await readFile(real));
    files.push({
      name: real.split(/[\\/]/u).pop() ?? 'input',
      path: real,
      type: '',
      size: bytes.byteLength,
      lastModified: 0,
      bytes,
    });
  }

  const context: OperationContext = {
    text: request.text ?? '',
    files,
    params: coerceParams(operation, request.params ?? {}),
    signal,
  };

  const result: OperationResult = await operation.run(context);
  if (result.kind === 'text') {
    return { summary: `${operation.name} produced text.`, text: result.text };
  }

  if (request.outputDir === undefined) {
    throw new Error(
      `${operation.source}:${operation.id} produces ${result.files.length} file(s). Pass outputDir to say where they go; this server does not return file bytes inline.`,
    );
  }
  const directory = await resolveForWrite(boundary, request.outputDir);
  const written: string[] = [];
  for (const file of result.files) {
    const target = joinInRoot(directory, file.name);
    await writeFile(target, file.bytes);
    written.push(target);
  }
  return { summary: result.summary, writtenFiles: written };
}
