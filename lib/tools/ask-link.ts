/**
 * Ask links — one link that says what file you need, sent to someone who has it.
 *
 * WHY THIS EXISTS. An HR manager, a college admin, a CA and an immigration
 * consultant all spend their day typing *"send me your photo, 200 × 230 px,
 * under 50 KB"*. That message goes out over chat thousands of times a day, and
 * the person receiving it uploads their ID photograph to whichever ad-funded
 * site ranks first. An ask link replaces the message: the recipient lands on a
 * page that states the requirement in words, chooses the file on their own
 * machine, and the work runs there. Nothing about the file reaches us, so the
 * sender cannot leak anything through us either — there is nothing to leak.
 *
 * WHAT IT IS BUILT ON, AND WHY NOTHING NEW WAS INVENTED. The encoding problem
 * here is the one `lib/tools/recipe-link.ts` already solved: put settings in a
 * URL, never content. A `RecipeDefinition` *is* the parameter allowlist — it
 * declares each field's kind, its bounds and its choices — and
 * `buildRecipeSearch` iterates the definition rather than the caller's object,
 * so an undeclared key cannot be written even by a careless call site. An ask
 * link therefore holds a recipe definition rather than a parameter schema of
 * its own; there is one allowlist per destination tool and both features read
 * it. A second schema would be a second place for a leak to be introduced.
 *
 * WHAT AN ASK LINK ADDS on top of that:
 *
 * - **A finite set of requests**, each with a stable id that appears in the
 *   path (`/ask/image`). Unknown ids resolve to null, so `/ask/<anything>` is
 *   not a way to reach an arbitrary destination.
 * - **A format version**, `v=1`. A link is pasted into a chat and opened weeks
 *   later; a version means a future change can be recognised instead of
 *   silently misread.
 * - **Plain language**, generated from the definition and the *sanitised*
 *   values — never from anything the sender typed. See `describeAskRequest`.
 *
 * WHAT IT MAY NEVER CARRY, and this list is the point of the feature: no file,
 * no file bytes, no filename, no pasted text, no free-text title or message, no
 * email address, no phone number, no account or device id, no token, no hash of
 * anything the sender holds, no result, no tracking id. Business rule 32 and
 * growth-brief G1 constraint 1 both say so, and `ask-link.test.ts` asserts it by
 * sweeping the registry rather than by checking one example.
 *
 * WHY THERE IS NO CUSTOM LABEL IN THE LINK. A free-text field would be the
 * obvious nicety — "Photo for the Class of 2027 application" — and it is exactly
 * the channel this feature exists to avoid. One typed line is enough to carry a
 * candidate's name, a case number or a phone number into a URL that gets
 * forwarded. The creator may hold a label locally for its own UI; it is not
 * serialised, and the test sweeps for that too.
 *
 * WHY NOT A RETURN CHANNEL. The finished file goes to the recipient and they
 * send it on themselves. A return path through us would mean receiving the file,
 * which would end the only claim this product actually has. G1 constraint 2 says
 * refuse it if asked; this module has no notion of a sender to return to.
 */
import {
  IMAGE_EXACT_SIZE_RECIPE,
  IMAGE_OPTIMIZE_RECIPE,
  PDF_COMPRESS_RECIPE,
  buildRecipeSearch,
  describeRecipe,
  readRecipeValues,
  recipeParamNames,
  sanitiseRecipeValues,
  type RecipeDefinition,
  type RecipeValues,
} from './recipe-link';

/**
 * The format version, written into every link as `v` and required on the way
 * back in.
 *
 * WHY IT IS REQUIRED RATHER THAN DEFAULTED. A link with no version is either
 * hand-edited or from somewhere else, and in both cases the safe reading is
 * "not an ask link", which is what `readAskLink` returns. Being lenient here
 * would mean a future version 2 could not tell itself apart from a v1 link
 * that lost its parameters in a chat app's URL mangling.
 */
export const ASK_LINK_VERSION = 1;

/** The query parameter the version travels in. */
export const ASK_VERSION_PARAM = 'v';

