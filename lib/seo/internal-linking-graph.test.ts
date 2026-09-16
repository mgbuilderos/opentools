import { describe, expect, it } from 'vitest';
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
      expect(link.guideHref).toBe(`/guides/${link.tool.slug}`);
      expect(link.relationship).toBeTruthy();
      expect(link.tool.category).toBe('PDF');
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
});
