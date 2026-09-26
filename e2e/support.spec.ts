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
    await expect(page.getByText('Edge Hosting & Uptime')).toBeVisible();
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

    /*
      Buy Me a Coffee is the only channel offered, so its panel is what the page
      opens on and there is no tab bar to click. The click is kept, guarded, so
      this test still passes if `SHOW_UPI` is turned back on and the tabs return.
    */
    const coffeeTab = page.getByRole('button', {
      name: /Buy Me a Coffee/i,
    });
    if ((await coffeeTab.count()) > 0) await coffeeTab.first().click();

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

  /*
    Owner decision 2026-09-27: the page offers exactly one channel. UPI and the
    pending GitHub Sponsors panel were both removed from the interface — the
    UPI code all stays, behind `SHOW_UPI`, and this test is what stops either
    one reappearing by accident. It reads the rendered page, so a component that
    starts importing `getUpiPaymentUrl` again fails here rather than at review.

    If UPI is deliberately turned back on, `SHOW_UPI` is the switch, and this
    test has to be replaced with one that asserts the tab and its controls work.
  */
  test('offers Buy Me a Coffee and nothing else — no UPI, no GitHub Sponsors', async ({
    page,
  }) => {
    await page.goto('/support');

    // The one channel that is offered, with a working link.
    const coffeeLinks = page.locator('a[href*="buymeacoffee.com"]');
    expect(await coffeeLinks.count()).toBeGreaterThan(0);
    await expect(coffeeLinks.first()).toBeVisible();

    // No UPI: no deep link, no address, no QR, no rupee amounts.
    await expect(page.locator('a[href^="upi://"]')).toHaveCount(0);
    await expect(page.getByText(/mg\.io\.test@oksbi/i)).toHaveCount(0);
    await expect(page.getByText(/UPI/i)).toHaveCount(0);
    await expect(page.getByText(/Scan from another device/i)).toHaveCount(0);

    // No GitHub at all on this page: no sponsors URL, no star ask, no panel
    // announcing a channel that is still waiting on approval.
    await expect(page.locator('a[href*="github.com"]')).toHaveCount(0);
    await expect(page.getByText(/Star on GitHub|star the repo/i)).toHaveCount(
      0,
    );
    await expect(page.getByText(/Waiting on GitHub approval/i)).toHaveCount(0);
    await expect(page.getByText(/Not open yet/i)).toHaveCount(0);
  });

  /*
    The link to this page used to say "Support" beside a pulsing green dot,
    which is the shape of a live-chat launcher — a visitor whose file failed
    read it as the way to reach a person, and there is nobody behind it. The
    label has to keep saying what the page does.
  */
  test('the nav link reads as a coffee, not as a help desk', async ({
    page,
  }) => {
    await page.goto('/');

    const supportLinks = page.locator('a[href="/support"]');
    expect(await supportLinks.count()).toBeGreaterThan(0);

    /*
      Empty strings are dropped, not failed: one of these links sits in the
      category rail, which collapses to icons at some widths, and a collapsed
      label is legitimately unreadable. Every label that does render has to say
      coffee, and at least one has to render.
    */
    const labels = (await supportLinks.allInnerTexts())
      .map((label) => label.trim())
      .filter(Boolean);
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label).toMatch(/coffee/iu);
      expect(label).not.toMatch(/\bsupport\b/iu);
    }

    // The pulsing "an agent is online" dot is the strongest of the three cues.
    await expect(page.locator('a[href="/support"] .animate-ping')).toHaveCount(
      0,
    );

    // And the header makes one ask: no star ask anywhere beside it.
    await expect(page.getByText(/Star on GitHub/i)).toHaveCount(0);
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
