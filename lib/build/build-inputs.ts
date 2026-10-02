import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The build ID, derived from everything a build can read.
 *
 * ## Why not the commit
 *
 * The build ID used to be `git rev-parse HEAD`, and `null` -- which restores
 * vinext's random UUID -- whenever the tree was dirty. Both halves of that are
 * coarser than they look, because the ID does not stay in `dist/server`: it is
 * hashed into the RSC compatibility id (`lib/build/build-identity.ts`), which
 * `define`-inlines into one client chunk, and rolldown folds a chunk's content
 * hash into the hash of every chunk that imports it. So the ID chooses the
 * names of a large part of `dist/client/_next/static/chunks/`.
 *
 * Measured on 2026-10-02 against `ae95afb`, with nothing else changed:
 *
 * | Build id moves because...        | Client chunks renamed | Precache     |
 * | -------------------------------- | --------------------- | ------------ |
 * | a dirty tree fell back to random | 111 of 257            | all 1.47 MB  |
 * | a commit touched only `docs/`    | 111 of 257            | all 1.47 MB  |
 * | nothing (same content)           | 0                     | untouched    |
 *
 * The first row is why two builds of one uncommitted edit never matched, and
 * why a `dist/` diff of a dependency change read as 111 changed chunks when the
 * change ships nothing: the random fallback, not a hashing cycle. (`catalog`
 * does import `app-shell` while `app-shell` lists `catalog` in its
 * `__vite__mapDeps` array, and rolldown resolves that cycle to one fixed point,
 * deterministically. Holding the ID still makes 2,427 of 2,427 files under
 * `dist/client` byte-identical across two builds -- so the cycle was never the
 * cause.) The second row is the standing cost: a prose commit renamed every
 * chunk a returning visitor had already cached under
 * `max-age=31536000, immutable`, and reshipped the service worker's whole
 * offline payload to every installed user.
 *
 * ## What it is instead
 *
 * `sha256` over the content of every tracked file that the build can read, plus
 * the resolved identity of every installed package that can change what the
 * build writes. Two trees whose build-relevant content matches get one ID even
 * on different commits, and two trees that differ anywhere the build can see
 * get different IDs even on the same commit. That is strictly more precise than
 * the commit it replaces: it also catches a stale `dist/` built from
 * uncommitted work, which `HEAD` cannot see (`scripts/predeploy.mjs`).
 *
 * The ID is no longer a commit SHA, and deliberately does not look like one --
 * 64 hex characters, not 40 -- so nothing invites `git show` on it. Provenance
 * survives: the digest is a pure function of the tree, so anyone can recompute
 * it from a checkout and check `dist/server/BUILD_ID` against it. That is the
 * property a reproducible build actually needs, and it now holds for a dirty
 * tree too.
 */
export const BUILD_INPUT_DIGEST_VERSION = 'opentools-build-inputs/1';

/**
 * Tracked paths the build cannot read, and so cannot be written into `dist/`.
 *
 * Default is to include: a path left out of this list only costs a renamed
 * chunk, while a path wrongly in it would let two builds that really do differ
 * share one ID. Every entry is here because nothing in the build chain --
 * `vite.config.ts`, `next.config.ts`, the module graph under `app/`,
 * `components/`, `lib/`, `engine/`, `workers/`, or the nine `scripts/*.mjs`
 * steps `npm run build` runs after `vinext build` -- reads it.
 *
 * `docs/` and `decisions/` are the two worth naming explicitly, because app
 * code does mention them: `app/self-host/page.tsx` reproduces a table from
 * `docs/SELF_HOSTING.md` and `app/compare/open-source-pdf-tools/page.tsx`
 * quotes `THIRD_PARTY_NOTICES.md`. Both copy the prose by hand into the
 * component -- checked by grep over `app components lib engine workers types`
 * for every entry below -- so the Markdown is never a build input and editing
 * it must not rename a chunk.
 */
const DIRECTORIES_THE_BUILD_CANNOT_READ = [
  '.github/', // CI workflows.
  'decisions/', // ADRs.
  'docker/', // The self-host image's entrypoint and runtime config.
  'docs/', // Prose. Quoted into components by hand, never imported.
  'e2e/', // Playwright specs.
  'e2e-audit/',
  'e2e-prod/',
  'extension/', // Packaged by `scripts/package-extension.mjs`, not by a build.
  'packaging/', // Store listings and screenshots for the self-host images.
  'release/', // Release ledger, SBOM and approvals -- written after a build.
];

