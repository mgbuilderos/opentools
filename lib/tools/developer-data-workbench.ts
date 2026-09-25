import { transformJson } from './structured';
import {
  emitCsv,
  parseCsv,
  emitJsonTable,
  parseJsonTable,
} from './notation/table';

export interface DeveloperFieldOption {
  value: string;
  label: string;
}

export interface DeveloperField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  defaultValue: string;
  placeholder?: string;
  options?: readonly DeveloperFieldOption[];
}

export interface DeveloperOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly DeveloperField[];
  notice?: string;
}

const MAX_INPUT = 1_000_000;
const MAX_REGEX_INPUT = 20_000;
const MAX_REGEX_PATTERN = 256;
const MAX_MATCHES = 200;
const EXAMPLE_ORIGIN = 'https' + '://example.com';

const textarea = (
  id: string,
  label: string,
  defaultValue: string,
  placeholder = defaultValue,
): DeveloperField => ({
  id,
  label,
  type: 'textarea',
  defaultValue,
  placeholder,
});

const text = (
  id: string,
  label: string,
  defaultValue: string,
  placeholder = defaultValue,
): DeveloperField => ({
  id,
  label,
  type: 'text',
  defaultValue,
  placeholder,
});

const number = (
  id: string,
  label: string,
  defaultValue: string,
): DeveloperField => ({ id, label, type: 'number', defaultValue });

const select = (
  id: string,
  label: string,
  options: readonly DeveloperFieldOption[],
  defaultValue = options[0]?.value ?? '',
): DeveloperField => ({
  id,
  label,
  type: 'select',
  defaultValue,
  options,
});

const input = (defaultValue = 'Hello, world!') =>
  textarea('input', 'Input', defaultValue);

const urlInput = (defaultValue = `${EXAMPLE_ORIGIN}/docs?q=hello&tag=a`) =>
  text('input', 'Absolute URL', defaultValue);

const regexFields = (withReplacement = false): DeveloperField[] => [
  textarea('input', 'Test text', 'Order 42, order 108.'),
  text('pattern', 'Regular expression', '\\d+'),
  select('flags', 'Flags', [
    { value: 'g', label: 'g — all matches' },
    { value: 'gi', label: 'gi — all, case-insensitive' },
    { value: 'gm', label: 'gm — all, multiline' },
    { value: 'gim', label: 'gim — all, case-insensitive, multiline' },
    { value: '', label: 'First match only' },
    { value: 'i', label: 'First, case-insensitive' },
  ]),
  ...(withReplacement ? [text('replacement', 'Replacement', '[$&]')] : []),
];

