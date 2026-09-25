/**
 * The egress detector, as something a visitor can run on a page we cannot see.
 *
 * ## Why a snippet and not a fetch
 *
 * The obvious build of "paste a URL and we will check it" is a server that
 * fetches the URL. This site cannot do that, and the reason is the point of the
 * site rather than a limitation of it:
 *
 *   1. Every route is served `connect-src 'none'`, asserted on the response
 *      header by `e2e/egress-proof.spec.ts`. A page here cannot open a network
 *      connection, so it cannot fetch anything a visitor types.
 *   2. Even without that, a browser cannot read a cross-origin response's
 *      headers or body without CORS permission from the target. The check is
 *      impossible from a page regardless of our policy.
 *   3. Doing it server-side would mean a box of ours receiving every URL
 *      people test -- which is a log of what strangers are suspicious of, and
 *      exactly the shape of collection this site exists to not do.
 *
 * So the browser that runs the check is the visitor's own, on the page they
 * chose, and nothing about it reaches us. That is a better answer than a server
 * would have given: it observes what the page *does* with a file, where a
 * server fetch only sees what the page *declares* in a header.
 *
 * ## What it ports from the test suite
 *
 * `e2e/egress-watch.ts` and `e2e/egress-proof.spec.ts` are Playwright-driven:
 * they attach to a browser from outside. The same three questions are asked
 * here from inside the page, and the traps documented in `docs/EGRESS_PROOF.md`
 * are carried over rather than rediscovered:
 *
 *   - **A blocked `sendBeacon` still returns `true`**, because the spec returns
 *     true once the beacon is queued and CSP refuses it afterwards. Asserting
 *     on the return value records a leak as a pass. This asserts on the
 *     violation event and on observed bytes, never on what a call returned.
 *   - **A request that CSP is about to kill still fires**, so "nothing was
 *     attempted" is the wrong question. The right one is whether anything
 *     received a response and whether any bytes moved.
 *   - **A report-only policy is not enforcement**, and is reported as such.
 *
 * ## Why this reads the policy through a violation
 *
 * JavaScript cannot read a response header, and `connect-src` most often
 * arrives in one. It *can* listen for `securitypolicyviolation`, whose event
 * carries `originalPolicy` -- the entire policy string, header included -- and
 * `disposition`, which distinguishes enforcement from report-only. So the
 * snippet provokes one deliberate violation and reads the policy out of the
 * complaint. If no violation arrives, connections are unrestricted, which is
 * itself the answer.
 */

/** Host used to provoke a connection. Reserved by RFC 2606: it resolves nowhere. */
const PROBE_HOST = 'https://egress-probe.invalid/probe';

/**
 * The snippet, as source a visitor pastes into their own DevTools console.
 *
 * Written as concatenated strings rather than template literals so that the
 * generated source contains no backticks -- it has to survive being copied
 * through a clipboard, a chat window and a console prompt without a quote
 * changing meaning on the way.
 */
