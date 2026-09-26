# App catalogues — the self-host channel that is open now

`docs/LAUNCH_KIT.md` covers the places you _talk_ about the project: AlternativeTo,
the subreddits, Show HN, and eventually awesome-selfhosted. This file covers the
places where someone **installs** it in two clicks without having heard of it —
the app catalogues that ship with a home or small-office server.

Why they are worth the trouble, in one line: a listing here reaches the person
`/self-host` was written for at the exact moment they are looking for something
to install, and none of them care how much domain authority getopentools.com has.

**Everything here was checked on 2026-09-26.** These projects change their rules;
re-read the linked CONTRIBUTING before submitting, and treat the tables below as
what was true on that date rather than as standing fact.

---

## What is already true, and what it unblocks

`docs/LAUNCH_KIT.md` §5 was written on 2026-09-18 and listed two blockers that
are now cleared. Verified today rather than assumed:

| Prerequisite                        | State on 2026-09-26                       | How it was checked                                                       |
| :---------------------------------- | :---------------------------------------- | :----------------------------------------------------------------------- |
| A tagged release exists             | **Yes** — `v0.1.0`, tagged 2026-09-18     | `git tag` in this repo                                                   |
| The image is published              | **Yes** — `0.1.0`, `0.1` and `latest`     | GHCR tag list                                                            |
| The image is **public**             | **Yes**                                   | Anonymous pull token → manifest fetch returned `200` with no credentials |
| Multi-architecture                  | **Yes** — `linux/amd64` and `linux/arm64` | The OCI image index for `latest`                                         |
| Build provenance                    | **Yes** — attestation manifests present   | Same index                                                               |
| An install page for a non-developer | **Yes** — `/self-host`                    | Shipped 2026-09-25                                                       |

So every catalogue below is submittable today. The only channel still waiting is
awesome-selfhosted, and it is waiting on a calendar, not on work.

---

## The one you cannot submit yet, with a date

**awesome-selfhosted — eligible 2026-01-18.**

Their rule is that the first release must be more than four months old.
`v0.1.0` was tagged **2026-09-18**, so the earliest honest submission date is
**18 January 2027**. Put it in a calendar; nothing between now and then makes it
come sooner.

**And when that date arrives, the entry is yours to write, not mine.** Their
`CONTRIBUTING.md` tells AI agents in as many words not to write the entry text a
person submits as their own, not to write the pull request body, and not to tick
the "this submission was done by a human, not a machine/LLM" box — because that
statement is made by a human to the maintainers and an agent cannot make it
truthfully. An independent check of their published guidelines on 2026-09-26
found the same rule stated from the other side: machine-generated contributions
that do not respect the guidelines are grounds for a ban.

What an agent _may_ do, by their own list: explain the guidelines, check the
objective requirements, and review an entry you wrote without rewriting it. That
offer stands whenever you want it.

---

## The three you can submit today

Each one takes a template file rather than a written pitch, which is why the
artifacts are in `packaging/` in this repo and not something you have to compose.
Every image reference is pinned to `0.1.0` rather than `latest`, so the build a
reviewer approves is the build a user installs.

### 1. Unraid Community Applications

The largest of the three by installed base, and the only one that reads a
repository rather than taking a pull request.

- **What to submit:** the URL of this repository, at <https://ca.unraid.net/submit>.
- **Artifacts:** `packaging/unraid/opentools.xml` and `packaging/unraid/ca_profile.xml`.
- **Their requirements, checked:** one XML file per app ✓, a `<Repository>` tag
  pointing at a real image ✓, readable `<Name>` and `<Overview>` for the
  moderator ✓, a `ca_profile.xml` with a non-empty `<Profile>` ✓, an
  OSI-approved licence on the repository ✓ (MIT), repository public and active ✓.
- **Before you submit:** run _Validate_ and _Scan_ in their submission flow. It
  checks the templates and reports what a moderator would otherwise bounce.

### 2. CasaOS App Store

- **What to submit:** a pull request to `IceWhaleTech/CasaOS-AppStore`.
- **Artifact:** `packaging/casaos/docker-compose.yml`.
- **Their requirements, checked:** `docker-compose.yml` ✓, lower-case app name ✓
  (`opentools`), a specific image tag rather than `:latest` ✓, `icon.png`
  ✓ (points at `public/icon-512.png` in this repo), and **at least one
  screenshot — see the gap below**.

### 3. Umbrel App Store

- **What to submit:** a pull request to `getumbrel/umbrel-apps`.
- **Artifacts:** `packaging/umbrel/umbrel-app.yml` and
  `packaging/umbrel/docker-compose.yml`.
- **Their requirement, checked:** an app must serve a web UI ✓.
- **Two fields are deliberately blank** in `umbrel-app.yml`: `submitter` and
  `submission`. They name the person submitting and link to the pull request
  they opened. Fill them in when you open it — they are statements about a
  human.
- **Unverified:** Umbrel's documentation describes pushing images to Docker Hub.
  Whether they accept a GHCR image was not confirmed on 2026-09-26. If a
  maintainer asks for Docker Hub, the same image can be mirrored there; do not
  promise them one until you have.

---

## The gap that needs a person, and it is small

**A screenshot.** CasaOS requires at least one and Umbrel wants a gallery image;
both are the shop-window picture, and right now the manifests point at
`public/og.png`, which is a social-sharing card rather than a picture of the
product. It is enough to submit with and worse than what you could take in two
minutes: run the container, open `http://localhost:8796`, and capture the home
page and one tool mid-use.

```bash
docker run --rm -p 8796:8796 ghcr.io/mgbuilderos/opentools:0.1.0
```

Drop them in `packaging/` and point the manifests at them. Nothing else in this
file is waiting on anything.

---

## What none of this is

These catalogues are worth doing because they compound quietly and cost one
afternoon. They are not a traffic event. An honest expectation is tens of
installs in the first months, each one an office or a household rather than a
visitor — which is the whole argument for the channel, and also the reason it
will never show up in a chart of daily sessions.

The measurement that does work: GHCR pull counts on the package page. Unlike
everything else about this product, self-host installs are invisible by design,
and that is not a problem to be fixed.
