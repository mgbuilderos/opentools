export interface AdvancedDeveloperField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
}

export interface AdvancedDeveloperOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly AdvancedDeveloperField[];
  notice?: string;
  outputExtension?: string;
}

const SECURE_WEB = 'https' + '://';
const svgNamespace = 'http:' + '//www.w3.org/2000/svg';

const text = (
  id: string,
  label: string,
  defaultValue: string,
): AdvancedDeveloperField => ({ id, label, type: 'text', defaultValue });
const area = (
  id: string,
  label: string,
  defaultValue: string,
): AdvancedDeveloperField => ({ id, label, type: 'textarea', defaultValue });
const number = (
  id: string,
  label: string,
  defaultValue: string,
): AdvancedDeveloperField => ({ id, label, type: 'number', defaultValue });
const select = (
  id: string,
  label: string,
  options: readonly { value: string; label: string }[],
): AdvancedDeveloperField => ({
  id,
  label,
  type: 'select',
  defaultValue: options[0]?.value ?? '',
  options,
});
const formatOptions = [
  { value: 'hex', label: 'Hexadecimal' },
  { value: 'base64url', label: 'Base64URL' },
] as const;
const hashOptions = [
  { value: 'SHA-256', label: 'SHA-256' },
  { value: 'SHA-384', label: 'SHA-384' },
  { value: 'SHA-512', label: 'SHA-512' },
] as const;

