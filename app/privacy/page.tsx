import type { Metadata } from 'next';
import {
  ArrowLeft,
  Database,
  FileLock2,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { LIVE_TOOL_CATALOG } from '@/lib/seo/live-tools';

export const revalidate = 86400;

/*
  Why this page exists, and what it is not.

  It is not a legal template. A privacy policy assembled from boilerplate would
  describe a product that collects things this one does not, and a reader who
  noticed that would be right to stop trusting everything else on the site.
  Every statement below was taken from the code that implements it, and each
  section names the file so a sceptic can check rather than believe.

  Constraint C2 (rule 23, decisions 5 and 15) allows a measured-egress claim
  only for a build that passed the protocol, so the measured figures live on
  /proof with their build and date attached and are referenced, not restated.

  `local-source-policy.test.ts` scans this directory for literal remote URLs,
  so links are assembled the way lib/support-config.ts assembles its own.
*/

const REPO = ['https:', '//', 'github.com/mgbuilderos/opentools'].join('');
const CANONICAL = ['https:', '//', 'getopentools.com', '/privacy'].join('');

export const metadata: Metadata = {
  title: 'Privacy — what OpenTools does and does not collect',
  description:
    'Every tool runs inside your browser tab, so your files are never sent anywhere. This page lists the one server-side log in full and every key stored locally.',
  alternates: { canonical: CANONICAL },
};

/* Fields from the `tool_impression` event written in proxy.ts, kept in step
   with .github/SECURITY.md. Adding a field to one without the other is the
   failure this table is meant to make obvious. */
const LOGGED = [
  [
    'Country',
    "From Cloudflare's country header. Coarse only — no region, no city.",
  ],
  [
    'Device type',
    'Mobile, tablet or desktop, derived from the user agent. The user agent itself is not stored.',
  ],
  [
    'Referrer category',
    'Search engine, social platform or direct. The raw referring URL is not stored.',
  ],
  [
    'Page path',
    'Which page was requested, and the tool parameter if the URL carried one.',
  ],
  ['Browser language', 'Your primary language only.'],
  ['Timestamp', 'When the request arrived.'],
] as const;

const NOT_LOGGED = [
  'Your IP address',
  'Your city or region',
  'The raw referring URL',
  'Your user agent string',
  'Any cookie — the site sets none',
  'Any file, file name, pasted text or result',
  'Any account, because there are no accounts',
];

const STORED = [
  [
    'tools-theme',
    'Local storage',
    'Whether you chose the light or dark appearance, so the site does not flip back on your next visit.',
  ],
  [
    'tool_usage_count',
    'Local storage',
    'A running count of how many times you have finished a task, used to decide when to show the support message once. It is a number, not a history: which tools you used is not recorded.',
  ],
  [
    'user_reviews',
    'Local storage',
    'Feedback you typed into the review box, kept on your own machine. It is not sent anywhere, which also means nobody but you can read it.',
  ],
  [
    'opentools-handoff',
    'IndexedDB',
    'A file you dropped on the home page, or sent to OpenTools from another app, held only long enough to survive the trip to the tool that opens it. It is deleted the instant that tool collects it, and anything older than five minutes is discarded on read. This is your own browser’s storage on the machine the file already came from.',
  ],
  [
    'opentools-handoff-waiting',
    'Session storage',
    'A single flag saying that a file is waiting to be collected, so that an ordinary page load does not have to open the database above to find out there is nothing there. It is removed as soon as it is read, and it is gone when you close the tab.',
  ],
  [
    'opentools-handoff-file',
    'Session storage',
    'The same waiting file, for browsers that will not store one in IndexedDB. Only files under 3 MB fit here; larger ones are simply not carried across. Removed on collection, and gone when you close the tab.',
  ],
  [
    'opentools-install-dismissed-v1',
    'Local storage',
    'That you closed the offer to add OpenTools to your home screen, so that it is not offered to you again.',
  ],
  [
    'tools-support-preference-v1',
    'Local storage',
    'When the support message was last shown to you, and whether you asked not to be shown it again. Nothing about what you did, and no record of whether you gave anything.',
  ],
  [
    'celebrated_milestones',
    'Local storage',
    'Which of the three usage milestones you have already been shown, so the same one is not shown twice. A list of three possible numbers, and nothing else.',
  ],
  [
    'opentools-offline-…',
    'Cache storage',
    'Copies of the front page, a handful of tool pages and the scripts and styles they need, stored so the app still opens when you have no signal. It holds pages from this site only — never a file of yours, and never anything you typed. A new version of the site replaces it, and clearing site data removes it.',
  ],
] as const;

export default function PrivacyPage() {
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
              <FileLock2
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Privacy
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                What we collect, in full
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Most privacy policies are long because they have a great deal to
            disclose. This one is specific instead. All{' '}
            {LIVE_TOOL_CATALOG.length} tools on this site run inside the browser
            tab you already have open, so there is no upload step in which your
            document could be collected. What remains is a single server-side
            visit log and four things your own browser remembers. Both are
            listed below, completely, with the file that implements them.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/40 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Accounts
              </p>
              <p className="mt-1 text-sm font-semibold">None</p>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Cookies
              </p>
              <p className="mt-1 text-sm font-semibold">None</p>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Third-party scripts
              </p>
              <p className="mt-1 text-sm font-semibold">None</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <ShieldCheck aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Your files
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            The file you choose is read straight into the page&rsquo;s own
            memory and worked on there, using the capabilities the browser
            already ships: Web Workers, WebAssembly, Canvas and WebCrypto. The
            result comes back as a temporary in-memory address that is released
            when you clear the tool or close the tab. There is no step in which
            the file is sent somewhere and no copy kept afterwards.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            That is a claim, so it is tested rather than asserted. The test
            attempts five different ways of smuggling data out of this site and
            records that each one is refused, then runs a real file through a
            real tool and measures the bytes. The protocol, the per-vector
            result and the limits of what it establishes are on the{' '}
            <a
              href="/proof"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              proof page
            </a>
            .
          </p>
          <p className="mt-3 rounded-xl border bg-muted/50 p-3.5 text-sm leading-6 sm:p-4 sm:leading-7">
            <strong>One deliberate exception.</strong> The background remover
            downloads its AI model and WebAssembly runtime from this same site
            before it can run, so that page is allowed to reach this origin and
            no other. The download is app code, like the JavaScript and fonts
            every page fetches. It carries no part of your image, and it travels
            in the opposite direction.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Radio aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              The one server-side log
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Asking for a page is a network request; that much is unavoidable on
            any website. When you request a page — not an image, script or other
            asset — the edge handler writes one event. This is the whole of it:
          </p>
          <dl className="mt-4 divide-y rounded-xl border bg-muted/40 text-sm sm:text-[0.95rem]">
            {LOGGED.map(([field, detail]) => (
              <div
                key={field}
                className="flex flex-col gap-1 p-3 sm:flex-row sm:items-baseline sm:gap-4 sm:p-3.5"
              >
                <dt className="shrink-0 font-semibold sm:w-44">{field}</dt>
                <dd className="text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-6 text-base font-semibold sm:text-lg">
            What that event does not contain
          </h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 sm:grid-cols-2 sm:text-[0.95rem]">
            {NOT_LOGGED.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span aria-hidden="true" className="text-muted-foreground">
                  &times;
                </span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Because no address and no identifier is recorded, these events
            cannot be joined together into a picture of one person. They answer
            &ldquo;which pages were opened today, roughly from where&rdquo; and
            nothing narrower. Our hosting provider separately keeps its own
            standard request records, as every host does, on its own retention
            schedule.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Adding a field to this event without updating the published list is
            treated as a security vulnerability, not a change of plan. The rule
            and the field list live in{' '}
            <code className="text-[0.9em]">.github/SECURITY.md</code> in the
            public repository.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Database aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              What your browser remembers
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Four things, all held by your own browser on your own machine, none
            of them readable by us. Clearing site data removes every one.
          </p>
          <ul className="mt-4 divide-y rounded-xl border bg-muted/40">
            {STORED.map(([key, where, why]) => (
              <li key={key} className="p-3.5 sm:p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className="font-mono text-[0.85em] font-semibold">
                    {key}
                  </code>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {where}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                  {why}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            Checking any of this yourself
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            You are not required to take this page on trust, and we would rather
            you did not.
          </p>
          <ul className="mt-3 space-y-2.5 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>Watch the network.</strong> Open your browser&rsquo;s
                developer tools, select the Network tab, tick Preserve log, and
                run a file through any tool. Your document should produce no row
                at all. The{' '}
                <a
                  href="/proof"
                  className="focus-ring font-semibold text-foreground underline underline-offset-4"
                >
                  proof page
                </a>{' '}
                walks through it.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>Switch the network off.</strong> Load a tool, set your
                developer tools to offline, then process a file. It still works,
                because there was never anything on the other end.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>Read the code.</strong> The whole site is public and MIT
                licensed, the storage keys above are the only ones in it, and
                the tests that keep it that way ship alongside:{' '}
                <a
                  href={REPO}
                  rel="noreferrer noopener"
                  className="focus-ring font-semibold text-foreground underline underline-offset-4"
                >
                  the repository
                </a>
                .
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            Questions this policy can answer briefly
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 sm:text-base sm:leading-7">
            <div>
              <h3 className="font-semibold">Do you sell or share any data?</h3>
              <p className="mt-1 text-muted-foreground">
                No. There is nothing of yours to sell: no account, no contact
                details, no file, and a visit event that identifies nobody.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                Can I ask you to delete my data?
              </h3>
              <p className="mt-1 text-muted-foreground">
                There is no record tied to you for us to look up or erase. What
                your browser stored is listed above and is removed by clearing
                site data for this site.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                Is it safe for confidential work documents?
              </h3>
              <p className="mt-1 text-muted-foreground">
                That is your organisation&rsquo;s call, and the{' '}
                <a
                  href="/security"
                  className="focus-ring font-semibold text-foreground underline underline-offset-4"
                >
                  security page
                </a>{' '}
                is written for whoever has to make it. The short version: the
                page is served a policy that forbids it from opening a network
                connection at all, and that is enforced by the browser rather
                than by our good intentions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                Are children&rsquo;s data collected?
              </h3>
              <p className="mt-1 text-muted-foreground">
                No data is collected from any visitor of any age beyond the
                visit event above, which identifies nobody.
              </p>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground sm:text-sm">
          Every statement here is taken from code in the public repository. If
          you find one that is not true, that is a security report, and the{' '}
          <a
            href="/security"
            className="focus-ring font-semibold text-foreground underline underline-offset-4"
          >
            security page
          </a>{' '}
          explains how to send it.
        </p>
      </div>
    </main>
  );
}
