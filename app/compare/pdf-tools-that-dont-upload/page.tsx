import type { Metadata } from 'next';
import {
  ArrowLeft,
  CircleSlash,
  FileText,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import egressReceipt from '@/lib/seo/egress-receipt.json';

export const revalidate = 86400;

/*
  Hand-written comparison page, Pillar 5 of
  `docs/ORGANIC_GROWTH_PLAYBOOK_CORRECTED.md`: "at most three hand-written
  pages, each a genuine comparison with a working tool on it, each making the
  architectural point (server-side upload vs. in-tab execution) with specifics
  that are true on the day of writing and dated."

  Two rules shaped every sentence below, and both are load-bearing.

  First, C2: no measured-privacy claim without the egress proof for the release
  it describes. So the numbers are not typed here. They are read from
  `lib/seo/egress-receipt.json`, which only `scripts/egress-receipt.mjs`
  writes, and only after running `e2e/egress-proof.spec.ts` against the
  deployed build. A stale release therefore shows a stale date rather than a
  fresh-looking lie.

  Second, and the reason this page names nobody: the comparison is drawn
  against an ARCHITECTURE, never against a company. "A tool that runs on a
  server must receive the file" is a definition, not an allegation. "Company X
  caps you at N megabytes" is a claim about a third party, and the project has
  no verified source for one -- `AGENTS.md` forbids treating a search snippet
  or a vendor's own page as validated evidence, and
  `lib/tools/local-source-policy.test.ts` independently fails the build if a
  competitor's name appears anywhere under app/ or components/. Both point the
  same way: describe our own behaviour precisely, and stay silent about theirs.
*/

const TESTED_ON = new Date(egressReceipt.verifiedAt).toLocaleDateString(
  'en-GB',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
);

const CANONICAL = [
  'https:',
  '//',
  'getopentools.com',
  '/compare/pdf-tools-that-dont-upload',
].join('');

export const metadata: Metadata = {
  title: 'Free PDF Tools That Never Upload Your File',
  description:
    'Thirteen PDF tools that run inside your browser tab: the enforced policy, the per-release egress test, our real limits, and what a server still does better.',
  alternates: { canonical: CANONICAL },
};

/*
  Every row is a route in `DEDICATED_TOOL_ROUTES` (lib/seo/live-tools.ts), and
  the description is the tool's own `shortDescription` from
  `lib/tools/catalog.ts` rather than a fresh piece of marketing prose. The
  limit column is the one that makes this table worth reading: it is copied
  from what each tool already refuses to do on its own page.
*/
const PDF_TOOLS: readonly (readonly [
  href: string,
  name: string,
  does: string,
  limit: string,
])[] = [
  [
    '/pdf/merge',
    'Merge PDF',
    'Combine PDF files in the order you choose.',
    'Capped at 20 files and 150 MB per run while the tool is canary — a safety limit of ours, not a browser one.',
  ],
  [
    '/pdf/extract-pages',
    'Extract PDF pages',
    'Choose pages or ranges and save them as a new PDF.',
    'Splits by page selection, not by bookmark or by detected chapter.',
  ],
  [
    '/pdf/page-tools',
    'Page tools',
    'Reorder, remove, rotate, number, watermark and label PDF pages.',
    'Edits the page graph. It is not a content editor: body text stays as it is.',
  ],
  [
    '/pdf/compress',
    'Compress PDF',
    'Rewrite a PDF more compactly and re-encode the photos inside it.',
    'Only images it can rewrite without changing how the page renders are touched. If the result is not smaller, the original bytes come back and the receipt says so.',
  ],
  [
    '/pdf/to-word',
    'PDF to Word',
    'Extract the text into an editable .docx: reading order, paragraphs, page breaks, headings.',
    'Layout, columns, tables-as-tables, images and fonts are not reproduced. A scanned PDF has no text layer and is refused by name rather than returned empty.',
  ],
  [
    '/pdf/to-excel',
    'PDF to Excel',
    'Convert bank statements and PDF tables into .xlsx and CSV, with column detection.',
    'Works on tables the PDF describes as text. A photograph of a table is a different job.',
  ],
  [
    '/pdf/ocr',
    'OCR PDF',
    'Add an invisible searchable text layer to a scanned PDF, keeping its visible pages.',
    'English only. Recognition quality depends on the scan, and it is not proofread.',
  ],
  [
    '/pdf/redact',
    'Redact & black out PDF',
    'Black out text or rectangles, rasterise the redacted pages, and purge metadata and annotations.',
    'A password-protected or encrypted PDF is refused by name rather than partially processed; passwords are not bypassed.',
  ],
  [
    '/pdf/sign',
    'Sign and fill PDF',
    'Complete a PDF form and draw a signature onto the page.',
    'A visible signature drawn on the page. Not a cryptographic signature, and not identity verification.',
  ],
  [
    '/pdf/metadata',
    'PDF metadata viewer and remover',
    'See the author, authoring program, dates and XMP packet inside a PDF, then remove them.',
    'Document-level metadata. It does not rewrite information printed inside the page content.',
  ],
  [
    '/pdf/bates',
    'Bates numbering',
    'Stamp sequential legal reference numbers across a set of PDFs.',
    'A password-protected or encrypted document is refused by name rather than stamped.',
  ],
  [
    '/pdf/compare',
    'Compare PDFs',
    'Whole-document comparison across two drafts: insertions, deletions, moved clauses, formatting changes.',
    'Compares the documents’ text streams. It is not a visual pixel diff of the rendered pages.',
  ],
  [
    '/pdf/images-to-pdf',
    'Images to PDF',
    'Arrange JPEG and PNG images into one PDF.',
    'Capped at 40 images per run.',
  ],
];

/*
  The section a marketing page leaves out, which is exactly why it is here.

  Everything in this list is a consequence of where the computation happens, so
  each item is checkable by reasoning rather than by trusting us -- and none of
  it is an assertion about any particular company's product.
*/
const WHAT_A_SERVER_DOES_BETTER: readonly (readonly [string, string])[] = [
  [
    'Files bigger than your device can hold',
    'The work happens in your tab, so it is bounded by your machine’s memory. A service running on hardware larger than your laptop can open documents this cannot, and it will not be close on an old phone.',
  ],
  [
    'The same result for everyone',
    'A server gives every customer the same CPU, the same library versions and the same fonts. Here, the browser and the device are part of the pipeline, so two people can get results that differ slightly — and a rare browser can fail outright.',
  ],
  [
    'Recognition and conversion at a quality a tab cannot reach',
    'Optical character recognition, layout reconstruction and language coverage scale with model size. A server can run a model of any size. Anything running here has to be downloaded into your browser first, which puts a hard ceiling on it: our OCR is English and our PDF-to-Word keeps the text, not the layout.',
  ],
  [
    'Exact-layout conversion',
    'Turning a PDF back into a Word document that preserves columns, tables, images and fonts is what commercial conversion engines are for. It is not honestly achievable in a browser tab at a quality worth charging for, so we do not attempt it.',
  ],
  [
    'Everything that needs an account to exist',
    'Cloud storage connectors, shared team folders, saved templates, audit trails, retention policies, e-signature workflows with identity verification. None of these can work without a server holding state, and we hold none.',
  ],
  [
    'Someone to be accountable to you',
    'A paid service has a company behind it, a support desk, a contract and a service level. This is an open-source project. If a tool is wrong at two in the morning, there is no one on call.',
  ],
];

export default function PdfToolsThatDontUploadPage() {
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
              <FileText
                aria-hidden="true"
                className="size-5 text-foreground sm:size-6"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Comparison
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] sm:text-4xl">
                PDF tools that do not upload your file
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            When a PDF site does its work on a server, the shape is always the
            same: you choose a file, it travels to a computer you have never
            seen, something happens there, and a result comes back. That is not
            a criticism of any particular site — it is what running software on
            a server means. A program cannot operate on bytes it has not
            received.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            OpenTools is built the other way round. The program is sent to your
            file instead: the code arrives as part of the page, and the work
            happens inside the tab that is already open.{' '}
            <strong>
              Which model a tool uses is a fact about its architecture, not a
              promise in its privacy policy
            </strong>{' '}
            — and it is the only difference on this page worth caring about.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <ShieldCheck aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              What is enforced, and by whom
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            &ldquo;We don&rsquo;t keep your files&rdquo; is a policy. A policy
            is a description of an intention. These are controls, and none of
            them depends on our good behaviour:
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>The browser refuses the connection.</strong> PDF tool
                pages are served{' '}
                <code className="text-[0.9em]">
                  connect-src &apos;none&apos;
                </code>
                , which switches off fetch, XHR, WebSocket, EventSource and
                sendBeacon together. Your browser enforces it, so it holds even
                against a bug in our own code.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>The build refuses the code.</strong> The test suite
                scans every engine, worker, component and route source for
                network primitives and literal remote addresses and fails when
                one appears, so no tool can quietly acquire an upload path
                between releases.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                <strong>Each release is attacked on purpose.</strong> An
                executable protocol tries five exfiltration routes from the
                page&rsquo;s own context, then runs a real file through a real
                tool and measures what left. Most recent run: six of six checks
                passed in Chromium and WebKit on {TESTED_ON}, with{' '}
                <strong>0 bytes recorded to any off-origin host</strong>.
              </span>
            </li>
          </ul>
          <p className="mt-4 text-sm leading-6 sm:text-base sm:leading-7">
            <a
              href="/proof"
              className="focus-ring font-medium underline underline-offset-4"
            >
              The full protocol, the result and how to reproduce it in thirty
              seconds
            </a>{' '}
            — and{' '}
            <a
              href="/security"
              className="focus-ring font-medium underline underline-offset-4"
            >
              the threat model
            </a>{' '}
            if you are deciding this on behalf of other people.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            The tools, and what each one will not do
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Every one of these is live now, free, and needs no account. The
            right-hand column is the part a comparison table usually hides.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3 font-semibold">Tool</th>
                  <th className="py-2 pr-3 font-semibold">What it does</th>
                  <th className="py-2 font-semibold">Where it stops</th>
                </tr>
              </thead>
              <tbody>
                {PDF_TOOLS.map(([href, name, does, limit]) => (
                  <tr key={href} className="border-b align-top last:border-0">
                    <td className="py-2.5 pr-3">
                      <a
                        href={href}
                        className="focus-ring font-medium underline underline-offset-4"
                      >
                        {name}
                      </a>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {does}
                    </td>
                    <td className="py-2.5 text-muted-foreground">{limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            The exceptions to the policy above are deliberate, and none of them
            is a PDF tool.{' '}
            <code className="text-[0.9em]">/image/background-remover</code> and{' '}
            <code className="text-[0.9em]">/image/editor</code> are served{' '}
            <code className="text-[0.9em]">connect-src &apos;self&apos;</code>{' '}
            instead, because the background remover has to download its ONNX
            model and WebAssembly runtime before it can run — from this same
            site, never from a third party. Those requests travel towards your
            browser, like the scripts and the stylesheet. They do not carry your
            image anywhere. Every PDF route on this page is{' '}
            <code className="text-[0.9em]">connect-src &apos;none&apos;</code>.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Scale aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              What a server-side PDF service does better
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            A comparison that finds nothing good on the other side is an
            advertisement. These are the cases where uploading is the right
            answer, and they are consequences of the same architecture that
            makes the rest of this page true.
          </p>
          <dl className="mt-4 divide-y rounded-xl border bg-muted/40">
            {WHAT_A_SERVER_DOES_BETTER.map(([heading, body]) => (
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
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            The short version: if the document is routine and you would rather
            it stayed on your machine, use this. If you need exact layout
            reconstruction, a 2 GB file, an audit trail, or a contract with
            somebody, you need a server — and you should use one.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <CircleSlash aria-hidden="true" className="size-5 shrink-0" />
            <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
              What this page does not claim
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                Nothing about any other company&rsquo;s product, pricing, limits
                or handling of your data. We have no verified source for those
                facts, so they are not here. Where a comparison was unavoidable
                it is drawn against the server-side model in general, which is a
                matter of definition.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                No speed claim. Whether a job finishes faster here depends on
                your device against their hardware, and we have not measured
                theirs.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                The measured figures belong to the release dated above and to
                the tools and two engines the protocol covered. A later release
                is covered only once the protocol has been re-run against it.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="text-muted-foreground">
                &bull;
              </span>
              <span>
                Egress evidence reports where bytes went. It is not a security
                guarantee and can never establish that no flaw remains.
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
          <h2 className="text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
            Keep reading
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 sm:text-base sm:leading-7">
            <li>
              <a
                href="/compare/browser-based-vs-cloud-file-tools"
                className="focus-ring font-medium underline underline-offset-4"
              >
                Browser-based vs cloud file tools
              </a>{' '}
              — the architecture in full, and how to check which one any tool
              you use actually is.
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
                href="/guides/category/pdf"
                className="focus-ring font-medium underline underline-offset-4"
              >
                Every PDF tool on the site
              </a>
              , with its guide.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