export const DEVELOPER_DATA_OPERATIONS: readonly DeveloperOperation[] = [
  {
    id: 'url-encode-component',
    name: 'URL component encoder',
    description:
      'Percent-encode one query value or path segment so that spaces, ampersands, slashes and question marks survive being placed inside a larger web address.',
    fields: [input('hello world & tea')],
  },
  {
    id: 'url-decode-component',
    name: 'URL component decoder',
    description: 'Decode one percent-encoded component; plus signs stay plus.',
    fields: [input('hello%20world%20%26%20tea')],
  },
  {
    id: 'url-encode',
    name: 'Full URL encoder',
    description: 'Encode unsafe characters while preserving URL separators.',
    fields: [input(`${EXAMPLE_ORIGIN}/a file?q=red apple`)],
  },
  {
    id: 'url-decode',
    name: 'Full URL decoder',
    description:
      'Decode percent escapes across a whole web address while leaving reserved separators such as %26 and %3F encoded, so the structure of the link is unchanged.',
    fields: [input(`${EXAMPLE_ORIGIN}/a%20file?q=red%20apple`)],
  },
  {
    id: 'html-entity-encode',
    name: 'HTML entity encoder',
    description: 'Escape ampersands, angle brackets, quotes, and apostrophes.',
    fields: [input('<p title="Tea & coffee">It\'s ready</p>')],
  },
  {
    id: 'html-entity-decode',
    name: 'HTML entity decoder',
    description: 'Decode the five core named entities and numeric entities.',
    fields: [input('&lt;p&gt;Tea &amp; coffee &#x2615;&lt;/p&gt;')],
  },
  {
    id: 'base64-encode-text',
    name: 'Base64 text encoder',
    description:
      'Encode text as standard Base64 with plus, slash and equals padding. Accented letters, emoji and other non-ASCII characters are read as UTF-8 bytes first.',
    fields: [input('Hello, 世界')],
  },
  {
    id: 'base64-decode-text',
    name: 'Base64 text decoder',
    description:
      'Turn standard Base64 back into readable text. Whitespace is ignored, the padding must be correct, and decoded bytes are rejected if they are not valid UTF-8.',
    fields: [input('SGVsbG8sIOS4lueVjA==')],
  },
  {
    id: 'base64url-encode-text',
    name: 'Base64URL text encoder',
    description: 'Encode UTF-8 text with URL-safe Base64 and no padding.',
    fields: [input('Hello? yes/no')],
  },
  {
    id: 'base64url-decode-text',
    name: 'Base64URL text decoder',
    description:
      'Turn URL-safe Base64 back into text. The hyphen and underscore alphabet is accepted with or without padding, and non-UTF-8 byte sequences are reported.',
    fields: [input('SGVsbG8_IHllcy9ubw')],
  },
  {
    id: 'jwt-inspector',
    name: 'JWT inspector',
    description: 'Decode the header and payload locally without trusting them.',
    notice:
      'Inspection is not verification. A decoded token can be forged; verify its signature, issuer, audience, and time claims in the system that relies on it.',
    fields: [
      textarea(
        'input',
        'JWT',
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWRhIn0.',
      ),
    ],
  },
  {
    id: 'json-format',
    name: 'JSON formatter',
    description: 'Validate JSON and format it with two-space indentation.',
    fields: [input('{"name":"Ada","active":true}')],
  },
  {
    id: 'json-minify',
    name: 'JSON minifier',
    description: 'Validate JSON and remove insignificant whitespace.',
    fields: [input('{\n  "name": "Ada",\n  "active": true\n}')],
  },
  {
    id: 'json-sort-keys',
    name: 'JSON key sorter',
    description: 'Recursively sort object keys while preserving array order.',
    fields: [input('{"z":1,"a":{"d":4,"b":2}}')],
  },
  {
    id: 'json-to-csv',
    name: 'JSON to CSV',
    description: 'Convert an array of flat JSON objects into quoted-safe CSV.',
    fields: [
      input(
        '[{"name":"Ada","role":"Engineer"},{"name":"Lin","role":"Designer"}]',
      ),
    ],
  },
  {
    id: 'csv-to-json',
    name: 'CSV to JSON',
    description: 'Parse strict header-based CSV, including quoted fields.',
    fields: [input('name,role\nAda,Engineer\nLin,Designer')],
  },
  {
    id: 'query-string-parser',
    name: 'Query-string parser',
    description: 'Turn a query string into JSON; repeated keys become arrays.',
    fields: [input('?q=hello+world&tag=a&tag=b')],
  },
  {
    id: 'query-string-builder',
    name: 'Query-string builder',
    description:
      'Build a query string from a JSON object of scalar or array values.',
    fields: [input('{"q":"hello world","tag":["a","b"],"page":2}')],
  },
  {
    id: 'url-parser',
    name: 'URL parser',
    description: 'Inspect the standard components of an absolute URL.',
    fields: [urlInput()],
  },
  {
    id: 'url-origin-extractor',
    name: 'URL origin extractor',
    description: 'Return the protocol, hostname, and effective port origin.',
    fields: [urlInput(`${EXAMPLE_ORIGIN}:8443/docs`)],
  },
  {
    id: 'url-path-segments',
    name: 'URL path segments',
    description:
      'List the path segments of a web address as a JSON array. Empty segments are dropped and each remaining one is percent-decoded, so %20 reads as a space.',
    fields: [urlInput(`${EXAMPLE_ORIGIN}/team/Ada%20Lovelace/projects`)],
  },
  {
    id: 'url-normalizer',
    name: 'URL normalizer',
    description:
      'Apply the browser URL parser without sorting query parameters.',
    fields: [urlInput('HTTPS://EXAMPLE.COM:443/a/../docs?q=hello%20world')],
  },
  {
    id: 'query-parameter-set',
    name: 'Set query parameter',
    description: 'Set or replace one query parameter on an absolute URL.',
    fields: [
      urlInput(),
      text('key', 'Parameter name', 'page'),
      text('value', 'Value', '2'),
    ],
  },
  {
    id: 'query-parameter-remove',
    name: 'Remove query parameter',
    description: 'Remove every instance of one parameter from an absolute URL.',
    fields: [urlInput(), text('key', 'Parameter name', 'tag')],
  },
  {
    id: 'regex-tester',
    name: 'Regular-expression tester',
    description: 'List bounded JavaScript regex matches and capture groups.',
    fields: regexFields(),
    notice:
      'Potentially explosive nested-quantifier patterns are rejected; matches are capped at 200.',
  },
  {
    id: 'regex-extractor',
    name: 'Regex extractor',
    description:
      'Pull one capture group out of every regular-expression match and list the results one per line, up to 200 matches, with group 0 returning the whole match.',
    fields: [...regexFields(), number('group', 'Capture group', '0')],
    notice:
      'Potentially explosive nested-quantifier patterns are rejected; matches are capped at 200.',
  },
  {
    id: 'regex-replacer',
    name: 'Regex replacer',
    description:
      'Replace text with JavaScript replacement tokens such as $& and $1.',
    fields: regexFields(true),
    notice:
      'Potentially explosive nested-quantifier patterns are rejected before replacement.',
  },
  {
    id: 'json-string-escape',
    name: 'JSON string escaper',
    description: 'Escape text for the inside of a JSON string literal.',
    fields: [input('Line 1\n"quoted"')],
  },
  {
    id: 'json-string-unescape',
    name: 'JSON string unescaper',
    description: 'Decode JSON string escapes without evaluating code.',
    fields: [input('Line 1\\n\\"quoted\\"')],
  },
  {
    id: 'unicode-code-points',
    name: 'Unicode code-point inspector',
    description: 'List Unicode scalar values by user-perceived character.',
    fields: [input('A☕😀')],
  },
  {
    id: 'code-points-to-text',
    name: 'Code points to text',
    description: 'Create text from hexadecimal Unicode scalar values.',
    fields: [input('U+0041 U+2615 U+1F600')],
  },
  {
    id: 'utf8-byte-encoder',
    name: 'UTF-8 byte encoder',
    description: 'Show UTF-8 bytes as space-separated decimal values.',
    fields: [input('A☕')],
  },
  {
    id: 'utf8-byte-decoder',
    name: 'UTF-8 byte decoder',
    description: 'Decode decimal bytes with strict UTF-8 validation.',
    fields: [input('65 226 152 149')],
  },
  {
    id: 'byte-counter',
    name: 'UTF-8 byte counter',
    description:
      'Count Unicode characters, UTF-16 code units, and UTF-8 bytes.',
    fields: [input('Hello ☕')],
  },
  {
    id: 'hex-encode-text',
    name: 'Text to hexadecimal',
    description:
      'Turn text into lowercase hexadecimal, two digits for each UTF-8 byte and no separators, for when you need to see how characters such as emoji are stored.',
    fields: [input('Hello ☕')],
  },
  {
    id: 'hex-decode-text',
    name: 'Hexadecimal to text',
    description: 'Decode even-length hexadecimal with strict UTF-8 validation.',
    fields: [input('48656c6c6f20e29895')],
  },
  {
    id: 'binary-encode-text',
    name: 'Text to binary bytes',
    description:
      'Turn text into eight-bit binary, one space-separated group per UTF-8 byte. Useful for teaching how characters map to bytes or for checking a binary dump.',
    fields: [input('Hi')],
  },
  {
    id: 'binary-decode-text',
    name: 'Binary bytes to text',
    description: 'Decode eight-bit binary groups with strict UTF-8 validation.',
    fields: [input('01001000 01101001')],
  },
  {
    id: 'sha-256-text',
    name: 'SHA-256 text hash',
    description:
      'Hash text with SHA-256 and read back the 64-character hexadecimal digest, the usual choice for fingerprints, cache keys and integrity comparisons.',
    fields: [input('hello')],
  },
  {
    id: 'sha-384-text',
    name: 'SHA-384 text hash',
    description:
      'Hash text with SHA-384 and read back the 96-character hexadecimal digest, used where a longer truncated SHA-2 value is required by a spec or a vendor.',
    fields: [input('hello')],
  },
  {
    id: 'sha-512-text',
    name: 'SHA-512 text hash',
    description:
      'Hash text with SHA-512 and read back the 128-character hexadecimal digest, the longest SHA-2 option, often asked for in signing and archival workflows.',
    fields: [input('hello')],
  },
  {
    id: 'hex-to-rgb',
    name: 'HEX to RGB',
    description: 'Convert 3, 4, 6, or 8 digit CSS hexadecimal colors to RGBA.',
    fields: [text('input', 'HEX color', '#336699')],
  },
  {
    id: 'rgb-to-hex',
    name: 'RGB to HEX',
    description:
      'Convert integer RGB channels and optional alpha to CSS hexadecimal.',
    fields: [
      number('red', 'Red (0–255)', '51'),
      number('green', 'Green (0–255)', '102'),
      number('blue', 'Blue (0–255)', '153'),
      number('alpha', 'Alpha (0–1)', '1'),
    ],
  },
  {
    id: 'hex-to-hsl',
    name: 'HEX to HSL',
    description: 'Convert a CSS hexadecimal color to rounded HSL values.',
    fields: [text('input', 'HEX color', '#336699')],
  },
  {
    id: 'hsl-to-hex',
    name: 'HSL to HEX',
    description:
      'Convert hue, saturation, lightness, and optional alpha to HEX.',
    fields: [
      number('hue', 'Hue (degrees)', '210'),
      number('saturation', 'Saturation (%)', '50'),
      number('lightness', 'Lightness (%)', '40'),
      number('alpha', 'Alpha (0–1)', '1'),
    ],
  },
] as const;