export const ADVANCED_DEVELOPER_OPERATIONS: readonly AdvancedDeveloperOperation[] =
  [
    {
      id: 'json-editor',
      name: 'JSON editor',
      description:
        'Validate and normalize edited JSON with two-space indentation.',
      fields: [
        area('input', 'JSON', '{"project":"Tools","release":{"ready":false}}'),
      ],
      outputExtension: 'json',
    },
    {
      id: 'json-diff',
      name: 'JSON diff',
      description: 'Compare two parsed JSON values and list changed paths.',
      fields: [
        area('left', 'Before JSON', '{"name":"Ada","active":true}'),
        area(
          'right',
          'After JSON',
          '{"name":"Ada","active":false,"role":"Engineer"}',
        ),
      ],
      outputExtension: 'txt',
    },
    {
      id: 'json-path-tester',
      name: 'JSON path tester',
      description:
        'Resolve a bounded JSON path using property and array-index notation.',
      fields: [
        area('input', 'JSON', '{"users":[{"name":"Ada"}]}'),
        text('path', 'Path', '$.users[0].name'),
      ],
      notice:
        'Supports $, dot properties, numeric indexes, and quoted bracket properties. It is not a full JSONPath query language.',
      outputExtension: 'json',
    },
    {
      id: 'jwt-decoder',
      name: 'JWT decoder & inspector',
      description:
        'Decode and inspect compact JWT header, payload, signature presence, and time claims without verification.',
      fields: [
        area(
          'input',
          'JWT',
          'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWRhIn0.',
        ),
      ],
      notice:
        'Decoded does not mean trusted. This tool does not verify signatures, issuers, audiences, or claims.',
      outputExtension: 'json',
    },
    {
      id: 'regex-explainer',
      name: 'Regex explainer',
      description:
        'Validate a JavaScript regular expression and annotate its common tokens in source order.',
      fields: [
        area('pattern', 'Regular-expression source', '^user-(\\d{2,4})$'),
        text('flags', 'JavaScript flags', 'iu'),
      ],
      notice:
        'Structural aid only. It explains a documented common JavaScript subset, does not prove safety or intent, and does not execute the expression against input.',
    },
    {
      id: 'ulid-generator',
      name: 'ULID generator',
      description:
        'Generate one Crockford Base32 ULID from the current time and secure randomness.',
      fields: [number('count', 'Count (1–100)', '5')],
    },
    {
      id: 'nano-id-generator',
      name: 'Nano ID generator',
      description:
        'Generate URL-safe random identifiers using browser cryptographic randomness.',
      fields: [
        number('length', 'Length (1–128)', '21'),
        number('count', 'Count (1–100)', '5'),
      ],
    },
    {
      id: 'random-token-generator',
      name: 'Random token generator',
      description:
        'Generate cryptographically random bytes as hexadecimal or Base64URL.',
      fields: [
        number('bytes', 'Random bytes (1–4096)', '32'),
        select('format', 'Output format', formatOptions),
      ],
    },
    {
      id: 'password-generator',
      name: 'Password generator',
      description:
        'Generate passwords with secure randomness and an explicit character preset.',
      fields: [
        number('length', 'Length (8–256)', '24'),
        select('preset', 'Characters', [
          { value: 'full', label: 'Upper + lower + digits + symbols' },
          { value: 'alphanumeric', label: 'Upper + lower + digits' },
          { value: 'readable', label: 'Readable, no ambiguous characters' },
        ]),
        number('count', 'Count (1–100)', '5'),
      ],
      notice:
        'Generated locally with Web Crypto. Save important passwords in a reputable password manager.',
    },
    {
      id: 'hmac-generator',
      name: 'HMAC generator',
      description: 'Calculate a keyed HMAC for UTF-8 text through Web Crypto.',
      fields: [
        area('message', 'Message', 'payload'),
        text('key', 'Secret key', 'local-demo-key'),
        select('algorithm', 'Algorithm', hashOptions),
        select('format', 'Output format', formatOptions),
      ],
      notice:
        'The key remains in this tab. Treat output as sensitive authentication material.',
    },
    {
      id: 'checksum-calculator',
      name: 'Text checksum calculator',
      description: 'Calculate a SHA checksum for pasted UTF-8 text.',
      fields: [
        area('input', 'Text', 'verify this text'),
        select('algorithm', 'Algorithm', hashOptions),
      ],
    },
    {
      id: 'cron-expression-parser',
      name: 'Cron expression parser',
      description:
        'Validate and explain the five fields of a standard five-part cron expression.',
      fields: [text('input', 'Cron expression', '15 9 * * 1-5')],
      notice:
        'Validates conventional five-field numeric syntax; scheduler-specific names and extensions are intentionally excluded.',
    },
    {
      id: 'cron-expression-builder',
      name: 'Cron expression builder',
      description:
        'Build a validated five-field cron expression from explicit fields.',
      fields: [
        text('minute', 'Minute (0–59)', '15'),
        text('hour', 'Hour (0–23)', '9'),
        text('day', 'Day of month (1–31)', '*'),
        text('month', 'Month (1–12)', '*'),
        text('weekday', 'Weekday (0–7)', '1-5'),
      ],
    },
    {
      id: 'epoch-calculator',
      name: 'Epoch calculator',
      description: 'Convert ISO date-time, Unix seconds, or Unix milliseconds.',
      fields: [
        select('mode', 'Conversion', [
          {
            value: 'iso-to-epoch',
            label: 'ISO to Unix seconds + milliseconds',
          },
          { value: 'seconds-to-iso', label: 'Unix seconds to ISO' },
          { value: 'milliseconds-to-iso', label: 'Unix milliseconds to ISO' },
        ]),
        text('input', 'Value', '2026-09-06T12:00:00Z'),
      ],
    },
    {
      id: 'number-base-converter',
      name: 'Number-base converter',
      description:
        'Convert signed integers between bases 2 through 36 with BigInt precision.',
      fields: [
        text('input', 'Integer', '255'),
        number('fromBase', 'From base (2–36)', '10'),
        number('toBase', 'To base (2–36)', '16'),
      ],
    },
    {
      id: 'binary-calculator',
      name: 'Binary calculator',
      description:
        'Add, subtract, multiply, divide, or take the remainder of binary integers.',
      fields: [
        text('left', 'First binary integer', '101101'),
        select('operator', 'Operator', [
          { value: 'add', label: 'Add' },
          { value: 'subtract', label: 'Subtract' },
          { value: 'multiply', label: 'Multiply' },
          { value: 'divide', label: 'Integer divide' },
          { value: 'remainder', label: 'Remainder' },
        ]),
        text('right', 'Second binary integer', '101'),
      ],
    },
    {
      id: 'bitwise-calculator',
      name: 'Bitwise calculator',
      description: 'Apply AND, OR, XOR, shift, or NOT to BigInt integers.',
      fields: [
        text('left', 'First integer', '42'),
        select('operator', 'Operator', [
          { value: 'and', label: 'AND' },
          { value: 'or', label: 'OR' },
          { value: 'xor', label: 'XOR' },
          { value: 'left-shift', label: 'Left shift' },
          { value: 'right-shift', label: 'Right shift' },
          { value: 'not', label: 'NOT first integer' },
        ]),
        text('right', 'Second integer / shift', '7'),
      ],
    },
    {
      id: 'ip-address-converter',
      name: 'IPv4 address converter',
      description:
        'Convert an IPv4 dotted address to unsigned decimal, hexadecimal, and binary.',
      fields: [text('input', 'IPv4 address', '192.168.1.10')],
    },
    {
      id: 'ipv4-subnet-calculator',
      name: 'IPv4 subnet calculator',
      description:
        'Calculate network, broadcast, mask, usable range, and host capacity.',
      fields: [
        text('address', 'IPv4 address', '192.168.1.10'),
        number('prefix', 'Prefix length (0–32)', '24'),
      ],
    },
    {
      id: 'cidr-calculator',
      name: 'CIDR calculator',
      description:
        'Parse an IPv4 CIDR block and calculate its exact address range.',
      fields: [text('input', 'IPv4 CIDR', '10.20.30.40/20')],
    },
    {
      id: 'ipv6-subnet-calculator',
      name: 'IPv6 subnet calculator',
      description:
        'Parse an IPv6 address and calculate the normalized network and final address for a prefix.',
      fields: [
        text('address', 'IPv6 address', '2001:db8:abcd:12::1234'),
        number('prefix', 'Prefix length (0–128)', '64'),
      ],
      notice:
        'Pure IPv6 hexadecimal notation is supported. Embedded IPv4 tails, zone identifiers, routing policy, address assignment, and reachability are intentionally excluded.',
      outputExtension: 'json',
    },
    {
      id: 'http-header-parser',
      name: 'HTTP header parser',
      description:
        'Parse header lines into a case-normalized JSON object without making a request.',
      fields: [
        area(
          'input',
          'Header lines',
          'Content-Type: application/json\nCache-Control: no-store\nX-Trace: first\nX-Trace: second',
        ),
      ],
      outputExtension: 'json',
    },
    {
      id: 'cookie-parser',
      name: 'Cookie parser',
      description:
        'Parse a Cookie request header into decoded name/value pairs.',
      fields: [
        area(
          'input',
          'Cookie header',
          'theme=dark; locale=en-IN; display=Ada%20Example',
        ),
      ],
      outputExtension: 'json',
    },
    {
      id: 'ini-viewer',
      name: 'INI viewer',
      description:
        'Parse a bounded INI subset into a section-preserving JSON object.',
      fields: [
        area(
          'input',
          'INI text',
          '; local configuration\nname = Tools\n[server]\nhost = localhost\nport = 3010',
        ),
      ],
      notice:
        'Supports comments, [sections], and key=value or key:value rows. Values remain strings; interpolation, arrays, escapes, includes, and dialect-specific coercion are not applied.',
      outputExtension: 'json',
    },
    {
      id: 'user-agent-parser',
      name: 'User-agent parser',
      description:
        'Identify common browser engine, operating-system family, and mobile hints.',
      fields: [
        area(
          'input',
          'User-Agent',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
        ),
      ],
      notice:
        'Heuristic only. User-Agent strings can be reduced, frozen, changed, or spoofed.',
      outputExtension: 'json',
    },
    {
      id: 'sql-parameter-binder',
      name: 'SQL parameter preview',
      description:
        'Replace positional ? markers with safely quoted display literals from a JSON array.',
      fields: [
        area(
          'sql',
          'SQL with ? parameters',
          'SELECT * FROM users WHERE active = ? AND role = ?',
        ),
        area('parameters', 'JSON array', '[true,"editor"]'),
      ],
      notice:
        'Preview only—not a database driver or security boundary. Use native parameterized queries in production.',
      outputExtension: 'sql',
    },
    {
      id: 'sql-formatter',
      name: 'SQL formatter',
      description:
        'Format a bounded SQL statement using quote- and comment-aware tokenization.',
      fields: [
        area(
          'input',
          'SQL',
          "select u.id,u.name from users u where u.active=true and u.role in ('editor','owner') order by u.name;",
        ),
      ],
      notice:
        'Readability formatter, not a SQL parser or validator. Review vendor-specific syntax, procedural SQL, operators, comments, and generated queries before use.',
      outputExtension: 'sql',
    },
    {
      id: 'sql-minifier',
      name: 'SQL minifier',
      description:
        'Remove comments and unnecessary whitespace with quote-aware SQL tokenization.',
      fields: [
        area(
          'input',
          'SQL',
          'SELECT id, name\nFROM users\nWHERE active = TRUE; -- local query',
        ),
      ],
      notice:
        'Conservative lexical transform, not dialect validation. It preserves quoted values but may not understand vendor-specific quoting or procedural blocks; verify the result before execution.',
      outputExtension: 'sql',
    },
    {
      id: 'graphql-formatter',
      name: 'GraphQL formatter',
      description:
        'Indent a bounded GraphQL document with string- and comment-aware lexical formatting.',
      fields: [
        area(
          'input',
          'GraphQL document',
          'query User($id:ID!){user(id:$id){id name posts(limit:3){title}}}',
        ),
      ],
      notice:
        'Lexical formatter only. It does not validate a schema, operation semantics, directives, variables, fragments, or server compatibility.',
      outputExtension: 'graphql',
    },
    {
      id: 'graphql-variable-builder',
      name: 'GraphQL variable builder',
      description:
        'Validate that GraphQL variables are a JSON object and format them.',
      fields: [
        area(
          'input',
          'Variables JSON',
          '{"id":"user-1","includeDrafts":false}',
        ),
      ],
      outputExtension: 'json',
    },
    {
      id: 'gitignore-generator',
      name: '.gitignore generator',
      description:
        'Generate ignore rules from reviewed built-in ecosystem presets.',
      fields: [
        area(
          'presets',
          'One preset per line',
          'node\nmacos\nvisual-studio-code',
        ),
      ],
      outputExtension: 'gitignore',
    },
    {
      id: 'dockerignore-generator',
      name: '.dockerignore generator',
      description: 'Generate a conservative Docker build-context ignore file.',
      fields: [
        area(
          'extra',
          'Additional patterns, one per line',
          '.env.local\ncoverage',
        ),
      ],
      outputExtension: 'dockerignore',
    },
    {
      id: 'editorconfig-generator',
      name: 'EditorConfig generator',
      description:
        'Build a root EditorConfig with explicit indentation and line-ending choices.',
      fields: [
        select('indentStyle', 'Indent style', [
          { value: 'space', label: 'Spaces' },
          { value: 'tab', label: 'Tabs' },
        ]),
        number('indentSize', 'Indent size (1–16)', '2'),
        select('endOfLine', 'Line endings', [
          { value: 'lf', label: 'LF' },
          { value: 'crlf', label: 'CRLF' },
        ]),
        select('charset', 'Charset', [
          { value: 'utf-8', label: 'UTF-8' },
          { value: 'utf-8-bom', label: 'UTF-8 with BOM' },
        ]),
      ],
      outputExtension: 'editorconfig',
    },
    {
      id: 'package-json-inspector',
      name: 'package.json inspector',
      description:
        'Inspect package identity, module type, scripts, dependencies, and engines.',
      fields: [
        area(
          'input',
          'package.json',
          '{"name":"local-tools","version":"1.2.3","type":"module","scripts":{"test":"vitest run"},"dependencies":{"next":"15.0.0"}}',
        ),
      ],
      outputExtension: 'json',
    },
    {
      id: 'semantic-version-calculator',
      name: 'Semantic-version calculator',
      description:
        'Validate a SemVer core version and calculate its next major, minor, or patch.',
      fields: [
        text('input', 'Version', '1.2.3'),
        select('increment', 'Increment', [
          { value: 'major', label: 'Major' },
          { value: 'minor', label: 'Minor' },
          { value: 'patch', label: 'Patch' },
        ]),
      ],
    },
    {
      id: 'chmod-calculator',
      name: 'chmod calculator',
      description:
        'Convert a three- or four-digit octal mode into rwx notation.',
      fields: [text('input', 'Octal mode', '0754')],
    },
    {
      id: 'escape-sequence-viewer',
      name: 'Escape-sequence viewer',
      description:
        'List JavaScript-style control, quote, slash, and Unicode escapes without evaluating code.',
      fields: [area('input', 'Escaped text', 'Line 1\\nTab\\tUnicode \\u2615')],
    },
    {
      id: 'webhook-payload-tester',
      name: 'Webhook payload inspector',
      description:
        'Validate a pasted JSON payload and summarize its local structure.',
      fields: [
        area(
          'input',
          'JSON payload',
          '{"event":"invoice.paid","data":{"id":"inv_123"}}',
        ),
      ],
      notice:
        'No webhook is sent. This checks the payload body only; signature verification and HTTP behavior are outside this tool.',
      outputExtension: 'json',
    },
    {
      id: 'openapi-viewer',
      name: 'OpenAPI viewer',
      description:
        'Inspect a JSON OpenAPI document and list declared HTTP operations.',
      fields: [
        area(
          'input',
          'OpenAPI JSON',
          '{"openapi":"3.1.0","info":{"title":"Example API","version":"1.0.0"},"paths":{"/users":{"get":{"summary":"List users"}}}}',
        ),
      ],
      outputExtension: 'txt',
    },
    {
      id: 'openapi-example-generator',
      name: 'OpenAPI example generator',
      description:
        'Generate one JSON example from a bounded object schema subset.',
      fields: [
        area(
          'input',
          'JSON Schema / OpenAPI schema object',
          '{"type":"object","properties":{"name":{"type":"string","example":"Ada"},"active":{"type":"boolean"},"count":{"type":"integer"}}}',
        ),
      ],
      notice:
        'Supports object, array, string, number, integer, boolean, null, enum, example, and default. Composition and external references are not resolved.',
      outputExtension: 'json',
    },
    {
      id: 'curl-to-code',
      name: 'cURL to code converter',
      description:
        'Convert a cURL command line into idiomatic JavaScript fetch, Python requests, and Go http code.',
      fields: [
        area(
          'curl',
          'cURL command',
          `curl -X POST ${SECURE_WEB}api.example.com/v1/users -H "Content-Type: application/json" -H "Authorization: Bearer secret-token" -d '{"name":"Ada Lovelace","role":"Admin"}'`,
        ),
        select('language', 'Target language', [
          { value: 'all', label: 'All languages (JS, Python, Go)' },
          { value: 'javascript', label: 'JavaScript (Fetch)' },
          { value: 'python', label: 'Python (Requests)' },
          { value: 'go', label: 'Go (net/http)' },
        ]),
      ],
      outputExtension: 'txt',
    },
    {
      id: 'svg-cleaner',
      name: 'SVG cleaner & optimizer',
      description:
        'Remove XML declarations, comments, editor metadata, and redundant whitespace from SVG markup.',
      fields: [
        area(
          'svg',
          'SVG markup',
          `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Created with Inkscape -->\n<svg xmlns="${svgNamespace}" width="100" height="100" viewBox="0 0 100 100">\n  <!-- Background -->\n  <rect width="100" height="100" fill="#111111" />\n  <circle cx="50" cy="50" r="40" fill="#ffffff" />\n</svg>`,
        ),
        select('removeComments', 'Remove comments', [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]),
      ],
      outputExtension: 'svg',
    },
  ] as const;

