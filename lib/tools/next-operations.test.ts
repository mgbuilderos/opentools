import { describe, expect, it } from 'vitest';
import { KERNEL_MANIFEST } from '@/lib/kernel/manifest.generated';
import { isLiveToolUrl } from '@/lib/seo/live-tool-routes';
import { detectOutputType, getNextOperations } from './next-operations';

describe('next-operations matcher', () => {
  it('detects output types accurately', () => {
    expect(detectOutputType('application/pdf', 'doc.pdf')).toBe('pdf');
    expect(detectOutputType(undefined, 'output.pdf')).toBe('pdf');
    expect(detectOutputType('image/png', 'img.png')).toBe('image');
    expect(detectOutputType('image/webp', 'img.webp')).toBe('image');
    expect(detectOutputType('text/csv', 'data.csv')).toBe('csv');
    expect(detectOutputType('application/json', 'payload.json')).toBe('json');
    expect(detectOutputType('video/mp4', 'movie.mp4')).toBe('video');
    expect(detectOutputType('text/plain', 'notes.txt')).toBeNull();
  });

  it('filters out the current tool route', () => {
    const pdfOps = getNextOperations({
      mimeType: 'application/pdf',
      fileName: 'doc.pdf',
      currentRoute: '/pdf/compress',
    });
    expect(pdfOps.some((op) => op.href === '/pdf/compress')).toBe(false);

    const rotateOps = getNextOperations({
      mimeType: 'application/pdf',
      fileName: 'doc.pdf',
      currentRoute: '/pdf/page-tools?tool=rotate-pdf',
    });
    expect(
      rotateOps.some((op) => op.href === '/pdf/page-tools?tool=rotate-pdf'),
    ).toBe(false);
  });

  it('caps offered operations at 3', () => {
    const ops = getNextOperations({
      mimeType: 'application/pdf',
      fileName: 'doc.pdf',
    });
    expect(ops.length).toBeLessThanOrEqual(3);
    expect(ops.length).toBeGreaterThan(0);
  });

  it('ensures every offered next operation passes isLiveToolUrl', () => {
    const testCases = [
      { mimeType: 'application/pdf', fileName: 'test.pdf' },
      { mimeType: 'image/png', fileName: 'test.png' },
      { mimeType: 'image/jpeg', fileName: 'test.jpg' },
      { mimeType: 'image/webp', fileName: 'test.webp' },
      { mimeType: 'text/csv', fileName: 'test.csv' },
      { mimeType: 'application/json', fileName: 'test.json' },
      { mimeType: 'video/mp4', fileName: 'test.mp4' },
    ];

    for (const testCase of testCases) {
      const ops = getNextOperations(testCase);
      for (const op of ops) {
        expect(
          isLiveToolUrl(op.href),
          `Expected ${op.href} to be a live tool URL`,
        ).toBe(true);
      }
    }
  });

  it('for every operation in the kernel manifest, every offered next operation accepts the declared output type', () => {
    for (const operation of KERNEL_MANIFEST) {
      if (operation.output.kind === 'text') {
        // Text outputs do not produce files for handoff
        const ops = getNextOperations({
          mimeType: 'text/plain',
          fileName: 'output.txt',
        });
        expect(ops).toEqual([]);
      } else if (operation.output.kind === 'files') {
        const ext =
          'extension' in operation.output
            ? operation.output.extension
            : undefined;
        if (!ext) continue;
        const ops = getNextOperations({
          fileName: `result.${ext}`,
        });
        const outputCategory = detectOutputType(undefined, `result.${ext}`);
        if (!outputCategory) continue;

        for (const op of ops) {
          expect(isLiveToolUrl(op.href)).toBe(true);
          // Verify that if output is pdf, next operation is indeed in the PDF domain
          if (outputCategory === 'pdf') {
            expect(op.href.includes('pdf')).toBe(true);
          } else if (outputCategory === 'image') {
            expect(op.href.includes('image') || op.href.includes('pdf')).toBe(
              true,
            );
          }
        }
      }
    }
  });
});
