import { describe, expect, it } from 'vitest';
import { KERNEL_MANIFEST } from '../kernel/manifest';
import { LIVE_TOOL_ROUTES } from '../seo/live-tools';
import { buildCommandCatalogue, NOT_OFFERED } from './build-catalogue';
import { COMMAND_CATALOGUE } from './catalogue.generated';
import { prepare } from './match';

describe('command catalogue', () => {
  /**
   * The generated file is what the browser reads, and the registries are what it
   * was built from. `scripts/generate-command-index.mjs` is the only thing that
   * writes it, so this is what says when somebody has renamed a tool and not run
   * it -- the same arrangement `lib/tools/browse.test.ts` has, for the same
   * reason.
   */
  it('matches what the registries say today', () => {
    expect(
      JSON.parse(JSON.stringify(COMMAND_CATALOGUE)),
      'run `npx tsx scripts/generate-command-index.mjs`',
    ).toEqual(JSON.parse(JSON.stringify(buildCommandCatalogue())));
  });

  /**
   * A live tool with no entry is a tool the box will say nothing about -- and a
   * box that answers "nothing here does this" about a page that exists is worse
   * than no box at all. The only exceptions are the ones named in `NOT_OFFERED`,
   * with the reason written next to them.
   */
  it('can reach every live tool route', () => {
    const indexed = new Set(
      COMMAND_CATALOGUE.map((entry) => entry.href.split('?')[0]),
    );
    const unreachable = LIVE_TOOL_ROUTES.filter(
      (route) => !indexed.has(route) && !NOT_OFFERED[route],
    );
    expect(unreachable).toEqual([]);
  });

  /** An exclusion for a page that no longer exists is an excuse, not a reason. */
  it('excludes only routes that are still live', () => {
    const live = new Set<string>(LIVE_TOOL_ROUTES);
    expect(
      Object.keys(NOT_OFFERED).filter((route) => !live.has(route)),
    ).toEqual([]);
  });

  it('has one entry per address', () => {
    const hrefs = COMMAND_CATALOGUE.map((entry) => entry.href);
    expect(hrefs.length).toBe(new Set(hrefs).size);
  });

  /**
   * THE ONE THAT MAKES THE COMPACT `op` STRING SAFE.
   *
   * An entry stores `"<source> <input> <output>"` and leaves the operation id to
   * be derived from the address, which is 16 KB smaller and exactly as correct --
   * as long as it really is derivable. This checks all of them against the kernel
   * manifest: the id resolves to a real operation from that source, and both
   * kinds are the ones `lib/pipeline/validate.ts` will see when the batch runner
   * revalidates the chain.
   */
  it('carries the kernel manifest, not a copy of it', () => {
    const manifest = new Map(
      KERNEL_MANIFEST.map((descriptor) => [
        `${descriptor.source}:${descriptor.id}`,
        descriptor,
      ]),
    );
    const prepared = prepare(COMMAND_CATALOGUE);
    const wrong = prepared.entries.flatMap((item) => {
      if (!item.op) return [];
      const descriptor = manifest.get(`${item.op.source}:${item.op.id}`);
      if (!descriptor)
        return [`${item.entry.href}: no ${item.op.source}:${item.op.id}`];
      if (descriptor.input !== item.op.input)
        return [
          `${item.entry.href}: input ${item.op.input} vs ${descriptor.input}`,
        ];
      if (descriptor.output.kind !== item.op.output)
        return [
          `${item.entry.href}: output ${item.op.output} vs ${descriptor.output.kind}`,
        ];
      return [];
    });
    expect(wrong).toEqual([]);
  });

  /**
   * The index is downloaded by anyone who types in the box, so its size is a
   * promise to them rather than a detail. Measured on this tree: 1,376 tools in
   * 194,342 bytes of JSON, which Cloudflare serves as about 35 KB of Brotli --
   * around 25 bytes per tool.
   *
   * The ceiling is deliberately close. Storing the descriptions again would pass
   * 290 KB, and did in the first build; anything that puts prose back in here
   * should have to argue for it.
   */
  it('stays small enough to fetch on a keystroke', () => {
    expect(JSON.stringify(COMMAND_CATALOGUE).length).toBeLessThan(240_000);
  });
});