function value(values: Record<string, string>, key: string) {
  return values[key] ?? '';
}

function bounded(valueToCheck: string, label = 'Input', maximum = MAX_INPUT) {
  if (valueToCheck.length > maximum) {
    throw new Error(
      `${label} is limited to ${maximum.toLocaleString()} characters.`,
    );
  }
  return valueToCheck;
}

function requireValue(valueToCheck: string, label: string) {
  if (!valueToCheck.trim())
    throw new Error(`Enter ${label.toLowerCase()} first.`);
  return valueToCheck;
}

function utf8ToBase64(valueToEncode: string) {
  const bytes = new TextEncoder().encode(valueToEncode);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(inputValue: string, urlSafe: boolean) {
  let normalized = inputValue.replace(/\s+/gu, '');
  if (!normalized) return new Uint8Array();
  if (urlSafe) {
    if (!/^[A-Za-z0-9_-]+={0,2}$/u.test(normalized)) {
      throw new Error(
        'Enter valid Base64URL text using only URL-safe characters.',
      );
    }
    normalized = normalized.replace(/-/gu, '+').replace(/_/gu, '/');
    normalized = normalized.replace(/=+$/u, '');
    if (normalized.length % 4 === 1)
      throw new Error('Base64URL has an invalid length.');
    normalized += '='.repeat((4 - (normalized.length % 4)) % 4);
  } else if (
    normalized.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      normalized,
    )
  ) {
    throw new Error('Enter valid standard Base64 with correct padding.');
  }
  try {
    const binary = atob(normalized);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error(
      urlSafe
        ? 'Base64URL could not be decoded.'
        : 'Base64 could not be decoded.',
    );
  }
}

