import type { Metadata } from 'next';
import { EMBEDDABLE_TOOLS, embedSnippet } from '@/lib/embed/embeddable-tools';

export const revalidate = 86400;

const ORIGIN = ['https:', '//', 'getopentools.com'].join('');
const CANONICAL = `${ORIGIN}/embed`;

/*
  The page a site owner lands on when they want one of these tools inside their
  own page, and the only part of the embed programme that is meant to rank.

  It is written for a specific reader: somebody who runs a documentation site,
  a developer blog or a university page, who needs a working tool next to their
  own writing, and who would otherwise link out to a competitor that uploads
  their readers' data. The thing that closes that reader is not enthusiasm, it
  is the licence being stated plainly enough that they do not have to email
  anyone: free, no key, no tracking, no removal of attribution.
*/
export const metadata: Metadata = {
  title: 'Embed OpenTools — free, no key, no upload',
  description:
    'Put a working table converter on your own site with one line of HTML. Free, no API key, no account, no tracking, and your readers’ data never leaves their browser.',
  alternates: { canonical: CANONICAL },
};

const TERMS = [
  [
    'Free, for anything',
    'Commercial sites included. There is no key to request, no quota, no account and no invoice. It stays free because an embed costs us nothing to serve — the work happens in your reader’s browser, not on our server.',
  ],
  [
    'No upload — not by your site, and not by us',
    'The tool has no network access at all: every embed is served with a Content-Security-Policy of connect-src ‘none’, so the browser itself refuses any request it might try to make. Whatever your reader pastes stays on their machine.',
  ],
  [
    'No tracking, no cookies, no analytics',
    'The frame sets nothing and reads nothing. It cannot see your page, and we cannot see your readers.',
  ],
  [
    'Keep the attribution link',
    'Each embed carries one line at the bottom linking back to the full tool. Do not remove, hide, crop or cover it. That link is the entire price, and the reason there is no other one.',
  ],
] as const;

export default function EmbedIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="ds-title">Put these tools on your own site</h1>
      <p className="ds-description mt-4">
        One line of HTML. No key, no account, no quota, and nothing your readers
        type ever leaves their own browser — including from us.
      </p>

      <h2 className="mt-12 text-lg font-semibold">The terms, in full</h2>
      <dl className="mt-4 space-y-4">
        {TERMS.map(([term, detail]) => (
          <div key={term} className="ds-surface p-4">
            <dt className="text-sm font-semibold">{term}</dt>
            <dd className="mt-1 text-sm text-[var(--muted-foreground)]">
              {detail}
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-12 text-lg font-semibold">Available embeds</h2>
      {EMBEDDABLE_TOOLS.map((tool) => (
        <section key={tool.slug} className="ds-surface mt-4">
          <header className="ds-surface-header">
            <h3 className="text-sm font-semibold">{tool.name}</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {tool.summary}
            </p>
          </header>
          <div className="p-4">
            <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-xs">
              <code>{embedSnippet(tool, ORIGIN)}</code>
            </pre>
            <p className="mt-3 text-sm">
              <a
                className="underline underline-offset-2"
                href={`/embed/${tool.slug}`}
              >
                Open the embed on its own
              </a>
              {' · '}
              <a
                className="underline underline-offset-2"
                href={tool.canonicalPath}
              >
                the full {tool.name}
              </a>
            </p>
          </div>
        </section>
      ))}

      <h2 className="mt-12 text-lg font-semibold">Why it is an iframe</h2>
      <p className="ds-description mt-3">
        A one-line <code>&lt;script&gt;</code> widget would be easier to ship
        and worse for both of us. A script runs inside your page, with your
        permissions: it could read what your visitors type and you would have to
        take our word that it does not. A cross-origin iframe cannot. We cannot
        see your page and you do not have to trust us about it — which is the
        same guarantee we make to everyone who uses the tools directly.
      </p>

      <h2 className="mt-12 text-lg font-semibold">
        Want a tool that is not here?
      </h2>
      <p className="ds-description mt-3">
        Embeds are limited to tools that take text and return text — no file
        pickers, deliberately. Asking a reader to hand a document to a frame
        inside a page they may not recognise is not a thing we want to teach
        anyone to do. If a text tool you want is missing, the project is MIT
        licensed and open to a request on GitHub.
      </p>
    </div>
  );
}
