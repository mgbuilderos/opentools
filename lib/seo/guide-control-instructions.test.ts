import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * A guide answer may tell a visitor to press a control only when that control
 * is on that tool's own page.
 *
 * Every workbench on this site computes on its own: a debounced run fires a
 * quarter of a second after the last change, and there is no run button. That
 * has been true since `b5fe664` (2026-09-15), which deleted the button and
 * added the auto-run in one hunk. Twenty-one guide answers went on saying
 * "then select Calculate locally", "and select Run locally" and "then click
 * Run operation" for two weeks afterwards, each naming a control no component
 * rendered. `directAnswer` is the text offered for a featured snippet, so for
 * those tools the first sentence a searcher read was an instruction they
 * could not follow.
 *
 * The allow-list below is per slug rather than per label on purpose. A button
 * reading "Calculate" does exist — on the percentage calculator — and a guard
 * that only asked "does some component render this word" would have gone on
 * passing while the add-days guide said "then select Calculate" about a page
 * that has no button at all. Checked against that exact mutation.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const read = (relative: string) =>
  readFileSync(path.join(repoRoot, relative), 'utf8');

/**
 * The verbs a guide uses when it points at a control, and the label that
 * follows. A control label is capitalised, which is what separates
 * "select Calculate locally" from ordinary prose such as "select the rate".
 */
const INSTRUCTION =
  /(?:select|press|click|tap|hit)(?: the)? ([A-Z][A-Za-z0-9]*(?: [A-Za-z0-9]+){0,2})/gu;

/** Words the sentence carries on with once the label has ended. */
const TRAILING_FILLER = new Set([
  'to',
  'and',
  'so',
  'in',
  'on',
  'for',
  'it',
  'them',
  'the',
  'a',
  'until',
  'which',
  'that',
  'or',
  'if',
  'when',
  'after',
  'then',
]);

/**
 * "Press Tab to indent" is an instruction about the keyboard, not about a
 * control, so it is not something a page can be missing.
 */
const KEYBOARD_KEYS = new Set(['Tab', 'Shift', 'Enter', 'Escape', 'Space']);

/**
 * Control → the guides allowed to name it, and the render that proves it is
 * there. Every row was opened and read on 2026-09-30, and `renders` is
 * asserted below, so this cannot decay into a list of claims nobody checked.
 */
const REAL_CONTROLS: ReadonlyArray<{
  label: string;
  slugs: readonly string[];
  file: string;
  renders: string;
}> = [
  {
    label: 'Calculate',
    slugs: ['math-and-units-percentage-calculator'],
    file: 'components/utility-tools.tsx',
    renders: '            Calculate\n',
  },
  {
    label: 'Calculate difference',
    slugs: ['date-time-and-productivity-date-difference-calculator'],
    file: 'components/utility-tools.tsx',
    renders: "            Calculate {age ? 'age' : 'difference'}",
  },
  {
    label: 'Calculate age',
    slugs: ['date-time-and-productivity-age-calculator'],
    file: 'components/utility-tools.tsx',
    renders: "            Calculate {age ? 'age' : 'difference'}",
  },
  {
    label: 'Generate UUIDs',
    slugs: ['developer-and-data-uuid-generator'],
    file: 'components/utility-tools.tsx',
    renders: '            Generate UUIDs\n',
  },
  {
    label: 'Encode text',
    slugs: ['developer-and-data-base64-encoder'],
    file: 'components/utility-tools.tsx',
    renders: "            {isEncode ? 'Encode text' : 'Decode text'}",
  },
  {
    label: 'Decode text',
    slugs: ['developer-and-data-base64-decoder'],
    file: 'components/utility-tools.tsx',
    renders: "            {isEncode ? 'Encode text' : 'Decode text'}",
  },
  {
    label: 'Convert timestamp',
    slugs: ['developer-and-data-unix-timestamp-converter'],
    file: 'components/utility-tools.tsx',
    renders: '            Convert timestamp\n',
  },
  {
    label: 'Mask numbers',
    slugs: ['india-and-life-admin-mask-aadhaar-and-pan-numbers'],
    file: 'components/aadhaar-pan-masker-tool.tsx',
    renders: "                  {running ? 'Masking…' : 'Mask numbers'}",
  },
  {
    label: 'Convert to JSON',
    slugs: ['spreadsheet-and-data-csv-to-json'],
    file: 'components/structured-tools.tsx',
    renders: '                  Convert to JSON\n',
  },
  {
    label: 'Rotate',
    slugs: ['image-image-rotator'],
    file: 'components/image-editor-tool.tsx',
    renders: '<RotateCw aria-hidden="true" /> Rotate',
  },
  {
    label: 'Flip H',
    slugs: ['image-image-flipper'],
    file: 'components/image-editor-tool.tsx',
    renders: '<FlipHorizontal2 aria-hidden="true" /> Flip H',
  },
  {
    label: 'Flip V',
    slugs: ['image-image-flipper'],
    file: 'components/image-editor-tool.tsx',
    renders: '<FlipVertical2 aria-hidden="true" /> Flip V',
  },
];

