export const SUPPORT_CONFIG = {
  githubRepoUrl: ['https:', '//', 'github.com/mgbuilderos/opentools'].join(''),
  githubSponsorsUrl:
    process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL ||
    ['https:', '//', 'github.com/sponsors/mgbuilderos'].join(''),
  upiId: process.env.NEXT_PUBLIC_UPI_ID || 'mg.io.test@oksbi',
  upiPayeeName: process.env.NEXT_PUBLIC_UPI_NAME || 'OpenTools',
};

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

export function getUpiPaymentUrl(amountInr?: number, note?: string): string {
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