/** Tracked root files the build cannot read. Same rule as the directories. */
const ROOT_FILES_THE_BUILD_CANNOT_READ = [
  '.dockerignore',
  '.gitignore',
  '.oxfmtrc.json', // Formatter config. `format:check` is its own QC gate.
  '.oxlintrc.json', // Linter config, likewise.
  '.predeploy-state.json', // Deploy bookkeeping, rewritten by a deploy.
  'ANTIGRAVITY_PROMPT.md',
  'CHANGELOG.md',
  'CLAUDE_CODE_OPENSOURCE_AND_SUPPORT_PROMPT.md',
  'CONTRIBUTING.md',
  'DESIGN_SYSTEM.md',
  'Dockerfile',
  'EXPLAINER_DEFECTS.md',
  'LICENSE',
  'README.md',
  'THIRD_PARTY_NOTICES.md',
  'ca_profile.xml',
  'design-qa.md',
  'docker-compose.yml',
  'playwright.audit.config.ts',
  'playwright.config.ts',
  'playwright.exact.local.config.ts',
  'playwright.prod.config.ts',
  'playwright.production.config.ts',
  'playwright.realfile.config.ts',
  'proxy.test.ts',
  'vitest.config.ts',
];

/**
 * Installed packages that cannot change what the build writes.
 *
 * Named packages are cut out of the dependency graph along with everything that
 * only they reach, so this list stays short: cutting `vitest` cuts its whole
 * subtree. Default is to include, for the same reason as the paths above, and
 * every entry has to earn its place:
 *
 * **Never executed by `npm run build`, and never bundled.** Measured by
 * building under `NODE_V8_COVERAGE`, which records every script Node runs in
 * every process of the build, and reading the package names back out of the
 * `url` fields:
 *
 *     NODE_V8_COVERAGE=/tmp/cov npm run build
 *
 * On 2026-10-02 that was 94 packages out of the 465 installed, and none of
 * `vitest`, `@playwright/test`, `oxlint`, `oxfmt`, `oxlint-tsgolint`,
 * `typescript` or any `@types/*` was among them. Code that never runs cannot
 * change a byte, and none of these is imported by anything under `app/`,
 * `components/`, `lib/`, `engine/` or `workers/`, so none is bundled either.
 * (`pdfjs-dist` is also a devDependency never executed by the build -- and it
 * is **not** here, because five modules under `components/` and `lib/` import
 * it, so it ships. `buildInputsGuard` in `vite.config.ts` fails the build if a
 * package named here turns up in the module graph.)
 *
 * **`undici` is the one entry that ran and is still excluded.** It is
 * `miniflare`'s HTTP client -- miniflare serves the prerender requests that
 * turn routes into the HTML under `dist/client` -- so this is a measurement,
 * not a structural argument. Measured on 2026-10-02 by moving
 * `overrides.undici` between `7.29.0` and `7.29.1` with the build ID held
 * fixed: all 2,427 files under `dist/client` byte-identical, and `dist/server`
 * identical but for the draft-mode bypass credential that is random by design.
 * A transport cannot rewrite the body it carries. If that ever stops being
 * true, the cost is an HTML file that changed while the ID did not -- not a
 * stale page served to anyone, because prerendered routes are files and are
 * never written to the KV page cache, and a route that does render at request
 * time renders in Cloudflare's own runtime from a Worker bundle this list does
 * not touch.
 *
 * `miniflare`, `workerd` and `wrangler` themselves are deliberately absent:
 * they run during a build, they do shape `dist/`, and they stay in the digest.
 *
 * **`@types/*` is cut for a different reason, and it is not "dev-only".** npm
 * does not mark those `dev`, because `vite` peer-depends on `@types/node` and
 * `@base-ui/react` on `@types/react`. They are cut because they contain no
 * JavaScript at all -- 0 `.js`/`.mjs`/`.cjs` files against 125 `.d.ts` across
 * the six that are installed, counting `csstype` and `undici-types`, which only
 * they reach. A declaration file is erased before a bundler sees it.
 * `build-inputs.test.ts` checks that claim over every package the walk cuts, by
 * looking for executable files on disk rather than trusting the `dev` flag.
 */
export const PACKAGES_THAT_CANNOT_CHANGE_THE_BUILD = [
  '@cloudflare/workers-types',
  '@playwright/test',
  'oxfmt',
  'oxlint',
  'oxlint-tsgolint',
  'typescript',
  'undici',
  'vitest',
];

/** `@types/*` is type-only by construction, so it is matched by prefix. */
const PACKAGE_PREFIXES_THAT_CANNOT_CHANGE_THE_BUILD = ['@types/'];

/**
 * The two files whose content is digested a different way, below, and so must
 * not also be digested as plain files: `package.json` because the `overrides`
 * field is projected out of it, and `package-lock.json` because it is digested
 * per installed package.
 */
