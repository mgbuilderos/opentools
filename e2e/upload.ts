import { expect, type Locator } from '@playwright/test';

/**
 * Hands an input its files, and makes sure the page actually took them.
 *
 * Every file input on this site is server-rendered, so it exists in the DOM
 * before React has hydrated and attached `onChange`. Files set in that window
 * fire a change event into nothing: the upload silently does not happen, the
 * page sits on its empty state, and the test then fails somewhere far away on
 * a missing action button — which reads like a broken decoder or a broken
 * tool rather than a lost event.
 *
 * It is a race, so it moves. Across runs of the same seven specs at three
 * workers it surfaced in `audio-convert`, then `metadata`, then
 * `docx-metadata` and `pdf-to-word` — a different pair each time, which is
 * the tell that no single tool is at fault.
 *
 * Waiting for the chunks to land before selecting is what actually closes the
 * window, and it is the guard `egress-proof`, `image-to-text`, `pdf-ocr` and
 * `pdf-redact` already carry. The retry behind it is a fallback, and it
 * clears the input first: setting the same files twice does not necessarily
 * fire a second change event, so a naive re-set can spin as a no-op until the
 * test times out.
 *
 * `reacted` should be something the page shows for **any** file it is given
 * here, including one it means to refuse — a refusal proves the handler is
 * live just as well as an acceptance does.
 */
export async function setFilesWhenLive(
  input: Locator,
  files: Parameters<Locator['setInputFiles']>[0],
  reacted: Locator,
) {
  await input.page().waitForLoadState('networkidle');
  await input.setInputFiles(files);
  try {
    await expect(reacted.first()).toBeVisible({ timeout: 10_000 });
    return;
  } catch {
    // The window was missed anyway. Fall through and select again.
  }

  await expect(async () => {
    await input.setInputFiles([]);
    await input.setInputFiles(files);
    await expect(reacted.first()).toBeVisible({ timeout: 10_000 });
  }).toPass({ timeout: 30_000 });
}
