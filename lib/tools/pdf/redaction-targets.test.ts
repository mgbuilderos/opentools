import { describe, expect, it } from 'vitest';
import {
  buildPageTextModel,
  computeSubItemRect,
  createManualTarget,
  findDetectionTargets,
  findSearchTargets,
  type PageTextModel,
} from './redaction-targets';
import type { PdfPageGeometry } from './pdf-geometry';

describe('redaction-targets', () => {
  const dummyGeometry: PdfPageGeometry = {
    viewBox: [0, 0, 612, 792],
    rotate: 0,
    segments: [],
    items: [
      { text: 'Confidential Settlement Agreement', x: 50, y: 700, width: 250, fontSize: 16 },
      { text: 'Client: Johnathan Doe', x: 50, y: 650, width: 150, fontSize: 12 },
      { text: 'Contact email: john.doe@secretcorp.com for wire.', x: 50, y: 620, width: 320, fontSize: 12 },
      { text: 'Card: 4111 1111 1111 1111 on file.', x: 50, y: 590, width: 220, fontSize: 12 },
      { text: 'Server IP: 192.168.1.100 internal.', x: 50, y: 560, width: 200, fontSize: 12 },
    ],
  };

  it('buildPageTextModel creates sorted text and character mapping', () => {
    const model = buildPageTextModel(dummyGeometry, 1);
    expect(model.pageNumber).toBe(1);
    expect(model.text).toContain('Confidential Settlement Agreement');
    expect(model.text).toContain('Client: Johnathan Doe');
    expect(model.text).toContain('john.doe@secretcorp.com');
    expect(model.charMap.length).toBe(model.text.length);
  });

  it('computeSubItemRect calculates coordinates with ascender/descender padding', () => {
    const item = { text: 'Hello World', x: 100, y: 500, width: 110, fontSize: 10 };
    const rect = computeSubItemRect(item, 0, 5); // 'Hello'
    expect(rect.x).toBeCloseTo(99, 1);
    expect(rect.width).toBeCloseTo(52, 1);
    expect(rect.y).toBeCloseTo(500 - 2.5, 1);
    expect(rect.height).toBeCloseTo(12.5, 1);
  });

  it('findSearchTargets finds case-insensitive text matches across items', () => {
    const model = buildPageTextModel(dummyGeometry, 1);
    const targets = findSearchTargets([model], 'johnathan doe');
    expect(targets.length).toBe(1);
    expect(targets[0]?.label).toBe('Search: "Johnathan Doe"');
    expect(targets[0]?.source).toBe('search');
    expect(targets[0]?.rect.width).toBeGreaterThan(10);
    expect(targets[0]?.rect.y).toBeCloseTo(650 - 3, 1);
  });

  it('findSearchTargets supports wholeWord matching', () => {
    const model = buildPageTextModel(dummyGeometry, 1);
    const partialMatch = findSearchTargets([model], 'Johna', { wholeWord: true });
    expect(partialMatch.length).toBe(0); // 'Johnathan' should not match whole-word 'Johna'

    const fullMatch = findSearchTargets([model], 'Johnathan', { wholeWord: true });
    expect(fullMatch.length).toBe(1);
  });

  it('findDetectionTargets automatically identifies email, credit card, and IP', () => {
    const model = buildPageTextModel(dummyGeometry, 1);
    const targets = findDetectionTargets([model]);

    const categories = targets.map((t) => t.category);
    expect(categories).toContain('email');
    expect(categories).toContain('card');
    expect(categories).toContain('ip');

    const emailTarget = targets.find((t) => t.category === 'email');
    expect(emailTarget).toBeDefined();
    expect(emailTarget?.label).toContain('Email: jo***@secretcorp.com');

    const cardTarget = targets.find((t) => t.category === 'card');
    expect(cardTarget).toBeDefined();
    expect(cardTarget?.label).toContain('Card Number: **** **** **** 1111');
  });

  it('createManualTarget sanitizes and bounds dimensions', () => {
    const manual = createManualTarget(2, { x: 50.123, y: 100.456, width: 80.789, height: 20.321 });
    expect(manual.pageNumber).toBe(2);
    expect(manual.rect.x).toBe(50.12);
    expect(manual.rect.y).toBe(100.46);
    expect(manual.rect.width).toBe(80.79);
    expect(manual.rect.height).toBe(20.32);
    expect(manual.source).toBe('manual');
  });
});
