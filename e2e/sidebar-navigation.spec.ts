import { test, expect } from '@playwright/test';

import {
  NAVIGATION_MAJOR_SECTIONS,
  publicTools,
  toolDestinationsForGroup,
  toolGroups,
} from '../lib/tools/catalog';

// `catalog.test.ts` proves the data is right. This proves the sidebar actually
// renders it, which is the half that failed: `video` was a complete group with
// a live tool and a passing unit suite, and no visitor could ever see it.
//
// Counts are computed from the catalogue rather than written down, so adding a
// tool does not break this spec -- only failing to make it browsable does.
const expectedGroups = NAVIGATION_MAJOR_SECTIONS.flatMap((section) =>
  section.groupCategoryIds.map((id) => {
    const group = toolGroups.find((candidate) => candidate.id === id)!;
    return {
      name: group.name,
      count: toolDestinationsForGroup(group).length,
    };
  }),
);

const everyDestination = publicTools.reduce(
  (total, tool) => total + (tool.searchEntries?.length || 1),
  0,
);

test.describe('sidebar navigation', () => {
  test('lists every workspace, and reaches every destination', async ({
    page,
  }) => {
    await page.goto('/');
    const links = page
      .locator('nav[aria-label="Tool categories"]')
      .first()
      .locator('a[href^="/?category="]');

    await expect(links).toHaveCount(expectedGroups.length);

    const rendered = await links.evaluateAll((elements) =>
      elements.map((element) => ({
        name: element.querySelector('.truncate')?.textContent?.trim() ?? '',
        count: Number(element.querySelector('.tabular')?.textContent?.trim()),
      })),
    );

    expect(rendered).toEqual(expectedGroups);

    const browsable = rendered.reduce((total, group) => total + group.count, 0);
    expect(
      browsable,
      'destinations a visitor can only reach by search',
    ).toBe(everyDestination);
  });

  test('opens a workspace that used to be unreachable', async ({ page }) => {
    // Documents & office held 38 operations and belonged to no workspace, so
    // the site's top Search Console query -- "latex table generator" -- landed
    // on a tool the menu could not reach. Walk the whole path a visitor walks.
    await page.goto('/?category=documents');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /Documents & office/,
    );

    await page
      .getByRole('link', { name: /LaTeX table generator/ })
      .first()
      .click();

    await expect(page).toHaveURL(
      /\/documents\/workbench\?tool=latex-table-generator/,
    );
    // The forensic audit found 34 routes that opened with a red error box over
    // an untouched input. A reachable tool that greets you with one is no win.
    await expect(page.locator('[role=alert]')).toHaveCount(0);
    await expect(page.getByText(/\\begin\{tabular\}/).first()).toBeVisible();
  });
});