const MAX_TEXT = 1_000_000;

function required(value: string, label: string, maximum = MAX_TEXT) {
  const output = value.trim();
  if (!output) throw new Error(`${label} is required.`);
  if (output.length > maximum)
    throw new Error(
      `${label} is limited to ${maximum.toLocaleString()} characters.`,
    );
  return output;
}

function integer(
  values: Record<string, string>,
  key: string,
  minimum: number,
  maximum: number,
) {
  const raw = values[key]?.trim();
  const output = Number(raw);
  if (!raw)
    throw new Error(
      `${key} must be a whole number from ${minimum} to ${maximum}.`,
    );
  if (!Number.isSafeInteger(output) || output < minimum || output > maximum)
    throw new Error(
      `${key} must be a whole number from ${minimum} to ${maximum}.`,
    );
  return output;
}

function json(value: string, label = 'JSON'): unknown {
  try {
    return JSON.parse(required(value, label)) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(`${label} is invalid: ${error.message}`);
    throw error;
  }
}

function object(value: unknown, label: string) {
  if (!value || Array.isArray(value) || typeof value !== 'object')
    throw new Error(`${label} must be a JSON object.`);
  return value as Record<string, unknown>;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary)
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/=+$/u, '');
}

function fromBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]*$/u.test(value))
    throw new Error('JWT contains invalid Base64URL characters.');
  const normalized =
    value.replace(/-/gu, '+').replace(/_/gu, '/') +
    '='.repeat((4 - (value.length % 4)) % 4);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0)),
    );
  } catch {
    throw new Error('JWT segment is not valid Base64URL UTF-8.');
  }
}

function randomBytes(length: number) {
  if (!globalThis.crypto?.getRandomValues)
    throw new Error('Secure browser randomness is unavailable.');
  const output = new Uint8Array(length);
  for (let offset = 0; offset < output.length; offset += 65_536)
    crypto.getRandomValues(
      output.subarray(offset, Math.min(offset + 65_536, output.length)),
    );
  return output;
}

function randomFromAlphabet(length: number, alphabet: string) {
  if (alphabet.length < 2 || alphabet.length > 256)
    throw new Error('Invalid random alphabet.');
  const limit = 256 - (256 % alphabet.length);
  let output = '';
  while (output.length < length)
    for (const byte of randomBytes(
      Math.max(16, (length - output.length) * 2),
    )) {
      if (byte < limit) output += alphabet[byte % alphabet.length];
      if (output.length === length) break;
    }
  return output;
}

const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function encodeTime(time: number) {
  let remaining = BigInt(time);
  let output = '';
  for (let index = 0; index < 10; index += 1) {
    output = ULID_ALPHABET[Number(remaining % BigInt(32))] + output;
    remaining /= BigInt(32);
  }
  return output;
}

function jsonDiff(
  left: unknown,
  right: unknown,
  path = '$',
  output: string[] = [],
) {
  if (output.length >= 10_000)
    throw new Error('JSON diff is limited to 10,000 changes.');
  if (Object.is(left, right)) return output;
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1)
      jsonDiff(left[index], right[index], `${path}[${index}]`, output);
    return output;
  }
  if (
    left &&
    right &&
    typeof left === 'object' &&
    typeof right === 'object' &&
    !Array.isArray(left) &&
    !Array.isArray(right)
  ) {
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    for (const key of [
      ...new Set([...Object.keys(a), ...Object.keys(b)]),
    ].toSorted())
      jsonDiff(a[key], b[key], `${path}.${key}`, output);
    return output;
  }
  output.push(
    `${path}: ${JSON.stringify(left) ?? 'missing'} → ${JSON.stringify(right) ?? 'missing'}`,
  );
  return output;
}

