import type { Metadata } from 'next';
import {
  AlertTriangle,
  ArrowLeft,
  BugPlay,
  ClipboardCheck,
  Lock,
} from 'lucide-react';

export const revalidate = 86400;

/*
  Written for the person who has to approve or refuse this site for other
  people's use: an IT administrator, a security reviewer, a compliance officer.

  That reader is not persuaded by adjectives. They want the threat model, the
  enforced control, who enforces it, what is out of scope, and a route to
  report a failure. So this page states the control and then immediately states
  its boundary — the section a marketing page would omit is the section that
  makes the rest usable as evidence.

  Figures from the egress protocol are not restated here. They belong to a
  dated run against a named build (constraint C2), and /proof carries them with
  that attribution attached.
*/

const REPO = ['https:', '//', 'github.com/mgbuilderos/opentools'].join('');
const ADVISORY = [
  'https:',
  '//',
  'github.com/mgbuilderos/opentools/security/advisories/new',
].join('');
const CANONICAL = ['https:', '//', 'getopentools.com', '/security'].join('');

export const metadata: Metadata = {
  title: 'Security — threat model, enforced controls and reporting',
  description:
    'How OpenTools keeps files on the device: the content-security policy the browser enforces, the vulnerability classes we treat as critical, what is out of scope, and how to report a finding.',
  alternates: { canonical: CANONICAL },
};

/* The vulnerability classes from .github/SECURITY.md. Publishing them matters
   more than it looks: it tells a reviewer what we consider a breach, which is
   the only way they can judge whether our bar matches theirs. */
const TREATED_AS_VULNERABILITIES = [
  'Any network request carrying user file bytes, file names, pasted text, outputs, or anything derived from them.',
  'Any client-side analytics, telemetry, session replay, advertising, fingerprinting or third-party tracking script.',
  'Any server-side logging beyond the published visit log, or a visit log recording more than is published.',
  'Any silent fallback from local processing to a remote service.',
  'A support or payment flow that receives file, job or result data, or that withholds a local result.',
  'A content-security-policy regression on a tool route — loosening connect-src, for example.',
  'Classic web vulnerabilities: cross-site scripting, injection, unsafe cross-document messaging, supply-chain compromise or malicious dependencies.',
];

const CONTROLS = [
  [
    'Enforced by the browser, not by us',
    "Tool routes are served a content-security policy of connect-src 'none', which switches off every way a page can open a network connection at once. It is applied by the browser engine, so it holds even against a bug in our own code.",
  ],
  [
    'Enforced at build time',
    'The test suite scans the engine, worker, component and route source for direct network primitives and literal remote addresses, and fails the build when one appears. A tool cannot quietly acquire an upload path between releases.',
  ],
  [
    'Enforced per release',
    'An executable protocol attempts five exfiltration vectors, then runs a real file through a real tool and measures the bytes that left. It runs in two browser engines against the production build.',
  ],
  [
    'Open to inspection',
    'The source, the policy and the protocol are public and MIT licensed. Nothing above requires taking our word: each control can be read, run and re-run by you.',
  ],
] as const;

const OUT_OF_SCOPE = [
  'The security of your own device, browser, extensions or operating system.',
  'Standard request records kept by the hosting provider, which every website has.',
  'The correctness of a tool’s output. A wrong result is a bug, and welcome, but it is not a security report.',
  'Missing hardening headers with no demonstrated impact, and findings produced only by an automated scanner without a working reproduction.',
];

