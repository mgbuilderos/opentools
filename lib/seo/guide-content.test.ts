import { describe, expect, it } from 'vitest';

import { getGuideBySlug } from './guide-content';
import {
  getAllToolSlugs,
  getToolsByCategory,
  TOOL_CATALOG,
} from './tool-catalog-data';

describe('Programmatic SEO Engine — Tool Catalog & Guides', () => {
  it('contains exactly 964 catalog tools', () => {
    expect(TOOL_CATALOG).toHaveLength(964);
  });

  it('assigns unique, URL-safe slugs to all 964 tools', () => {
    const slugs = getAllToolSlugs();
    expect(slugs).toHaveLength(964);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(964);

    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('routes every tool to a valid relative workbench URL', () => {
    for (const tool of TOOL_CATALOG) {
      expect(tool.destinationUrl).toMatch(/^\/[a-z0-9-]+/);
      expect(tool.category).toBeTruthy();
      expect(tool.name).toBeTruthy();
    }
  });

  it('filters tools accurately by category', () => {
    const pdfTools = getToolsByCategory('PDF');
    expect(pdfTools.length).toBeGreaterThanOrEqual(70);
    expect(pdfTools.every((t) => t.category === 'PDF')).toBe(true);
  });

  it('generates rich guide metadata, HowTo steps, FAQs, and Schema.org JSON-LD', () => {
    const mergeGuide = getGuideBySlug('pdf-merge-pdf');
    expect(mergeGuide).toBeDefined();
    if (!mergeGuide) return;

    expect(mergeGuide.metaTitle).toContain('Merge PDF');
    expect(mergeGuide.metaDescription).toContain('client-side');
    expect(mergeGuide.directAnswer).toContain('To merge pdf online');
    expect(mergeGuide.diagramSvg).toContain('<svg');
    expect(mergeGuide.steps).toHaveLength(3);
    expect(mergeGuide.comparison).toHaveLength(5);
    expect(mergeGuide.faqs).toHaveLength(4);
    expect(mergeGuide.relatedTools.length).toBeGreaterThanOrEqual(3);
    expect(mergeGuide.categoryPillar?.name).toBe('PDF');

    const json = mergeGuide.jsonLd as {
      '@graph': Array<{ '@type': string }>;
    };
    const graph = json['@graph'];
    expect(graph).toHaveLength(4);
    expect(graph[0]['@type']).toBe('SoftwareApplication');
    expect(graph[1]['@type']).toBe('HowTo');
    expect(graph[2]['@type']).toBe('FAQPage');
    expect(graph[3]['@type']).toBe('BreadcrumbList');
  });

  it('returns undefined gracefully for non-existent guide slugs', () => {
    expect(getGuideBySlug('non-existent-tool-slug-xyz')).toBeUndefined();
  });
});
