/* oxlint-disable */
'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  GitBranch,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  GITHUB_SPONSORS_PENDING,
  SUPPORT_CONFIG,
  SUPPORT_TIERS,
  coffeesFor,
  getBuyMeACoffeeUrl,
  getUpiPaymentUrl,
  isLikelyIndiaVisitor,
} from '@/lib/support-config';

type SupportTab = 'upi' | 'international' | 'github';

/**
 * Amounts, small enough to read at 375px. The label is what the amount buys in
 * ordinary terms, not a tier — nothing here is bought and nothing is returned.
 */
const UPI_AMOUNTS = [
  { amt: 29, label: '☕ Chai' },
  { amt: 59, label: '⚡ Coffee' },
  { amt: 99, label: '🍕 Lunch' },
  { amt: 299, label: '💖 Patron' },
  { amt: 999, label: '🚀 Sponsor' },
] as const;

export function SupportDualView() {
  const [activeTab, setActiveTab] = useState<SupportTab>('international');
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null);
  const [selectedInrAmount, setSelectedInrAmount] = useState<number>(59);
  const [customInrAmount, setCustomInrAmount] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  /**
   * A channel with no configured id cannot take money, so it is not offered at
   * all. Showing a dead QR and a link to nowhere is worse than showing one
   * working option.
   */
  const upiReady = Boolean(SUPPORT_CONFIG.upiId);

  useEffect(() => {
    const isIndia = isLikelyIndiaVisitor();
    if (isIndia && upiReady) {
      setActiveTab('upi');
      setDetectedRegion('India 🇮🇳');
    } else {
      setActiveTab('international');
      setDetectedRegion('outside India 🌍');
    }
  }, []);

  const currentAmount =
    customInrAmount && parseInt(customInrAmount, 10) > 0
      ? parseInt(customInrAmount, 10)
      : selectedInrAmount;

  const upiUrl = getUpiPaymentUrl(
    currentAmount,
    'OpenTools Independent Development Support',
  );

  useEffect(() => {
    let isMounted = true;
    // No configured UPI id means no link to encode. Rendering nothing is the
    // honest result; asking the encoder for an empty string only logs an error.
    if (!upiUrl) {
      setQrSvg('');
      return;
    }
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
    } catch {
      // fallback
    }
  };

  /**
   * Three tabs have to fit 375px. The labels shorten below `sm` and the
   * trailing badges only appear at `lg`, so nothing wraps or overflows on a
   * phone; the "Soon" badge is the exception, because it is the whole point of
   * that tab and has to be readable at every width.
   */
  const tabClass = (tab: SupportTab) =>
    `flex flex-1 min-w-0 items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-1.5 py-2 sm:px-2 sm:py-2.5 text-[13px] sm:text-sm font-semibold transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] active:scale-[0.99] ${
      activeTab === tab
        ? 'bg-card text-foreground shadow-xs'
        : 'text-muted-foreground hover:bg-card/40 hover:text-foreground'
    }`;

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/*
        One line, not two columns. At 375px the old two-column version wrapped
        into a squashed three-line block above the tabs it was describing.
      */}
      {detectedRegion && (
        <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-success"
          />
          <span className="truncate">
            Looks like you're in{' '}
            <strong className="font-semibold text-foreground">
              {detectedRegion}
            </strong>{' '}
            — switch any time.
          </span>
        </p>
      )}

      {/* Navigation Tabs */}
      <div className="flex rounded-xl border bg-muted/50 p-1">
        {upiReady && (
          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            className={tabClass('upi')}
          >
            <span aria-hidden="true">🇮🇳</span>
            <span className="sm:hidden">UPI</span>
            <span className="hidden sm:inline">India (UPI)</span>
            <span className="hidden lg:inline-block rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
              0% fee
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('international')}
          className={tabClass('international')}
        >
          <span aria-hidden="true">☕</span>
          <span className="sm:hidden">Coffee</span>
          <span className="hidden sm:inline">Buy Me a Coffee</span>
          <span className="hidden lg:inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Cards &amp; PayPal
          </span>
        </button>
        {/*
          Pending, not payable. The tab opens a panel that explains the wait and
          offers no payment control — see `GITHUB_SPONSORS_PENDING`. It is styled
          muted rather than disabled so it can still be read.
        */}
        <button
          type="button"
          onClick={() => setActiveTab('github')}
          className={tabClass('github')}
        >
          <span aria-hidden="true">⏳</span>
          <span>GitHub</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:px-2">
            Soon
          </span>
        </button>
      </div>

      {/* Tab 1: UPI India */}
      {activeTab === 'upi' && upiReady && (
        <div className="space-y-4 rounded-2xl border bg-card p-4 sm:space-y-6 sm:p-8">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-success sm:text-sm">
                <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                Straight to the bank · 0% fee
              </div>
              <h3 className="mt-1 text-lg font-bold sm:text-xl">
                Pick an amount ☕
              </h3>
              <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
                Works with GPay, PhonePe, Paytm, BHIM, Cred, Amazon Pay or your
                banking app.
              </p>
            </div>
          </div>

          {/* Amount presets — three across on a phone so five fit in two rows. */}
          <div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {UPI_AMOUNTS.map(({ amt, label }) => {
                const isSelected =
                  currentAmount === amt && customInrAmount === '';
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setSelectedInrAmount(amt);
                      setCustomInrAmount('');
                    }}
                    className={`rounded-xl border p-2 text-center transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] sm:p-3 ${
                      isSelected
                        ? 'border-success bg-success/10 font-bold text-foreground shadow-xs ring-2 ring-success/20'
                        : 'bg-card text-muted-foreground hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <div className="text-base sm:text-lg">
                      ₹{amt.toLocaleString('en-IN')}
                    </div>
                    <div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground sm:text-[11px]">
                      {label}
                    </div>
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              placeholder="Or type your own amount ₹"
              value={customInrAmount}
              onChange={(e) => setCustomInrAmount(e.target.value)}
              className="mt-2 w-full rounded-xl border bg-background px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-success/30"
            />
          </div>

          {/*
            The action comes first on a phone and the QR second.

            A QR on the screen you are holding cannot be scanned by that same
            phone, so shipping it above the button meant ~450px of dead space
            between choosing an amount and being able to pay. It is still here —
            people do screenshot it, or scan it from a second device — just
            after the thing that actually works on the device in your hand.
          */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-8 sm:pt-2">
            <div className="order-1 w-full space-y-2 text-center sm:order-2 sm:max-w-xs sm:space-y-3 sm:pt-6 sm:text-left">
              <Button
                className="w-full rounded-xl bg-success py-5 font-semibold text-white shadow-sm hover:bg-success"
                render={
                  <a href={upiUrl} target="_blank" rel="noopener noreferrer" />
                }
              >
                <Zap aria-hidden="true" className="mr-2 size-4" />
                Pay ₹{currentAmount.toLocaleString('en-IN')}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Opens your UPI app with ₹{currentAmount.toLocaleString('en-IN')}{' '}
                already filled in. ✅
              </p>
              {/*
                Pasting the id by hand is the fallback for anyone whose UPI app
                does not open from a link, so it belongs with the other fallback
                rather than above the button that works.
              */}
              <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/60 px-3 py-1.5">
                <span className="truncate font-mono text-xs font-medium">
                  {SUPPORT_CONFIG.upiId}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyUpiId}
                  className="h-7 shrink-0 px-2 text-xs"
                >
                  {copiedUpi ? (
                    <Check
                      aria-hidden="true"
                      className="mr-1 size-3.5 text-success"
                    />
                  ) : (
                    <Copy aria-hidden="true" className="mr-1 size-3.5" />
                  )}
                  {copiedUpi ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="order-2 flex flex-col items-center rounded-2xl border bg-white p-3 shadow-sm sm:order-1 sm:p-4">
              {qrSvg ? (
                <div
                  className="flex size-40 items-center justify-center rounded-lg [&>svg]:size-full sm:size-52"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="flex size-40 animate-pulse items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground sm:size-52">
                  Generating QR...
                </div>
              )}
              <div className="mt-2 text-center">
                <span className="text-xs font-bold text-gray-800">
                  ₹{currentAmount.toLocaleString('en-IN')}
                </span>
                <span className="block text-[10px] text-gray-500">
                  Scan from another device
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Buy Me a Coffee (international) */}
      {activeTab === 'international' && (
        <div className="rounded-2xl border bg-card p-4 sm:p-8">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-success sm:text-sm">
                <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                Open now · worldwide
              </div>
              <h3 className="mt-1 text-lg font-bold sm:text-xl">
                Buy me a coffee ☕
              </h3>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Apple Pay, Google Pay, cards and PayPal. 💳
              </p>
            </div>
          </div>

          {/* Tiers Grid */}
          <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
            {SUPPORT_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`flex flex-col justify-between rounded-xl border p-4 sm:p-5 ${
                  tier.popular
                    ? 'border-border bg-muted/20 shadow-sm'
                    : 'bg-card'
                }`}
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold sm:text-base">
                      {tier.name}
                    </h4>
                    <span className="font-mono text-xl font-bold sm:hidden">
                      {tier.amountUsd}
                    </span>
                  </div>
                  <div className="mt-2 hidden font-mono text-2xl font-bold sm:block">
                    {tier.amountUsd}
                    <span className="text-xs font-normal text-muted-foreground">
                      {' '}
                      / one-time
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2">
                    {tier.description}
                  </p>

                  {/*
                    The commitments, in full, from `sm` up. On a phone they are
                    replaced by the single line under this grid: the same three
                    promises repeated on all three cards is nine lines of text
                    standing between someone and a payment button.
                  */}
                  <ul className="mt-4 hidden space-y-2 border-t pt-4 text-xs text-muted-foreground sm:block">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 size-3.5 shrink-0 text-success"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 sm:mt-6">
                  <a
                    href={getBuyMeACoffeeUrl(
                      coffeesFor(tier.usdValue) ?? undefined,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex h-9 w-full items-center justify-center rounded-lg border bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90"
                  >
                    Send {tier.amountUsd} ☕
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground sm:hidden">
            ☕ $5 = one coffee · no ads, no trackers · nothing in return
          </p>

          {/* Custom Amount CTA */}
          <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border bg-muted/40 p-4 text-center sm:mt-6 sm:flex-row sm:gap-4 sm:text-left">
            <p className="text-xs text-muted-foreground sm:text-sm">
              Want a different amount, or monthly? 💚
            </p>
            <a
              href={getBuyMeACoffeeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex h-9 w-full shrink-0 items-center justify-center rounded-lg border bg-card px-3 text-xs font-semibold transition-colors hover:bg-muted sm:w-auto"
            >
              Choose an amount
            </a>
          </div>

          {/* Free, works today, and not a payment. */}
          <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground sm:mt-4 sm:flex-row sm:items-center">
            <p>
              <span className="font-semibold text-foreground">
                ⭐ Or star the repo — it's free
              </span>{' '}
              and helps other people find it.
            </p>
            <Button
              size="sm"
              className="w-full shrink-0 text-xs font-semibold sm:w-auto"
              render={
                <a
                  href={SUPPORT_CONFIG.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Star
                aria-hidden="true"
                className="mr-1.5 size-3.5 fill-current"
              />
              Star on GitHub
              <ExternalLink aria-hidden="true" className="ml-1.5 size-3" />
            </Button>
          </div>
        </div>
      )}

      {/*
        Tab 3: GitHub Sponsors — announced, not open.

        There is no payment control anywhere in this panel and no link to a
        sponsors URL, because the profile is still under review and that URL
        currently redirects to a plain profile page. The only actions offered
        are the two channels that work today and starring the repository, which
        is free. See `GITHUB_SPONSORS_PENDING`.
      */}
      {activeTab === 'github' && (
        <div className="rounded-2xl border bg-card p-4 sm:p-8">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:text-sm">
                <GitBranch aria-hidden="true" className="size-4 shrink-0" />
                {GITHUB_SPONSORS_PENDING.name}
              </div>
              <h3 className="mt-1 text-lg font-bold sm:text-xl">
                Not open yet ⏳
              </h3>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {GITHUB_SPONSORS_PENDING.description}
              </p>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Clock aria-hidden="true" className="size-3.5" />
                {GITHUB_SPONSORS_PENDING.status}
              </span>
            </div>
          </div>

          {/* The two channels that can actually take money right now. */}
          <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-2 sm:gap-3">
            {upiReady && (
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className="focus-ring flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5 text-left transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-muted/40 active:translate-y-0 active:scale-[0.99] sm:p-4"
              >
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span aria-hidden="true">🇮🇳</span>
                    Pay by UPI
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Any UPI app, in India. Open now.
                  </span>
                </span>
                <Zap
                  aria-hidden="true"
                  className="size-4 shrink-0 text-success"
                />
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('international')}
              className="focus-ring flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5 text-left transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-muted/40 active:translate-y-0 active:scale-[0.99] sm:p-4"
            >
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span aria-hidden="true">☕</span>
                  Buy Me a Coffee
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Cards, Apple Pay, Google Pay, PayPal.
                </span>
              </span>
              <Zap
                aria-hidden="true"
                className="size-4 shrink-0 text-success"
              />
            </button>
          </div>

          {/* Free, works today, and not a payment. */}
          <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground sm:mt-6 sm:flex-row sm:items-center">
            <p>
              <span className="font-semibold text-foreground">
                ⭐ Or star the repo — it's free
              </span>{' '}
              and helps other people find it.
            </p>
            <Button
              size="sm"
              className="w-full shrink-0 text-xs font-semibold sm:w-auto"
              render={
                <a
                  href={SUPPORT_CONFIG.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Star
                aria-hidden="true"
                className="mr-1.5 size-3.5 fill-current"
              />
              Star on GitHub
              <ExternalLink aria-hidden="true" className="ml-1.5 size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
