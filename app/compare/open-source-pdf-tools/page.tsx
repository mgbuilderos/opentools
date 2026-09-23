import type { Metadata } from 'next';
import {
  ArrowLeft,
  CircleSlash,
  ScrollText,
  TerminalSquare,
} from 'lucide-react';

export const revalidate = 86400;

/*
  The third and last of the hand-written comparison pages (Pillar 5,
  `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md`).

  Its argument is narrow on purpose. "Open source" is not being used here as a
  virtue signal, and this page does not survey or rank anybody else's
  open-source project -- it has no verified basis on which to do that. What it
  does is explain the one thing the licence buys a reader who cares about where
  their documents go: it converts a claim that must be believed into a claim
  that can be checked, and then it says plainly what open source does NOT give
  you, which is the half that makes the first half usable.

  Every figure below comes from a file in this repository -- the licence, the
  notices file, the Dockerfile, `docs/SELF_HOSTING.md` -- and the one measured
  number carries the date it was measured, because the doc it comes from says
  it moves.
*/

const REPO = ['https:', '//', 'github.com/mgbuilderos/opentools'].join('');
const CANONICAL = [
  'https:',
  '//',
  'getopentools.com',
  '/compare/open-source-pdf-tools',
].join('');

export const metadata: Metadata = {
  title: 'Open-Source PDF Tools You Can Run Yourself',
  description:
    'OpenTools is MIT licensed and self-hostable. The repository, the dependency licences, how to build the container, and what open source does not give you.',
  alternates: { canonical: CANONICAL },
};

/*
  Straight from THIRD_PARTY_NOTICES.md. The exact versions, the tarball
  integrity values and the full transitive graph are in that file and in
  package-lock.json; this is the summary a reader needs to decide whether the
  licence position is one they can live with.
*/
const DEPENDENCIES: readonly (readonly [
  name: string,
  what: string,
  licence: string,
])[] = [
  ['pdf-lib', 'Reads and writes the PDF page graph', 'MIT'],
  ['@pdf-lib/upng, pngjs, pako', 'PNG and stream compression', 'MIT, Zlib'],
  ['onnxruntime-web', 'Runs the background-removal model in the tab', 'MIT'],
  ['u2netp.onnx', 'The background-removal model weights', 'Apache-2.0'],
  ['qrcode, dijkstrajs', 'QR generation', 'MIT'],
  ['React, Base UI React', 'The interface', 'MIT'],
  ['Lucide React', 'The icons', 'ISC'],
  ['vinext', 'The build and the Worker runtime output', 'MIT'],
];

/*
  The honest half. An open licence is not a warranty, and a reader deciding
  whether to put a firm's documents through this is entitled to the list before
  they find it out themselves.
*/
const WHAT_OPEN_SOURCE_IS_NOT: readonly (readonly [string, string])[] = [
  [
    'It is not a warranty',
    'The MIT licence says so in capital letters: the software is provided “as is”, without warranty of any kind. If a tool mangles a document, the licence gives you no claim against anybody.',
  ],
  [
    'It is not a support contract',
    'There is no service level, no response time and nobody on call. A commercial service sells exactly that, and for some work it is the right purchase.',
  ],
  [
    'It is not a security audit',
    'Published source can be read. It does not follow that anyone has read it. No third-party audit of this codebase has been commissioned or completed.',
  ],
  [
    'It is not a guarantee the project continues',
    'This is a small project. The licence means the code cannot be taken away from you, which is a real protection — but it is not the same as the project being maintained next year.',
  ],
  [
    'Self-hosting moves work to you',
    'Running your own container means you own its updates, its patches and its TLS. That is a genuine cost, and it is the reason most people should simply use the public site.',
  ],
];