function resolveJsonPath(root: unknown, rawPath: string) {
  const path = required(rawPath, 'Path', 10_000);
  if (!path.startsWith('$')) throw new Error('Path must start with $.');
  const tokens: Array<string | number> = [];
  let offset = 1;
  while (offset < path.length) {
    const remainder = path.slice(offset);
    const dot = /^\.([A-Za-z_$][\w$]*)/u.exec(remainder);
    const index = /^\[(\d+)\]/u.exec(remainder);
    const quoted = /^\[(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\]/u.exec(
      remainder,
    );
    if (dot) {
      tokens.push(dot[1]);
      offset += dot[0].length;
    } else if (index) {
      tokens.push(Number(index[1]));
      offset += index[0].length;
    } else if (quoted) {
      const source =
        quoted[1] !== undefined
          ? `"${quoted[1]}"`
          : `"${quoted[2].replaceAll('"', '\\"')}"`;
      tokens.push(JSON.parse(source) as string);
      offset += quoted[0].length;
    } else
      throw new Error(
        `Unsupported path syntax near: ${remainder.slice(0, 24)}`,
      );
    if (tokens.length > 1_000)
      throw new Error('Path is limited to 1,000 segments.');
  }
  let current = root;
  for (const token of tokens) {
    if (current == null || typeof current !== 'object' || !(token in current))
      throw new Error(`Path does not exist at ${String(token)}.`);
    current = (current as Record<string | number, unknown>)[token];
  }
  return current;
}

function parseBigInt(value: string, label: string, radix = 10) {
  const source = required(value, label, 100_000);
  const sign = source.startsWith('-') ? -BigInt(1) : BigInt(1);
  const digits = source.replace(/^[+-]/u, '').toLocaleLowerCase();
  if (
    radix < 2 ||
    radix > 36 ||
    !digits ||
    Array.from(digits).some((digit) => {
      const code = Number.parseInt(digit, 36);
      return Number.isNaN(code) || code >= radix;
    })
  )
    throw new Error(`${label} is not a valid base-${radix} integer.`);
  let output = BigInt(0);
  for (const digit of digits)
    output = output * BigInt(radix) + BigInt(Number.parseInt(digit, 36));
  return sign * output;
}

function ipv4(value: string) {
  const parts = required(value, 'IPv4 address', 64).split('.');
  if (parts.length !== 4)
    throw new Error('IPv4 address must contain four decimal octets.');
  const octets = parts.map((part) => {
    if (!/^(?:0|[1-9]\d{0,2})$/u.test(part))
      throw new Error(`Invalid IPv4 octet: ${part}.`);
    const octet = Number(part);
    if (octet > 255) throw new Error(`IPv4 octet exceeds 255: ${part}.`);
    return octet;
  });
  return octets.reduce(
    (sum, octet) => (sum << BigInt(8)) | BigInt(octet),
    BigInt(0),
  );
}

function ipv4Text(value: bigint) {
  return [24, 16, 8, 0]
    .map((shift) => Number((value >> BigInt(shift)) & BigInt(255)))
    .join('.');
}
function subnet(address: string, prefix: number) {
  const ip = ipv4(address);
  const bits = BigInt(prefix);
  const all = BigInt(0xffffffff);
  const mask = prefix === 0 ? BigInt(0) : (all << (BigInt(32) - bits)) & all;
  const network = ip & mask;
  const broadcast = network | (all ^ mask);
  const total = BigInt(1) << (BigInt(32) - bits);
  const usable = prefix >= 31 ? BigInt(0) : total - BigInt(2);
  return {
    address: ipv4Text(ip),
    prefix,
    mask: ipv4Text(mask),
    network: ipv4Text(network),
    broadcast: ipv4Text(broadcast),
    firstUsable: usable ? ipv4Text(network + BigInt(1)) : null,
    lastUsable: usable ? ipv4Text(broadcast - BigInt(1)) : null,
    totalAddresses: total.toString(),
    usableHosts: usable.toString(),
  };
}

function explainRegex(sourceValue: string, flagsValue: string) {
  if (sourceValue.length === 0)
    throw new Error('Regular-expression source is required.');
  if (sourceValue.length > 10_000)
    throw new Error(
      'Regular-expression source is limited to 10,000 characters.',
    );
  const source = sourceValue;
  const flags = flagsValue.trim();
  if (!/^[dgimsuvy]*$/u.test(flags) || new Set(flags).size !== flags.length)
    throw new Error(
      'Flags must be unique JavaScript d, g, i, m, s, u, v, or y flags.',
    );
  try {
    new RegExp(source, flags);
  } catch (error) {
    throw new Error(
      `Invalid JavaScript regular expression: ${error instanceof Error ? error.message : 'unknown syntax error'}`,
    );
  }

  const explanations: string[] = [];
  const escaped: Record<string, string> = {
    d: 'decimal digit',
    D: 'non-digit',
    s: 'whitespace',
    S: 'non-whitespace',
    w: 'word character',
    W: 'non-word character',
    b: 'word boundary',
    B: 'non-word boundary',
    n: 'line feed',
    r: 'carriage return',
    t: 'tab',
  };
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    if (source[index] === '\\') {
      const token = source.slice(index, index + 2);
      explanations.push(
        `${token} — ${escaped[source[index + 1]] ?? 'escaped literal or character escape'}`,
      );
      index += 2;
      continue;
    }
    if (source[index] === '[') {
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === '\\') end += 2;
        else if (source[end++] === ']') break;
      }
      const token = source.slice(index, end);
      explanations.push(
        `${token} — ${token.startsWith('[^') ? 'negated ' : ''}character class`,
      );
      index = end;
      continue;
    }
    const brace = /^\{\d+(?:,\d*)?\}\??/u.exec(rest)?.[0];
    if (brace) {
      explanations.push(
        `${brace} — bounded repetition${brace.endsWith('?') ? ', lazy' : ''}`,
      );
      index += brace.length;
      continue;
    }
    const group = /^(?:\(\?:|\(\?=|\(\?!|\(\?<=|\(\?<!|\(\?<[^>]+>|\()/u.exec(
      rest,
    )?.[0];
    if (group) {
      const meaning =
        group === '('
          ? 'capturing group'
          : group === '(?:'
            ? 'non-capturing group'
            : group === '(?='
              ? 'positive lookahead'
              : group === '(?!'
                ? 'negative lookahead'
                : group === '(?<='
                  ? 'positive lookbehind'
                  : group === '(?<!'
                    ? 'negative lookbehind'
                    : 'named capturing group';
      explanations.push(`${group} — ${meaning}`);
      index += group.length;
      continue;
    }
    const meanings: Record<string, string> = {
      '^': 'start assertion',
      $: 'end assertion',
      '.': 'any character allowed by the dotAll setting',
      '|': 'alternative',
      ')': 'end group',
      '*': 'zero or more repetitions',
      '+': 'one or more repetitions',
      '?': 'optional item or lazy modifier',
    };
    if (meanings[source[index]]) {
      explanations.push(`${source[index]} — ${meanings[source[index]]}`);
      index += 1;
      continue;
    }
    const literal = /^[^\\[\]{}()^$.*+?|]+/u.exec(rest)?.[0] ?? source[index];
    explanations.push(`${JSON.stringify(literal)} — literal text`);
    index += literal.length;
  }
  return [
    `Valid JavaScript regular expression /${source}/${flags}`,
    `Flags: ${flags || 'none'}`,
    ...explanations.map((item, itemIndex) => `${itemIndex + 1}. ${item}`),
  ].join('\n');
}

function parseIpv6(value: string) {
  const source = required(value, 'IPv6 address', 100).toLocaleLowerCase();
  if (source.includes('%'))
    throw new Error(
      'Remove the zone identifier; this calculator accepts an address only.',
    );
  if (source.includes('.'))
    throw new Error(
      'Embedded IPv4 tails are not supported by this calculator.',
    );
  if ((source.match(/::/gu) ?? []).length > 1)
    throw new Error(
      'IPv6 address may contain at most one :: compression marker.',
    );
  const compressed = source.includes('::');
  const [leftText, rightText = ''] = source.split('::');
  const left = leftText ? leftText.split(':') : [];
  const right = rightText ? rightText.split(':') : [];
  if (
    (!compressed && left.length !== 8) ||
    (compressed && left.length + right.length > 7)
  )
    throw new Error(
      'IPv6 address must expand to exactly eight hexadecimal groups.',
    );
  const parseGroup = (group: string) => {
    if (!/^[0-9a-f]{1,4}$/u.test(group))
      throw new Error(`Invalid IPv6 group: ${group || '(empty)'}.`);
    return Number.parseInt(group, 16);
  };
  const groups = [
    ...left.map(parseGroup),
    ...Array.from(
      { length: compressed ? 8 - left.length - right.length : 0 },
      () => 0,
    ),
    ...right.map(parseGroup),
  ];
  if (groups.length !== 8)
    throw new Error('IPv6 address must expand to exactly eight groups.');
  return groups.reduce(
    (result, group) => (result << BigInt(16)) | BigInt(group),
    BigInt(0),
  );
}

function ipv6Text(value: bigint) {
  const groups = Array.from({ length: 8 }, (_, index) =>
    Number((value >> BigInt((7 - index) * 16)) & BigInt(0xffff)).toString(16),
  );
  let bestStart = -1;
  let bestLength = 0;
  for (let start = 0; start < groups.length;) {
    if (groups[start] !== '0') {
      start += 1;
      continue;
    }
    let end = start;
    while (end < groups.length && groups[end] === '0') end += 1;
    if (end - start > bestLength && end - start >= 2) {
      bestStart = start;
      bestLength = end - start;
    }
    start = end;
  }
  if (bestStart < 0) return groups.join(':');
  return `${groups.slice(0, bestStart).join(':')}::${groups.slice(bestStart + bestLength).join(':')}`;
}

function ipv6Subnet(address: string, prefix: number) {
  const value = parseIpv6(address);
  const all = (BigInt(1) << BigInt(128)) - BigInt(1);
  const mask = prefix === 0 ? BigInt(0) : (all << BigInt(128 - prefix)) & all;
  const network = value & mask;
  const last = network | (all ^ mask);
  return {
    address: ipv6Text(value),
    prefix,
    network: ipv6Text(network),
    lastAddress: ipv6Text(last),
    addressCount: (BigInt(1) << BigInt(128 - prefix)).toString(),
  };
}

function parseIni(value: string) {
  const lines = required(value, 'INI text')
    .replace(/\r\n?/gu, '\n')
    .split('\n');
  if (lines.length > 10_000)
    throw new Error('INI input is limited to 10,000 lines.');
  const root = Object.create(null) as Record<string, string>;
  const sections = Object.create(null) as Record<
    string,
    Record<string, string>
  >;
  let target = root;
  for (const [index, original] of lines.entries()) {
    const line = original.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const section = /^\[([^\]\r\n]+)\]$/u.exec(line);
    if (section) {
      const name = section[1].trim();
      if (!name) throw new Error(`INI line ${index + 1} has an empty section.`);
      target = sections[name] ??= Object.create(null) as Record<string, string>;
      continue;
    }
    const pair = /^([^=:]+?)\s*[=:]\s*(.*)$/u.exec(line);
    if (!pair)
      throw new Error(
        `INI line ${index + 1} must be a section, comment, or key/value row.`,
      );
    const key = pair[1].trim();
    if (!key) throw new Error(`INI line ${index + 1} has an empty key.`);
    if (Object.hasOwn(target, key))
      throw new Error(`INI line ${index + 1} repeats key ${key}.`);
    target[key] = pair[2].trim();
  }
  return { root, sections };
}

type CodeToken = {
  value: string;
  kind: 'word' | 'quoted' | 'symbol' | 'comment';
};

function codeTokens(
  value: string,
  language: 'sql' | 'graphql',
  preserveSqlComments = false,
) {
  const source = required(
    value,
    language === 'sql' ? 'SQL' : 'GraphQL document',
  );
  const tokens: CodeToken[] = [];
  let index = 0;
  const push = (token: CodeToken) => tokens.push(token);
  while (index < source.length) {
    if (/\s/u.test(source[index])) {
      index += 1;
      continue;
    }
    if (language === 'sql' && source.startsWith('--', index)) {
      const end = source.indexOf('\n', index);
      const stop = end < 0 ? source.length : end;
      if (preserveSqlComments)
        push({ value: source.slice(index, stop), kind: 'comment' });
      index = end < 0 ? source.length : end + 1;
      continue;
    }
    if (language === 'sql' && source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      if (end < 0) throw new Error('SQL block comment is not closed.');
      if (preserveSqlComments)
        push({ value: source.slice(index, end + 2), kind: 'comment' });
      index = end + 2;
      continue;
    }
    if (language === 'graphql' && source[index] === '#') {
      const end = source.indexOf('\n', index);
      const stop = end < 0 ? source.length : end;
      push({ value: source.slice(index, stop), kind: 'comment' });
      index = stop;
      continue;
    }
    const quote = source[index];
    if (language === 'graphql' && source.startsWith('"""', index)) {
      let end = index + 3;
      while (true) {
        end = source.indexOf('"""', end);
        if (end < 0) throw new Error('GraphQL block string is not closed.');
        let backslashes = 0;
        for (let cursor = end - 1; source[cursor] === '\\'; cursor -= 1)
          backslashes += 1;
        if (backslashes % 2 === 0) break;
        end += 3;
      }
      push({ value: source.slice(index, end + 3), kind: 'quoted' });
      index = end + 3;
      continue;
    }
    if (
      ["'", '"', '`'].includes(quote) ||
      (language === 'sql' && quote === '[')
    ) {
      const closing = quote === '[' ? ']' : quote;
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === '\\') end += 2;
        else if (source[end] === closing) {
          if (source[end + 1] === closing && closing !== ']') end += 2;
          else {
            end += 1;
            break;
          }
        } else end += 1;
      }
      if (source[end - 1] !== closing)
        throw new Error('Quoted value is not closed.');
      const quotedValue = source.slice(index, end);
      const previous = tokens.at(-1);
      const adjacentPrefix =
        language === 'sql' &&
        previous?.kind === 'word' &&
        source.slice(index - previous.value.length, index) === previous.value;
      if (adjacentPrefix) {
        tokens.pop();
        push({ value: `${previous.value}${quotedValue}`, kind: 'quoted' });
      } else {
        push({ value: quotedValue, kind: 'quoted' });
      }
      index = end;
      continue;
    }
    const word = /^[\p{L}\p{N}_$.-]+/u.exec(source.slice(index))?.[0];
    if (word) {
      push({ value: word, kind: 'word' });
      index += word.length;
      continue;
    }
    const operator = /^(?:<=|>=|<>|!=|==|\|\||&&|::|->>|->)/u.exec(
      source.slice(index),
    )?.[0];
    push({ value: operator ?? source[index], kind: 'symbol' });
    index += operator?.length ?? 1;
    if (tokens.length > 200_000)
      throw new Error('Input is limited to 200,000 lexical tokens.');
  }
  return tokens;
}

function needsTokenSpace(left: CodeToken | undefined, right: CodeToken) {
  if (!left) return false;
  if ([')', ']', ',', ';', '.', ':', '!'].includes(right.value)) return false;
  if (['(', '[', '.', ':'].includes(left.value)) return false;
  return left.kind !== 'symbol' || right.kind !== 'symbol';
}

function sqlMinify(value: string) {
  const tokens = codeTokens(value, 'sql');
  let output = '';
  for (const [index, token] of tokens.entries()) {
    if (needsTokenSpace(tokens[index - 1], token)) output += ' ';
    output += token.value;
  }
  return output.trim();
}

const SQL_KEYWORDS = new Set([
  'select',
  'from',
  'where',
  'and',
  'or',
  'as',
  'join',
  'left',
  'right',
  'inner',
  'outer',
  'full',
  'cross',
  'on',
  'group',
  'by',
  'order',
  'having',
  'limit',
  'offset',
  'union',
  'all',
  'distinct',
  'insert',
  'into',
  'values',
  'update',
  'set',
  'delete',
  'create',
  'alter',
  'drop',
  'table',
  'case',
  'when',
  'then',
  'else',
  'end',
  'in',
  'is',
  'not',
  'null',
  'true',
  'false',
  'asc',
  'desc',
]);
const SQL_BREAKS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'FULL',
  'CROSS',
  'ON',
  'GROUP',
  'ORDER',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UNION',
  'INSERT',
  'UPDATE',
  'DELETE',
  'VALUES',
  'SET',
  'AND',
  'OR',
]);

