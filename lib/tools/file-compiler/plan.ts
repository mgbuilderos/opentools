/**
 * Turn an inspected file plus a requirement into a plan, or into the one
 * decision that has to be made first.
 *
 * This is the first stage that holds both halves of the problem, which is why
 * it and not `./requirement` owns *clarifications*. A contradiction like "JPEG
 * and keep transparency" is wrong on its own terms and is caught earlier. But
 * whether 600 × 600 changes an image's shape, or whether flattening loses
 * anything, depends entirely on the file in front of us — asking those
 * questions of a requirement alone would either invent an answer or interrogate
 * someone about a problem they do not have.
 *
 * Two ordering rules are structural rather than cosmetic, and the tests pin
 * both:
 *
 * 1. **Transparency is resolved before encoding.** A JPEG encoder given
 *    transparent pixels produces whatever its implementation happens to do with
 *    them. Compositing onto a chosen colour first makes the result something we
 *    decided rather than something we discovered.
 * 2. **Geometry comes before the byte search.** Every encode during a size
 *    search costs time, and searching at the wrong pixel size searches for the
 *    wrong answer.
 *
 * A plan contains no file bytes and no filename, so it can be logged, compared
 * or serialised in a test without carrying anything private.
 */

import type { VerifiableFormat, VerifyTargets } from '../image-verify';
import { formatLabel, formatSupportsTransparency } from '../image-verify';
import {
  describeLimit,
  type ConflictResolution,
  type FitBehaviour,
  type ImageRequirement,
} from './requirement';

/** What was measured from the file the visitor supplied. */
export interface InspectedImage {
  /** Container read from the bytes, or null when it is not a supported image. */
  format: VerifiableFormat | null;
  width: number;
  height: number;
  byteLength: number;
  /** Alpha channel present; null when it could not be determined. */
  hasAlpha: boolean | null;
  /** Metadata present; null when the container could not be parsed. */
  hasMetadata: boolean | null;
}

/**
 * A decision only this file makes necessary. Always a closed set of choices:
 * the visitor picks one and the requirement changes accordingly. Never an
 * open question.
 */
export interface Clarification {
  id: string;
  /** The question, phrased for the person who has to answer it. */
  question: string;
  choices: readonly ConflictResolution[];
}

/**
 * The operations the compiler is allowed to plan. A step outside this set
 * cannot enter a plan, so no arbitrary operation name can be executed.
 */
export type PlanStepId =
  | 'flatten-background'
  | 'resize-within'
  | 'resize-exact'
  | 'encode'
  | 'search-quality'
  | 'strip-metadata'
  | 'verify';

export interface PlanStep {
  id: PlanStepId;
  /** One line a visitor reads. No internal vocabulary. */
  text: string;
}

export type GeometryMode = 'keep' | 'within' | 'exact';

export interface PlanGeometry {
  mode: GeometryMode;
  /** Target width in pixels; absent when the size is left alone. */
  width?: number;
  height?: number;
  /** Only meaningful for `exact`. */
  fit?: FitBehaviour;
}

export interface CompilePlan {
  outputFormat: VerifiableFormat;
  geometry: PlanGeometry;
  /** Colour transparency is flattened onto, when it is. */
  background?: string;
  /** Keep the alpha channel through to the output. */
  keepAlpha: boolean;
  removeMetadata: boolean;
  /** Fixed quality to encode at, when one was asked for. */
  quality?: number;
  /** Search qualities to meet a byte limit. */
  searchForBytes?: number;
  steps: readonly PlanStep[];
  /** Exactly what verification will check afterwards. */
  targets: VerifyTargets;
}

export type PlanOutcome =
  | { status: 'ready'; plan: CompilePlan }
  /** One or more decisions must be made before a plan exists. */
  | { status: 'needs-decision'; clarifications: readonly Clarification[] }
  /** The file itself cannot be worked with. */
  | { status: 'unsupported'; reasons: readonly string[] };

/** Does this image's shape survive being forced to an exact size? */
export function aspectWouldChange(
  input: { width: number; height: number },
  exact: { width: number; height: number },
): boolean {
  // Compared as a cross-product so no floating-point ratio is involved.
  return input.width * exact.height !== exact.width * input.height;
}

