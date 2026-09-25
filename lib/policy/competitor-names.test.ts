import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_COMPETITORS,
  findForbiddenCompetitors,
  findUnsourcedPriceClaims,
} from './competitor-names';

describe('forbidden competitor names', () => {
  it('finds a named company and says which one', () => {
    const found = findForbiddenCompetitors(
      'Smallpdf caps the free tier.',
      'a.tsx',
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('Smallpdf');
  });

  it('matches regardless of case', () => {
    expect(findForbiddenCompetitors('SMALLPDF', 'a.tsx')).toHaveLength(1);
    expect(findForbiddenCompetitors('smallpdf', 'a.tsx')).toHaveLength(1);
  });

  /*
   * The list is scanned against every .tsx under app/ and components/, so a
   * pattern that also matches ordinary English would make the guard
   * unusable and get it deleted rather than fixed. These are the words that
   * were nearly caught by an earlier draft of the list.
   */
  it('does not match ordinary words that contain a forbidden name', () => {
    const innocent = [
      'Description of the tool',
      'descriptive metadata',
      'Every revision is kept',
      'reverse the order',
      'Remove background noise',
      'removes the EXIF block',
      'Otterly unrelated word',
    ];
    for (const text of innocent) {
      expect(findForbiddenCompetitors(text, 'a.tsx'), text).toEqual([]);
    }
  });

  it('never quotes the surrounding copy back into CI output', () => {
    const message = findForbiddenCompetitors(
      'Smallpdf and a secret internal note',
      'a.tsx',
    )[0];
    expect(message).not.toContain('secret internal note');
  });

  it('has a stated reason for every entry', () => {
    for (const entry of FORBIDDEN_COMPETITORS) {
      expect(entry.reason.length, entry.pattern.source).toBeGreaterThan(3);
    }
  });

  it('holds no duplicate pattern', () => {
    const sources = FORBIDDEN_COMPETITORS.map((entry) => entry.pattern.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe('unsourced price claims', () => {
  it('catches a price attributed to somebody else', () => {
    // The exact shape four live pages carried until 2026-09-25.
    const found = findUnsourcedPriceClaims(
      'Auphonic charges $11–89/mo and NUGEN VisLM charges $382; this measures locally.',
      'a.tsx',
    );
    expect(found).toHaveLength(2);
  });

  it('catches the softened wordings too', () => {
    for (const text of [
      'Bluebeam costs $330/year',
      'it is priced at £40',
      'the licence costs about €249',
      'that tool charges from ₹500',
    ]) {
      expect(findUnsourcedPriceClaims(text, 'a.tsx'), text).toHaveLength(1);
    }
  });

  /*
   * Our own support prices are ours to state: `/support` and the support view
   * both render them with no attribution verb. If this guard ever caught them
   * it would be switched off, and the rule it protects would go with it.
   */
  it('leaves our own prices alone', () => {
    for (const text of ['$5 / month', '$12/year', 'Support from $5 a month']) {
      expect(findUnsourcedPriceClaims(text, 'a.tsx'), text).toEqual([]);
    }
  });

  it('reports every occurrence in a file, not just the first', () => {
    const found = findUnsourcedPriceClaims(
      'A charges $1. B charges $2. C charges $3.',
      'a.tsx',
    );
    expect(found).toHaveLength(3);
  });
});