function decodeUtf8(bytes: Uint8Array) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Decoded bytes are not valid UTF-8 text.');
  }
}

function parseAbsoluteUrl(raw: string) {
  requireValue(raw, 'an absolute URL');
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Enter a valid absolute URL including its scheme.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported.');
  }
  return parsed;
}

function safeJson(inputValue: string): unknown {
  return JSON.parse(transformJson(inputValue, 'minify')) as unknown;
}

function queryToJson(inputValue: string) {
  const query = inputValue.trim().replace(/^\?/u, '');
  const params = new URLSearchParams(query);
  const result: Record<string, string | string[]> = {};
  for (const [key, parameterValue] of params) {
    const current = result[key];
    result[key] =
      current === undefined
        ? parameterValue
        : Array.isArray(current)
          ? [...current, parameterValue]
          : [current, parameterValue];
  }
  return JSON.stringify(result, null, 2);
}

function jsonToQuery(inputValue: string) {
  const parsed = safeJson(inputValue);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('JSON must be an object.');
  }
  const params = new URLSearchParams();
  for (const [key, item] of Object.entries(parsed)) {
    const items = Array.isArray(item) ? item : [item];
    for (const entry of items) {
      if (entry !== null && typeof entry === 'object') {
        throw new Error(`Property "${key}" must contain only scalar values.`);
      }
      params.append(key, entry == null ? '' : String(entry));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function assertSafeRegex(pattern: string, inputValue: string) {
  requireValue(pattern, 'a regular expression');
  bounded(pattern, 'Regular expression', MAX_REGEX_PATTERN);
  bounded(inputValue, 'Regex test text', MAX_REGEX_INPUT);
  const quantifiedGroup =
    /\((?:[^()[\]\\]|\\.|\[(?:[^\]\\]|\\.)*\])*(?:[+*]|\{\d+(?:,\d*)?\})(?:[^()[\]\\]|\\.|\[(?:[^\]\\]|\\.)*\])*\)(?:[+*]|\{\d+(?:,\d*)?\})/u;
  if (
    quantifiedGroup.test(pattern) ||
    /\.\*(?:\.\*|\+)|\.\+(?:\.\*|\+)/u.test(pattern)
  ) {
    throw new Error(
      'This nested or overlapping quantified pattern is rejected to limit runaway matching.',
    );
  }
}

