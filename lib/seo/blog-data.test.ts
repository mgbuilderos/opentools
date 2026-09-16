import { describe, expect, it } from 'vitest';
import {
  BLOG_POSTS,
  getAllBlogCategories,
  getBlogPostBySlug,
  getBlogPostsByCategory,
} from './blog-data';

describe('Blog Content Engine & 20 Seeded Articles', () => {
  it('contains at least 20 comprehensive blog posts', () => {
    expect(BLOG_POSTS.length).toBeGreaterThanOrEqual(20);
  });

  it('assigns unique, URL-safe slugs to all blog posts', () => {
    const slugs = BLOG_POSTS.map((p) => p.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(BLOG_POSTS.length);

    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('provides non-empty titles, summaries, sections, and FAQs for every post', () => {
    for (const post of BLOG_POSTS) {
      expect(post.title.length).toBeGreaterThan(15);
      expect(post.metaDescription.length).toBeGreaterThan(30);
      expect(post.summary.length).toBeGreaterThan(30);
      expect(post.keywords.length).toBeGreaterThanOrEqual(3);
      expect(post.sections.length).toBeGreaterThanOrEqual(1);
      expect(post.faqs.length).toBeGreaterThanOrEqual(1);
      expect(post.toolDestination).toMatch(/^\/[a-z0-9-]+/);
    }
  });

  it('retrieves posts accurately by slug and category', () => {
    const post = getBlogPostBySlug('how-to-convert-json-to-zod-schema-offline');
    expect(post).toBeDefined();
    expect(post?.toolName).toContain('Zod');

    const devPosts = getBlogPostsByCategory('Developer & Systems');
    expect(devPosts.length).toBeGreaterThanOrEqual(5);

    const categories = getAllBlogCategories();
    expect(categories.length).toBeGreaterThanOrEqual(4);
  });
});
