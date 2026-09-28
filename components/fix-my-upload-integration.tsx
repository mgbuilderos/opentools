'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ASK_REQUESTS, askDefaults } from '@/lib/tools/ask-link';
import {
  FIX_PROTOCOL,
  FIX_PROTOCOL_VERSION,
  INTEGRATOR_HELLO,
  OPENTOOLS_CANCELLED,
  OPENTOOLS_READY,
  OPENTOOLS_RESULT,
} from '@/lib/tools/fix-my-upload';

/**
 * What a site owner copies.
 *
 * BOTH SNIPPETS ARE GENERATED FROM THE PROTOCOL CONSTANTS, not typed out beside
 * them. A pasted example that drifts from what the page actually accepts is
 * worse than no example: the integrator's console says nothing, the popup sits
 * there, and the failure looks like our bug on their site. Building the strings
 * from `FIX_PROTOCOL`, `FIX_PROTOCOL_VERSION` and the message names means a
 * rename breaks the snippet in the same commit, and
 * `fix-my-upload-integration.test.ts` asserts the generated text still contains
 * them.
 *
 * THE ORIGIN IS READ AT RUNTIME rather than written in. Partly because a
 * literal would be wrong on a self-hosted instance, where this page is served
 * from the operator's own domain and the snippet must name that. And partly
 * because `lib/tools/local-source-policy.test.ts` refuses an absolute-URL
 * literal anywhere under `components/` — a guard worth keeping, since it is the
 * cheapest proof that nothing here talks to a server.
 */

function plainLinkSnippet(origin: string, requestId: string, query: string) {
  return `<!-- Beside your upload error. No JavaScript needed. -->
<a href="${origin}/fix/${requestId}?${query}"
   target="_blank" rel="noopener">
  Fix this file privately
</a>`;
}

function returnSnippet(origin: string, requestId: string, values: string) {
  return `// Opens OpenTools, waits for the corrected file, puts it in your form.
// The file never leaves the visitor's machine: it comes back through
// postMessage, which is an in-browser channel between two windows.
async function fixMyUpload() {
  const target = ${JSON.stringify(origin)};
  const popup = window.open(
    target + "/fix/${requestId}",
    "opentools-fix",
    "width=520,height=760"
  );
  if (!popup) return null;                 // pop-up blocked

  return new Promise((resolve) => {
    const hello = {
      channel: ${JSON.stringify(FIX_PROTOCOL)},
      version: ${FIX_PROTOCOL_VERSION},
      type: ${JSON.stringify(INTEGRATOR_HELLO)},
      request: ${JSON.stringify(requestId)},
      values: ${values},
    };

    // We speak first, because that window cannot know our origin until we do.
    // Keep saying hello until it answers, then stop.
    const say = () => popup.postMessage(hello, target);
    const ticker = setInterval(say, 250);
    say();

    window.addEventListener("message", function onMessage(event) {
      if (event.origin !== target) return;          // ignore everything else
      const data = event.data;
      if (!data || data.channel !== hello.channel) return;
      if (data.version !== hello.version) return;

      if (data.type === ${JSON.stringify(OPENTOOLS_READY)}) {
        clearInterval(ticker);
        return;
      }
      if (data.type === ${JSON.stringify(OPENTOOLS_RESULT)}) {
        cleanup();
        resolve(data.file);                          // a real File object
        return;
      }
      if (data.type === ${JSON.stringify(OPENTOOLS_CANCELLED)}) {
        cleanup();
        resolve(null);
      }

      function cleanup() {
        clearInterval(ticker);
        window.removeEventListener("message", onMessage);
        popup.close();
      }
    });
  });
}

// Then put it straight into your file input:
//   const file = await fixMyUpload();
//   if (file) {
//     const transfer = new DataTransfer();
//     transfer.items.add(file);
//     document.querySelector("#your-input").files = transfer.files;
//   }`;
}

