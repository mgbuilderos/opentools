import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { publicTools, searchTools, toolGroups, toolsForGroup } from './catalog';

describe('public canary catalog', () => {
  it('contains only complete, uniquely routed tools', () => {
    expect(publicTools).toHaveLength(30);
    const ids = new Set<string>();
    const routes = new Set<string>();

    for (const tool of publicTools) {
      expect(['public', 'canary']).toContain(tool.status);
      expect(tool.version).toMatch(/^\d+\.\d+\.\d+-(canary|public)$/);
      expect(tool.aliases.length).toBeGreaterThan(2);
      expect(tool.jobs.length).toBeGreaterThan(1);
      expect(tool.execution.capabilities.length).toBeGreaterThan(0);
      if (tool.status === 'canary')
        expect(tool.execution.offlineReady).toBe(false);
      expect(tool.href).toMatch(/^\//);
      expect(
        existsSync(
          path.join(import.meta.dirname, '../..', 'app', tool.href, 'page.tsx'),
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
    expect(
      searchTools('morse code translator').map((tool) => tool.id),
    ).toContain('text-workbench');
    expect(
      searchTools('temperature converter').map((tool) => tool.id),
    ).toContain('math-workbench');
    expect(searchTools('temperature converter')[0]?.href).toBe(
      '/math/workbench?tool=temperature-converter',
    );
    expect(
      searchTools('business days calculator').map((tool) => tool.id),
    ).toContain('date-workbench');
    expect(searchTools('JWT inspector').map((tool) => tool.id)).toContain(
      'developer-data-workbench',
    );
    expect(searchTools('CIDR calculator').map((tool) => tool.id)).toContain(
      'developer-advanced-workbench',
    );
    expect(searchTools('CIDR calculator')[0]?.href).toBe(
      '/developer/advanced?tool=cidr-calculator',
    );
    expect(searchTools('UTM builder').map((tool) => tool.id)).toContain(
      'web-workbench',
    );
    expect(searchTools('UTM builder')[0]?.href).toBe(
      '/web/workbench?tool=utm-builder',
    );
    expect(searchTools('pivot table').map((tool) => tool.id)).toContain(
      'spreadsheet-workbench',
    );
    expect(searchTools('team generator').map((tool) => tool.id)).toContain(
      'productivity-workbench',
    );
    expect(searchTools('podcast show notes').map((tool) => tool.id)).toContain(
      'creator-workbench',
    );
    expect(searchTools('invoice generator').map((tool) => tool.id)).toContain(
      'document-workbench',
    );
    expect(searchTools('invoice generator')[0]?.href).toBe(
      '/documents/workbench?tool=invoice-generator',
    );
    expect(searchTools('Ohm law calculator').map((tool) => tool.id)).toContain(
      'science-education-workbench',
    );
    expect(searchTools('Ohm law calculator')[0]?.href).toBe(
      '/science/workbench?tool=ohm-s-law-calculator',
    );
    expect(searchTools('Vigenere cipher').map((tool) => tool.id)).toContain(
      'writing-workbench',
    );
    expect(searchTools('Vigenere cipher')[0]?.href).toBe(
      '/text/writing?tool=vigenere-cipher',
    );
    expect(searchTools('file chunk splitter').map((tool) => tool.id)).toContain(
      'file-workbench',
    );
    expect(searchTools('file chunk splitter')[0]?.href).toBe(
      '/file/workbench?tool=file-chunk-splitter',
    );
    expect(searchTools('loan EMI calculator').map((tool) => tool.id)).toContain(
      'finance-business-workbench',
    );
    expect(searchTools('loan EMI calculator')[0]?.href).toBe(
      '/finance/workbench?tool=loan-emi-calculator',
    );
    expect(
      searchTools('Aadhaar masking tool').map((tool) => tool.id),
    ).toContain('life-admin-workbench');
    expect(searchTools('Aadhaar masking tool')[0]?.href).toBe(
      '/life-admin/workbench?tool=aadhaar-masking-tool',
    );
    expect(searchTools('QR code generator').map((tool) => tool.id)).toContain(
      'qr-barcode-workbench',
    );
    expect(searchTools('QR code generator')[0]?.href).toBe(
      '/qr/workbench?tool=qr-code-generator',
    );
    expect(searchTools('EAN 13 generator')[0]?.href).toBe(
      '/qr/workbench?tool=ean-13-generator',
    );
    expect(searchTools('JWT inspector')[0]?.href).toBe(
      '/developer/workbench?tool=jwt-inspector',
    );
    expect(searchTools('code diff')[0]?.href).toBe(
      '/text/writing?tool=text-diff',
    );
  });

  it('assigns every working tool to exactly one compact workspace', () => {
    const assignedIds = toolGroups.flatMap((group) =>
      toolsForGroup(group).map((tool) => tool.id),
    );

    expect(toolGroups).toHaveLength(12);
    expect(assignedIds).toHaveLength(publicTools.length);
    expect(new Set(assignedIds).size).toBe(publicTools.length);
    expect(assignedIds.toSorted()).toEqual(
      publicTools.map((tool) => tool.id).toSorted(),
    );
  });

  it('keeps the evidence-weighted launch order explicit', () => {
    expect(toolGroups.map((group) => group.id)).toEqual([
      'pdf',
      'images',
      'text-data',
      'qr-barcode',
      'calculators',
      'developer-files',
      'documents-office',
      'web-seo',
      'finance-business',
      'science-education',
      'creator-social',
      'life-admin',
    ]);
    expect(toolsForGroup(toolGroups[0]!)[0]?.id).toBe('pdf-merge');
  });

  it('keeps operation-level search destinations explicit and unique', () => {
    const entries = publicTools.flatMap((tool) => tool.searchEntries ?? []);
    const destinations = entries.map((entry) => entry.href);

    expect(entries).toHaveLength(548);
    expect(new Set(destinations).size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(entry.name.length).toBeGreaterThan(2);
      expect(entry.description.length).toBeGreaterThan(8);
      expect(entry.href).toMatch(/^\/[a-z0-9/-]+\?tool=[a-z0-9-]+$/);
    }
  });
});
