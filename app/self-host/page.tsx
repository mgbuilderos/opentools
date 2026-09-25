import type { Metadata } from 'next';
import {
  ArrowLeft,
  KeyRound,
  Server,
  ShieldCheck,
  Terminal,
  WifiOff,
} from 'lucide-react';

export const revalidate = 86400;

/*
  Written for the one reader no other page on this site addresses: the IT
  administrator or systems person who has been asked for a PDF tool by a team
  that is not allowed to upload the documents in question.

  /security answers "may our staff use your website". This page answers a
  different question — "can we run it ourselves, inside our own network, so the
  question never arises" — and the answer is a build and a run command. Every
  figure and every command here is taken from docs/SELF_HOSTING.md rather than
  restated from memory; that file is the source, this page is the route to it.
*/

const REPO = ['https:', '//', 'github.com/mgbuilderos/opentools'].join('');
const SELF_HOSTING_DOC = [REPO, '/blob/main/docs/SELF_HOSTING.md'].join('');
const DOCKERFILE = [REPO, '/blob/main/Dockerfile'].join('');
const CANONICAL = ['https:', '//', 'getopentools.com', '/self-host'].join('');

export const metadata: Metadata = {
  title: 'Self-host OpenTools — run the whole site inside your own network',
  description:
    'Run every OpenTools utility on your own hardware from one container: two commands, no Cloudflare account, no outbound network, and an optional access gate for the whole instance. MIT licensed.',
  alternates: { canonical: CANONICAL },
};

const BUILD_COMMAND = 'docker build -t opentools-selfhost:local .';
const RUN_COMMAND = 'docker run --rm -p 8796:8796 opentools-selfhost:local';
const GATED_RUN_COMMAND = `docker run --rm -p 8796:8796 \\
  -e OPENTOOLS_AUTH_USER=ops \\
  -e OPENTOOLS_AUTH_PASSWORD='choose something long' \\
  opentools-selfhost:local`;
const OFFLINE_COMMAND = `docker run --rm -d --network none --name opentools opentools-selfhost:local
docker exec opentools node -e "fetch('http://127.0.0.1:8796/').then(r=>console.log(r.status))"`;

/* Measured on the image with `--network none`, the container serving and the
   probe both inside it. Reproduced from docs/SELF_HOSTING.md so the table a
   reviewer is shown is the table an engineer maintains. */
const OFFLINE_RESULTS = [
  ['/', '200', "'none'"],
  ['/robots.txt', '200', "'none'"],
  ['/pdf/sign', '200', "'none'"],
  ['/pdf/compress', '200', "'none'"],
  ['/guides/pdf-sign-pdf', '200', "'none'"],
  ['/sitemap.xml', '200', "'none'"],
  ['/image/background-remover', '200', "'self'"],
] as const;

const SETTINGS = [
  ['PORT', '8796', 'Port inside the container.'],
  [
    'OPENTOOLS_STATE_DIR',
    '/tmp/opentools-state',
    'Where the page cache is persisted. It is inside the container, so the cache starts empty after a restart unless you mount a volume there.',
  ],
  ['WRANGLER_LOG_LEVEL', 'info', 'Log verbosity.'],
  [
    'OPENTOOLS_AUTH_USER',
    'unset',
    'Username for the optional access gate. Both variables must be set or the gate stays off.',
  ],
  [
    'OPENTOOLS_AUTH_PASSWORD',
    'unset',
    'Password for the optional access gate.',
  ],
] as const;

const NOT_INCLUDED = [
  'No TLS. Terminate it at a reverse proxy in front of the container — the access gate is HTTP Basic, and Basic credentials over plain HTTP are readable in transit.',
  'No SSO, no user accounts, no per-user audit trail. The gate is one shared credential for the whole instance, because anything more would mean storing people.',
  'One container, one process. No clustering, and no shared cache between replicas.',
  'No published image by default. The image builds on every pull request without being pushed; only a v* tag publishes to GitHub Container Registry.',
];

