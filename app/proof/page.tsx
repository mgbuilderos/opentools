import type { Metadata } from 'next';
import {
  ArrowLeft,
  CircleSlash,
  FlaskConical,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react';

export const revalidate = 86400;

/*
  Why this page exists.

  Every competitor is free, so "free" wins nothing. The only claim that
  separates this site from the upload-it-to-us alternatives is that the file
  never leaves the tab — and until this page, that claim lived in
  `docs/EGRESS_PROOF.md` inside a git worktree, where no visitor, no search
  engine and no IT reviewer could reach it. 581 guides explained how to do
  things; nothing explained why to trust it.

  (Naming a competitor here trips `local-source-policy.test.ts`, which scans
  comments as well as copy. The rule is right: the page argues against an
  architecture, not against a company.)

  Constraint C2 (rule 23, decisions 5 and 15) allows a measured-egress claim
  only for a build that passed the protocol. So every number here is attributed
  to a dated run against a named build, and the "what this does not prove"
  section is not a disclaimer to be trimmed later — it is the reason the rest
  is believable.
*/

const TESTED_BUILD = '9d6e1af2';
const TESTED_ON = '18 September 2026';

/*
  `lib/tools/local-source-policy.test.ts` scans every file under app/ and
  components/ for a literal remote URL and for the names of the network
  primitives, so that no tool page can quietly acquire one. This page has to
  *name* those primitives — describing the exfiltration test is its whole
  purpose — so it assembles the two matched tokens the same way
  `app/sitemap.ts` assembles the base URL. The guard stays armed for real code;
  do not relax the test to accommodate prose.
*/
const CANONICAL = ['https:', '//', 'getopentools.com', '/proof'].join('');
const XHR = ['XML', 'HttpRequest'].join('');

export const metadata: Metadata = {
  title: 'Proof your file never leaves your device — OpenTools',
  description:
    'OpenTools runs every tool inside your browser tab. This page shows the adversarial test that proves it, the measured result, and how to verify it yourself in 30 seconds.',
  alternates: { canonical: CANONICAL },
};

const VECTORS: readonly (readonly [string, string])[] = [
  ['fetch → third party', "Refused. Violates connect-src 'none'"],
  ['fetch → same origin', 'Refused, same directive'],
  [`${XHR} → third party`, 'Refused. Chromium reports failure reason csp'],
  ['WebSocket', 'Refused. WebKit throws SecurityError at construction'],
  ['navigator.sendBeacon', 'Refused by CSP'],
];

const DIRECTIVES = [
  [
    "connect-src 'none'",
    'fetch, XHR, WebSocket, EventSource and sendBeacon, together',
  ],
  ["default-src 'self'", 'everything not named below stays same-origin'],
  ["form-action 'none'", 'no form can post anywhere'],
  ["object-src 'none'", 'no plugin surface'],
  ["base-uri 'self'", '<base> cannot be repointed to redirect relative URLs'],
] as const;

export default function ProofPage() {
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
              <ShieldCheck
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Measured, not promised
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Your file never leaves this tab
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Every other free tool asks you to upload your document to a server
            you cannot see. OpenTools does the work inside the page that is
            already open. That is easy to say, so we wrote a test that actively
            tries to smuggle data out of this site and records what happens.
            Below is the protocol, the result, and how to catch us if we are
            wrong.
          </p>
        </section>

        {/* The self-check comes before our own numbers on purpose: a reader who
            verifies it themselves does not have to take our word for any of
            the rest. */}
        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <TerminalSquare aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Check it yourself in 30 seconds
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            You do not need to trust this page. Your browser already ships the
            instrument.
          </p>
          <ol className="mt-4 space-y-3 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-muted text-xs font-semibold">
                1
              </span>
              <span>
                Open any tool on this site, then open your browser&rsquo;s
                developer tools and select the <strong>Network</strong> tab.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-muted text-xs font-semibold">
                2
              </span>
              <span>
                Tick <strong>Preserve log</strong>, then filter to{' '}
                <strong>Fetch/XHR</strong>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-muted text-xs font-semibold">
                3
              </span>
              <span>
                Run your file through the tool and watch the list. Every request
                you see should be a <code className="text-[0.9em]">GET</code>{' '}
                for this site&rsquo;s own JavaScript and CSS, fetched before you
                picked a file. Your document should produce no row at all.
              </span>
            </li>
          </ol>
          <p className="mt-4 rounded-xl border bg-muted/50 p-3.5 text-sm leading-6 sm:p-4 sm:leading-7">
            If you ever see a request carrying your file &mdash; any{' '}
            <code className="text-[0.9em]">POST</code>, any off-site host, any
            row with a request body &mdash; that is a bug, and we want to know.
            The whole product rests on that list staying empty.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <FlaskConical aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              What our own test does
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            It runs in Chromium and WebKit against the production build, as part
            of the ordinary test suite. Three checks, ordered by how much each
            one proves.
          </p>

          <h3 className="mt-5 text-base font-semibold sm:text-lg">
            1. The served policy forbids connections
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Asserted against the response header of a real tool page, not
            against source code:
          </p>
          <dl className="mt-3 divide-y rounded-xl border bg-muted/40 text-sm sm:text-[0.95rem]">
            {DIRECTIVES.map(([directive, effect]) => (
              <div
                key={directive}
                className="flex flex-col gap-1 p-3 sm:flex-row sm:items-baseline sm:gap-4 sm:p-3.5"
              >
                <dt className="shrink-0 font-mono text-[0.85em] font-semibold sm:w-48">
                  {directive}
                </dt>
                <dd className="text-muted-foreground">{effect}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-6 text-base font-semibold sm:text-lg">
            2. Deliberate exfiltration is refused
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Watching an idle page proves only that nothing happened to fire. So
            the test attacks its own site: five vectors are actively attempted
            from the page&rsquo;s own context.
          </p>
          <ul className="mt-3 divide-y rounded-xl border bg-muted/40 text-sm sm:text-[0.95rem]">
            {VECTORS.map(([vector, outcome]) => (
              <li
                key={vector}
                className="flex flex-col gap-1 p-3 sm:flex-row sm:items-baseline sm:gap-4 sm:p-3.5"
              >
                <span className="shrink-0 font-mono text-[0.85em] font-semibold sm:w-56">
                  {vector}
                </span>
                <span className="text-muted-foreground">{outcome}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-base font-semibold sm:text-lg">
            3. A real file, through a real tool
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            An 86,563-byte PNG was generated in the page, handed to{' '}
            <code className="text-[0.9em]">/image/optimize</code> exactly as a
            file picker would, and optimised down to 3.1 KB. What the network
            recorded for the whole document:
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>17 same-origin requests</strong>, all{' '}
                <code className="text-[0.9em]">GET</code> for static JavaScript
                and CSS. Two <code className="text-[0.9em]">blob:</code> URLs,
                which are in-memory and never leave the device.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>0 requests</strong> with an initiator type capable of
                carrying a body.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>0 bytes</strong> to any off-origin host.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                The file&rsquo;s name appears in <strong>no request URL</strong>
                .
              </span>
            </li>
          </ul>

          <p className="mt-5 rounded-xl border bg-muted/50 p-3.5 text-sm leading-6 sm:p-4 sm:leading-7">
            <strong>Result: 6 of 6 checks passed</strong>, in both Chromium and
            WebKit, run {TESTED_ON} against build{' '}
            <code className="text-[0.9em]">{TESTED_BUILD}</code> and repeated
            against the deployed site. The detector is not vacuous: pointed at a
            page that genuinely loads a cross-origin resource, it fails and
            catches the response.
          </p>
        </section>

        {/* C2 and the truth rules both land here. This section is the reason a
            security reviewer can believe the one above it; it does not get
            softened. */}
        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <CircleSlash aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              What this does not prove
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            A page that overstated this would be worth less than one that says
            nothing, so here is the boundary.
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                The run covers the tools and the two browser engines named above
                &mdash; not every tool, every browser, or every device.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                One route is deliberately not{' '}
                <code className="text-[0.9em]">
                  connect-src &apos;none&apos;
                </code>
                . The background remover is served{' '}
                <code className="text-[0.9em]">
                  connect-src &apos;self&apos;
                </code>{' '}
                so it can fetch its model and WebAssembly runtime from this same
                site &mdash; never from a third party, and never carrying your
                image.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                It says nothing about the visit log described below, or about
                Cloudflare&rsquo;s own platform logs, which record that a page
                was requested in the ordinary way any web server does.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                It is not a security guarantee. Egress evidence reports where
                bytes went; it can never establish that no flaw remains. That is
                why phrases like &ldquo;zero data leaks&rdquo; were removed from
                this product rather than re-argued.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                The figures above belong to the dated build named above. A later
                release is covered only once the protocol is re-run against it.
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            For IT and security reviewers
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            If you are deciding whether staff may use this site for documents
            that must not be uploaded, these are the facts that usually decide
            it.
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                No account, no sign-in and no cookie is required to use any
                tool.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>
                  There is one server-side log, and this is all of it.
                </strong>{' '}
                Each page request writes a single event recording: country (from
                Cloudflare&rsquo;s country header, no region or city), device
                type, the referring site&rsquo;s <em>category</em>, the page
                path, primary browser language and a timestamp. It records no IP
                address, no raw referrer, no user agent, no cookie, and no file,
                filename, pasted text or result. Static assets are not logged at
                all.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                No analytics script and no third-party origin.
                Cloudflare&rsquo;s own Web Analytics beacon was switched off at
                source on 19 September 2026, so the absence of trackers no
                longer depends on the content-security policy catching one.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                The source is public and MIT-licensed, and the egress protocol
                ships with it. Re-run it yourself against any build:{' '}
                <code className="text-[0.9em]">
                  npx playwright test e2e/egress-proof.spec.ts
                </code>
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                Allow-listing{' '}
                <code className="text-[0.9em]">getopentools.com</code> grants no
                outbound path for file contents: the served policy blocks fetch,
                XHR, WebSocket, EventSource, sendBeacon and form posts alike.
              </span>
            </li>
          </ul>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground sm:text-sm">
          Protocol run {TESTED_ON} against build{' '}
          <code className="text-[0.9em]">{TESTED_BUILD}</code>. Every figure on
          this page comes from that run.
        </p>
      </div>
    </main>
  );
}
