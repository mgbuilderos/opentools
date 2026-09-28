/**
 * What a finished file has to satisfy, as typed data.
 *
 * This is the one shape the rest of the compiler agrees on. Text typed by a
 * visitor becomes one of these (see `./parse`), structured controls produce one
 * directly, and a shared File Prompt serialises one (see `./prompt-link`). Every
 * field is optional because a requirement states only what it actually
 * requires: a requirement that never mentioned metadata must not imply anything
 * about metadata.
 *
 * Two jobs live here and are deliberately separated:
 *
 * - **Conflicts** are contradictions *within the stated requirement* — asking
 *   for JPEG and for transparency at the same time. They are knowable without
 *   ever seeing a file, so they are found here.
 * - **Clarifications** are decisions that only exist once a particular file is
 *   in hand — whether 600 × 600 changes *this* image's shape, whether *this*
 *   image has transparent pixels to lose. Those belong to `./plan`, which is
 *   the first stage that has both the requirement and the file.
 *
 * Nothing here throws on bad input. `sanitiseRequirement` takes anything at all
 * — including a hostile object from a URL fragment — and returns a requirement
 * containing only values it could verify, plus a list of what it dropped.
 */

import { MAX_EDGE, QUALITY_CEILING, QUALITY_FLOOR } from '../exact-size';
import type { VerifiableFormat } from '../image-verify';
import { formatLabel, formatSupportsTransparency } from '../image-verify';

/** How to reconcile an image's shape with an exact size that differs from it. */
export type FitBehaviour = 'crop' | 'pad' | 'stretch';

export const FIT_BEHAVIOURS: readonly FitBehaviour[] = [
  'crop',
  'pad',
  'stretch',
];

