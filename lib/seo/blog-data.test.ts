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

  it('ensures all blog post toolDestinations and embedded links point to live tools or valid pages', async () => {
    const { isLiveToolUrl } = await import('./live-tools');
    const { TEMPLATE_CATALOG } = await import('../templates/templates-data');

    const nonToolPrefixes = ['/', '/guides', '/blog', '/templates', '/support'];
    const isNonToolPage = (href: string) => {
      const cleanHref = href.split('?')[0].split('#')[0];
      return (
        cleanHref === '' ||
        cleanHref === '/' ||
        nonToolPrefixes.some(
          (p) =>
            p !== '/' && (cleanHref === p || cleanHref.startsWith(`${p}/`)),
        )
      );
    };

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    const errors: string[] = [];

    for (const post of BLOG_POSTS) {
      if (!isLiveToolUrl(post.toolDestination)) {
        errors.push(
          `Blog post "${post.slug}" toolDestination "${post.toolDestination}" is not live`,
        );
      }

      const allText = [
        post.summary,
        ...post.sections.map((s) => `${s.heading} ${s.content}`),
        ...post.faqs.map((f) => `${f.question} ${f.answer}`),
      ].join('\n');

      let match: RegExpExecArray | null;
      while ((match = linkRegex.exec(allText)) !== null) {
        const href = match[2].trim();
        if (href.startsWith('/') && !href.startsWith('//')) {
          const valid = isLiveToolUrl(href) || isNonToolPage(href);
          if (!valid) {
            errors.push(
              `Blog post "${post.slug}" has invalid internal link "${href}"`,
            );
          }
        }
      }
    }

    for (const template of TEMPLATE_CATALOG) {
      if (!isLiveToolUrl(template.relatedToolHref)) {
        errors.push(
          `Template "${template.slug}" relatedToolHref "${template.relatedToolHref}" is not live`,
        );
      }

      const allText = [
        template.description,
        template.contentMarkdown,
        ...template.faqs.map((f) => `${f.question} ${f.answer}`),
      ].join('\n');

      let match: RegExpExecArray | null;
      while ((match = linkRegex.exec(allText)) !== null) {
        const href = match[2].trim();
        if (href.startsWith('/') && !href.startsWith('//')) {
          const valid = isLiveToolUrl(href) || isNonToolPage(href);
          if (!valid) {
            errors.push(
              `Template "${template.slug}" has invalid internal link "${href}"`,
            );
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it('ensures blog posts and templates do not contain unverifiable claims or promise non-working tools', async () => {
    const { TEMPLATE_CATALOG } = await import('../templates/templates-data');

    const forbiddenPhrases = [
      /\b0 bytes uploaded\b/i,
      /\b0 network egress\b/i,
      /\bzero network egress\b/i,
      /\bzero-egress\b/i,
      /\b1,?000 tools\b/i,
      /\bsub-second\b/i,
      /\bcompletely offline\b/i,
      /\bcompress mp4\b/i,
      /\bvideo compressor\b/i,
      /\bvideo compression\b/i,
      /\bsql visualizer\b/i,
      /\bcompress pdf\b/i,
      /\bai upscal/i,
      /\btranscription engine\b/i,
    ];

    const violations: string[] = [];

    for (const post of BLOG_POSTS) {
      const text = [
        post.title,
        post.summary,
        ...post.sections.map((s) => `${s.heading} ${s.content}`),
        ...post.faqs.map((f) => `${f.question} ${f.answer}`),
      ].join('\n');

      for (const pattern of forbiddenPhrases) {
        if (pattern.test(text)) {
          violations.push(
            `Blog post "${post.slug}" matched forbidden pattern ${pattern}`,
          );
        }
      }
    }

    for (const template of TEMPLATE_CATALOG) {
      const text = [
        template.title,
        template.description,
        template.contentMarkdown,
        ...template.faqs.map((f) => `${f.question} ${f.answer}`),
      ].join('\n');

      for (const pattern of forbiddenPhrases) {
        if (pattern.test(text)) {
          violations.push(
            `Template "${template.slug}" matched forbidden pattern ${pattern}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
