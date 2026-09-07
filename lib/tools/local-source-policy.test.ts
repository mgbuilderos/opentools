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

  it('marks every current result-download surface for the value receipt', () => {
    const downloadSurfaces = [
      'components/text-workbench-tool.tsx',
      'components/tool-workspace.tsx',
      'components/utility-tools.tsx',
      'components/structured-tools.tsx',
      'components/file-workbench-tool.tsx',
      'components/schema-workbench-tool.tsx',
      'components/pdf-merge-tool.tsx',
      'components/pdf-extract-tool.tsx',
      'components/images-to-pdf-tool.tsx',
      'components/image-optimize-tool.tsx',
    ];
    const missing = downloadSurfaces.filter(
      (relativePath) =>
        !readFileSync(path.join(projectRoot, relativePath), 'utf8').includes(
          'data-receipt-download',
        ),
    );

    expect(missing).toEqual([]);
  });

  it('keeps the category drawer closed by default and out of the page grid', () => {
    const shell = readFileSync(
      path.join(projectRoot, 'components/app-shell.tsx'),
      'utf8',
    );

    expect(shell).toContain(
      'const [sidebarOpen, setSidebarOpen] = useState(false)',
    );
    expect(shell).toContain('inert={!sidebarOpen}');
    expect(shell).toContain('fixed bottom-0 left-0 top-16');
    expect(shell).toContain(
      "sidebarOpen ? 'translate-x-0' : '-translate-x-full'",
    );
    expect(shell).toContain('duration-[360ms]');
    expect(shell).toContain('motion-reduce:transition-none');
    expect(shell).toContain('setDrawerGroupId(group.id)');
    expect(shell).toContain('toolDestinationsForGroup(drawerGroup)');
    expect(shell).toContain('data-design="equal-tool-hierarchy"');
    expect(shell).not.toContain('tool.searchEntries.map');
    expect(shell).not.toContain("localStorage.getItem('tools-sidebar')");
    expect(shell).not.toContain('grid-cols-[240px');
    expect(shell).not.toContain('fixed bottom-0 right-0 top-16');
  });

  it('keeps focus and success product chrome monochrome', () => {
    const styles = readFileSync(
      path.join(projectRoot, 'app/globals.css'),
      'utf8',
    );

    expect(styles).not.toMatch(/#175cd3|#78a9ff|#16794b|#55d89b/iu);
    expect(styles).toContain('--ring: #111111');
    expect(styles).toContain('--success: #111111');
    expect(styles).toContain('--ring: #f5f5f2');
    expect(styles).toContain('--success: #f5f5f2');
  });
});
