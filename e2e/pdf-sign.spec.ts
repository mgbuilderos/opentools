import { readFile } from 'node:fs/promises';
import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
} from '@playwright/test';
import type {
  PDFDict as PdfLibDict,
  PDFDocument as PdfLibDocument,
  PDFObject,
} from 'pdf-lib';

import {
  testDigitallySignedPdf,
  testFinalFormPdf,
  testFormPdf,
  testGeometryPdf,
  testPdf,
  testStaticXfaPdf,
  testStoredChoicePdf,
  testUntouchedFormPdf,
} from './fixtures';

/**
 * A signing tool is only worth shipping if the values and the signature are
 * really in the saved file, so these specs reopen the download with pdf-lib
 * and read its content streams rather than trusting the receipt on screen.
 */

/** The pad is exported whole: 640 x 200, so a stamp is 0.3125 times as tall. */
const STAMP_ASPECT = 200 / 640;
const DONE = /^Done — \d+ pages? ready$/u;

async function choosePdf(page: Page, buffer: Buffer, name = 'form.pdf') {
  await expect(async () => {
    const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
    await page
      .getByRole('button', { name: /choose a pdf/iu })
      .first()
      .click();
    await (
      await chooser
    ).setFiles({
      name,
      mimeType: 'application/pdf',
      buffer,
    });
  }).toPass({ timeout: 45_000 });
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({
    timeout: 60_000,
  });
}

async function drawSignature(page: Page) {
  // Located by CSS: getByLabel does not match a bare canvas.
  const pad = page.locator('canvas[aria-label="Signature pad"]');
  await expect(pad).toBeVisible();
  // Measure after scrolling: the pad sits below the fold, and mouse events at
  // coordinates outside the viewport never reach it.
  await pad.scrollIntoViewIfNeeded();
  const box = (await pad.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3, {
    steps: 8,
  });
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.7, {
    steps: 8,
  });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.35, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByText('Signature ready')).toBeVisible();
}

async function typeSignature(page: Page, name: string) {
  await page.getByRole('radio', { name: 'Type your name' }).check();
  await page.getByRole('textbox', { name: 'Type your name' }).fill(name);
  await expect(page.getByText('Signature ready')).toBeVisible();
}

async function finish(page: Page) {
  await page.getByRole('button', { name: 'Finish PDF' }).click();
  await expect(page.getByRole('heading', { name: DONE })).toBeVisible({
    timeout: 60_000,
  });
}

async function downloadBytes(download: Promise<Download>) {
  return readFile((await (await download).path())!);
}

async function savedPdf(page: Page) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save completed PDF' }).click();
  return downloadBytes(download);
}

async function placement(page: Page) {
  const read = async (label: string) =>
    Number(await page.getByLabel(label).inputValue());
  return {
    x: await read('Signature from left'),
    y: await read('Signature from top'),
    width: await read('Signature width'),
  };
}

// ---------------------------------------------------------------------------
// Reading the saved file

type Matrix = [number, number, number, number, number, number];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

async function pdfLib() {
  return import('pdf-lib');
}

async function streamText(document: PdfLibDocument, raw?: PDFObject) {
  const { PDFRawStream, decodePDFRawStream } = await pdfLib();
  const stream = raw ? document.context.lookup(raw) : undefined;
  if (!(stream instanceof PDFRawStream)) return '';
  return Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
}

/**
 * Runs a page's content streams far enough to know the CTM at every Do, so a
 * test sees where each XObject really lands, including any transform the
 * original content left behind without q/Q.
 */
