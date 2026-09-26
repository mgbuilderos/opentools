# Release runbook — the commands, in order

`docs/LAUNCH_KIT.md` holds the channel order and the copy to post. This holds
the mechanical half: what to run, in what order, and what each step unblocks.
The two are separate on purpose — the launch kit is about outward actions under
your own name, and everything here is a command you can check the output of.

**None of this posts anything anywhere.** The furthest it goes is publishing a
release, under your own account, and reversible.

---

## Where things actually stand

Checked against the repository and the registry on 2026-09-26, not inferred
from the last document that mentioned them.

| Asset | State | What it is waiting for |
| :--- | :--- | :--- |
| Self-host image | **Published and public.** `ghcr.io/mgbuilderos/opentools` serves `0.1.0`, `0.1` and `latest`, multi-arch, and all three pull anonymously. | Nothing |
| GitHub release | **0 releases.** `v0.1.0` was tagged and the image published, and the Releases page is still empty — nothing ever created one. | §1 — one command for `v0.1.0`; every later tag is automatic |
| Browser extension | MV3 complete. The manifest description was 152 characters against Chrome's limit of 132, so the upload would have been refused; fixed, and a store-ready zip can now be built. | §3 — two screenshots, then submit |
| IndexNow | Script and live key file both work. Deliberately outside `npm run deploy`. | §2 — one command after a deploy |
| `measure-csp.mjs` | Works. Now has `npm run measure:csp`. | §4 — somewhere to publish the output |
| Reddit posts | Written as-is in `LAUNCH_KIT.md` §2–§3b. | You. Run the 60-second rule check first |
| AlternativeTo | Copy written in `LAUNCH_KIT.md` §1. Months-long free queue. | You. The clock starts when you submit |
| `/embed/*` | Shipped. Pillar 6 of the corrected playbook gates it on a security ADR. | An owner decision, not a command |
| PWA install offer | **Already live and deliberately timed** — `components/install-prompt.tsx` holds it back until a tool has finished someone's work, with `e2e/install-prompt.spec.ts` keeping it there. | Nothing |

**`latest` is a week behind `main`.** `v0.1.0` points at `9850a8e`, dated
18 September. Everything merged since — the folder runner at `/batch`, the
egress meter, `/self-host`, the finance and email formats — is not in the image
anyone can pull. That is the design (pushes to `main` never publish), but it
means the next release is worth cutting before the self-hosting channels in
`LAUNCH_KIT.md` §6 are opened.

---

## 1. The release

The image exists; the release does not. `awesome-selfhosted` requires a first
release **more than four months old**, and a tag with no release is not one.

**For `v0.1.0`, which is already pushed**, the workflow cannot help — it fires
on the tag push, and that has been and gone. One command, once:

```bash
node scripts/release-notes.mjs v0.1.0 > /tmp/notes.md   # check it reads right
gh release create v0.1.0 --title v0.1.0 --notes-file /tmp/notes.md --verify-tag
```

**For every tag after this one it is automatic.** `selfhost-image.yml` now has
a `release` job that reads the section for the tag out of `CHANGELOG.md` and
creates the release, after the image is pushed so the `docker run` line in the
notes works for whoever reads it first. A tag whose version has no section
fails the release rather than publishing an empty one.

### Cutting the next release

```bash
npm ci
npm run qc                       # the full suite CI runs
npm run release:notes v0.2.0     # the exact body the release will carry
git tag v0.2.0 && git push origin v0.2.0
git ls-remote --tags origin      # the tag is pushed only if it appears here
```

**Then, once the workflow has pushed the image**, one command that belongs to
the release and is easy to forget because it comes after the interesting part:

```bash
npm run release:digest           # pins the Umbrel manifest to the new digest
npm test                         # confirms every manifest agrees with it
```

Umbrel is the only catalogue that requires `repo:tag@sha256:<digest>`, and the
digest cannot exist before the image does, so `packaging/umbrel/docker-compose.yml`
ships a placeholder between releases. `scripts/umbrel-digest.mjs` reads the real
digest from the registry, checks the image carries both architectures, and exits
non-zero rather than writing anything if the tag is not published — so running
it too early tells you so instead of producing a manifest that installs for
nobody.

