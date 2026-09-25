/**
 * stdio entry point. Reads newline-delimited JSON-RPC on stdin, writes
 * responses on stdout. Nothing else is written to stdout — a stray log line
 * there corrupts the protocol stream, so diagnostics go to stderr.
 */
import { createInterface } from 'node:readline';
import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { handleRequest, type JsonRpcRequest } from './protocol';
import type { FsBoundary } from './fs-boundary';

export interface CliOptions {
  root: string;
  allowWrite: boolean;
}

export function parseArgv(argv: readonly string[]): CliOptions {
  let root = process.cwd();
  let allowWrite = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--allow-write') allowWrite = true;
    else if (argument === '--root') {
      const value = argv[index + 1];
      if (!value) throw new Error('--root needs a directory.');
      root = value;
      index += 1;
    } else if (argument?.startsWith('--root=')) {
      root = argument.slice('--root='.length);
    }
  }
  return { root: resolve(root), allowWrite };
}

export async function main(argv: readonly string[]): Promise<void> {
  const options = parseArgv(argv);
  const boundary: FsBoundary = {
    root: await realpath(options.root),
    allowWrite: options.allowWrite,
  };
  const controller = new AbortController();
  process.on('SIGINT', () => controller.abort());
  process.on('SIGTERM', () => controller.abort());

  process.stderr.write(
    `opentools-local: root=${boundary.root} write=${boundary.allowWrite ? 'allowed' : 'refused'}\n`,
  );

  const lines = createInterface({ input: process.stdin });
  for await (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(trimmed) as JsonRpcRequest;
    } catch {
      process.stdout.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })}\n`,
      );
      continue;
    }
    const response = await handleRequest(request, boundary, controller.signal);
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}
