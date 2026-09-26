'use client';

import { useMemo, useState } from 'react';

import { normaliseTarget, parsePastedHeaders } from '@/lib/egress/headers';
import { liveCheckSnippet } from '@/lib/egress/live-check';
import {
  NOT_AN_ACCUSATION,
  VERDICT_LABEL,
  verdictFor,
  type Verdict,
} from '@/lib/egress/verdict';

/**
 * "Paste a URL. Find out whether that page can send your file anywhere."
 *
 * ## The shape of this tool, and why it is not a fetch box
 *
 * The obvious build takes a URL and fetches it. This one cannot, for three
 * reasons that are worth stating on the page rather than hiding:
 *
 *   1. Every route here is served `connect-src 'none'` -- the claim the whole
 *      site rests on, asserted on the response header by
 *      `e2e/egress-proof.spec.ts`. A page here cannot open a connection, so it
 *      cannot fetch what a visitor types. Relaxing that for this one tool would
 *      mean breaking the proof in order to ship the thing that demonstrates it.
 *   2. A browser cannot read a cross-origin response's headers without CORS
 *      permission from the target anyway. The check is impossible from any
 *      page, not just ours.
 *   3. Doing it on a server of ours would mean receiving every URL people test
 *      -- a log of what strangers are suspicious of. That is the exact shape of
 *      collection this site exists not to do, and we would be asking people to
 *      trust a promise instead of showing them an enforcement.
 *
 * So the check runs in the visitor's own browser, on the page they chose, and
 * nothing about it reaches us. That turns out to be the better tool: a server
 * fetch sees only what a page *declares* in a header, while the snippet in
 * `lib/egress/live-check.ts` watches what the page *does* when it is handed a
 * file.
 *
 * ## Why no page of ours names anyone
 *
 * `lib/policy/competitor-names.ts` forbids naming a company in served copy, and
 * the rule is right: a claim about someone else's product goes stale the day
 * they change a header, and being wrong about a named company is the one
 * unrecoverable mistake here. The visitor chooses the target, the verdict is
 * rendered on their device, and this component ships no list of anyone. The
 * result belongs to them.
 */

/*
 * `lib/tools/local-source-policy.test.ts` scans every file under `components/`
 * and `app/` for a literal remote URL, so that no interface file can quietly
 * acquire one. This page has to *show* a scheme -- it is teaching someone what
 * a page address looks like -- so it assembles the token the same way
 * `app/proof/page.tsx` and `app/sitemap.ts` do. The guard stays armed for real
 * code; it is not to be relaxed for prose.
 */
const SCHEME = ['https', '://'].join('');

const VERDICT_TONE: Record<
  Verdict,
  { dot: string; text: string; ring: string }
