import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const guardedRoots = [
  path.join(projectRoot, 'lib/tools'),
  path.join(projectRoot, 'workers'),
  path.join(projectRoot, 'components'),
  path.join(projectRoot, 'app'),
];
const forbiddenNetworkPrimitives = [
  /\bfetch\s*\(/u,
  /\bXMLHttpRequest\b/u,
  /\bWebSocket\s*\(/u,
  /\bEventSource\s*\(/u,
  /\bsendBeacon\s*\(/u,
  /https?:\/\//u,
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    if (statSync(absolute).isDirectory()) return sourceFiles(absolute);
    if (!/\.(ts|tsx)$/u.test(entry) || entry.endsWith('.test.ts')) return [];
    return [absolute];
  });
}

describe('local tool source policy', () => {
  it('contains no direct network primitive or remote URL', () => {
    const guardedFiles = [
      ...guardedRoots.flatMap(sourceFiles),
      path.join(projectRoot, 'proxy.ts'),
    ];
    const violations = guardedFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return forbiddenNetworkPrimitives
        .filter((pattern) => pattern.test(source))
        .map(
          (pattern) =>
            `${path.relative(projectRoot, file)} matched ${pattern.source}`,
        );
    });

    expect(violations).toEqual([]);
  });

  it('uses document navigation instead of client RSC fetching', () => {
    const clientFiles = [
      path.join(projectRoot, 'components'),
      path.join(projectRoot, 'app'),
    ].flatMap(sourceFiles);
    const violations = clientFiles
      .filter((file) => readFileSync(file, 'utf8').includes("'next/link'"))
      .map((file) => path.relative(projectRoot, file));

    expect(violations).toEqual([]);
  });

  it('does not present an unproved zero-upload result claim', () => {
    const guardedFiles = guardedRoots.flatMap(sourceFiles);
    const forbiddenReleaseClaims = [
      /Nothing (?:was|is) uploaded/iu,
      /0\s*(?:B|bytes?)\s+(?:of\s+)?(?:file\s+)?(?:data\s+)?uploaded/iu,
      /0\s+file bytes uploaded/iu,
      /never leaves? (?:this|the) tab/iu,
      /(?:inputs?|files?) (?:remain|stay|stayed) (?:only )?(?:in|with) (?:this|the) (?:browser )?tab/iu,
      /without sending inputs away/iu,
      /held only in (?:this|the) tab/iu,
    ];
    const violations = guardedFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return forbiddenReleaseClaims
        .filter((pattern) => pattern.test(source))
        .map(
          (pattern) =>
            `${path.relative(projectRoot, file)} matched ${pattern.source}`,
        );
    });

    expect(violations).toEqual([]);
  });

  it('uses support language instead of donation language', () => {
    const interfaceFiles = [
      path.join(projectRoot, 'components'),
      path.join(projectRoot, 'app'),
    ].flatMap(sourceFiles);
    const violations = interfaceFiles
      .filter((file) =>
        /\bdonat(?:e|ion|ions|ing)\b/iu.test(readFileSync(file, 'utf8')),
      )
      .map((file) => path.relative(projectRoot, file));

    expect(violations).toEqual([]);
  });
});
