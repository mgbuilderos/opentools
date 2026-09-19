#!/usr/bin/env node
/**
 * Asks one question before a deploy: can today's KV write allowance afford it?
 *
 * WHY THIS EXISTS. The page cache is paid for in KV writes, and the free plan
 * allows about 1,000 a day. A full re-warm costs 206 (103 opted-in pages, two
 * writes each — see docs/CACHE_BUDGET.md). That leaves room for eight deploys a
 * day. On 2026-09-18 there were nine, the allowance ran out, and the site served
 * 503s from an empty cache. Nothing in the repo noticed: cache-budget.test.ts
 * checks the per-deploy cost (206 < 900) and cannot see the deploy count, so it
 * stays green while the real spend is ten times over. This script is the part
 * that can see it.
 *
 * WHAT IT DOES NOT DO. It writes nothing, deploys nothing, and changes no file
 * except its own small state file. It reads Cloudflare's own counters and says
 * go or wait. Run it, read the verdict, then deploy yourself.
 *
 * AUTH. Reuses the Cloudflare login already on this machine, the same way
 * analytics/collect-daily.mjs does. The token is never printed or written.
 *
 * USAGE
 *   node scripts/predeploy.mjs              measure the allowance from Cloudflare
 *   node scripts/predeploy.mjs --used=430   skip the API, supply the number yourself
 *   node scripts/predeploy.mjs --approve    record this commit as deployed
 *
 * Exit code 0 means go, 1 means wait. Safe to put in front of a deploy command.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ACCOUNT = '00f21e5724f9ebf7b1ab0cb42ae76b1e';
const DAILY_ALLOWANCE = 1000;
/**
 * Ceiling, not a bill: a page costs its two writes only when someone actually
 * requests it, so a quiet day spends a fraction of this. 103 opted-in pages x 2
 * keys, as of 2026-09-19. KEEP IN SYNC with `lib/seo/cache-budget.test.ts` --
 * opting a route in there without changing this makes every verdict below
 * optimistic. `WRITE_BUDGET = 1` in that test prints the current count.
 */
const FULL_REWARM = 206;
const ROOT = path.resolve(import.meta.dirname, '..');
const STATE = path.join(ROOT, '.predeploy-state.json');

const arg = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? null;
const has = (name) => process.argv.includes(`--${name}`);

function readWranglerConfig() {
  for (const file of [
    `${homedir()}/Library/Preferences/.wrangler/config/default.toml`,
    `${homedir()}/.wrangler/config/default.toml`,
  ]) {
    if (existsSync(file)) return readFileSync(file, 'utf8');
  }
  return null;
}

/**
 * Wrangler's login expires after a few hours, and the stale token sits in the
 * config file looking perfectly valid — the API just answers "Authentication
 * error". Wrangler refreshes itself on any authenticated command, so ask it to
 * rather than reimplementing the OAuth refresh here.
 */
function cloudflareToken() {
  let text = readWranglerConfig();
  if (!text) return null;

  const expiry = text.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1];
  if (expiry && Date.parse(expiry) <= Date.now()) {
    try {
      execSync('npx --yes wrangler whoami', {
        cwd: ROOT,
        stdio: 'ignore',
        timeout: 90_000,
      });
      text = readWranglerConfig() ?? text;
    } catch {
      // Refresh failed. Carry on with the stale token so the API reports why.
    }
  }

  return text.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1] ?? null;
}

/** KV quotas reset at 00:00 UTC, so "today" starts there and not at local midnight. */
function sinceMidnightUTC() {
  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return {
    from: from.toISOString(),
    to: now.toISOString(),
    reset: from.getTime() + 864e5,
  };
}

async function writesUsedToday() {
  const manual = arg('used');
  if (manual !== null)
    return { used: Number(manual), source: 'supplied by you' };

  const auth = cloudflareToken();
  if (!auth) return { used: null, source: 'no Cloudflare login found' };

  const { from, to } = sinceMidnightUTC();
  const query = `{viewer{accounts(filter:{accountTag:"${ACCOUNT}"}){
    kvOperationsAdaptiveGroups(limit:100,
      filter:{datetime_geq:"${from}", datetime_leq:"${to}"},
      orderBy:[count_DESC]){ count dimensions{ actionType } }
  }}}`;

  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const body = await res.json();
    if (body.errors?.length) {
      return {
        used: null,
        source: `Cloudflare refused: ${body.errors[0].message}`,
      };
    }
    const rows =
      body.data?.viewer?.accounts?.[0]?.kvOperationsAdaptiveGroups ?? [];
    const write = rows
      .filter((r) => /write/i.test(r.dimensions.actionType))
      .reduce((sum, r) => sum + r.count, 0);
    return { used: write, source: 'measured from Cloudflare' };
  } catch (error) {
    return {
      used: null,
      source: `could not reach Cloudflare: ${error.message}`,
    };
  }
}

const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

function readState() {
  if (!existsSync(STATE)) return {};
  try {
    return JSON.parse(readFileSync(STATE, 'utf8'));
  } catch {
    return {};
  }
}