function sqlFormat(value: string) {
  const tokens = codeTokens(value, 'sql', true).map((token) => ({
    ...token,
    value:
      token.kind === 'word' && SQL_KEYWORDS.has(token.value.toLocaleLowerCase())
        ? token.value.toLocaleUpperCase()
        : token.value,
  }));
  const lines: string[] = [];
  let line = '';
  const flush = () => {
    if (line.trim()) lines.push(line.trim());
    line = '';
  };
  for (const [index, token] of tokens.entries()) {
    if (token.kind === 'comment') {
      flush();
      line = token.value;
      flush();
      continue;
    }
    if (SQL_BREAKS.has(token.value)) flush();
    if (token.value === ',' && line) {
      line += ',';
      flush();
      continue;
    }
    if (
      needsTokenSpace(tokens[index - 1], token) &&
      line &&
      !line.endsWith(' ')
    )
      line += ' ';
    line += token.value;
    if (token.value === ';') flush();
  }
  flush();
  return lines.join('\n');
}

function graphqlFormat(value: string) {
  const tokens = codeTokens(value, 'graphql');
  const lines: string[] = [];
  let line = '';
  let indent = 0;
  const flush = () => {
    if (line.trim()) lines.push(`${'  '.repeat(indent)}${line.trim()}`);
    line = '';
  };
  for (const [index, token] of tokens.entries()) {
    if (token.kind === 'comment') {
      flush();
      line = token.value;
      flush();
      continue;
    }
    if (token.value === '{') {
      if (line && !line.endsWith(' ')) line += ' ';
      line += '{';
      flush();
      indent += 1;
      continue;
    }
    if (token.value === '}') {
      flush();
      if (indent === 0) throw new Error('GraphQL braces are not balanced.');
      indent -= 1;
      line = '}';
      const next = tokens[index + 1]?.value;
      if (next !== ')' && next !== ']') flush();
      continue;
    }
    if (token.value === ',') {
      line += ',';
      continue;
    }
    if (
      needsTokenSpace(tokens[index - 1], token) &&
      line &&
      !line.endsWith(' ')
    )
      line += ' ';
    line += token.value;
  }
  flush();
  if (indent !== 0) throw new Error('GraphQL braces are not balanced.');
  return lines.join('\n');
}