function makeRegex(pattern: string, flags: string, forceGlobal = false) {
  if (!/^[gimsuy]*$/u.test(flags) || new Set(flags).size !== flags.length) {
    throw new Error(
      'Regex flags may contain each of g, i, m, s, u, or y once.',
    );
  }
  const resolvedFlags =
    forceGlobal && !flags.includes('g') ? `${flags}g` : flags;
  try {
    return new RegExp(pattern, resolvedFlags);
  } catch (error) {
    throw new Error(
      error instanceof SyntaxError
        ? `Invalid regular expression: ${error.message}`
        : 'Invalid regular expression.',
    );
  }
}

function collectMatches(expression: RegExp, inputValue: string) {
  const matches: Array<{
    match: string;
    index: number;
    groups: Array<string | null>;
    namedGroups?: Record<string, string>;
  }> = [];
  if (!expression.global) {
    const match = expression.exec(inputValue);
    if (match)
      matches.push({
        match: match[0],
        index: match.index,
        groups: match.slice(1).map((item) => item ?? null),
        ...(match.groups ? { namedGroups: { ...match.groups } } : {}),
      });
    return matches;
  }
  let match: RegExpExecArray | null;
  while ((match = expression.exec(inputValue)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
      groups: match.slice(1).map((item) => item ?? null),
      ...(match.groups ? { namedGroups: { ...match.groups } } : {}),
    });
    if (matches.length >= MAX_MATCHES) break;
    if (match[0] === '') expression.lastIndex += 1;
  }
  return matches;
}

function parseByteList(inputValue: string, kind: 'decimal' | 'binary' | 'hex') {
  const trimmed = requireValue(
    inputValue,
    kind === 'decimal' ? 'decimal bytes' : `${kind} bytes`,
  ).trim();
  let tokens: string[];
  if (kind === 'hex') {
    const compact = trimmed.replace(/[\s:_-]+/gu, '');
    if (!/^[0-9a-f]+$/iu.test(compact) || compact.length % 2 !== 0) {
      throw new Error(
        'Hexadecimal must contain complete two-digit byte pairs.',
      );
    }
    tokens = compact.match(/.{2}/gu) ?? [];
  } else {
    tokens = trimmed.split(/[\s,]+/u);
  }
  if (tokens.length > MAX_INPUT) throw new Error('Byte input is too large.');
  const radix = kind === 'decimal' ? 10 : kind === 'binary' ? 2 : 16;
  const pattern =
    kind === 'decimal'
      ? /^\d{1,3}$/u
      : kind === 'binary'
        ? /^[01]{8}$/u
        : /^[0-9a-f]{2}$/iu;
  return Uint8Array.from(
    tokens.map((token) => {
      if (!pattern.test(token))
        throw new Error(`Invalid ${kind} byte: ${token}`);
      const parsed = Number.parseInt(token, radix);
      if (parsed > 255) throw new Error(`Byte is outside 0–255: ${token}`);
      return parsed;
    }),
  );
}

