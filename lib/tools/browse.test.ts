import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  INITIAL_GROUP_ID,
  INITIAL_SECTIONS,
  loadBrowseSections,
} from './browse';
import {
  toolDestinationsForGroup,
  toolGroups,
  toolSubsectionsForGroup,
} from './catalog';
import { NAV_GROUPS } from './navigation';

describe('category browse data', () => {
  it('matches the catalogue for every category', async () => {
    // These files are generated from `toolSubsectionsForGroup` so the home page
    // does not have to import `catalog.ts` and its eighteen operation modules.
    // A generated copy that nobody re-generates is a lie with a timestamp, so
    // this compares all seventeen against the function they came from.
    for (const group of toolGroups) {
      const expected = toolSubsectionsForGroup(group);
      const actual = await loadBrowseSections(group.id);
      expect(JSON.parse(JSON.stringify(actual)), group.id).toEqual(
        JSON.parse(JSON.stringify(expected)),
      );
    }
  });

  /**
   * The sections must be a PARTITION of the group's tools: every tool in
   * exactly one section, none twice, none missing.
   *
   * This is the assertion that was missing on 2026-09-25, and the shape of the
   * gap is worth keeping in mind. `navigation.test.ts` checks
   * `destinationCount` against `toolDestinationsForGroup` -- the flat list, 28
   * for QR -- and every other test passed too. Nothing compared that against
   * what `toolSubsectionsForGroup` RENDERS, which was 56: the barcode
   * predicate matched all 28 tools (their ids all begin
   * `qr-barcode-workbench:`), so the QR bucket came out empty and a fallback
   * filled it with the whole list. The home page showed every QR tool twice,
   * under a heading that said 28.
   *
   * Each subsection splits its group with a predicate of its own, so this is
   * the one guard that covers all seventeen at once -- and the next one.
   */
  it('puts every tool in exactly one section, and none of them twice', () => {
    for (const group of toolGroups) {
      const rendered = toolSubsectionsForGroup(group).flatMap(
        (section) => section.destinations,
      );
      const ids = rendered.map((destination) => destination.id);
      const duplicated = [
        ...new Set(ids.filter((id, at) => ids.indexOf(id) !== at)),
      ];
      expect(
        duplicated,
        `${group.id} renders these tools more than once`,
      ).toEqual([]);

      const expected = toolDestinationsForGroup(group).map(({ id }) => id);
      expect(
        [...ids].sort(),
        `${group.id} sections drop or invent a tool`,
      ).toEqual([...expected].sort());
    }
  });

  /**
   * The number the home page prints above the cards, against the cards it then
   * prints. `navigation.test.ts` ties `destinationCount` to the catalogue; this
   * ties it to what a visitor actually counts on the screen. Both have to hold,
   * and on 2026-09-25 only the first one did.
   */
  it('states the number of tools it goes on to render', () => {
    for (const group of toolGroups) {
      const nav = NAV_GROUPS.find((candidate) => candidate.id === group.id)!;
      const cards = toolSubsectionsForGroup(group).reduce(
        (total, section) => total + section.destinations.length,
        0,
      );
      expect(cards, `${group.id} says ${nav.destinationCount}`).toBe(
        nav.destinationCount,
      );
    }
  });

  it('serves the default category without waiting', () => {
    // The prerendered HTML contains these exact cards. If they are not present
    // at the first client render, React throws the page away and rebuilds it,
    // which is the one failure mode that would be worse than the weight.
    const group = toolGroups.find((g) => g.id === INITIAL_GROUP_ID)!;
    expect(JSON.parse(JSON.stringify(INITIAL_SECTIONS))).toEqual(
      JSON.parse(JSON.stringify(toolSubsectionsForGroup(group))),
    );
  });

  it('has a literal import for every category and no computed path', () => {
    // A bundler can only split what it can read. `import(\`./browse/${id}\`)`
    // compiles to "include all seventeen", which would restore the 1573 KB
    // home page while every other test here still passed.
    const source = readFileSync(
      path.join(import.meta.dirname, 'browse.ts'),
      'utf8',
    );
    for (const group of NAV_GROUPS) {
      expect(source, `no literal import for ${group.id}`).toContain(
        `import('./browse/${group.id}')`,
      );
    }
    expect(/import\(\s*`/.test(source), 'template-literal import()').toBe(
      false,
    );
  });

  it('keeps each category file to just its own data', () => {
    const dir = path.join(import.meta.dirname, 'browse');
    for (const group of NAV_GROUPS) {
      const source = readFileSync(path.join(dir, `${group.id}.ts`), 'utf8');
      const imports = source.match(/^\s*import\s.*$/gm) ?? [];
      expect(imports, `${group.id} must import only its type`).toEqual([
        "import type { BrowseSection } from '../browse';",
      ]);
    }
  });
});
