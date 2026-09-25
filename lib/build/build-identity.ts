import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

/**
 * Pin the build ID to the commit being built.
 *
 * Left unset, `resolveBuildId` returns a fresh random UUID on every build
 * (vinext/dist/config/next-config.js). The page cache is keyed
 * `cache:app:<buildId>:<pathname>:<html|rsc>`, so an unset build ID means every
 * build -- and every REDEPLOY OF IDENTICAL CODE -- starts from an empty cache
 * and has to re-render and re-write every page.
 *
 * That is not hypothetical. On 2026-09-19 KV held 2,550 entries under three
 * dead build IDs while the live build ID matched none of them, and the free
 * plan's 1,000 writes/day was being spent several times over. It is also
 * self-inflicted: this project's own documented remedy for CPU errors is to
 * redeploy the identical commit, which silently wiped the whole cache each time.
 *
 * Keyed on the commit, an unchanged tree redeploys onto its existing warm cache,
 * and a real code change still gets a new key so nobody is served a stale page.
 *
 * A dirty tree is deliberately NOT given the clean commit's ID -- that would let
 * two different builds share one cache key and serve each other's pages. It
 * falls back to `null`, which restores the random-UUID behaviour: correct, just
 * uncached. Same for a missing git directory, or CI that exports the SHA itself
 * via `OPENTOOLS_BUILD_ID`.
 */