/** Every ask link starts here. `/ask` itself is the creator. */
export const ASK_LINK_PREFIX = '/ask';

/** How one allowlisted parameter is labelled for a person. */
export type AskControl = {
  /** A parameter the request's recipe declares. */
  readonly param: string;
  /** The form label, and the label the recipient sees beside the value. */
  readonly label: string;
  /** One line under the control, where the label alone is not enough. */
  readonly help?: string;
};

/**
 * One kind of file somebody can be asked for.
 *
 * Everything a route, a page, a description and a test needs about a request is
 * here, so adding one is a single declaration and never a sweep through
 * components looking for the places that switch on a type.
 */
export type AskRequest = {
  /** Stable id. It is the last path segment: `/ask/<id>`. */
  readonly id: string;
  /**
   * The parameter allowlist, defaults excluded — a recipe definition from
   * `lib/tools/recipe-link.ts`, shared with the share-a-setup feature so there
   * is one list of what may appear in a URL per destination tool.
   */
  readonly recipe: RecipeDefinition;
  /** What the creator picks from a list, e.g. "Image (JPEG, WebP or PNG)". */
  readonly menuLabel: string;
  /** One line under it, to tell two image requests apart. */
  readonly menuHint: string;
  /** The recipient's heading, e.g. "Prepare an image". */
  readonly headline: string;
  /**
   * The recipient page's meta description.
   *
   * One per request, and not one shared sentence with the request name
   * substituted: `lib/seo/description-coverage.test.ts` fails when two pages
   * describe themselves identically, which is the right rule even for a page
   * that says `noindex` — a description nobody wrote for that page is a
   * description nobody checked.
   */
  readonly metaDescription: string;
  /** What the file input accepts, and what the recipient is told it takes. */
  readonly accept: string;
  /** Singular noun for the file, used in sentences: "Choose your image". */
  readonly subjectNoun: string;
  /**
   * The verb phrase the requirement sentence is built from. Held here rather
   * than composed in a component so every surface says the same thing and a
   * change lands in one place.
   */
  readonly requirementVerb: string;
  /**
   * Settings the creator starts on.
   *
   * These are what a first-time sender sees, and they are passed through the
   * definition's own sanitiser before use, so a default that drifts out of its
   * field's bounds is dropped rather than silently shipped in a link.
   */
  readonly defaults: RecipeValues;
  /**
   * How each parameter is presented, in the order it is shown.
   *
   * WHY THE LABELS ARE NOT THE DEFINITION'S. A recipe field's label is written
   * for the dense summary above a tool's controls — `at most 50 KB`,
   * `max width 1200 px` — which reads correctly in a sentence and badly over a
   * form input. Presentation belongs to the surface; the allowlist belongs to
   * the definition. Keeping them apart also means a label can be reworded
   * without touching the file that decides what may enter a URL.
   *
   * `ask-link.test.ts` asserts these cover the definition's parameters exactly:
   * a control naming a parameter that does not exist would render a dead
   * input, and a parameter with no control would be a setting the sender
   * cannot reach and the recipient's tool would still apply.
   */
  readonly controls: readonly AskControl[];
  /**
   * What the recipient's output can be checked against, for the browser tests.
   *
   * Present so a claim on the page and the assertion that proves it cannot
   * drift apart: `formatByParam` maps the value of the format field to the
   * magic bytes the saved file must start with, and the two dimension params
   * name the fields a test should read the pixel size back against. Nothing
   * here is rendered.
   */
  readonly verify: {
    /** Format param value → the bytes a correct output begins with. */
    readonly signatures: Readonly<Record<string, readonly number[]>>;
    /** Which params, if any, bound the output's pixel size. */
    readonly maxWidthParam?: string;
    readonly maxHeightParam?: string;
    /** Set when the output's pixel size is exact rather than an upper bound. */
    readonly exactPixels?: boolean;
    /** Set when the tool searches for a file at or under this many KB. */
    readonly maxKbParam?: string;
  };
};

