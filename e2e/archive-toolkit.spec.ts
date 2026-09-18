import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Download, type Page } from '@playwright/test';

import { readZip } from '../lib/tools/archive/zip-reader';
import { createZip } from '../lib/tools/docx/zip';

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'tools',
  'archive',
  '__fixtures__',
);

/** Ground truth from `unzip -l`: 3 files and 2 folders, 470 bytes of content. */
const SIMPLE = 'simple.zip';
const STORED = 'stored.zip';
const ENCRYPTED = 'encrypted.zip';

async function chooseArchive(page: Page, name: string, buffer?: Buffer) {
  await page.getByLabel('Choose a ZIP file').setInputFiles({
    name,
    mimeType: 'application/zip',
    buffer: buffer ?? (await readFile(path.join(fixtureDir, name))),
  });
}

async function saved(page: Page) {
  const download: Promise<Download> = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Save / }).click();
  return new Uint8Array(await readFile((await (await download).path())!));
}

test.describe('Archive toolkit', () => {
  test('lists what is inside before anything comes out', async ({ page }) => {
    await page.goto('/file/archive');
    await chooseArchive(page, SIMPLE);

    await expect(page.getByText('notes/readme.txt')).toBeVisible();
    await expect(page.getByText('notes/sub/second.txt')).toBeVisible();
    // The Devanagari name survives, though the archive never flagged it UTF-8.
    await expect(page.getByText('notes/हिंदी.txt')).toBeVisible();
    await expect(page.getByText('3 in 2 folders')).toBeVisible();
  });

  test('shows the date the archive stores, not one shifted by time zone', async ({
    page,
  }) => {
    // Our own writer stamps 1980-01-01, which a ZIP stores as wall-clock time
    // with no zone. Rendering it as UTC turned it into 1979-12-31 for anyone
    // east of Greenwich.
    const zip = await createZip([
      { path: 'stamped.txt', data: new TextEncoder().encode('when') },
    ]);
    await page.goto('/file/archive');
    await chooseArchive(page, 'stamped.zip', Buffer.from(zip));

    const row = page.getByRole('row', { name: /stamped\.txt/u });
    await expect(row).toContainText('1980-01-01');
    await expect(row).not.toContainText('1979');
  });

  test('takes a file out and checks it against the archive checksum', async ({
    page,
  }) => {
    await page.goto('/file/archive');
    await chooseArchive(page, SIMPLE);

    await page
      .getByRole('row', { name: /readme\.txt/u })
      .getByRole('button', { name: 'Take out' })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Took out readme.txt' }),
    ).toBeVisible();
    await expect(page.getByText('matches the checksum')).toBeVisible();

    const file = await saved(page);
    expect(file.length).toBe(429);
    expect(new TextDecoder().decode(file)).toContain(
      'Hello from a deflated file.',
    );
  });

  test('refuses a damaged file instead of handing it over', async ({
    page,
  }) => {
    // Flip one byte of the stored payload. The size still matches, so only the
    // checksum can tell this file is no longer what was put in.
    const bytes = new Uint8Array(await readFile(path.join(fixtureDir, STORED)));
    const archive = readZip(bytes);
    const entry = archive.entries.find((item) => !item.isDirectory)!;
    const view = new DataView(bytes.buffer);
    const dataStart =
      entry.localHeaderOffset +
      30 +
      view.getUint16(entry.localHeaderOffset + 26, true) +
      view.getUint16(entry.localHeaderOffset + 28, true);
    bytes[dataStart] ^= 0xff;

    await page.goto('/file/archive');
    await chooseArchive(page, 'damaged.zip', Buffer.from(bytes));
    await page
      .getByRole('row', { name: /readme\.txt/u })
      .getByRole('button', { name: 'Take out' })
      .click();

    await expect(page.getByRole('alert')).toContainText('failed its checksum');
    await expect(page.getByRole('button', { name: /^Save / })).toHaveCount(0);
  });

  test('marks a password-protected entry and will not open it', async ({
    page,
  }) => {
    await page.goto('/file/archive');
    await chooseArchive(page, ENCRYPTED);

    await expect(page.getByText('password-protected')).toBeVisible();
    await page.getByRole('button', { name: 'Take out' }).first().click();
    await expect(page.getByRole('alert')).toContainText('will not pretend to');
  });

  test('warns about a file that would be written outside the folder', async ({
    page,
  }) => {
    const zip = await createZip([
      { path: 'notes.txt', data: new TextEncoder().encode('ordinary') },
      {
        path: '../../.ssh/authorized_keys',
        data: new TextEncoder().encode('ssh-rsa AAAA'),
      },
    ]);

    await page.goto('/file/archive');
    await chooseArchive(page, 'sneaky.zip', Buffer.from(zip));

    await expect(
      page.getByText('Worth looking at before you unpack'),
    ).toBeVisible();
    await expect(
      page.getByText('walks out of the folder you extract into'),
    ).toBeVisible();
  });

  test('tells a RAR apart from a ZIP by name', async ({ page }) => {
    const rar = Buffer.alloc(200);
    rar.write('Rar!\x1a\x07\x00', 0, 'binary');

    await page.goto('/file/archive');
    await chooseArchive(page, 'archive.rar', rar);

    await expect(page.getByRole('alert')).toContainText(
      'RAR, 7z and tar.gz are different formats',
    );
  });

  test('packs files into a ZIP and opens it again before offering it', async ({
    page,
  }) => {
    await page.goto('/file/archive');
    await page.getByRole('tab', { name: 'Make a ZIP' }).click();

    await page.getByLabel('Choose files to pack').setInputFiles([
      {
        name: 'one.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('first file'),
      },
      {
        name: 'two.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('second file'),
      },
    ]);

    await page.getByRole('button', { name: /Pack 2 into a ZIP/u }).click();
    await expect(
      page.getByRole('heading', { name: 'Packed 2 files into a ZIP' }),
    ).toBeVisible();
    await expect(page.getByText('check every file is present')).toBeVisible();

    const zip = await saved(page);
    const archive = readZip(zip);
    expect(archive.fileCount).toBe(2);
    expect(archive.entries.map((entry) => entry.path).sort()).toEqual([
      'one.txt',
      'two.txt',
    ]);
  });

  test('sends nothing off this origin while doing the work', async ({
    page,
  }) => {
    await page.goto('/file/archive');
    const origin = new URL(page.url()).origin;
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) {
        offOrigin.push(request.url());
      }
    });

    await chooseArchive(page, SIMPLE);
    await page
      .getByRole('row', { name: /readme\.txt/u })
      .getByRole('button', { name: 'Take out' })
      .click();
    await expect(page.getByRole('button', { name: /^Save / })).toBeVisible();

    expect(offOrigin).toEqual([]);
  });
});
