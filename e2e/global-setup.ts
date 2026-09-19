import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FullConfig } from '@playwright/test';

/**
 * Refuses to run the suite against someone else's dev server.
 *
 * `reuseExistingServer` attaches to whatever already listens on the port. A
 * different project was listening on 3000 on this machine, so every route in
 * `all-tools-smoke.spec.ts` was asserting "an h1 is visible" against an
 * unrelated app — 628 passing tests that proved nothing.
 *
 * Checking for the word "OpenTools" fixed that case and only that case. This
 * repository has a worktree per lane, and **every one of them serves the word
 * "OpenTools"**, so the suite could still run fully green against a build
 * nobody had changed. That is capsule trap 2, and it survived every check
 * because the check could not tell two builds of this site apart.
 *
 * So the real gate is the second one: the app chunk's filename carries a hash
 * of its own contents, which differs between worktrees whenever their app code
 * differs. If the page does not reference the chunk sitting in this worktree's
 * `dist/`, some other build answered.
 */
const chunksDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'dist',
  'client',
  '_next',
  'static',
  'chunks',
);

/**
 * The app chunk, not a vendor one. `framework-*` and `rolldown-runtime-*` hash
 * identically across worktrees that share dependencies, so they would wave
 * through exactly the mix-up this exists to catch.
 */
function localAppChunk(): string | null {
  try {
    return (
      readdirSync(chunksDir).find(
        (name) => name.startsWith('index-') && name.endsWith('.js'),
      ) ?? null
    );
  } catch {
    return null;
  }
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:8788';

  const response = await fetch(baseURL);
  const html = await response.text();

  if (!html.includes('OpenTools')) {
    const title = /<title>([^<]*)<\/title>/u.exec(html)?.[1] ?? '(no title)';
    throw new Error(
      `${baseURL} is serving "${title}", not OpenTools. Something else is ` +
        `listening on that port — stop it, or change the port in ` +
        `playwright.config.ts. Running the suite against it would pass ` +
        `without testing anything.`,
    );
  }

  const chunk = localAppChunk();
  if (!chunk) {
    throw new Error(
      `No app chunk found in ${chunksDir}. Run \`npm run build\` in this ` +
        `worktree before the suite — without it there is nothing to compare ` +
        `the server against, and a green run would prove nothing.`,
    );
  }

  if (!html.includes(chunk)) {
    const served = /\/_next\/static\/chunks\/(index-[A-Za-z0-9_-]+\.js)/u.exec(
      html,
    )?.[1];
    throw new Error(
      `${baseURL} is serving a different build of OpenTools.\n` +
        `  this worktree: ${chunk}\n` +
        `  the server:    ${served ?? '(no app chunk in the HTML)'}\n` +
        `Another worktree is almost certainly still listening on that port. ` +
        `Stop it and re-run — the suite would otherwise pass against code you ` +
        `did not change (capsule trap 2).`,
    );
  }
}
