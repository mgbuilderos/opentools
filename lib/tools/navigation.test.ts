import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { NAVIGATION_MAJOR_SECTIONS, NAV_GROUPS } from './navigation';
import { toolDestinationsForGroup, toolGroups } from './catalog';

describe('sidebar navigation data', () => {
  it('says exactly what the catalogue says', () => {
    // `navigation.ts` exists so the sidebar never imports `catalog.ts` and its
    // eighteen operation modules -- 655 KB on every page view before the split.
    // The price of that is a written-down copy of four fields per group, and
    // this is what stops the copy going stale. Add a tool, and the count below
    // is what tells you the menu needs updating.
    expect(NAV_GROUPS.map((group) => group.id)).toEqual(
      toolGroups.map((group) => group.id),
    );

    for (const group of toolGroups) {
      const nav = NAV_GROUPS.find((candidate) => candidate.id === group.id)!;
      expect(nav.name, `${group.id}: name`).toBe(group.name);
      expect(nav.shortDescription, `${group.id}: description`).toBe(
        group.shortDescription,
      );
      expect([...nav.toolIds], `${group.id}: tool ids`).toEqual(group.toolIds);
      expect(nav.destinationCount, `${group.id}: destination count`).toBe(
        toolDestinationsForGroup(group).length,
      );
    }
  });

  it('carries no operation data of its own', () => {
    // The whole point is what this file does NOT pull in. An `import` here of
    // anything but types re-creates the 655 KB chunk without anyone noticing,
    // because every other test would still pass.
    const source = readFileSync(
      path.join(import.meta.dirname, 'navigation.ts'),
      'utf8',
    );
    const imports = source.match(/^\s*import\s.*$/gm) ?? [];
    expect(imports, 'navigation.ts must import nothing').toEqual([]);
  });

  it('is what the sidebar renders, so the totals must agree', () => {
    const navIds = NAVIGATION_MAJOR_SECTIONS.flatMap(
      (section) => section.groupCategoryIds,
    );
    expect([...navIds].sort()).toEqual(
      NAV_GROUPS.map((group) => group.id).sort(),
    );

    const browsable = NAV_GROUPS.reduce(
      (total, group) => total + group.destinationCount,
      0,
    );
    const everyDestination = toolGroups.reduce(
      (total, group) => total + toolDestinationsForGroup(group).length,
      0,
    );
    expect(browsable).toBe(everyDestination);
  });
});
