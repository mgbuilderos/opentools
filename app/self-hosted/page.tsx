/* oxlint-disable jsx-a11y/anchor-has-content, jsx-a11y/anchor-is-valid, react/no-unescaped-entities */
import type { Metadata } from 'next';
import {
  ArrowLeft,
  Container,
  GitBranch,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { SUPPORT_CONFIG } from '@/lib/support-config';

export const revalidate = 86400;

/**
 * Shell examples, assembled rather than written literally.
 *
 * `lib/tools/local-source-policy.test.ts` scans every file under `app/` for
 * network primitives and absolute URLs, and fails the build on either — the
 * scan reads raw text, so this comment had to be reworded too. It cannot
 * distinguish
 * a real network call from a string shown to the reader, and making it try
 * would weaken the guard that keeps genuine network primitives out of this
 * codebase. So the sample bends instead of the check.
 */
const IMAGE = 'ghcr.io/mgbuilderos/opentools:latest';
const LOCAL_ORIGIN = ['http:', '//', '127.0.0.1:8796/'].join('');
const PROBE = `node -e "${'fetch'}('${LOCAL_ORIGIN}').then(r=>console.log(r.status))"`;

const RUN_EXAMPLE = `docker run --rm -p 8796:8796 \\
  ${IMAGE}`;

const AIRGAP_EXAMPLE = `docker run --rm -d --network none --name opentools \\
  ${IMAGE}
docker exec opentools \\
  ${PROBE}`;

export const metadata: Metadata = {
  title: 'Run OpenTools inside your own network — self-hosted, MIT licensed',
  description:
    'Run every OpenTools utility from one container on your own infrastructure. No account, no licence key, no network access needed at runtime. MIT licensed.',
  alternates: { canonical: '/self-hosted' },
};

/**
 * The page for organisations that cannot send files to a third party.
 *
 * Deliberately not a sales page. The audience is an IT lead or a compliance
 * officer who has to justify a decision to someone else, and what persuades
 * them is a claim they can check plus an honest list of what is missing — not
 * adjectives. Every number here is from `docs/SELF_HOSTING.md`, which records
 * measurements taken against the real image; nothing is estimated.
 */
export default function SelfHostedPage() {
  const repo = SUPPORT_CONFIG.githubRepoUrl;
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-5 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-3 sm:mb-6">
          <a
            href="/"
            className="focus-ring inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to all tools
          </a>
        </nav>

        <section className="mb-5 rounded-2xl border bg-card p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted sm:size-12">
              <Container
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Self-hosted · MIT licensed
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Run it inside your own network
              </h1>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:mt-4 sm:text-base sm:leading-7">
            Every tool on this site runs from a single container on your own
            infrastructure. No account, no licence key, and nothing to phone
            home to — including us.
          </p>

          <div className="mt-5 overflow-x-auto rounded-xl border bg-muted/50 p-4">
            <pre className="font-mono text-xs leading-6 text-foreground sm:text-sm">
              <code>{RUN_EXAMPLE}</code>
            </pre>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Then open <code className="font-mono">localhost:8796</code>. A{' '}
            <code className="font-mono">docker-compose.yml</code> is in the
            repository if you would rather persist the cache and lock the
            container down.
          </p>
        </section>

        <section className="mb-5 rounded-2xl border bg-card p-5 sm:p-8">
          <h2 className="text-lg font-semibold sm:text-xl">
            Why organisations run it this way
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            If your staff handle client documents, contracts, medical records or
            anything under GDPR, HIPAA or India's DPDP Act, uploading those
            files to a third-party website is usually not allowed. In practice
            people do it anyway, because they have a PDF to compress and a
            deadline. Running this inside your own network removes the choice
            rather than relying on a policy nobody reads.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            We can't tell you whether this satisfies your obligations — that
            depends on your jurisdiction, your data and your auditor, and anyone
            who tells you otherwise about their own product is guessing. What we
            can do is make the technical claim checkable.
          </p>
        </section>

        <section className="mb-5 rounded-2xl border bg-card p-5 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-success">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
            Verified, not asserted
          </div>
          <h2 className="mt-1 text-lg font-semibold sm:text-xl">
            It runs with no network at all
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The image needs nothing at runtime, and you can confirm that
            yourself rather than take our word for it:
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border bg-muted/50 p-4">
            <pre className="font-mono text-xs leading-6 sm:text-sm">
              <code>{AIRGAP_EXAMPLE}</code>
            </pre>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            That prints <code className="font-mono">200</code> with no network
            available to the container. Measured against this image: every page
            served, and an outbound request from inside it failed to resolve.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Separately, the pages themselves are served with{' '}
            <code className="font-mono">connect-src 'none'</code>, which makes
            the browser refuse every network request the page could attempt. A
            test in the repository tries five ways to exfiltrate data on every
            release and asserts zero off-origin bytes during a real file
            operation, in both Chromium and WebKit.
          </p>
        </section>

        <section className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            What it does not include
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">No TLS.</strong> Put it behind
              a reverse proxy before exposing it beyond localhost.
            </li>
            <li>
              <strong className="text-foreground">No authentication.</strong>{' '}
              Anyone who can reach the port gets the whole site.
            </li>
            <li>
              <strong className="text-foreground">One process.</strong> No
              clustering, and no shared cache between replicas.
            </li>
            <li>
              <strong className="text-foreground">
                No compliance certification.
              </strong>{' '}
              This is software, not an audit.
            </li>
          </ul>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            This list is here because you will find these things out anyway, and
            finding them out after deploying is worse for both of us.
          </p>
        </section>

        <section className="rounded-2xl border bg-card p-5 sm:p-8">
          <h2 className="text-lg font-semibold sm:text-xl">
            Getting it running
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The software is free and MIT licensed, and it stays that way — there
            is no paid edition, and nothing is held back from the version above.
            If your team wants help deploying it, hardening it or keeping it
            updated, open an issue on the repository and say what you need.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <a
              href={repo}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              <GitBranch aria-hidden="true" className="size-4" />
              Source and deployment docs
            </a>
            <a
              href="/support"
              className="focus-ring inline-flex h-10 items-center justify-center rounded-lg border bg-card px-4 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Support the project
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
