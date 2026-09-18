import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PAYMENT_PLACEHOLDERS,
  SUPPORT_CONFIG,
  SUPPORT_TIERS,
  canAcceptSupport,
  getBuyMeACoffeeUrl,
  getUpiPaymentUrl,
  supportChannels,
} from './support-config';

/**
 * On 2026-09-17 the production bundle shipped the hardcoded fallback UPI id
 * `mg.io.test@oksbi` to real visitors, because the fallback existed and the
 * environment variable was never set at build time. These hold the shape that
 * makes that impossible: no placeholder in the source, and no payment link
 * produced for a channel that is not configured.
 */
describe('support config', () => {
  it('contains no payment placeholder anywhere in its source', () => {
    const source = readFileSync(
      path.join(import.meta.dirname, 'support-config.ts'),
      'utf8',
    );
    // The placeholder list itself is the one legitimate mention of each value.
    const body = source.slice(source.indexOf('const env ='));
    for (const placeholder of PAYMENT_PLACEHOLDERS) {
      expect(body).not.toContain(placeholder);
    }
  });

  it('produces no payment link for a channel that is not configured', () => {
    if (!SUPPORT_CONFIG.upiId) {
      expect(getUpiPaymentUrl(29)).toBe('');
    }
    if (!SUPPORT_CONFIG.buyMeACoffeeUrl) {
      expect(getBuyMeACoffeeUrl(1)).toBe('');
      expect(getBuyMeACoffeeUrl()).toBe('');
    }
  });

  it('points Buy Me a Coffee at a real page, not a placeholder', () => {
    const url = SUPPORT_CONFIG.buyMeACoffeeUrl;
    expect(url).toMatch(
      /^https:\/\/(?:www\.)?buymeacoffee\.com\/[A-Za-z0-9_-]+$/u,
    );
    // A whole number of coffees is appended as a query, and nothing else is.
    expect(getBuyMeACoffeeUrl(3)).toBe(`${url}?coffees=3`);
    expect(getBuyMeACoffeeUrl(0)).toBe(url);
    expect(getBuyMeACoffeeUrl(1.5)).toBe(url);
    expect(getBuyMeACoffeeUrl(-2)).toBe(url);
  });

  it('lists only channels that can actually receive money', () => {
    const channels = supportChannels();
    expect(channels.includes('upi')).toBe(Boolean(SUPPORT_CONFIG.upiId));
    expect(channels.includes('buymeacoffee')).toBe(
      Boolean(SUPPORT_CONFIG.buyMeACoffeeUrl),
    );
    expect(channels.includes('githubSponsors')).toBe(
      Boolean(SUPPORT_CONFIG.githubSponsorsUrl),
    );
    expect(canAcceptSupport()).toBe(channels.length > 0);
  });

  it('never promises anything in return for money', () => {
    // Owner decision 13: no paid tier. Business rule 35: no differential
    // treatment by amount. A tier may say where money goes, never what the
    // payer receives.
    const forbidden = [
      /priorit/iu,
      /\badvisory\b/iu,
      /direct contact/iu,
      /\bexclusive\b/iu,
      /\bearly access\b/iu,
      /\bperks?\b/iu,
    ];
    for (const tier of SUPPORT_TIERS) {
      const text = [tier.name, tier.description, ...tier.features].join(' ');
      for (const pattern of forbidden) {
        expect(text).not.toMatch(pattern);
      }
    }
  });

  it('claims no measured privacy result a release has not proved', () => {
    // Business rule 23 and owner decision 5: egress language needs a formal
    // egress proof for the release.
    const forbidden = [
      /zero[- ]?(egress|upload|cloud)/iu,
      /\b0 bytes\b/iu,
      /nothing (?:was|is) uploaded/iu,
      /\bforever guarantee\b/iu,
    ];
    for (const tier of SUPPORT_TIERS) {
      const text = [tier.name, tier.description, ...tier.features].join(' ');
      for (const pattern of forbidden) {
        expect(text).not.toMatch(pattern);
      }
    }
  });

  it('keeps job facts out of every payment link', () => {
    // Business rule 38: no tool id, filename, duration, size or receipt fact
    // reaches a checkout.
    const links = [getUpiPaymentUrl(29), getBuyMeACoffeeUrl(1)].filter(Boolean);
    for (const link of links) {
      expect(link).not.toMatch(/filename|tool=|job|receipt|duration|bytes/iu);
    }
  });
});
