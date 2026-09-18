import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BUYMEACOFFEE_UNIT_USD,
  PAYMENT_PLACEHOLDERS,
  GITHUB_SPONSORS_PENDING,
  SUPPORT_CONFIG,
  SUPPORT_TIERS,
  canAcceptSupport,
  coffeesFor,
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

  it('reads every environment variable as a literal, not a computed key', () => {
    // process.env[name] is not substituted at build time: it ships as a runtime
    // lookup against an object that is empty in the browser, so setting the
    // variable would silently do nothing. Only process.env.NAME is replaced.
    const source = readFileSync(
      path.join(import.meta.dirname, 'support-config.ts'),
      'utf8',
    );
    // Prose may describe the wrong form; only code is being judged here.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/\/\/[^\n]*/gu, '');
    expect(code).not.toMatch(/process\.env\s*\[/u);
    for (const name of ['NEXT_PUBLIC_UPI_ID', 'NEXT_PUBLIC_BUYMEACOFFEE_URL']) {
      expect(code).toContain(`process.env.${name}`);
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

  it('offers only amounts that are whole coffees', () => {
    // Someone who clicks $10 must land on a page asking for $10. If the coffee
    // price on the Buy Me a Coffee page changes, BUYMEACOFFEE_UNIT_USD has to
    // change with it and this is what catches the drift.
    for (const tier of SUPPORT_TIERS) {
      const coffees = coffeesFor(tier.usdValue);
      expect(coffees).not.toBeNull();
      expect(coffees! * BUYMEACOFFEE_UNIT_USD).toBe(tier.usdValue);
      expect(tier.amountUsd).toBe(`$${tier.usdValue}`);
    }
  });

  it('rejects an amount that is not a whole number of coffees', () => {
    expect(coffeesFor(3)).toBeNull();
    expect(coffeesFor(7)).toBeNull();
    expect(coffeesFor(0)).toBeNull();
    expect(coffeesFor(Number.NaN)).toBeNull();
    expect(coffeesFor(5)).toBe(1);
    expect(coffeesFor(25)).toBe(5);
  });

  it('lists only channels that can actually receive money', () => {
    const channels = supportChannels();
    expect(channels.includes('upi')).toBe(Boolean(SUPPORT_CONFIG.upiId));
    expect(channels.includes('buymeacoffee')).toBe(
      Boolean(SUPPORT_CONFIG.buyMeACoffeeUrl),
    );
    // GitHub Sponsors was never approved, so it is not a channel at all.
    expect(channels).not.toContain('githubSponsors');
    expect(canAcceptSupport()).toBe(channels.length > 0);
  });

  it('announces GitHub Sponsors without making it payable', () => {
    // The owner asked for GitHub to stay visible as "coming soon". Visible and
    // payable are different things: the profile is still under review, and
    // github.com/sponsors/… currently redirects to a plain profile page, so a
    // link to it would be a dead end on a page that asks for money.
    const channels = supportChannels();
    expect(channels).not.toContain('github');
    expect(channels).not.toContain('githubSponsors');
    expect(canAcceptSupport()).toBe(channels.length > 0);

    // It has to say it is waiting, in the copy that actually renders.
    expect(GITHUB_SPONSORS_PENDING.status).toMatch(/waiting|review|soon/iu);
    expect(GITHUB_SPONSORS_PENDING.description).toMatch(/not open|review/iu);

    // Nothing on it may be a link, or be named like one. This is the assertion
    // that matters: the moment a URL lands here, a button will point at it.
    for (const [key, value] of Object.entries(GITHUB_SPONSORS_PENDING)) {
      expect(key).not.toMatch(/url|href|link/iu);
      expect(String(value)).not.toMatch(/https?:\/\/|\bwww\.|github\.com/iu);
    }
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