const DIGESTED_NOT_AS_A_FILE = ['package-lock.json', 'package.json'];

/** True when a tracked path can reach `dist/`, and so belongs in the digest. */
export function affectsBuildOutput(repoPath: string): boolean {
  if (ROOT_FILES_THE_BUILD_CANNOT_READ.includes(repoPath)) return false;
  if (DIRECTORIES_THE_BUILD_CANNOT_READ.some((dir) => repoPath.startsWith(dir)))
    return false;
  // Unit tests live beside the code they test and are never imported by it.
  return !/\.test\.(ts|tsx|mts)$/.test(repoPath);
}

function digestedAsAFile(repoPath: string): boolean {
  return (
    affectsBuildOutput(repoPath) && !DIGESTED_NOT_AS_A_FILE.includes(repoPath)
  );
}

/**
 * True when a package is cut out of the digest. Exported so `vite.config.ts`
 * can fail a build that bundles one: the claim being made about every name in
 * that list is that it reaches no byte of `dist/`, and a module graph is where
 * that claim is cheapest to check.
 */
export function packageCannotChangeTheBuild(name: string): boolean {
  return (
    PACKAGES_THAT_CANNOT_CHANGE_THE_BUILD.includes(name) ||
    PACKAGE_PREFIXES_THAT_CANNOT_CHANGE_THE_BUILD.some((prefix) =>
      name.startsWith(prefix),
    )
  );
}

/**
 * The package a module belongs to, or `null` for first-party source. Takes the
 * last `node_modules/` segment, which is what nesting means: in
 * `.../node_modules/a/node_modules/b/index.js` the module is b's.
 */
export function packageNameFromModuleId(moduleId: string): string | null {
  const id = moduleId.replaceAll('\\', '/');
  const marker = id.lastIndexOf('node_modules/');
  if (marker < 0) return null;
  const segments = id.slice(marker + 'node_modules/'.length).split('/');
  const name = segments[0]?.startsWith('@')
    ? `${segments[0]}/${segments[1] ?? ''}`
    : segments[0];
  return name || null;
}

type LockfilePackage = {
  version?: string;
  integrity?: string;
  resolved?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export type Lockfile = { packages?: Record<string, LockfilePackage> };

/**
 * npm's own resolution order: a dependency of the package installed at `from`
 * is the first `<ancestor>/node_modules/<name>` that exists, walking outwards.
 */
function resolveInstalledPath(
  packages: Record<string, LockfilePackage>,
  from: string,
  name: string,
): string | null {
  let base = from;
  for (;;) {
    const candidate = `${base ? `${base}/` : ''}node_modules/${name}`;
    if (packages[candidate]) return candidate;
    if (!base) return null;
    const nested = base.lastIndexOf('/node_modules/');
    base = nested < 0 ? '' : base.slice(0, nested);
  }
}

/**
 * The installed packages a build can reach, as `package-lock.json` paths.
 *
 * Walks out from the root manifest's own dependencies -- runtime and dev alike,
 * because the build toolchain is a devDependency -- and never follows an edge
 * into a package named in `PACKAGES_THAT_CANNOT_CHANGE_THE_BUILD`. A package
 * that is also reachable some other way stays in, which is the behaviour that
 * matters: cutting `vitest` must not cut `react` just because vitest depends on
 * it too.
 */
export function installedPackagesThatCanChangeTheBuild(
  lock: Lockfile,
): string[] {
  const packages = lock.packages ?? {};
  const root = packages[''];
  if (!root) return [];

  const reached = new Set<string>();
  const queue: string[] = [''];
  while (queue.length > 0) {
    const from = queue.pop() as string;
    const entry = packages[from];
    if (!entry) continue;
    const edges = {
      ...entry.dependencies,
      ...entry.optionalDependencies,
      ...entry.peerDependencies,
      // Only the root's devDependencies are installed.
      ...(from === '' ? entry.devDependencies : undefined),
    };
    for (const name of Object.keys(edges)) {
      if (packageCannotChangeTheBuild(name)) continue;
      const to = resolveInstalledPath(packages, from, name);
      if (!to || reached.has(to)) continue;
      reached.add(to);
      queue.push(to);
    }
  }
  return [...reached].sort();
}

/**
 * The manifest, minus the one field whose only effect reaches a build through
 * the versions it resolves to -- which the package digest already covers.
 * Without this, pinning a transitive dev-only package through `overrides`
 * renames chunks even when the package ships nowhere, which is the trap this
 * whole module exists to remove.
 */
export function digestibleManifest(manifestJson: string): string {
  const manifest = JSON.parse(manifestJson) as Record<string, unknown>;
  delete manifest.overrides;
  return JSON.stringify(manifest);
}

/**
 * The digest itself, over inputs the caller supplies, so it can be tested
 * without a repository: `files` maps a repo-relative path to the git blob ID of
 * its content, and `lock` is a parsed `package-lock.json`.
 */
export function buildInputsDigest(inputs: {
  files: Iterable<readonly [string, string]>;
  lock: Lockfile;
  manifest: string;
}): string {
  const hash = createHash('sha256');
  hash.update(`${BUILD_INPUT_DIGEST_VERSION}\n`);
  hash.update(`manifest ${digestibleManifest(inputs.manifest)}\n`);

  const files = [...inputs.files]
    .filter(([file]) => digestedAsAFile(file))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [file, blob] of files) hash.update(`file ${blob} ${file}\n`);

  for (const line of packageLines(inputs.lock))
    hash.update(`package ${line}\n`);

  return hash.digest('hex');
}

