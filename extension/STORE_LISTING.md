# Store listing — copy to paste into the developer dashboards

Everything below is ready to paste. Character counts are against Chrome's
limits. Firefox and Edge take the same copy; their fields are a subset.

**The one rule for this listing:** it is not an OpenTools advert. The extension
answers a question about whatever page you are on, including sites that compete
with OpenTools. Copy that turns it into a funnel makes it both less honest and
less likely to pass review.

---

## Name — 31 / 75

```
Can this page upload your file?
```

Leave it as a question. It is the question the user already has in their head,
which is also how they search.

## Short description — 113 / 132

```
Before you upload a file, see whether the page is able to send it anywhere. Reads the site's own security policy.
```

This is also the `description` field in `manifest.json`, and the two have to stay
identical — whichever one you read, the other is what users see. They had
drifted: the manifest carried different copy at 152 characters, over Chrome's
limit of 132, so the upload would have been rejected. `npm run extension:package`
now checks the length, and `scripts/package-extension.test.ts` checks that the
manifest still matches this block.

## Category

```
Privacy & Security
```

## Single purpose (required by Chrome)

```
The extension reports whether the page the user is currently viewing is technically capable of transmitting data off the device, by reading that page's Content-Security-Policy response header and showing the result in the toolbar.
```

## Detailed description

```
Every site that takes your file says it respects your privacy. None of them give you a way to check.

There is a way. A page served with `connect-src 'none'` cannot open a network connection at all — the browser itself refuses, so the guarantee is enforced rather than promised. That instruction travels in a response header, and headers can be read. This extension reads it and tells you what it says.

Click the icon on any page and you get one of four answers:

✓ Blocked — the page cannot open a network connection. The browser will refuse.
~ Restricted — a policy exists and permits some destinations, not others.
! Capable — no such restriction, so the page is able to transmit.
? Unknown — the policy could not be read. This is not a finding.

WHAT "CAPABLE" DOES NOT MEAN

Capable is not an accusation, and the popup says so. Processing files on a server is a normal, legitimate design, and most sites that do it say so openly. What you have not had until now is any way to tell which kind of page you are on.

The extension reports capability, never intent. A page that can transmit may never do so. It says nothing about bugs, and nothing about what a future version of that page might do. A report-only policy is downgraded to Capable, because the browser does not enforce it — treating it as protection would be the same mistake in reverse.

PRIVACY

The extension makes no network requests of its own. It reads one response header the browser was already receiving, keeps the verdict in memory for the open tab, and discards it when you close the tab. It does not request permission to store anything on disk. There is no account, no analytics, no third party, and no remote code.

The whole thing is 254 lines of JavaScript and it is public. Every claim above can be checked:
https://github.com/mgbuilderos/opentools/tree/main/extension

WHO MADE IT

It came out of OpenTools (getopentools.com), a set of file utilities that run entirely in your browser. Building those meant learning to read this header properly — so this extension answers the question for any site, including the ones we compete with. Point it at us too.
```

## Permission justifications (Chrome asks per permission)

**`webRequest`**

```
Reading a response header is the only way to determine whether a page is permitted to open network connections, and webRequest is the only API that exposes response headers. The listener is registered observationally via chrome.webRequest.onHeadersReceived WITHOUT the "blocking" option, so the extension cannot read, modify, delay or block any request. It immediately discards every event whose type is not "main_frame", so sub-resources, scripts, XHR and iframes are never examined. The only headers read are Content-Security-Policy and Content-Security-Policy-Report-Only.
```

**Host permissions (`http://*/*`, `https://*/*`)**

```
The question the extension answers — "can this page transmit my file?" — is about whichever page the user has chosen to open, so the header must be readable on any site the user visits. Narrower host permissions would make the extension silently useless on exactly the pages a user most wants to check. Nothing is read on sites the user does not visit, and on the sites they do visit the extension reads a single response header of the top-level document and nothing else.
```

## Data usage disclosures

Tick **nothing**. Then:

- Does it collect personally identifiable information? **No**
- Health, financial, authentication, personal communications, location, web
  history, user activity, website content? **No** to all
- Sold to third parties? **No**
- Used or transferred for purposes unrelated to the single purpose? **No**
- Used to determine creditworthiness or for lending? **No**

The "web history" answer deserves care and is still **No**: the extension never
records which pages were visited. A hostname is shown in the popup for the tab
in front of you and is discarded when the tab closes.

## Privacy policy URL

```
https://github.com/mgbuilderos/opentools/blob/main/extension/PRIVACY.md
```

## Homepage URL

```
https://getopentools.com
```

---

## Assets

| Asset | Required | Status |
| :--- | :--- | :--- |
| Icon 128×128 | Chrome, required | **Done** — `icons/icon-128.png` |
| Screenshot 1280×800 or 640×400 | Chrome, at least 1 | **Needed — see below** |
| Small promo tile 440×280 | Optional | Not done; skip for a first listing |

### The screenshots are the one thing that needs you

They have to be taken from the extension actually running, which needs a real
Chrome profile with it loaded — this environment cannot do it. Load it with
`chrome://extensions → Developer mode → Load unpacked → select extension/`,
then capture at **1280×800**:

1. **The popup showing `✓ Blocked`** on `getopentools.com` — the proof shot.
2. **The popup showing `! Capable`** on any site that uploads files. Do not
   name a competitor in the caption; the verdict speaks and a named comparison
   invites both a takedown request and a worse first impression.
3. Optional: **`~ Restricted`**, if you find one, because it shows the tool is
   making a real distinction rather than a binary judgement.

Two is enough. One is allowed.

---

## Costs, and the free route

| Store | Fee | Review |
| :--- | :--- | :--- |
| Chrome Web Store | **one-time $5** developer registration | days, and broad host permissions draw scrutiny |
| Firefox Add-ons | free | usually fast |
| Microsoft Edge Add-ons | free | days |

Firefox and Edge cost nothing, take the same copy, and would test whether the
idea lands before you spend anything. Chrome is where the users are.

Note for the growth playbook: the $5 is a one-time registration, not a
subscription, and constraint C9 ("no spend up front") was written when the plan
also assumed $5/month for Workers Paid — which the 2026-09-19 cache fix made
unnecessary.

---

## Before you submit

**Build the archive first.** The stores take a ZIP, not a folder, and
`zip -r` produces one all three reject or mis-ship — it nests `manifest.json`
under `extension/`, and it puts this file and `PRIVACY.md` inside the add-on
users download:

```bash
npm run extension:package
```

That writes `dist/extension/opentools-extension-<version>.zip` and refuses to
write anything if the manifest would be rejected. It is also what checks the two
ticked items below, so those are no longer yours to remember:

- [ ] Load the unpacked extension and confirm all four verdicts still render
- [ ] Screenshots taken at 1280×800 — **the one thing nothing here can do**
- [ ] `PRIVACY.md` is pushed to `main` so its URL resolves publicly
- [ ] Bump `version` in `manifest.json` if this is not the first upload — it is
      still `0.1.0`, which is correct until something has actually shipped. The
      packaging step only checks the shape is one the stores parse, not that you
      remembered to raise it
- [x] The description fits Chrome's 132 characters and matches the block above —
      checked
- [x] The manifest declares only `webRequest` — checked against
      `DECLARED_PERMISSIONS` in `scripts/package-extension.mjs`. The unused
      `storage` permission was removed on 2026-09-19; adding any permission
      means updating that list, the justification section above and the
      disclosures together, which is the point of checking it there
