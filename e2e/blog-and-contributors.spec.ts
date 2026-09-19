import { expect, test } from '@playwright/test';

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
    await expect(
      page.getByRole('heading', {
        name: /Why File Size Checks Miss Corruption: ZIP CRC32 Checksum Validation/i,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', {
        name: /The macOS ZIP UTF-8 Flag Bug: When Archiver Flags Lie/i,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', {
        name: /Contributing to OpenTools: 4 Pure-TypeScript First Tasks/i,
      }),
    ).toBeVisible();
  });

  test('drives ZIP CRC32 article with live tool link and interactive workbench launch', async ({
    page,
  }) => {
    await page.goto('/blog/zip-crc32-checksum-validation-in-browser');

    await expect(
      page.getByRole('heading', {
        name: /Why File Size Checks Miss Corruption/i,
      }),
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
      page.getByRole('heading', {
        name: /The macOS ZIP UTF-8 Flag Bug/i,
      }),
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
      page.getByRole('heading', {
        name: /Contributing to OpenTools: 4 Pure-TypeScript First Tasks/i,
      }),
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