function parseHexColor(inputValue: string) {
  const match = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.exec(
    inputValue.trim(),
  );
  if (!match) throw new Error('Enter a 3, 4, 6, or 8 digit hexadecimal color.');
  let digits = match[1];
  if (digits.length <= 4)
    digits = Array.from(digits, (digit) => digit + digit).join('');
  return {
    red: Number.parseInt(digits.slice(0, 2), 16),
    green: Number.parseInt(digits.slice(2, 4), 16),
    blue: Number.parseInt(digits.slice(4, 6), 16),
    alpha:
      digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1,
  };
}

function finite(
  values: Record<string, string>,
  key: string,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value(values, key));
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${key} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function channelHex(channel: number) {
  return Math.round(channel).toString(16).padStart(2, '0');
}

function rgbToHsl(red: number, green: number, blue: number) {
  const [r, g, b] = [red, green, blue].map((channel) => channel / 255);
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const lightness = (maximum + minimum) / 2;
  if (maximum === minimum)
    return { hue: 0, saturation: 0, lightness: lightness * 100 };
  const difference = maximum - minimum;
  const saturation = difference / (1 - Math.abs(2 * lightness - 1));
  const hue =
    maximum === r
      ? 60 * (((g - b) / difference) % 6)
      : maximum === g
        ? 60 * ((b - r) / difference + 2)
        : 60 * ((r - g) / difference + 4);
  return {
    hue: (hue + 360) % 360,
    saturation: saturation * 100,
    lightness: lightness * 100,
  };
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const h = ((hue % 360) + 360) % 360;
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = l - chroma / 2;
  const [r, g, b] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return [r, g, b].map((channel) => (channel + match) * 255);
}

