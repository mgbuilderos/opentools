import { readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const ENTRY = resolve(import.meta.dirname, 'index.ts');
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mjs', '.js'];

function resolveSource(from: string, specifier: string): string | undefined {
  if (!(specifier.startsWith('.') || specifier.startsWith('@/'))) return;
  const candidate = specifier.startsWith('@/')
    ? resolve(ROOT, specifier.slice(2))
    : resolve(dirname(from), specifier);
  for (const path of [
    candidate,
    ...SOURCE_EXTENSIONS.map((extension) => `${candidate}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) =>
      resolve(candidate, `index${extension}`),
    ),
  ]) {
    try {
      readFileSync(path);
      return path;
    } catch {
      // Try the next supported source extension.
    }
  }
}

function importGraph(entry: string): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const pending = [entry];
  while (pending.length) {
    const file = pending.pop()!;
    if (graph.has(file) || !SOURCE_EXTENSIONS.includes(extname(file))) continue;
    const source = readFileSync(file, 'utf8');
    const specifiers = ts
      .preProcessFile(source, true, true)
      .importedFiles.map((item) => item.fileName);
    graph.set(file, specifiers);
    for (const specifier of specifiers) {
      const resolved = resolveSource(file, specifier);
      if (resolved) pending.push(resolved);
    }
  }
  return graph;
}

describe('kernel import boundary', () => {
  it('does not pull React, Next, or app code into the headless graph', () => {
    const graph = importGraph(ENTRY);
    const forbidden = [...graph].flatMap(([file, specifiers]) =>
      specifiers
        .filter(
          (specifier) =>
            specifier === 'react' ||
            specifier.startsWith('react/') ||
            specifier === 'next' ||
            specifier.startsWith('next/') ||
            specifier.startsWith('@/app/') ||
            specifier.includes('/app/'),
        )
        .map((specifier) => ({ file, specifier })),
    );
    expect(forbidden).toEqual([]);
  });
});
