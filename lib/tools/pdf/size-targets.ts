/**
 * The target a fit-to-size run is aiming at: the unit it is stated in, and the
 * bounds this tool will accept one within.
 *
 * Portal ceilings themselves live in `lib/portal-presets.ts`, outside the
 * engine path, because each one cites the page it was read from and
 * `local-source-policy.test.ts` keeps `http(s)://` literals out of
 * `lib/tools/`.
 */

const KIB = 1024;
const MIB = 1024 * KIB;

/**
 * Target in whole KiB, which is the unit portals state their limits in and the
 * unit the custom box accepts.
 */
export function kibToBytes(kib: number) {
  return Math.floor(kib) * KIB;
}

export function bytesToKib(bytes: number) {
  return Math.floor(bytes / KIB);
}

export const MIN_TARGET_BYTES = 10 * KIB;
export const MAX_TARGET_BYTES = 150 * MIB;

/** Null when the target is usable; otherwise the reason it is not. */
export function validateTarget(targetBytes: number): string | null {
  if (!Number.isFinite(targetBytes) || targetBytes <= 0) {
    return 'Enter a target size in KB.';
  }
  if (targetBytes < MIN_TARGET_BYTES) {
    return `The smallest target this tool accepts is ${bytesToKib(MIN_TARGET_BYTES)} KB.`;
  }
  if (targetBytes > MAX_TARGET_BYTES) {
    return `The largest target this tool accepts is ${bytesToKib(MAX_TARGET_BYTES)} KB.`;
  }
  return null;
}