const JPEG = [0xff, 0xd8, 0xff] as const;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
/** `RIFF` — a WebP file is `RIFF....WEBP`, so the tag is checked at byte 8. */
const RIFF = [0x52, 0x49, 0x46, 0x46] as const;
/** `%PDF-` */
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;

/**
 * Convert an image, and hold it under a pixel bound.
 *
 * Destination `/image/optimize`, which already reads these four parameters on
 * arrival — this request adds no plumbing to the tool, which is why it is
 * first. The width and height are *maxima*: the tool fits the image inside
 * them and never enlarges, so the honest wording is "no wider than", which is
 * what `describeAskRequest` produces.
 */
export const ASK_IMAGE: AskRequest = {
  id: 'image',
  recipe: IMAGE_OPTIMIZE_RECIPE,
  menuLabel: 'An image, converted and resized',
  menuHint: 'JPEG, WebP or PNG, with a size limit in pixels.',
  headline: 'Prepare an image',
  metaDescription:
    'Somebody has asked you for an image in a particular format and size. Prepare it here, on this device, and send it to them yourself.',
  accept: 'image/*',
  subjectNoun: 'image',
  requirementVerb: 'Please provide',
  defaults: { format: 'jpeg', quality: 80, width: 1200, height: 1200 },
  controls: [
    { param: 'format', label: 'File format' },
    {
      param: 'width',
      label: 'Maximum width',
      help: 'Wider images are scaled down. Narrower ones are left alone.',
    },
    { param: 'height', label: 'Maximum height' },
    {
      param: 'quality',
      label: 'Quality',
      help: 'Lower means a smaller file. 80 is a good default for photographs.',
    },
  ],
  verify: {
    signatures: { jpeg: JPEG, png: PNG, webp: RIFF },
    maxWidthParam: 'width',
    maxHeightParam: 'height',
  },
};

/**
 * A photograph or signature at exact pixels and under a size limit.
 *
 * Destination `/image/exact-size`. This is the request the whole feature was
 * described from — every exam and government portal states its requirement in
 * exactly these terms — and it is the only one whose link names a number of
 * kilobytes. The tool measures real encoded bytes and reports when it cannot
 * reach the limit, so the sentence stays a *request* ("no larger than 50 KB")
 * and never a promise about what comes out.
 */
export const ASK_EXACT_SIZE: AskRequest = {
  id: 'photo-size',
  recipe: IMAGE_EXACT_SIZE_RECIPE,
  menuLabel: 'A photo or signature at an exact size',
  menuHint: 'Exact pixels and a limit in KB, the way upload forms ask for it.',
  headline: 'Prepare a photo',
  metaDescription:
    'Somebody has asked you for a photo at exact pixel dimensions under a size limit. Prepare it here, on this device, and send it yourself.',
  accept: 'image/*',
  subjectNoun: 'photo',
  requirementVerb: 'Please provide',
  defaults: {
    format: 'jpeg',
    maxkb: 50,
    width: 200,
    height: 230,
    fit: 'crop',
  },
  controls: [
    { param: 'format', label: 'File format' },
    { param: 'width', label: 'Exact width' },
    { param: 'height', label: 'Exact height' },
    {
      param: 'maxkb',
      label: 'Maximum size',
      help: 'In KB, as the upload form states it. 1 KB here is 1,024 bytes.',
    },
    {
      param: 'fit',
      label: 'If the shape does not match',
      help: 'What to do when the photo is not already this shape.',
    },
  ],
  verify: {
    signatures: { jpeg: JPEG, png: PNG },
    maxWidthParam: 'width',
    maxHeightParam: 'height',
    exactPixels: true,
    maxKbParam: 'maxkb',
  },
};

/**
 * A smaller PDF.
 *
 * Destination `/pdf/compress`, which reads all four of these on arrival. There
 * is deliberately **no size promise** in this one: the compressor recompresses
 * photographs and drops metadata, and how much smaller the file gets depends
 * entirely on what is in it. A link that said "under 2 MB" would be a number
 * nothing here can stand behind, so the wording describes the treatment and
 * stops.
 */
