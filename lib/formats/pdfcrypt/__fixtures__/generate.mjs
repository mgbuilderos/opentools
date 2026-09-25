import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument, StandardFonts } from 'pdf-lib';

import {
  encryptedPdfFixtures,
  fixtureBytes,
} from '../../../tools/pdf/pdf-encryption.fixtures.ts';

const here = dirname(fileURLToPath(import.meta.url));
await mkdir(here, { recursive: true });

for (const [name, base64] of Object.entries(encryptedPdfFixtures)) {
  await writeFile(
    resolve(here, `${name}.pdf`),
    new Uint8Array(fixtureBytes(base64)),
  );
}

const document = await PDFDocument.create();
document.setTitle('Synthetic OpenTools PDF encryption fixture');
document.setCreator('OpenTools synthetic fixture generator');
document.setProducer('OpenTools synthetic fixture generator');
document.setCreationDate(new Date('2026-09-25T00:00:00.000Z'));
document.setModificationDate(new Date('2026-09-25T00:00:00.000Z'));
const font = await document.embedFont(StandardFonts.Helvetica);
const page = document.addPage([300, 200]);
page.drawText('OpenTools format fixture', { x: 36, y: 110, size: 18, font });
page.drawText('No personal data.', { x: 36, y: 82, size: 11, font });
await writeFile(
  resolve(here, 'plain.pdf'),
  await document.save({ useObjectStreams: false }),
);

await writeFile(
  resolve(here, 'wrong-magic.pdf'),
  new TextEncoder().encode('not a pdf'),
);
await writeFile(
  resolve(here, 'truncated.pdf'),
  new Uint8Array(fixtureBytes(encryptedPdfFixtures.aes128UserPassword)).slice(
    0,
    180,
  ),
);
await writeFile(
  resolve(here, 'declared-length.pdf'),
  new TextEncoder().encode(
    '%PDF-1.7\n1 0 obj\n<< /Length 9999 >>\nstream\nx\nendstream\nendobj\n',
  ),
);
