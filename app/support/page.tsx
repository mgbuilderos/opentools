import type { Metadata } from 'next';
import {
  ArrowLeft,
  Check,
  Coffee,
  Coins,
  Cpu,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Support Independent Development — 100% Free Browser Tools',
  description:
    'Support open-source, privacy-first browser utilities. No cloud uploads, no ads, no paywalls.',
};

const coffeeUrl = ['https:', '//', 'buymeacoffee.com/opentools'].join('');
const sponsorUrl = ['https:', '//', 'github.com/sponsors/opentools'].join('');

const TIERS = [
  {
    name: 'Quick Coffee',
    amount: '$3',
    icon: Coffee,
    description: 'Helps cover browser test suite execution and domain hosting.',
    features: [
      'Covers automated testing matrix',
      'Keeps servers ad-free',
      'Good karma & our gratitude',
    ],
    href: coffeeUrl,
  },
  {
    name: 'Tool Supporter',
    amount: '$10',
    popular: true,
    icon: Sparkles,
    description:
      'Funds new offline algorithm implementations and codec support.',
    features: [
      'Funds offline WebAssembly codecs',
      'Expands document & media suites',
      'Listed in GitHub backers (opt-in)',
    ],
    href: sponsorUrl,
  },
  {
    name: 'Pro Patron',
    amount: '$25',
    icon: Zap,
    description:
      'Supports dedicated open-source engineering and security audits.',
    features: [
      'Prioritized tool requests',
      'Supports 8-stage zero-egress QC audits',
      'Direct communication channel',
    ],
    href: sponsorUrl,
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6">
          <a
            href="/"
            className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to all tools
          </a>
        </nav>

        {/* Header */}
        <section className="rounded-2xl border bg-card p-6 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl border bg-muted">
              <HeartHandshake
                aria-hidden="true"
                className="size-6 text-foreground"
              />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Independent & Open Source
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Keep useful tools free for everyone
              </h1>
            </div>
          </div>

          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
            These tools are 100% free with no ads, trackers, paywalls, or VC
            investors. Every tool runs directly inside your browser tab using
            native WebAssembly and local compute. Zero bytes of your files or
            documents ever touch a server.
          </p>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            If our sub-second utilities saved you 15 minutes today, consider
            supporting independent development with a small tip so we can keep
            adding more daily tools.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1">
              <ShieldCheck
                aria-hidden="true"
                className="size-3.5 text-success"
              />
              0 Server Egress
            </span>
            <span className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1">
              <Cpu aria-hidden="true" className="size-3.5" />
              100% Client-Side Compute
            </span>
            <span className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Free Forever Guarantee
            </span>
          </div>
        </section>

        {/* Support Tiers */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-[-0.03em]">
            Choose how you would like to support
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.name}
                  className="flex flex-col justify-between rounded-xl border bg-card p-5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="grid size-9 place-items-center rounded-lg border bg-muted">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      {tier.popular ? (
                        <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                          Popular
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{tier.name}</h3>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-tight">
                      {tier.amount}
                      <span className="text-xs font-normal text-muted-foreground">
                        {' '}
                        one-time
                      </span>
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {tier.description}
                    </p>

                    <ul className="mt-4 space-y-2 border-t pt-4 text-xs text-muted-foreground">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <Check
                            aria-hidden="true"
                            className="size-3.5 text-success"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <Button
                      nativeButton={false}
                      render={
                        <a
                          href={tier.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Support with ${tier.amount} for ${tier.name}`}
                        />
                      }
                      variant={tier.popular ? 'default' : 'outline'}
                      className="w-full text-xs font-semibold"
                    >
                      Support {tier.amount}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Alternative Methods: Crypto & Direct */}
        <section className="mt-8 rounded-xl border bg-card p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Coins aria-hidden="true" className="size-4" />
            Crypto & Direct Support Channels
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Zero-middleman peer-to-peer options for privacy-focused developers
            and operators.
          </p>

          <div className="mt-4 grid gap-3 font-mono text-xs sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="font-sans font-semibold text-foreground">
                Bitcoin (BTC)
              </p>
              <p className="mt-1 truncate text-muted-foreground select-all">
                bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="font-sans font-semibold text-foreground">
                Ethereum (ETH / USDT)
              </p>
              <p className="mt-1 truncate text-muted-foreground select-all">
                0x71C837096e2e54D5D0D605ab1966C7bFaA0A58f2
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="font-sans font-semibold text-foreground">
                Solana (SOL)
              </p>
              <p className="mt-1 truncate text-muted-foreground select-all">
                7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="font-sans font-semibold text-foreground">
                GitHub Sponsors
              </p>
              <p className="mt-1 text-muted-foreground">
                Monthly or one-time via github.com/sponsors
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Note */}
        <footer className="mt-8 rounded-xl border bg-muted/40 p-5 text-xs leading-6 text-muted-foreground">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 text-success" />
            Strict Privacy Boundary
          </p>
          <p className="mt-1">
            Supporting is 100% voluntary. All utilities remain completely free
            forever regardless of whether you tip. Your filenames, inputs, job
            details, and compute receipts are never attached to any support
            transaction.
          </p>
        </footer>
      </div>
    </main>
  );
}
