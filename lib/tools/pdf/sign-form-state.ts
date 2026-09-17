import type { PdfFormField, PdfFormFieldValue } from './protocol';

/**
 * Pure state helpers for the sign-and-fill page: which fields the user really
 * changed, which required fields are still empty, and where a signature may
 * sit so it stays fully on the page.
 */

export function isEmptyFieldValue(value: PdfFormFieldValue) {
  if (typeof value === 'boolean') return !value;
  if (Array.isArray(value)) return value.length === 0;
  return value === '';
}

/** Equal values, ignoring the order of a multi-select list. */
export function sameFieldValue(a: PdfFormFieldValue, b: PdfFormFieldValue) {
  if (Array.isArray(a) && Array.isArray(b)) {
    const left = [...new Set(a)].sort();
    const right = [...new Set(b)].sort();
    return (
      left.length === right.length &&
      left.every((value, index) => value === right[index])
    );
  }
  return a === b;
}

/** Fields the page offers for editing: visible and not read-only. */
export function isEditableField(field: PdfFormField) {
  return !field.hidden && !field.readOnly;
}

/**
 * The values to send: only editable fields whose value differs from what the
 * file already holds. Everything else is left out so it is never rewritten.
 */
export function changedFieldValues(
  fields: PdfFormField[],
  values: Record<string, PdfFormFieldValue>,
) {
  const changed: Record<string, PdfFormFieldValue> = {};
  for (const field of fields) {
    if (!isEditableField(field)) continue;
    if (!Object.hasOwn(values, field.id)) continue;
    const value = values[field.id];
    if (!sameFieldValue(value, field.value)) changed[field.id] = value;
  }
  return changed;
}

/** Editable required fields that are still empty with the current values. */
export function missingRequiredFields(
  fields: PdfFormField[],
  values: Record<string, PdfFormFieldValue>,
) {
  return fields.filter(
    (field) =>
      field.required &&
      isEditableField(field) &&
      isEmptyFieldValue(
        Object.hasOwn(values, field.id) ? values[field.id] : field.value,
      ),
  );
}

/** What a value looks like to a person, using display text for choices. */
export function displayFieldValue(
  field: PdfFormField,
  value: PdfFormFieldValue = field.value,
) {
  if (typeof value === 'boolean') return value ? 'Ticked' : 'Not ticked';
  const shown = (Array.isArray(value) ? value : [value])
    .filter((item) => item !== '')
    .map(
      (item) =>
        field.options.find((option) => option.value === item)?.display ?? item,
    );
  return shown.length ? shown.join(', ') : 'Empty';
}

export type PageSize = { width: number; height: number };

/** Top-left corner and width in displayed-page points. */
export type SignaturePlacement = { x: number; y: number; width: number };

/** Narrowest signature the page offers, in points. */
export const MIN_SIGNATURE_WIDTH = 20;

function clampNumber(value: number, min: number, max: number) {
  const finite = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, finite));
}

/**
 * Pulls a placement fully inside the displayed page. `aspect` is the image's
 * height divided by its width, so the height follows from the width exactly
 * as the engine computes it. Results are whole points and never exceed the
 * page.
 */
export function clampSignaturePlacement(
  page: PageSize,
  placement: SignaturePlacement,
  aspect: number,
): SignaturePlacement {
  const maxWidth = Math.max(
    1,
    Math.floor(Math.min(page.width, page.height / aspect)),
  );
  const minWidth = Math.min(MIN_SIGNATURE_WIDTH, maxWidth);
  const width = clampNumber(Math.round(placement.width), minWidth, maxWidth);
  const height = width * aspect;
  const x = clampNumber(
    Math.round(placement.x),
    0,
    Math.max(0, Math.floor(page.width - width)),
  );
  const y = clampNumber(
    Math.round(placement.y),
    0,
    Math.max(0, Math.floor(page.height - height)),
  );
  return { x, y, width };
}

/**
 * Centres the signature on a point of the page outline, given as fractions of
 * its width and height, or on the page itself when there is no point (a
 * keyboard activation carries no position).
 */
export function placeSignatureAt(
  page: PageSize,
  placement: SignaturePlacement,
  point: { x: number; y: number } | null,
  aspect: number,
): SignaturePlacement {
  const sized = clampSignaturePlacement(page, placement, aspect);
  const centreX = point
    ? clampNumber(point.x, 0, 1) * page.width
    : page.width / 2;
  const centreY = point
    ? clampNumber(point.y, 0, 1) * page.height
    : page.height / 2;
  return clampSignaturePlacement(
    page,
    {
      x: centreX - sized.width / 2,
      y: centreY - (sized.width * aspect) / 2,
      width: sized.width,
    },
    aspect,
  );
}