export const ASK_PDF: AskRequest = {
  id: 'pdf',
  recipe: PDF_COMPRESS_RECIPE,
  menuLabel: 'A smaller PDF',
  menuHint: 'Recompresses photographs inside the PDF and can drop metadata.',
  headline: 'Prepare a PDF',
  metaDescription:
    'Somebody has asked you for a smaller PDF. Prepare it here, on this device, in this browser tab, and send it to them yourself.',
  accept: 'application/pdf,.pdf',
  subjectNoun: 'PDF',
  requirementVerb: 'Please provide',
  defaults: {
    recompress: true,
    quality: 70,
    maxedge: '1600',
    metadata: true,
  },
  controls: [
    {
      param: 'recompress',
      label: 'Recompress photographs inside the PDF',
      help: 'Leave this off for a PDF that is only text — it would change nothing.',
    },
    {
      param: 'quality',
      label: 'Photograph quality',
      help: 'Lower means a smaller file. Only applies when recompressing.',
    },
    { param: 'maxedge', label: 'Largest photograph edge' },
    {
      param: 'metadata',
      label: 'Remove metadata',
      help: 'Drops the author, producer and timestamps the PDF carries.',
    },
  ],
  verify: { signatures: { pdf: PDF } },
};

/**
 * Every request that exists.
 *
 * A finite list, read by the route, the creator, the recipient and the tests,
 * so "which requests ship" has exactly one answer. The route's
 * `generateStaticParams` maps over this, which means an id that is not here has
 * no page at all rather than a page that fails late.
 */
export const ASK_REQUESTS: readonly AskRequest[] = [
  ASK_IMAGE,
  ASK_EXACT_SIZE,
  ASK_PDF,
];

/** The ids, for `generateStaticParams` and for tests. */
export const ASK_REQUEST_IDS: readonly string[] = ASK_REQUESTS.map(
  (request) => request.id,
);

/**
 * Look up a request by id.
 *
 * `find` over the declared list and not a record lookup, so `__proto__`,
 * `constructor` and every other inherited key answer null like any other
 * unknown id. A record would hand back `Object.prototype.constructor` for the
 * second of those.
 */
export function findAskRequest(
  id: string | undefined | null,
): AskRequest | null {
  if (typeof id !== 'string' || id === '') return null;
  return ASK_REQUESTS.find((request) => request.id === id) ?? null;
}

/** The page a request's link points at. */
export function askRequestPath(request: AskRequest): string {
  return `${ASK_LINK_PREFIX}/${request.id}`;
}

/**
 * Reduce settings to what the request's own definition allows.
 *
 * A thin pass-through to `sanitiseRecipeValues`, which encodes and decodes
 * against the definition — so whatever survives has been filtered twice by the
 * declaration and never once by the caller.
 */
export function sanitiseAskValues(
  request: AskRequest,
  values: RecipeValues,
): RecipeValues {
  return sanitiseRecipeValues(request.recipe, values);
}

/** The request's starting settings, put through its own sanitiser first. */
export function askDefaults(request: AskRequest): RecipeValues {
  return sanitiseAskValues(request, request.defaults);
}

/**
 * The absolute link to copy.
 *
 * `origin` is passed in rather than read from `window` so this is testable and
 * usable while rendering on the server. The version goes first because a person
 * reading the link should see what kind of thing it is before the settings.
 */
export function buildAskLinkUrl(
  request: AskRequest,
  values: RecipeValues,
  origin: string,
): string {
  const search = buildRecipeSearch(request.recipe, values);
  const base = `${origin.replace(/\/+$/, '')}${askRequestPath(request)}`;
  const query = search
    ? `${ASK_VERSION_PARAM}=${ASK_LINK_VERSION}&${search}`
    : `${ASK_VERSION_PARAM}=${ASK_LINK_VERSION}`;
  return `${base}?${query}`;
}

/** What arrived on an ask link, once everything unrecognised is discarded. */
export type AskArrival = {
  readonly request: AskRequest;
  readonly values: RecipeValues;
};