/**
 * Every component that computes on its own, with the function that does the
 * work. These pages do have buttons — Download, Copy result, Copy speed
 * receipt — but all of them act on a result that is already there. What none
 * has is a control that starts the run, and that is what the guides were
 * sending visitors to look for.
 */
const AUTO_RUNNING_WORKBENCHES = [
  { file: 'components/schema-workbench-tool.tsx', executor: 'execute' },
  { file: 'components/math-workbench-tool.tsx', executor: 'calculate' },
  { file: 'components/file-workbench-tool.tsx', executor: 'execute' },
  { file: 'components/text-workbench-tool.tsx', executor: 'run' },
];

/** Each `'slug': {` entry in GUIDE_DETAILS, with everything up to the next. */
function guideEntries(): ReadonlyArray<{ slug: string; body: string }> {
  const source = read('lib/seo/guide-content.ts');
  const starts = [...source.matchAll(/^ {2}'([a-z0-9-]+)': \{$/gmu)];
  return starts.map((match, index) => ({
    slug: match[1]!,
    body: source.slice(
      match.index,
      index + 1 < starts.length ? starts[index + 1]!.index : source.length,
    ),
  }));
}

describe('guide copy only names controls that exist', () => {
  const entries = guideEntries();

  it('reads the guide entries at all', () => {
    // If the shape of the file ever changes, the sweep below would find
    // nothing and pass for the wrong reason.
    expect(entries.length).toBeGreaterThan(500);
  });

  it('names no control that is missing from the page it describes', () => {
    const allowed = new Map<string, Set<string>>();
    for (const control of REAL_CONTROLS) {
      const slugs = allowed.get(control.label) ?? new Set<string>();
      for (const slug of control.slugs) slugs.add(slug);
      allowed.set(control.label, slugs);
    }

    const wrong: Record<string, string> = {};
    for (const { slug, body } of entries) {
      for (const match of body.matchAll(INSTRUCTION)) {
        const words = match[1]!.split(' ');
        if (KEYBOARD_KEYS.has(words[0]!)) continue;
        while (words.length > 1 && TRAILING_FILLER.has(words.at(-1)!)) {
          words.pop();
        }
        const label = words.join(' ');
        if (allowed.get(label)?.has(slug)) continue;
        wrong[`${slug} → "${label}"`] = match[0]!;
      }
    }

    expect(
      wrong,
      'A guide tells visitors to press something that is not on the page it ' +
        'describes. Open that page: if the control is real, add a row to ' +
        'REAL_CONTROLS naming this slug and the render that proves it; if ' +
        'the page computes on its own, say so in the copy instead.',
    ).toEqual({});
  });

  it.each(REAL_CONTROLS)(
    'proves "$label" is really rendered by $file',
    ({ file, renders }) => {
      expect(read(file)).toContain(renders);
    },
  );

  it.each(REAL_CONTROLS)(
    'keeps "$label" pointed at a guide that exists',
    ({ slugs }) => {
      const known = new Set(entries.map((entry) => entry.slug));
      for (const slug of slugs) expect(known).toContain(slug);
    },
  );

  it.each(AUTO_RUNNING_WORKBENCHES)(
    '$file still computes on its own, with nothing to press',
    ({ file, executor }) => {
      const source = read(file);
      // A debounced run, not a control: the same 250 ms every workbench uses,
      // and the number the guides quote as "a quarter of a second".
      expect(source).toMatch(/setTimeout\([\s\S]*?\}, 250\);/u);
      // Nothing may start the run from a click. If this fails, a run control
      // is back — which is a fine thing to add, but the guides for every tool
      // this component serves are now describing the old page.
      const clickStartsTheRun = new RegExp(
        `onClick=\\{(?:[^{}]|\\{[^{}]*\\})*\\b${executor}\\b`,
        'u',
      );
      expect(source).not.toMatch(clickStartsTheRun);
    },
  );
});
