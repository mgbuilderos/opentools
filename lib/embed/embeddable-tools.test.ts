import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { isLiveToolUrl } from '@/lib/seo/live-tools';
import {
  EMBEDDABLE_TOOLS,
  embeddableTool,
  embedSnippet,
} from './embeddable-tools';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const componentsDir = path.join(projectRoot, 'components');

describe('the embeddable tool register', () => {
  it('points every attribution link at a page that actually exists', () => {
    // The link out of the frame is the only thing the embed programme earns.
    // A dead one earns nothing and tells a stranger's visitors the project is
    // abandoned, so this is checked against the live-tool register rather than
    // by reading the route folder.
    for (const tool of EMBEDDABLE_TOOLS) {
      expect(
        isLiveToolUrl(tool.canonicalPath),
        `${tool.slug} attributes to ${tool.canonicalPath}, which is not a live tool URL`,
      ).toBe(true);
    }
  });

  it('has a unique slug per tool and resolves them', () => {
    const slugs = EMBEDDABLE_TOOLS.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(embeddableTool(slug)?.slug).toBe(slug);
    }
    expect(embeddableTool('not-a-tool')).toBeUndefined();
  });

  it('offers no file input inside an embed', () => {
    /*
     * The narrow rule from ADR-019 §4, enforced rather than trusted. An embed
     * runs inside a page we cannot see, and a file picker there trains people
     * to hand documents to a frame whose surrounding page may be lying about
     * what it is. Text a visitor pastes is text they chose to paste after
     * reading our own header.
     *
     * Read as source rather than rendered, because the point is to catch the
     * component that adds `<input type="file">` a year from now, in a state
     * a render test would not reach.
     */
    const embedComponents = readFileSync(
      path.join(componentsDir, 'embed-table-converter.tsx'),
      'utf8',
    );
    for (const forbidden of [
      'type="file"',
      'showOpenFilePicker',
      'DataTransfer',
      'onDrop',
      'navigator.clipboard.readText',
      'fetch(',
      'XMLHttpRequest',
    ]) {
      expect(
        embedComponents.includes(forbidden),
        `embed components must not use ${forbidden}`,
      ).toBe(false);
    }
  });

  it('carries the attribution link in the shared frame, not per tool', () => {
    // If a tool could render its own chrome, one of them would eventually
    // render none. The link lives in `EmbedFrame` and every embed route wraps
    // in it, so there is one place to check and one place to break.
    const frame = readFileSync(
      path.join(componentsDir, 'embed-frame.tsx'),
      'utf8',
    );
    expect(frame).toContain('tool.canonicalPath');
    expect(frame).toContain('rel="noopener"');
    // `nofollow` here would silently make the whole programme worthless.
    // Matched inside a `rel` attribute rather than anywhere in the file, so
    // the comment above the link explaining why there is no nofollow does not
    // fail the check that there is no nofollow.
    expect(frame).not.toMatch(/rel="[^"]*nofollow/u);
  });

  it('gives a site owner a plain iframe, with no script and no tracking', () => {
    const snippet = embedSnippet(EMBEDDABLE_TOOLS[0], 'https://example.test');
    expect(snippet).toContain(
      'src="https://example.test/embed/table-converter"',
    );
    expect(snippet).toContain('loading="lazy"');
    expect(snippet).toContain('title=');
    expect(snippet).not.toContain('<script');
    // A query parameter here would be a per-embedder identifier, which is the
    // one thing an embed must never carry: business rules 10 and 34.
    expect(snippet).not.toContain('?');
  });
});