export default function OpenSourcePdfToolsPage() {
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
              <ScrollText
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Comparison
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Open-source PDF tools you can read and run yourself
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            &ldquo;Where does my document go?&rdquo; is normally answered by a
            privacy policy, and a privacy policy is the one kind of answer you
            cannot test. The thing it describes — what a program does after it
            receives your file — is not observable from where you are standing,
            so a careful site and a careless one can write the identical
            paragraph and you have no way to tell them apart.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            That is the whole job the licence does here.{' '}
            <strong>
              It replaces a sentence you have to believe with a repository you
              can read and a container you can run.
            </strong>{' '}
            It is not a claim to be better than anyone. It is a claim to be
            checkable, which is a much smaller and much more useful thing.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            The licence position, in full
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>MIT</strong>, copyright 2026 OpenTools Contributors. You
                may use, copy, modify, merge, publish, distribute, sublicense
                and sell it, including commercially, provided the notice travels
                with it.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>The whole site is the repository.</strong> Not a
                client-side demo with the real work behind an API — there is no
                API. The tool engines, the interface, the tests and the Worker
                that serves it are all in the same tree at{' '}
                <a
                  href={REPO}
                  rel="noopener noreferrer"
                  className="focus-ring font-medium underline underline-offset-4"
                >
                  github.com/mgbuilderos/opentools
                </a>
                .
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>No account, no licence key, no phone-home</strong> — on
                the public site and in the container alike.
              </span>
            </li>
          </ul>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3 font-semibold">Dependency</th>
                  <th className="py-2 pr-3 font-semibold">What it does</th>
                  <th className="py-2 font-semibold">Licence</th>
                </tr>
              </thead>
              <tbody>
                {DEPENDENCIES.map(([name, what, licence]) => (
                  <tr key={name} className="border-b align-top last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-[0.85em]">
                      {name}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {what}
                    </td>
                    <td className="py-2.5 text-muted-foreground">{licence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Exact versions, tarball integrity values and the complete transitive
            graph are in{' '}
            <code className="text-[0.9em]">THIRD_PARTY_NOTICES.md</code> and{' '}
            <code className="text-[0.9em]">package-lock.json</code> in the
            repository.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <TerminalSquare aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              Run the whole site on your own machine
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            No Cloudflare account and no toolchain. The published image runs the
            same Worker runtime the live site does:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl border bg-muted/50 p-3.5 text-[0.8rem] leading-6 sm:p-4">
            <code>{`docker compose up -d
# then open localhost:8796`}</code>
          </pre>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Building from source instead is a two-stage{' '}
            <code className="text-[0.9em]">docker build</code> against a
            digest-pinned Node base image; the resulting image was about 692 MB
            when it was measured on 18 September 2026, and it grows as pages are
            added, so re-check rather than trust that figure. The full
            instructions, the environment variables and the optional access gate
            for an instance on a private network are in{' '}
            <code className="text-[0.9em]">docs/SELF_HOSTING.md</code>.
          </p>
          <p className="mt-4 rounded-xl border bg-muted/50 p-3.5 text-sm leading-6 sm:p-4 sm:leading-7">
            <strong>
              The container was measured serving with no network at all.
            </strong>{' '}
            Started with <code className="text-[0.9em]">--network none</code>,
            with the probe running inside it, the home page, the PDF tools, the
            guides and the sitemap all answered 200 while carrying{' '}
            <code className="text-[0.9em]">connect-src &apos;none&apos;</code>{' '}
            in the response policy. The one route in that run served differently
            is <code className="text-[0.9em]">/image/background-remover</code>,
            which gets{' '}
            <code className="text-[0.9em]">connect-src &apos;self&apos;</code>{' '}
            because it loads its ONNX model and runtime from the same origin —
            as does <code className="text-[0.9em]">/image/editor</code>, which
            shares that runtime. An outbound request from inside the container
            fails to resolve, as it should.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            What reading the source settles
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            These are the questions a privacy policy can only answer with a
            sentence, and that the repository answers with a file you can open:
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <em>Does a tool ever send my file anywhere?</em>{' '}
                <code className="text-[0.9em]">
                  lib/tools/local-source-policy.test.ts
                </code>{' '}
                scans every engine, worker, component and route source for
                network primitives and literal remote addresses and fails the
                build when one appears.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <em>What stops it at runtime?</em>{' '}
                <code className="text-[0.9em]">
                  lib/security/content-security-policy.ts
                </code>{' '}
                — thirty-odd lines deciding what every route is served.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <em>Does the claim get re-checked?</em>{' '}
                <code className="text-[0.9em]">e2e/egress-proof.spec.ts</code>{' '}
                attacks the site on every release and{' '}
                <a
                  href="/proof"
                  className="focus-ring font-medium underline underline-offset-4"
                >
                  publishes what it measured
                </a>
                , with the date it ran.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <em>What does a tool refuse to do?</em> Each engine&rsquo;s test
                file. The refusals are tested as carefully as the successes — a
                scanned PDF handed to PDF-to-Word is rejected by name rather
                than returned as an empty document, and there is a test that
                fails if that ever stops being true.
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <CircleSlash aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              What open source does not give you
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            If this section were missing, everything above it would be
            advertising.
          </p>
          <dl className="mt-4 divide-y rounded-xl border bg-muted/40">
            {WHAT_OPEN_SOURCE_IS_NOT.map(([heading, body]) => (
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
            Start with a tool
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            All of these are live, free and need no account.
          </p>
          <ul className="mt-3 grid gap-2 text-sm leading-6 sm:grid-cols-2 sm:text-base sm:leading-7">
            {(
              [
                ['/pdf/merge', 'Merge PDF'],
                ['/pdf/extract-pages', 'Extract PDF pages'],
                ['/pdf/compress', 'Compress PDF'],
                ['/pdf/to-word', 'PDF to Word'],
                ['/pdf/ocr', 'OCR a scanned PDF'],
                ['/pdf/redact', 'Redact a PDF'],
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
          <p className="mt-4 text-sm leading-6 sm:text-base sm:leading-7">
            Or read{' '}
            <a
              href="/compare/pdf-tools-that-dont-upload"
              className="focus-ring font-medium underline underline-offset-4"
            >
              what each of the thirteen PDF tools will not do
            </a>
            , and{' '}
            <a
              href="/compare/browser-based-vs-cloud-file-tools"
              className="focus-ring font-medium underline underline-offset-4"
            >
              how to check which architecture any file tool uses
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
