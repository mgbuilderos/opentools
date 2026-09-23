import { describe, expect, it } from 'vitest';

import {
  conversionAliasRedirect,
  conversionUnitAliases,
} from './conversion-aliases';
import { CONVERSION_PAIRS, conversionPairById } from './conversion-pairs';
import { siteRedirect } from './site-redirects';

describe('abbreviated conversion slugs', () => {
  it('answers the spellings people actually typed', () => {
    // The four measured on 2026-09-23: every one of them 404ed while the long
    // British spelling of the same question sat there unread.
    const expected: Readonly<Record<string, string>> = {
      '/convert/kg-to-lbs': '/convert/kilograms-to-pounds',
      '/convert/cm-to-in': '/convert/centimetres-to-inches',
      '/convert/c-to-f': '/convert/celsius-to-fahrenheit',
      '/convert/km-to-mi': '/convert/kilometres-to-miles',
    };
    for (const [typed, canonical] of Object.entries(expected)) {
      expect(conversionAliasRedirect(typed), typed).toBe(canonical);
    }
  });

  it('answers the American spelling of a British label', () => {
    expect(conversionAliasRedirect('/convert/centimeters-to-inches')).toBe(
      '/convert/centimetres-to-inches',
    );
    expect(conversionAliasRedirect('/convert/liters-to-gal-us')).toBe(
      '/convert/litres-to-gal-us',
    );
    expect(conversionAliasRedirect('/convert/meters-to-feet')).toBe(
      '/convert/metres-to-feet',
    );
  });

  it('is a permanent redirect, not a second page', () => {
    // A page would be the same converter answering the same question at a
    // second address, which splits whatever either had earned.
    expect(siteRedirect('/convert/kg-to-lbs')).toEqual({
      location: '/convert/kilograms-to-pounds',
      status: 301,
    });
    expect(conversionPairById('kg-to-lbs')).toBeUndefined();
  });

  it('leaves a real page alone', () => {
    for (const pair of CONVERSION_PAIRS.slice(0, 40)) {
      expect(
        conversionAliasRedirect(`/convert/${pair.id}`),
        pair.id,
      ).toBeNull();
      expect(siteRedirect(`/convert/${pair.id}`), pair.id).toBeNull();
    }
  });

  it('sends nobody to a page that does not exist', () => {
    // Every alias token, crossed with every other, and every answer checked
    // against the pair registry. A redirect into a 404 is worse than the 404
    // the visitor would have got.
    const map = conversionUnitAliases();
    expect(map.size).toBeGreaterThan(80);

    for (const [alias, canonical] of map) {
      expect(alias, `${alias} maps to itself`).not.toBe(canonical);
      expect(
        CONVERSION_PAIRS.some(
          (pair) =>
            pair.id.startsWith(`${canonical}-to-`) ||
            pair.id.endsWith(`-to-${canonical}`),
        ),
        `${alias} -> ${canonical}, which names no unit on any page`,
      ).toBe(true);
    }

    const tokens = [...map.keys()];
    for (const from of tokens) {
      for (const to of tokens) {
        const target = conversionAliasRedirect(`/convert/${from}-to-${to}`);
        if (target === null) continue;
        const slug = target.slice('/convert/'.length);
        expect(
          conversionPairById(slug),
          `${from}-to-${to} redirects to ${target}, which 404s`,
        ).toBeDefined();
      }
    }
  });

  it('refuses anything that is not a conversion slug', () => {
    for (const path of [
      '/convert',
      '/convert/formats',
      '/convert/not-a-pair',
      '/convert/cm-to-in/extra',
      '/pdf/merge',
      '/',
    ]) {
      expect(conversionAliasRedirect(path), path).toBeNull();
    }
  });
});
