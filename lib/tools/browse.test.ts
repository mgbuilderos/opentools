import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  INITIAL_GROUP_ID,
  INITIAL_SECTIONS,
  loadBrowseSections,
} from './browse';
import { toolGroups, toolSubsectionsForGroup } from './catalog';
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
