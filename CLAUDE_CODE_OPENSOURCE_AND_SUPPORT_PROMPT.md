# 🚀 Claude Code Master Execution Prompt
# Copy all text below this line and paste directly into Claude Code:

You are an expert full-stack engineer and UI/UX designer. I want to make this repository open-source under the MIT license, and equip it with:
1. An infinite marquee trust & privacy notice ribbon at the top of the app.
2. A high-converting dual support system (Instant India UPI with live SVG QR code generation + International GitHub Sponsors) on `/support`.
3. A non-blocking post-action value receipt modal with a 400ms relief delay and emoji micro-tiers.

Execute the following steps completely in code:

---

### Step 1: Open-Source Foundation & MIT License
1. Create a root `LICENSE` file:
```text
MIT License

Copyright (c) 2026 OpenTools Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
2. Update `package.json` to include `"license": "MIT"`.

---

### Step 2: Install Dependencies
Run:
```bash
npm install qrcode lucide-react class-variance-authority clsx tailwind-merge
npm install -D @types/qrcode
```

---

### Step 3: Support Configuration & Zero-Egress Geo Detection
Create `lib/support-config.ts`:
```ts
export const SUPPORT_CONFIG = {
  githubRepoUrl: process.env.NEXT_PUBLIC_GITHUB_REPO_URL || 'https://github.com/your-username/your-repo',
  githubSponsorsUrl: process.env.NEXT_PUBLIC_GITHUB_SPONSORS_URL || 'https://github.com/sponsors/your-username',
  upiId: process.env.NEXT_PUBLIC_UPI_ID || 'your-upi-id@oksbi',
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
    name: '☕ Quick Coffee',
    amountUsd: '$3',
    amountInr: '₹150',
    usdValue: 3,
    inrValue: 150,
    description: 'Helps cover automated zero-egress test suites and hosting.',
    features: [
      'Runs our offline security tests',
      'Keeps the platform 100% ad-free',
      'Good karma & community gratitude',
    ],
  },
  {
    name: '⚡ Tool Backer',
    amountUsd: '$10',
    amountInr: '₹500',
    usdValue: 10,
    inrValue: 500,
    popular: true,
    description: 'Funds new offline WebAssembly algorithms and local codecs.',
    features: [
      'Accelerates offline processing engines',
      'Expands document & media suites',
      'Direct support for client-side compute',
    ],
  },
  {
    name: '💖 Pro Patron',
    amountUsd: '$25',
    amountInr: '₹1,500',
    usdValue: 25,
    inrValue: 1500,
    description: 'Supports dedicated open-source engineering and security audits.',
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
    params.set('tn', `${SUPPORT_CONFIG.upiPayeeName} Fuel ☕ - Keep It 100% Private & Ad-Free`);
  }
  return `upi://pay?${params.toString()}`;
}

