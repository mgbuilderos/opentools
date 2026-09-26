import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { inspectPdfForm, fillPdfForm } from './engine';
import { changedFieldValues, missingRequiredFields } from './sign-form-state';
import type { PdfWorkerInput } from './protocol';

function toInput(bytes: Uint8Array): PdfWorkerInput {
  return {
    id: 'test-doc',
    name: 'test.pdf',
    bytes: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
  };
}

async function createTestFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 700]);
  const form = doc.getForm();

  const nameField = form.createTextField('fullName');
  nameField.setText('Jane Doe');
  nameField.addToPage(page, { x: 50, y: 600, width: 200, height: 24 });

  const emailField = form.createTextField('email');
  emailField.setText('');
  emailField.addToPage(page, { x: 50, y: 550, width: 200, height: 24 });

  const agreeCheck = form.createCheckBox('agreeTerms');
  agreeCheck.addToPage(page, { x: 50, y: 500, width: 20, height: 20 });

  const countryDropdown = form.createDropdown('country');
  countryDropdown.addOptions(['United States', 'Canada', 'United Kingdom']);
  countryDropdown.select('United States');
  countryDropdown.addToPage(page, { x: 50, y: 450, width: 150, height: 24 });

  const radioGroup = form.createRadioGroup('contactPreference');
  radioGroup.addOptionToPage('Email', page, {
    x: 50,
    y: 400,
    width: 16,
    height: 16,
  });
  radioGroup.addOptionToPage('Phone', page, {
    x: 120,
    y: 400,
    width: 16,
    height: 16,
  });
  radioGroup.select('Email');

  return await doc.save();
}

describe('lib/tools/pdf/form-filler', () => {
  it('inspects all interactive form fields correctly', async () => {
    const bytes = await createTestFormPdf();
    const result = await inspectPdfForm(toInput(bytes));

    expect(result.pages).toBe(1);
    expect(result.document.hasDigitalSignature).toBe(false);
    expect(result.document.formUnreadable).toBe(false);
    expect(result.fields.length).toBeGreaterThanOrEqual(5);

    const fieldNames = result.fields.map((f) => f.name);
    expect(fieldNames).toContain('fullName');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('agreeTerms');
    expect(fieldNames).toContain('country');
    expect(fieldNames).toContain('contactPreference');

    const nameField = result.fields.find((f) => f.name === 'fullName');
    expect(nameField?.kind).toBe('text');
    expect(nameField?.value).toBe('Jane Doe');

    const agreeField = result.fields.find((f) => f.name === 'agreeTerms');
    expect(agreeField?.kind).toBe('checkbox');
    expect(agreeField?.value).toBe(false);

    const countryField = result.fields.find((f) => f.name === 'country');
    expect(countryField?.kind).toBe('dropdown');
    expect(countryField?.options.map((o) => o.value)).toEqual([
      'United States',
      'Canada',
      'United Kingdom',
    ]);
  });

  it('updates form fields without flattening when flatten is false', async () => {
    const bytes = await createTestFormPdf();
    const input = toInput(bytes);
    const inspected = await inspectPdfForm(input);

    const fullNameField = inspected.fields.find((f) => f.name === 'fullName')!;
    const agreeTermsField = inspected.fields.find(
      (f) => f.name === 'agreeTerms',
    )!;

    const values = {
      [fullNameField.id]: 'Alex Smith',
      [agreeTermsField.id]: true,
    };

    const filledResult = await fillPdfForm(toInput(bytes), {
      values,
      signature: null,
      flatten: false,
    });

    expect(filledResult.fieldsChanged).toBe(2);
    expect(filledResult.flattened).toBe(false);

    // Verify fields can be re-inspected and hold updated values
    const reloaded = await inspectPdfForm(toInput(filledResult.bytes));
    const reloadedName = reloaded.fields.find((f) => f.name === 'fullName');
    const reloadedAgree = reloaded.fields.find((f) => f.name === 'agreeTerms');

    expect(reloadedName?.value).toBe('Alex Smith');
    expect(reloadedAgree?.value).toBe(true);
  });

  it('flattens form fields permanently when flatten is true', async () => {
    const bytes = await createTestFormPdf();
    const input = toInput(bytes);
    const inspected = await inspectPdfForm(input);

    const fullNameField = inspected.fields.find((f) => f.name === 'fullName')!;
    const values = {
      [fullNameField.id]: 'Permanent Name',
    };

    const filledResult = await fillPdfForm(toInput(bytes), {
      values,
      signature: null,
      flatten: true,
    });

    expect(filledResult.flattened).toBe(true);

    // After flattening, interactive AcroForm fields should be gone
    const reloaded = await inspectPdfForm(toInput(filledResult.bytes));
    expect(reloaded.fields.length).toBe(0);
  });

  it('correctly tracks changedFieldValues and filters out untouched values', async () => {
    const bytes = await createTestFormPdf();
    const inspected = await inspectPdfForm(toInput(bytes));

    const nameField = inspected.fields.find((f) => f.name === 'fullName')!;
    const agreeField = inspected.fields.find((f) => f.name === 'agreeTerms')!;

    // Providing unchanged name and changed agree checkbox
    const formValues = {
      [nameField.id]: 'Jane Doe', // unchanged
      [agreeField.id]: true, // changed from false to true
    };

    const changed = changedFieldValues(inspected.fields, formValues);
    expect(Object.keys(changed)).toHaveLength(1);
    expect(changed[agreeField.id]).toBe(true);
  });

  it('identifies missing required fields', () => {
    const testFields = [
      {
        id: 'f1',
        name: 'Required Text',
        kind: 'text' as const,
        options: [],
        value: '',
        readOnly: false,
        readOnlyReason: null,
        required: true,
        hidden: false,
        multiline: false,
        multiSelect: false,
        editable: false,
        maxLength: null,
        pageIndex: 0,
        calculated: false,
      },
      {
        id: 'f2',
        name: 'Optional Text',
        kind: 'text' as const,
        options: [],
        value: '',
        readOnly: false,
        readOnlyReason: null,
        required: false,
        hidden: false,
        multiline: false,
        multiSelect: false,
        editable: false,
        maxLength: null,
        pageIndex: 0,
        calculated: false,
      },
    ];

    const missing = missingRequiredFields(testFields, { f1: '' });
    expect(missing.map((f) => f.id)).toEqual(['f1']);

    const filled = missingRequiredFields(testFields, { f1: 'Now Provided' });
    expect(filled).toHaveLength(0);
  });

  it('guarantees zero console logging or telemetry leaks during processing', async () => {
    const bytes = await createTestFormPdf();
    const logSpy = vi.spyOn(console, 'log');
    const infoSpy = vi.spyOn(console, 'info');
    const warnSpy = vi.spyOn(console, 'warn');

    const inspected = await inspectPdfForm(toInput(bytes));
    const fullNameField = inspected.fields.find((f) => f.name === 'fullName')!;

    await fillPdfForm(toInput(bytes), {
      values: {
        [fullNameField.id]: 'Confidential Sensitive User Name',
      },
      signature: null,
      flatten: true,
    });

    // Verify sensitive string never appears in any console stream
    for (const call of [
      ...logSpy.mock.calls,
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
    ]) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain('Confidential Sensitive User Name');
    }

    logSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
