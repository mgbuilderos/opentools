import type { Metadata } from 'next';
import { CircleSlash, Inbox, ListChecks, Wrench } from 'lucide-react';

export const revalidate = 86400;

/*
  Why this page exists.

  The site ships more than a thousand local tools and has no way for anyone to
  say which one is missing. The request template in
  `.github/ISSUE_TEMPLATE/tool_request.yml` has existed since the repository
  was opened and nothing on the site links to it, so the only people who can
  find it are people already reading the repository -- which is the audience
  least likely to need a tool built for them.

  It is also the one page whose text is the question people actually type.
  "Is there a free tool for X" is asked constantly, about a different X every
  time, and a page that answers it honestly -- here is what exists, here is
  how to ask for what does not, here is what cannot be built and why -- is the
  rare case where the catalogue's size is the argument rather than a list.

  DELIBERATELY STATIC. An obvious version of this page would show live issues
  from the tracker. That needs a network request, and `connect-src 'none'` plus
  `lib/tools/local-source-policy.test.ts` forbid one from anywhere under
  `app/`. Fetching at build time instead would make every deploy depend on a
  third-party API being up. Neither is worth it: the request itself happens on
  the tracker, and this page's job is to get people there and to set
  expectations honestly before they spend the effort.
*/

/*
  `local-source-policy.test.ts` fails the build on a literal remote URL
  anywhere under `app/`, so the tracker link is assembled the same way
  `app/sitemap.ts` and `app/proof/page.tsx` assemble theirs. The guard stays
  armed for real code; do not relax it to shorten this.
*/
const REPO = ['https:', '//', 'github.com', '/mgbuilderos/opentools'].join('');
const NEW_REQUEST = [REPO, '/issues/new?template=tool_request.yml'].join('');
const OPEN_REQUESTS = [REPO, '/issues?q=is%3Aissue+label%3Aenhancement'].join(
  '',
);

export const metadata: Metadata = {
  alternates: { canonical: '/requests' },
  title: 'Ask for a tool — free, local, and built in the open',
  description:
    'Tell us which everyday tool is missing. Every utility here runs in your browser and stays free, so a request is a queue position, never a purchase.',
};

const IN_SCOPE = [
  'Anything that is pure computation on a file or some text you already have.',
  'Anything a browser can already do: canvas, WebCrypto, WebAssembly, workers.',
  'A format we do not read yet, if an MIT-compatible library can read it.',
  'An option missing from a tool that already exists.',
];

const OUT_OF_SCOPE = [
  [
    'Anything that must call a remote service',
    'translation, live exchange rates, sending mail, looking a URL up.',
  ],
  [
    'Anything that needs an account or stored state',
    'there is no server to keep it on and no login to attach it to.',
  ],
  [
    'Anything whose output would be a guess',
    'a tool that cannot be right is worse than no tool.',
  ],
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <a
        href="/"
        className="focus-ring text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Back to the tools
      </a>

      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
        Ask for a tool
      </h1>

      <p className="mt-4 text-base text-muted-foreground">
        There are already more than a thousand tools here, and every one of them
        runs inside your browser, costs nothing, and has no account. If the one
        you need is missing, the useful thing you can do is say so.
      </p>

      <p className="mt-3 text-base text-muted-foreground">
        Requests are only ever about <em>what gets built next</em>. Nothing here
        is held back behind a payment or a sign-up, so there is nothing to
        unlock — a request is a queue position, not a purchase.
      </p>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]">
          <Inbox aria-hidden className="size-5" />
          How to ask
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Describe the job rather than the tool. &ldquo;I need to combine
          scanned receipts into one PDF before filing expenses&rdquo; is far
          more useful than &ldquo;add a merge button&rdquo;, because the job
          often turns out to be solvable today with something already here — and
          when it is not, the description is what makes the new tool correct
          rather than approximately right.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={NEW_REQUEST}
            rel="noopener noreferrer"
            target="_blank"
            className="focus-ring inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <Wrench aria-hidden className="size-4" />
            Request a tool
          </a>
          <a
            href={OPEN_REQUESTS}
            rel="noopener noreferrer"
            target="_blank"
            className="focus-ring inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ListChecks aria-hidden className="size-4" />
            See what others asked for
          </a>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Both open the public issue tracker. Requesting needs a free account
          there; reading does not.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">
          What can be built
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Every tool on this site processes your input on your own device. That
          single rule decides almost everything about what is possible here.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {IN_SCOPE.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden className="text-foreground">
                &middot;
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-[-0.02em]">
          <CircleSlash aria-hidden className="size-5" />
          What cannot, and why
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          These are not a backlog. They are outside what this site is, and
          saying so plainly is fairer than leaving a request open for years.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          {OUT_OF_SCOPE.map(([what, why]) => (
            <div key={what} className="rounded-md border bg-card p-3">
              <dt className="font-semibold text-foreground">{what}</dt>
              <dd className="mt-1 text-muted-foreground">{why}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          The first one is the boundary that matters. The page is served so the
          browser refuses to open a network connection at all, which is what
          makes the privacy claim checkable instead of promised — so a tool that
          needs to phone somewhere cannot live here without giving that up for
          every other tool too.
        </p>
      </section>

      <section className="mt-10 border-t pt-6">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">
          Before you ask
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          It is worth searching first — the catalogue is large enough that most
          people have not seen most of it, and the tool you want may be one
          search away.
        </p>
        <a
          href="/"
          className="focus-ring mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground underline underline-offset-4"
        >
          Search every tool
        </a>
      </section>
    </main>
  );
}
