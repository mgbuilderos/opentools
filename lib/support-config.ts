export const SUPPORT_CONFIG = {
  githubSponsorsUrl:
    process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL ||
    ['https:', '//', 'github.com/sponsors/opentools'].join(''),
  upiId: process.env.NEXT_PUBLIC_UPI_ID || 'opentools@upi',
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

export const SUPPORT_TIERS: SupportTier[] = [
  {
    name: 'Quick Coffee',
    amountUsd: '$3',
    amountInr: '₹150',
    usdValue: 3,
    inrValue: 150,
    description: 'Helps cover automated zero-egress test suites and hosting.',
    features: [
      'Runs our 270+ offline security tests',
      'Keeps the platform 100% ad-free',
      'Good karma & community gratitude',
    ],
  },
  {
    name: 'Tool Backer',
    amountUsd: '$10',
    amountInr: '₹500',
    usdValue: 10,
    inrValue: 500,
    popular: true,
    description: 'Funds new offline WebAssembly algorithms and local codecs.',
    features: [
      'Accelerates Video & OCR offline engines',
      'Expands document & media suites',
      'Direct support for client-side compute',
    ],
  },
  {
    name: 'Pro Patron',
    amountUsd: '$25',
    amountInr: '₹1,500',
    usdValue: 25,
    inrValue: 1500,
    description:
      'Supports dedicated open-source engineering and security audits.',
    features: [
      'Prioritized feature suggestions',
      'Supports strict zero-egress audits',
      'Direct contact & feature advisory',
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
    params.set('tn', 'OpenTools Support');
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