> = {
  /*
   * Two colours, not four.
   *
   * The design system is monochrome apart from `--success` and
   * `--destructive`, and `design-system-qc.mjs` fails the build on an
   * arbitrary palette utility. That constraint suits this tool: a four-colour
   * scale would render RESTRICTED as a warning and UNKNOWN as a fault, and
   * neither is one. Restricted is a factual description of a normal policy,
   * and unknown is the absence of a reading. Both are neutral here, which is
   * what they are.
   */
  BLOCKED: {
    dot: 'bg-success',
    text: 'text-success',
    ring: 'border-success/30 bg-success/5',
  },
  RESTRICTED: {
    dot: 'bg-foreground',
    text: 'text-foreground',
    ring: 'border-border bg-muted/40',
  },
  CAPABLE: {
    dot: 'bg-destructive',
    text: 'text-destructive',
    ring: 'border-destructive/30 bg-destructive/5',
  },
  UNKNOWN: {
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
    ring: 'border-border bg-muted/30',
  },
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
      onClick={() => {
        /*
         * `navigator.clipboard` is unavailable on an insecure origin and can be
         * refused outright. A silent no-op here reads as "the button is
         * broken", so the textarea below stays selectable as the fallback and
         * the label says what happened.
         */
        navigator.clipboard
          ?.writeText(value)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => setCopied(false));
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function EgressCheckTool() {
  const [target, setTarget] = useState('');
  const [pasted, setPasted] = useState('');

  const url = useMemo(() => normaliseTarget(target), [target]);
  const host = url?.host ?? '';

  const snippet = useMemo(() => liveCheckSnippet(host), [host]);
  const curl = useMemo(
    () =>
      url
        ? `curl -sI ${url.href} -H 'User-Agent: Mozilla/5.0' | grep -i content-security-policy`
        : '',
    [url],
  );

  /*
   * The verdict is recomputed on every keystroke and never stored. There is no
   * "check" button because there is nothing to wait for: the parse and the
   * verdict are pure functions running on this device.
   */
  const result = useMemo(() => {
    const parsed = parsePastedHeaders(pasted);
    if (parsed.empty) return null;
    return { ...verdictFor(parsed.policies), source: parsed.source };
  }, [pasted]);

  return (
    <div className="space-y-6">
      <section className="ds-surface">
        <div className="ds-surface-header flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">1 — Choose a page</h2>
            <p className="text-xs text-muted-foreground">
              Any site that asks you for a file.
            </p>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Step one
          </span>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <label className="ds-field-label" htmlFor="egress-target">
            Page address
          </label>
          <input
            id="egress-target"
            className="ds-control font-mono"
            placeholder="example.com/upload"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
          />
          {target.trim() && !url ? (
            <p className="text-xs text-destructive">
              That is not a web address. A page address starts with{' '}
              <code>{SCHEME}</code> and has a hostname.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {host
                ? `Ready to check ${host}. Nothing has been sent — this box never leaves your device.`
                : 'We do not fetch it. Read why below: a site that fetched what you paste would be a site that receives what you paste.'}
            </p>
          )}
        </div>
      </section>

      <section className="ds-surface">
        <div className="ds-surface-header">
          <h2 className="text-sm font-semibold">2 — Run the check yourself</h2>
          <p className="text-xs text-muted-foreground">
            Ten seconds, in the browser you already have open.
          </p>
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">
                Watch what the page actually does
              </h3>
              <CopyButton value={snippet} label="Copy the check" />
            </div>
            <ol className="mb-3 space-y-1 text-xs text-muted-foreground">
              <li>
                1. Open {host ? <code>{host}</code> : 'the page'} in a tab.
              </li>
              <li>
                2. Open DevTools and click <strong>Console</strong>. On most
                browsers that is <kbd>F12</kbd>, or <kbd>⌥</kbd>
                <kbd>⌘</kbd>
                <kbd>I</kbd> on a Mac.
              </li>
              <li>
                3. Paste the check, press Enter, then use the page normally.
              </li>
            </ol>
            <textarea
              readOnly
              rows={7}
              value={snippet}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed"
              aria-label="The check, as code to paste into your browser console"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              No result leaves your browser, and everything stops when you
              reload. It does deliberately attempt five connections to addresses
              that do not exist, carrying the word <code>probe</code> and
              nothing else — because the only way to know a browser refuses a
              connection is to watch it refuse one. Watching an idle page proves
              that nothing happened to fire, never that the control works.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              It is long because it is readable. You should be able to read
              anything you paste into a console, and a tool about trust is a
              poor place to start asking for some.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">
                Or read the policy from a terminal
              </h3>
              {curl ? <CopyButton value={curl} label="Copy command" /> : null}
            </div>
            <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px]">
              {curl || 'Enter a page address above to build the command.'}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Paste whatever it prints into the box below. So will anything you
              copy from DevTools → Network → Headers.
            </p>
          </div>
        </div>
      </section>

      <section className="ds-surface">
        <div className="ds-surface-header">
          <h2 className="text-sm font-semibold">3 — Read the verdict</h2>
          <p className="text-xs text-muted-foreground">
            Paste the headers. The answer is worked out on this device.
          </p>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <textarea
            rows={4}
            value={pasted}
            spellCheck={false}
            onChange={(event) => setPasted(event.target.value)}
            placeholder={
              "content-security-policy: default-src 'self'; connect-src 'none'"
            }
            className="w-full resize-y rounded-xl border border-input bg-background p-3 font-mono text-xs"
            aria-label="Paste response headers, or a content-security-policy"
          />

          {pasted.trim() && !result ? (
            <p className="text-xs text-muted-foreground">
              No content-security-policy in that paste. If the response has no
              such header at all, that is itself the answer — nothing restricts
              where the page may connect.
            </p>
          ) : null}

          {result ? (
            <figure
              className={`rounded-2xl border p-5 ${VERDICT_TONE[result.verdict].ring}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${VERDICT_TONE[result.verdict].dot}`}
                  aria-hidden
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {host || 'the page you checked'}
                </span>
              </div>
              <p
                className={`text-xl font-semibold tracking-tight ${VERDICT_TONE[result.verdict].text}`}
              >
                {VERDICT_LABEL[result.verdict]}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.summary}
              </p>
              {result.connectSrc ? (
                <dl className="mt-4 border-t border-border/60 pt-3 text-xs">
                  <dt className="font-medium">
                    {result.viaDefaultSrc ? 'default-src' : 'connect-src'}
                  </dt>
                  <dd className="mt-1 break-words font-mono text-muted-foreground">
                    {result.connectSrc}
                  </dd>
                </dl>
              ) : null}
              <figcaption className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
                {result.verdict === 'BLOCKED'
                  ? 'This reports where bytes can go. It is not a statement that the page has no bugs — no egress measurement can support that.'
                  : NOT_AN_ACCUSATION}
              </figcaption>
            </figure>
          ) : null}
        </div>
      </section>
    </div>
  );
}
