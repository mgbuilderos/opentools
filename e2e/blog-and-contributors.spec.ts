import { expect, test } from '@playwright/test';

import { getBlogPostBySlug } from '../lib/seo/blog-data';

/**
 * Titles come from the data, not from string literals.
 *
 * This spec used to assert three titles verbatim. When they were shortened on
 * 2026-09-20 so they would stop being truncated in search results, all eight
 * runs failed on copy that was deliberately changed — a test breaking because
 * the content improved. Reading the title back from `blog-data` means the
 * assertion checks what it is actually for: that the post renders under its
 * own heading.
 */
function titleOf(slug: string) {
  const post = getBlogPostBySlug(slug);
  if (!post) throw new Error(`No blog post with slug "${slug}".`);
  return post.title;
}

const CRC32 = 'zip-crc32-checksum-validation-in-browser';
const MACOS_ZIP = 'macos-utf8-zip-filename-encoding-bug';
const CONTRIBUTING = 'open-source-first-contributions-pure-typescript';

test.describe('Blog & Contributor On-ramp', () => {
  test('renders blog index with newly added engineering articles', async ({
    page,
  }) => {
    await page.goto('/blog');

    await expect(
      page.getByRole('heading', { name: /OpenTools Engineering Blog/i }),
    ).toBeVisible();

    // Each title appears in exactly one heading: the featured post is
    // sliced out of the list below it, so a heading is unambiguous where a
    // link is not -- every card also carries a "Read Article" button to the
    // same URL.
    for (const slug of [CRC32, MACOS_ZIP, CONTRIBUTING]) {
      await expect(
        page.getByRole('heading', { name: titleOf(slug), exact: true }),
      ).toBeVisible();
    }
  });

  test('drives ZIP CRC32 article with live tool link and interactive workbench launch', async ({
    page,
  }) => {
    await page.goto('/blog/zip-crc32-checksum-validation-in-browser');

    await expect(
      page.getByRole('heading', { name: titleOf(CRC32), exact: true }),
    ).toBeVisible();

    // Verify live tool link to /file/archive
    const toolLink = page.getByRole('link', {
      name: /Launch ZIP Archive Toolkit|Open Workbench/i,
    });
    await expect(toolLink.first()).toBeVisible();
    await expect(toolLink.first()).toHaveAttribute('href', '/file/archive');

    // Click through to verify /file/archive opens
    await toolLink.first().click();
    await expect(page).toHaveURL(/\/file\/archive/);
    await expect(page.getByLabel('Choose a ZIP file')).toBeVisible();
  });

  test('drives macOS UTF-8 flag bug article and verifies table of contents navigation', async ({
    page,
  }) => {
    await page.goto('/blog/macos-utf8-zip-filename-encoding-bug');

    await expect(
      page.getByRole('heading', { name: titleOf(MACOS_ZIP), exact: true }),
    ).toBeVisible();

    // Check Table of Contents link
    const tocLink = page.getByRole('link', {
      name: /A Declared Encoding is a Claim; the Bytes Are the Evidence/i,
    });
    await expect(tocLink).toBeVisible();
    await tocLink.click();

    // Verify section heading is visible
    await expect(
      page.getByRole('heading', {
        name: /A Declared Encoding is a Claim; the Bytes Are the Evidence/i,
      }),
    ).toBeVisible();
  });

  test('drives contributor article with 4 open items and links to GitHub repository', async ({
    page,
  }) => {
    await page.goto('/blog/open-source-first-contributions-pure-typescript');

    await expect(
      page.getByRole('heading', { name: titleOf(CONTRIBUTING), exact: true }),
    ).toBeVisible();

    // Verify 4 items are documented
    await expect(page.getByText('ZIP64 Archive Reader Support')).toBeVisible();
    await expect(
      page.getByText('TTML / DFXP Subtitle Format Parser'),
    ).toBeVisible();
    await expect(page.getByText('SCC Closed Caption Decoder')).toBeVisible();
    await expect(
      page.getByText('iPhone Safari Dropzone File Handoff'),
    ).toBeVisible();

    // Verify link to CONTRIBUTING.md
    const contributingLink = page.getByRole('link', {
      name: 'CONTRIBUTING.md',
    });
    await expect(contributingLink).toBeVisible();
    await expect(contributingLink).toHaveAttribute(
      'href',
      'https://github.com/mgbuilderos/opentools/blob/main/CONTRIBUTING.md',
    );
  });
});