async function pageDraws(document: PdfLibDocument, pageIndex: number) {
  const { PDFArray, PDFDict, PDFName, PDFRawStream, decodePDFRawStream } =
    await pdfLib();
  const page = document.getPage(pageIndex);
  const contents = page.node.get(PDFName.of('Contents'));
  const resolved = contents ? document.context.lookup(contents) : undefined;
  const parts =
    resolved instanceof PDFArray
      ? resolved.asArray()
      : contents
        ? [contents]
        : [];
  const sources = await Promise.all(
    parts.map((part) => streamText(document, part)),
  );
  const tokens = sources.join('\n').split(/\s+/u).filter(Boolean);

  const identity: Matrix = [1, 0, 0, 1, 0, 0];
  let ctm = identity;
  const saved: Matrix[] = [];
  let operands: string[] = [];
  const draws: Array<{ name: string; ctm: Matrix }> = [];
  for (const token of tokens) {
    if (
      /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/iu.test(token) ||
      token.startsWith('/')
    ) {
      operands.push(token);
      continue;
    }
    if (token === 'q') saved.push(ctm);
    else if (token === 'Q') ctm = saved.pop() ?? identity;
    else if (token === 'cm') {
      ctm = multiply(operands.slice(-6).map(Number) as Matrix, ctm);
    } else if (token === 'Do') {
      draws.push({ name: operands[operands.length - 1]!.slice(1), ctm });
    }
    operands = [];
  }

  const xObjects = page.node
    .Resources()
    ?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  return draws.map((draw) => {
    const raw = xObjects?.get(PDFName.of(draw.name));
    const object = raw ? document.context.lookup(raw) : undefined;
    const stream = object instanceof PDFRawStream ? object : undefined;
    const number = (key: string) =>
      Number(stream?.dict.get(PDFName.of(key))?.toString());
    return {
      ...draw,
      raw,
      subtype: stream?.dict.get(PDFName.of('Subtype'))?.toString(),
      pixelWidth: number('Width'),
      pixelHeight: number('Height'),
      /** RGB samples and their soft-mask alpha, for an 8-bit RGB image. */
      pixels: () => {
        if (!stream) return null;
        const mask = document.context.lookup(
          stream.dict.get(PDFName.of('SMask')),
        );
        return {
          rgb: decodePDFRawStream(stream).decode(),
          alpha:
            mask instanceof PDFRawStream
              ? decodePDFRawStream(mask).decode()
              : null,
        };
      },
    };
  });
}

async function imageDraws(document: PdfLibDocument, pageIndex: number) {
  return (await pageDraws(document, pageIndex)).filter(
    (draw) => draw.subtype === '/Image',
  );
}

type Geometry = {
  box: { x: number; y: number; width: number; height: number };
  rotation: 0 | 90 | 180 | 270;
};

/**
 * Where an image-space point (s, t in 0..1) is shown, measured from the
 * top-left of the displayed page. Derived here from the PDF rules rather than
 * the app's helper: /Rotate turns the page clockwise for display.
 */
function displayedPoint(
  ctm: Matrix,
  { box, rotation }: Geometry,
  s: number,
  t: number,
) {
  const [a, b, c, d, e, f] = ctm;
  const u = a * s + c * t + e - box.x;
  const v = b * s + d * t + f - box.y;
  if (rotation === 90) return { x: v, y: u };
  if (rotation === 180) return { x: box.width - u, y: v };
  if (rotation === 270) return { x: box.height - v, y: box.width - u };
  return { x: u, y: box.height - v };
}

/** Asserts the stamp covers exactly this displayed rectangle, upright. */
function expectStampAt(
  ctm: Matrix,
  geometry: Geometry,
  rect: { x: number; y: number; width: number; height: number },
) {
  const corner = (s: number, t: number, x: number, y: number) => {
    const point = displayedPoint(ctm, geometry, s, t);
    expect(point.x, `image corner (${s},${t}) x`).toBeCloseTo(x, 2);
    expect(point.y, `image corner (${s},${t}) y`).toBeCloseTo(y, 2);
  };
  // Bottom-left, bottom-right, top-left and top-right of the image itself:
  // the image's bottom must be shown at the bottom, so it is upright.
  corner(0, 0, rect.x, rect.y + rect.height);
  corner(1, 0, rect.x + rect.width, rect.y + rect.height);
  corner(0, 1, rect.x, rect.y);
  corner(1, 1, rect.x + rect.width, rect.y);
}

/** Asserts every corner of the stamp lies inside the displayed page. */
function expectStampInside(
  ctm: Matrix,
  geometry: Geometry,
  displayed: { width: number; height: number },
) {
  for (const [s, t] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const) {
    const point = displayedPoint(ctm, geometry, s, t);
    expect(point.x).toBeGreaterThanOrEqual(-0.5);
    expect(point.y).toBeGreaterThanOrEqual(-0.5);
    expect(point.x).toBeLessThanOrEqual(displayed.width + 0.5);
    expect(point.y).toBeLessThanOrEqual(displayed.height + 0.5);
  }
}