export function resolvePinnedBuildId(): string | null {
  const fromEnv = process.env.OPENTOOLS_BUILD_ID?.trim();
  if (fromEnv) return fromEnv;
  try {
    const git = (...args: string[]) =>
      execFileSync('git', args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    // Tracked-file changes only. Untracked files cannot alter the built output
    // unless something imports them, in which case the importer is itself dirty.
    if (git('status', '--porcelain', '--untracked-files=no')) return null;
    return git('rev-parse', 'HEAD') || null;
  } catch {
    return null;
  }
}

/**
 * The environment variables vinext's CLI uses to hand one identity to every
 * Vite build in a `vinext build` run. Exported so `vite.config.ts`, the guard
 * that checks the built bundle, and the test that watches for an upstream
 * rename all name them once.
 *
 * @see node_modules/vinext/dist/cli.js (`buildApp`)
 * @see node_modules/vinext/dist/index.js (the `vinext:config` plugin)
 */
export const VINEXT_SHARED_RSC_COMPATIBILITY_ID_ENV =
  '__VINEXT_SHARED_RSC_COMPATIBILITY_ID';
export const VINEXT_SHARED_RSC_BUILD_IDENTITY_ENV =
  '__VINEXT_SHARED_RSC_BUILD_IDENTITY';

/**
 * Both identities below are `sha256(<purpose>:<build id>)` truncated to 32 hex
 * characters -- the shape vinext's own `randomBytes(16).toString('hex')`
 * produces. The purpose prefix keeps the two from ever being the same string
 * for the same commit, so one cannot be mistaken for the other in a log or a
 * response header.
 */
function deriveIdentity(
  purpose: string,
  buildId: string | null,
): string | null {
  if (!buildId) return null;
  return createHash('sha256')
    .update(`${purpose}:${buildId}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Pin the RSC compatibility id to the commit being built.
 *
 * This is the one and only reason the production build was not reproducible.
 * Measured 2026-09-22 and again 2026-09-23: two builds of an identical,
 * unmodified tree renamed 65 of 146 chunks under
 * `dist/client/_next/static/chunks/`. Comparing the two runs chunk by chunk,
 * with every hashed filename inside the code normalised away, showed that 64
 * of those 65 were byte-identical and only `vinext-<hash>.js` really differed
 * -- by exactly one value, a v4 UUID (`e7d6aa6f-...` in one run,
 * `c2cf5e5d-...` in the next). Rolldown folds the hash of a chunk's imports
 * into its own, so that single UUID renamed every chunk downstream of it, and
 * the renames then propagated into all 1,312 prerendered HTML files.
 *
 * What it buys, measured the same day by rebuilding with one string changed in
 * one component: 2 of the 146 chunks are renamed (that component's chunk and
 * the entry chunk that maps them) and 144 keep their names. Before the fix the
 * same edit would have renamed those 2 plus the 65 the random UUID moved.
 *
 * The UUID is vinext's RSC compatibility id. It is baked into the client
 * bundle, echoed by the Worker as `X-Vinext-RSC-Compatibility-Id`, and
 * compared on client navigation so a browser holding an old bundle falls back
 * to a hard navigation instead of choking on an RSC payload it cannot read.
 * `createRscCompatibilityId` returns `deploymentId` when one is configured and
 * `randomUUID()` when one is not -- and this app configures none.
 *
 * Deriving it from the commit keeps the skew check exactly as strict: a new
 * commit is a new id, which is the only time a client bundle and a server
 * response can actually disagree. Two builds of the same commit now agree,
 * which is what makes `/_next/static/*` survive a deploy in a returning
 * visitor's cache (`public/_headers` serves that prefix `max-age=31536000,
 * immutable`, so the browser never re-checks a name and therefore never learns
 * that a renamed file is the same file) and what stops the service worker's
 * ~0.69 MB offline payload being re-downloaded by every installed user after a
 * deploy that changed nothing.
 *
 * It is a hash of the build ID rather than the build ID itself, so the token
 * on the wire still does not expose the raw build ID -- the property vinext
 * documents for this value. Hex, because it only ever travels in a response
 * header; it never reaches a URL, so it needs no URL-safe or ad-blocker-safe
 * shaping the way a build ID does.
 *
 * `null` when the build ID is not pinned (a dirty tree, or no git), which
 * leaves vinext's random id in place. That mirrors `resolvePinnedBuildId`
 * deliberately: a dirty tree must not claim the clean commit's identity.
 */
export function pinnedRscCompatibilityId(
  buildId: string | null,
): string | null {
  return deriveIdentity('vinext-rsc-compatibility', buildId);
}

/**
 * Pin the RSC build identity to the commit being built.
 *
 * Same defect as the compatibility id above, one layer down: `vinext build`
 * mints this one as `randomBytes(16)` with no way to configure it, writes it to
 * `dist/server/RSC_BUILD_ID`, inlines it into the server bundle and copies it
 * into `vinext-prerender-paths.json`. Two builds of one commit therefore
 * produced a different Worker even when `dist/client` was byte-identical.
 *
 * It costs a visitor nothing -- it never reaches the client bundle, and its
 * only runtime job is to label a response with `X-Vinext-RSC-Build-Id`. What it
 * costs is the ability to check that the artifact about to be deployed is the
 * artifact that was built from the reviewed commit, which is the other half of
 * what a reproducible build is for. Pinning it to the commit is the same choice
 * `generateBuildId` already makes, and nothing in vinext requires this value to
 * be unique per build run rather than per commit: `prerender-paths.js` reads
 * the file back within the same build and copies it into a manifest.
 *
 * `null` when the build ID is not pinned, for the reason given above.
 *
 * **This is the last non-secret random value in `dist/server`, and `dist/server`
 * still is not byte-reproducible -- deliberately.** Measured 2026-09-23 by
 * building the same commit twice: pinning this took the differing files from 24
 * to 8, and supplying `__VINEXT_SHARED_PRERENDER_SECRET` and
 * `__VINEXT_SHARED_REVALIDATE_SECRET` (both of which vinext honours from the
 * environment) took it to one file, `index.js`, differing in one 32-hex value:
 * the draft-mode bypass id from `createPreviewBuildCredentials`, which also
 * mints a signing key and an encryption key and offers **no** environment hook.
 *
 * Do not try to pin those. They authenticate draft-mode access; deriving them
 * from a public commit SHA would let anyone holding this repository forge it.
 * The same goes for the prerender secret -- `prod-server.js` grants
 * trusted-prerender status to any request whose `x-vinext-prerender-secret`
 * header matches it. A build that embeds credentials is reproducible *given the
 * same credentials*, and that is as far as this should go.
 *
 * What is checkable without them: `dist/server/BUILD_ID` and
 * `dist/server/RSC_BUILD_ID` are both now functions of the commit, so an
 * artifact can still be tied to the commit it claims to come from.
 * (`dist/server/.wrangler/` is local Miniflare state, not part of the upload --
 * its SQLite `-wal`/`-shm` files differ every run and can be ignored.)
 */
export function pinnedRscBuildIdentity(buildId: string | null): string | null {
  return deriveIdentity('vinext-rsc-build-identity', buildId);
}
