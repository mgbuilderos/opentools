import { describe, expect, it } from 'vitest';

import { generateToolGuide, getGuideBySlug } from './guide-content';
import { LIVE_TOOL_CATALOG } from './live-tools';
import {
  getAllToolSlugs,
  getToolsByCategory,
  TOOL_CATALOG,
} from './tool-catalog-data';

describe('Programmatic SEO Engine — Tool Catalog & Guides', () => {
  it('contains exactly 984 catalog tools', () => {
    expect(TOOL_CATALOG).toHaveLength(984);
  });

  it('assigns unique, URL-safe slugs to all 984 tools', () => {
    const slugs = getAllToolSlugs();
    expect(slugs).toHaveLength(984);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(984);

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
    // Was `toContain('To merge pdf without uploading')`, then
    // `'To use the OpenTools Merge PDF without uploading'` — both pinned this
    // guide to the shared template. Merge PDF now has a GUIDE_DETAILS entry
    // written from lib/tools/pdf/engine.ts, so asserting the template sentence
    // would be asserting that the differentiation had NOT happened. What
    // matters is that the answer is about this tool and leads with the action.
    expect(mergeGuide.directAnswer).toMatch(/merge/iu);
    expect(mergeGuide.directAnswer).not.toContain('To use the OpenTools');
    expect(mergeGuide.cspHeader).toContain("connect-src 'none'");
    expect(mergeGuide.diagramSvg).toContain('<svg');
    expect(mergeGuide.steps).toHaveLength(3);
    expect(mergeGuide.comparison).toHaveLength(5);
    // Four generic FAQs, plus the tool-specific ones prepended by its
    // GUIDE_DETAILS entry. Pinning this to exactly 4 would cap how much real
    // content any guide is allowed to carry.
    expect(mergeGuide.faqs.length).toBeGreaterThanOrEqual(4);
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

  it('states the text-only limit and no affiliation on the masker guide', () => {
    const guide = getGuideBySlug(
      'india-and-life-admin-mask-aadhaar-and-pan-numbers',
    );
    expect(guide?.tool.destinationUrl).toBe('/life-admin/aadhaar-pan-masker');
    expect(guide?.cspHeader).toContain("connect-src 'none'");
    expect(guide?.directAnswer).toContain('JavaScript in your browser');
    expect(guide?.directAnswer).toContain('not images, scans or PDFs');
    expect(guide?.directAnswer).not.toMatch(/WebAssembly/u);
    const answers = guide?.faqs.map((faq) => faq.answer).join(' ') ?? '';
    expect(answers).toContain('It does not read images, scans or PDFs');
    expect(answers).toContain(
      'not made, approved or endorsed by UIDAI or the Income Tax Department',
    );
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

    for (const slug of [
      'pdf-merge-pdf',
      'image-image-optimizer',
      'image-resize-image-to-exact-kb',
    ]) {
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

  it('promises no more than a drawn or typed signature on the sign guides', () => {
    const banned = [
      'legally binding',
      'legally-binding',
      'certified',
      'e-signature',
      'esignature',
      'electronic signature',
      'audit trail',
      'secure signature',
      'multiple signers',
      'signers',
      'unicode',
      'any language',
      'webassembly',
    ];

    for (const slug of ['pdf-sign-pdf', 'pdf-fill-pdf-form']) {
      const guide = getGuideBySlug(slug);
      expect(guide, slug).toBeDefined();
      if (!guide) continue;
      const prose = JSON.stringify(guide).toLowerCase();
      for (const word of banned) {
        expect(prose.includes(word), `${slug}: ${word}`).toBe(false);
      }
      const limits = guide.faqs.map((faq) => faq.answer).join(' ');
      expect(limits).toContain('does not certify');
      expect(limits).toContain('basic Latin text');
    }
  });

  it('describes the exact-size tool truthfully', () => {
    const guide = getGuideBySlug('image-resize-image-to-exact-kb');
    expect(guide?.tool.destinationUrl).toBe('/image/exact-size');
    expect(guide?.tool.executionMode).toBe('local-js');
    expect(guide?.cspHeader).toContain("connect-src 'none'");
    const prose = [
      guide!.directAnswer,
      guide!.leadParagraph,
      ...guide!.faqs.map((faq) => faq.answer),
    ].join(' ');
    expect(prose).toContain('Canvas');
    expect(prose).toContain('not WebAssembly');
    expect(prose).toContain('1,024 bytes');
    expect(prose).toContain('check the current notice');
    expect(prose).toContain('not pad');
    // No named portal presets: limits change with every notice.
    expect(prose).not.toMatch(/\b\d+\s*(?:–|-|to)\s*\d+\s*KB\b/u);
  });

  /**
   * Google prints the title verbatim, so a broken one is the first thing a
   * searcher reads. The template used to be `How to ${name} ...`, and because
   * tool names here are noun phrases it produced "How to MP3 Cutter in your
   * browser" on **548 of 562 guides** -- every guide but fourteen.
   *
   * Leading with the name is also what the demand looks like: every query in
   * Search Console on 2026-09-20 was a tool name, not a how-to phrase.
   */
  it('starts every guide title with the tool name, and reads as English', () => {
    const offenders: string[] = [];

    for (const tool of LIVE_TOOL_CATALOG) {
      const guide = generateToolGuide(tool);
      if (!guide.metaTitle.startsWith(tool.name)) {
        offenders.push(guide.metaTitle);
      }
      // "How to <noun phrase>" is the specific break being guarded. "How to
      // use <name>" is fine and is what the HowTo schema says.
      if (/How to (?!use )/u.test(guide.metaTitle)) {
        offenders.push(guide.metaTitle);
      }
      if (/How to (?!use )/u.test(guide.heading)) {
        offenders.push(guide.heading);
      }
      if (guide.directAnswer.startsWith(`To ${tool.name.toLowerCase()} `)) {
        offenders.push(guide.directAnswer.slice(0, 60));
      }
    }

    expect(
      offenders.slice(0, 5),
      `${offenders.length} guide strings do not read as English`,
    ).toEqual([]);
  });
});
