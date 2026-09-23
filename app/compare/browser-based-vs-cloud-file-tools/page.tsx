import type { Metadata } from 'next';
import {
  ArrowLeft,
  CircleSlash,
  Cpu,
  FlaskConical,
  Scale,
  Server,
} from 'lucide-react';
import egressReceipt from '@/lib/seo/egress-receipt.json';

export const revalidate = 86400;

/*
  The second of the three hand-written comparison pages (Pillar 5,
  `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md`). This one is the essay: it is
  written to be cited by someone else rather than to convert a visitor, which
  is why its centrepiece is a METHOD the reader can run against any site,
  including this one, rather than a claim about us.

  A page that says "trust us, we are different" is worth nothing to a linker.
  A page that hands you the thirty-second check is worth a link even from
  somebody who then decides to keep uploading — and that is the whole point.

  No competitor is named, no third-party price, cap or behaviour is asserted,
  and every claim about this site is one of the three that a test already
  substantiates. See the header comment on
  `app/compare/pdf-tools-that-dont-upload/page.tsx` for why that boundary is
  drawn where it is.
*/

const TESTED_ON = new Date(egressReceipt.verifiedAt).toLocaleDateString(
  'en-GB',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
);

const CANONICAL = [
  'https:',
  '//',
  'getopentools.com',
  '/compare/browser-based-vs-cloud-file-tools',
].join('');

export const metadata: Metadata = {
  title: 'Browser-Based vs Cloud File Tools Compared',
  description:
    'Two architectures for the same job. What each can guarantee, what neither can, and a 30-second method for checking which one any file tool you use actually is.',
  alternates: { canonical: CANONICAL },
};

/*
  The comparison is between two ways of building software, stated as
  definitions. Each row is true by construction: it follows from where the
  computation happens, so it needs no source beyond itself.
*/
const ARCHITECTURES: readonly (readonly [
  question: string,
  server: string,
  browser: string,
])[] = [
  [
    'Where does the work happen?',
    'On hardware the operator owns and you cannot see.',
    'In the tab you already have open, on your own processor.',
  ],
  [
    'Does your file have to travel?',
    'Yes. A program cannot operate on bytes it has not received.',
    'No. The program travels instead, as part of the page.',
  ],
  [
    'What decides the maximum file size?',
    'What the operator chooses to allow, because every megabyte costs them.',
    'Your device’s memory. It costs the site nothing either way.',
  ],
  [
    'What does a daily job limit protect?',
    'The operator’s compute bill, which scales with jobs run.',
    'Nothing, because their bill does not move when you run a hundred jobs.',
  ],
  [
    'Can the result differ between two people?',
    'No. Everyone gets the same CPU, the same libraries, the same fonts.',
    'Yes. Your browser, your device and your fonts are part of the pipeline.',
  ],
  [
    'What happens when the site goes down?',
    'Nothing works.',
    'Pages your browser already cached can still work; the rest do not.',
  ],
  [
    'How big can the processing model be?',
    'Any size. It lives on their machine.',
    'Only as big as is reasonable to download into a tab.',
  ],
  [
    'What can you verify for yourself?',
    'That the site says what it does. What happens after upload is unobservable from outside.',
    'What the page did, in your own browser’s network panel, while you watched.',
  ],
];

/*
  Where the browser model genuinely loses. This is the section that makes the
  rest usable as evidence rather than as copy, so it does not get softened, and
  each item is a limit of ours rather than a hedge.
*/
const WHERE_THE_BROWSER_MODEL_LOSES: readonly (readonly [string, string])[] = [
  [
    'Big files on small machines',
    'A document that needs more memory than the tab has will fail here and succeed on a server. On a phone, the ceiling arrives much earlier.',
  ],
  [
    'Heavy models',
    'Optical character recognition, layout reconstruction and language coverage all scale with model size, and a model has to be downloaded before it can run in a tab. That is why our OCR is English only.',
  ],
  [
    'Reproducibility',
    'A support answer that begins “it works on my machine” is a structural property of this design, not a bad day. Two browsers can disagree, and an old or unusual one can fail entirely.',
  ],
  [
    'Anything that needs to remember you',
    'Shared folders, saved templates, retention policies, audit trails, team permissions. None of these exist without a server holding state between visits.',
  ],
  [
    'A first load that is not free',
    'The code has to arrive before it can run. A server-side tool ships you a thin page and does the heavy part elsewhere.',
  ],
  [
    'Accountability',
    'A paid service has a company, a support desk and a contract. An open-source project has an issue tracker and whoever is awake.',
  ],
];