/**
 * Read an ask link.
 *
 * Both halves must check out: a request id that is declared, and a version this
 * build understands. Anything else is null, and the recipient page renders the
 * "this link is not one we recognise" state rather than guessing.
 *
 * The values are read by `readRecipeValues`, so an unknown parameter is not
 * present in the result, an out-of-range number is dropped rather than clamped,
 * and a choice the tool does not offer is dropped too. A link with no valid
 * settings left is still a valid arrival — the recipient is asked for that kind
 * of file on the tool's own defaults, which is honest — but `describeAskRequest`
 * then has nothing to promise and says so.
 */
export function readAskLink(
  id: string | undefined | null,
  search: string,
): AskArrival | null {
  const request = findAskRequest(id);
  if (!request) return null;
  const version = new URLSearchParams(search).get(ASK_VERSION_PARAM);
  if (version !== String(ASK_LINK_VERSION)) return null;
  return { request, values: readRecipeValues(request.recipe, search) };
}

/**
 * The requirement, in the words the recipient reads.
 *
 * Built from the definition's own labels and the sanitised values, so every
 * clause traces back to a declared field. Nothing the sender typed can reach
 * this, because nothing the sender typed reaches the URL.
 *
 * WHY THE PHRASING IS PER-FIELD AND NOT `describeRecipe`. `describeRecipe`
 * produces `JPEG · quality 80 · max width 1200 px`, which is right above a set
 * of controls somebody is about to change. A recipient has no controls and no
 * context; they need a sentence. So this states the format as a noun, calls a
 * maximum a maximum, and leaves out quality entirely — a number from 1 to 100
 * that means nothing to someone who did not choose it, and the tool applies it
 * either way.
 */
export function describeAskRequest(
  request: AskRequest,
  values: RecipeValues,
): string {
  const clean = sanitiseAskValues(request, values);
  const noun = formatNoun(request, clean) ?? request.subjectNoun;
  const clauses = requirementClauses(request, clean);
  const tail = clauses.length ? ` ${joinClauses(clauses)}` : '';
  return `${request.requirementVerb} ${article(noun)} ${noun}${tail}.`;
}

/** `JPEG image`, `PDF` — the thing being asked for, named by its format. */
function formatNoun(request: AskRequest, values: RecipeValues): string | null {
  const field = request.recipe.fields.find(
    (candidate) => candidate.param === 'format' && candidate.kind === 'choice',
  );
  if (!field || field.kind !== 'choice') return null;
  const chosen = field.choices.find((choice) => choice.value === values.format);
  return chosen ? `${chosen.label} ${request.subjectNoun}` : null;
}

function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? 'an' : 'a';
}

/** "no wider than 1200 px", "200 × 230 px", "no larger than 50 KB". */
function requirementClauses(
  request: AskRequest,
  values: RecipeValues,
): string[] {
  const clauses: string[] = [];
  const { maxWidthParam, maxHeightParam, exactPixels, maxKbParam } =
    request.verify;
  const width = maxWidthParam ? values[maxWidthParam] : undefined;
  const height = maxHeightParam ? values[maxHeightParam] : undefined;

  if (exactPixels) {
    if (typeof width === 'number' && typeof height === 'number') {
      clauses.push(`${width} × ${height} px`);
    } else if (typeof width === 'number') {
      clauses.push(`${width} px wide`);
    } else if (typeof height === 'number') {
      clauses.push(`${height} px tall`);
    }
  } else {
    if (typeof width === 'number') clauses.push(`no wider than ${width} px`);
    if (typeof height === 'number') clauses.push(`no taller than ${height} px`);
  }

  if (maxKbParam) {
    const limit = values[maxKbParam];
    if (typeof limit === 'number') clauses.push(`no larger than ${limit} KB`);
  }
  return clauses;
}

function joinClauses(clauses: string[]): string {
  if (clauses.length === 1) return clauses[0]!;
  return `${clauses.slice(0, -1).join(', ')} and ${clauses.at(-1)}`;
}