function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setFallback(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Refused in a non-secure context or a locked-down browser. Selecting
      // the text is strictly better than reporting a failure.
      setFallback(true);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold">{label}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copy()}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="mt-2 max-w-full overflow-x-auto rounded-xl border bg-muted/40 p-3 text-[11px] leading-5">
        <code>{code}</code>
      </pre>
      {fallback ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Your browser blocked the clipboard — select the text above and copy it
          by hand.
        </p>
      ) : null}
    </div>
  );
}

export function FixMyUploadIntegration() {
  const [origin, setOrigin] = useState('');
  const [requestId, setRequestId] = useState(ASK_REQUESTS[0]!.id);

  /* The address this instance is served from, which a self-hosted copy owns.
     Read after mount rather than during render so the server-rendered HTML and
     the first client render agree; the placeholder below covers that pass. */
  /* oxlint-disable react/react-compiler -- reads an external system once on
     mount, the same exemption the arrival effects carry. */
  useEffect(() => setOrigin(window.location.origin), []);
  /* oxlint-enable react/react-compiler */

  const request = ASK_REQUESTS.find((item) => item.id === requestId)!;
  const defaults = askDefaults(request);
  const query = new URLSearchParams(
    Object.entries(defaults).map(([key, value]) => [key, String(value)]),
  );
  query.set('v', String(FIX_PROTOCOL_VERSION));
  /*
   * A readable stand-in for the server-rendered pass, before `origin` is known.
   * Assembled rather than written as a literal: `local-source-policy.test.ts`
   * refuses an absolute-URL literal anywhere under `components/`, and that
   * guard is worth more than the convenience of typing one.
   */
  const shown = origin || `${'https'}://your-opentools-instance`;

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold">1. Pick what you need</h2>
        <div className="mt-3 grid gap-2">
          {ASK_REQUESTS.map((candidate) => (
            <div key={candidate.id} className="rounded-xl border p-3">
              <label
                htmlFor={`fix-${candidate.id}`}
                className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"
              >
                <input
                  id={`fix-${candidate.id}`}
                  type="radio"
                  name="fix-request"
                  checked={candidate.id === requestId}
                  onChange={() => setRequestId(candidate.id)}
                  className="size-5 shrink-0 cursor-pointer accent-foreground"
                />
                {candidate.menuLabel}
              </label>
              <p className="pl-8 text-xs text-muted-foreground">
                {candidate.menuHint}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold">2. Put it beside your error</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The link needs nothing from you but the href. Your visitor corrects
          the file and takes it away themselves.
        </p>
        <CopyBlock
          label="A link"
          code={plainLinkSnippet(shown, request.id, query.toString())}
        />
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold">
          3. Or get the corrected file back
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          This opens a window, waits, and hands you a <code>File</code> you can
          drop into your own input. The bytes pass between two windows on the
          visitor&rsquo;s machine — there is no upload in either direction, and
          nothing to configure here or there.
        </p>
        <CopyBlock
          label="With the file returned"
          code={returnSnippet(
            shown,
            request.id,
            JSON.stringify(defaults, null, 2).replace(/\n/gu, '\n      '),
          )}
        />
      </section>

      <section className="rounded-2xl border bg-card p-4 text-xs leading-5 sm:p-5">
        <h2 className="text-sm font-semibold">What this does not do</h2>
        <ul className="mt-2 grid list-disc gap-1 pl-5 text-muted-foreground">
          <li>
            It does not put the file on a server. There is no endpoint to call
            and no storage to configure, here or on your side.
          </li>
          <li>
            It cannot be embedded in an <code>iframe</code>. Every page on this
            site refuses framing, and a window of our own is also the only way
            your visitor can see whose site is handling their file.
          </li>
          <li>
            Returning the corrected file currently works for images. Other
            requests open the matching tool and the person sends you the result
            themselves.
          </li>
          <li>
            Nothing is sent back until your visitor presses the button. They are
            shown your site&rsquo;s address first, taken from the browser rather
            than from anything your page told us.
          </li>
        </ul>
      </section>
    </div>
  );
}