export default function BrowserVsCloudPage() {
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
              <Server
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Comparison
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Browser-based vs cloud file tools
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Two websites can offer the identical button —{' '}
            <em>compress this PDF</em> — and be built on opposite architectures.
            One sends your file to a computer. The other sends a computer
            program to your file. Almost everything people argue about when they
            compare free file tools (the size cap, the daily limit, the queue,
            the privacy policy, the subscription) turns out to be a downstream
            consequence of that single choice.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            This page sets out both models honestly, says where each one wins,
            and then gives you the check — it takes about thirty seconds — that
            tells you which one any tool you are looking at actually uses.
            Including this one.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Cpu aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              The two models, side by side
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Nothing in this table is a claim about a particular company. Each
            row follows from where the computation happens, which is why you can
            check it by reasoning rather than by trusting anyone.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  {/* Visually blank, but a screen reader announces every
                      column, so this one says what it holds. */}
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    <span className="sr-only">Question</span>
                  </th>
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Server-side (&ldquo;cloud&rdquo;)
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    In the browser
                  </th>
                </tr>
              </thead>
              <tbody>
                {ARCHITECTURES.map(([question, server, browser]) => (
                  <tr
                    key={question}
                    className="border-b align-top last:border-0"
                  >
                    <th
                      scope="row"
                      className="py-2.5 pr-3 text-left font-medium"
                    >
                      {question}
                    </th>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {server}
                    </td>
                    <td className="py-2.5 text-muted-foreground">{browser}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <FlaskConical aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              How to tell which one you are using
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            You do not have to take anybody&rsquo;s word for this, ours least of
            all. Your browser will tell you, and the method works on any site:
          </p>
          <ol className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span className="shrink-0 font-semibold text-muted-foreground">
                1.
              </span>
              <span>
                Open the developer tools and select the <strong>Network</strong>{' '}
                panel. In most browsers that is F12, or right-click anywhere on
                the page and choose Inspect.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 font-semibold text-muted-foreground">
                2.
              </span>
              <span>Clear the list, then run the tool on a real file.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="shrink-0 font-semibold text-muted-foreground">
                3.
              </span>
              <span>
                Read what appeared. A server-side tool has to show you a request
                carrying the file — typically a{' '}
                <code className="text-[0.9em]">POST</code>, with a request body
                roughly the size of your document, often to a different host
                than the page. A browser-based tool cannot show you one, because
                there is nothing to send.
              </span>
            </li>
          </ol>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Two things worth knowing so the check stays honest. Entries
            beginning <code className="text-[0.9em]">blob:</code> or{' '}
            <code className="text-[0.9em]">data:</code> are in-memory and never
            leave your device — they are how a browser hands a generated file to
            the download bar. And a site loading its code, fonts or a model is
            not sending your file anywhere; look at the direction and the body,
            not the count.
          </p>
          <p className="mt-4 rounded-xl border bg-muted/50 p-3.5 text-sm leading-6 sm:p-4 sm:leading-7">
            Run it here and the list stays empty of anything carrying a body,
            because the browser will not permit one: tool pages on this site are
            served{' '}
            <code className="text-[0.9em]">connect-src &apos;none&apos;</code>,
            which switches off fetch, XHR, WebSocket, EventSource and sendBeacon
            at once. We check the same thing adversarially on every release —
            five deliberate exfiltration attempts, then a real file through a
            real tool, in two browser engines. Six of six checks passed on{' '}
            {TESTED_ON}, with{' '}
            <strong>0 bytes recorded to any off-origin host</strong>.{' '}
            <a
              href="/proof"
              className="focus-ring font-medium underline underline-offset-4"
            >
              The protocol and the result
            </a>
            .
          </p>
          {/*
            Do not flatten this into the paragraph above. Two routes are served
            a different policy on purpose, and a check that finds them and was
            told to expect otherwise concludes the rest of the page is lying.
            The honest version is the one that survives being run.
          */}
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            <strong>
              Two routes are not that, on purpose, and you will see it.
            </strong>{' '}
            The image editor and the background remover are served{' '}
            <code className="text-[0.9em]">connect-src &apos;self&apos;</code>{' '}
            instead, because the background remover has to download its model
            and WebAssembly runtime before it can run anything. In the Network
            panel those appear as requests <em>towards</em> your browser from
            this same origin — application assets, like the scripts and the
            stylesheet. If you ever see one going the other way with your image
            in it, that is a vulnerability and we want the report.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Scale aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Why the limits exist, on both sides
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            The interesting thing about a file-size cap or a daily job allowance
            is not that it is mean. It is that it is <em>load-bearing</em>. A
            service whose costs rise with every megabyte received and every CPU
            second burned has to meter megabytes and CPU seconds, or it does not
            survive. The paywall is the cost structure showing through, and it
            would exist under any management.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            When the work happens on your machine, that particular meter is not
            connected to anything. A 2 GB file costs the site exactly what a 2
            KB file costs it. The fiftieth job in an afternoon costs what the
            first did.{' '}
            <strong>
              This is not a promise to be generous; it is an absence of the
              thing that makes a cap necessary.
            </strong>
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            The trade is real, though, and it runs the other way too: a cost
            that does not scale also cannot buy anything. There is no budget
            here for a larger model, a faster machine or a support rota, because
            there is no per-use revenue to pay for one.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <CircleSlash aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Where the browser model loses
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            We build this way and we still think a server is the right answer
            for a good number of jobs. Here is the list, and it is not a hedge —
            every item is a limitation of the site you are reading.
          </p>
          <dl className="mt-4 divide-y rounded-xl border bg-muted/40">
            {WHERE_THE_BROWSER_MODEL_LOSES.map(([heading, body]) => (
              <div key={heading} className="p-3.5 sm:p-4">
                <dt className="text-sm font-semibold sm:text-base">
                  {heading}
                </dt>
                <dd className="mt-1 text-sm leading-6 text-muted-foreground sm:leading-7">
                  {body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            What neither model can promise you
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>That it is bug-free.</strong> Evidence about where bytes
                went is not a security guarantee, and cannot establish that no
                flaw remains — which is why phrases like &ldquo;zero data
                leaks&rdquo; were removed from this product rather than
                re-argued.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>That your device is safe.</strong> Running the work
                locally moves the risk to your machine, your browser and your
                extensions. It does not remove it.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>That nobody knows you visited.</strong> Any website,
                built either way, is requested from a server that records the
                request. The difference is about your file, not about your
                visit.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>That today&rsquo;s answer holds tomorrow.</strong> An
                architecture can change in a release. That is why the check
                above is worth more than this page: you can re-run it whenever
                you like.
              </span>
            </li>
          </ul>
        </section>

        {/*
          Pillar 5 asks for a working tool on every comparison page, and this
          is where it belongs: directly after the method, on a page whose whole
          argument is "do not take our word for it". The reader has just been
          told how to check. These are files to check it on.
        */}
        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            Try the check on a real job
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Open the Network panel first, then run one of these on a document
            you actually need done. Free, and no account.
          </p>
          <ul className="mt-3 grid gap-2 text-sm leading-6 sm:grid-cols-2 sm:text-base sm:leading-7">
            {(
              [
                ['/pdf/merge', 'Merge PDF'],
                ['/pdf/compress', 'Compress PDF'],
                ['/pdf/extract-pages', 'Extract PDF pages'],
                ['/pdf/to-word', 'PDF to Word'],
                ['/image/optimize', 'Compress an image'],
                ['/image/exact-size', 'Fit an image under a KB limit'],
              ] as const
            ).map(([href, name]) => (
              <li key={href}>
                <a
                  href={href}
                  className="focus-ring font-medium underline underline-offset-4"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            Keep reading
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li>
              <a
                href="/compare/pdf-tools-that-dont-upload"
                className="focus-ring font-medium underline underline-offset-4"
              >
                PDF tools that do not upload your file
              </a>{' '}
              — the thirteen live tools, each with the limit it will not go
              past.
            </li>
            <li>
              <a
                href="/compare/open-source-pdf-tools"
                className="focus-ring font-medium underline underline-offset-4"
              >
                Open-source PDF tools you can read and run yourself
              </a>{' '}
              — the licence, the repository and the container.
            </li>
            <li>
              <a
                href="/security"
                className="focus-ring font-medium underline underline-offset-4"
              >
                The threat model
              </a>
              , if you are deciding this on behalf of other people, and{' '}
              <a
                href="/privacy"
                className="focus-ring font-medium underline underline-offset-4"
              >
                what the visit log records
              </a>
              .
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
