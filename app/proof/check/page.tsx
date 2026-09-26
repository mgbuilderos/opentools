import type { Metadata } from 'next';
import { ArrowLeft, Eye, ShieldQuestion, TerminalSquare } from 'lucide-react';

import { EgressCheckTool } from '@/components/egress-check-tool';

export const revalidate = 86400;

/*
  Why this page exists.

  `/proof` answers "does *this* site send your file anywhere", and answers it
  with a protocol -- `e2e/egress-proof.spec.ts` and `e2e/egress-sweep.spec.ts`,
  which drive a real file through all 67 tool routes in two engines. That work
  is finished and it convinces the reader of one thing about one site: ours.

  It leaves them with a question it cannot answer. They use other file tools,
  those tools also say they respect privacy, and the reader still has no way to
  tell which ones are enforcing that and which are promising it. Answering only
  for ourselves reads as marketing however rigorous the method is.

  So the protocol is published here as something they point wherever they like.
  The check is the same check; the target is theirs.

  WHY THIS PAGE DOES NOT FETCH THE URL. The literal request -- paste a URL, we
  tell you -- describes a server that receives every address people are
  suspicious of. Three things rule it out, and they are on the page rather than
  buried here because the reason IS the argument:

    1. Every route is served `connect-src 'none'`, asserted on the response
       header by the protocol. A page here cannot open a connection. Relaxing
       that for this one tool would mean breaking the proof in order to ship
       the page that demonstrates it.
    2. A browser cannot read a cross-origin response's headers without CORS
       permission from the target, so the check is impossible from any page.
    3. A box of ours doing it would hold a log of what strangers distrust.

  The snippet in `lib/egress/live-check.ts` is the better answer anyway: a
  server fetch sees only what a page DECLARES in a header, while the snippet
  watches what the page DOES once it has been handed a file.

  NAMING. `lib/policy/competitor-names.ts` forbids naming a company in served
  copy, and `local-source-policy.test.ts` scans comments as well as copy. The
  rule holds here without effort: the visitor chooses the target, the verdict
  renders on their device, and this page ships no list of anyone. A result that
  a reader reached themselves about a site they picked is worth more than one
  we handed them anyway.
*/

const CANONICAL = ['https:', '//', 'getopentools.com', '/proof/check'].join('');

export const metadata: Metadata = {
  title: 'Can this page send your file anywhere? — check any site',
  description:
    'Paste the address of any page that takes a file. A ten-second check, run in your own browser, tells you whether that page is able to transmit what you give it.',
  alternates: { canonical: CANONICAL },
};

/* The four states, kept in the order strongest-first so the table reads as a
   scale rather than as a list of accusations. */
const VERDICTS: readonly (readonly [string, string, string])[] = [
  [
    'Cannot send',
    "connect-src 'none'",
    'The browser refuses every connection the page attempts. Enforcement, not a promise — it holds even against a bug in the page.',
  ],
  [
    'Restricted',
    'a source list',
    'Connections are limited to named destinations, but not switched off.',
  ],
  [
    'Able to send',
    'no restriction',
    'Nothing stops the page connecting. Most sites are here, and most of them say so.',
  ],
  [
    'Unknown',
    'no policy read',
    'The check could not read a policy. Not a finding, and never rendered as one.',
  ],
];

const STEPS: readonly (readonly [typeof Eye, string, string])[] = [
  [
    ShieldQuestion,
    'You pick the page',
    'Any site that asks you for a file. We never see the address — it stays in the box on your device.',
  ],
  [
    TerminalSquare,
    'Your browser runs the check',
    'Paste ten seconds of code into your own console. It attempts five deliberate connections and reports which the browser refused.',
  ],
  [
    Eye,
    'You read the result',
    'A card on that page, showing what it is able to do with your file. Yours to keep, screenshot or ignore.',
  ],
];

export default function EgressCheckPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <a
        href="/proof"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        The proof for this site
      </a>

      <h1 className="ds-title">Can this page send your file anywhere?</h1>
      <p className="ds-description mt-4">
        Paste the address of any page that asks you for a file. Run the check in
        your own browser and find out whether that page is{' '}
        <strong className="text-foreground">able</strong> to transmit what you
        give it — not whether it promises not to.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {STEPS.map(([Icon, title, body]) => (
          <div key={title} className="rounded-xl border border-border p-4">
            <Icon className="mb-2 h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <EgressCheckTool />
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">
          Why we do not just check it for you
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Because a site that fetched the address you paste would be a site that{' '}
          <em>receives</em> the address you paste — a list of what strangers are
          suspicious of, held by us. Every page here is served a policy that
          switches off network connections entirely, and that policy is what the
          rest of this site&apos;s evidence rests on. Relaxing it to build this
          one page would mean breaking the proof in order to ship the tool that
          demonstrates it.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          There is also no way around it: a browser cannot read another
          site&apos;s response headers without that site&apos;s permission. So
          the check runs where it can — in your browser, on the page you chose —
          and it turns out to be the stronger test. Reading a header tells you
          what a page <em>declares</em>. Watching it tells you what it{' '}
          <em>does</em> once it is holding your file.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          What the four answers mean
        </h2>
        <div className="ds-surface mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Answer
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Policy
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Means
                </th>
              </tr>
            </thead>
            <tbody>
              {VERDICTS.map(([answer, policy, means]) => (
                <tr
                  key={answer}
                  className="border-b border-border/60 last:border-0"
                >
                  <th
                    scope="row"
                    className="whitespace-nowrap px-4 py-3 font-medium"
                  >
                    {answer}
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                    {policy}
                  </td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    {means}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-muted/30 p-5">
        <h2 className="text-base font-semibold tracking-tight">
          What this does not tell you
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">
              Able to send is not the same as does send.
            </strong>{' '}
            Processing files on a server is a normal, legitimate and common
            design. Most products built that way describe it openly. What has
            been missing is any way for you to tell which kind of page you are
            on.
          </li>
          <li>
            <strong className="text-foreground">
              It is not a security audit.
            </strong>{' '}
            This reports where bytes are permitted to go. No egress measurement
            can establish that a page has no flaw, and none is claimed here.
          </li>
          <li>
            <strong className="text-foreground">It is a snapshot.</strong> It
            describes the page as served to you, now. A page can be served
            differently tomorrow, or to someone else.
          </li>
          <li>
            <strong className="text-foreground">
              Unknown is not a failure.
            </strong>{' '}
            Some servers refuse automated requests, which says nothing at all
            about their headers. An unreadable policy is reported as unread.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Where the check comes from
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          It is the same protocol this site runs against itself before every
          release that repeats an egress claim — the five deliberate
          exfiltration attempts, the off-origin byte count, and the rule that a
          request carrying a body is watched even when it points at the
          page&apos;s own origin, which a content-security policy does not
          cover.{' '}
          <a className="underline hover:no-underline" href="/proof">
            The run against this site
          </a>{' '}
          sets out the method and the result, including what it does not
          establish.
        </p>
      </section>
    </main>
  );
}
