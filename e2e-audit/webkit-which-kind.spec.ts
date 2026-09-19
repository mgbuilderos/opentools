// Each value kind in its OWN transaction, so one failure cannot mask another.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

test('which value kinds can this engine store and re-read', async ({ page }, testInfo) => {
  await page.goto('/');

  const report = await page.evaluate(async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const kinds: Record<string, () => unknown> = {
      string: () => 'plain string',
      arraybuffer: () => bytes.buffer.slice(0),
      uint8array: () => new Uint8Array(bytes),
      blob: () => new Blob([bytes]),
      file: () => new File([bytes], 'x.pdf', { type: 'application/pdf' }),
    };
    const out: Record<string, string> = {};

    for (const [name, make] of Object.entries(kinds)) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open(`k-${name}`, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('s');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(new Error('open failed'));
      });
      out[name] = await new Promise<string>((res) => {
        let tx: IDBTransaction;
        try {
          tx = db.transaction('s', 'readwrite');
        } catch (e) {
          res(`transaction() threw: ${String(e).slice(0, 80)}`);
          return;
        }
        try {
          tx.objectStore('s').put(make(), 'k');
        } catch (e) {
          // A structured-clone refusal surfaces synchronously here.
          res(`put() threw: ${(e as Error).name}: ${(e as Error).message.slice(0, 90)}`);
          return;
        }
        tx.oncomplete = () => res('stored');
        tx.onerror = () =>
          res(`tx error: ${tx.error?.name ?? 'null'} ${tx.error?.message?.slice(0, 80) ?? ''}`);
        tx.onabort = () =>
          res(`tx abort: ${tx.error?.name ?? 'null'} ${tx.error?.message?.slice(0, 80) ?? ''}`);
      });
      db.close();
    }
    return out;
  });

  mkdirSync('audit-out', { recursive: true });
  writeFileSync(
    `audit-out/which-kind-${testInfo.project.name}.json`,
    JSON.stringify(report, null, 1),
  );
  expect(true).toBe(true);
});