Add the `## 0.2.0` section to `CHANGELOG.md` in the pull request, before the
tag — `scripts/release-notes.test.ts` fails on a section that is empty or not
headed by a version, and the workflow fails on a tag with no section at all.

**If you also bump the version in `package.json`, regenerate the SBOM, and use
the npm that CI pins.** `release/sbom.cdx.json` records the root component's
version and `npm run sbom -- --check` compares it against a fresh one, so a
version bump on its own turns the `SBOM INVENTORY` gate red — and regenerating
with the wrong npm fails the same gate with a different message:

```bash
npm install --global npm@11.12.1   # the version ci.yml pins
npm run sbom && npm run sbom -- --check
```

**Making the package public** is already done for this repository, and stays
done. It is here because GHCR publishes private by default and a private image
makes every `docker run` in every post fail: GitHub profile → Packages →
`opentools` → Package settings → Visibility → Public.

**Then fill in the Umbrel digest.** `packaging/umbrel/docker-compose.yml`
carries an all-zeros placeholder, because Umbrel rejects a moving tag and wants
the multi-arch manifest digest, which cannot exist before the image does. Ship
the placeholder to their store and the app fails to pull for everyone:

```bash
docker buildx imagetools inspect ghcr.io/mgbuilderos/opentools:<version> \
  --format '{{json .Manifest.Digest}}'
```

Put that in place of the zeros and commit it. `packaging/packaging.test.ts`
guards both ends — it fails if the digest goes missing, and it fails on the
half-finished state where one manifest has a real digest and another still has
the placeholder. `docs/APP_CATALOGUES.md` has each store's rules; none of the
five submissions should go out before this is done.

**Verify from outside** before pointing anyone at it:

```bash
docker run --rm -p 8796:8796 ghcr.io/mgbuilderos/opentools:latest
curl -sI http://localhost:8796/ | grep -i content-security-policy
```

The second command is the claim the launch copy makes. If `connect-src 'none'`
is not in that output, stop and fix it before posting anything.

---

## 2. IndexNow, after a deploy

```bash
npm run build
npm run deploy
npm run indexnow          # add --dry-run first to see the set
```

It is outside `npm run deploy` deliberately, and that stays: submitting is a
public assertion that these URLs changed, and the protocol's goodwill is the
whole reason it works. The default run submits only what has changed since the
last one, tracked in `.indexnow-state.json`. `npm run build` already fails if
the key file is missing, so the 403 that used to mean "someone tidied up
`public/`" cannot happen silently any more.

---

## 3. Package the extension

```bash
npm run extension:package
```

Writes `dist/extension/opentools-extension-<version>.zip` — `manifest.json` at
the archive root, the three markdown files left out, byte-identical on a
rebuild. It checks the manifest against the store's limits first and refuses to
write a zip that would be rejected.

**What is still on you:** two screenshots at 1280×800, which need a real Chrome
profile with the extension loaded. `extension/STORE_LISTING.md` says exactly
which two and why, and holds every field of copy to paste. Firefox and Edge are
free and take the same copy; Chrome is a one-time $5 registration.

---

## 4. Publish the CSP measurement

```bash
npm run measure:csp                            # this site only
npm run measure:csp -- https://any.site        # anything you point it at
npm run measure:csp -- --json
```

It ships no list of other people's products, and `lib/seo/live-tools.test.ts`
fails the build if a competitor name appears in it. That constraint is what
makes the output publishable at all: a reader who runs the check on a site they
chose reaches the conclusion themselves.

---

## What this runbook cannot do

Posting to Reddit, AlternativeTo, Hacker News or `awesome-selfhosted-data` is an
outward action under your identity, in communities that ban accounts for looking
automated — and `awesome-selfhosted-data/CONTRIBUTING.md` asks agents explicitly
not to write entries a person then submits as their own. `LAUNCH_KIT.md` has the
copy, the channel order, and the 60-second rule check to run before each post.