/** How pdf-lib writes WinAnsi text into an appearance: a hex string. */
function hexOf(text: string) {
  return Buffer.from(text, 'latin1').toString('hex').toLowerCase();
}

/** Everything a page shows: its content plus every form XObject it draws. */
async function printedText(document: PdfLibDocument, pageIndex: number) {
  const { PDFArray, PDFName } = await pdfLib();
  const page = document.getPage(pageIndex);
  const contents = page.node.get(PDFName.of('Contents'));
  const resolved = contents ? document.context.lookup(contents) : undefined;
  const parts =
    resolved instanceof PDFArray
      ? resolved.asArray()
      : contents
        ? [contents]
        : [];
  const texts = await Promise.all([
    ...parts.map((part) => streamText(document, part)),
    ...(await pageDraws(document, pageIndex))
      .filter((draw) => draw.subtype === '/Form')
      .map((draw) => streamText(document, draw.raw)),
  ]);
  return texts.join('\n').toLowerCase();
}

/**
 * A field's stored state: value, appearance settings and each widget's
 * appearance streams, so "untouched" can be checked byte for byte.
 */
async function fieldSnapshot(document: PdfLibDocument, name: string) {
  const { PDFDict, PDFName, PDFRawStream } = await pdfLib();
  const field = document.getForm().getField(name).acroField;
  const entry = (dict: PdfLibDict, key: string) =>
    dict.get(PDFName.of(key))?.toString() ?? null;
  const widgets = await Promise.all(
    field.getWidgets().map(async (widget) => {
      const normal = widget.dict
        .lookupMaybe(PDFName.of('AP'), PDFDict)
        ?.get(PDFName.of('N'));
      const resolved = normal ? document.context.lookup(normal) : undefined;
      let appearance: Record<string, string> | string | null = null;
      if (resolved instanceof PDFRawStream) {
        appearance = await streamText(document, normal);
      } else if (resolved instanceof PDFDict) {
        appearance = {};
        for (const [key, value] of resolved.entries()) {
          appearance[key.toString()] = await streamText(document, value);
        }
      }
      return {
        AS: entry(widget.dict, 'AS'),
        DA: entry(widget.dict, 'DA'),
        F: entry(widget.dict, 'F'),
        appearance,
      };
    }),
  );
  return {
    V: entry(field.dict, 'V'),
    DA: entry(field.dict, 'DA'),
    I: entry(field.dict, 'I'),
    Opt: entry(field.dict, 'Opt'),
    Ff: entry(field.dict, 'Ff'),
    widgets,
  };
}

