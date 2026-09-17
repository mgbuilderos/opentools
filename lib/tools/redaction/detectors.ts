/**
 * Secret detectors shared by the scrubber and its re-check, so the two cannot
 * drift apart. Key formats follow the issuers' documented prefixes.
 *
 * Detections carry offsets only. Matched text is never returned, logged or
 * placed in an error message.
 */

/** One category per scrubber option; `private-key` is always enabled. */
export type DetectionCategory = 'private-key' | 'key' | 'email' | 'ip' | 'card';

export const DETECTION_CATEGORIES: readonly DetectionCategory[] = [
  'private-key',
  'key',
  'email',
  'ip',
  'card',
];

export interface Detector {
  id: string;
  category: DetectionCategory;
  /** Placeholder name: `AWS_ACCESS_KEY` becomes `[REDACTED_AWS_ACCESS_KEY_1]`. */
  label: string;
  /** Global expression. Earlier detectors win ties on the same span. */
  pattern: RegExp;
  /**
   * The pattern is `(context)(secret)` with no other capture groups; only the
   * secret is reported, so a variable name or URL scheme stays readable.
   */
  prefixed?: boolean;
  validate?: (match: string) => boolean;
}

export interface Detection {
  detectorId: string;
  category: DetectionCategory;
  start: number;
  end: number;
}

