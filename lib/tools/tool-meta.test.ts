import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { TOOL_META, toolMeta } from './tool-meta';
import { publicTools } from './catalog';

describe('tool metadata', () => {
  it('says exactly what the catalogue says, for every tool', () => {
    // This file is a written-down copy, kept so a tool page does not import the
    // whole catalogue to print its own version string. This is what stops the
    // copy going stale.
    expect(Object.keys(TOOL_META).sort()).toEqual(
      publicTools.map((tool) => tool.id).sort(),
    );

    for (const tool of publicTools) {
      expect(toolMeta(tool.id).version, `${tool.id}: version`).toBe(
        tool.version,
      );
      expect(
        toolMeta(tool.id).shortDescription,
        `${tool.id}: shortDescription`,
      ).toBe(tool.shortDescription);
    }
  });

  it('refuses an unknown id instead of returning undefined', () => {
    // It replaces `publicTools.find(...)!`, whose non-null assertion would have
    // thrown on the next property access. Failing at the lookup names the id.
    expect(() => toolMeta('no-such-tool')).toThrow(/no-such-tool/);
  });

  it('carries no operation data of its own', () => {
    const source = readFileSync(
      path.join(import.meta.dirname, 'tool-meta.ts'),
      'utf8',
    );
    const imports = source.match(/^\s*import\s.*$/gm) ?? [];
    expect(imports, 'tool-meta.ts must import nothing').toEqual([]);
  });

  it('keeps the catalogue out of the components that only need a version', () => {
    // The regression this whole split exists to prevent: one `import
    // { publicTools }` in a tool component puts ~600 KB of other tools' names
    // and descriptions back into that page's eager bundle, and every other test
    // still passes. Three files are listed because `codex/batch` holds them;
    // the list should shrink to nothing, never grow.
    const heldByCodex = [
      'audio-convert-tool.tsx',
      'pdf-compress-tool.tsx',
      'image-optimize-tool.tsx',
    ];
    const components = path.join(import.meta.dirname, '..', '..', 'components');
    const offenders = readdirSync(components)
      .filter((file) => file.endsWith('.tsx'))
      .filter((file) => !heldByCodex.includes(file))
      .filter((file) =>
        /from '@\/lib\/tools\/catalog'/.test(
          readFileSync(path.join(components, file), 'utf8').replace(
            /import type [^;]+;/g,
            '',
          ),
        ),
      );

    expect(
      offenders,
      'imports the catalogue at runtime; use tool-meta, navigation or browse instead',
    ).toEqual([]);
  });
});