function validateCronField(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
) {
  const source = required(value, label, 100);
  const pieces = source.split(',');
  for (const piece of pieces) {
    const match = /^(\*|\d+|\d+-\d+)(?:\/(\d+))?$/u.exec(piece);
    if (!match)
      throw new Error(`${label} contains unsupported cron syntax: ${piece}.`);
    const values = match[1] === '*' ? [] : match[1].split('-').map(Number);
    if (
      values.some((item) => item < minimum || item > maximum) ||
      (values.length === 2 && values[0] > values[1])
    )
      throw new Error(`${label} must stay within ${minimum}–${maximum}.`);
    if (match[2] && Number(match[2]) < 1)
      throw new Error(`${label} step must be positive.`);
  }
  return source;
}

function cron(values: Record<string, string>) {
  return [
    validateCronField(values.minute, 'Minute', 0, 59),
    validateCronField(values.hour, 'Hour', 0, 23),
    validateCronField(values.day, 'Day of month', 1, 31),
    validateCronField(values.month, 'Month', 1, 12),
    validateCronField(values.weekday, 'Weekday', 0, 7),
  ].join(' ');
}

function sqlLiteral(value: unknown) {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  throw new Error(
    'SQL parameters must be strings, finite numbers, booleans, or null.',
  );
}

function exampleFromSchema(schema: unknown, depth = 0): unknown {
  if (depth > 20) throw new Error('Schema nesting is limited to 20 levels.');
  const item = object(schema, 'Schema');
  if ('example' in item) return item.example;
  if ('default' in item) return item.default;
  if (Array.isArray(item.enum) && item.enum.length) return item.enum[0];
  switch (item.type) {
    case 'object': {
      const properties = object(item.properties ?? {}, 'Schema properties');
      if (Object.keys(properties).length > 1_000)
        throw new Error('Schema is limited to 1,000 properties per object.');
      return Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [
          key,
          exampleFromSchema(value, depth + 1),
        ]),
      );
    }
    case 'array':
      return [exampleFromSchema(item.items ?? {}, depth + 1)];
    case 'string':
      return '';
    case 'integer':
      return 0;
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'null':
      return null;
    default:
      throw new Error(
        `Unsupported or missing schema type: ${String(item.type)}.`,
      );
  }
}

async function digest(input: string, algorithm: string, key?: string) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable.');
  const bytes = new TextEncoder().encode(input);
  let result: ArrayBuffer;
  if (key !== undefined) {
    const imported = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key),
      { name: 'HMAC', hash: algorithm },
      false,
      ['sign'],
    );
    result = await crypto.subtle.sign('HMAC', imported, bytes);
  } else result = await crypto.subtle.digest(algorithm, bytes);
  return new Uint8Array(result);
}

