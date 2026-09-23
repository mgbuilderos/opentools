import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { LIVE_TOOL_ROUTES, isLiveToolUrl } from '../seo/live-tools';
import { IMAGE_EDITOR_OPERATIONS } from './catalog';
import {
  IMAGE_STUDIO_BY_ID,
  IMAGE_STUDIO_OPERATIONS,
  IMAGE_STUDIO_ROUTED_OPERATIONS,
} from './image-studio-operations';

/**
 * The image studio is one component reading a list of records, so almost
 * everything that could go wrong with it is a record that says something the
 * engine cannot do, or two records that say the same thing. Neither is visible
 * when you open the page — the second one is only visible in a search engine's
 * index, weeks later, which is the failure this whole family of pages exists
 * to reverse. So both are checked here.
 */

const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const engineSource = readFileSync(
  path.join(projectRoot, 'components/image-studio-tool.tsx'),
  'utf8',
);
const routeSource = readFileSync(
  path.join(projectRoot, 'app/image/[tool]/page.tsx'),
  'utf8',
);

describe('the image studio operation list', () => {
  it('is long enough that a passing run means something', () => {
    // `/image` held thirteen pages on 2026-09-23. Anything that silently
    // emptied this list would make every check below vacuous.
    expect(IMAGE_STUDIO_OPERATIONS.length).toBeGreaterThanOrEqual(30);
  });

  it('gives every job an address of its own, in the sitemap', () => {
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      const route = `/image/${operation.id}`;
      expect(LIVE_TOOL_ROUTES, route).toContain(route);
      expect(isLiveToolUrl(route), route).toBe(true);
    }
  });

  it('uses ids that can be a URL segment and nothing else', () => {
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      expect(operation.id, operation.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    }
  });

  it('repeats no id, name, title or description anywhere in the set', () => {
    // Two pages with one title is the exact condition that made thirteen image
    // jobs rank for nothing: a search engine picks one and drops the other.
    for (const field of ['id', 'name', 'title', 'metaDescription'] as const) {
      const values = IMAGE_STUDIO_OPERATIONS.map((operation) =>
        operation[field].toLowerCase(),
      );
      const seen = new Set<string>();
      const repeated = values.filter((value) => {
        if (seen.has(value)) return true;
        seen.add(value);
        return false;
      });
      expect(repeated, `repeated ${field}`).toEqual([]);
    }
  });

  it('collides with none of the editor ids that share the prefix', () => {
    const editorIds = new Set<string>(
      IMAGE_EDITOR_OPERATIONS.map((operation) => operation.id),
    );
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      expect(editorIds.has(operation.id), operation.id).toBe(false);
    }
  });

  it('writes titles and descriptions a search result can show whole', () => {
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      expect(operation.title.length, operation.id).toBeGreaterThan(24);
      expect(operation.title.length, operation.id).toBeLessThanOrEqual(65);
      expect(
        operation.metaDescription.length,
        operation.id,
      ).toBeGreaterThanOrEqual(80);
      expect(
        operation.metaDescription.length,
        operation.id,
      ).toBeLessThanOrEqual(165);
      // The heading and the lede are read on the page, not in a result.
      expect(operation.name.length, operation.id).toBeGreaterThan(8);
      expect(operation.description.length, operation.id).toBeGreaterThan(30);
    }
  });

  it('hands the registry the three fields it publishes, and no more', () => {
    expect(IMAGE_STUDIO_ROUTED_OPERATIONS).toHaveLength(
      IMAGE_STUDIO_OPERATIONS.length,
    );
    for (const routed of IMAGE_STUDIO_ROUTED_OPERATIONS) {
      expect(Object.keys(routed).sort()).toEqual(['description', 'id', 'name']);
      expect(IMAGE_STUDIO_BY_ID.get(routed.id)?.name).toBe(routed.name);
    }
  });

  it('is reachable by id, with nothing missing from the index', () => {
    expect(IMAGE_STUDIO_BY_ID.size).toBe(IMAGE_STUDIO_OPERATIONS.length);
  });
});

