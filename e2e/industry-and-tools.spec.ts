import { expect, test } from '@playwright/test';

test.describe('Industry Workflows, Tool Deep Dives & Profession Templates', () => {
  test('drives lawyer workflow article and verifies live PDF merge tool navigation', async ({
    page,
  }) => {
    await page.goto('/blog/legal-document-workflow-in-browser-privacy');

    await expect(
      page.getByRole('heading', {
        name: /In-Browser Legal Document Workflows/i,
      }),
    ).toBeVisible();

    // Verify unbuilt gaps are acknowledged honestly
    await expect(
      page.getByText('Bates Numbering').first(),
    ).toBeVisible();
    await expect(
      page.getByText('DOCX Metadata Scrubbing').first(),
    ).toBeVisible();
    await expect(
      page.getByText('True Character-Level Redaction').first(),
    ).toBeVisible();

    // Click through to verify /pdf/merge opens
    const toolLink = page.getByRole('link', {
      name: /Open interactive PDF Merge & Bundle Assembly|Open Workbench/i,
    });
    await expect(toolLink.first()).toBeVisible();
    await expect(toolLink.first()).toHaveAttribute('href', '/pdf/merge');

    await toolLink.first().click();
    await expect(page).toHaveURL(/\/pdf\/merge/);
    await expect(
      page.getByRole('button', { name: 'Choose PDFs', exact: true }),
    ).toBeVisible();
  });

  test('drives graphic designer workflow article and verifies image optimizer tool navigation', async ({
    page,
  }) => {
    await page.goto('/blog/graphic-design-asset-workflow-in-browser');

    await expect(
      page.getByRole('heading', {
        name: /The Graphic Designer's Asset Pipeline/i,
      }),
    ).toBeVisible();

    // Verify unbuilt gaps are acknowledged honestly
    await expect(
      page.getByText('Client iPhone HEIC Photos').first(),
    ).toBeVisible();
    await expect(
      page.getByText('EXIF Metadata Viewing & Stripping').first(),
    ).toBeVisible();

    // Click through to verify /image/optimize opens
    const toolLink = page.getByRole('link', {
      name: /Open interactive Image Optimizer & Format Converter|Open Workbench/i,
    });
    await expect(toolLink.first()).toBeVisible();
    await expect(toolLink.first()).toHaveAttribute('href', '/image/optimize');

    await toolLink.first().click();
    await expect(page).toHaveURL(/\/image\/optimize/);
    await expect(
      page.getByRole('button', { name: 'Choose image', exact: true }),
    ).toBeVisible();
  });

  test('drives digital marketer workflow article and verifies CSV to JSON tool navigation', async ({
    page,
  }) => {
    await page.goto('/blog/digital-marketer-data-and-asset-workflow');

    await expect(
      page.getByRole('heading', {
        name: /Digital Marketing Workflows in Browser/i,
      }),
    ).toBeVisible();

    // Verify CSV-only constraint is stated
    await expect(
      page.getByText('No Excel (.xlsx) Support').first(),
    ).toBeVisible();

    // Click through to verify /data/csv-to-json opens
    const toolLink = page.getByRole('link', {
      name: /Open interactive CSV to JSON Data Converter|Open Workbench/i,
    });
    await expect(toolLink.first()).toBeVisible();
    await expect(toolLink.first()).toHaveAttribute('href', '/data/csv-to-json');

    await toolLink.first().click();
    await expect(page).toHaveURL(/\/data\/csv-to-json/);
    await expect(
      page.getByRole('button', { name: /Choose CSV/i }),
    ).toBeVisible();
  });

  test('drives audio converter deep dive and verifies /audio/convert opens', async ({
    page,
  }) => {
    await page.goto('/blog/audio-to-wav-conversion-silent-resampling-trap');

    await expect(
      page.getByRole('heading', {
        name: /Building an In-Browser Audio Converter: The Silent Resampling Trap/i,
      }),
    ).toBeVisible();

    // Verify silent resampling trap content
    await expect(
      page.getByRole('heading', {
        name: /The Hidden Trap: Why decodeAudioData Quietly Alters Sample Rates/i,
      }),
    ).toBeVisible();

    // Verify WAV-only / no MP3 encoder explanation
    await expect(
      page.getByRole('heading', {
        name: /Why Output Is Strictly WAV and Why We Do Not Ship an MP3 Encoder/i,
      }),
    ).toBeVisible();

    // Click through to verify /audio/convert opens
    const toolLink = page.getByRole('link', {
      name: /Open interactive Audio to WAV Converter|Open Workbench/i,
    });
    await expect(toolLink.first()).toBeVisible();
    await expect(toolLink.first()).toHaveAttribute('href', '/audio/convert');

    await toolLink.first().click();
    await expect(page).toHaveURL(/\/audio\/convert/);
    await expect(page.getByLabel('Choose an audio file')).toBeVisible();
  });

  test('drives video trimmer deep dive and verifies /video/trim opens', async ({
    page,
  }) => {
    await page.goto('/blog/lossless-video-trimming-without-codecs-mp4');

    await expect(
      page.getByRole('heading', {
        name: /Video Editing Without a Codec: Lossless MP4 Trimming/i,
      }),
    ).toBeVisible();

    // Verify ctts box bug content
    await expect(
      page.getByRole('heading', {
        name: /B-Frames, DTS vs PTS, and the Omitted ctts Box/i,
      }),
    ).toBeVisible();

    // Verify keyframe snapping explanation
    await expect(
      page.getByRole('heading', {
        name: /Keyframe Snapping and Format Boundaries/i,
      }),
    ).toBeVisible();

    // Click through to verify /video/trim opens
    const toolLink = page.getByRole('link', {
      name: /Open interactive Lossless Video Trimmer|Open Workbench/i,
    });
    await expect(toolLink.first()).toBeVisible();
    await expect(toolLink.first()).toHaveAttribute('href', '/video/trim');

    await toolLink.first().click();
    await expect(page).toHaveURL(/\/video\/trim/);
    await expect(page.getByLabel('Choose a video file')).toBeVisible();
  });

  test('drives court exhibit binder template customizer and file download', async ({
    page,
  }) => {
    await page.goto('/templates/court-exhibit-binder-assembly-checklist');

    await expect(
      page.getByRole('heading', {
        name: /Court Exhibit Binder & Legal Document Assembly Checklist/i,
      }),
    ).toBeVisible();

    // Check companion tool link to /pdf/merge
    const toolLink = page.getByRole('link', { name: /Open Tool/i });
    await expect(toolLink).toBeVisible();
    await expect(toolLink).toHaveAttribute('href', '/pdf/merge');

    // Check interactive customizer fields
    const captionInput = page.getByLabel('Matter / Case Caption');
    await expect(captionInput).toBeVisible();
    await captionInput.fill('Smith v. Jones Construction Corp');

    // Trigger download and assert filename
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download Markdown/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      'court-exhibit-binder-assembly-checklist.md',
    );
  });

  test('drives creative client handoff template customizer and file download', async ({
    page,
  }) => {
    await page.goto('/templates/client-asset-export-preflight-checklist');

    await expect(
      page.getByRole('heading', {
        name: /Digital Asset Export & Creative Client Handoff Checklist/i,
      }),
    ).toBeVisible();

    // Check companion tool link to /image/optimize
    const toolLink = page.getByRole('link', { name: /Open Tool/i });
    await expect(toolLink).toBeVisible();
    await expect(toolLink).toHaveAttribute('href', '/image/optimize');

    // Check interactive customizer field
    const clientInput = page.getByLabel('Client / Brand Name');
    await expect(clientInput).toBeVisible();
    await clientInput.fill('Acme Global Rebrand 2026');

    // Trigger download and assert filename
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download Markdown/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      'client-asset-export-preflight-checklist.md',
    );
  });

  test('drives digital marketing launch template customizer and file download', async ({
    page,
  }) => {
    await page.goto('/templates/digital-marketing-campaign-launch-checklist');

    await expect(
      page.getByRole('heading', {
        name: /Omnichannel Campaign Launch & Data Hygiene Checklist/i,
      }),
    ).toBeVisible();

    // Check companion tool link to /data/csv-to-json
    const toolLink = page.getByRole('link', { name: /Open Tool/i });
    await expect(toolLink).toBeVisible();
    await expect(toolLink).toHaveAttribute('href', '/data/csv-to-json');

    // Check interactive customizer field
    const campaignInput = page.getByLabel('Campaign Name');
    await expect(campaignInput).toBeVisible();
    await campaignInput.fill('Fall Product Announcement');

    // Trigger download and assert filename
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download Markdown/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      'digital-marketing-campaign-launch-checklist.md',
    );
  });
});
