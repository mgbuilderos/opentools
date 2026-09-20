/**
 * Recipe links — a shared URL that reopens a tool with someone else's settings
 * already applied.
 *
 * WHY THIS EXISTS. Sending a colleague "use OpenTools" makes them rebuild the
 * setup by hand. Sending them the file is the behaviour this product exists to
 * stop. A recipe link is the third option: it carries the *settings*, they
 * bring their own file.
 *
 * WHAT IT MAY NEVER CARRY. No filename, no file content, no input text, no
 * token, no hash — nothing the sender supplied. This is not a convention to be
 * remembered at each call site; it is enforced by construction:
 * `buildRecipeSearch` iterates the *definition's* declared fields and never the
 * caller's object keys, so a value the definition does not declare cannot be
 * written into a URL even if a caller passes it. `recipe-link.test.ts` asserts
 * exactly that, so a future field added carelessly fails the build rather than
 * shipping a leak.
 *
 * Constraint C5 of the growth playbook and Learning 35 both say the share
 * object carries the task and never the artifact. Decision 12 sets aside
 * "share links carrying user input" entirely. This module is the settings-only
 * half that those rules do allow.
 *
 * WHY PARAM NAMES ARE SPELLED OUT. `?format=webp&quality=82` rather than
 * `?f=w&q=82`. The recipient is supposed to be able to read the link before
 * they trust it — the growth loops document calls this "inspect every step
 * before running". A URL nobody can read is not inspectable, and the bytes
 * saved buy nothing.
 */

/** One selectable value of a `choice` field, with the label a person reads. */
export type RecipeChoice = {
  readonly value: string;
  readonly label: string;
};

/**
 * A single shareable setting. The three kinds cover every control the tools
 * currently expose: a dropdown, a number box or slider, and a checkbox.
 */
export type RecipeField =
  | {
      readonly kind: 'choice';
      readonly param: string;
      readonly label: string;
      readonly choices: readonly RecipeChoice[];
    }
  | {
      readonly kind: 'integer';
      readonly param: string;
      readonly label: string;
      readonly min: number;
      readonly max: number;
      /** Appended when describing the value, e.g. `px`. */
      readonly unit?: string;
    }
  | {
      readonly kind: 'flag';
      readonly param: string;
      readonly label: string;
      /** How the two states read in a summary, e.g. "metadata removed". */
      readonly whenOn: string;
      readonly whenOff: string;
    };

export type RecipeDefinition = {
  /** Stable id, used in tests and in the catalogue below. */
  readonly id: string;
  /** The page this recipe reopens, e.g. `/image/optimize`. */
  readonly path: string;
  readonly fields: readonly RecipeField[];
};

/** Settings as a tool component holds them. Primitives only, by design. */
export type RecipeValues = Readonly<Record<string, string | number | boolean>>;

/** The param names one definition owns, so a caller can clear just those. */
export function recipeParamNames(definition: RecipeDefinition): string[] {
  return definition.fields.map((field) => field.param);
}

/**
 * Encode settings as query params.
 *
 * Iterates `definition.fields`, NOT `Object.keys(values)`. That asymmetry is
 * the privacy guarantee: an undeclared key is never read, so it can never be
 * written. A declared field whose value is missing or invalid is skipped rather
 * than guessed at.
 */
export function buildRecipeSearch(
  definition: RecipeDefinition,
  values: RecipeValues,
): string {
  const params = new URLSearchParams();
  for (const field of definition.fields) {
    const raw = values[field.param];
    if (raw === undefined || raw === null) continue;
    const encoded = encodeField(field, raw);
    if (encoded !== null) params.set(field.param, encoded);
  }
  return params.toString();
}