/**
 * Decisions this particular file forces, given this requirement.
 *
 * Returned in the order they should be asked, most consequential first: what
 * happens to transparency changes the pixels, whereas how an exact size is
 * reached changes only the framing.
 */
export function findClarifications(
  requirement: ImageRequirement,
  input: InspectedImage,
): Clarification[] {
  const clarifications: Clarification[] = [];
  const outputFormat = requirement.format ?? input.format;

  // Transparency about to be lost, with nothing said about where it should go.
  if (
    input.hasAlpha === true &&
    outputFormat !== null &&
    !formatSupportsTransparency(outputFormat) &&
    requirement.background === undefined &&
    requirement.keepTransparency !== true
  ) {
    clarifications.push({
      id: 'transparency-to-opaque',
      question: `${formatLabel(outputFormat)} cannot store transparent pixels. Choose a background.`,
      choices: [
        { id: 'white', label: 'White', patch: { background: '#ffffff' } },
        { id: 'black', label: 'Black', patch: { background: '#000000' } },
        {
          id: 'use-png',
          label: 'Use PNG instead',
          patch: { format: 'image/png', keepTransparency: true },
        },
      ],
    });
  }

  // An exact size that changes the shape, with no instruction about how.
  if (
    requirement.exactWidth !== undefined &&
    requirement.exactHeight !== undefined &&
    requirement.fit === undefined &&
    input.width > 0 &&
    input.height > 0 &&
    aspectWouldChange(input, {
      width: requirement.exactWidth,
      height: requirement.exactHeight,
    })
  ) {
    clarifications.push({
      id: 'exact-size-shape',
      question: `Exactly ${requirement.exactWidth} × ${requirement.exactHeight} changes this image’s shape. What should happen?`,
      choices: [
        { id: 'crop', label: 'Crop the edges', patch: { fit: 'crop' } },
        { id: 'pad', label: 'Add padding', patch: { fit: 'pad' } },
        { id: 'stretch', label: 'Stretch it', patch: { fit: 'stretch' } },
      ],
    });
  }

  return clarifications;
}

/**
 * Build the plan, or say what has to be decided first.
 *
 * The output format defaults to the input's own, because converting a file
 * nobody asked to convert is a change nobody asked for.
 */
export function planCompile(
  requirement: ImageRequirement,
  input: InspectedImage,
): PlanOutcome {
  const reasons: string[] = [];
  if (input.format === null) {
    reasons.push(
      'This file is not a JPEG, PNG or WebP image, so it cannot be worked on here.',
    );
  }
  if (input.width <= 0 || input.height <= 0) {
    reasons.push(
      'This image’s size could not be read, so nothing can be planned.',
    );
  }
  if (reasons.length > 0) {
    return { status: 'unsupported', reasons };
  }

  const clarifications = findClarifications(requirement, input);
  if (clarifications.length > 0) {
    return { status: 'needs-decision', clarifications };
  }

  const outputFormat = requirement.format ?? input.format!;
  const canKeepAlpha = formatSupportsTransparency(outputFormat);
  // Alpha survives when the container can hold it and nothing asked to fill it.
  const keepAlpha =
    canKeepAlpha &&
    input.hasAlpha === true &&
    requirement.background === undefined;
  const background =
    input.hasAlpha === true && !keepAlpha
      ? (requirement.background ?? '#ffffff')
      : undefined;

  const geometry = planGeometry(requirement, input);
  const removeMetadata = requirement.removeMetadata === true;
  const steps: PlanStep[] = [];

  // 1 — transparency, before anything encodes.
  if (background !== undefined) {
    steps.push({
      id: 'flatten-background',
      text: `Place the image on a ${describeColour(background)} background`,
    });
  }

  // 2 — geometry, before any byte search.
  if (geometry.mode === 'exact') {
    steps.push({
      id: 'resize-exact',
      text: `Make it exactly ${geometry.width} × ${geometry.height} px${
        geometry.fit ? `, ${fitPhrase(geometry.fit)}` : ''
      }`,
    });
  } else if (geometry.mode === 'within') {
    steps.push({
      id: 'resize-within',
      text: describeWithin(geometry, input),
    });
  }

  // 3 — encode, then search only if a byte limit demands it.
  steps.push({
    id: 'encode',
    text: `Save it as ${formatLabel(outputFormat)}${
      requirement.quality !== undefined && outputFormat !== 'image/png'
        ? ` at quality ${requirement.quality}`
        : ''
    }`,
  });

  const searchForBytes = requirement.maxBytes;
  if (searchForBytes !== undefined) {
    steps.push({
      id: 'search-quality',
      text:
        outputFormat === 'image/png'
          ? `Check it is under ${describeLimit(searchForBytes)} — PNG has no quality to trade, so its size is what it is`
          : `Find the best quality that stays under ${describeLimit(searchForBytes)}`,
    });
  }

  // 4 — metadata.
  if (removeMetadata) {
    steps.push({
      id: 'strip-metadata',
      text: 'Remove the camera, location and editing information',
    });
  }

  // 5 — verification, always last and always present.
  steps.push({
    id: 'verify',
    text: 'Read the finished file back and check every requirement against it',
  });

  return {
    status: 'ready',
    plan: {
      outputFormat,
      geometry,
      background,
      keepAlpha,
      removeMetadata,
      quality: outputFormat === 'image/png' ? undefined : requirement.quality,
      searchForBytes,
      steps,
      targets: buildTargets(
        requirement,
        outputFormat,
        geometry,
        keepAlpha,
        input,
      ),
    },
  };
}

