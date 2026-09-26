/**
 * File Prompts: a requirement that travels, carrying no file.
 *
 * A File Prompt is the requirement and nothing else — no bytes, no filename, no
 * sender, no recipient, no identifier of any kind. Someone opens the link, the
 * plain-language summary tells them what the finished file must satisfy, and
 * they supply their own file from their own machine. Nothing is stored anywhere
 * and nothing is sent anywhere.
 *
 * WHY THIS USES A HASH FRAGMENT, AND HOW THAT RELATES TO ASK LINK.
 *
 * The brief describes Ask Link's serialization as fragment-based and tells this
 * module to reuse it. Ask Link's `buildAskLinkUrl` in fact builds a **query
 * string** — `/ask/<id>?v=1&format=jpeg&…`. That is a defensible choice for Ask
 * Link, whose parameters are a request someone deliberately published, and it
 * is not this module's place to change it.
 *
 * It is the wrong carrier here, for one concrete reason: a query string is part
 * of the HTTP request line and reaches the server and its logs, while a fragment
 * never leaves the browser. The brief requires fragments for the reusable prompt
 * surface and requires a test proving fragments do not enter HTTP requests, and
 * only a fragment can pass that test. So a File Prompt puts the same
 * `key=value` string after a `#` instead of a `?`.
 *
 * The encoding below is the compiler's one serializer: `toFragment` writes it,
 * `readFragment` reads it, and both go through `sanitiseRequirement`, the same
 * sanitiser the parser and the structured controls use. There is no second
 * requirement format — an `ImageRequirement` is the only thing that crosses this
 * boundary in either direction.
 *
 * Existing Ask Links and existing `/shared/*` recipe links are untouched by any
 * of this: `/do` reads its own fragment and nothing else.
 */

import type { VerifiableFormat } from '../image-verify';
import { sanitiseRequirement, type ImageRequirement } from './requirement';

/** Bumped only when an old link would otherwise be read wrongly. */
export const FILE_PROMPT_VERSION = 1;

/** The route a File Prompt opens. Relative: never a hard-coded origin. */
export const FILE_PROMPT_PATH = '/do';

const VERSION_KEY = 'v';

/**
 * The complete set of keys a File Prompt may contain.
 *
 * This is an allowlist in the strict sense: `readFragment` consults it to decide
 * what to even look at, so a key that is not here cannot influence the result no
 * matter how the link was crafted. Short names keep the link short; they are not
 * obfuscation.
 */
const KEYS = {
  format: 'f',
  maxBytes: 'b',
  maxWidth: 'mw',
  maxHeight: 'mh',
  exactWidth: 'ew',
  exactHeight: 'eh',
  quality: 'q',
  removeMetadata: 'meta',
  keepTransparency: 'alpha',
  background: 'bg',
  fit: 'fit',
} as const satisfies Record<keyof ImageRequirement, string>;

const FORMAT_TO_SHORT: Record<VerifiableFormat, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const SHORT_TO_FORMAT: Record<string, VerifiableFormat> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * Write the requirement as a fragment string, without the leading `#`.
 *
 * Keys appear in a fixed order so the same requirement always produces the same
 * link — two people sharing the same requirement should not produce two
 * different-looking URLs.
 */
export function toFragment(requirement: ImageRequirement): string {
  const parts: string[] = [`${VERSION_KEY}=${FILE_PROMPT_VERSION}`];
  const add = (key: string, value: string | number) => {
    parts.push(`${key}=${encodeURIComponent(String(value))}`);
  };

  if (requirement.format) add(KEYS.format, FORMAT_TO_SHORT[requirement.format]);
  if (requirement.maxBytes !== undefined)
    add(KEYS.maxBytes, requirement.maxBytes);
  if (requirement.exactWidth !== undefined)
    add(KEYS.exactWidth, requirement.exactWidth);
  if (requirement.exactHeight !== undefined)
    add(KEYS.exactHeight, requirement.exactHeight);
  if (requirement.maxWidth !== undefined)
    add(KEYS.maxWidth, requirement.maxWidth);
  if (requirement.maxHeight !== undefined)
    add(KEYS.maxHeight, requirement.maxHeight);
  if (requirement.quality !== undefined) add(KEYS.quality, requirement.quality);
  if (requirement.fit !== undefined) add(KEYS.fit, requirement.fit);
  if (requirement.keepTransparency === true) add(KEYS.keepTransparency, '1');
  if (requirement.background !== undefined) {
    // The '#' of a hex colour would end the fragment, so it is encoded.
    add(KEYS.background, requirement.background);
  }
  if (requirement.removeMetadata === true) add(KEYS.removeMetadata, '1');

  return parts.join('&');
}

