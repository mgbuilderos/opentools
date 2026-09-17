import { describe, expect, it } from 'vitest';

import type { PdfFormField } from './protocol';
import {
  changedFieldValues,
  clampSignaturePlacement,
  displayFieldValue,
  missingRequiredFields,
  placeSignatureAt,
  sameFieldValue,
} from './sign-form-state';

function field(overrides: Partial<PdfFormField>): PdfFormField {
  return {
    id: 'f',
    name: 'f',
    kind: 'text',
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
    ...overrides,
  };
}

const ASPECT = 200 / 640;

describe('sign form state', () => {
  it('sends only fields whose value changed', () => {
    const fields = [
      field({ id: '1', value: 'Asha' }),
      field({
        id: '2',
        kind: 'optionList',
        multiSelect: true,
        value: ['English', 'Hindi'],
      }),
      field({ id: '3', kind: 'checkbox', value: false }),
      field({ id: '4', value: 'locked', readOnly: true }),
      field({ id: '5', value: 'secret', hidden: true }),
      field({ id: '6', kind: 'checkboxGroup', value: '' }),
    ];
    const values = {
      '1': 'Asha',
      '2': ['Hindi', 'English'],
      '3': true,
      '4': 'changed',
      '5': 'changed',
      '6': '1',
    };
    expect(changedFieldValues(fields, values)).toEqual({ '3': true, '6': '1' });
    expect(changedFieldValues(fields, {})).toEqual({});
  });

  it('compares multi-select values without regard to order', () => {
    expect(sameFieldValue(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameFieldValue(['a'], ['a', 'b'])).toBe(false);
    expect(sameFieldValue('', false)).toBe(false);
  });

  it('lists empty required fields that the user can fill', () => {
    const fields = [
      field({ id: 'a', name: 'a', required: true }),
      field({ id: 'b', name: 'b', required: true, value: 'x' }),
      field({ id: 'c', name: 'c', required: true, readOnly: true }),
      field({ id: 'd', name: 'd', required: true, hidden: true }),
      field({
        id: 'e',
        name: 'e',
        required: true,
        kind: 'checkbox',
        value: false,
      }),
      field({
        id: 'f',
        name: 'f',
        required: true,
        kind: 'optionList',
        value: ['x'],
      }),
    ];
    expect(
      missingRequiredFields(fields, { b: '', e: true, f: [] }).map(
        (item) => item.id,
      ),
    ).toEqual(['a', 'b', 'f']);
  });

  it('shows the display text of choices', () => {
    const country = field({
      kind: 'dropdown',
      options: [{ value: 'SG', display: 'Singapore' }],
      value: 'SG',
    });
    expect(displayFieldValue(country)).toBe('Singapore');
    expect(displayFieldValue(country, 'XX')).toBe('XX');
    expect(displayFieldValue(country, '')).toBe('Empty');
    expect(displayFieldValue(field({ kind: 'checkbox', value: true }))).toBe(
      'Ticked',
    );
  });
});

describe('signature placement clamping', () => {
  const page = { width: 400, height: 500 };

  function fits(
    size: { width: number; height: number },
    placement: {
      x: number;
      y: number;
      width: number;
    },
  ) {
    return (
      placement.x >= 0 &&
      placement.y >= 0 &&
      placement.width > 0 &&
      placement.x + placement.width <= size.width &&
      placement.y + placement.width * ASPECT <= size.height
    );
  }

  it('keeps an in-page placement as it is', () => {
    expect(
      clampSignaturePlacement(page, { x: 72, y: 72, width: 180 }, ASPECT),
    ).toEqual({ x: 72, y: 72, width: 180 });
  });

  it('pulls out-of-page and non-finite values inside the page', () => {
    for (const placement of [
      { x: 5000, y: 72, width: 180 },
      { x: 72, y: 9000, width: 180 },
      { x: -1636, y: -1091, width: 180 },
      { x: 390, y: 490, width: 5000 },
      { x: Number.NaN, y: Number.POSITIVE_INFINITY, width: Number.NaN },
      { x: 0, y: 0, width: 1 },
    ]) {
      const clamped = clampSignaturePlacement(page, placement, ASPECT);
      expect(fits(page, clamped), JSON.stringify(placement)).toBe(true);
      expect(clamped.width).toBeGreaterThanOrEqual(20);
    }
    expect(
      clampSignaturePlacement(page, { x: 5000, y: 9000, width: 180 }, ASPECT),
    ).toEqual({ x: 220, y: 443, width: 180 });
  });

  it('fits pages smaller than the signature and fractional page sizes', () => {
    for (const size of [
      { width: 10, height: 10 },
      { width: 595.28, height: 841.89 },
      { width: 841.89, height: 12 },
    ]) {
      const clamped = clampSignaturePlacement(
        size,
        { x: 900, y: 900, width: 900 },
        ASPECT,
      );
      expect(fits(size, clamped), JSON.stringify(size)).toBe(true);
    }
  });

  it('centres on a clicked point, or on the page for keyboard activation', () => {
    expect(
      placeSignatureAt(page, { x: 0, y: 0, width: 160 }, null, ASPECT),
    ).toEqual({ x: 120, y: 225, width: 160 });
    expect(
      placeSignatureAt(
        page,
        { x: 0, y: 0, width: 160 },
        { x: 0.5, y: 0.1 },
        ASPECT,
      ),
    ).toEqual({ x: 120, y: 25, width: 160 });
    const edge = placeSignatureAt(
      page,
      { x: 0, y: 0, width: 180 },
      { x: 0.99, y: 1.4 },
      ASPECT,
    );
    expect(fits(page, edge)).toBe(true);
    expect(edge).toEqual({ x: 220, y: 443, width: 180 });
  });
});
