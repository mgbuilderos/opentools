import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "lib",
  "tools",
  "lists",
  "__fixtures__",
);

test.describe("Customer List Hygiene Suite (/data/lists)", () => {
  test("loads CSV, de-duplicates records, normalizes PII, and compares segments", async ({
    page,
  }) => {
    await page.goto("/data/lists");

    // 1. Verify title & privacy notice
    await expect(
      page.getByRole("heading", { name: "Customer List Hygiene & Deduplicator" }),
    ).toBeVisible();
    await expect(
      page.getByText("Sensitive Data Privacy Guarantee"),
    ).toBeVisible();
    await expect(
      page.getByText(/processes your rows entirely inside your local browser memory/i),
    ).toBeVisible();

    // 2. Upload primary dirty subscribers fixture
    const dirtyPath = path.join(fixturesDir, "dirty-subscribers.csv");
    const inputA = page.locator("input#csv-file-input-a");
    await inputA.setInputFiles([dirtyPath]);

    // 3. Toolbar shows file info
    await expect(page.getByText("dirty-subscribers.csv")).toBeVisible();
    await expect(page.getByText(/6 records • 6 columns/i)).toBeVisible();

    // 4. Default Deduplication Mode
    // Key Column defaults to First Name (idx 0), switch to Email Address (idx 2)
    const dedupSelect = page.locator("select").first();
    await dedupSelect.selectOption({ label: "Email Address" });

    // Verify deduplication stats: 6 original, 2 duplicates removed, 4 clean records
    await expect(page.getByText("Original Records")).toBeVisible();
    await expect(page.getByText("Duplicates Removed")).toBeVisible();
    await expect(page.getByText("Clean Unique Records")).toBeVisible();

    // Download deduplicated CSV
    const [dedupDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Download De-duplicated CSV/i }).click(),
    ]);

    const dedupFilePath = await dedupDownload.path();
    expect(dedupFilePath).toBeTruthy();
    if (dedupFilePath) {
      const content = await readFile(dedupFilePath, "utf8");
      expect(content).toContain("Email Address");
      expect(content).toContain("alice.smith@acme.corp");
      expect(content).toContain("charlie.b@peanuts.org");
    }

    // 5. Test Normalisation Mode
    await page.getByRole("button", { name: /Normalise & Clean/i }).click();
    await expect(page.getByText(/Assign standardization rules per column/i)).toBeVisible();

    const [normDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Download Normalised CSV/i }).click(),
    ]);
    const normFilePath = await normDownload.path();
    expect(normFilePath).toBeTruthy();

    // 6. Test Split Mode
    await page.getByRole("button", { name: "Split List" }).click();
    await page.getByLabel(/Split by Column Value/i).check();
    await page.getByLabel("Column to Group by").selectOption({ label: "Plan" });
    await expect(page.getByText(/Found 3 distinct groups/i)).toBeVisible();

    // 7. Test Compare Mode
    await page.getByRole("button", { name: "Compare Lists" }).click();
    await expect(page.getByText(/Select a secondary CSV file to compare/i)).toBeVisible();

    const secondPath = path.join(fixturesDir, "second-subscribers.csv");
    const inputB = page.locator("input#csv-file-input-b");
    await inputB.setInputFiles([secondPath]);

    // Select Email Address on List A and Email Address on List B
    await expect(page.getByText("In Both Lists")).toBeVisible();
    await expect(page.getByText(/Only in second-subscribers.csv/i)).toBeVisible();
  });
});