/**
 * What verification will check. Derived from the plan rather than restated, so
 * a promise cannot appear in the plan without also being checked afterwards.
 *
 * `alphaChannel` is only asserted when the input actually had transparency:
 * promising "no transparency" about a photograph that never had any would be a
 * check that passes for reasons unrelated to anything we did.
 */
function buildTargets(
  requirement: ImageRequirement,
  outputFormat: VerifiableFormat,
  geometry: PlanGeometry,
  keepAlpha: boolean,
  input: InspectedImage,
): VerifyTargets {
  const targets: VerifyTargets = { format: outputFormat };
  if (requirement.maxBytes !== undefined) {
    targets.maxBytes = requirement.maxBytes;
  }
  if (geometry.mode === 'exact') {
    targets.exactWidth = geometry.width;
    targets.exactHeight = geometry.height;
  } else {
    if (requirement.maxWidth !== undefined)
      targets.maxWidth = requirement.maxWidth;
    if (requirement.maxHeight !== undefined)
      targets.maxHeight = requirement.maxHeight;
  }
  if (input.hasAlpha === true) {
    targets.alphaChannel = keepAlpha;
  }
  if (requirement.removeMetadata === true) {
    targets.metadataRemoved = true;
  }
  return targets;
}

function planGeometry(
  requirement: ImageRequirement,
  input: InspectedImage,
): PlanGeometry {
  const { exactWidth, exactHeight, maxWidth, maxHeight, fit } = requirement;
  if (exactWidth !== undefined && exactHeight !== undefined) {
    return {
      mode: 'exact',
      width: exactWidth,
      height: exactHeight,
      fit: fit ?? 'crop',
    };
  }
  if (maxWidth === undefined && maxHeight === undefined) {
    return { mode: 'keep' };
  }
  // Fit inside the bounds, keeping the shape, never enlarging. A bound the
  // image is already inside changes nothing, which is why this can be "keep".
  const scale = Math.min(
    maxWidth !== undefined ? maxWidth / input.width : 1,
    maxHeight !== undefined ? maxHeight / input.height : 1,
    1,
  );
  if (scale >= 1) {
    return { mode: 'keep' };
  }
  return {
    mode: 'within',
    width: Math.max(1, Math.floor(input.width * scale)),
    height: Math.max(1, Math.floor(input.height * scale)),
  };
}

function describeWithin(geometry: PlanGeometry, input: InspectedImage): string {
  return `Scale it down from ${input.width} × ${input.height} to ${geometry.width} × ${geometry.height} px, keeping its shape`;
}

function fitPhrase(fit: FitBehaviour): string {
  switch (fit) {
    case 'crop':
      return 'cropping the edges that do not fit';
    case 'pad':
      return 'padding the space that is left over';
    case 'stretch':
      return 'stretching it to shape';
  }
}

function describeColour(hex: string): string {
  if (hex === '#ffffff') return 'white';
  if (hex === '#000000') return 'black';
  return hex;
}

/** The plan as lines for "Here is the plan:". Numbered by the caller. */
export function planLines(plan: CompilePlan): string[] {
  return plan.steps.map((step) => step.text);
}
