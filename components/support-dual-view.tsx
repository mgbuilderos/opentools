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
  Globe,
  Heart,
  QrCode,
  ShieldCheck,
  Sparkles,
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
      setDetectedRegion('India (UPI Recommended)');
    } else {
      setActiveTab('international');
      setDetectedRegion('International (Buy Me a Coffee)');
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
    `flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] active:scale-[0.99] ${
      activeTab === tab
        ? 'bg-card text-foreground shadow-xs'
        : 'text-muted-foreground hover:bg-card/40 hover:text-foreground'
    }`;

  return (
    <div className="w-full space-y-4">
      {detectedRegion && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full bg-success" />
            Auto-selected for your region:{' '}
            <strong className="text-foreground">{detectedRegion}</strong>
          </span>
          <span className="text-[11px] text-muted-foreground/80">
            Switch tab anytime
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex rounded-xl border bg-muted/50 p-1">
        {upiReady && (
          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            className={tabClass('upi')}
          >
            <span className="text-base">🇮🇳</span>
            <span className="sm:hidden">UPI</span>
            <span className="hidden sm:inline">India (UPI)</span>
            <span className="hidden lg:inline-block rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
              0% Fee
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('international')}
          className={tabClass('international')}
        >
          <Globe className="size-4 shrink-0" />
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
          <GitBranch className="size-4 shrink-0" />
          <span>GitHub</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Soon
          </span>
        </button>
      </div>

      {/* Tab 1: UPI India */}
      {activeTab === 'upi' && upiReady && (
        <div className="rounded-2xl border bg-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
            <div>
              <div className="flex items-center gap-2 text-success font-semibold text-sm">
                <ShieldCheck className="size-4" />
                Direct Bank-to-Bank Transfer
              </div>
              <h3 className="text-xl font-bold mt-1">Scan with any UPI App</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Google Pay, PhonePe, Paytm, BHIM, Cred, Amazon Pay or any
                banking app.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2 bg-muted/60 px-3 py-2 rounded-xl border">
              <span className="font-mono text-xs sm:text-sm font-medium">
                {SUPPORT_CONFIG.upiId}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyUpiId}
                className="h-7 px-2 text-xs"
              >
                {copiedUpi ? (
                  <Check className="size-3.5 text-success mr-1" />
                ) : (
                  <Copy className="size-3.5 mr-1" />
                )}
                {copiedUpi ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Amount selector presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Select Support Amount
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { amt: 29, label: '☕ Chai', popular: false },
                { amt: 59, label: '⚡ Coffee', popular: false },
                { amt: 99, label: '🍕 Lunch', popular: false },
                { amt: 299, label: '💖 Patron', popular: false },
                { amt: 999, label: '🚀 Sponsor', popular: false },
              ].map(({ amt, label }) => {
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
                    className={`rounded-xl border p-2.5 sm:p-3 text-center transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
                      isSelected
                        ? 'border-success bg-success/10 text-foreground ring-2 ring-success/20 font-bold shadow-xs'
                        : 'bg-card text-muted-foreground hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <div className="text-base sm:text-lg">
                      ₹{amt.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                      {label}
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
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-success/30 font-mono"
              />
            </div>
          </div>

          {/* QR Code and Actions */}
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
                <span className="text-[10px] text-gray-500 block">
                  Scan to Pay
                </span>
              </div>
            </div>

            <div className="space-y-4 text-center sm:text-left max-w-xs">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">On your Mobile Phone?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tap below to directly launch your default UPI app with the
                  exact amount prefilled.
                </p>
              </div>

              <Button
                className="w-full bg-success hover:bg-success text-white font-semibold py-5 rounded-xl shadow-sm"
                render={
                  <a href={upiUrl} target="_blank" rel="noopener noreferrer" />
                }
              >
                <Zap className="mr-2 size-4" />
                Pay ₹{currentAmount.toLocaleString('en-IN')} via UPI App
              </Button>

              <div className="text-[11px] text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                <Check className="size-3.5 text-success" />
                Goes to keeping these tools running
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: International GitHub Sponsors */}
      {activeTab === 'international' && (
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
              <div>
                <div className="flex items-center gap-2 text-success font-semibold text-sm">
                  <ShieldCheck className="size-4" />
                  Buy Me a Coffee
                </div>
                <h3 className="text-xl font-bold mt-1">
                  Global support, one coffee at a time
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Supports Apple Pay, Google Pay, Visa, MasterCard, Amex &amp;
                  PayPal worldwide.
                </p>
              </div>
              <div className="shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                  <ShieldCheck className="size-3.5" />
                  Open now
                </span>
              </div>
            </div>

            {/* Status notice */}
            <div className="mt-6 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Star className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">
                    Starring the repository is free
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    It costs nothing and helps other people find the project,
                    which is worth as much as a coffee.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="shrink-0 text-xs font-semibold"
                render={
                  <a
                    href={SUPPORT_CONFIG.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <Star className="mr-1.5 size-3.5 fill-current" />
                Star on GitHub
                <ExternalLink className="ml-1.5 size-3" />
              </Button>
            </div>

            {/* Tiers Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {SUPPORT_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`flex flex-col justify-between rounded-xl border p-5 ${
                    tier.popular
                      ? 'border-border bg-muted/20 shadow-sm'
                      : 'bg-card'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">{tier.name}</h4>
                      {tier.popular && (
                        <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono">
                      {tier.amountUsd}
                      <span className="text-xs font-normal text-muted-foreground">
                        {' '}
                        / one-time
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {tier.description}
                    </p>

                    <ul className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="size-3.5 text-success shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <a
                      href={getBuyMeACoffeeUrl(
                        coffeesFor(tier.usdValue) ?? undefined,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring inline-flex h-9 w-full items-center justify-center rounded-lg border bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      Send {tier.amountUsd} on Buy Me a Coffee
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Amount CTA */}
            <div className="mt-6 rounded-xl bg-muted/40 border p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <h5 className="text-sm font-semibold">
                  Want to contribute a custom amount?
                </h5>
                <p className="text-xs text-muted-foreground">
                  Pick any number of coffees, or set up a monthly membership, on
                  the Buy Me a Coffee page.
                </p>
              </div>
              <a
                href={getBuyMeACoffeeUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors hover:bg-muted"
              >
                Choose an amount
              </a>
            </div>
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
        <div className="rounded-2xl border bg-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground font-semibold text-sm">
                <GitBranch className="size-4" />
                {GITHUB_SPONSORS_PENDING.name}
              </div>
              <h3 className="text-xl font-bold mt-1">Not open yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {GITHUB_SPONSORS_PENDING.description}
              </p>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Clock className="size-3.5" />
                {GITHUB_SPONSORS_PENDING.status}
              </span>
            </div>
          </div>

          {/* The two channels that can actually take money right now. */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {upiReady && (
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className="focus-ring flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-muted/40 active:translate-y-0 active:scale-[0.99]"
              >
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="text-base">🇮🇳</span>
                    Pay by UPI
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Any UPI app, in India. Open now.
                  </span>
                </span>
                <Zap className="size-4 shrink-0 text-success" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('international')}
              className="focus-ring flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition-all duration-[var(--motion-standard)] ease-[var(--motion-ease)] hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-muted/40 active:translate-y-0 active:scale-[0.99]"
            >
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Globe className="size-4" />
                  Buy Me a Coffee
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Cards, Apple Pay, Google Pay, PayPal. Open now.
                </span>
              </span>
              <Zap className="size-4 shrink-0 text-success" />
            </button>
          </div>

          {/* Free, works today, and not a payment. */}
          <div className="mt-6 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Star className="size-4 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">
                  Starring the repository is free
                </p>
                <p className="mt-0.5">
                  It costs nothing and helps other people find the project,
                  which is worth as much as a coffee.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 text-xs font-semibold"
              render={
                <a
                  href={SUPPORT_CONFIG.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <Star className="mr-1.5 size-3.5 fill-current" />
              Star on GitHub
              <ExternalLink className="ml-1.5 size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
