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

  it('contains no forbidden competitor names in user-facing UI copy', () => {
    const interfaceFiles = [
      path.join(projectRoot, 'components'),
      path.join(projectRoot, 'app'),
    ].flatMap(sourceFiles);
    const forbiddenCompetitors = [
      /\bAdobe\b/iu,
      /\bAcrobat\b/iu,
      /\biLovePDF\b/iu,
      /\bSmallpdf\b/iu,
      /\biLoveIMG\b/iu,
      /\bCanva\b/iu,
      /\bSejda\b/iu,
      /\bPDF24\b/iu,
      /\bTinyPNG\b/iu,
    ];
    const violations = interfaceFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return forbiddenCompetitors
        .filter((pattern) => pattern.test(source))
        .map(
          (pattern) =>
            `${path.relative(projectRoot, file)} matched competitor name ${pattern.source}`,
        );
    });

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

  it('keeps categories in navigation and equal task cards in the main workspace', () => {
    const shell = readFileSync(
      path.join(projectRoot, 'components/app-shell.tsx'),
      'utf8',
    );
    const home = readFileSync(
      path.join(projectRoot, 'components/home-workspace.tsx'),
      'utf8',
    );
    expect(shell).toContain('aria-label="Tool categories"');
    expect(shell).toContain('onCategorySelect(group.id)');
    expect(shell).not.toContain('<ToolLinkCard');
    expect(home).toContain('toolDestinationsForGroup(selectedGroup)');
    expect(home).toContain('data-design="equal-tool-hierarchy"');
    expect(home).toContain('<ToolLinkCard');
    expect(shell).toContain('showModal()');
    expect(shell).toContain('contains(document.activeElement)');
  });

  it('leaves native downloads and other work accessible during optional support', () => {
    const source = readFileSync(
      path.join(projectRoot, 'components/completion-value-dialog.tsx'),
      'utf8',
    );
    expect(source).not.toContain('preventDefault()');
    expect(source).not.toContain('stopPropagation()');
    expect(source).not.toContain('showModal()');
    expect(source).not.toContain('.click()');
    expect(source).toContain('aria-modal="false"');
    expect(source).toContain('SUPPORT_PREFERENCE_KEY');
    expect(source).toContain('href="/support"');
    expect(source).toContain('rel="noopener noreferrer"');
  });

  it('keeps focus and success product chrome monochrome', () => {
    const styles = readFileSync(
      path.join(projectRoot, 'app/globals.css'),
      'utf8',
    );

    expect(styles).not.toMatch(/#175cd3|#78a9ff|#16794b|#55d89b/iu);
    expect(styles).toContain('--ring: #16a34a');
    expect(styles).toContain('--success: #16a34a');
    expect(styles).toContain('--ring: #22c55e');
    expect(styles).toContain('--success: #22c55e');
  });
});