/** Luhn (mod 10) check over a string of decimal digits. */
export function passesLuhn(digits: string): boolean {
  if (!/^\d+$/u.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/**
 * Published issuer ranges of the major card networks: Visa, Mastercard,
 * American Express, Discover, JCB, Diners Club and UnionPay. Numeric IDs such
 * as millisecond timestamps fall outside them.
 */
function hasCardNetworkPrefix(digits: string): boolean {
  const two = Number(digits.slice(0, 2));
  const three = Number(digits.slice(0, 3));
  const four = Number(digits.slice(0, 4));
  return (
    digits.startsWith('4') ||
    (two >= 51 && two <= 55) ||
    (four >= 2221 && four <= 2720) ||
    two === 34 ||
    two === 37 ||
    four === 6011 ||
    (three >= 644 && three <= 649) ||
    two === 65 ||
    (four >= 3528 && four <= 3589) ||
    two === 36 ||
    (three >= 300 && three <= 305) ||
    two === 62
  );
}

function isPaymentCardNumber(match: string): boolean {
  const digits = match.replace(/\D/gu, '');
  return (
    digits.length >= 13 &&
    digits.length <= 19 &&
    hasCardNetworkPrefix(digits) &&
    passesLuhn(digits)
  );
}

export const DETECTORS: readonly Detector[] = [
  {
    // RFC 7468 and OpenPGP armor labels. A block without its END line is
    // redacted to the end of the text rather than left partly visible.
    id: 'pem-private-key',
    category: 'private-key',
    label: 'PRIVATE_KEY',
    pattern:
      /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----|$)/gu,
  },
  {
    // AKIA: long-term access key ID. ASIA: temporary (STS) access key ID.
    id: 'aws-access-key-id',
    category: 'key',
    label: 'AWS_ACCESS_KEY',
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/gu,
  },
  {
    id: 'aws-secret-access-key',
    category: 'key',
    label: 'AWS_SECRET_KEY',
    pattern:
      /(aws_secret_access_key\s*[:=]\s*['"]?)([A-Za-z0-9/+=]{40})(?![A-Za-z0-9/+=])/giu,
    prefixed: true,
  },
  {
    id: 'anthropic-api-key',
    category: 'key',
    label: 'ANTHROPIC_API_KEY',
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/gu,
  },
  {
    // sk-, sk-proj-, sk-svcacct- and sk-admin- keys share this shape.
    id: 'openai-api-key',
    category: 'key',
    label: 'OPENAI_API_KEY',
    pattern: /\bsk-(?!ant-)[A-Za-z0-9_-]{20,}/gu,
  },
  {
    id: 'stripe-key',
    category: 'key',
    label: 'STRIPE_KEY',
    pattern: /\b(?:sk|rk|pk)_(?:live|test)_[0-9a-zA-Z]{24,}\b/gu,
  },
  {
    id: 'github-token',
    category: 'key',
    label: 'GITHUB_TOKEN',
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/gu,
  },
  {
    id: 'github-fine-grained-token',
    category: 'key',
    label: 'GITHUB_PAT',
    pattern: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/gu,
  },
  {
    // Bot, user, legacy, rotating (xoxe, xoxe.xoxp) and app-level tokens all
    // start with a numeric segment after the prefix.
    id: 'slack-token',
    category: 'key',
    label: 'SLACK_TOKEN',
    pattern: /\b(?:xoxe\.)?(?:xox[abeprs]|xapp)-\d+-[A-Za-z0-9-]{8,}/gu,
  },
  {
    id: 'slack-webhook',
    category: 'key',
    label: 'SLACK_WEBHOOK',
    pattern:
      /\bhooks\.slack\.com\/(?:services|workflows|triggers)\/[A-Za-z0-9/_-]{8,}/gu,
  },
  {
    id: 'google-api-key',
    category: 'key',
    label: 'GOOGLE_API_KEY',
    pattern: /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/gu,
  },
  {
    // Header and payload are Base64URL JSON objects, so both begin with `eyJ`.
    id: 'json-web-token',
    category: 'key',
    label: 'JWT',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/gu,
  },
  {
    id: 'database-connection-string',
    category: 'key',
    label: 'DB_CONNECTION_STRING',
    pattern:
      /(?:postgres|postgresql|mongodb|mongodb\+srv|mysql|redis):\/\/[^\s"']+/gu,
  },
  {
    // `scheme://user:password@host` for any other scheme; only the password
    // is removed. RFC 3986 requires `@`, `/`, `[` and `]` to be encoded there.
    id: 'url-password',
    category: 'key',
    label: 'URL_PASSWORD',
    pattern:
      /(\b[A-Za-z][A-Za-z0-9+.-]{0,31}:\/\/[^\s:@/"'[\]]*:)([^\s@/"'[\]]+)(?=@)/gu,
    prefixed: true,
  },
  {
    id: 'bearer-token',
    category: 'key',
    label: 'BEARER_TOKEN',
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gu,
  },
  {
    id: 'quoted-secret-assignment',
    category: 'key',
    label: 'AUTH_SECRET',
    pattern:
      /((?:password|passwd|secret|api_key|apikey|auth_token)\s*[:=]\s*['"])(?!\[REDACTED_)([^'"\r\n]{4,})(?=['"])/giu,
    prefixed: true,
  },
  {
    // Unquoted `.env` lines such as `DB_PASSWORD=value`. The value must run to
    // the end of the line, so code like `API_KEY = os.environ["API_KEY"]` is
    // left alone.
    id: 'env-secret-assignment',
    category: 'key',
    label: 'AUTH_SECRET',
    pattern:
      /(^[ \t]*(?:export[ \t]+)?[A-Z0-9_]{0,64}(?:PASSWORD|PASSWD|SECRET|API_KEY|APIKEY|AUTH_TOKEN|ACCESS_TOKEN)[A-Z0-9_]{0,64}[ \t]*=[ \t]*)([^\s'"#()[\]{}$]{4,})(?=[ \t]*(?:#.*)?$)/gmu,
    prefixed: true,
  },
  {
    // Local part and label lengths are capped at their RFC 5321 / RFC 1035
    // limits, which also bounds backtracking on long unbroken text.
    id: 'email-address',
    category: 'email',
    label: 'EMAIL',
    pattern: /[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,63}/gu,
  },
  {
    id: 'ipv4-address',
    category: 'ip',
    label: 'IP_ADDRESS',
    pattern:
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/gu,
  },
  {
    // Contiguous digits, 4-4-4-x groups or the 4-6-5 American Express layout,
    // with one consistent space or hyphen separator.
    id: 'payment-card-number',
    category: 'card',
    label: 'CARD_NUMBER',
    pattern:
      /\b(?:\d{13,19}|\d{4}([ -])\d{4}\1\d{4}\1\d{1,7}|\d{4}([ -])\d{6}\2\d{5})\b/gu,
    validate: isPaymentCardNumber,
  },
];

function categorySet(
  categories: Iterable<DetectionCategory>,
): ReadonlySet<DetectionCategory> {
  return new Set(categories);
}

/**
 * Every detection for the enabled categories, ordered by start, then longest
 * first, then detector order. Spans from different detectors may overlap.
 */
export function findDetections(
  text: string,
  categories: Iterable<DetectionCategory>,
): Detection[] {
  const enabled = categorySet(categories);
  const found: Array<Detection & { rank: number }> = [];
  DETECTORS.forEach((detector, rank) => {
    if (!enabled.has(detector.category)) return;
    for (const match of text.matchAll(detector.pattern)) {
      const index = match.index ?? 0;
      const context = detector.prefixed ? (match[1]?.length ?? 0) : 0;
      const secret = detector.prefixed ? (match[2] ?? '') : match[0];
      if (!secret) continue;
      if (detector.validate && !detector.validate(secret)) continue;
      const start = index + context;
      found.push({
        detectorId: detector.id,
        category: detector.category,
        start,
        end: start + secret.length,
        rank,
      });
    }
  });
  found.sort((a, b) => a.start - b.start || b.end - a.end || a.rank - b.rank);
  return found.map(({ detectorId, category, start, end }) => ({
    detectorId,
    category,
    start,
    end,
  }));
}

/** Detections still present in scrubbed output. Empty means nothing remains. */
export function verifyRedacted(
  output: string,
  categories: Iterable<DetectionCategory>,
): Detection[] {
  return findDetections(output, categories);
}

export function detectorById(id: string): Detector | undefined {
  return DETECTORS.find((detector) => detector.id === id);
}