async function hashText(
  inputValue: string,
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512',
) {
  if (!globalThis.crypto?.subtle)
    throw new Error('Web Crypto is unavailable in this browser.');
  const digest = await crypto.subtle.digest(
    algorithm,
    new TextEncoder().encode(inputValue),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function runDeveloperDataOperation(
  operationId: string,
  values: Record<string, string>,
): Promise<string> {
  const inputValue = bounded(value(values, 'input'));
  switch (operationId) {
    case 'url-encode-component':
      return encodeURIComponent(inputValue);
    case 'url-decode-component':
      try {
        return decodeURIComponent(inputValue);
      } catch {
        throw new Error('Input contains an invalid percent escape.');
      }
    case 'url-encode':
      return encodeURI(inputValue);
    case 'url-decode':
      try {
        return decodeURI(inputValue);
      } catch {
        throw new Error('Input contains an invalid percent escape.');
      }
    case 'html-entity-encode':
      return inputValue
        .replace(/&/gu, '&amp;')
        .replace(/</gu, '&lt;')
        .replace(/>/gu, '&gt;')
        .replace(/"/gu, '&quot;')
        .replace(/'/gu, '&#39;');
    case 'html-entity-decode':
      return inputValue.replace(
        /&(amp|lt|gt|quot|apos|#39|#\d+|#x[0-9a-f]+);/giu,
        (entity, body: string) => {
          const named: Record<string, string> = {
            amp: '&',
            lt: '<',
            gt: '>',
            quot: '"',
            apos: "'",
            '#39': "'",
          };
          if (named[body.toLowerCase()] !== undefined)
            return named[body.toLowerCase()];
          const codePoint = body.toLowerCase().startsWith('#x')
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
          return Number.isInteger(codePoint) &&
            codePoint <= 0x10ffff &&
            !(codePoint >= 0xd800 && codePoint <= 0xdfff)
            ? String.fromCodePoint(codePoint)
            : entity;
        },
      );
    case 'base64-encode-text':
      return utf8ToBase64(inputValue);
    case 'base64-decode-text':
      return decodeUtf8(base64ToBytes(inputValue, false));
    case 'base64url-encode-text':
      return utf8ToBase64(inputValue)
        .replace(/\+/gu, '-')
        .replace(/\//gu, '_')
        .replace(/=+$/u, '');
    case 'base64url-decode-text':
      return decodeUtf8(base64ToBytes(inputValue, true));
    case 'jwt-inspector': {
      const token = requireValue(inputValue, 'a JWT');
      const parts = token.split('.');
      if (parts.length !== 3)
        throw new Error(
          'A compact JWT must contain exactly three dot-separated parts.',
        );
      const header = safeJson(decodeUtf8(base64ToBytes(parts[0], true)));
      const payload = safeJson(decodeUtf8(base64ToBytes(parts[1], true)));
      return `NOT VERIFIED — decoded content only\n\nHeader\n${JSON.stringify(header, null, 2)}\n\nPayload\n${JSON.stringify(payload, null, 2)}\n\nSignature segment: ${parts[2] ? `${parts[2].length} characters present` : 'empty'}`;
    }
    case 'json-format':
      return transformJson(inputValue, 'pretty');
    case 'json-minify':
      return transformJson(inputValue, 'minify');
    case 'json-sort-keys':
      return transformJson(inputValue, 'sort');
    case 'json-to-csv':
      return emitCsv(parseJsonTable(inputValue));
    case 'csv-to-json':
      return emitJsonTable(parseCsv(inputValue));
    case 'query-string-parser':
      return queryToJson(inputValue);
    case 'query-string-builder':
      return jsonToQuery(inputValue);
    case 'url-parser': {
      const parsed = parseAbsoluteUrl(inputValue);
      return JSON.stringify(
        {
          href: parsed.href,
          origin: parsed.origin,
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port,
          pathname: parsed.pathname,
          search: parsed.search,
          hash: parsed.hash,
        },
        null,
        2,
      );
    }
    case 'url-origin-extractor':
      return parseAbsoluteUrl(inputValue).origin;
    case 'url-path-segments':
      return JSON.stringify(
        parseAbsoluteUrl(inputValue)
          .pathname.split('/')
          .filter(Boolean)
          .map((part) => {
            try {
              return decodeURIComponent(part);
            } catch {
              throw new Error(
                'A path segment contains an invalid percent escape.',
              );
            }
          }),
        null,
        2,
      );
    case 'url-normalizer':
      return parseAbsoluteUrl(inputValue).href;
    case 'query-parameter-set': {
      const parsed = parseAbsoluteUrl(inputValue);
      const key = requireValue(value(values, 'key'), 'a parameter name');
      bounded(key, 'Parameter name', 1_000);
      parsed.searchParams.set(key, value(values, 'value'));
      return parsed.href;
    }
    case 'query-parameter-remove': {
      const parsed = parseAbsoluteUrl(inputValue);
      const key = requireValue(value(values, 'key'), 'a parameter name');
      parsed.searchParams.delete(key);
      return parsed.href;
    }
    case 'regex-tester': {
      const pattern = value(values, 'pattern');
      assertSafeRegex(pattern, inputValue);
      const matches = collectMatches(
        makeRegex(pattern, value(values, 'flags')),
        inputValue,
      );
      return JSON.stringify(
        {
          matched: matches.length > 0,
          count: matches.length,
          capped: matches.length === MAX_MATCHES,
          matches,
        },
        null,
        2,
      );
    }
    case 'regex-extractor': {
      const pattern = value(values, 'pattern');
      assertSafeRegex(pattern, inputValue);
      const group = Number(value(values, 'group'));
      if (!Number.isInteger(group) || group < 0 || group > 100)
        throw new Error('Capture group must be an integer from 0 to 100.');
      const expression = makeRegex(pattern, value(values, 'flags'), true);
      const matches = collectMatches(expression, inputValue);
      return matches
        .map((match) =>
          group === 0 ? match.match : (match.groups[group - 1] ?? ''),
        )
        .join('\n');
    }
    case 'regex-replacer': {
      const pattern = value(values, 'pattern');
      assertSafeRegex(pattern, inputValue);
      const replacement = bounded(
        value(values, 'replacement'),
        'Replacement',
        100_000,
      );
      return inputValue.replace(
        makeRegex(pattern, value(values, 'flags')),
        replacement,
      );
    }
    case 'json-string-escape':
      return JSON.stringify(inputValue).slice(1, -1);
    case 'json-string-unescape':
      try {
        return JSON.parse(`"${inputValue}"`) as string;
      } catch {
        throw new Error('Input is not valid JSON string content.');
      }
    case 'unicode-code-points':
      return Array.from(
        inputValue,
        (character) =>
          `${character}\tU+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`,
      ).join('\n');
    case 'code-points-to-text': {
      const tokens = requireValue(inputValue, 'one or more code points')
        .trim()
        .split(/[\s,]+/u);
      if (tokens.length > 100_000)
        throw new Error('Code-point input is too large.');
      return tokens
        .map((token) => {
          const normalized = token.replace(/^U\+/iu, '').replace(/^0x/iu, '');
          if (!/^[0-9a-f]{1,6}$/iu.test(normalized))
            throw new Error(`Invalid hexadecimal code point: ${token}`);
          const codePoint = Number.parseInt(normalized, 16);
          if (
            codePoint > 0x10ffff ||
            (codePoint >= 0xd800 && codePoint <= 0xdfff)
          )
            throw new Error(`Not a Unicode scalar value: ${token}`);
          return String.fromCodePoint(codePoint);
        })
        .join('');
    }
    case 'utf8-byte-encoder':
      return Array.from(new TextEncoder().encode(inputValue)).join(' ');
    case 'utf8-byte-decoder':
      return decodeUtf8(parseByteList(inputValue, 'decimal'));
    case 'byte-counter':
      return `Unicode characters: ${Array.from(inputValue).length}\nUTF-16 code units: ${inputValue.length}\nUTF-8 bytes: ${new TextEncoder().encode(inputValue).length}`;
    case 'hex-encode-text':
      return Array.from(new TextEncoder().encode(inputValue), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
    case 'hex-decode-text':
      return decodeUtf8(parseByteList(inputValue, 'hex'));
    case 'binary-encode-text':
      return Array.from(new TextEncoder().encode(inputValue), (byte) =>
        byte.toString(2).padStart(8, '0'),
      ).join(' ');
    case 'binary-decode-text':
      return decodeUtf8(parseByteList(inputValue, 'binary'));
    case 'sha-256-text':
      return hashText(inputValue, 'SHA-256');
    case 'sha-384-text':
      return hashText(inputValue, 'SHA-384');
    case 'sha-512-text':
      return hashText(inputValue, 'SHA-512');
    case 'hex-to-rgb': {
      const color = parseHexColor(inputValue);
      return `rgb(${color.red} ${color.green} ${color.blue}${color.alpha < 1 ? ` / ${Number(color.alpha.toFixed(4))}` : ''})`;
    }
    case 'rgb-to-hex': {
      const red = finite(values, 'red', 0, 255);
      const green = finite(values, 'green', 0, 255);
      const blue = finite(values, 'blue', 0, 255);
      const alpha = finite(values, 'alpha', 0, 1);
      return `#${channelHex(red)}${channelHex(green)}${channelHex(blue)}${alpha < 1 ? channelHex(alpha * 255) : ''}`;
    }
    case 'hex-to-hsl': {
      const color = parseHexColor(inputValue);
      const hsl = rgbToHsl(color.red, color.green, color.blue);
      return `hsl(${Math.round(hsl.hue)} ${Math.round(hsl.saturation)}% ${Math.round(hsl.lightness)}%${color.alpha < 1 ? ` / ${Number(color.alpha.toFixed(4))}` : ''})`;
    }
    case 'hsl-to-hex': {
      const hue = finite(values, 'hue', -360_000, 360_000);
      const saturation = finite(values, 'saturation', 0, 100);
      const lightness = finite(values, 'lightness', 0, 100);
      const alpha = finite(values, 'alpha', 0, 1);
      const [red, green, blue] = hslToRgb(hue, saturation, lightness);
      return `#${channelHex(red)}${channelHex(green)}${channelHex(blue)}${alpha < 1 ? channelHex(alpha * 255) : ''}`;
    }
    default:
      throw new Error('Unknown developer operation.');
  }
}