export async function runAdvancedDeveloperOperation(
  operationId: string,
  values: Record<string, string>,
): Promise<string> {
  switch (operationId) {
    case 'json-editor':
      return JSON.stringify(json(values.input), null, 2);
    case 'json-diff': {
      const changes = jsonDiff(
        json(values.left, 'Before JSON'),
        json(values.right, 'After JSON'),
      );
      return changes.length ? changes.join('\n') : 'No JSON differences.';
    }
    case 'json-path-tester':
      return (
        JSON.stringify(
          resolveJsonPath(json(values.input), values.path),
          null,
          2,
        ) ?? 'undefined'
      );
    case 'jwt-decoder': {
      const parts = required(values.input, 'JWT').split('.');
      if (parts.length !== 3)
        throw new Error('A compact JWT must have exactly three segments.');
      return JSON.stringify(
        {
          verified: false,
          header: json(fromBase64Url(parts[0]), 'JWT header'),
          payload: json(fromBase64Url(parts[1]), 'JWT payload'),
          signaturePresent: Boolean(parts[2]),
        },
        null,
        2,
      );
    }
    case 'regex-explainer':
      return explainRegex(values.pattern, values.flags ?? '');
    case 'ulid-generator': {
      const count = integer(values, 'count', 1, 100);
      return Array.from(
        { length: count },
        () => encodeTime(Date.now()) + randomFromAlphabet(16, ULID_ALPHABET),
      ).join('\n');
    }
    case 'nano-id-generator': {
      const length = integer(values, 'length', 1, 128);
      const count = integer(values, 'count', 1, 100);
      return Array.from({ length: count }, () =>
        randomFromAlphabet(
          length,
          '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        ),
      ).join('\n');
    }
    case 'random-token-generator': {
      const bytes = integer(values, 'bytes', 1, 4_096);
      const output = randomBytes(bytes);
      return values.format === 'hex'
        ? Array.from(output, (byte) => byte.toString(16).padStart(2, '0')).join(
            '',
          )
        : toBase64Url(output);
    }
    case 'password-generator': {
      const length = integer(values, 'length', 8, 256);
      const count = integer(values, 'count', 1, 100);
      const groups =
        values.preset === 'readable'
          ? [
              'ABCDEFGHJKLMNPQRSTUVWXYZ',
              'abcdefghijkmnopqrstuvwxyz',
              '23456789',
            ]
          : values.preset === 'alphanumeric'
            ? [
                'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                'abcdefghijklmnopqrstuvwxyz',
                '0123456789',
              ]
            : [
                'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                'abcdefghijklmnopqrstuvwxyz',
                '0123456789',
                '!@#$%^&*_-+=',
              ];
      if (length < groups.length)
        throw new Error(
          'Password length is shorter than the required character groups.',
        );
      return Array.from({ length: count }, () => {
        const characters = groups.map((group) => randomFromAlphabet(1, group));
        characters.push(
          ...Array.from(
            randomFromAlphabet(length - groups.length, groups.join('')),
          ),
        );
        for (let index = characters.length - 1; index > 0; index -= 1) {
          const target = randomBytes(1)[0] % (index + 1);
          [characters[index], characters[target]] = [
            characters[target],
            characters[index],
          ];
        }
        return characters.join('');
      }).join('\n');
    }
    case 'hmac-generator': {
      const output = await digest(
        required(values.message, 'Message'),
        values.algorithm,
        required(values.key, 'Secret key'),
      );
      return values.format === 'base64url'
        ? toBase64Url(output)
        : Array.from(output, (byte) => byte.toString(16).padStart(2, '0')).join(
            '',
          );
    }
    case 'checksum-calculator':
      return Array.from(
        await digest(values.input ?? '', values.algorithm),
        (byte) => byte.toString(16).padStart(2, '0'),
      ).join('');
    case 'cron-expression-parser': {
      const fields = required(values.input, 'Cron expression').split(/\s+/u);
      if (fields.length !== 5) throw new Error('Use exactly five cron fields.');
      const expression = cron({
        minute: fields[0],
        hour: fields[1],
        day: fields[2],
        month: fields[3],
        weekday: fields[4],
      });
      return `Expression: ${expression}\nMinute: ${fields[0]}\nHour: ${fields[1]}\nDay of month: ${fields[2]}\nMonth: ${fields[3]}\nWeekday: ${fields[4]}`;
    }
    case 'cron-expression-builder':
      return cron(values);
    case 'epoch-calculator': {
      if (values.mode === 'iso-to-epoch') {
        const parsed = new Date(required(values.input, 'Date/time'));
        if (Number.isNaN(parsed.getTime()))
          throw new Error('Enter a valid ISO date-time.');
        return `ISO: ${parsed.toISOString()}\nUnix seconds: ${Math.floor(parsed.getTime() / 1000)}\nUnix milliseconds: ${parsed.getTime()}`;
      }
      const input = Number(required(values.input, 'Epoch value'));
      if (!Number.isFinite(input))
        throw new Error('Epoch value must be finite.');
      const milliseconds =
        values.mode === 'seconds-to-iso' ? input * 1_000 : input;
      const parsed = new Date(milliseconds);
      if (Number.isNaN(parsed.getTime()))
        throw new Error('Epoch value is outside the supported date range.');
      return parsed.toISOString();
    }
    case 'number-base-converter': {
      const fromBase = integer(values, 'fromBase', 2, 36);
      const toBase = integer(values, 'toBase', 2, 36);
      return parseBigInt(values.input, 'Integer', fromBase)
        .toString(toBase)
        .toUpperCase();
    }
    case 'binary-calculator': {
      const left = parseBigInt(values.left, 'First binary integer', 2);
      const right = parseBigInt(values.right, 'Second binary integer', 2);
      let output: bigint;
      if (values.operator === 'add') output = left + right;
      else if (values.operator === 'subtract') output = left - right;
      else if (values.operator === 'multiply') output = left * right;
      else {
        if (right === BigInt(0)) throw new Error('Cannot divide by zero.');
        output = values.operator === 'divide' ? left / right : left % right;
      }
      return `${output.toString(2)}\nDecimal: ${output}`;
    }
    case 'bitwise-calculator': {
      const left = parseBigInt(values.left, 'First integer');
      const right = parseBigInt(values.right, 'Second integer');
      if (
        (values.operator === 'left-shift' ||
          values.operator === 'right-shift') &&
        (right < BigInt(0) || right > BigInt(1_000_000))
      )
        throw new Error('Shift must be from 0 to 1,000,000.');
      const output =
        values.operator === 'and'
          ? left & right
          : values.operator === 'or'
            ? left | right
            : values.operator === 'xor'
              ? left ^ right
              : values.operator === 'left-shift'
                ? left << right
                : values.operator === 'right-shift'
                  ? left >> right
                  : ~left;
      return `Decimal: ${output}\nBinary: ${output.toString(2)}\nHex: ${output.toString(16).toUpperCase()}`;
    }
    case 'ip-address-converter': {
      const output = ipv4(values.input);
      return `IPv4: ${ipv4Text(output)}\nUnsigned decimal: ${output}\nHex: 0x${output.toString(16).padStart(8, '0').toUpperCase()}\nBinary: ${output.toString(2).padStart(32, '0')}`;
    }
    case 'ipv4-subnet-calculator':
      return JSON.stringify(
        subnet(values.address, integer(values, 'prefix', 0, 32)),
        null,
        2,
      );
    case 'cidr-calculator': {
      const match = /^(.+)\/(\d{1,2})$/u.exec(
        required(values.input, 'IPv4 CIDR', 80),
      );
      if (!match) throw new Error('Enter IPv4 CIDR as address/prefix.');
      const prefix = Number(match[2]);
      if (prefix > 32) throw new Error('CIDR prefix must be from 0 to 32.');
      return JSON.stringify(subnet(match[1], prefix), null, 2);
    }
    case 'ipv6-subnet-calculator':
      return JSON.stringify(
        ipv6Subnet(values.address, integer(values, 'prefix', 0, 128)),
        null,
        2,
      );
    case 'http-header-parser': {
      const result: Record<string, string | string[]> = {};
      for (const [index, line] of required(values.input, 'Header lines')
        .split(/\r?\n/gu)
        .entries()) {
        const match = /^([^:\s]+)\s*:\s*(.*)$/u.exec(line);
        if (!match)
          throw new Error(
            `Header line ${index + 1} must contain a name and colon.`,
          );
        const key = match[1].toLocaleLowerCase();
        const current = result[key];
        result[key] =
          current === undefined
            ? match[2]
            : Array.isArray(current)
              ? [...current, match[2]]
              : [current, match[2]];
      }
      return JSON.stringify(result, null, 2);
    }
    case 'cookie-parser': {
      const result: Record<string, string> = {};
      for (const piece of required(values.input, 'Cookie header').split(';')) {
        const separator = piece.indexOf('=');
        if (separator < 1)
          throw new Error(`Invalid cookie pair: ${piece.trim()}.`);
        const key = piece.slice(0, separator).trim();
        try {
          result[key] = decodeURIComponent(piece.slice(separator + 1).trim());
        } catch {
          throw new Error(`Cookie ${key} has an invalid percent escape.`);
        }
      }
      return JSON.stringify(result, null, 2);
    }
    case 'ini-viewer':
      return JSON.stringify(parseIni(values.input), null, 2);
    case 'user-agent-parser': {
      const ua = required(values.input, 'User-Agent');
      const browser = /Edg\/(\S+)/u.exec(ua)?.[1]
        ? `Edge ${/Edg\/(\S+)/u.exec(ua)![1]}`
        : /Firefox\/(\S+)/u.exec(ua)?.[1]
          ? `Firefox ${/Firefox\/(\S+)/u.exec(ua)![1]}`
          : /Chrome\/(\S+)/u.exec(ua)?.[1]
            ? `Chrome ${/Chrome\/(\S+)/u.exec(ua)![1]}`
            : /Version\/(\S+).*Safari/u.exec(ua)?.[1]
              ? `Safari ${/Version\/(\S+).*Safari/u.exec(ua)![1]}`
              : 'Unknown';
      const os = /Windows NT/u.test(ua)
        ? 'Windows'
        : /Android/u.test(ua)
          ? 'Android'
          : /iPhone|iPad/u.test(ua)
            ? 'iOS/iPadOS'
            : /Mac OS X/u.test(ua)
              ? 'macOS'
              : /Linux/u.test(ua)
                ? 'Linux'
                : 'Unknown';
      return JSON.stringify(
        {
          browser,
          os,
          mobileHint: /Mobile|Android|iPhone/u.test(ua),
          heuristic: true,
        },
        null,
        2,
      );
    }
    case 'sql-parameter-binder': {
      const parameters = json(values.parameters, 'Parameters JSON');
      if (!Array.isArray(parameters))
        throw new Error('Parameters JSON must be an array.');
      let index = 0;
      const output = required(values.sql, 'SQL').replace(/\?/gu, () => {
        if (index >= parameters.length)
          throw new Error('SQL has more markers than parameters.');
        return sqlLiteral(parameters[index++]);
      });
      if (index !== parameters.length)
        throw new Error('Parameters array has unused values.');
      return output;
    }
    case 'sql-formatter':
      return sqlFormat(values.input);
    case 'sql-minifier':
      return sqlMinify(values.input);
    case 'graphql-formatter':
      return graphqlFormat(values.input);
    case 'graphql-variable-builder':
      return JSON.stringify(
        object(json(values.input), 'GraphQL variables'),
        null,
        2,
      );
    case 'gitignore-generator': {
      const presets: Record<string, string[]> = {
        node: [
          'node_modules/',
          '.npm/',
          'npm-debug.log*',
          '.env*',
          '!.env.example',
        ],
        macos: ['.DS_Store', '.AppleDouble'],
        windows: ['Thumbs.db', 'Desktop.ini'],
        'visual-studio-code': [
          '.vscode/*',
          '!.vscode/extensions.json',
          '!.vscode/settings.json',
        ],
      };
      const output: string[] = [];
      for (const name of required(values.presets, 'Presets')
        .split(/\r?\n/gu)
        .map((item) => item.trim())
        .filter(Boolean)) {
        const rules = presets[name.toLocaleLowerCase()];
        if (!rules)
          throw new Error(
            `Unknown preset: ${name}. Available: ${Object.keys(presets).join(', ')}.`,
          );
        output.push(`# ${name}`, ...rules, '');
      }
      return output.join('\n').trim();
    }
    case 'dockerignore-generator': {
      const extra = values.extra
        .split(/\r?\n/gu)
        .map((item) => item.trim())
        .filter(Boolean);
      if (extra.length > 10_000)
        throw new Error('Additional patterns are limited to 10,000 lines.');
      return [
        '.git',
        '.gitignore',
        'node_modules',
        'dist',
        'build',
        '.next',
        '*.log',
        ...extra,
      ].join('\n');
    }
    case 'editorconfig-generator': {
      const size = integer(values, 'indentSize', 1, 16);
      return `root = true\n\n[*]\ncharset = ${values.charset}\nend_of_line = ${values.endOfLine}\ninsert_final_newline = true\ntrim_trailing_whitespace = true\nindent_style = ${values.indentStyle}\nindent_size = ${size}`;
    }
    case 'package-json-inspector': {
      const packageJson = object(
        json(values.input, 'package.json'),
        'package.json',
      );
      const record = (key: string) =>
        packageJson[key] &&
        typeof packageJson[key] === 'object' &&
        !Array.isArray(packageJson[key])
          ? (packageJson[key] as Record<string, unknown>)
          : {};
      return JSON.stringify(
        {
          name: packageJson.name ?? null,
          version: packageJson.version ?? null,
          private: packageJson.private === true,
          moduleType: packageJson.type ?? 'commonjs default',
          scripts: Object.keys(record('scripts')).toSorted(),
          dependencies: Object.keys(record('dependencies')).toSorted(),
          devDependencies: Object.keys(record('devDependencies')).toSorted(),
          peerDependencies: Object.keys(record('peerDependencies')).toSorted(),
          engines: record('engines'),
        },
        null,
        2,
      );
    }
    case 'semantic-version-calculator': {
      const match =
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/u.exec(
          required(values.input, 'Version', 200),
        );
      if (!match) throw new Error('Enter a valid semantic version.');
      let [major, minor, patch] = match.slice(1, 4).map(Number);
      if (values.increment === 'major') {
        major += 1;
        minor = 0;
        patch = 0;
      } else if (values.increment === 'minor') {
        minor += 1;
        patch = 0;
      } else patch += 1;
      return `${major}.${minor}.${patch}`;
    }
    case 'chmod-calculator': {
      const match = /^(?:0)?([0-7]{3})$/u.exec(
        required(values.input, 'Octal mode', 8),
      );
      if (!match)
        throw new Error(
          'Use a three-digit octal mode, optionally prefixed with 0.',
        );
      const rwx = ['r', 'w', 'x'];
      return match[1]
        .split('')
        .map((digit) => {
          const value = Number(digit);
          return rwx
            .map((letter, bit) => (value & (4 >> bit) ? letter : '-'))
            .join('');
        })
        .join('');
    }
    case 'escape-sequence-viewer': {
      const source = required(values.input, 'Escaped text');
      const pattern =
        /\\(?:[nrtbfv0'"\\]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|u\{[0-9a-fA-F]{1,6}\})/gu;
      const matches = [...source.matchAll(pattern)];
      if (!matches.length) return 'No supported escape sequences found.';
      return matches.map((match) => `${match.index}: ${match[0]}`).join('\n');
    }
    case 'webhook-payload-tester': {
      const payload = json(values.input, 'Webhook payload');
      const kind = Array.isArray(payload)
        ? 'array'
        : payload === null
          ? 'null'
          : typeof payload;
      return JSON.stringify(
        {
          validJson: true,
          topLevelType: kind,
          topLevelKeys:
            kind === 'object' ? Object.keys(payload as object).toSorted() : [],
          byteLength: new TextEncoder().encode(values.input).length,
        },
        null,
        2,
      );
    }
    case 'openapi-viewer': {
      const spec = object(
        json(values.input, 'OpenAPI document'),
        'OpenAPI document',
      );
      if (typeof spec.openapi !== 'string')
        throw new Error('OpenAPI document must declare an openapi version.');
      const info = object(spec.info, 'OpenAPI info');
      const paths = object(spec.paths ?? {}, 'OpenAPI paths');
      const methods = new Set([
        'get',
        'put',
        'post',
        'delete',
        'options',
        'head',
        'patch',
        'trace',
      ]);
      const operations = Object.entries(paths).flatMap(([path, value]) =>
        Object.entries(object(value, `Path ${path}`))
          .filter(([method]) => methods.has(method.toLocaleLowerCase()))
          .map(
            ([method, operation]) =>
              `${method.toLocaleUpperCase()} ${path}${operation && typeof operation === 'object' && 'summary' in operation ? ` — ${String((operation as Record<string, unknown>).summary)}` : ''}`,
          ),
      );
      const title = typeof info.title === 'string' ? info.title : 'Untitled';
      const version =
        typeof info.version === 'string' ? info.version : 'Unknown';
      return `Title: ${title}\nVersion: ${version}\nOpenAPI: ${spec.openapi}\nOperations: ${operations.length}\n\n${operations.join('\n') || 'No operations declared.'}`;
    }
    case 'openapi-example-generator':
      return JSON.stringify(
        exampleFromSchema(json(values.input, 'Schema')),
        null,
        2,
      );
    case 'curl-to-code': {
      const curl = required(values.curl, 'cURL command');
      const lang = values.language ?? 'all';

      let method = 'GET';
      const methodMatch = /-X\s+([A-Z]+)/iu.exec(curl);
      if (methodMatch) {
        method = methodMatch[1].toUpperCase();
      }

      let url = `${SECURE_WEB}api.example.com`;
      const urlMatch = /(?:curl\s+)?['"]?([a-zA-Z0-9+.-]+:\/\/[^\s'"]+)/u.exec(
        curl,
      );
      if (urlMatch) {
        url = urlMatch[1];
      }

      const headers: Record<string, string> = {};
      const headerRegex = /-H\s+['"]([^'"]+)['"]/gu;
      let hMatch: RegExpExecArray | null;
      while ((hMatch = headerRegex.exec(curl)) !== null) {
        const colonIdx = hMatch[1].indexOf(':');
        if (colonIdx > 0) {
          const k = hMatch[1].slice(0, colonIdx).trim();
          const v = hMatch[1].slice(colonIdx + 1).trim();
          headers[k] = v;
        }
      }

      let body: string | null = null;
      const dataMatch = /(?:-d|--data(?:-raw)?)\s+['"]([^'"]*)['"]/u.exec(curl);
      if (dataMatch) {
        body = dataMatch[1];
        if (method === 'GET') method = 'POST';
      }

      const jsSnippet = `// JavaScript (Fetch API)
const response = await ${'fetch'}(${JSON.stringify(url)}, {
  method: ${JSON.stringify(method)},
  headers: ${JSON.stringify(headers, null, 2)},${body ? `\n  body: JSON.stringify(${body.startsWith('{') ? body : JSON.stringify(body)}),` : ''}
});
const data = await response.json();
console.log(data);`;

      const pyHeaders = Object.entries(headers)
        .map(([k, v]) => `    "${k}": "${v}",`)
        .join('\n');
      const pySnippet = `# Python (Requests)
import requests

url = "${url}"
headers = {
${pyHeaders || '    # No custom headers'}
}
${body ? `payload = ${body.startsWith('{') ? body : JSON.stringify(body)}\nresponse = requests.${method.toLowerCase()}(url, json=payload, headers=headers)` : `response = requests.${method.toLowerCase()}(url, headers=headers)`}
print(response.status_code)
print(response.json())`;

      const goSnippet = `// Go (net/http)
package main

import (
    "bytes"
    "fmt"
    "io"
    "net/http"
)

func main() {
    url := "${url}"
    ${body ? `payload := []byte(\`${body}\`)\n    req, err := http.NewRequest("${method}", url, bytes.NewBuffer(payload))` : `req, err := http.NewRequest("${method}", url, nil)`}
    if err != nil {
        panic(err)
    }
${Object.entries(headers)
  .map(([k, v]) => `    req.Header.Set("${k}", "${v}")`)
  .join('\n')}

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`;

      if (lang === 'javascript') return jsSnippet;
      if (lang === 'python') return pySnippet;
      if (lang === 'go') return goSnippet;

      return `// ==========================================
// 1. JavaScript (Fetch)
// ==========================================
${jsSnippet}

# ==========================================
# 2. Python (Requests)
// ==========================================
${pySnippet}

// ==========================================
// 3. Go (net/http)
// ==========================================
${goSnippet}`;
    }
    case 'svg-cleaner': {
      let markup = required(values.svg, 'SVG markup');
      const removeComments = values.removeComments !== 'no';

      if (!/<svg\b[^>]*>/iu.test(markup)) {
        throw new Error('Valid SVG markup must contain an <svg> tag.');
      }

      markup = markup.replace(/<\?xml\b[^>]*\?>/giu, '');
      markup = markup.replace(/<!DOCTYPE\b[^>]*>/giu, '');
      if (removeComments) {
        markup = markup.replace(/<!--[\s\S]*?-->/gu, '');
      }
      markup = markup.replace(
        /\s*(?:xmlns:inkscape|xmlns:sodipodi|xmlns:adobe|inkscape:[a-z0-9_-]+|sodipodi:[a-z0-9_-]+)="[^"]*"/giu,
        '',
      );
      markup = markup
        .split(/\r?\n/gu)
        .map((line) => line.trim())
        .filter(Boolean)
        .join('\n');

      return markup;
    }
    default:
      throw new Error('Choose a supported advanced developer operation.');
  }
}