export function isLikelyIndiaVisitor(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (
      timeZone.toLowerCase().includes('kolkata') ||
      timeZone.toLowerCase().includes('calcutta') ||
      timeZone.toLowerCase().includes('india')
    ) {
      return true;
    }
    const offsetMinutes = -new Date().getTimezoneOffset();
    if (offsetMinutes === 330) {
      return true;
    }
    const languages = navigator.languages || [navigator.language || ''];
    for (const lang of languages) {
      if (/-IN\b/i.test(lang) || /^(hi|ta|te|mr|gu|kn|ml|pa|bn)-/i.test(lang)) {
        return true;
      }
    }
    const urlParams = new URLSearchParams(window.location.search);
    const regionParam = urlParams.get('region') || urlParams.get('country');
    if (regionParam && regionParam.toUpperCase() === 'IN') {
      return true;
    }
  } catch {}
  return false;
}
```

---

### Step 4: CSS Animation in `globals.css`
Add the following to your `globals.css`:
```css
@keyframes ticker {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.animate-ticker {
  display: flex;
  width: max-content;
  animation: ticker 40s linear infinite;
}

.animate-ticker:hover {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .animate-ticker {
    animation: none;
  }
}
```

---

### Step 5: Trust & Privacy Notice Bar Component
Create `components/notice-bar.tsx`:
```tsx
'use client';

import { Star } from 'lucide-react';
import { SUPPORT_CONFIG } from '@/lib/support-config';

export function NoticeBar() {
  return (
    <aside
      aria-label="Trust and privacy guarantees"
      className="border-b bg-muted/40 text-[11px] text-muted-foreground select-none"
    >
      <div className="mx-auto flex h-7 max-w-[1440px] items-center overflow-hidden px-3 sm:px-6 lg:px-8">
        <div className="animate-ticker flex items-center gap-6 whitespace-nowrap font-medium">
          {[0, 1].map((copyIndex) => (
            <div key={copyIndex} className="flex items-center gap-6 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true">🔒</span>
                <span>Your Files Never Leave Your Device</span>
              </span>
              <span className="opacity-40" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true">🛡️</span>
                <span>100% Private &amp; Offline-Ready</span>
              </span>
              <span className="opacity-40" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true">⚡</span>
                <span>Zero Server Uploads</span>
              </span>
              <span className="opacity-40" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true">🚫</span>
                <span>No Signups · No Paywalls · No Ads</span>
              </span>
              <span className="opacity-40" aria-hidden="true">·</span>
              <a
                href={SUPPORT_CONFIG.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <span aria-hidden="true">⚖️</span>
                <span>Free &amp; Open Source (MIT)</span>
              </a>
              <span className="opacity-40" aria-hidden="true">·</span>
              <a
                href={SUPPORT_CONFIG.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-foreground hover:underline"
              >
                <Star aria-hidden="true" className="size-3 fill-current" />
                <span>Star on GitHub</span>
              </a>
              <span className="opacity-40" aria-hidden="true">·</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
```

---

### Step 6: Dual Support Component (`components/support-dual-view.tsx`)
Create `components/support-dual-view.tsx`:
```tsx
'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Heart,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import {
  SUPPORT_CONFIG,
  SUPPORT_TIERS,
  getUpiPaymentUrl,
  isLikelyIndiaVisitor,
} from '@/lib/support-config';

export function SupportDualView() {
  const [activeTab, setActiveTab] = useState<'upi' | 'international'>('international');
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null);
  const [selectedInrAmount, setSelectedInrAmount] = useState<number>(150);
  const [customInrAmount, setCustomInrAmount] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  useEffect(() => {
    const isIndia = isLikelyIndiaVisitor();
    if (isIndia) {
      setActiveTab('upi');
      setDetectedRegion('India (Instant UPI Recommended)');
    } else {
      setActiveTab('international');
      setDetectedRegion('International (GitHub Recommended)');
    }
  }, []);

  const currentAmount =
    customInrAmount && parseInt(customInrAmount, 10) > 0
      ? parseInt(customInrAmount, 10)
      : selectedInrAmount;

  const upiUrl = getUpiPaymentUrl(currentAmount);

  useEffect(() => {
    let isMounted = true;
    QRCode.toString(upiUrl, {
      type: 'svg',
      margin: 1,
      width: 220,
    })
      .then((svg: string) => {
        if (isMounted) setQrSvg(svg);
      })
      .catch((err: unknown) => {
        console.error('Failed to generate QR code', err);
      });

    return () => {
      isMounted = false;
    };
  }, [upiUrl]);

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_CONFIG.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch {}
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {detectedRegion && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full bg-emerald-500" />
            Auto-selected for your region: <strong className="text-foreground">{detectedRegion}</strong>
          </span>
          <span className="text-[11px] text-muted-foreground/80">Switch tab anytime</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl border bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('upi')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'upi'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-card/40 hover:text-foreground'
          }`}
        >
          <span className="text-base">🇮🇳</span>
          <span>India (Instant UPI)</span>
          <span className="hidden sm:inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            0% Fee
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('international')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'international'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-card/40 hover:text-foreground'
          }`}
        >
          <Globe className="size-4" />
          <span>International (GitHub)</span>
          <span className="hidden sm:inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Cards &amp; PayPal
          </span>
        </button>
      </div>

      {/* Tab 1: UPI India */}
      {activeTab === 'upi' && (
        <div className="rounded-2xl border bg-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <ShieldCheck className="size-4" />
                Direct Bank-to-Bank Transfer
              </div>
              <h3 className="text-xl font-bold mt-1">Scan with any UPI App</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Google Pay, PhonePe, Paytm, BHIM, Cred, Amazon Pay, or any banking app.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 bg-muted/60 px-3 py-2 rounded-xl border">
              <span className="font-mono text-xs sm:text-sm font-medium">{SUPPORT_CONFIG.upiId}</span>
              <button
                type="button"
                onClick={copyUpiId}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-muted"
              >
                {copiedUpi ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copiedUpi ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Amount Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Select Support Amount
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[50, 150, 500, 1500].map((amt) => {
                const isSelected = currentAmount === amt && customInrAmount === '';
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedInrAmount(amt);
                      setCustomInrAmount('');
                    }}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-foreground ring-2 ring-emerald-500/20 font-bold shadow-sm'
                        : 'bg-card text-muted-foreground hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <div className="text-lg">₹{amt.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {amt === 50
                        ? '☕ Chai'
                        : amt === 150
                          ? '🍕 Lunch (Popular)'
                          : amt === 500
                            ? '💖 Patron'
                            : '🚀 Sponsor'}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <input
                type="number"
                placeholder="Or enter custom amount in ₹"
                value={customInrAmount}
                onChange={(e) => setCustomInrAmount(e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono"
              />
            </div>
          </div>

          {/* QR Code & Mobile Launch */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-4">
            <div className="flex flex-col items-center bg-white p-4 rounded-2xl border shadow-sm">
              {qrSvg ? (
                <div
                  className="size-52 rounded-lg flex items-center justify-center [&>svg]:size-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="size-52 flex items-center justify-center bg-muted rounded-lg animate-pulse text-xs text-muted-foreground">
                  Generating QR...
                </div>
              )}
              <div className="mt-2 text-center">
                <span className="text-xs font-bold text-gray-800">
                  ₹{currentAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-gray-500 block">Scan to Pay</span>
              </div>
            </div>

            <div className="space-y-4 text-center sm:text-left max-w-xs">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">On your Mobile Phone?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tap below to directly launch your default UPI app with the exact amount prefilled.
                </p>
              </div>
              <a
                href={upiUrl}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Zap className="size-4" />
                Pay ₹{currentAmount.toLocaleString('en-IN')} via UPI App
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: International */}
      {activeTab === 'international' && (
        <div className="rounded-2xl border bg-card p-6 sm:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                <Globe className="size-3.5" />
                Global Developer Patronage
              </div>
              <h3 className="text-xl font-bold mt-1">Sponsor on GitHub</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Support with Credit Card, Debit Card, or PayPal via GitHub Sponsors.
              </p>
            </div>
            <a
              href={SUPPORT_CONFIG.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border bg-muted/60 px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors"
            >
              <Star className="size-4 fill-current" />
              Star on GitHub
            </a>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {SUPPORT_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                  tier.popular
                    ? 'border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/20 shadow-sm'
                    : 'bg-card'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                    Popular Sweet-Spot
                  </span>
                )}
                <div>
                  <h4 className="font-bold text-base">{tier.name}</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold">{tier.amountUsd}</span>
                    <span className="text-xs text-muted-foreground">/ one-time</span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    {tier.description}
                  </p>
                  <ul className="mt-4 space-y-2 border-t pt-4">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-2">
                  <a
                    href={SUPPORT_CONFIG.githubSponsorsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border bg-background py-2.5 text-xs font-semibold hover:bg-muted transition-colors"
                  >
                    <span>Sponsor {tier.amountUsd}</span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Step 7: Value Receipt Dialog with 400ms Relief Delay
Create `components/completion-value-dialog.tsx`:
```tsx
'use client';

import { Check, Clock3, HeartHandshake, LockKeyhole, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  isLikelyIndiaVisitor,
  getUpiPaymentUrl,
  SUPPORT_CONFIG,
} from '@/lib/support-config';

export function CompletionValueDialog({
  isOpen,
  onClose,
  operationName = 'Operation Complete',
  durationText = '<0.1 s',
}: {
  isOpen: boolean;
  onClose: () => void;
  operationName?: string;
  durationText?: string;
}) {
  const [isIndia] = useState(() => isLikelyIndiaVisitor());
  const [delayedVisible, setDelayedVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 400ms relief delay: ensures file download confirmation before modal render
      const timer = setTimeout(() => setDelayedVisible(true), 400);
      return () => clearTimeout(timer);
    } else {
      setDelayedVisible(false);
    }
  }, [isOpen]);

  if (!isOpen || !delayedVisible) return null;

  return (
    <dialog
      open
      aria-modal="false"
      className="fixed bottom-4 right-4 z-[80] m-0 w-[calc(100%-2rem)] max-w-sm rounded-2xl border bg-card p-0 text-foreground shadow-2xl"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check className="size-5" />
          </span>
          <button
            onClick={onClose}
            aria-label="Dismiss prompt"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Sparkles className="size-3.5" />
          <span>Instant Private Result</span>
        </div>

        <h2 className="mt-1 text-lg font-semibold leading-snug">
          Kept your files 100% on your device with zero cloud uploads.
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {operationName} finished privately in your browser.
        </p>

        <dl className="my-4 grid grid-cols-2 gap-3 border-y py-3 text-xs">
          <div>
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <Clock3 className="size-3.5" />
              Processing time
            </dt>
            <dd className="mt-1 text-base font-semibold">{durationText}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <LockKeyhole className="size-3.5" />
              Processed in
            </dt>
            <dd className="mt-1 text-base font-semibold">This browser</dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">
          Built by an independent developer. 100% ad-free &amp; private forever. Fuel a quick coffee or chai to keep this running:
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {isIndia ? (
            <>
              <a
                href={getUpiPaymentUrl(29, 'OpenTools Chai ☕ - Keep It Private & Ad-Free')}
                className="inline-flex h-9 items-center justify-center rounded-lg border bg-muted/60 px-3 text-xs font-medium hover:bg-muted transition-colors"
              >
                ☕ Chai ₹29
              </a>
              <a
                href={getUpiPaymentUrl(149, 'OpenTools Lunch 🍕 - Keep It Private & Ad-Free')}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors"
              >
                🍕 Lunch ₹149
              </a>
              <a
                href={getUpiPaymentUrl(499, 'OpenTools Patron 🚀 - Keep It Private & Ad-Free')}
                className="inline-flex h-9 items-center justify-center rounded-lg border bg-foreground px-3 text-xs font-medium text-background hover:opacity-90 transition-opacity"
              >
                🚀 ₹499
              </a>
            </>
          ) : (
            <>
              <a
                href={SUPPORT_CONFIG.githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors"
              >
                ⭐ Star on GitHub
              </a>
              <span className="inline-flex h-9 items-center justify-center rounded-lg border bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
                Sponsors Coming Soon
              </span>
            </>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="h-10 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
          >
            Not now
          </button>
          <a
            href="/support"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <HeartHandshake className="size-4" />
            Support options
          </a>
        </div>
      </div>
    </dialog>
  );
}
```

---

### Step 8: Mount Components
1. Mount `<NoticeBar />` at the top of your global layout/header.
2. Route `/support` to render `<SupportDualView />`.
3. Add `<CompletionValueDialog />` after file export or download actions.
