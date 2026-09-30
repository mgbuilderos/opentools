import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { isLiveToolUrl } from '@/lib/seo/live-tools';
import {
  TEXT_OPERATIONS,
  type TextOperationId,
} from '@/lib/tools/text-workbench';
import { EMBEDDABLE_TOOLS, embeddableToolByPath } from './embeddable-tools';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const read = (relative: string) =>
  readFileSync(path.join(projectRoot, relative), 'utf8');

/**
 * WHAT THIS PROTECTS, AND WHY IT IS WORTH A FILE.
 *
 * On 2026-09-30 the embed programme had been live since 24 September and had
 * received ONE request in 24 hours, because nothing linked to it: every one of
 * the 1,031 pages on the site rendered without a single `/embed` link. That was
 * not a bug in any file — it was the absence of a file, which no test can catch
 * by reading the ones that exist. So this reads the two things that make the
 * entry point reachable at all, and fails if either is undone.
 */
describe('the embed entry point', () => {
  it('resolves every registered tool from its own canonical path', () => {
    expect(EMBEDDABLE_TOOLS.length).toBeGreaterThan(0);
    for (const tool of EMBEDDABLE_TOOLS) {
      expect(embeddableToolByPath(tool.canonicalPath)).toBe(tool);
    }
  });

  it('points at pages that are actually live, so the button cannot 404', () => {
    for (const tool of EMBEDDABLE_TOOLS) {
      /* A bare path, which is what LIVE_TOOL_ROUTES holds and what
         embeddable-tools.test.ts already passes — isLiveToolUrl splits on `?`
         only, so an origin-prefixed URL never matches. */
      expect(
        isLiveToolUrl(tool.canonicalPath),
        `${tool.slug} -> ${tool.canonicalPath}`,
      ).toBe(true);
    }
  });

  it('offers nothing on a page whose tool cannot be embedded', () => {
    /* File tools can never be embeddable — ADR-019 §4. A button here would be
       a promise the project has decided never to keep. */
    for (const pathname of [
      '/pdf/redact',
      '/data/csv-join',
      '/math/median-calculator',
      '/image/optimize',
      '/',
    ]) {
      expect(embeddableToolByPath(pathname)).toBeUndefined();
    }
  });

  it('does not match a trailing slash or a localised edition of the same tool', () => {
    for (const tool of EMBEDDABLE_TOOLS) {
      expect(embeddableToolByPath(`${tool.canonicalPath}/`)).toBeUndefined();
      expect(embeddableToolByPath(`/de${tool.canonicalPath}`)).toBeUndefined();
    }
  });

  it('is rendered by the shell every page uses, not opted into per tool', () => {
    /* Read as text rather than by rendering: the point is that ONE
       unconditional call site exists, which is a fact about the source. */
    const shell = read('components/app-shell.tsx');
    expect(shell).toContain(
      "import { EmbedThisTool } from '@/components/embed-this-tool';",
    );
    expect(shell).toContain('<EmbedThisTool />');
  });

  it('decides what to show from the register, and from nothing else', () => {
    const component = read('components/embed-this-tool.tsx');
    expect(component).toContain('embeddableToolByPath');
    /* A hardcoded slug or path here would survive a tool being removed from the
       register and keep offering an embed that no longer exists. */
    for (const tool of EMBEDDABLE_TOOLS) {
      /* The bare slug anywhere, not just as a whole quoted string: an early
         version of this test only rejected `'table-converter'` and so missed
         `'/embed#table-converter'`, which is exactly the mutation it was
         written to catch. The component refers to the value as `tool.slug`,
         so the slug's own text must never appear. */
      expect(component).not.toContain(tool.slug);
      expect(component).not.toContain(tool.canonicalPath);
    }
  });

  it('gives every registered slug a component, so none renders a 404', () => {
    /* `EMBED_COMPONENTS` lives in the route file and cannot be imported here --
       it pulls client components into this suite's module graph. Read as text,
       which is enough: the failure being guarded against is a slug added to the
       register and forgotten in the map, which is a missing line. */
    const route = read('app/embed/[tool]/page.tsx');
    for (const tool of EMBEDDABLE_TOOLS) {
      expect(route, `${tool.slug} has no component`).toContain(
        `'${tool.slug}'`,
      );
    }
  });

  it('registers no text operation that would need options inside a frame', () => {
    /* An operation with an `optionKind` needs a find field, a separator or a
       sort direction, and an embed with controls is a small application on
       somebody else's page rather than the one-input-one-output thing the
       programme promises. Checked against the operation register itself, so a
       slug that silently gains options upstream fails here. */
    const byId = new Map(TEXT_OPERATIONS.map((item) => [item.id, item]));
    for (const tool of EMBEDDABLE_TOOLS) {
      const operation = byId.get(tool.slug as TextOperationId);
      if (!operation) continue; // not a text operation, e.g. table-converter
      expect(
        operation.optionKind,
        `${tool.slug} takes options`,
      ).toBeUndefined();
    }
  });

  it('agrees with the text register about what each tool is called', () => {
    /* The summary a site owner reads before embedding must describe the tool
       they get. A slug that matches an operation must name that operation. */
    const ids = new Set(TEXT_OPERATIONS.map((item) => item.id as string));
    for (const tool of EMBEDDABLE_TOOLS) {
      if (!ids.has(tool.slug)) continue;
      expect(tool.canonicalPath).toBe(`/text/${tool.slug}`);
    }
  });

  it('links each tool to its own snippet, which needs an anchor to land on', () => {
    expect(read('components/embed-this-tool.tsx')).toContain('/embed#');
    expect(read('app/embed/page.tsx')).toContain('id={tool.slug}');
  });
});
