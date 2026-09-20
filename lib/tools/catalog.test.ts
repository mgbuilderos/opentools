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
    expect(searchTools('resize image to kb').map((tool) => tool.id)).toContain(
      'image-exact-size',
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
    // This assertion is the point of the test. It used to compute the list
    // below, discard it, and check only the group count -- so a tool could be
    // built, routed and shipped while appearing in no workspace at all, which
    // is exactly what happened to four of them.
    const assignedIds = toolGroups.flatMap((group) =>
      toolsForGroup(group).map((tool) => tool.id),
    );
    const assigned = new Set(assignedIds);

    // Six workbenches sit in categories the nine workspaces do not cover --
    // Finance, Science, Creator, Life Admin, Document and Date. Placing them
    // means either forcing them somewhere they do not belong or adding
    // workspaces to the home page, which changes what every visitor sees
    // first. That is the owner's call, so they are listed here rather than
    // hidden: the list may shrink, and anything NOT on it fails.
    const awaitingAWorkspace = [
      'productivity-workbench',
      'finance-business-workbench',
      'science-education-workbench',
      'document-workbench',
      'creator-workbench',
      'life-admin-workbench',
    ];
    const unassigned = publicTools
      .map((tool) => tool.id)
      .filter((id) => !assigned.has(id) && !awaitingAWorkspace.includes(id));
    expect(
      unassigned,
      `reachable by URL but listed in no workspace: ${unassigned.join(', ')}`,
    ).toEqual([]);

    const duplicated = assignedIds.filter(
      (id, i) => assignedIds.indexOf(id) !== i,
    );
    expect(duplicated, 'listed in more than one workspace').toEqual([]);

    expect(toolGroups).toHaveLength(9);
  });

  it('keeps the evidence-weighted launch order explicit', () => {
    expect(toolGroups.map((group) => group.id)).toEqual([
      'pdf',
      'images',
      'audio',
      'text-data',
      'developer-files',
      'calculators',
      'qr-barcode',
      'web-seo',
      // Video is last deliberately. The order above is evidence-weighted, and
      // nothing is known yet about how the video tool performs — it shipped
      // with one operation on 2026-09-19. Claiming a higher position would be
      // claiming evidence that does not exist.
      'video',
    ]);
    expect(toolsForGroup(toolGroups[0]!)[0]?.id).toBe('pdf-merge');
  });

  it('gives every task in a selected category equal destination hierarchy', () => {
    const pdf = toolDestinationsForGroup(toolGroups[0]!);
    expect(pdf.map((destination) => destination.name)).toEqual([
      'Merge PDF',
      'Compress PDF',
      'PDF to Word',
      'PDF to Excel',
      'Sign and fill PDF',
      'Extract PDF pages',
      'Images to PDF',
      'Rotate PDF',
      'Reorder PDF pages',
      'Delete PDF pages',
      'PDF page numbers',
      'PDF watermark',
      'PDF metadata editor',
      'Bates numbering for PDFs',
    ]);
    expect(pdf).toHaveLength(14);
    expect(
      pdf.some((destination) => destination.name === 'PDF page tools'),
    ).toBe(false);
    expect(new Set(pdf.map((destination) => destination.href)).size).toBe(14);
  });

  it('keeps operation-level search destinations explicit and unique', () => {
    const entries = publicTools.flatMap((tool) => tool.searchEntries ?? []);
    const destinations = entries.map((entry) => entry.href);

    expect(entries).toHaveLength(646);
    expect(new Set(destinations).size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(entry.name.length).toBeGreaterThan(2);
      expect(entry.description.length).toBeGreaterThan(8);
      expect(entry.href).toMatch(/^\/[a-z0-9/-]+\?tool=[a-z0-9-]+$/);
    }
  });
});
