# FUTO microgrant — application draft

**Send to:** `grantapps@futo.org`
**Programme:** Microgrants, $1,000–$5,000, small or early-stage projects
**Their stated mission:** *"fund open source projects and people working to
challenge the tech oligopoly"* — past grantees include Signal, Tor and Blender.

> **Edit this and send it yourself.** Two things are marked **[YOU]**. Keep it
> short — they receive a lot of these, and brevity is a courtesy. Do not pad it
> to look more substantial; the verifiable claim is doing the work.

---

## Subject

`Microgrant request — OpenTools: 550 browser tools that are provably unable to upload your files`

## Body

> Hello,
>
> I'm applying for a microgrant for **OpenTools** (getopentools.com) — 550
> free, MIT-licensed utilities that run entirely inside the browser tab. PDF,
> image, data, text, developer and everyday calculators. No account, no ads, no
> trackers, no paid tier, and nothing gated.
>
> **The part I think is worth your attention isn't the tools — it's that the
> privacy claim is checkable rather than asserted.**
>
> Every "private" file tool on the web says it respects your data. None of them
> give you a way to verify it. The pages here are served with
> `connect-src 'none'`, which makes the browser itself refuse every fetch, XHR,
> WebSocket and beacon the page attempts. The guarantee is enforced by the
> user's browser, not promised by me, and anyone can confirm it from devtools in
> about ten seconds.
>
> On every release an automated test attempts five different exfiltration
> vectors, then pushes a real file through a real tool and asserts zero
> off-origin bytes — in Chromium and WebKit. I also verified the detector isn't
> vacuous by pointing it at a page that genuinely does load a cross-origin
> resource, where it correctly fails. The whole site additionally runs from one
> container with `--network none` and still works.
>
> Two things I won't claim: that there are no bugs, and that this covers every
> browser and device. The evidence covers two engines on the deployed build.
>
> **What the grant would fund**, in order:
>
> 1. **A browser extension that checks any page, not just mine** — it reads the
>    site's own security policy and tells you whether the page you're about to
>    upload a file to is capable of transmitting it. Most useful on other
>    people's sites. A working version exists; it needs review-readiness and
>    publishing.
> 2. **Writing the verification method up properly** so other projects can
>    adopt it. Two failure modes make naïve implementations report the opposite
>    of the truth: a CSP-blocked `navigator.sendBeacon` still returns `true`,
>    and Chromium raises a request event for a request it is about to block
>    where WebKit raises nothing.
> 3. **Hosting and the time to keep it running.** I'm one person, and the site
>    runs on a free tier whose page-cache write allowance a single day of
>    normal development exhausts. Once it is gone every page is served
>    uncached, and under crawl load the worker starts returning 503s on the
>    content pages. It costs $5 a month to remove that entirely; I have been
>    unwilling to spend it before the project earns anything.
>
> It's early and small — real traffic is in the dozens per day, and the
> repository has almost no stars. I'm not going to dress that up. What exists is
> a working product, an unusual and checkable privacy property, and a method I
> think is worth other people using.
>
> - Site: https://getopentools.com
> - Source (MIT): https://github.com/mgbuilderos/opentools
> - The egress proof and its limits: `docs/EGRESS_PROOF.md` in that repository
>
> **[YOU]** — one or two sentences on who you are and why you built this.
> Write this yourself; it is the part that cannot be ghostwritten and they will
> know.
>
> Thank you for reading,
> **[YOU]** — name, and a contact address you check.

---

## Why it's written this way

- **Leads with the verifiable claim, not the tool count.** FUTO funds Signal
  and Tor. A large number of utilities is not what interests them; a privacy
  guarantee that can be independently checked is.
- **The ask is a public good, not a feature.** The extension helps people
  evaluate *other* sites. Framed as "fund my product's roadmap" it reads as a
  business asking for free money; framed as a method others can adopt, it reads
  as the kind of thing they exist to fund.
- **It states the limits.** Their reviewers are technical and will spot an
  overclaim instantly. Saying what the evidence does *not* cover is what makes
  the rest believable.
- **It admits the project is small.** Hiding that would be found out in one
  click of the repository. Owning it costs nothing and buys credibility.
- **It's short.** A microgrant request that reads like a corporate proposal
  signals the wrong thing.

## Before sending — verified 2026-09-18

Everything a reviewer can click has been checked:

| Claim in the email | Checked | Result |
|---|---|---|
| Container pulls anonymously | anonymous token → manifest | **HTTP 200** — public |
| Repository is public and MIT | GitHub API | public, `MIT` |
| `docs/EGRESS_PROOF.md` exists at that path | raw.githubusercontent | **HTTP 200** |
| "almost no stars" | GitHub API | 1 star — the email is accurate |

(The first `curl` to ghcr.io returns 401. That is the registry's standard auth
challenge, not a private package; the real pull flow issues an anonymous token
and then succeeds. Do not "fix" it.)

Two things still to do, both yours:

- **Re-read the two [YOU] sections.** Generic answers there undo the rest.
- **Do not attach anything.** Links are enough, and attachments from strangers
  don't get opened.

## One thing to decide before you send

If FUTO replies, they may ask technical questions — that is what their
reviewers do. You have said you are not from an IT background and cannot
explain the implementation. That is not disqualifying and it is not something
to hide; what matters is that you answer honestly and quickly rather than
guessing. Two workable options:

1. **Say nothing about it now** and handle questions when they come, asking for
   help drafting the reply. Most likely outcome: fine.
2. **Say it plainly in your [YOU] paragraph** — that you are not an engineer,
   that you built this because you wanted the tools to exist, and that the
   verification method is the part you care about. Some reviewers respond well
   to that; it also sets expectations so a technical reply is not a surprise.

Either is defensible. What is not defensible is answering a technical question
with something you have not checked — that is the one thing that would cost you
the application.

## Also worth doing (not a blocker)

The repository description reads **"All-in-one micro tools"**, which says
nothing about the property the whole email rests on. A reviewer clicking
through from the email lands on that first. Something closer to *"550 browser
tools that are provably unable to upload your files — MIT, no server, no
account"* would carry the argument. It is your repository, so change it
yourself if you agree.