export default function SecurityPage() {
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

        <section className="rounded-2xl border bg-card p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-muted sm:size-12">
              <Lock
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Security
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                The threat model, stated plainly
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            This page is written for whoever has to decide whether other people
            may use this site for documents that must not be uploaded. The
            product rests on one rule:{' '}
            <strong>
              files, file names, text inputs and results never leave the
              browser.
            </strong>{' '}
            Below is how that rule is enforced, who enforces it, where it stops,
            and how to tell us when it fails.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Four layers, in order of how little they trust us
            </h2>
          </div>
          <ul className="mt-4 divide-y rounded-xl border bg-muted/40">
            {CONTROLS.map(([layer, detail]) => (
              <li key={layer} className="p-3.5 sm:p-4">
                <p className="text-sm font-semibold sm:text-[0.95rem]">
                  {layer}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                  {detail}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            The measured result of the third layer — which vector was attempted,
            what the browser did, and how many bytes left during a real file
            operation — is published with the build and date it belongs to on
            the{' '}
            <a
              href="/proof"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              proof page
            </a>
            . If you are weighing this against a hosted service,{' '}
            <a
              href="/compare/browser-based-vs-cloud-file-tools"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              the two architectures compared
            </a>{' '}
            sets out what each one can and cannot guarantee, and{' '}
            <a
              href="/compare/open-source-pdf-tools"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              the licence and self-hosting page
            </a>{' '}
            covers running it inside your own network.
          </p>
          <p className="mt-3 rounded-xl border bg-muted/50 p-3.5 text-sm leading-6 sm:p-4 sm:leading-7">
            <strong>One route differs, deliberately.</strong> The background
            remover must download its model and WebAssembly runtime before it
            can run, so it is served a policy permitting this origin and no
            other. Those downloads are application assets, like scripts and
            fonts. They contain no user data and travel towards the browser, not
            away from it. Any asset download that carries user content is a
            vulnerability under the list below.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <AlertTriangle aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              What counts as a vulnerability here
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            These are not feature requests to be weighed against a roadmap. Each
            one is a defect to be fixed before other work:
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            {TREATED_AS_VULNERABILITIES.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span aria-hidden="true" className="text-muted-foreground">
                  &bull;
                </span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            A confirmed egress or undisclosed-telemetry finding is handled as
            critical: the affected tool is disabled or patched ahead of
            everything else, a regression test joins the suite so it cannot
            return unnoticed, and the fix is published as a security advisory
            crediting the reporter unless they prefer otherwise.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            What this page does not claim
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            A security page that claims to have thought of everything is telling
            you it has not been read carefully. The controls above establish
            where bytes go. They cannot establish that no flaw exists, and no
            amount of egress evidence ever could — which is why phrases like
            &ldquo;zero data leaks&rdquo; were removed from this product rather
            than defended. Out of scope:
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            {OUT_OF_SCOPE.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span aria-hidden="true" className="text-muted-foreground">
                  &times;
                </span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <BugPlay aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Reporting something
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            <strong>
              Please do not open a public issue for a security report.
            </strong>{' '}
            Use GitHub&rsquo;s{' '}
            <a
              href={ADVISORY}
              rel="noreferrer noopener"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              private vulnerability reporting
            </a>{' '}
            on the repository&rsquo;s Security tab.
          </p>
          <h3 className="mt-5 text-base font-semibold sm:text-lg">
            What to include
          </h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span className="text-muted-foreground">
                The affected route or tool, and your browser and version.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span className="text-muted-foreground">Steps to reproduce.</span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span className="text-muted-foreground">
                For an egress report: the request address and method, plus a
                redacted network export or screenshot showing the payload.{' '}
                <strong>
                  Never attach a real personal document — use a synthetic test
                  file.
                </strong>
              </span>
            </li>
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/40 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Acknowledgement
              </p>
              <p className="mt-1 text-sm font-semibold">Within 72 hours</p>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Triage decision
              </p>
              <p className="mt-1 text-sm font-semibold">Within 7 days</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Security fixes go to the latest commit on the main branch and to the
            live site. There are no supported older versions, because there is
            nothing to install and every visitor is already on the current one.
            The full policy is{' '}
            <code className="text-[0.9em]">.github/SECURITY.md</code> in{' '}
            <a
              href={REPO}
              rel="noreferrer noopener"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              the repository
            </a>
            .
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            If you are assessing this for an organisation
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Three things usually settle it, and you can confirm all three
            without contacting anyone:
          </p>
          <ol className="mt-3 space-y-2.5 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-muted text-xs font-semibold">
                1
              </span>
              <span className="text-muted-foreground">
                Read the response headers on any tool page and confirm the
                connection policy for yourself.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-muted text-xs font-semibold">
                2
              </span>
              <span className="text-muted-foreground">
                Put a synthetic file through a tool with the network tab open,
                or with the network switched off entirely.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-muted text-xs font-semibold">
                3
              </span>
              <span className="text-muted-foreground">
                Clone the repository and run the egress protocol yourself
                against whichever build you intend to allow.
              </span>
            </li>
          </ol>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Allow-listing this domain grants no outbound path for file contents.
            What the site records about a visit, in full, is on the{' '}
            <a
              href="/privacy"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              privacy page
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
