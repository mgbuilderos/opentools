/**
 * Where support can actually be sent, and nothing that only looks like it can.
 *
 * **Every channel is env-driven and fails closed.** A channel whose environment
 * variable is unset resolves to an empty string and `supportChannels()` leaves
 * it out, so the UI renders nothing rather than something broken. This is not
 * style: the production bundle shipped on 2026-09-17 carried the hardcoded
 * fallback `mg.io.test@oksbi` to real visitors, because the fallback existed
 * and `NEXT_PUBLIC_UPI_ID` was never set at build time. A placeholder that can
 * ship, eventually ships. `support-config.test.ts` now fails the build if one
 * reappears.
 *
 * **Buy Me a Coffee is a plain outbound link, deliberately.** Their widget
 * script, button image and iframe are all blocked by this site's own
 * Content-Security-Policy (`script-src 'self'`, `img-src 'self' blob: data:`,
 * `default-src 'self'`), and embedding them would put a third-party script on
 * the page that asks for money — against the one promise the product makes.
 * Draw the button locally and link out.
 */

/** Values that must never reach a build. Asserted in the test. */
export const PAYMENT_PLACEHOLDERS = [
  'mg.io.test@oksbi',
  'example@upi',
  'your-upi-id',
  'username',
] as const;

const env = (name: string) => process.env[name]?.trim() || '';

export const SUPPORT_CONFIG = {
  githubRepoUrl: ['https:', '//', 'github.com/mgbuilderos/opentools'].join(''),
  /** Empty until a Sponsors profile actually exists; see decision notes. */
  githubSponsorsUrl: env('NEXT_PUBLIC_GITHUB_SPONSORS_URL'),
  /**
   * The live Buy Me a Coffee page. Committed rather than left to the
   * environment: it is a public URL, not a secret, and the failure this file
   * exists to prevent was a payment value that had to be remembered at build
   * time and was not. The env var stays as an override for staging.
   */
  buyMeACoffeeUrl:
    env('NEXT_PUBLIC_BUYMEACOFFEE_URL') ||
    'https://buymeacoffee.com/codebuilder',
  upiId: env('NEXT_PUBLIC_UPI_ID'),
  upiPayeeName: env('NEXT_PUBLIC_UPI_NAME') || 'OpenTools',
};

export type SupportChannel = 'upi' | 'buymeacoffee' | 'githubSponsors';

/**
 * The channels that are configured and can actually receive money, in the
 * order they should be offered. An empty array is the honest answer when
 * nothing is set up, and the UI must then show no payment controls at all.
 */
export function supportChannels(): SupportChannel[] {
  const channels: SupportChannel[] = [];
  if (SUPPORT_CONFIG.upiId) channels.push('upi');
  if (SUPPORT_CONFIG.buyMeACoffeeUrl) channels.push('buymeacoffee');
  if (SUPPORT_CONFIG.githubSponsorsUrl) channels.push('githubSponsors');
  return channels;
}

/** True when there is at least one working way to send support. */
export function canAcceptSupport() {
  return supportChannels().length > 0;
}

export interface SupportTier {
  name: string;
  amountUsd: string;
  amountInr: string;
  inrValue: number;
  usdValue: number;
  popular?: boolean;
  description: string;
  features: string[];
}

/**
 * Amounts someone can choose, and what the money actually goes toward.
 *
 * Every line here has to survive the same rules the rest of the product does.
 * Nothing is promised in return for paying (owner decision 13: no paid tier;
 * business rule 35: no differential treatment by amount), no tier claims a
 * number that is not measured (board §1.7), and nothing names work that was
 * removed. Privacy wording follows owner decision 6 exactly — "no third-party
 * trackers" and "no client-side analytics", never "no trackers" — and no line
 * claims zero egress, which needs a release egress proof (rule 23, decision 5).
 *
 * `popular` is deliberately unset on every tier. A "Popular" badge is a claim
 * about what other people chose, and with no client-side analytics there is
 * nothing that could measure it.
 */
export const SUPPORT_TIERS: SupportTier[] = [
  {
    name: '☕ Quick Coffee',
    amountUsd: '$3',
    amountInr: '₹150',
    usdValue: 3,
    inrValue: 150,
    description: 'Goes toward the domain and the hosting that serves the site.',
    features: [
      'No ads, no third-party trackers, no client-side analytics',
      'Every tool stays free, with no signup and no watermark',
      'Nothing in return — support is voluntary',
    ],
  },
  {
    name: '⚡ Tool Backer',
    amountUsd: '$10',
    amountInr: '₹500',
    usdValue: 10,
    inrValue: 500,
    description: 'Goes toward keeping the tools that are already here working.',
    features: [
      'Fixes and maintenance on the tools on this site today',
      'Output checks that catch a bad file before you download it',
      'Nothing in return — support is voluntary',
    ],
  },
  {
    name: '💖 Patron',
    amountUsd: '$25',
    amountInr: '₹1,500',
    usdValue: 25,
    inrValue: 1500,
    description:
      'Goes toward longer work: building tools, and the tests behind them.',
    features: [
      'Time to build and test new tools',
      'The code stays MIT-licensed and open to read',
      'Nothing in return — support is voluntary',
    ],
  },
];

/**
 * A Buy Me a Coffee link for a whole number of "coffees", or the bare page.
 * Carries no job facts — business rule 38 keeps receipts, filenames, tool ids
 * and durations out of anything a payment provider sees.
 */
export function getBuyMeACoffeeUrl(coffees?: number): string {
  const base = SUPPORT_CONFIG.buyMeACoffeeUrl;
  if (!base) return '';
  if (!coffees || !Number.isInteger(coffees) || coffees < 1) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}coffees=${coffees}`;
}

export function getUpiPaymentUrl(amountInr?: number, note?: string): string {
  if (!SUPPORT_CONFIG.upiId) return '';
  const params = new URLSearchParams({
    pa: SUPPORT_CONFIG.upiId,
    pn: SUPPORT_CONFIG.upiPayeeName,
    cu: 'INR',
  });
  if (amountInr && amountInr > 0) {
    params.set('am', amountInr.toString());
  }
  if (note) {
    params.set('tn', note);
  } else {
    params.set('tn', 'OpenTools Fuel ☕ - Keep It 100% Private & Ad-Free');
  }
  return `upi://pay?${params.toString()}`;
}

/**
 * Privacy-preserving, zero-egress detection of whether the visitor is from India.
 * Evaluated locally in the client browser using locale, timezone offset, and formatting options.
 */
export function isLikelyIndiaVisitor(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Timezone check
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (
      timeZone.toLowerCase().includes('kolkata') ||
      timeZone.toLowerCase().includes('calcutta') ||
      timeZone.toLowerCase().includes('india')
    ) {
      return true;
    }

    // 2. Exact UTC+5:30 offset check (330 minutes)
    const offsetMinutes = -new Date().getTimezoneOffset();
    if (offsetMinutes === 330) {
      return true;
    }

    // 3. Browser locale languages check
    const languages = navigator.languages || [navigator.language || ''];
    for (const lang of languages) {
      if (/-IN\b/i.test(lang) || /^(hi|ta|te|mr|gu|kn|ml|pa|bn)-/i.test(lang)) {
        return true;
      }
    }

    // 4. URL query override (e.g. ?region=in for manual testing)
    const urlParams = new URLSearchParams(window.location.search);
    const regionParam = urlParams.get('region') || urlParams.get('country');
    if (regionParam && regionParam.toUpperCase() === 'IN') {
      return true;
    }
  } catch {
    // fallback
  }
  return false;
}