test.describe('Sign and fill PDF', () => {
  test('writes the fields and draws the signature on the chosen page, at the chosen spot and width', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));

    await page.goto('/pdf/sign');
    await choosePdf(page, await testFormPdf(1));

    await page.getByLabel('applicant.name').fill('Maulik Gupta');
    await page.getByLabel('agree.terms').check();
    await page.getByLabel('address.country').selectOption('Singapore');
    await drawSignature(page);

    await page.getByLabel('Signature page').fill('2');
    await page.getByLabel('Signature width').fill('150');
    await page.getByLabel('Signature from left').fill('100');
    await page.getByLabel('Signature from top').fill('300');
    expect(await placement(page)).toEqual({ x: 100, y: 300, width: 150 });

    // Leave the form editable so the values can be read back as field values.
    await page.getByRole('checkbox', { name: 'Make it final' }).uncheck();
    await finish(page);
    await expect(page.getByText('Drawn onto the page')).toBeVisible();
    await expect(page.getByText('3 changed, still editable')).toBeVisible();

    const saved = await savedPdf(page);
    const { PDFDocument } = await pdfLib();
    const document = await PDFDocument.load(saved);
    const form = document.getForm();
    expect(form.getTextField('applicant.name').getText()).toBe('Maulik Gupta');
    expect(form.getCheckBox('agree.terms').isChecked()).toBe(true);
    expect(form.getDropdown('address.country').getSelected()).toEqual([
      'Singapore',
    ]);

    expect(await imageDraws(document, 0)).toHaveLength(0);
    const images = await imageDraws(document, 1);
    expect(images).toHaveLength(1);
    const image = images[0]!;
    expect(image.pixelHeight / image.pixelWidth).toBeCloseTo(STAMP_ASPECT, 4);
    expectStampAt(
      image.ctm,
      { box: { x: 0, y: 0, width: 400, height: 500 }, rotation: 0 },
      { x: 100, y: 300, width: 150, height: 150 * STAMP_ASPECT },
    );

    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('fills, types a signature, places it and saves using only the keyboard', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    const keyboard = page.keyboard;
    // WebKit on macOS moves Tab only between text fields unless full keyboard
    // access is turned on, so the Tab order itself is proved in Chromium and
    // WebKit reaches buttons and check boxes directly.
    const tabsEverywhere = browserName !== 'webkit';
    const tabTo = async (target: Locator, limit = 20) => {
      if (!tabsEverywhere) {
        await target.focus();
        return;
      }
      for (let step = 0; step < limit; step += 1) {
        if (
          await target.evaluate(
            (element) => element === element.ownerDocument.activeElement,
          )
        ) {
          return;
        }
        await keyboard.press('Tab');
      }
      await expect(target).toBeFocused();
    };

    await page.goto('/pdf/sign');
    const buffer = await testFormPdf();
    await expect(async () => {
      const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
      await page.getByRole('button', { name: 'Choose a PDF to sign' }).focus();
      await keyboard.press('Enter');
      await (
        await chooser
      ).setFiles({ name: 'form.pdf', mimeType: 'application/pdf', buffer });
    }).toPass({ timeout: 45_000 });

    // Focus lands on the file summary, not on nothing.
    const summary = page.getByRole('heading', { name: 'form.pdf' });
    await expect(summary).toBeFocused({ timeout: 60_000 });

    await tabTo(page.getByLabel('applicant.name'));
    await keyboard.type('Jane Austen');
    await tabTo(page.getByLabel('agree.terms'));
    await keyboard.press('Space');
    await expect(page.getByLabel('agree.terms')).toBeChecked();

    const typeMode = page.getByRole('radio', { name: 'Type your name' });
    if (tabsEverywhere) {
      // Tab stops on the checked radio; an arrow key moves to the next one.
      await tabTo(page.getByRole('radio', { name: 'Draw' }));
      await keyboard.press('ArrowRight');
      await expect(typeMode).toBeFocused();
    } else {
      await typeMode.focus();
      await keyboard.press('Space');
    }
    await expect(typeMode).toBeChecked();
    await tabTo(page.getByRole('textbox', { name: 'Type your name' }));
    await keyboard.type('Jane Austen');
    await expect(page.getByText('Signature ready')).toBeVisible();

    // A width typed digit by digit must not be clamped after the first one.
    const width = page.getByLabel('Signature width');
    await tabTo(width);
    await keyboard.press('ControlOrMeta+A');
    await keyboard.type('150');
    await expect(width).toHaveValue('150');

    // Enter on the outline has no pointer position, so it centres the stamp.
    await tabTo(
      page.getByRole('button', {
        name: 'Place the signature on the page outline',
      }),
    );
    await keyboard.press('Enter');
    const placed = await placement(page);
    expect(placed.width).toBe(150);
    const height = placed.width * STAMP_ASPECT;
    expect(Math.abs(placed.x + placed.width / 2 - 200)).toBeLessThanOrEqual(1);
    expect(Math.abs(placed.y + height / 2 - 250)).toBeLessThanOrEqual(1);

    await tabTo(page.getByRole('checkbox', { name: 'Make it final' }));
    await keyboard.press('Space');
    await expect(
      page.getByRole('checkbox', { name: 'Make it final' }),
    ).not.toBeChecked();

    await tabTo(page.getByRole('button', { name: 'Finish PDF' }));
    await keyboard.press('Enter');
    // Finish disables itself while it works; focus then lands on the result.
    await expect(page.getByRole('heading', { name: DONE })).toBeFocused({
      timeout: 60_000,
    });
    await expect(page.getByText('Typed onto the page')).toBeVisible();
    await expect(page.getByText('2 changed, still editable')).toBeVisible();

    const download = page.waitForEvent('download');
    await tabTo(page.getByRole('button', { name: 'Save completed PDF' }), 2);
    await keyboard.press('Enter');
    const saved = await downloadBytes(download);

    const { PDFDocument } = await pdfLib();
    const document = await PDFDocument.load(saved);
    const form = document.getForm();
    expect(form.getTextField('applicant.name').getText()).toBe('Jane Austen');
    expect(form.getCheckBox('agree.terms').isChecked()).toBe(true);
    const images = await imageDraws(document, 0);
    expect(images).toHaveLength(1);
    expectStampAt(
      images[0]!.ctm,
      { box: { x: 0, y: 0, width: 400, height: 500 }, rotation: 0 },
      { ...placed, height },
    );

    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('changing one field leaves every untouched field exactly as it was', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const source = await testUntouchedFormPdf();
    await page.goto('/pdf/sign');
    await choosePdf(page, source);

    await page.getByLabel('applicant.name').fill('Only this');
    await page.getByRole('checkbox', { name: 'Make it final' }).uncheck();
    await finish(page);
    await expect(page.getByText('1 changed, still editable')).toBeVisible();

    const saved = await savedPdf(page);
    const { PDFDocument } = await pdfLib();
    const before = await PDFDocument.load(source);
    const after = await PDFDocument.load(saved);
    expect(after.getForm().getTextField('applicant.name').getText()).toBe(
      'Only this',
    );
    for (const name of ['languages', 'size', 'remarks', 'applicant.city']) {
      expect(await fieldSnapshot(after, name), name).toEqual(
        await fieldSnapshot(before, name),
      );
    }
    // Spelled out, so a snapshot of two equally broken files cannot pass.
    const form = after.getForm();
    expect(form.getOptionList('languages').getSelected()).toEqual([
      'English',
      'Kannada',
    ]);
    expect((await fieldSnapshot(after, 'size')).V).toBe('/1');
    expect((await fieldSnapshot(after, 'remarks')).DA).toContain('0 Tf');
    expect(form.getTextField('applicant.city').getText()).toBe('मुंबई');
  });

  test('lands the stamp upright at the chosen corner of a rotated page and of an offset CropBox', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const { PDFDocument } = await pdfLib();
    await page.goto('/pdf/sign');
    await choosePdf(page, await testGeometryPdf(), 'geometry.pdf');
    await typeSignature(page, 'Rotated Signer');

    // Page 1: /Rotate 90, visible box 50,150 450x500, displayed 500 x 450.
    // Bottom-right corner, 10 pt in from the right and 12.5 pt up.
    await page.getByLabel('Signature page').fill('1');
    await expect(page.getByText(/Page 1 is 500 × 450 pt/u)).toBeVisible();
    await page.getByLabel('Signature width').fill('120');
    await page.getByLabel('Signature from left').fill('370');
    await page.getByLabel('Signature from top').fill('400');
    expect(await placement(page)).toEqual({ x: 370, y: 400, width: 120 });
    await finish(page);
    await expect(page.getByText('Typed onto the page')).toBeVisible();

    const turned = await PDFDocument.load(await savedPdf(page));
    const turnedImages = await imageDraws(turned, 0);
    expect(turnedImages).toHaveLength(1);
    const turnedGeometry: Geometry = {
      box: { x: 50, y: 150, width: 450, height: 500 },
      rotation: 90,
    };
    expectStampAt(turnedImages[0]!.ctm, turnedGeometry, {
      x: 370,
      y: 400,
      width: 120,
      height: 120 * STAMP_ASPECT,
    });
    expectStampInside(turnedImages[0]!.ctm, turnedGeometry, {
      width: 500,
      height: 450,
    });
    expect(await imageDraws(turned, 1)).toHaveLength(0);

    // Page 2: upright, visible box 120,200 300x400. Top-left corner.
    await page.getByLabel('Signature page').fill('2');
    await expect(page.getByText(/Page 2 is 300 × 400 pt/u)).toBeVisible();
    await page.getByLabel('Signature width').fill('100');
    await page.getByLabel('Signature from left').fill('10');
    await page.getByLabel('Signature from top').fill('10');
    expect(await placement(page)).toEqual({ x: 10, y: 10, width: 100 });
    await finish(page);

    const offset = await PDFDocument.load(await savedPdf(page));
    const offsetImages = await imageDraws(offset, 1);
    expect(offsetImages).toHaveLength(1);
    const offsetGeometry: Geometry = {
      box: { x: 120, y: 200, width: 300, height: 400 },
      rotation: 0,
    };
    expectStampAt(offsetImages[0]!.ctm, offsetGeometry, {
      x: 10,
      y: 10,
      width: 100,
      height: 100 * STAMP_ASPECT,
    });
    expectStampInside(offsetImages[0]!.ctm, offsetGeometry, {
      width: 300,
      height: 400,
    });
  });

  test('a placement past the page edge is pulled inside before it is drawn', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/pdf/sign');
    await choosePdf(page, await testFormPdf());
    await typeSignature(page, 'Edge Case');

    await page.getByLabel('Signature width').fill('5000');
    await page.getByLabel('Signature from left').fill('9999');
    await page.getByLabel('Signature from top').fill('9999');
    const placed = await placement(page);
    expect(placed.width).toBeLessThanOrEqual(400);
    expect(placed.x + placed.width).toBeLessThanOrEqual(400);
    expect(placed.y + placed.width * STAMP_ASPECT).toBeLessThanOrEqual(500.5);

    await finish(page);
    await expect(page.getByText('Typed onto the page')).toBeVisible();

    const { PDFDocument } = await pdfLib();
    const document = await PDFDocument.load(await savedPdf(page));
    const images = await imageDraws(document, 0);
    expect(images).toHaveLength(1);
    const geometry: Geometry = {
      box: { x: 0, y: 0, width: 400, height: 500 },
      rotation: 0,
    };
    expectStampInside(images[0]!.ctm, geometry, { width: 400, height: 500 });
    expectStampAt(images[0]!.ctm, geometry, {
      ...placed,
      height: placed.width * STAMP_ASPECT,
    });
  });

  test('refuses to touch a PDF that already carries a digital signature', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const downloads: string[] = [];
    page.on('download', (download) =>
      downloads.push(download.suggestedFilename()),
    );
    await page.goto('/pdf/sign');
    await choosePdf(page, await testDigitallySignedPdf(), 'signed.pdf');

    await expect(
      page.getByText('This PDF already carries a digital signature.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('paragraph')
        .filter({ hasText: /would break that signature/u }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Finish PDF' }),
    ).toBeDisabled();
    await expect(page.getByLabel('applicant.name')).toBeDisabled();
    await expect(
      page.getByRole('checkbox', { name: 'Make it final' }),
    ).toBeDisabled();

    // Nothing can be started, so nothing is ever offered for saving.
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1_000);
    await expect(page.getByRole('heading', { name: DONE })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Save completed PDF' }),
    ).toHaveCount(0);
    expect(downloads).toEqual([]);
  });

  test('names the field and the character when text cannot be written, and says so up front', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/pdf/sign');
    await expect(
      page.getByText('Form fields accept only basic Latin text for now.'),
    ).toBeVisible();

    await choosePdf(page, await testFormPdf());
    await page.getByLabel('applicant.name').fill('Fee ₹500');
    await page.getByRole('checkbox', { name: 'Make it final' }).uncheck();
    await page.getByRole('button', { name: 'Finish PDF' }).click();

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('“applicant.name”', { timeout: 60_000 });
    await expect(alert).toContainText('“₹”');
    await expect(alert).toContainText('U+20B9');
    await expect(alert).not.toContainText(/WinAnsi/iu);
    await expect(page.getByLabel('applicant.name')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(
      page.getByRole('button', { name: 'Save completed PDF' }),
    ).toHaveCount(0);
  });

  test('making it final prints the values, drops the form and hidden fields, and waits for required ones', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/pdf/sign');
    await choosePdf(page, await testFinalFormPdf(), 'final.pdf');

    await expect(page.getByLabel('internal.score')).toHaveCount(0);
    await expect(page.getByLabel('noview.note')).toHaveCount(0);
    await expect(page.getByText(/2 hidden fields are/u)).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Make it final' }),
    ).toBeChecked();

    await page.getByLabel('applicant.notes').fill('Seen and agreed');
    await page.getByRole('button', { name: 'Finish PDF' }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText(/required field/u);
    await expect(alert).toContainText('“applicant.name”');
    await expect(page.getByLabel('applicant.name')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(
      page.getByRole('button', { name: 'Save completed PDF' }),
    ).toHaveCount(0);

    await page.getByLabel('applicant.name').fill('Final Answer');
    await finish(page);
    await expect(page.getByText('2 changed, now final')).toBeVisible();

    const { PDFArray, PDFDict, PDFDocument, PDFName } = await pdfLib();
    const document = await PDFDocument.load(await savedPdf(page));
    expect(document.getPageCount()).toBe(1);
    expect(document.getForm().getFields()).toHaveLength(0);
    expect(
      document.context
        .enumerateIndirectObjects()
        .filter(
          ([, object]) =>
            object instanceof PDFDict && object.has(PDFName.of('FT')),
        ),
    ).toHaveLength(0);

    const printed = await printedText(document, 0);
    expect(printed).toContain(hexOf('Final Answer'));
    expect(printed).toContain(hexOf('Seen and agreed'));
    for (const secret of ['RISK-SCORE-87', 'NOVIEW-SECRET']) {
      expect(printed).not.toContain(hexOf(secret));
      expect(printed).not.toContain(secret.toLowerCase());
    }

    // Every /Annots entry resolves, none is a widget, and the note survives.
    const annots = document
      .getPage(0)
      .node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    const subtypes = (annots?.asArray() ?? []).map((raw) => {
      const annot = document.context.lookup(raw);
      expect(annot, `annotation ${raw.toString()}`).toBeInstanceOf(PDFDict);
      return (annot as PdfLibDict).get(PDFName.of('Subtype'))?.toString();
    });
    expect(subtypes).toEqual(['/Text']);
  });

  test('signs a PDF that has no form fields at all', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/pdf/sign');
    await choosePdf(page, await testPdf(2), 'plain.pdf');

    await expect(
      page.getByText('This PDF has no fillable form fields'),
    ).toBeVisible();
    await drawSignature(page);
    await page.getByRole('button', { name: 'Finish PDF' }).click();

    await expect(
      page.getByRole('heading', { name: /^Done — 2 pages ready$/u }),
    ).toBeVisible({ timeout: 60_000 });

    // There was no form, so nothing was made final or left editable.
    await expect(page.getByText('No form in this PDF')).toBeVisible();

    const { PDFDocument } = await pdfLib();
    const document = await PDFDocument.load(await savedPdf(page));
    expect(document.getPageCount()).toBe(2);
    expect(await imageDraws(document, 1)).toHaveLength(1);
  });

  test('keeps a stored choice the list no longer offers, and lets it be cleared', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/pdf/sign');
    await choosePdf(page, await testStoredChoicePdf(), 'stored.pdf');

    const purple = page.getByRole('checkbox', {
      name: 'Purple (not in the list)',
    });
    await expect(purple).toBeChecked();
    await page.getByRole('checkbox', { name: 'Green', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Make it final' }).uncheck();
    await finish(page);
    await expect(page.getByText('1 changed, still editable')).toBeVisible();

    const { PDFDocument } = await pdfLib();
    let saved = await PDFDocument.load(await savedPdf(page));
    expect(
      saved.getForm().getOptionList('colours').getSelected().sort(),
    ).toEqual(['Green', 'Purple', 'Red']);

    await purple.uncheck();
    await finish(page);
    saved = await PDFDocument.load(await savedPdf(page));
    expect(
      saved.getForm().getOptionList('colours').getSelected().sort(),
    ).toEqual(['Green', 'Red']);
  });

  test('says what saving does to a static XFA form, and does exactly that', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/pdf/sign');
    await choosePdf(page, await testStaticXfaPdf(), 'xfa.pdf');
    await expect(
      page.getByText(
        /Every save removes the XFA part, even when you only sign/u,
      ),
    ).toBeVisible();

    // Sign only, not final: XFA gone, the ordinary field kept.
    await typeSignature(page, 'Static Signer');
    await page.getByRole('checkbox', { name: 'Make it final' }).uncheck();
    await finish(page);
    const { PDFDocument, PDFDict, PDFName } = await pdfLib();
    const signed = await PDFDocument.load(await savedPdf(page));
    const acroForm = signed.catalog.lookup(PDFName.of('AcroForm'), PDFDict);
    expect(acroForm.has(PDFName.of('XFA'))).toBe(false);
    expect(signed.getForm().getFields()).toHaveLength(1);
  });

  test('a file that cannot be opened leaves the loaded PDF in place and says so', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto('/pdf/sign');
    await choosePdf(page, await testFormPdf());

    await expect(async () => {
      const chooser = page.waitForEvent('filechooser', { timeout: 2_000 });
      await page.getByRole('button', { name: 'Choose another' }).click();
      await (
        await chooser
      ).setFiles({
        name: 'second.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('not a pdf at all'),
      });
    }).toPass({ timeout: 45_000 });

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Couldn’t open this PDF');
    await expect(alert).toContainText('“second.pdf” could not be opened.');
    await expect(alert).toContainText('“form.pdf” is still loaded.');
    await expect(
      page.getByRole('heading', { name: 'form.pdf', exact: true }),
    ).toBeVisible();
  });

  test('says plainly that this is not a certified signature before a file is chosen', async ({
    page,
  }) => {
    await page.goto('/pdf/sign');
    await expect(
      page.getByText(
        'This draws or types a signature, it does not certify one.',
      ),
    ).toBeVisible();
    await expect(
      page.getByText(/no certificate and no audit trail/u),
    ).toBeVisible();
    await expect(
      page.getByText(/there is no keyboard equivalent yet/u),
    ).toHaveCount(0);
  });

  test('the signature pad stays readable in dark mode and still stamps dark ink', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/pdf/sign');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/u);
    await expect(
      page.getByText(
        'This draws or types a signature, it does not certify one.',
      ),
    ).toBeVisible();

    await choosePdf(page, await testFormPdf());
    await drawSignature(page);

    const contrast = await page
      .locator('canvas[aria-label="Signature pad"]')
      .evaluate((canvas: HTMLCanvasElement) => {
        const rgbOf = (color: string) => {
          const probe = document.createElement('canvas');
          probe.width = 1;
          probe.height = 1;
          const context = probe.getContext('2d')!;
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
        };
        const luminance = (rgb: number[]) => {
          const [r, g, b] = rgb.map((channel) => {
            const c = channel / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        };
        const data = canvas
          .getContext('2d')!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        const sum = [0, 0, 0];
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3]! < 200) continue;
          sum[0] += data[i]!;
          sum[1] += data[i + 1]!;
          sum[2] += data[i + 2]!;
          count += 1;
        }
        const stroke = sum.map((channel) => channel / Math.max(1, count));
        const background = rgbOf(getComputedStyle(canvas).backgroundColor);
        const [light, dark] = [luminance(stroke), luminance(background)].sort(
          (a, b) => b - a,
        );
        return {
          count,
          background,
          ratio: (light! + 0.05) / (dark! + 0.05),
        };
      });
    expect(contrast.count, 'painted stroke pixels').toBeGreaterThan(50);
    // The page background really is dark, and the ink stands out against it.
    expect(Math.max(...contrast.background)).toBeLessThan(60);
    expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);

    await finish(page);
    const { PDFDocument } = await pdfLib();
    const pdf = await PDFDocument.load(await savedPdf(page));
    const images = await imageDraws(pdf, 0);
    expect(images).toHaveLength(1);
    const pixels = images[0]!.pixels()!;
    expect(pixels.alpha, 'the stamp keeps its transparency').not.toBeNull();
    let inked = 0;
    let dark = 0;
    for (let index = 0; index < pixels.alpha!.length; index += 1) {
      if (pixels.alpha![index]! < 200) continue;
      inked += 1;
      const offset = index * 3;
      const brightest = Math.max(
        pixels.rgb[offset]!,
        pixels.rgb[offset + 1]!,
        pixels.rgb[offset + 2]!,
      );
      if (brightest < 80) dark += 1;
    }
    expect(inked).toBeGreaterThan(50);
    expect(dark / inked).toBeGreaterThan(0.95);
  });
});