export default function SelfHostPage() {
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
                Self-hosting
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Run the whole thing inside your own network
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            If your organisation handles documents that may not be uploaded to
            anyone — case files, patient records, statements, anything under a
            data-residency rule — the usual answer is that staff must not use
            online file tools at all, and they use them anyway.{' '}
            <strong>
              This is the other answer: the same tools, running on your
              hardware, on a container that needs no account and no network.
            </strong>{' '}
            It is MIT licensed, so there is nothing to buy, register or renew.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Files are processed in the browser tab either way. Self-hosting
            removes the remaining question — whose server sent the page — so the
            answer to &ldquo;where did this document go&rdquo; is a machine you
            already own.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Terminal aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Two commands
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Clone{' '}
            <a
              href={REPO}
              rel="noreferrer noopener"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              the repository
            </a>
            , then, from its root:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl border bg-muted/50 p-3.5 text-[0.8rem] leading-6 sm:p-4 sm:text-sm">
            <code>{BUILD_COMMAND}</code>
          </pre>
          <pre className="mt-2 overflow-x-auto rounded-xl border bg-muted/50 p-3.5 text-[0.8rem] leading-6 sm:p-4 sm:text-sm">
            <code>{RUN_COMMAND}</code>
          </pre>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Then open{' '}
            <code className="text-[0.9em]">http://localhost:8796</code>. That is
            the entire site — every tool, every guide — served by the same
            runtime the public site uses, from an image of roughly 692 MB
            (measured 2026-09-18; it grows as pages are added, so re-measure
            rather than trust it). The base image is pinned by digest, the
            container runs as an unprivileged user, and Wrangler&rsquo;s
            metrics, remote lookups and observability are switched off in the
            image, so nothing contacts Cloudflare.
          </p>
        </section>

        {/*
          The section this page existed without for its first commit, and the
          reason an administrator should read the rest of it.

          Self-hosting is normally a statement about *where* the server is. The
          argument here is about whether there is a server in the transaction
          at all, which is a different review with a different scope -- and it
          is the one thing on this page that is not also true of moving some
          other file tool onto your own hardware. Drawn against the
          architecture and never against a named product: the project has no
          verified source for how anyone else handles a file, and
          lib/policy/competitor-names.ts keeps that rule enforceable.
        */}
        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <ShieldCheck aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              The container never receives the document
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            This is the part worth reading twice, because it is not what
            self-hosting usually buys you. The common pattern is to move the
            processing onto a machine you own: the file still leaves the
            workstation, and it arrives somewhere — request bodies, working
            memory, temporary files, whatever the process writes while it works,
            and whatever your backups then copy. That server is inside your
            perimeter, which answers the residency question, and it is also a
            system holding client documents, which means it inherits the
            hardening, the retention schedule, the log review and the access
            control that go with one.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Here the container serves the page and the page does the work. The
            tool runs in the browser tab on the machine where the file already
            is, so the document is never put on the wire and the container never
            has it to store, cache, log or back up.{' '}
            <strong>
              What you are deploying is a static site, not a document processor.
            </strong>
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            For whoever signs this off, the consequence is scope rather than
            comfort: there is no file store to encrypt, no retention period to
            set, no per-document audit trail to design, and nothing on the
            instance for a subject access request or a breach notification to
            reach. The questions that remain are the ordinary ones you would ask
            of any internal web server — who can reach it, who can change the
            image, and how it is patched.
          </p>
          <p className="mt-3 rounded-xl border bg-muted/50 p-3.5 text-sm leading-6 sm:p-4 sm:leading-7">
            <strong>Where that argument stops.</strong> Serving no documents is
            not the same as being irrelevant to the outcome: the container still
            serves the code that runs in the tab, so whoever can change the
            image can change what the tool does. That is the trust you are
            actually taking on, it is the same trust you take on with any
            internally hosted application, and it is why the image is built from
            a repository you can read rather than pulled from us. Verify the
            claim rather than accept it — put a synthetic file through a tool
            with the network tab open, or run{' '}
            <code className="text-[0.9em]">e2e/egress-proof.spec.ts</code>{' '}
            against the build you intend to deploy.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <WifiOff aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              It runs with no network at all
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            You do not have to take that on trust, and it is the fastest way to
            settle the question for a reviewer. Start the container with
            networking removed entirely and probe it from inside itself:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl border bg-muted/50 p-3.5 text-[0.8rem] leading-6 sm:p-4 sm:text-sm">
            <code>{OFFLINE_COMMAND}</code>
          </pre>
          <div className="mt-4 overflow-x-auto rounded-xl border bg-muted/40">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-3 font-semibold sm:p-3.5">Path</th>
                  <th className="p-3 font-semibold sm:p-3.5">Status</th>
                  <th className="p-3 font-semibold sm:p-3.5">
                    <code className="text-[0.9em]">connect-src</code> served
                  </th>
                </tr>
              </thead>
              <tbody>
                {OFFLINE_RESULTS.map(([path, status, csp]) => (
                  <tr key={path} className="border-b last:border-0">
                    <td className="p-3 sm:p-3.5">
                      <code className="text-[0.9em]">{path}</code>
                    </td>
                    <td className="p-3 text-muted-foreground sm:p-3.5">
                      {status}
                    </td>
                    <td className="p-3 text-muted-foreground sm:p-3.5">
                      <code className="text-[0.9em]">{csp}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            <code className="text-[0.9em]">/image/background-remover</code> is
            the single route served{' '}
            <code className="text-[0.9em]">connect-src &apos;self&apos;</code>,
            because it loads its model and WebAssembly runtime from the same
            origin. An outbound request from inside that container fails to
            resolve, as it should. This establishes that the server needs
            nothing; what the browser then does with the pages is the subject of{' '}
            <a
              href="/proof"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              the egress protocol
            </a>
            , which you can run against your own build.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <KeyRound aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Restricting who can reach the instance
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Off by default. Set both variables and the instance asks for a
            username and password before serving anything:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl border bg-muted/50 p-3.5 text-[0.8rem] leading-6 sm:p-4 sm:text-sm">
            <code>{GATED_RUN_COMMAND}</code>
          </pre>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            It is HTTP Basic, compared in constant time, failing closed if only
            one of the two variables is set, and checked before anything else
            runs — so a refused request is never written to the visit log
            either. It answers one question, &ldquo;is this person allowed to
            reach this instance at all&rdquo;, and deliberately nothing more:
            accounts would mean storing people, which this product does not do.
            The public site never has it on.
          </p>
          <h3 className="mt-5 text-base font-semibold sm:text-lg">Settings</h3>
          <ul className="mt-2 divide-y rounded-xl border bg-muted/40">
            {SETTINGS.map(([name, value, detail]) => (
              <li key={name} className="p-3.5 sm:p-4">
                <p className="text-sm font-semibold sm:text-[0.95rem]">
                  <code className="text-[0.9em]">{name}</code>
                  <span className="ml-2 font-normal text-muted-foreground">
                    default: <code className="text-[0.9em]">{value}</code>
                  </span>
                </p>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                  {detail}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            What this does not include
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Stated here rather than discovered during your rollout:
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            {NOT_INCLUDED.map((item) => (
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
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            Before you sign it off
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            The full build, run and verification steps, including the settings
            table and the offline measurement above, are in{' '}
            <a
              href={SELF_HOSTING_DOC}
              rel="noreferrer noopener"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              docs/SELF_HOSTING.md
            </a>
            , and the image is defined by{' '}
            <a
              href={DOCKERFILE}
              rel="noreferrer noopener"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              the Dockerfile
            </a>
            . The threat model, the controls and what is out of scope are on the{' '}
            <a
              href="/security"
              className="focus-ring font-semibold text-foreground underline underline-offset-4"
            >
              security page
            </a>
            , written for the same reader as this one. Everything either page
            claims can be re-run by you against the build you intend to deploy,
            which is the point of publishing both.
          </p>
        </section>
      </div>
    </main>
  );
}