function encodeField(
  field: RecipeField,
  raw: string | number | boolean,
): string | null {
  if (field.kind === 'flag') {
    if (typeof raw !== 'boolean') return null;
    return raw ? 'on' : 'off';
  }
  if (field.kind === 'choice') {
    if (typeof raw !== 'string') return null;
    return field.choices.some((choice) => choice.value === raw) ? raw : null;
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
  return raw >= field.min && raw <= field.max ? String(raw) : null;
}

/**
 * Read settings back out of a query string.
 *
 * An invalid value is DROPPED, not clamped. A link claiming `quality=5000` is
 * not a recipe someone made, it is junk or an attempt — and leaving the tool on
 * its own default is the predictable outcome. This matches how the existing
 * `?tool=` deep links treat an operation the page does not have.
 */
export function readRecipeValues(
  definition: RecipeDefinition,
  search: string,
): RecipeValues {
  const params = new URLSearchParams(search);
  const values: Record<string, string | number | boolean> = {};
  for (const field of definition.fields) {
    const raw = params.get(field.param);
    if (raw === null) continue;
    const decoded = decodeField(field, raw);
    if (decoded !== null) values[field.param] = decoded;
  }
  return values;
}

function decodeField(
  field: RecipeField,
  raw: string,
): string | number | boolean | null {
  if (field.kind === 'flag') {
    if (raw === 'on') return true;
    if (raw === 'off') return false;
    return null;
  }
  if (field.kind === 'choice') {
    return field.choices.some((choice) => choice.value === raw) ? raw : null;
  }
  // Number() accepts '', ' ', '0x10' and '1e3'; a recipe integer is none of
  // those, so the shape is checked before the value is.
  if (!/^-?\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return parsed >= field.min && parsed <= field.max ? parsed : null;
}

/**
 * A plain-English summary of what a recipe will do, for the banner shown to
 * whoever opened the link. Only fields actually present are described, so a
 * partial recipe reads honestly instead of implying settings it does not carry.
 */
export function describeRecipe(
  definition: RecipeDefinition,
  values: RecipeValues,
): string {
  const parts: string[] = [];
  for (const field of definition.fields) {
    const value = values[field.param];
    if (value === undefined || value === null) continue;
    if (field.kind === 'flag') {
      if (typeof value === 'boolean')
        parts.push(value ? field.whenOn : field.whenOff);
      continue;
    }
    if (field.kind === 'choice') {
      const choice = field.choices.find((item) => item.value === value);
      if (choice) parts.push(choice.label);
      continue;
    }
    if (typeof value === 'number') {
      parts.push(
        `${field.label} ${value}${field.unit ? ` ${field.unit}` : ''}`,
      );
    }
  }
  return parts.join(' · ');
}

/**
 * The absolute link to copy. `origin` is passed in rather than read from
 * `window` so this stays testable and usable during server rendering.
 */
export function buildRecipeUrl(
  definition: RecipeDefinition,
  values: RecipeValues,
  origin: string,
): string {
  const search = buildRecipeSearch(definition, values);
  const base = `${origin.replace(/\/+$/, '')}${definition.path}`;
  return search ? `${base}?${search}` : base;
}

/* -------------------------------------------------------------------------
 * The declared recipes.
 *
 * Adding a tool here is the whole integration on the data side: the component
 * reads `readRecipeValues` on mount and calls `buildRecipeUrl` for the button.
 * Every field added is a field that will appear in a public URL, so the
 * question to ask of each one is only ever "would I be happy for this to be
 * pasted into a group chat?".
 * ---------------------------------------------------------------------- */

export const IMAGE_OPTIMIZE_RECIPE: RecipeDefinition = {
  id: 'image-optimize',
  path: '/image/optimize',
  fields: [
    {
      // `webp`, not `image/webp`. The MIME type is what the component holds,
      // but a slash becomes `%2F` in a URL and the point of spelling params out
      // is that someone can read the link before trusting it.
      kind: 'choice',
      param: 'format',
      label: 'Output format',
      choices: [
        { value: 'webp', label: 'WebP' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'png', label: 'PNG' },
      ],
    },
    { kind: 'integer', param: 'quality', label: 'quality', min: 10, max: 100 },
    {
      kind: 'integer',
      param: 'width',
      label: 'max width',
      min: 1,
      max: 12000,
      unit: 'px',
    },
    {
      kind: 'integer',
      param: 'height',
      label: 'max height',
      min: 1,
      max: 12000,
      unit: 'px',
    },
  ],
};

export const PDF_COMPRESS_RECIPE: RecipeDefinition = {
  id: 'pdf-compress',
  path: '/pdf/compress',
  fields: [
    {
      kind: 'flag',
      param: 'recompress',
      label: 'Recompress images',
      whenOn: 'images recompressed',
      whenOff: 'images left untouched',
    },
    {
      // 40–95 because that is the range the slider on the page offers. A
      // recipe must not be able to carry a setting the tool cannot display.
      kind: 'integer',
      param: 'quality',
      label: 'photo quality',
      min: 40,
      max: 95,
    },
    {
      // A choice and not an integer, for the same reason: the control is a
      // four-option dropdown, so `maxedge=1234` is not a setting anyone could
      // have chosen and the page would render an empty select if it arrived.
      kind: 'choice',
      param: 'maxedge',
      label: 'Largest photo edge',
      choices: [
        { value: '4000', label: 'full size photos' },
        { value: '2400', label: 'photos to 2400 px (print)' },
        { value: '1600', label: 'photos to 1600 px (screen)' },
        { value: '1000', label: 'photos to 1000 px (email)' },
      ],
    },
    {
      kind: 'flag',
      param: 'metadata',
      label: 'Remove metadata',
      whenOn: 'metadata removed',
      whenOff: 'metadata kept',
    },
  ],
};

export const TEXT_CASE_RECIPE: RecipeDefinition = {
  id: 'text-case',
  path: '/text/case-converter',
  fields: [
    {
      kind: 'choice',
      param: 'mode',
      label: 'Case',
      // These are `textCaseOptions` in lib/tools/text-case.ts, and
      // recipe-link.test.ts asserts the two lists stay identical — so adding a
      // case mode there without adding it here fails the build rather than
      // quietly shipping a share button that drops the chosen mode.
      choices: [
        { value: 'sentence', label: 'Sentence case' },
        { value: 'title', label: 'Title Case' },
        { value: 'upper', label: 'UPPERCASE' },
        { value: 'lower', label: 'lowercase' },
        { value: 'trim-lines', label: 'Trim lines' },
      ],
    },
  ],
};

/** Every declared recipe, so tests can sweep the lot rather than a sample. */
export const ALL_RECIPES: readonly RecipeDefinition[] = [
  IMAGE_OPTIMIZE_RECIPE,
  PDF_COMPRESS_RECIPE,
  TEXT_CASE_RECIPE,
];
