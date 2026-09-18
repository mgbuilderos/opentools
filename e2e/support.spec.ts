import { expect, test } from '@playwright/test';

test.describe('Support page', () => {
  test('renders header and transparent infrastructure cost breakdown', async ({
    page,
  }) => {
    await page.goto('/support');

    // Header checks
    await expect(
      page.getByRole('heading', { name: /Keep these tools free/i }),
    ).toBeVisible();

    // Transparent infrastructure cost section
    await expect(
      page.getByText(
        'What your support pays for — transparent infrastructure costs',
      ),
    ).toBeVisible();
    await expect(page.getByText('Cloudflare Workers Paid')).toBeVisible();
    await expect(page.getByText('$5 / month')).toBeVisible();
    await expect(page.getByText('Domain & DNS')).toBeVisible();
    await expect(page.getByText('$12 / year')).toBeVisible();
    await expect(
      page.getByText('Cloud File Ingestion & Storage'),
    ).toBeVisible();
    await expect(page.getByText('$0 / forever')).toBeVisible();
    await expect(page.getByText(/connect-src 'none'/i)).toBeVisible();
  });

  test('drives Buy Me a Coffee international tiers with exact multiples', async ({
    page,
  }) => {
    await page.goto('/support');

    // Switch to international coffee tab specifically by its tab label
    const coffeeTab = page.getByRole('button', {
      name: /Buy Me a Coffee/i,
    });
    await coffeeTab.click();

    // Verify Buy Me a Coffee panel is active
    await expect(
      page.getByRole('heading', { name: /Buy me a coffee/i }),
    ).toBeVisible();

    // Verify the three tiers: $5, $10, $25
    const link5 = page.locator(
      'a[href*="buymeacoffee.com/codebuilder?coffees=1"]',
    );
    const link10 = page.locator(
      'a[href*="buymeacoffee.com/codebuilder?coffees=2"]',
    );
    const link25 = page.locator(
      'a[href*="buymeacoffee.com/codebuilder?coffees=5"]',
    );

    await expect(link5).toBeVisible();
    await expect(link10).toBeVisible();
    await expect(link25).toBeVisible();

    // Verify target="_blank" and rel="noopener noreferrer"
    await expect(link5).toHaveAttribute('target', '_blank');
    await expect(link5).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('verifies GitHub Sponsors is marked pending with zero payment controls', async ({
    page,
  }) => {
    await page.goto('/support');

    // Click GitHub tab
    const githubTab = page.getByRole('button', { name: /GitHub/i });
    await githubTab.click();

    // Check pending notice heading
    await expect(
      page.getByRole('heading', { name: /Not open yet/i }),
    ).toBeVisible();
    await expect(page.getByText(/Waiting on GitHub approval/i)).toBeVisible();

    // Crucial: Must have zero payment controls or sponsor URLs
    const sponsorLinks = page.locator('a[href*="github.com/sponsors"]');
    await expect(sponsorLinks).toHaveCount(0);
  });

  test('verifies UPI tab controls and real address when UPI is configured', async ({
    page,
  }) => {
    await page.goto('/support');

    const upiTab = page.getByRole('button', { name: /UPI/i });
    if ((await upiTab.count()) > 0) {
      await upiTab.click();

      // Verify real address mg.io.test@oksbi is present
      await expect(page.getByText('mg.io.test@oksbi')).toBeVisible();

      // Verify payment button has valid upi://pay link with payee address
      const payButton = page.locator('a[href^="upi://pay"]');
      await expect(payButton).toBeVisible();
      const href = (await payButton.getAttribute('href')) ?? '';
      expect(href).toContain('pa=mg.io.test%40oksbi');

      // Click another preset (e.g. ₹99) and verify button updates
      const preset99 = page.getByRole('button', { name: /₹99/i });
      if ((await preset99.count()) > 0) {
        await preset99.first().click();
        await expect(page.locator('a[href^="upi://pay"]')).toHaveText(
          /Pay ₹99/i,
        );
      }
    }
  });

  test('renders without horizontal overflow at mobile 375x812', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/support');

    const overflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(overflow).toBe(false);
  });
});
