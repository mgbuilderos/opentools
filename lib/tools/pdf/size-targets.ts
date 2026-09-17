/**
 * Upload ceilings for the portals people most often get bounced from.
 *
 * These are starting points, not guarantees. Portals change their limits
 * without announcing it, several apply a different ceiling per form, and some
 * measure in decimal MB rather than binary MiB. So every preset here only
 * fills in the target box — the number stays editable, and the UI says where
 * it came from. A preset that quietly went stale is worse than no preset.
 */

const KIB = 1024;
const MIB = 1024 * KIB;

export type PortalPreset = {
  id: string;
  /** What someone calls the place they are uploading to. */
  portal: string;
  /** The form or field, since a portal often has more than one ceiling. */
  field: string;
  limitBytes: number;
  /** What the ceiling applies to, so a wrong preset is obvious before running. */
  note: string;
};

export const PORTAL_PRESETS: readonly PortalPreset[] = [
  {
    id: 'uscis-evidence',
    portal: 'USCIS',
    field: 'Evidence and supporting documents',
    limitBytes: 2 * MIB,
    note: 'Per file, on individual evidence uploads.',
  },
  {
    id: 'uscis-form',
    portal: 'USCIS',
    field: 'Completed form upload',
    limitBytes: 6 * MIB,
    note: 'The larger ceiling, applied to whole filled forms.',
  },
  {
    id: 'vfs-form',
    portal: 'VFS Global',
    field: 'Schengen application form',
    limitBytes: 500 * KIB,
    note: 'Varies by mission — check your appointment page.',
  },
  {
    id: 'vfs-passport',
    portal: 'VFS Global',
    field: 'Passport or ID scan',
    limitBytes: 200 * KIB,
    note: 'The tightest common ceiling. Expect visible quality loss.',
  },
  {
    id: 'workday-resume',
    portal: 'Workday',
    field: 'Résumé attachment',
    limitBytes: 500 * KIB,
    note: 'Default limit; some tenants raise it.',
  },
  {
    id: 'email-attachment',
    portal: 'Email',
    field: 'Gmail, Outlook and most providers',
    limitBytes: 20 * MIB,
    note: 'Providers stop between 20 and 25 MB. 20 is the safe figure.',
  },
];

export function findPreset(id: string) {
  return PORTAL_PRESETS.find((preset) => preset.id === id) ?? null;
}

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