function packageLines(parsed: Lockfile): string[] {
  const packages = parsed.packages ?? {};
  return installedPackagesThatCanChangeTheBuild(parsed).map((installed) => {
    const entry = packages[installed] ?? {};
    // The resolved identity of the code on disk. Declared ranges are left out:
    // a range that resolves to the version already installed changes no byte.
    const identity = entry.integrity ?? entry.resolved ?? '';
    return `${installed} ${entry.version ?? ''} ${identity}`;
  });
}

function git(cwd: string, args: string[], input?: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'ignore'],
    maxBuffer: 256 * 1024 * 1024,
  });
}

/**
 * Read the inputs out of the repository and digest them.
 *
 * `git ls-files -s` hands over the blob ID git already holds for every tracked
 * file, so the 41 MB under `public/` costs nothing to account for; only files
 * edited in the worktree are hashed, and they are hashed by `git hash-object`
 * rather than in Node, so that identical content digests identically whether it
 * is committed, staged or merely saved.
 *
 * Files git has never seen are counted too, as long as git is not ignoring them.
 * The commit-based ID left them out, reasoning that nothing imports a file git
 * has not seen unless the importer is itself dirty -- which is true exactly
 * once. Add `lib/new-thing.ts`, import it from a tracked module, and the ID
 * moves because the importer moved; edit `lib/new-thing.ts` again and the output
 * changes while the ID does not. That hole is only open while work is
 * uncommitted, which is precisely when someone is building twice to compare.
 * The cost of closing it is that a scratch file left in the tree moves the ID,
 * and that is the harmless direction. `--exclude-standard` keeps `node_modules`,
 * `dist` and anything else `.gitignore` names out of it.
 *
 * `null` when there is no git to ask -- a tarball or a Docker context without
 * `.git` -- which leaves vinext's random identity in place exactly as before.
 */
export function resolveBuildInputsDigest(): string | null {
  try {
    const root = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
    if (!root || !existsSync(path.join(root, 'package-lock.json'))) return null;

    const files = new Map<string, string>();
    for (const entry of git(root, [
      'ls-files',
      '-s',
      '-z',
      '--full-name',
    ]).split('\0')) {
      if (!entry) continue;
      const split = entry.indexOf('\t');
      if (split < 0) continue;
      const blob = entry.slice(0, split).split(' ')[1];
      const file = entry.slice(split + 1);
      if (blob && digestedAsAFile(file)) files.set(file, blob);
    }

    // Saved but not staged, plus never added at all. `git diff` compares the
    // worktree with the index, so the first is exactly the set whose blob ID
    // above is out of date.
    const edited = git(root, ['diff', '--name-only', '-z'])
      .split('\0')
      .filter((file) => file && files.has(file));
    const untracked = git(root, [
      'ls-files',
      '--others',
      '--exclude-standard',
      '-z',
    ])
      .split('\0')
      .filter((file) => file && digestedAsAFile(file));
    for (const file of [...edited, ...untracked]) {
      // One `hash-object` per file rather than `--stdin-paths`, which cannot
      // carry a path with a newline in it. Only changed files reach here.
      files.set(
        file,
        existsSync(path.join(root, file))
          ? git(root, ['hash-object', '--', file]).trim()
          : 'deleted-in-worktree',
      );
    }

    // Read from disk, not from the index: an uncommitted dependency change is
    // exactly the case this has to get right.
    return buildInputsDigest({
      files,
      lock: JSON.parse(
        readFileSync(path.join(root, 'package-lock.json'), 'utf8'),
      ) as Lockfile,
      manifest: readFileSync(path.join(root, 'package.json'), 'utf8'),
    });
  } catch {
    return null;
  }
}
