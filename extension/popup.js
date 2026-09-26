/**
 * The popup. Its whole job is to say one true thing clearly.
 *
 * The wording below is the product. "This page can upload your file" is a
 * statement about capability, and it must never be dressed up as an accusation
 * — server-side processing is legitimate and most sites using it say so. What
 * a visitor lacks is any way to tell which kind of page they are on, and that
 * is the gap being filled.
 */

const COPY = {
  BLOCKED: {
    headline: 'This page cannot upload your file.',
    detail:
      "It is served with connect-src 'none', so your browser refuses every network request the page tries to make. That is enforced by the browser, not promised by the site.",
    caveat:
      'This says nothing about bugs, or about what a future version of the page might do. It is a check worth repeating, not a certificate.',
  },
  RESTRICTED: {
    headline: 'This page can send data to some places.',
    detail:
      'It sets a connect-src policy, but that policy permits certain destinations. Whether your file is among what gets sent is not something a header can tell you.',
    caveat:
      'Not a warning. Many pages legitimately need to talk to their own server.',
  },
  CAPABLE: {
    headline: 'This page is able to upload your file.',
    detail:
      'There is no connect-src restriction, so nothing stops the page sending what you give it. It may well not — but you are relying on a promise rather than on enforcement.',
    caveat:
      'This is not an accusation. Processing files on a server is a normal, legitimate design, and most sites that do it say so. The point is that you currently have no way to tell.',
  },
  UNKNOWN: {
    headline: 'Not checked yet.',
    detail:
      'Reload the page with the extension enabled and the policy will be read as it arrives.',
    caveat:
      'Internal browser pages and extension pages cannot be inspected, which is by design.',
  },
};

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const state = tab?.id
  ? await chrome.runtime.sendMessage({ type: 'get-verdict', tabId: tab.id })
  : null;

const verdict = state?.verdict ?? 'UNKNOWN';
const copy = COPY[verdict] ?? COPY.UNKNOWN;

document.getElementById('host').textContent = state?.host ?? '';
const headline = document.getElementById('headline');
headline.textContent = copy.headline;
headline.dataset.v = verdict;
document.getElementById('detail').textContent = copy.detail;
document.getElementById('caveat').textContent = state?.reportOnly
  ? 'The policy on this page is report-only, so the browser does not enforce it. ' +
    copy.caveat
  : copy.caveat;

if (state?.connectSrc) {
  const policy = document.getElementById('policy');
  // Name the directive the verdict actually came from. `connect-src` falls
  // back to `default-src`, and labelling an inherited list `connect-src` would
  // show the reader a directive their policy does not contain.
  policy.textContent = `${state.viaDefaultSrc ? 'default-src' : 'connect-src'} ${state.connectSrc}`;
  policy.hidden = false;
}