/**
 * Every setting in the link, listed for the recipient to read before they
 * choose a file.
 *
 * The sentence above deliberately leaves out quality and the fit mode; this is
 * where they are shown, because "the link contains only these settings" is a
 * claim that has to be checkable. Built from the definition's own labels, so a
 * field added to a recipe appears here with no further work.
 */
export function askSettingLines(
  request: AskRequest,
  values: RecipeValues,
): { label: string; value: string }[] {
  const clean = sanitiseAskValues(request, values);
  const lines: { label: string; value: string }[] = [];
  for (const control of request.controls) {
    const field = request.recipe.fields.find(
      (candidate) => candidate.param === control.param,
    );
    if (!field) continue;
    const raw = clean[field.param];
    if (raw === undefined) continue;
    if (field.kind === 'choice') {
      const choice = field.choices.find((candidate) => candidate.value === raw);
      if (choice) lines.push({ label: control.label, value: choice.label });
      continue;
    }
    if (field.kind === 'flag') {
      if (typeof raw === 'boolean') {
        lines.push({ label: control.label, value: raw ? 'Yes' : 'No' });
      }
      continue;
    }
    if (typeof raw === 'number') {
      lines.push({
        label: control.label,
        value: `${raw}${field.unit ? ` ${field.unit}` : ''}`,
      });
    }
  }
  return lines;
}

/**
 * Where the recipient's file is actually processed.
 *
 * The ask page does no work of its own: it hands the chosen file to the
 * existing local handoff and sends the recipient to the real tool with the
 * settings in the query string, which is the same arrival the tool already
 * handles for a shared setup link. So there is one transformation path in the
 * product and this feature is a doorway to it.
 *
 * The path comes from the recipe definition, which `recipe-link.test.ts` holds
 * to `isLiveToolUrl`. It is never assembled from anything in the URL, so no
 * ask link can redirect anywhere the registry does not already name — there is
 * nothing here for an open redirect to be built out of.
 */
export function askDestination(
  request: AskRequest,
  values: RecipeValues,
): string {
  const search = buildRecipeSearch(request.recipe, values);
  const path = request.recipe.path;
  return search ? `${path}?${search}` : path;
}

/**
 * The creator's own address, so "create a request like this" can start from a
 * finished job's settings.
 *
 * WHY THE SETTINGS TRAVEL IN THE URL HERE TOO. They have to cross a page load,
 * and they are the same allowlisted values an ask link carries, filtered by the
 * same definition on the way out and on the way back in. `request` is read by
 * `findAskRequest`, so an id nobody declared selects nothing.
 */
export function buildAskCreatorUrl(
  request: AskRequest,
  values: RecipeValues,
  origin: string,
): string {
  const search = buildRecipeSearch(request.recipe, values);
  const base = `${origin.replace(/\/+$/, '')}${ASK_LINK_PREFIX}`;
  const query = search
    ? `request=${request.id}&${search}`
    : `request=${request.id}`;
  return `${base}?${query}`;
}

/**
 * The same address as a path, for a link on this site.
 *
 * Separate from `buildAskCreatorUrl` because an absolute URL needs an origin,
 * and a component that invented one would have to write an absolute-URL literal
 * — which is the thing `lib/tools/local-source-policy.test.ts` forbids in every
 * guarded directory, and rightly: that grep is the cheapest proof there is that
 * nothing here talks to a server. The rule caught this very comment when it
 * spelled the scheme out, which is the guard working exactly as intended.
 */
export function askCreatorPath(
  request: AskRequest,
  values: RecipeValues,
): string {
  const search = buildRecipeSearch(request.recipe, values);
  const query = search
    ? `request=${request.id}&${search}`
    : `request=${request.id}`;
  return `${ASK_LINK_PREFIX}?${query}`;
}

/** Which request, if any, the creator was opened on, and with what settings. */
export function readAskCreatorState(search: string): AskArrival | null {
  const request = findAskRequest(new URLSearchParams(search).get('request'));
  if (!request) return null;
  return { request, values: readRecipeValues(request.recipe, search) };
}