describe('every operation names something the engine can actually run', () => {
  it('asks for no action the component does not implement', () => {
    // A record is data; the engine is a switch. An action nobody wrote a
    // branch for renders a page with a button that does nothing, which is the
    // worst thing a tool page can be.
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      expect(
        engineSource,
        `${operation.id} asks for the action '${operation.action.kind}'`,
      ).toContain(`'${operation.action.kind}'`);
    }
  });

  /*
    Which fields each action reads, written down.

    An earlier version of this check only asked whether the field's id appeared
    anywhere in the engine source. `svg-to-png` declared a `width` control, the
    string `'width'` appeared in the resize branch, the check passed — and the
    control did nothing: the converter always answered at the drawing's own
    size, whatever you typed. Found by opening the page, which is not a
    mechanism. This is the mechanism: a field is legitimate only against an
    action that is known to read it.
  */
  const FIELDS_READ_BY_ACTION: Record<string, readonly string[]> = {
    // Every image-producing action reads these two through `resolveType` and
    // `qualityFraction`.
    '*': ['format', 'quality'],
    convert: ['background', 'width'],
    resize: ['mode', 'width', 'height', 'percent'],
    filter: ['amount', 'radius', 'block', 'brightness', 'contrast'],
    region: ['radius', 'block'],
    border: ['thickness', 'colour'],
    'round-corners': ['radius', 'unit'],
    watermark: ['text', 'size', 'colour', 'opacity', 'position', 'margin'],
    meme: ['top', 'bottom', 'size', 'uppercase'],
    'social-crop': ['preset', 'background'],
    split: ['rows', 'columns'],
    favicon: ['colour', 'keepTransparent'],
    collage: ['columns', 'cell', 'gap', 'colour'],
    'sprite-sheet': ['columns', 'cell', 'gap', 'className'],
    palette: ['count'],
    'colour-picker': [],
    'to-base64': ['wrap'],
    'from-base64': ['base64'],
    'strip-metadata': [],
  };

  it('declares no control the engine does not read for that action', () => {
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      const allowed = new Set([
        ...FIELDS_READ_BY_ACTION['*']!,
        ...(FIELDS_READ_BY_ACTION[operation.action.kind] ?? []),
      ]);
      for (const field of operation.fields) {
        expect(
          [...allowed],
          `${operation.id} draws a '${field.id}' control, but the ` +
            `'${operation.action.kind}' branch of the engine never reads it`,
        ).toContain(field.id);
        // And the engine really does name it, so the table above cannot drift
        // into permitting something no longer implemented.
        expect(
          engineSource,
          `the engine never mentions '${field.id}'`,
        ).toContain(`'${field.id}'`);
      }
    }
  });

  it('names an action for every branch the table claims exists', () => {
    for (const kind of Object.keys(FIELDS_READ_BY_ACTION)) {
      if (kind === '*') continue;
      expect(engineSource, `no engine branch for '${kind}'`).toContain(
        `'${kind}'`,
      );
    }
  });

  it('is wired into the route that writes the pages', () => {
    expect(routeSource).toContain('IMAGE_STUDIO_BY_ID');
    expect(routeSource).toContain('ImageStudioTool');
    // Unchanged on purpose: a past outage came from touching these two.
    expect(routeSource).toContain('export const dynamicParams = false;');
    expect(routeSource).toContain('export function generateStaticParams()');
  });
});

describe('every control is one a person can actually use', () => {
  it('names each field once per operation', () => {
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      const ids = operation.fields.map((field) => field.id);
      expect(new Set(ids).size, operation.id).toBe(ids.length);
    }
  });

  it('starts every field on a value it would accept', () => {
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      for (const field of operation.fields) {
        const where = `${operation.id}.${field.id}`;
        expect(field.label.length, where).toBeGreaterThan(2);
        if (field.type === 'select') {
          const options = (field.options ?? []).map((option) => option.value);
          expect(options.length, where).toBeGreaterThan(1);
          expect(new Set(options).size, where).toBe(options.length);
          expect(options, where).toContain(field.defaultValue);
        }
        if (field.type === 'number' || field.type === 'range') {
          const start = Number(field.defaultValue);
          expect(Number.isFinite(start), where).toBe(true);
          if (field.min !== undefined) {
            expect(start, where).toBeGreaterThanOrEqual(field.min);
          }
          if (field.max !== undefined) {
            expect(start, where).toBeLessThanOrEqual(field.max);
          }
          // A range with no bounds renders as a slider that goes 0 to 100
          // whatever the operation meant, so both are required on one.
          if (field.type === 'range') {
            expect(field.min, where).toBeDefined();
            expect(field.max, where).toBeDefined();
          }
        }
        if (field.type === 'colour') {
          expect(field.defaultValue, where).toMatch(/^#[0-9a-f]{6}$/iu);
        }
        if (field.type === 'checkbox') {
          expect(['on', ''], where).toContain(field.defaultValue);
        }
      }
    }
  });

  it('can say what format every image it produces will be', () => {
    // Without one of the two, `resolveType` would fall back to the source
    // type and a converter would hand back what it was given.
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      if (operation.outputs === 'text') continue;
      // The decoder is the one exception, and it is the honest one: the bytes
      // that were pasted decide the format, so offering a choice would mean
      // either ignoring it or re-encoding something the person asked to get
      // back unchanged.
      if (operation.action.kind === 'from-base64') continue;
      const hasFormatField = operation.fields.some(
        (field) => field.id === 'format',
      );
      expect(
        Boolean(operation.outputType) || hasFormatField,
        `${operation.id} names no output format`,
      ).toBe(true);
    }
  });

  it('accepts files on every tool that needs one', () => {
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      if (operation.action.kind === 'from-base64') {
        // The only one that starts from pasted text.
        expect(operation.accept).toBe('');
        expect(operation.fields.some((field) => field.id === 'base64')).toBe(
          true,
        );
        continue;
      }
      expect(operation.accept, operation.id).toMatch(/^image\//u);
    }
  });

  it('never offers several files to a tool that can only use one', () => {
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      if (!operation.multiple) continue;
      // A picker that takes many files must be an operation that has
      // something to do with the second one.
      expect(
        [
          'convert',
          'resize',
          'filter',
          'border',
          'round-corners',
          'watermark',
          'social-crop',
          'collage',
          'sprite-sheet',
          'strip-metadata',
        ],
        operation.id,
      ).toContain(operation.action.kind);
    }
  });
});

