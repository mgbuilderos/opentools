/**
 * Reads each page's Content-Security-Policy and records the verdict per tab.
 *
 * The header is the only reliable source: most sites set CSP as a response
 * header rather than a meta tag, and a content script cannot see response
 * headers. So this listens observationally — `onHeadersReceived` without
 * blocking, which Manifest V3 permits — and never modifies a request.
 *
 * Nothing leaves this machine. The extension makes no network requests of its
 * own; it only reads headers the browser was already receiving, and stores the
 * result in memory keyed by tab. A tool that told you about privacy while
 * phoning home would be self-defeating.
 */

import { verdictFromCsp } from './verdict.js';

/** tabId -> { verdict, connectSrc, host, reportOnly } */
const perTab = new Map();

const BADGE = {
  BLOCKED: { text: '✓', color: '#16a34a' },
  RESTRICTED: { text: '~', color: '#8a5b12' },
  CAPABLE: { text: '!', color: '#6b7280' },
  UNKNOWN: { text: '?', color: '#6b7280' },
};

function paint(tabId, verdict) {
  const style = BADGE[verdict] ?? BADGE.UNKNOWN;
  chrome.action.setBadgeText({ tabId, text: style.text });
  chrome.action.setBadgeBackgroundColor({ tabId, color: style.color });
}

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    // Only the document itself. Sub-resources carry their own headers and are
    // not what the user is being told about.
    if (details.type !== 'main_frame' || details.tabId < 0) return;

    const headers = details.responseHeaders ?? [];
    const find = (name) =>
      headers.find((h) => h.name.toLowerCase() === name)?.value ?? '';

    const enforced = find('content-security-policy');
    const reported = find('content-security-policy-report-only');
    const reportOnly = !enforced && Boolean(reported);
    const { verdict, connectSrc } = verdictFromCsp(
      enforced || reported,
      reportOnly,
    );

    let host = '';
    try {
      host = new URL(details.url).host;
    } catch {
      /* Leave it blank rather than guessing. */
    }

    perTab.set(details.tabId, { verdict, connectSrc, host, reportOnly });
    paint(details.tabId, verdict);
  },
  { urls: ['http://*/*', 'https://*/*'] },
  ['responseHeaders'],
);

// A tab that has not been read yet must not inherit the previous page's badge.
chrome.tabs.onRemoved.addListener((tabId) => perTab.delete(tabId));

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type !== 'get-verdict') return undefined;
  const state = perTab.get(message.tabId) ?? {
    verdict: 'UNKNOWN',
    connectSrc: null,
    host: '',
    reportOnly: false,
  };
  respond(state);
  return true;
});