export const OUTPUT_FORMATS: readonly VerifiableFormat[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/**
 * Smallest byte limit that could describe a real image file at all. The
 * smallest structurally valid PNG is a little over 60 bytes, so a limit below
 * this is not a hard target but an impossibility, and saying so immediately is
 * more useful than encoding nine times to discover it.
 *
 * Above this floor no limit is rejected in advance. Whether a *particular*
 * image can reach 8 KB is not knowable from the requirement, and guessing would
 * refuse requests that the solver can in fact satisfy — so the solver measures
 * and reports the truth instead.
 */
export const MIN_TARGET_BYTES = 64;

/** Byte ceiling for one input file, matching the existing image tools. */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** A hex colour to flatten transparency onto. */
const HEX_COLOUR = /^#[0-9a-f]{6}$/;

export interface ImageRequirement {
  format?: VerifiableFormat;
  /** Hard upper bound on the saved file's byte length. */
  maxBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  exactWidth?: number;
  exactHeight?: number;
  /** Whole percent, only meaningful for JPEG and WebP. */
  quality?: number;
  removeMetadata?: boolean;
  /** Keep an alpha channel. Only possible in a container that has one. */
  keepTransparency?: boolean;
  /** Colour to flatten transparency onto, as `#rrggbb`. */
  background?: string;
  fit?: FitBehaviour;
}

/** A contradiction inside the requirement, with the ways out of it. */
export interface RequirementConflict {
  id: string;
  /** One sentence a visitor reads, saying what cannot hold at once. */
  message: string;
  /** Bounded ways to resolve it. Never open-ended. */
  resolutions: readonly ConflictResolution[];
}

export interface ConflictResolution {
  id: string;
  label: string;
  /** The change this resolution makes, merged over the requirement. */
  patch: Partial<ImageRequirement>;
  /** Fields the patch removes. */
  clear?: readonly (keyof ImageRequirement)[];
}

export interface SanitiseResult {
  requirement: ImageRequirement;
  /** Plain sentences naming every value that was refused, and why. */
  dropped: string[];
}

const isWholeInRange = (value: unknown, min: number, max: number): boolean =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;

/**
 * Accept only the keys this type declares, and only values inside their bounds.
 *
 * Written as explicit field reads rather than a loop over the input's keys, so
 * an inherited or crafted key — `__proto__`, `constructor`, `toString` — cannot
 * reach the result no matter what the caller passes. The output object is built
 * fresh; the input is never spread.
 */
export function sanitiseRequirement(input: unknown): SanitiseResult {
  const dropped: string[] = [];
  const requirement: ImageRequirement = {};

  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return {
      requirement,
      dropped: input === undefined ? [] : ['Unreadable requirement.'],
    };
  }
  const raw = input as Record<string, unknown>;

  // ---- format ----------------------------------------------------------
  if (raw.format !== undefined) {
    if (OUTPUT_FORMATS.includes(raw.format as VerifiableFormat)) {
      requirement.format = raw.format as VerifiableFormat;
    } else {
      dropped.push('Unsupported file type.');
    }
  }

  // ---- byte limit ------------------------------------------------------
  if (raw.maxBytes !== undefined) {
    if (isWholeInRange(raw.maxBytes, MIN_TARGET_BYTES, MAX_INPUT_BYTES)) {
      requirement.maxBytes = raw.maxBytes as number;
    } else {
      dropped.push('Unusable maximum file size.');
    }
  }

  // ---- dimensions ------------------------------------------------------
  for (const key of [
    'maxWidth',
    'maxHeight',
    'exactWidth',
    'exactHeight',
  ] as const) {
    if (raw[key] === undefined) continue;
    if (isWholeInRange(raw[key], 1, MAX_EDGE)) {
      requirement[key] = raw[key] as number;
    } else {
      dropped.push(
        `Unusable ${key === 'maxWidth' || key === 'exactWidth' ? 'width' : 'height'}.`,
      );
    }
  }

  // ---- quality ---------------------------------------------------------
  if (raw.quality !== undefined) {
    if (isWholeInRange(raw.quality, QUALITY_FLOOR, QUALITY_CEILING)) {
      requirement.quality = raw.quality as number;
    } else {
      dropped.push(
        `Quality must be a whole number from ${QUALITY_FLOOR} to ${QUALITY_CEILING}.`,
      );
    }
  }

  // ---- booleans --------------------------------------------------------
  for (const key of ['removeMetadata', 'keepTransparency'] as const) {
    if (raw[key] === undefined) continue;
    if (raw[key] === true) requirement[key] = true;
    else if (raw[key] === false) requirement[key] = false;
    else
      dropped.push(
        `Unreadable ${key === 'removeMetadata' ? 'metadata' : 'transparency'} setting.`,
      );
  }

  // ---- background ------------------------------------------------------
  if (raw.background !== undefined) {
    const value =
      typeof raw.background === 'string' ? raw.background.toLowerCase() : '';
    if (HEX_COLOUR.test(value)) {
      requirement.background = value;
    } else {
      dropped.push('Unreadable background colour.');
    }
  }

  // ---- fit -------------------------------------------------------------
  if (raw.fit !== undefined) {
    if (FIT_BEHAVIOURS.includes(raw.fit as FitBehaviour)) {
      requirement.fit = raw.fit as FitBehaviour;
    } else {
      dropped.push('Unsupported fit behaviour.');
    }
  }

  return { requirement, dropped };
}

/** True when the requirement asks for nothing at all. */
export function isEmptyRequirement(requirement: ImageRequirement): boolean {
  return Object.keys(requirement).length === 0;
}

/**
 * Contradictions inside the requirement itself, each with bounded ways out.
 *
 * Ordered most-blocking first, because the interface asks about one decision at
 * a time and the first one should be the one that most changes the outcome.
 */