function checkGuards() {
  const config = existsSync(path.join(ROOT, 'next.config.ts'))
    ? readFileSync(path.join(ROOT, 'next.config.ts'), 'utf8')
    : '';
  const layout = existsSync(path.join(ROOT, 'app/layout.tsx'))
    ? readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8')
    : '';
  return {
    buildIdPinned: /generateBuildId/.test(config),
    blanketRevalidate: /^\s*export\s+const\s+revalidate/m.test(layout),
  };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

async function main() {
  const { used, source } = await writesUsedToday();
  const { reset } = sinceMidnightUTC();
  const guards = checkGuards();
  const state = readState();
  const commit = git('rev-parse --short HEAD');

  if (has('approve')) {
    writeFileSync(
      STATE,
      `${JSON.stringify({ lastDeployedCommit: commit, at: new Date().toISOString() }, null, 2)}\n`,
    );
    console.log(
      `Recorded ${commit} as deployed. Next run will compare against it.`,
    );
    return;
  }

  // What this deploy will cost. An unpinned build ID gives every build a fresh
  // random cache key, so the whole cache is orphaned and re-warmed every time.
  const codeChanged = state.lastDeployedCommit !== commit;
  const invalidates = !guards.buildIdPinned || codeChanged;
  const cost = invalidates ? FULL_REWARM : 0;

  console.log('\n  BEFORE YOU DEPLOY\n  ' + '-'.repeat(52));
  console.log(`  Commit             ${commit ?? 'unknown'}`);

  if (used === null) {
    console.log(`  Writes used today  unknown (${source})`);
  } else {
    const left = DAILY_ALLOWANCE - used;
    console.log(
      `  Writes used today  ${used} of ${DAILY_ALLOWANCE}  (${source})`,
    );
    console.log(`  Remaining          ${left}`);
  }

  console.log(
    `  This deploy costs  ${cost === 0 ? '0 — cache survives it' : `~${cost} writes`}`,
  );
  console.log('\n  GUARDS');
  console.log(
    `  ${guards.buildIdPinned ? 'ok  ' : 'WARN'} build ID ${
      guards.buildIdPinned
        ? 'is pinned — identical redeploys are free'
        : 'is NOT pinned — every deploy throws the cache away'
    }`,
  );
  console.log(
    `  ${guards.blanketRevalidate ? 'WARN' : 'ok  '} app/layout.tsx ${
      guards.blanketRevalidate
        ? 'has a blanket revalidate — this caches all 649 pages, ~1,298 writes'
        : 'has no blanket revalidate'
    }`,
  );

  console.log('\n  VERDICT');
  let blocked = false;

  if (guards.blanketRevalidate) {
    console.log(
      '  STOP. A blanket revalidate is back in app/layout.tsx. That alone',
    );
    console.log(
      '  is ~1,298 writes against an allowance of 1,000 — it spends the whole',
    );
    console.log('  budget and caches nothing. Remove it before deploying.');
    blocked = true;
  } else if (cost === 0) {
    console.log(
      '  GO. This commit is already deployed and the build ID is pinned, so',
    );
    console.log('  the cache survives. This deploy costs nothing.');
  } else if (used === null) {
    console.log(
      `  UNKNOWN. Could not read the allowance, so this needs ${cost} writes`,
    );
    console.log('  you cannot currently see.');
    if (/auth/i.test(source)) {
      console.log(
        '  This one is usually just a stale login. Run: npx wrangler login',
      );
    }
    console.log('  Otherwise read the number off the Cloudflare dashboard and');
    console.log('  re-run as:  node scripts/predeploy.mjs --used=<number>');
    blocked = true;
  } else if (DAILY_ALLOWANCE - used < cost) {
    const hours = Math.max(0, Math.ceil((reset - Date.now()) / 36e5));
    console.log(
      `  WAIT. ${plural(DAILY_ALLOWANCE - used, 'write')} left, this needs ${cost}.`,
    );
    console.log(`  The allowance resets in about ${plural(hours, 'hour')}.`);
    console.log(
      '  Deploying now spends what is left and still leaves the cache cold,',
    );
    console.log('  which is what produced the 503s on 2026-09-16.');
    blocked = true;
  } else if (DAILY_ALLOWANCE - used < cost * 2) {
    console.log(
      `  GO — BUT THIS IS YOUR LAST ONE TODAY. ${plural(DAILY_ALLOWANCE - used, 'write')} left,`,
    );
    console.log(`  this needs ${cost}. Batch anything else into it.`);
  } else {
    const spare = Math.floor((DAILY_ALLOWANCE - used) / cost) - 1;
    console.log(
      `  GO. Room for this and about ${plural(spare, 'more deploy')} after it.`,
    );
  }

  if (!guards.buildIdPinned) {
    console.log('\n  The single change that makes this stop mattering: merge');
    console.log(
      '  claude/pin-build-id (one file, 45 lines). Then identical redeploys',
    );
    console.log(
      '  cost nothing and the 8-a-day ceiling stops being a real limit.',
    );
  }

  console.log(
    '\n  After a successful deploy, run:  node scripts/predeploy.mjs --approve\n',
  );
  process.exit(blocked ? 1 : 0);
}

await main();
