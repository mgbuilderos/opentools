import { describe, expect, it } from 'vitest';
import {
  getAllCategoryPillars,
  getCategoryBySlug,
  getCategoryPillar,
  getRelatedToolLinks,
  toCategorySlug,
} from './internal-linking-graph';
import { getAllCategories, TOOL_CATALOG } from './tool-catalog-data';

describe('Internal Linking Graph & Topic Clusters', () => {
  it('defines exactly 18 category pillar hubs with non-empty descriptions', () => {
    const pillars = getAllCategoryPillars();
    expect(pillars).toHaveLength(18);

    for (const pillar of pillars) {
      expect(pillar.name).toBeTruthy();
      expect(pillar.slug).toMatch(/^[a-z0-9-]+$/);
      expect(pillar.href).toBe(`/guides/category/${pillar.slug}`);
      expect(pillar.description.length).toBeGreaterThan(30);
      expect(pillar.toolCount).toBeGreaterThanOrEqual(30);
      expect(pillar.featuredTools.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('accurately round-trips category slugs', () => {
    const categories = getAllCategories();
    expect(categories).toHaveLength(18);

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

  it('links every single tool in the 964-tool catalog with zero orphan pages', () => {
    for (const tool of TOOL_CATALOG) {
      const links = getRelatedToolLinks(tool.slug, 3);
      expect(links.length).toBeGreaterThanOrEqual(3);
      expect(links.some((l) => l.tool.slug === tool.slug)).toBe(false);

      const pillar = getCategoryPillar(tool.category);
      expect(pillar).toBeDefined();
      expect(pillar?.href).toMatch(/^\/guides\/category\//);
    }
  });
});
