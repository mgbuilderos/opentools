# Privacy policy — "Can this page upload your file?"

_Last updated: 2026-09-19_

This extension collects nothing, stores nothing, and sends nothing anywhere.

That is not a promise about intent; it is a description of what the code does,
and the code is public — every claim below can be checked in
[`background.js`](./background.js), which is 78 lines long.

## What it collects

Nothing. There is no account, no identifier, no analytics, and no telemetry.

## What it reads

One response header, `Content-Security-Policy` (and its `-Report-Only`
variant), from the **top-level document of the page you are looking at**.

It reads this through `chrome.webRequest.onHeadersReceived`, registered
**observationally** — without the `blocking` option — so it cannot read, alter,
delay or block any request. The listener discards everything that is not
`main_frame`, so sub-resources, scripts, images, XHR and iframes are never
examined.

It never reads page content, form fields, files you select, URLs you visit
beyond the hostname shown in its own popup, cookies, history, or anything you
type.

## What it stores

One verdict per open tab — the four-state result (Blocked / Restricted /
Capable / Unknown), the `connect-src` value it was derived from, and the
hostname — held in memory in the extension's service worker.

It is deleted when you close the tab (`chrome.tabs.onRemoved`), and everything
is lost when the browser restarts. The extension does **not** request the
`storage` permission, so it has no means of writing to disk even if it tried.

## What it sends

Nothing. The extension makes no network requests of its own — no server, no
API, no CDN, no error reporting. A tool that lectured you about privacy while
phoning home would be self-defeating.

## Permissions, and why each exists

| Permission | Why |
| :--- | :--- |
| `webRequest` | The only way to read a response header. Used observationally and filtered to the top-level document. |
| `host_permissions` (`http://*/*`, `https://*/*`) | The question — "can *this* page transmit my file?" — is about whichever page you are on, so the header must be readable on any site you choose to visit. Nothing is read on sites you do not visit. |

There is no `storage` permission, no `tabs` content access, no `scripting`, and
no remote code.

## Third parties

There are none. No analytics provider, no crash reporter, no advertising
network, no hosted dependency. The extension has no runtime dependencies at all.

## Changes

If a future version collects anything, this file changes in the same commit
that introduces it, and the extension's permissions will visibly change too —
Chrome requires your consent for new permissions.

## Contact

Open an issue at <https://github.com/mgbuilderos/opentools>.
