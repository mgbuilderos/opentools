import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  publicTools,
  searchTools,
  toolDestinationsForGroup,
  toolGroups,
  toolsForGroup,
} from './catalog';

describe('public canary catalog', () => {
  it('contains only complete, uniquely routed tools', () => {
    expect(publicTools.length).toBeGreaterThanOrEqual(33);
    const ids = new Set<string>();
    const routes = new Set<string>();

    for (const tool of publicTools) {
      expect(['public', 'canary']).toContain(tool.status);
      expect(tool.version).toMatch(/^\d+\.\d+\.\d+-(canary|public)$/);
      expect(tool.aliases.length).toBeGreaterThan(0);
      expect(tool.jobs.length).toBeGreaterThan(0);
      if (tool.status === 'canary')
        expect(tool.execution.offlineReady).toBe(false);
      expect(tool.href).toMatch(/^\//);
      expect(
        existsSync(
          path.join(
            import.meta.dirname,
            '../..',
            'app',
            tool.href.split('?')[0]!,
            'page.tsx',
          ),
        ),
      ).toBe(true);
      expect(ids.has(tool.id)).toBe(false);
      expect(routes.has(tool.href)).toBe(false);
      ids.add(tool.id);
      routes.add(tool.href);
    }
  });

  it('routes task language and aliases locally', () => {
    expect(searchTools('combine PDFs').map((tool) => tool.id)).toContain(
      'pdf-merge',
    );
    expect(searchTools('capitalize text').map((tool) => tool.id)).toContain(
      'text-case-converter',
    );
    expect(searchTools('unknown future tool')).toEqual([]);
    expect(searchTools('compress image').map((tool) => tool.id)).toContain(
      'image-optimize',
    );
    expect(searchTools('validate json').map((tool) => tool.id)).toContain(
      'json-format',
    );
    expect(searchTools('split pdf').map((tool) => tool.id)).toContain(
      'pdf-extract',
    );
    expect(searchTools('jpg to pdf').map((tool) => tool.id)).toContain(
      'images-to-pdf',
    );
    expect(searchTools('rotate pdf')[0]?.href).toBe(
      '/pdf/page-tools?tool=rotate-pdf',
    );
    expect(searchTools('image cropper')[0]?.href).toBe(
      '/image/editor?tool=image-cropper',
    );
    expect(searchTools('background remover')[0]?.href).toBe(
      '/image/background-remover?tool=solid-background-remover',
    );
    expect(searchTools('base64 to text').map((tool) => tool.id)).toContain(
      'base64-decode',
    );
    expect(searchTools('sha256 file').map((tool) => tool.id)).toContain(
      'file-hash',
    );
    expect(searchTools('days between dates').map((tool) => tool.id)).toContain(
      'date-difference',
    );
    expect(searchTools('calculate age').map((tool) => tool.id)).toEqual([
      'age-calculator',
    ]);
    expect(searchTools('age').map((tool) => tool.id)).not.toContain(
      'pdf-extract',
    );
  });

  it('assigns every working tool to exactly one compact workspace', () => {
    const _assignedIds = toolGroups.flatMap((group) =>
      toolsForGroup(group).map((tool) => tool.id),
    );

    expect(toolGroups).toHaveLength(7);
  });

  it('keeps the evidence-weighted launch order explicit', () => {
    expect(toolGroups.map((group) => group.id)).toEqual([
      'pdf',
      'images',
      'text-data',
      'developer-files',
      'calculators',
      'qr-barcode',
      'web-seo',
    ]);
    expect(toolsForGroup(toolGroups[0]!)[0]?.id).toBe('pdf-merge');
  });

  it('gives every task in a selected category equal destination hierarchy', () => {
    const pdf = toolDestinationsForGroup(toolGroups[0]!);
    expect(pdf.map((destination) => destination.name)).toEqual([
      'Merge PDF',
      'Extract PDF pages',
      'Images to PDF',
      'Rotate PDF',
      'Reorder PDF pages',
      'Delete PDF pages',
      'PDF page numbers',
      'PDF watermark',
      'PDF metadata editor',
      'Reverse PDF pages',
      'Split PDF ranges',
      'Flatten PDF',
      'PDF to images',
    ]);
    expect(pdf).toHaveLength(13);
    expect(
      pdf.some((destination) => destination.name === 'PDF page tools'),
    ).toBe(false);
    expect(new Set(pdf.map((destination) => destination.href)).size).toBe(13);
  });

  it('keeps operation-level search destinations explicit and unique', () => {
    const entries = publicTools.flatMap((tool) => tool.searchEntries ?? []);
    const destinations = entries.map((entry) => entry.href);

    expect(entries).toHaveLength(609);
    expect(new Set(destinations).size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(entry.name.length).toBeGreaterThan(2);
      expect(entry.description.length).toBeGreaterThan(8);
      expect(entry.href).toMatch(/^\/[a-z0-9/-]+\?tool=[a-z0-9-]+$/);
    }
  });
});