/**
 * The parameter names an ask link may contain. Used by the tests to assert the
 * complement — that nothing else can get in.
 */
export function askParamNames(request: AskRequest): string[] {
  return [ASK_VERSION_PARAM, ...recipeParamNames(request.recipe)];
}

/**
 * The share-a-setup summary, re-exported for the one place that wants the
 * dense form: the creator's own preview of what the tool will show the
 * recipient after they arrive on it.
 */
export function askRecipeSummary(
  request: AskRequest,
  values: RecipeValues,
): string {
  return describeRecipe(request.recipe, sanitiseAskValues(request, values));
}

/** The declared field a control renders, or null when there is none. */
export function askField(
  request: AskRequest,
  param: string,
): RecipeDefinition['fields'][number] | null {
  return request.recipe.fields.find((field) => field.param === param) ?? null;
}

/**
 * The format a request asks for, or null when it asks for none.
 *
 * Read through the sanitiser, so a format the definition does not offer is not
 * a format this reports.
 */
export function askRequestedFormat(
  request: AskRequest,
  values: RecipeValues,
): string | null {
  const clean = sanitiseAskValues(request, values);
  const format = clean.format;
  return typeof format === 'string' ? format : null;
}

/*
 * `probeEncodedFormat` and `formatWasSubstituted` USED TO LIVE HERE and now do
 * not. They are in `lib/tools/image-verify.ts`, which is where the question
 * belongs: that module reads image bytes and judges them, and asking a browser
 * what it would really encode is the same question one step earlier.
 *
 * They were written here first, when this was the only lane that needed them —
 * WebKit answers a WebP request with a PNG rather than refusing, so an ask link
 * promising WebP would have handed a Safari recipient a PNG and called it
 * right. Once the File Compiler lane needed the same check, two copies sat on
 * `main` for a few hours. This is that debt settled rather than re-documented.
 *
 * ONE DIFFERENCE THAT WILL BITE A CARELESS CALLER: the surviving pair takes a
 * FULL MEDIA TYPE (`image/webp`), not a bare subtype (`webp`). Building the
 * type inside the function let a caller concatenate one that does not exist;
 * taking it whole means the same value flows from a registry through to the
 * probe without being reassembled anywhere.
 *
 * `formatLabel` below did NOT move, and is deliberately NOT interchangeable
 * with the one over there: that one returns `WebP` for the sentences on `/do`,
 * this one uppercases for the sentence here. Collapsing them is how `WEBP`
 * comes back.
 */

/**
 * `image/png` -> `PNG`, for a sentence. Falls back to the raw type.
 *
 * Uppercasing the subtype is right for PNG, JPEG, GIF and AVIF and WRONG for
 * WebP, which is written with a lower-case `b` — "WEBP" is the sort of detail
 * that makes a sentence read as machine output. The named cases are spelled
 * out and everything else falls back to uppercase, which is the safe default
 * for an acronym nobody has told us about.
 *
 * IF YOU FIND ANOTHER `formatLabel` IN THIS REPOSITORY, do not assume it is a
 * duplicate of this one and delete either. Labels are written for the sentence
 * they appear in, so two of them can differ on purpose — `WebP` versus `WEBP`
 * is exactly such a difference, and collapsing them silently changes copy a
 * stranger reads. Compare the call sites before merging them.
 *
 * (Stated as a condition rather than as a fact about a particular file: at the
 * time of writing a second one existed only on an unmerged branch, and a
 * comment asserting where another lane's code lives is a claim that expires
 * the moment that branch is renamed, rebased or abandoned.)
 */
const FORMAT_LABELS: Readonly<Record<string, string>> = {
  webp: 'WebP',
  jpeg: 'JPEG',
  jpg: 'JPEG',
  png: 'PNG',
  avif: 'AVIF',
  gif: 'GIF',
};

export function formatLabel(mediaType: string): string {
  const subtype = mediaType.split('/')[1];
  if (!subtype) return mediaType;
  return FORMAT_LABELS[subtype.toLowerCase()] ?? subtype.toUpperCase();
}
