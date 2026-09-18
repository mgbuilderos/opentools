import { expect, test, type Page } from '@playwright/test';

/**
 * Every `?tool=` link the catalog and the site search hand out has to open the
 * operation it names. `lib/seo/live-tools.ts` says those URLs are live, so a
 * link that quietly opens the default operation instead is the catalog lying.
 *
 * These ran green while the live site was broken, which is the point of the
 * last test in this file: the failure only appeared once the served HTML
 * differed from what React rendered.
 */

const DEEP_LINKS = [
  {
    route: '/date/workbench',
    tool: 'business-days-calculator',
    expected: 'Business-days calculator',
  },
  {
    route: '/subtitles/workbench',
    tool: 'subtitle-check',
    expected: 'Check subtitles for problems',
  },
  {
    route: '/math/workbench',
    tool: 'lcm-calculator',
    expected: 'LCM calculator',
  },
  // A different component with its own handler, pinned here so both stay honest.
  { route: '/text/workbench', tool: 'word-counter', expected: 'Word counter' },
] as const;

async function selectedOperation(page: Page) {
  return page
    .locator('select')
    .first()
    .locator('option[selected], option')
    .first()
    .evaluate(
      () =>
        (
          document.querySelector('select') as HTMLSelectElement
        )?.selectedOptions[0]?.textContent?.trim() ?? '',
    );
}

test.describe('tool deep links', () => {
  for (const { route, tool, expected } of DEEP_LINKS) {
    test(`${route}?tool=${tool} opens ${expected}`, async ({ page }) => {
      await page.goto(`${route}?tool=${tool}`);
      await expect
        .poll(() => selectedOperation(page), { timeout: 15_000 })
        .toBe(expected);
    });
  }

  test('an unknown tool falls back to the default and says so in the URL', async ({
    page,
  }) => {
    await page.goto('/date/workbench?tool=not-a-real-operation');
    await expect
      .poll(() => page.url(), { timeout: 15_000 })
      .toContain('tool=add-days-to-date');
  });

  test('choosing another operation is not undone by the URL', async ({
    page,
  }) => {
    await page.goto('/subtitles/workbench?tool=subtitle-check');
    await expect
      .poll(() => selectedOperation(page), { timeout: 15_000 })
      .toBe('Check subtitles for problems');

    await page.getByLabel('Subtitle tool').selectOption('subtitle-shift');
    await expect(page).toHaveURL(/tool=subtitle-shift/u);
    // Give the effect several chances to fight back; it must not.
    await page.waitForTimeout(1200);
    expect(await selectedOperation(page)).toBe('Shift subtitle timing');
  });

  test('survives the served HTML differing from what React rendered', async ({
    page,
  }) => {
    // This is what production does and a local server does not: Cloudflare
    // injects its analytics beacon into the HTML at the edge. The page's own
    // CSP then blocks the script, but the tag is still in the markup React
    // hydrates against, so React rebuilds the tree — and a selection that was
    // only scheduled once is lost with it. Reproduced here so the fix is
    // tested against the condition that actually broke, not a tidier one.
    await page.route('**/subtitles/workbench?*', async (route) => {
      const response = await route.fetch();
      const html = await response.text();
      await route.fulfill({
        response,
        body: html.replace(
          '</body>',
          '<script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script></body>',
        ),
      });
    });

    await page.goto('/subtitles/workbench?tool=subtitle-framerate');
    await expect
      .poll(() => selectedOperation(page), { timeout: 15_000 })
      .toBe('Convert subtitle frame rate');
  });
});