describe('the words on these pages are ones the code can stand behind', () => {
  /*
    Thirty of these titles end in "No Upload", and several say "In Your
    Browser". `lib/tools/local-source-policy.test.ts` already guards the whole
    of `lib/tools`, `workers`, `components` and `app` — this narrows the same
    guard onto the three files this family of pages is made of, so the claim
    and the thing that substantiates it fail together rather than separately.
  */
  const REMOTE = [
    /\bfetch\s*\(/u,
    /\bXMLHttpRequest\b/u,
    /\bWebSocket\s*\(/u,
    /\bEventSource\s*\(/u,
    /\bsendBeacon\s*\(/u,
    /\bRTCPeerConnection\b/u,
    new RegExp(['http', 's?', ':', '//'].join(''), 'u'),
  ];
  const files = [
    'lib/tools/image-studio.ts',
    'lib/tools/image-studio-operations.ts',
    'components/image-studio-tool.tsx',
  ];

  it('reaches nowhere off this tab from any of the three files', () => {
    const violations = files.flatMap((file) => {
      const source = readFileSync(path.join(projectRoot, file), 'utf8');
      return REMOTE.filter((pattern) => pattern.test(source)).map(
        (pattern) => `${file} matched ${pattern.source}`,
      );
    });
    expect(violations).toEqual([]);
  });

  it('claims no upload only where nothing is uploaded', () => {
    const claiming = IMAGE_STUDIO_OPERATIONS.filter((operation) =>
      /no upload|in your browser|without uploading|this tab/iu.test(
        `${operation.title} ${operation.metaDescription}`,
      ),
    );
    // Every one of them is served by the engine checked just above; there is
    // no second code path a studio page can take.
    expect(claiming.length).toBeGreaterThan(20);
    for (const operation of claiming) {
      expect(engineSource).toContain(`'${operation.action.kind}'`);
    }
  });

  it('promises no fidelity or intelligence the pixels do not have', () => {
    // The enlarger resamples. It does not invent detail, and nothing here may
    // imply that it does — that is the claim this category of tool is usually
    // sold on, and the one this site will not make.
    const forbidden =
      /\b(?:AI|A\.I\.|neural|machine learning|lossless upscal\w*|restore detail|enhance detail|super.resolution)\b/iu;
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      const copy = [
        operation.name,
        operation.description,
        operation.title,
        operation.metaDescription,
      ].join(' ');
      expect(forbidden.test(copy), `${operation.id}: ${copy}`).toBe(false);
    }
    const enlarger = IMAGE_STUDIO_BY_ID.get('upscale-image')!;
    expect(`${enlarger.description} ${enlarger.metaDescription}`).toMatch(
      /cannot be recovered|not added|resampling/iu,
    );
  });

  it('describes no format it cannot decode or encode', () => {
    // HEIC, RAW and video are the three people ask for that a browser cannot
    // do unaided. None of them may be named as something these pages produce.
    //
    // "animated GIF" is deliberately allowed: `gif-to-png` says an animation
    // gives you its first frame, which is a limit stated, not a capability
    // claimed. What is checked instead is that no page promises to produce
    // one.
    const unsupported = /\bHEIC\b|\bHEIF\b|\braw file\b|\bmp4\b|\bvideo\b/iu;
    for (const operation of IMAGE_STUDIO_OPERATIONS) {
      const copy = `${operation.name} ${operation.title} ${operation.metaDescription}`;
      expect(unsupported.test(copy), `${operation.id}: ${copy}`).toBe(false);
      expect(
        /\b(?:to|into|as) an? (?:animated|animation|gif)\b/iu.test(copy),
        `${operation.id} promises to produce an animation`,
      ).toBe(false);
    }
  });
});
