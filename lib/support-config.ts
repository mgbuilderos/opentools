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
  'example@upi',
  'your-upi-id',
  'username',
] as const;

/**
 * Each variable is read as a **literal** `process.env.NAME`, never
 * `process.env[name]`. Bundlers substitute build-time values only for the
 * literal form; a computed key survives into the client as a runtime lookup
 * against an object that is empty in the browser, so the variable would
 * silently never apply. `support-config.test.ts` fails if the computed form
 * reappears here.
 */
const clean = (value: string | undefined) => value?.trim() || '';

export const SUPPORT_CONFIG = {
  githubRepoUrl: ['https:', '//', 'github.com/mgbuilderos/opentools'].join(''),
  /**
   * The live Buy Me a Coffee page. Committed rather than left to the
   * environment: it is a public URL, not a secret, and the failure this file
   * exists to prevent was a payment value that had to be remembered at build
   * time and was not. The env var stays as an override for staging.
   */
  buyMeACoffeeUrl:
    clean(process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL) ||
    'https://buymeacoffee.com/codebuilder',
  /**
   * The project's UPI address, committed for the same reason as the page
   * above: it is shown publicly on `/support` with a copy button, so it is not
   * a secret, and the failure this file exists to prevent was a payment value
   * that had to be remembered at build time and was not.
   *
   * The `test` in the handle is part of the address the owner registered, not
   * a sandbox marker — it reads like one, which is why it was treated as
   * unverified until it was checked. **Verified 2026-09-18: the owner sent a
   * real payment to it and confirmed receipt.** That is the only check that
   * settles a payment address; a test can prove a link is well formed, never
   * that the money arrives.
   */
  upiId: clean(process.env.NEXT_PUBLIC_UPI_ID) || 'mg.io.test@oksbi',
  upiPayeeName: clean(process.env.NEXT_PUBLIC_UPI_NAME) || 'OpenTools',
};

/**
 * One "coffee" on the Buy Me a Coffee page, in USD. **This must match the
 * coffee price set on that page** — it was $5.00 when checked on 2026-09-18.
 * Every offered amount is a whole number of coffees, so nobody clicks $10 and
 * lands on a page asking for something else; `support-config.test.ts` fails the
 * build if a tier stops dividing evenly.
 */
export const BUYMEACOFFEE_UNIT_USD = 5;

/** Whole coffees for a USD amount, or null when it does not divide evenly. */
export function coffeesFor(usd: number): number | null {
  if (!Number.isFinite(usd) || usd < BUYMEACOFFEE_UNIT_USD) return null;
  const coffees = usd / BUYMEACOFFEE_UNIT_USD;
  return Number.isInteger(coffees) ? coffees : null;
}

/**
 * GitHub Sponsors is deliberately absent. The profile was never approved —
 * `github.com/sponsors/…` redirects to the plain profile page — so every link
 * to it was dead, and the owner moved to Buy Me a Coffee on 2026-09-18. A
 * channel that cannot take money does not belong in this list: leaving it here
 * is how an empty `href` reaches a page that asks for money.
 */
export type SupportChannel = 'upi' | 'buymeacoffee';

/**
 * The channels that are configured and can actually receive money, in the
 * order they should be offered. An empty array is the honest answer when
 * nothing is set up, and the UI must then show no payment controls at all.
 */
export function supportChannels(): SupportChannel[] {
  const channels: SupportChannel[] = [];
  if (SUPPORT_CONFIG.upiId) channels.push('upi');
  if (SUPPORT_CONFIG.buyMeACoffeeUrl) channels.push('buymeacoffee');
  return channels;
}

/** True when there is at least one working way to send support. */
export function canAcceptSupport() {
  return supportChannels().length > 0;
}

/**
 * GitHub Sponsors, announced as not open yet.
 *
 * Deliberately **not** a `SupportChannel`. `supportChannels()` answers one
 * question — where can money actually go — and this cannot take any: the
 * profile is still waiting on GitHub's approval, and until it is granted
 * `github.com/sponsors/mgbuilderos` redirects to a plain profile page. Keeping
 * the two apart is what stops a pending channel from being rendered as a
 * payable one, so `canAcceptSupport()` and every payment control stay blind to
 * it.
 *
 * It is shown anyway because the owner asked for it to be visible: people who
 * would rather sponsor through GitHub can see it is coming instead of assuming
 * it will never exist. That is an announcement, not an offer, so this object
 * carries **no sponsors URL and no amount** — there is nothing here for a
 * button to point at. The one action offered alongside it is starring the
 * repository, which is free and works today.
 *
 * When GitHub approves the profile: add `githubSponsors` back to
 * `SupportChannel`, read the URL from `NEXT_PUBLIC_GITHUB_SPONSORS_URL`, and
 * delete this. The channel list is the only place that should ever decide
 * whether a payment control renders.
 */
export const GITHUB_SPONSORS_PENDING = {
  name: 'GitHub Sponsors',
  /** Shown verbatim. Says what is true: it is waiting, not live. */
  status: 'Waiting on GitHub approval',
  description:
    'Not open yet — GitHub is still reviewing the profile. Until it clears, the two options above are the ways to help.',
} as const;

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
    name: '☕ One Coffee',
    amountUsd: '$5',
    amountInr: '₹420',
    usdValue: 5,
    inrValue: 420,
    description: 'Covers the domain and the hosting.',
    features: [
      'No ads, no third-party trackers, no client-side analytics',
      'Every tool stays free — no signup, no watermark',
      'Nothing in return — support is voluntary',
    ],
  },
  {
    name: '⚡ Two Coffees',
    amountUsd: '$10',
    amountInr: '₹840',
    usdValue: 10,
    inrValue: 840,
    description: 'Keeps the tools that are already here working.',
    features: [
      'Fixes and maintenance on the tools here today',
      'Checks that catch a bad file before you download it',
      'Nothing in return — support is voluntary',
    ],
  },
  {
    name: '💖 Five Coffees',
    amountUsd: '$25',
    amountInr: '₹2,100',
    usdValue: 25,
    inrValue: 2100,
    description: 'Buys time for new tools, and the tests behind them.',
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
