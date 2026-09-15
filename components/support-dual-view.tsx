/* oxlint-disable */
'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Heart,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SUPPORT_CONFIG,
  SUPPORT_TIERS,
  getUpiPaymentUrl,
  isLikelyIndiaVisitor,
} from '@/lib/support-config';

export function SupportDualView() {
  const [activeTab, setActiveTab] = useState<'upi' | 'international'>(
    'international',
  );
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null);
  const [selectedInrAmount, setSelectedInrAmount] = useState<number>(500);
  const [customInrAmount, setCustomInrAmount] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);

  useEffect(() => {
    const isIndia = isLikelyIndiaVisitor();
    if (isIndia) {
      setActiveTab('upi');
      setDetectedRegion('India (UPI Recommended)');
    } else {
      setActiveTab('international');
      setDetectedRegion('International (GitHub Recommended)');
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
        <button
          type="button"
          onClick={() => setActiveTab('upi')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'upi'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="text-base">🇮🇳</span>
          <span>India (Instant UPI)</span>
          <span className="hidden sm:inline-block rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
            0% Fee
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('international')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'international'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="size-4" />
          <span>International (GitHub)</span>
          <span className="hidden sm:inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Cards & PayPal
          </span>
        </button>
      </div>

      {/* Tab 1: UPI India */}
      {activeTab === 'upi' && (
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[150, 500, 1500, 3000].map((amt) => {
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
                    className={`rounded-xl border p-3 text-center transition-all ${
                      isSelected
                        ? 'border-success bg-success/10 text-foreground ring-2 ring-success/20 font-bold'
                        : 'bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                    }`}
                  >
                    <div className="text-lg">
                      ₹{amt.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {amt === 150
                        ? 'Quick Chai'
                        : amt === 500
                          ? 'Feature Boost'
                          : amt === 1500
                            ? 'Patron'
                            : 'Sponsor'}
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
                100% of funds go to local browser tools
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
                  Official GitHub Sponsors Platform
                </div>
                <h3 className="text-xl font-bold mt-1">
                  Global Support via GitHub
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Supports Apple Pay, Google Pay, Visa, MasterCard, Amex &
                  PayPal worldwide.
                </p>
              </div>
              <div className="shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                  <Sparkles className="size-3.5 text-success" />
                  0% Platform Fee
                </span>
              </div>
            </div>

            {/* Tiers Grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {SUPPORT_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`flex flex-col justify-between rounded-xl border p-5 ${
                    tier.popular
                      ? 'border-success bg-success/5 shadow-sm'
                      : 'bg-card'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">{tier.name}</h4>
                      {tier.popular && (
                        <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white">
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
                    <Button
                      className={`w-full text-xs font-semibold ${
                        tier.popular
                          ? 'bg-success hover:bg-success text-white'
                          : ''
                      }`}
                      variant={tier.popular ? 'default' : 'outline'}
                      render={
                        <a
                          href={SUPPORT_CONFIG.githubSponsorsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      Sponsor {tier.amountUsd} on GitHub
                      <ExternalLink className="ml-1.5 size-3" />
                    </Button>
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
                  You can set any one-time or recurring sponsorship directly on
                  GitHub.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 text-xs font-semibold"
                render={
                  <a
                    href={SUPPORT_CONFIG.githubSponsorsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Custom Sponsorship
                <ExternalLink className="ml-1.5 size-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