export function findConflicts(
  requirement: ImageRequirement,
): RequirementConflict[] {
  const conflicts: RequirementConflict[] = [];
  const {
    format,
    keepTransparency,
    background,
    exactWidth,
    exactHeight,
    maxWidth,
    maxHeight,
    quality,
    fit,
  } = requirement;

  // A container that cannot hold transparency, asked to hold it.
  if (
    format &&
    keepTransparency === true &&
    !formatSupportsTransparency(format)
  ) {
    conflicts.push({
      id: 'transparency-vs-format',
      message: `${formatLabel(format)} cannot store transparent pixels, so transparency cannot be kept in a ${formatLabel(format)} file.`,
      resolutions: [
        {
          id: 'use-png',
          label: 'Save as PNG instead',
          patch: { format: 'image/png' },
        },
        {
          id: 'use-webp',
          label: 'Save as WebP instead',
          patch: { format: 'image/webp' },
        },
        {
          id: 'white-background',
          label: 'Put it on a white background',
          patch: { background: '#ffffff' },
          clear: ['keepTransparency'],
        },
      ],
    });
  }

  // Keep the transparency, and also paint over it.
  if (keepTransparency === true && background !== undefined) {
    conflicts.push({
      id: 'transparency-vs-background',
      message:
        'Keeping transparency and filling the background are opposites — a background colour replaces the transparent pixels.',
      resolutions: [
        {
          id: 'keep-transparency',
          label: 'Keep transparency',
          patch: {},
          clear: ['background'],
        },
        {
          id: 'keep-background',
          label: `Use the background colour`,
          patch: {},
          clear: ['keepTransparency'],
        },
      ],
    });
  }

  // An exact size that a maximum forbids.
  if (
    exactWidth !== undefined &&
    maxWidth !== undefined &&
    exactWidth > maxWidth
  ) {
    conflicts.push({
      id: 'exact-width-over-max',
      message: `An exact width of ${exactWidth} px cannot also be no wider than ${maxWidth} px.`,
      resolutions: [
        {
          id: 'drop-max-width',
          label: `Keep the exact ${exactWidth} px width`,
          patch: {},
          clear: ['maxWidth'],
        },
        {
          id: 'drop-exact-width',
          label: `Keep the ${maxWidth} px maximum instead`,
          patch: {},
          clear: ['exactWidth', 'exactHeight'],
        },
      ],
    });
  }
  if (
    exactHeight !== undefined &&
    maxHeight !== undefined &&
    exactHeight > maxHeight
  ) {
    conflicts.push({
      id: 'exact-height-over-max',
      message: `An exact height of ${exactHeight} px cannot also be no taller than ${maxHeight} px.`,
      resolutions: [
        {
          id: 'drop-max-height',
          label: `Keep the exact ${exactHeight} px height`,
          patch: {},
          clear: ['maxHeight'],
        },
        {
          id: 'drop-exact-height',
          label: `Keep the ${maxHeight} px maximum instead`,
          patch: {},
          clear: ['exactWidth', 'exactHeight'],
        },
      ],
    });
  }

  // Only one of the two exact edges given: the other is undefined, so there is
  // no exact size — say so rather than silently inventing the missing edge.
  if (
    (exactWidth === undefined) !== (exactHeight === undefined) &&
    (exactWidth !== undefined || exactHeight !== undefined)
  ) {
    const given = exactWidth !== undefined ? 'width' : 'height';
    const missing = exactWidth !== undefined ? 'height' : 'width';
    conflicts.push({
      id: 'incomplete-exact-size',
      message: `An exact size needs both edges — the ${missing} is missing, so only the ${given} is set.`,
      resolutions: [
        {
          id: 'as-maximum',
          label: `Treat ${exactWidth ?? exactHeight} px as a maximum instead`,
          patch:
            exactWidth !== undefined
              ? { maxWidth: exactWidth }
              : { maxHeight: exactHeight },
          clear: ['exactWidth', 'exactHeight'],
        },
      ],
    });
  }

  // Crop or pad with nothing to crop or pad to.
  if (
    fit !== undefined &&
    (exactWidth === undefined || exactHeight === undefined)
  ) {
    conflicts.push({
      id: 'fit-without-exact-size',
      message: `“${fit === 'crop' ? 'Crop' : fit === 'pad' ? 'Pad' : 'Stretch'} to fit” needs an exact width and height to fit to.`,
      resolutions: [
        {
          id: 'drop-fit',
          label: 'Leave the shape alone',
          patch: {},
          clear: ['fit'],
        },
      ],
    });
  }

  // PNG has no quality knob of the kind this number describes.
  if (format === 'image/png' && quality !== undefined) {
    conflicts.push({
      id: 'quality-vs-png',
      message:
        'PNG stores every pixel exactly, so it has no quality setting to lower — a quality number would do nothing to a PNG.',
      resolutions: [
        {
          id: 'drop-quality',
          label: 'Save as PNG without a quality setting',
          patch: {},
          clear: ['quality'],
        },
        {
          id: 'quality-webp',
          label: 'Use WebP, which does have one',
          patch: { format: 'image/webp' },
        },
        {
          id: 'quality-jpeg',
          label: 'Use JPEG, which does have one',
          patch: { format: 'image/jpeg' },
        },
      ],
    });
  }

  return conflicts;
}

