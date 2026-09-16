import { describe, expect, it } from 'vitest';

import { getGuideBySlug } from './guide-content';
import { LIVE_TOOL_CATALOG } from './live-tools';
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
    expect(mergeGuide.metaDescription).toContain('never touch a server');
    expect(mergeGuide.directAnswer).toContain('To merge pdf without uploading');
    expect(mergeGuide.cspHeader).toContain("connect-src 'none'");
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

  it('has a guide only for tools that are live', () => {
    const liveSlugs = new Set(LIVE_TOOL_CATALOG.map((tool) => tool.slug));
    expect(liveSlugs.size).toBeGreaterThan(0);
    expect(liveSlugs.size).toBeLessThan(TOOL_CATALOG.length);

    for (const tool of TOOL_CATALOG) {
      const guide = getGuideBySlug(tool.slug);
      expect(guide === undefined, tool.slug).toBe(!liveSlugs.has(tool.slug));
    }
  });

  it('states no claim the code does not back', () => {
    const banned = [
      'millisecond',
      'sub-second',
      'instant',
      '0 bytes',
      'zero bytes',
      'offline',
      'forever',
      'cryptographic',
      'zero-trust',
      'revoked',
      'zeroed',
    ];

    for (const slug of ['pdf-merge-pdf', 'image-image-optimizer']) {
      const guide = getGuideBySlug(slug);
      if (!guide) continue;
      const prose = [
        guide.metaTitle,
        guide.metaDescription,
        guide.directAnswer,
        guide.leadParagraph,
        guide.technicalArchitecture,
        ...guide.steps.flatMap((step) => [step.name, step.text]),
        ...guide.comparison.flatMap((row) => [row.localTools, row.aspect]),
        ...guide.faqs.flatMap((faq) => [faq.question, faq.answer]),
      ]
        .join(' ')
        .toLowerCase();

      for (const word of banned) {
        expect(prose.includes(word), `${slug}: ${word}`).toBe(false);
      }
    }
  });
});