export function liveCheckSnippet(targetLabel?: string): string {
  const label = (targetLabel ?? '').replace(/[^\w.:/-]/gu, '').slice(0, 120);
  return `/* Can this page send your file anywhere?  —  getopentools.com/proof/check
   Paste into DevTools › Console on the page you want to check, then press Enter.
   Reads this page only. Sends nothing, anywhere. Stops when you reload. */
(async () => {
  const PROBE = ${JSON.stringify(PROBE_HOST)};
  const here = location.host;
  const out = { policy: null, enforced: false, vectors: [], offOrigin: [], carried: [] };

  /* 1 — the policy, read out of a deliberate violation. A header cannot be read
        from script; the violation event carries the whole policy string. */
  const seen = await new Promise((resolve) => {
    let done = false;
    const onViolation = (event) => {
      if (done) return;
      done = true;
      resolve({ policy: event.originalPolicy || '', disposition: event.disposition || 'enforce', directive: event.effectiveDirective || '' });
    };
    document.addEventListener('securitypolicyviolation', onViolation, { once: true });
    try { fetch(PROBE, { mode: 'no-cors' }).catch(() => {}); } catch (e) {}
    setTimeout(() => { if (!done) { done = true; resolve(null); } }, 1200);
  });
  if (seen) { out.policy = seen.policy; out.enforced = seen.disposition !== 'report'; }

  /* 2 — five deliberate attempts. Watching an idle page proves only that
        nothing happened to fire; it never proves the control works. */
  const record = (name, refused, note) => out.vectors.push({ name, refused, note: note || '' });
  const violations = [];
  const collector = (e) => violations.push(e.effectiveDirective + '|' + e.disposition);
  document.addEventListener('securitypolicyviolation', collector);
  const violated = (fragment) => violations.some((v) => v.indexOf(fragment) === 0);

  try { await fetch(PROBE, { mode: 'no-cors' }); record('fetch → third party', false, 'a request completed'); }
  catch (e) { record('fetch → third party', true, String(e.message || e).slice(0, 70)); }

  try { await fetch(location.href, { method: 'POST', body: 'probe' }); record('POST → this origin', false, 'a request completed'); }
  catch (e) { record('POST → this origin', true, String(e.message || e).slice(0, 70)); }

  await new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', PROBE, true);
      xhr.onerror = () => { record('XMLHttpRequest', true, 'refused'); resolve(); };
      xhr.onload = () => { record('XMLHttpRequest', false, 'a request completed'); resolve(); };
      xhr.send('probe');
      setTimeout(resolve, 900);
    } catch (e) { record('XMLHttpRequest', true, String(e.message || e).slice(0, 70)); resolve(); }
  });

  try { const ws = new WebSocket('wss://egress-probe.invalid'); ws.close(); record('WebSocket', false, 'construction allowed'); }
  catch (e) { record('WebSocket', true, String(e.message || e).slice(0, 70)); }

  /* sendBeacon returns TRUE even when CSP refuses it — the spec returns true
     once the beacon is queued. Never assert on that boolean. Ask the policy. */
  try {
    navigator.sendBeacon(PROBE, 'probe');
    await new Promise((r) => setTimeout(r, 250));
    const blocked = violated('connect-src') || violated('default-src');
    record('navigator.sendBeacon', blocked, blocked ? 'refused by policy' : 'queued — return value is never evidence');
  } catch (e) { record('navigator.sendBeacon', true, String(e.message || e).slice(0, 70)); }

  /* 3 — bytes that actually moved, off this origin. */
  for (const entry of performance.getEntriesByType('resource')) {
    const url = entry.name || '';
    if (url.indexOf('blob:') === 0 || url.indexOf('data:') === 0) continue;
    let host = '';
    try { host = new URL(url, location.href).host; } catch (e) { continue; }
    if (!host || host === here) continue;
    out.offOrigin.push({ host, bytes: entry.transferSize || 0 });
  }

  /* 4 — keep watching. Anything with a body can carry a file out, including to
        this page's own origin, which is the case CSP does not cover. */
  const realFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method !== 'GET' || (init && init.body)) out.carried.push(method + ' ' + url);
    return realFetch.apply(this, arguments);
  };
  const realSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    if (body) out.carried.push('XHR with body');
    return realSend.apply(this, arguments);
  };
  const realBeacon = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
  if (realBeacon) navigator.sendBeacon = function (url, data) { out.carried.push('sendBeacon ' + url); return realBeacon(url, data); };

  /* The verdict, by the same rule the site and the extension use. */
  const directives = {};
  for (const part of (out.policy || '').split(';')) {
    const t = part.trim(); if (!t) continue;
    const gap = t.search(/\\s/); const name = (gap === -1 ? t : t.slice(0, gap)).toLowerCase();
    if (!(name in directives)) directives[name] = gap === -1 ? '' : t.slice(gap + 1).trim();
  }
  let source = directives['connect-src'];
  let viaDefault = false;
  if (source === undefined) { source = directives['default-src']; viaDefault = true; }
  let verdict;
  if (!out.policy || source === undefined) verdict = 'CAPABLE';
  else if (source === '' || /^'none'$/i.test(source.trim())) verdict = 'BLOCKED';
  else verdict = 'RESTRICTED';
  if (!out.enforced && verdict === 'BLOCKED') verdict = 'CAPABLE';

  const bytes = out.offOrigin.reduce((sum, e) => sum + e.bytes, 0);
  const copy = {
    BLOCKED: ['This page cannot send your file anywhere.', 'The browser refuses every connection it attempts' + (viaDefault ? ', through its default-src fallback' : '') + '. That is enforcement, not a promise.'],
    RESTRICTED: ['This page can send to a named list of destinations.', 'Connections are limited' + (viaDefault ? ' by default-src' : '') + ', but not switched off: ' + String(source).slice(0, 90)],
    CAPABLE: ['This page is able to send your file.', 'No policy stops it connecting anywhere.' + (out.policy && !out.enforced ? ' A report-only policy is declared, which the browser does not enforce.' : '')],
  }[verdict];

  /* An overlay rather than console text, because a result worth showing someone
     has to survive being screenshotted with the address bar in frame. */
  const tone = { BLOCKED: '#10b981', RESTRICTED: '#f59e0b', CAPABLE: '#f87171' }[verdict];
  document.getElementById('egress-check-card')?.remove();
  const card = document.createElement('div');
  card.id = 'egress-check-card';
  card.setAttribute('style', 'position:fixed;z-index:2147483647;top:16px;right:16px;width:380px;max-width:calc(100vw - 32px);background:#0b0f19;color:#e5e7eb;font:14px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;border:1px solid #1f2937;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.45);overflow:hidden');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = out.vectors.map((v) => '<div style="display:flex;gap:8px;padding:3px 0"><span style="color:' + (v.refused ? '#10b981' : '#f87171') + '">' + (v.refused ? '✓' : '!') + '</span><span style="flex:1">' + esc(v.name) + '</span><span style="color:#6b7280;font-size:12px">' + (v.refused ? 'refused' : 'allowed') + '</span></div>').join('');
  card.innerHTML =
    '<div style="padding:14px 16px;border-bottom:1px solid #1f2937;display:flex;align-items:center;gap:8px">' +
      '<span style="width:8px;height:8px;border-radius:50%;background:' + tone + '"></span>' +
      '<strong style="font-size:13px;letter-spacing:.02em">' + esc(here) + '</strong>' +
      '<button id="egress-check-close" style="margin-left:auto;background:none;border:0;color:#6b7280;cursor:pointer;font-size:18px;line-height:1">×</button>' +
    '</div>' +
    '<div style="padding:16px">' +
      '<div style="color:' + tone + ';font-size:17px;font-weight:600;margin-bottom:6px">' + esc(copy[0]) + '</div>' +
      '<div style="color:#9ca3af;font-size:13px;margin-bottom:14px">' + esc(copy[1]) + '</div>' +
      '<div style="border-top:1px solid #1f2937;padding-top:12px">' + rows + '</div>' +
      '<div style="border-top:1px solid #1f2937;margin-top:12px;padding-top:12px;color:#9ca3af;font-size:12.5px">' +
        esc(bytes === 0 ? 'No bytes have reached any third-party host on this page.' : String(bytes) + ' bytes reached ' + out.offOrigin.length + ' third-party host(s).') +
      '</div>' +
      '<div style="margin-top:10px;color:#6b7280;font-size:11.5px">' +
        (verdict === 'BLOCKED' ? 'Capability only. It says nothing about bugs.' : 'Able to send is not the same as does send. Server-side processing is a normal, legitimate design.') +
        '<br>Now use the page. Anything it tries to send is logged to the console.' +
      '</div>' +
    '</div>';
  document.body.appendChild(card);
  card.querySelector('#egress-check-close').onclick = () => card.remove();

  console.log('%c' + copy[0], 'color:' + tone + ';font-size:15px;font-weight:600');
  console.table(out.vectors);
  window.__egressCheck = out;
  return out;
})();
${label ? `/* checked: ${label} */\n` : ''}`;
}