/** Apply a chosen resolution, returning a new requirement. */
export function applyResolution(
  requirement: ImageRequirement,
  resolution: ConflictResolution,
): ImageRequirement {
  const next: ImageRequirement = { ...requirement, ...resolution.patch };
  for (const key of resolution.clear ?? []) {
    delete next[key];
  }
  return next;
}

/**
 * The requirement as lines a visitor reads back, in a fixed order so the same
 * requirement always reads the same way.
 *
 * The wording is held to what the compiler can actually deliver and verify.
 * `maxWidth` says "no wider than" rather than "resized to", because the image is
 * fitted inside the bound and never enlarged past its own size.
 */
export function describeRequirement(requirement: ImageRequirement): string[] {
  const lines: string[] = [];
  const {
    format,
    maxBytes,
    exactWidth,
    exactHeight,
    maxWidth,
    maxHeight,
    quality,
    fit,
    removeMetadata,
    keepTransparency,
    background,
  } = requirement;

  if (format) {
    lines.push(formatLabel(format));
  }
  if (maxBytes !== undefined) {
    lines.push(`Under ${describeLimit(maxBytes)}`);
  }
  if (exactWidth !== undefined && exactHeight !== undefined) {
    lines.push(`Exactly ${exactWidth} × ${exactHeight} px`);
  } else if (exactWidth !== undefined) {
    lines.push(`Exactly ${exactWidth} px wide`);
  } else if (exactHeight !== undefined) {
    lines.push(`Exactly ${exactHeight} px tall`);
  }
  if (
    maxWidth !== undefined &&
    maxHeight !== undefined &&
    maxWidth === maxHeight
  ) {
    lines.push(`No side longer than ${maxWidth} px`);
  } else {
    if (maxWidth !== undefined) lines.push(`No wider than ${maxWidth} px`);
    if (maxHeight !== undefined) lines.push(`No taller than ${maxHeight} px`);
  }
  if (quality !== undefined) {
    lines.push(`Quality ${quality}`);
  }
  if (fit === 'crop') lines.push('Crop to fit');
  if (fit === 'pad') lines.push('Pad to fit');
  if (fit === 'stretch') lines.push('Stretch to fit');
  if (keepTransparency === true) lines.push('Transparency kept');
  if (background !== undefined) lines.push(`Background ${background}`);
  if (removeMetadata === true) lines.push('Metadata removed');

  return lines;
}

/** A byte limit written the way it was most likely asked for. */
export function describeLimit(bytes: number): string {
  if (bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)} MB`;
  }
  if (bytes % 1024 === 0) {
    return `${bytes / 1024} KB`;
  }
  return `${bytes.toLocaleString('en-US')} bytes`;
}
