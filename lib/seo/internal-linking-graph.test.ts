import { describe, expect, it } from 'vitest';
import { guideOrToolHref } from './guide-consolidation';
import {
  getAllCategoryPillars,
  getCategoryBySlug,
  getCategoryPillar,
  getRelatedToolLinks,
  toCategorySlug,
} from './internal-linking-graph';
import { LIVE_TOOL_CATALOG, getLiveCategories } from './live-tools';
import { TOOL_CATALOG } from './tool-catalog-data';

describe('Internal Linking Graph & Topic Clusters', () => {
  it('gives every category that still has a working tool its own hub', () => {
    const pillars = getAllCategoryPillars();
    expect(pillars).toHaveLength(getLiveCategories().length);

    for (const pillar of pillars) {
      expect(pillar.name).toBeTruthy();
      expect(pillar.slug).toMatch(/^[a-z0-9-]+$/);
      expect(pillar.href).toBe(`/guides/category/${pillar.slug}`);
      expect(pillar.description.length).toBeGreaterThan(30);
      expect(pillar.toolCount).toBeGreaterThan(0);
      expect(pillar.featuredTools.length).toBeGreaterThan(0);
    }
  });

  it('has no hub for a category whose tools are all gone', () => {
    const liveCategories = new Set(getLiveCategories());
    const deadCategories = [
      ...new Set(TOOL_CATALOG.map((tool) => tool.category)),
    ].filter((category) => !liveCategories.has(category));

    // Video is the one that emptied out; keep the assertion honest if that changes.
    expect(deadCategories).toContain('Video');

    for (const category of deadCategories) {
      expect(getCategoryPillar(category)).toBeUndefined();
      expect(getCategoryBySlug(toCategorySlug(category))).toBeUndefined();
    }
  });

  it('accurately round-trips category slugs', () => {
    const categories = getLiveCategories();
    expect(categories.length).toBeGreaterThan(0);

    for (const category of categories) {
      const slug = toCategorySlug(category);
      expect(getCategoryBySlug(slug)).toBe(category);
      expect(getCategoryPillar(category)).toBeDefined();
    }
  });

  it('generates 4 related workflow tools without self-loops for pdf-merge-pdf', () => {
    const links = getRelatedToolLinks('pdf-merge-pdf', 4);
    expect(links).toHaveLength(4);

    const slugs = links.map((link) => link.tool.slug);
    expect(slugs).not.toContain('pdf-merge-pdf');
    expect(new Set(slugs).size).toBe(4);

    for (const link of links) {
      // Guide consolidation decides where a related link points: the guide
      // when that tool keeps one, otherwise the tool page itself. Both are
      // pages that answer 200 -- the point is that neither is a redirect.
      expect(link.guideHref).toBe(guideOrToolHref(link.tool));
      expect(link.relationship).toBeTruthy();
    }

    // Most stay in the tool's own category; the last slot is deliberately
    // reserved for another one. Requiring ALL FOUR to be PDF — as this did
    // until 2026-09-21 — was what kept the guide graph in 18 sealed islands
    // with zero links between them.
    const sameCategory = links.filter((link) => link.tool.category === 'PDF');
    expect(sameCategory.length).toBeGreaterThanOrEqual(3);
  });

  it('reaches out of its own category so the guide graph is connected', () => {
    // Measured before the cross-category slot existed: 2,264 guide-to-guide
    // links and not one crossing a category, so authority could not move
    // between clusters and a reader following the cards went in circles.
    let withCrossLink = 0;
    for (const tool of LIVE_TOOL_CATALOG) {
      const links = getRelatedToolLinks(tool.slug, 4);
      if (links.some((link) => link.tool.category !== tool.category)) {
        withCrossLink += 1;
      }
    }
    expect(withCrossLink).toBeGreaterThan(200);
  });

  it('never invents a cross-category link with no real relationship', () => {
    // A link added to fill a slot teaches a reader the cards are noise. The
    // cross pick needs a shared, non-generic word in the tool name or it is
    // simply not made, and the caller gets three links instead of four.
    for (const tool of LIVE_TOOL_CATALOG.slice(0, 120)) {
      for (const link of getRelatedToolLinks(tool.slug, 4)) {
        if (link.tool.category === tool.category) continue;
        const words = new Set(
          tool.name
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 3),
        );
        const shared = link.tool.name
          .toLowerCase()
          .split(/\s+/)
          .some((word) => word.length > 3 && words.has(word));
        expect(shared, `${tool.slug} -> ${link.tool.slug}`).toBe(true);
      }
    }
  });

  it('links only live tools, and links nothing from a tool that is not live', () => {
    const liveSlugs = new Set(LIVE_TOOL_CATALOG.map((tool) => tool.slug));

    for (const tool of TOOL_CATALOG) {
      const links = getRelatedToolLinks(tool.slug, 3);

      if (!liveSlugs.has(tool.slug)) {
        expect(links, tool.slug).toHaveLength(0);
        continue;
      }

      expect(links.some((l) => l.tool.slug === tool.slug)).toBe(false);
      for (const link of links) {
        expect(liveSlugs.has(link.tool.slug), link.tool.slug).toBe(true);
      }

      const pillar = getCategoryPillar(tool.category);
      expect(pillar).toBeDefined();
      expect(pillar?.href).toMatch(/^\/guides\/category\//);
    }
  });

  it('links the OCR dead-end recoveries in both directions', () => {
    const pdfOcr = getRelatedToolLinks('pdf-ocr-pdf', 4).map(
      (link) => link.tool.slug,
    );
    expect(pdfOcr).toEqual(
      expect.arrayContaining([
        'image-image-to-text',
        'pdf-pdf-to-word',
        'pdf-pdf-to-excel',
      ]),
    );

    expect(
      getRelatedToolLinks('image-image-to-text', 4).map(
        (link) => link.tool.slug,
      ),
    ).toContain('pdf-ocr-pdf');
    expect(
      getRelatedToolLinks('pdf-pdf-to-word', 4).map((link) => link.tool.slug),
    ).toContain('pdf-ocr-pdf');
    expect(
      getRelatedToolLinks('pdf-pdf-to-excel', 4).map((link) => link.tool.slug),
    ).toContain('pdf-ocr-pdf');
  });
});
