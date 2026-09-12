export const SUPPORT_PREFERENCE_KEY = 'tools-support-preference-v1';
export const SUPPORT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function mayOfferSupport(stored: string | null, now: number): boolean {
  if (!stored) return true;
  try {
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== 'object') return true;
    const preference = value as { never?: unknown; lastOffered?: unknown };
    if (preference.never === true) return false;
    if (
      typeof preference.lastOffered !== 'number' ||
      !Number.isFinite(preference.lastOffered)
    )
      return true;
    return now >= preference.lastOffered + SUPPORT_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export function supportPreference(now: number, never = false) {
  return JSON.stringify({ lastOffered: now, never });
}