/**
 * A relative File Prompt URL. Relative by construction: there is no origin to
 * get wrong, and `lib/tools/local-source-policy.test.ts` forbids an absolute URL
 * literal in this directory precisely so that a link cannot be pointed
 * somewhere else by accident.
 */
export function filePromptPath(requirement: ImageRequirement): string {
  return `${FILE_PROMPT_PATH}#${toFragment(requirement)}`;
}

export interface FragmentArrival {
  requirement: ImageRequirement;
  /** Sentences naming anything in the link that was refused. */
  dropped: string[];
  /** True when the link carried a version this build does not read. */
  wrongVersion: boolean;
}

/**
 * Read a File Prompt fragment.
 *
 * Only allowlisted keys are read at all, and every value then passes through
 * `sanitiseRequirement`, which rejects out-of-range numbers rather than clamping
 * them and builds its result field by field so no crafted key can reach the
 * output object. A link with nothing valid left yields an empty requirement,
 * which is the honest outcome: the visitor is asked what they need, as if they
 * had arrived with no link at all.
 */
export function readFragment(fragment: string): FragmentArrival {
  const text = typeof fragment === 'string' ? fragment.replace(/^#/, '') : '';
  if (text === '') {
    return { requirement: {}, dropped: [], wrongVersion: false };
  }

  const params = new URLSearchParams(text);
  const version = params.get(VERSION_KEY);
  if (version !== null && version !== String(FILE_PROMPT_VERSION)) {
    return { requirement: {}, dropped: [], wrongVersion: true };
  }

  // Built as a plain record of only the fields this type declares. Nothing is
  // spread from the URL, so `__proto__=…` in a link is simply a key nobody reads.
  const candidate: Record<string, unknown> = {};
  const readNumber = (key: string): number | undefined => {
    const raw = params.get(key);
    if (raw === null || raw.trim() === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : Number.NaN;
  };

  const shortFormat = params.get(KEYS.format);
  if (shortFormat !== null) {
    candidate.format = SHORT_TO_FORMAT[shortFormat] ?? shortFormat;
  }
  for (const [field, key] of [
    ['maxBytes', KEYS.maxBytes],
    ['maxWidth', KEYS.maxWidth],
    ['maxHeight', KEYS.maxHeight],
    ['exactWidth', KEYS.exactWidth],
    ['exactHeight', KEYS.exactHeight],
    ['quality', KEYS.quality],
  ] as const) {
    const value = readNumber(key);
    if (value !== undefined) candidate[field] = value;
  }
  if (params.get(KEYS.removeMetadata) === '1') candidate.removeMetadata = true;
  if (params.get(KEYS.keepTransparency) === '1')
    candidate.keepTransparency = true;
  const background = params.get(KEYS.background);
  if (background !== null) candidate.background = background;
  const fit = params.get(KEYS.fit);
  if (fit !== null) candidate.fit = fit;

  const { requirement, dropped } = sanitiseRequirement(candidate);
  return { requirement, dropped, wrongVersion: false };
}

/**
 * Every key a File Prompt can contain. Exported so a test can assert that no
 * other key is ever produced — the cheapest way to keep a private field from
 * being added to a link by accident later.
 */
export const FILE_PROMPT_KEYS: readonly string[] = [
  VERSION_KEY,
  ...Object.values(KEYS),
];
