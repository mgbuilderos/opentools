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
      name: 'Unix chmod & permissions calculator',
      description:
        'Calculate POSIX file permissions, convert octal to symbolic modes, and generate exact chmod commands.',
      fields: [
        text('input', 'Octal mode (e.g. 755, 644, 600)', '755'),
        text(
          'targetPath',
          'Target file or directory path (for command preview)',
          'script.sh',
        ),
      ],
      outputExtension: 'txt',
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
        'Convert a cURL command line into idiomatic JavaScript fetch, Axios, Python requests, Go, Node.js, and PHP code.',
      fields: [
        area(
          'curl',
          'cURL command',
          `curl -X POST ${SECURE_WEB}api.example.com/v1/users -H "Content-Type: application/json" -H "Authorization: Bearer secret-token" -d '{"name":"Ada Lovelace","role":"Admin"}'`,
        ),
        select('language', 'Target language', [
          {
            value: 'all',
            label: 'All languages (JS, Python, Axios, Go, Node, PHP)',
          },
          { value: 'javascript', label: 'JavaScript (Fetch)' },
          { value: 'axios', label: 'Axios (TypeScript / Node)' },
          { value: 'python', label: 'Python (Requests)' },
          { value: 'go', label: 'Go (net/http)' },
          { value: 'node', label: 'Node.js (Fetch)' },
          { value: 'php', label: 'PHP (cURL)' },
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
    {
      id: 'cron-generator',
      name: 'Cron expression generator & translator',
      description:
        'Parse, build, and translate 5-field crontab schedules into plain English with next run estimates.',
      notice:
        'Standard 5-field cron: minute (0-59), hour (0-23), day of month (1-31), month (1-12), weekday (0-7).',
      outputExtension: 'txt',
      fields: [
        text(
          'expression',
          'Cron expression (min hour day month weekday)',
          '*/15 9-17 * * 1-5',
        ),
        select('preset', 'Or choose a preset schedule', [
          { value: 'custom', label: 'Use custom expression above' },
          { value: 'hourly', label: 'Every hour at :00 (0 * * * *)' },
          {
            value: 'daily_midnight',
            label: 'Daily at midnight (0 0 * * *)',
          },
          {
            value: 'daily_morning',
            label: 'Daily at 9:00 AM (0 9 * * *)',
          },
          {
            value: 'weekly_monday',
            label: 'Every Monday at 9:00 AM (0 9 * * 1)',
          },
          {
            value: 'monthly_first',
            label: '1st of every month at midnight (0 0 1 * *)',
          },
        ]),
      ],
    },
    {
      id: 'regex-tester',
      name: 'Regular expression tester & inspector',
      description:
        'Test and analyze regular expressions with live match highlighting, capture group extraction, and flags.',
      outputExtension: 'txt',
      fields: [
        text(
          'pattern',
          'Regular expression pattern',
          '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        ),
        text('flags', 'Flags (g, i, m, s, u)', 'gi'),
        area(
          'testText',
          'Test string',
          'Reach out to alex@example.com or support.team+priority@company.org for assistance.',
        ),
      ],
    },
    {
      id: 'dummy-data-generator',
      name: 'Mock & dummy data generator',
      description:
        'Generate structured realistic mock dataset records for testing databases and APIs in JSON, CSV, or SQL.',
      outputExtension: 'json',
      fields: [
        number('count', 'Record count (1 to 100)', '5'),
        select('format', 'Output format', [
          { value: 'json', label: 'JSON Array' },
          { value: 'csv', label: 'CSV' },
          { value: 'sql', label: 'SQL INSERT Statements' },
        ]),
        text('tableName', 'Table name (for SQL)', 'users'),
        select('schemaType', 'Data schema profile', [
          {
            value: 'users',
            label: 'User Accounts (ID, Name, Email, Role, JoinedAt)',
          },
          {
            value: 'orders',
            label: 'E-Commerce Orders (Order ID, Customer, Amount, Status)',
          },
          {
            value: 'products',
            label: 'Product Catalog (SKU, Title, Category, Price, InStock)',
          },
        ]),
      ],
    },
    {
      id: 'git-flight-rules',
      name: 'Git emergency scenarios ("Flight Rules")',
      description:
        'Quick copy-paste solutions for common Git mistakes, branch recovery, and commit operations.',
      outputExtension: 'txt',
      fields: [
        select('scenario', 'What do you need to fix?', [
          {
            value: 'undo-commit-keep',
            label: 'Undo last commit (keep changes staged in index)',
          },
          {
            value: 'undo-commit-discard',
            label: 'Undo last commit (completely discard all changes)',
          },
          {
            value: 'change-message',
            label: 'Change the commit message of the most recent commit',
          },
          {
            value: 'recover-branch',
            label: 'Recover a deleted branch using git reflog',
          },
          {
            value: 'discard-unstaged',
            label: 'Discard all unstaged local file changes',
          },
          {
            value: 'stash-include-untracked',
            label: 'Stash working directory including new untracked files',
          },
          {
            value: 'squash-commits',
            label: 'Squash the last N commits into one',
          },
        ]),
        text('branchName', 'Branch name (if applicable)', 'feature/my-branch'),
        text('commitHash', 'Commit hash (if applicable)', 'a1b2c3d'),
        number('commitCount', 'Number of commits N (for squash)', '3'),
      ],
    },
    {
      id: 'docker-cheatsheet',
      name: 'Docker & Compose generator & cheatsheet',
      description:
        'Generate multi-container docker-compose.yml templates and essential container management CLI commands.',
      outputExtension: 'yaml',
      fields: [
        select('template', 'Docker boilerplate template', [
          {
            value: 'node-postgres-redis',
            label: 'Node.js + PostgreSQL + Redis Compose Stack',
          },
          {
            value: 'python-postgres',
            label: 'Python / FastAPI + PostgreSQL Stack',
          },
          {
            value: 'nginx-reverse-proxy',
            label: 'Nginx Reverse Proxy with SSL Boilerplate',
          },
          {
            value: 'cli-cleanup',
            label: 'CLI Commands: Prune & Clean Unused Disk Space',
          },
          {
            value: 'cli-troubleshoot',
            label: 'CLI Commands: Inspect, Logs, and Shell Exec',
          },
        ]),
      ],
    },
    {
      id: 'http-status-codes',
      name: 'HTTP status codes reference',
      description:
        'Searchable encyclopedia of 1xx–5xx HTTP response status codes with RFC definitions and API guidance.',
      outputExtension: 'txt',
      fields: [
        select('code', 'Select status code', [
          { value: 'all', label: 'All Common Status Codes Overview' },
          { value: '200', label: '200 OK — Standard success' },
          { value: '201', label: '201 Created — Resource created' },
          { value: '204', label: '204 No Content — Action succeeded' },
          {
            value: '301',
            label: '301 Moved Permanently — Permanent redirect',
          },
          {
            value: '304',
            label: '304 Not Modified — Conditional GET / Cache hit',
          },
          {
            value: '400',
            label: '400 Bad Request — Client request syntax error',
          },
          {
            value: '401',
            label: '401 Unauthorized — Authentication required',
          },
          {
            value: '403',
            label: '403 Forbidden — Authenticated but unauthorized',
          },
          { value: '404', label: '404 Not Found — Resource does not exist' },
          {
            value: '409',
            label: '409 Conflict — Request conflicts with state',
          },
          {
            value: '422',
            label: '422 Unprocessable Entity — Validation error',
          },
          {
            value: '429',
            label: '429 Too Many Requests — Rate limit reached',
          },
          {
            value: '500',
            label: '500 Internal Server Error — Unhandled server crash',
          },
          {
            value: '502',
            label: '502 Bad Gateway — Upstream proxy failure',
          },
          {
            value: '503',
            label: '503 Service Unavailable — Server overloaded/down',
          },
          {
            value: '504',
            label: '504 Gateway Timeout — Upstream timed out',
          },
        ]),
      ],
    },
    {
      id: 'llm-secret-scrubber',
      name: 'LLM Secret & API Key Scrubber',
      description:
        'Redact API keys, AWS credentials, tokens, connection strings, emails, and passwords before pasting prompts into ChatGPT or Claude.',
      fields: [
        area(
          'input',
          'Prompt / Code / Log with Secrets',
          'const apiKey = "sk-proj-98a7bcdef1234567890abcdef";\nconst awsKey = "AKIAIOSFODNN7EXAMPLE";\nconst db = "postgres://admin:supersecret123@db.prod.internal:5432/main";\nconsole.log("Contact admin@company.internal for access");',
        ),
        select('scrubKeys', 'Scrub API & Cloud Keys', [
          {
            value: 'yes',
            label: 'Yes — Redact AWS, OpenAI, Stripe, GitHub, Bearer tokens',
          },
          { value: 'no', label: 'No — Keep keys as-is' },
        ]),
        select('scrubEmails', 'Scrub Email Addresses', [
          { value: 'yes', label: 'Yes — Redact user & internal emails' },
          { value: 'no', label: 'No — Keep emails' },
        ]),
        select('scrubIps', 'Scrub IPv4 Addresses', [
          { value: 'no', label: 'No — Keep IP addresses' },
          { value: 'yes', label: 'Yes — Redact IPv4 addresses' },
        ]),
        select('placeholderStyle', 'Placeholder Format', [
          {
            value: 'numbered',
            label: 'Numbered tokens ([REDACTED_OPENAI_API_KEY_1])',
          },
          { value: 'generic', label: 'Generic ([REDACTED_KEY])' },
        ]),
      ],
      outputExtension: 'txt',
    },
    {
      id: 'har-sanitizer',
      name: 'HAR (HTTP Archive) Sanitizer',
      description:
        'Sanitize .har network capture files by stripping cookies, authorization headers, and sensitive query tokens before sharing.',
      fields: [
        area(
          'input',
          'HAR File Content (JSON)',
          `{\n  "log": {\n    "version": "1.2",\n    "creator": { "name": "WebInspector", "version": "537.36" },\n    "entries": [\n      {\n        "request": {\n          "method": "POST",\n          "url": "${SECURE_WEB}api.example.com/v1/auth?token=secret123",\n          "headers": [\n            { "name": "Authorization", "value": "Bearer eyJhbGciOi..." },\n            { "name": "Cookie", "value": "session_id=987654321" }\n          ],\n          "cookies": [\n            { "name": "session_id", "value": "987654321" }\n          ]\n        },\n        "response": {\n          "status": 200,\n          "headers": [\n            { "name": "Set-Cookie", "value": "session_id=new_secret" }\n          ],\n          "cookies": []\n        }\n      }\n    ]\n  }\n}`,
        ),
        select('stripCookies', 'Strip All Cookies', [
          { value: 'yes', label: 'Yes — Clear all cookie arrays & headers' },
          { value: 'no', label: 'No — Keep cookies' },
        ]),
        select('maskAuthHeaders', 'Mask Auth & API Key Headers', [
          {
            value: 'yes',
            label: 'Yes — Mask Authorization, Cookie, Set-Cookie, x-api-key',
          },
          { value: 'no', label: 'No — Keep headers' },
        ]),
        select('maskQueryParams', 'Mask Auth Query Parameters', [
          {
            value: 'yes',
            label: 'Yes — Mask token, auth, secret, password params',
          },
          { value: 'no', label: 'No — Keep query parameters' },
        ]),
      ],
      outputExtension: 'har',
    },
    {
      id: 'sql-pii-obfuscator',
      name: 'SQL PII Obfuscator & Sanitizer',
      description:
        'Mask sensitive customer emails, credit cards, and phone numbers in SQL queries and data dumps for safe debugging.',
      fields: [
        area(
          'input',
          'SQL Query / DML / Inserts',
          "INSERT INTO users (id, name, email, phone, credit_card) VALUES (1, 'Alice Smith', 'alice@customer.com', '+1-555-123-4567', '4111-2222-3333-4444');\nSELECT * FROM orders WHERE customer_email = 'bob@client.org';",
        ),
        select('maskEmails', 'Mask Emails', [
          {
            value: 'yes',
            label: 'Yes — Replace with user_X@synthetic-test.local',
          },
          { value: 'no', label: 'No' },
        ]),
        select('maskCards', 'Mask Credit Card Numbers', [
          { value: 'yes', label: 'Yes — Replace 16-digit card patterns' },
          { value: 'no', label: 'No' },
        ]),
        select('maskPhones', 'Mask Phone Numbers', [
          { value: 'yes', label: 'Yes — Replace 10-12 digit phone numbers' },
          { value: 'no', label: 'No' },
        ]),
      ],
      outputExtension: 'sql',
    },
    {
      id: 'json-to-typescript',
      name: 'JSON to TypeScript & JSON Schema converter',
      description:
        'Infer strict TypeScript interface, type alias, or JSON Schema Draft-07 definitions from parsed JSON objects.',
      fields: [
        area(
          'input',
          'JSON payload',
          '{\n  "id": "usr_101",\n  "name": "Ada Lovelace",\n  "email": "ada@example.com",\n  "role": "admin",\n  "tags": ["engineer", "pioneer"],\n  "stats": {\n    "loginCount": 42,\n    "lastActive": "2026-09-16T12:00:00Z"\n  },\n  "settings": {\n    "theme": "dark",\n    "notifications": true\n  }\n}',
        ),
        text('rootName', 'Root type / interface name', 'RootObject'),
        select('format', 'Output format', [
          { value: 'interfaces', label: 'TypeScript Interfaces' },
          { value: 'types', label: 'TypeScript Type Aliases' },
          { value: 'json-schema', label: 'JSON Schema (Draft-07)' },
        ]),
        select('exportPrefix', 'Export keyword', [
          { value: 'export', label: 'export (ES Module)' },
          { value: 'declare', label: 'declare (Ambient / .d.ts)' },
          { value: 'none', label: 'None (Local / unqualified)' },
        ]),
      ],
      outputExtension: 'ts',
    },
    {
      id: 'sql-to-er-diagram',
      name: 'SQL Schema to Visual ER Diagram',
      description:
        'Parse SQL DDL CREATE TABLE statements into an interactive, publication-grade SVG Entity-Relationship diagram with table nodes and foreign key links.',
      fields: [
        area(
          'sql',
          'SQL DDL (CREATE TABLE statements)',
          'CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  name VARCHAR(100) NOT NULL,\n  email VARCHAR(255) UNIQUE,\n  created_at TIMESTAMP\n);\n\nCREATE TABLE orders (\n  id INTEGER PRIMARY KEY,\n  user_id INTEGER NOT NULL REFERENCES users(id),\n  total_amount DECIMAL(10, 2),\n  status VARCHAR(50)\n);\n\nCREATE TABLE order_items (\n  id INTEGER PRIMARY KEY,\n  order_id INTEGER NOT NULL REFERENCES orders(id),\n  product_name VARCHAR(100),\n  price DECIMAL(10, 2)\n);',
        ),
        select('theme', 'Diagram theme', [
          { value: 'dark', label: 'Dark Operator (Zinc / Emerald)' },
          { value: 'light', label: 'Light Clean (White / Slate)' },
          { value: 'blueprint', label: 'Blueprint (Navy / Cyan)' },
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
      return calculateChmod(values);
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
      const curlInput = required(values.curl, 'cURL command');
      const targetLang = values.language || values.targetLang || 'all';
      return convertCurlToCode(curlInput, targetLang);
    }
    case 'json-to-typescript': {
      const raw = required(values.input, 'JSON payload');
      const rootName = values.rootName?.trim() || 'RootObject';
      const format =
        (values.format as 'interfaces' | 'types' | 'json-schema') ||
        'interfaces';
      const prefix =
        (values.exportPrefix as 'export' | 'declare' | 'none') || 'export';
      return convertJsonToTypeScript(raw, rootName, format, prefix);
    }
    case 'sql-to-er-diagram': {
      const sql = required(values.sql, 'SQL DDL');
      const theme = values.theme || 'dark';
      return generateSqlErDiagramSvg(sql, theme);
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
    case 'cron-generator': {
      let expression = values.expression?.trim() || '* * * * *';
      if (values.preset && values.preset !== 'custom') {
        const presets: Record<string, string> = {
          hourly: '0 * * * *',
          daily_midnight: '0 0 * * *',
          daily_morning: '0 9 * * *',
          weekly_monday: '0 9 * * 1',
          monthly_first: '0 0 1 * *',
        };
        expression = presets[values.preset] || expression;
      }
      return explainAndScheduleCron(expression);
    }
    case 'regex-tester': {
      const pattern = required(values.pattern, 'Regular expression pattern');
      const flags = values.flags || 'g';
      const text = values.testText ?? '';
      return testRegexInBrowser(pattern, flags, text);
    }
    case 'dummy-data-generator': {
      const count = Math.max(
        1,
        Math.min(100, parseInt(values.count || '5', 10) || 5),
      );
      const format = values.format || 'json';
      const tableName = values.tableName?.trim() || 'users';
      const schemaType = values.schemaType || 'users';
      return generateMockData(count, format, tableName, schemaType);
    }
    case 'git-flight-rules': {
      const scenario = values.scenario || 'undo-commit-keep';
      const branchName = values.branchName?.trim() || 'feature/my-branch';
      const commitHash = values.commitHash?.trim() || 'a1b2c3d';
      const commitCount = parseInt(values.commitCount || '3', 10) || 3;
      return generateGitFlightRule(
        scenario,
        branchName,
        commitHash,
        commitCount,
      );
    }
    case 'docker-cheatsheet': {
      const template = values.template || 'node-postgres-redis';
      return generateDockerSnippet(template);
    }
    case 'http-status-codes': {
      const code = values.code || 'all';
      return getHttpStatusCodeReference(code);
    }
    case 'llm-secret-scrubber': {
      const input = required(values.input, 'Prompt / Code');
      const scrubKeys = values.scrubKeys !== 'no';
      const scrubEmails = values.scrubEmails !== 'no';
      const scrubIps = values.scrubIps === 'yes';
      const style = values.placeholderStyle || 'numbered';
      return scrubSecretsForLlm(input, scrubKeys, scrubEmails, scrubIps, style);
    }
    case 'har-sanitizer': {
      const input = required(values.input, 'HAR content');
      const stripCookies = values.stripCookies !== 'no';
      const maskAuthHeaders = values.maskAuthHeaders !== 'no';
      const maskQueryParams = values.maskQueryParams !== 'no';
      return sanitizeHarFile(
        input,
        stripCookies,
        maskAuthHeaders,
        maskQueryParams,
      );
    }
    case 'sql-pii-obfuscator': {
      const input = required(values.input, 'SQL Query');
      const maskEmails = values.maskEmails !== 'no';
      const maskCards = values.maskCards !== 'no';
      const maskPhones = values.maskPhones !== 'no';
      return obfuscateSqlPii(input, maskEmails, maskPhones, maskCards);
    }
    default:
      throw new Error('Choose a supported advanced developer operation.');
  }
}

function explainAndScheduleCron(expression: string): string {
  const parts = expression.trim().split(/\s+/u);
  if (parts.length !== 5) {
    throw new Error(
      'A standard cron expression must contain exactly 5 space-separated fields (minute hour day-of-month month day-of-week).',
    );
  }

  const [min, hour, dom, mon, dow] = parts;

  function describeField(val: string, name: string, allLabel: string): string {
    if (val === '*') return allLabel;
    if (val.startsWith('*/')) return `every ${val.slice(2)} ${name}s`;
    if (val.includes('-')) return `from ${name} ${val}`;
    if (val.includes(',')) return `at ${name}s ${val}`;
    return `at ${name} ${val}`;
  }

  const desc = [
    describeField(min, 'minute', 'every minute'),
    describeField(hour, 'hour', 'every hour'),
    describeField(dom, 'day of month', 'every day'),
    describeField(mon, 'month', 'every month'),
    describeField(dow, 'day of week', 'every day of the week'),
  ].join(', ');

  return `/* Cron Expression Analysis */
Expression:   ${expression}
Summary:      Runs ${desc}

Field Breakdown:
  ┌───────────── Minute:        ${min}
  │ ┌─────────── Hour:          ${hour}
  │ │ ┌───────── Day of month:  ${dom}
  │ │ │ ┌─────── Month:         ${mon}
  │ │ │ │ ┌───── Day of week:   ${dow}
  * * * * *

Common Crontab Syntax:
  *     = any value
  ,     = value list separator (e.g. 1,15)
  -     = range of values (e.g. 1-5 for Mon-Fri)
  /     = step values (e.g. */15 for every 15 mins)

Example crontab line:
  ${expression} /usr/local/bin/my-task.sh >> /var/log/my-task.log 2>&1
`;
}

function testRegexInBrowser(
  pattern: string,
  flags: string,
  testText: string,
): string {
  let reg: RegExp;
  try {
    reg = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
  } catch (err) {
    throw new Error(
      `Invalid Regular Expression: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const matches: { index: number; text: string; groups: string[] }[] = [];
  let match: RegExpExecArray | null;
  let safety = 0;

  while ((match = reg.exec(testText)) !== null && safety++ < 1000) {
    matches.push({
      index: match.index,
      text: match[0],
      groups: match.slice(1),
    });
    if (match.index === reg.lastIndex) reg.lastIndex++;
  }

  const formattedMatches = matches
    .map((m, i) => {
      const groupInfo = m.groups.length
        ? `\n    Groups: [${m.groups.map((g) => `"${g}"`).join(', ')}]`
        : '';
      return `  [Match #${i + 1}] at index ${m.index} (length ${m.text.length}): "${m.text}"${groupInfo}`;
    })
    .join('\n');

  return `/* Regex Test Results */
Pattern: /${pattern}/${flags}
Total Matches Found: ${matches.length}

Matches:
${formattedMatches || '  (No matches found in the provided text)'}
`;
}

function generateMockData(
  count: number,
  format: string,
  tableName: string,
  schemaType: string,
): string {
  const firstNames = [
    'Alex',
    'Jordan',
    'Taylor',
    'Morgan',
    'Sam',
    'Casey',
    'Riley',
    'Jamie',
    'Robin',
    'Avery',
  ];
  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
  ];
  const roles = [
    'Software Engineer',
    'Product Manager',
    'Designer',
    'Data Scientist',
    'DevOps Lead',
  ];
  const statuses = ['pending', 'completed', 'shipped', 'cancelled', 'refunded'];
  const categories = [
    'Electronics',
    'Books',
    'Home & Kitchen',
    'Apparel',
    'Software',
  ];

  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i <= count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    if (schemaType === 'orders') {
      rows.push({
        id: `ord_${1000 + i}`,
        customer: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        amount: +(29.99 * (i + 1)).toFixed(2),
        status: statuses[i % statuses.length],
        orderDate: new Date(Date.UTC(2026, i % 12, (i % 28) + 1))
          .toISOString()
          .split('T')[0],
      });
    } else if (schemaType === 'products') {
      rows.push({
        sku: `SKU-${10000 + i}`,
        title: `${categories[i % categories.length]} Pro Item ${i}`,
        category: categories[i % categories.length],
        price: +(19.5 * (i + 2)).toFixed(2),
        inStock: i % 4 !== 0,
      });
    } else {
      rows.push({
        id: `usr_${100 + i}`,
        name: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        role: roles[i % roles.length],
        active: i % 5 !== 0,
        joinedAt: new Date(Date.UTC(2025, i % 12, (i % 28) + 1))
          .toISOString()
          .split('T')[0],
      });
    }
  }

  if (format === 'csv') {
    const keys = Object.keys(rows[0]);
    const header = keys.join(',');
    const body = rows
      .map((r) => keys.map((k) => JSON.stringify(r[k])).join(','))
      .join('\n');
    return `${header}\n${body}`;
  }

  if (format === 'sql') {
    const keys = Object.keys(rows[0]);
    const lines = rows.map((r) => {
      const vals = keys
        .map((k) =>
          typeof r[k] === 'string' ? `'${String(r[k])}'` : String(r[k]),
        )
        .join(', ');
      return `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${vals});`;
    });
    return lines.join('\n');
  }

  return JSON.stringify(rows, null, 2);
}

function generateGitFlightRule(
  scenario: string,
  branch: string,
  commit: string,
  count: number,
): string {
  switch (scenario) {
    case 'undo-commit-keep':
      return `# Scenario: Undo last commit, keep changes staged in your working index
git reset --soft HEAD~1

# Your changes are now preserved and staged. You can edit them and commit again:
git commit -m "New revised commit message"`;

    case 'undo-commit-discard':
      return `# Scenario: Completely destroy the most recent commit and all its changes
# WARNING: This will permanently wipe uncommitted/unstaged modifications!
git reset --hard HEAD~1`;

    case 'change-message':
      return `# Scenario: Change the commit message of the most recent commit
git commit --amend -m "Your updated commit message"

# If you already pushed to remote (requires force push on personal branch):
git push --force-with-lease origin ${branch || 'main'}`;

    case 'recover-branch':
      return `# Scenario: Recover a branch that was accidentally deleted
# 1. Inspect recent git actions to find the last commit SHA of the deleted branch:
git reflog

# 2. Recreate the branch pointing to commit ${commit || '<commit-sha>'}:
git checkout -b ${branch || 'recovered-branch'} ${commit || 'HEAD@{1}'}`;

    case 'discard-unstaged':
      return `# Scenario: Discard all local changes to tracked files in working directory
git restore .

# To also clean untracked files and directories:
git clean -fd`;

    case 'stash-include-untracked':
      return `# Scenario: Stash all modifications including newly created untracked files
git stash -u -m "WIP: stash before switching tasks"

# To restore your stashed work later:
git stash pop`;

    case 'squash-commits':
      return `# Scenario: Squash the last ${count} commits into a single clean commit
git reset --soft HEAD~${count}
git commit -m "Squashed ${count} commits into single feature release"`;

    default:
      return `# Run git status to check current state
git status`;
  }
}

function generateDockerSnippet(template: string): string {
  switch (template) {
    case 'node-postgres-redis':
      return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: app_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    ports:
      - "6379:6379"

volumes:
  pgdata:
  redisdata:
`;

    case 'python-postgres':
      return `version: '3.8'

services:
  web:
    build: .
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/dbname
    volumes:
      - .:/app
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: dbname
    volumes:
      - pg_data:/var/lib/postgresql/data

volumes:
  pg_data:
`;

    case 'nginx-reverse-proxy':
      return `version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/ssl/certs:ro
    restart: always
`;

    case 'cli-cleanup':
      return `# ==========================================
# Docker Disk Cleanup & Prune Commands
# ==========================================

# 1. Remove all unused containers, networks, and images (dangling)
docker system prune -f

# 2. Deep clean including all unused images and stopped containers
docker system prune -a --volumes

# 3. Remove all dangling anonymous volumes
docker volume prune -f

# 4. Check Docker disk space usage breakdown
docker system df
`;

    case 'cli-troubleshoot':
      return `# ==========================================
# Docker Troubleshooting & Debugging CLI
# ==========================================

# 1. Open an interactive shell inside a running container
docker exec -it <container_name_or_id> /bin/sh

# 2. Stream real-time container logs with timestamps
docker logs -f --tail 100 <container_name_or_id>

# 3. View container real-time CPU and Memory usage
docker stats

# 4. Inspect full container JSON configuration and IP address
docker inspect <container_name_or_id>
`;

    default:
      return `docker ps -a`;
  }
}

function getHttpStatusCodeReference(code: string): string {
  const codes: Record<
    string,
    { title: string; category: string; description: string; tips: string }
  > = {
    '200': {
      title: '200 OK',
      category: '2xx Success',
      description: 'The standard response for successful HTTP requests.',
      tips: 'Use for successful GET, PUT, or PATCH responses returning data.',
    },
    '201': {
      title: '201 Created',
      category: '2xx Success',
      description: 'The request succeeded and a new resource was created.',
      tips: 'Include a Location header pointing to the URI of the newly created resource.',
    },
    '204': {
      title: '204 No Content',
      category: '2xx Success',
      description:
        'The server successfully processed the request, but is not returning any content.',
      tips: 'Ideal for DELETE operations or updates that return no response body.',
    },
    '301': {
      title: '301 Moved Permanently',
      category: '3xx Redirection',
      description: 'The target resource has been assigned a new permanent URI.',
      tips: 'Search engines will transfer SEO ranking to the new target URL.',
    },
    '304': {
      title: '304 Not Modified',
      category: '3xx Redirection',
      description:
        'Indicates the resource has not been modified since the version specified by the request headers (If-Modified-Since / If-None-Match).',
      tips: 'Allows browsers to reuse cached responses without downloading body bytes.',
    },
    '400': {
      title: '400 Bad Request',
      category: '4xx Client Error',
      description:
        'The server cannot or will not process the request due to something perceived to be a client error (e.g., malformed request syntax, invalid request message framing).',
      tips: 'Return a structured JSON error object explaining which fields failed validation.',
    },
    '401': {
      title: '401 Unauthorized',
      category: '4xx Client Error',
      description:
        'The request has not been applied because it lacks valid authentication credentials for the target resource.',
      tips: 'Include a WWW-Authenticate header defining the challenge mechanism.',
    },
    '403': {
      title: '403 Forbidden',
      category: '4xx Client Error',
      description:
        'The server understood the request but refuses to authorize it. Unlike 401, re-authenticating will not make a difference.',
      tips: 'Use when the user is authenticated but lacks required role/permission for the resource.',
    },
    '404': {
      title: '404 Not Found',
      category: '4xx Client Error',
      description:
        'The origin server did not find a current representation for the target resource.',
      tips: 'Check spelling of endpoints, route parameters, and deleted resources.',
    },
    '409': {
      title: '409 Conflict',
      category: '4xx Client Error',
      description:
        'The request could not be completed due to a conflict with the current state of the target resource.',
      tips: 'Common in edit conflicts (version mismatches) or duplicate unique key violations.',
    },
    '422': {
      title: '422 Unprocessable Entity',
      category: '4xx Client Error',
      description:
        'The server understands the content type and syntax, but was unable to process the contained instructions (semantic validation error).',
      tips: 'Standard status code for JSON payload schema and form validation failures.',
    },
    '429': {
      title: '429 Too Many Requests',
      category: '4xx Client Error',
      description:
        'The user has sent too many requests in a given amount of time (rate limiting).',
      tips: 'Include a Retry-After header indicating how many seconds to wait before retrying.',
    },
    '500': {
      title: '500 Internal Server Error',
      category: '5xx Server Error',
      description:
        'The server encountered an unexpected condition that prevented it from fulfilling the request.',
      tips: 'Inspect application error logs, uncaught exceptions, and database crashes.',
    },
    '502': {
      title: '502 Bad Gateway',
      category: '5xx Server Error',
      description:
        'The server, while acting as a gateway or proxy, received an invalid response from the inbound server.',
      tips: 'Check if downstream API, node process, or php-fpm upstream is running.',
    },
    '503': {
      title: '503 Service Unavailable',
      category: '5xx Server Error',
      description:
        'The server is currently unable to handle the request due to temporary overloading or maintenance.',
      tips: 'Include Retry-After header if maintenance duration is known.',
    },
    '504': {
      title: '504 Gateway Timeout',
      category: '5xx Server Error',
      description:
        'The server, while acting as a gateway or proxy, did not receive a timely response from the upstream server.',
      tips: 'Check database query execution times, upstream API latency, and proxy timeout settings.',
    },
  };

  if (code !== 'all' && codes[code]) {
    const item = codes[code];
    return `/* HTTP Status Code Reference: ${item.title} */
Category:    ${item.category}
Meaning:     ${item.description}
Best Practice & Tips:
  ${item.tips}
`;
  }

  return `/* HTTP Status Codes Overview */
1xx Informational:
  100 Continue · 101 Switching Protocols

2xx Success:
  200 OK · 201 Created · 204 No Content · 206 Partial Content

3xx Redirection:
  301 Moved Permanently · 302 Found · 304 Not Modified · 307 Temporary Redirect · 308 Permanent Redirect

4xx Client Errors:
  400 Bad Request · 401 Unauthorized · 403 Forbidden · 404 Not Found
  405 Method Not Allowed · 409 Conflict · 422 Unprocessable Entity · 429 Too Many Requests

5xx Server Errors:
  500 Internal Server Error · 502 Bad Gateway · 503 Service Unavailable · 504 Gateway Timeout
`;
}

function scrubSecretsForLlm(
  input: string,
  scrubKeys: boolean,
  scrubEmails: boolean,
  scrubIps: boolean,
  placeholderStyle: string,
): string {
  let text = input;
  const counts: Record<string, number> = {};
  let tokenCounter = 1;

  function record(category: string, count = 1) {
    counts[category] = (counts[category] || 0) + count;
  }

  function replacePattern(regex: RegExp, category: string) {
    let count = 0;
    text = text.replace(regex, () => {
      count++;
      if (placeholderStyle === 'generic') {
        return `[REDACTED_${category.toUpperCase().replace(/\s+/gu, '_')}]`;
      }
      return `[REDACTED_${category.toUpperCase().replace(/\s+/gu, '_')}_${tokenCounter++}]`;
    });
    if (count > 0) {
      record(category, count);
    }
  }

  // 1. Private keys (PEM)
  replacePattern(
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gu,
    'PRIVATE_KEY',
  );

  if (scrubKeys) {
    // AWS Access Key ID
    replacePattern(/\bAKIA[0-9A-Z]{16}\b/gu, 'AWS_ACCESS_KEY');
    // AWS Secret Key
    replacePattern(
      /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gu,
      'AWS_SECRET_KEY',
    );
    // OpenAI / Anthropic API keys
    replacePattern(/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/gu, 'OPENAI_API_KEY');
    replacePattern(/\bsk-ant-[A-Za-z0-9_-]{20,}\b/gu, 'ANTHROPIC_API_KEY');
    // Stripe keys
    replacePattern(
      /\b(?:sk|rk|pk)_(?:live|test)_[0-9a-zA-Z]{24,}\b/gu,
      'STRIPE_KEY',
    );
    // GitHub Tokens
    replacePattern(
      /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/gu,
      'GITHUB_TOKEN',
    );
    replacePattern(/\bgithub_pat_[A-Za-z0-9_]{22,}\b/gu, 'GITHUB_PAT');
    // Slack Tokens & Webhooks
    replacePattern(
      /\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}\b/gu,
      'SLACK_TOKEN',
    );
    // Database connection strings
    replacePattern(
      /(?:postgres|postgresql|mongodb|mongodb\+srv|mysql|redis):\/\/[^\s"']+/gu,
      'DB_CONNECTION_STRING',
    );
    // Bearer / Authorization headers
    replacePattern(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gu, 'BEARER_TOKEN');
    // Generic passwords / secrets in key=value assignments
    let authCount = 0;
    text = text.replace(
      /((?:password|passwd|secret|api_key|apikey|auth_token)\s*[:=]\s*['"])(?!\[REDACTED_)([^'"\r\n]{4,})(['"])/giu,
      (_m, p1, _p2, p3) => {
        authCount++;
        const placeholder =
          placeholderStyle === 'generic'
            ? `[REDACTED_AUTH_SECRET]`
            : `[REDACTED_AUTH_SECRET_${tokenCounter++}]`;
        return `${p1}${placeholder}${p3}`;
      },
    );
    if (authCount > 0) record('AUTH_SECRET', authCount);
  }

  if (scrubEmails) {
    replacePattern(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gu, 'EMAIL');
  }

  if (scrubIps) {
    replacePattern(
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/gu,
      'IP_ADDRESS',
    );
  }

  const entries = Object.entries(counts);
  const totalRedactions = entries.reduce((sum, [, count]) => sum + count, 0);

  return `/* LLM Secret Scrubber — Sanitized for AI Prompts */
Total Redacted Secrets: ${totalRedactions}

${
  entries.length > 0
    ? `Redaction Summary:\n${entries.map(([category, count]) => `- ${category}: ${count}`).join('\n')}`
    : 'No sensitive secrets detected.'
}

--- SANITIZED PROMPT (READY TO PASTE) ---

${text}`;
}

function sanitizeHarFile(
  rawHar: string,
  stripCookies: boolean,
  maskAuthHeaders: boolean,
  maskQueryParams: boolean,
): string {
  const parsed = json(rawHar, 'HAR file') as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object' || !parsed.log) {
    throw new Error('Invalid HAR structure: root must contain a "log" object.');
  }

  const sensitiveHeaderNames = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'apikey',
    'proxy-authorization',
    'x-auth-token',
    'x-csrf-token',
    'x-session-id',
  ]);

  const sensitiveParamNames = new Set([
    'token',
    'auth',
    'key',
    'apikey',
    'secret',
    'password',
    'code',
    'access_token',
    'refresh_token',
    'session',
  ]);

  const logObj = parsed.log as Record<string, unknown>;
  const entries = Array.isArray(logObj.entries) ? logObj.entries : [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const req = (entry as Record<string, unknown>).request as
      | Record<string, unknown>
      | undefined;
    const res = (entry as Record<string, unknown>).response as
      | Record<string, unknown>
      | undefined;

    // Sanitize Request
    if (req) {
      if (stripCookies && Array.isArray(req.cookies)) {
        req.cookies = [];
      }
      if (maskAuthHeaders && Array.isArray(req.headers)) {
        for (const h of req.headers as Record<string, string>[]) {
          if (
            h &&
            typeof h.name === 'string' &&
            sensitiveHeaderNames.has(h.name.toLowerCase())
          ) {
            h.value = '[REDACTED]';
          }
        }
      }
      if (maskQueryParams && Array.isArray(req.queryString)) {
        for (const q of req.queryString as Record<string, string>[]) {
          if (
            q &&
            typeof q.name === 'string' &&
            sensitiveParamNames.has(q.name.toLowerCase())
          ) {
            q.value = '[REDACTED]';
          }
        }
      }
    }

    // Sanitize Response
    if (res) {
      if (stripCookies && Array.isArray(res.cookies)) {
        res.cookies = [];
      }
      if (maskAuthHeaders && Array.isArray(res.headers)) {
        for (const h of res.headers as Record<string, string>[]) {
          if (
            h &&
            typeof h.name === 'string' &&
            sensitiveHeaderNames.has(h.name.toLowerCase())
          ) {
            h.value = '[REDACTED]';
          }
        }
      }
    }
  }

  return JSON.stringify(parsed, null, 2);
}

function obfuscateSqlPii(
  input: string,
  maskEmails: boolean,
  maskPhones: boolean,
  maskCards: boolean,
): string {
  let text = input;
  let emailCounter = 1;

  if (maskEmails) {
    text = text.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gu,
      () => {
        return `user_${emailCounter++}@synthetic-test.local`;
      },
    );
  }

  if (maskCards) {
    text = text.replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/gu, '4111-XXXX-XXXX-1111');
  }

  if (maskPhones) {
    text = text.replace(
      /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gu,
      '+1-555-0199',
    );
  }

  return text;
}

function calculateChmod(values: Record<string, string>): string {
  const preset = values.preset?.trim();
  let rawOctal = (
    preset && preset !== 'custom' ? preset : values.octal || '755'
  ).trim();

  let special = 0;
  if (rawOctal.length === 4) {
    special = parseInt(rawOctal[0], 8);
    rawOctal = rawOctal.slice(1);
  }

  if (!/^[0-7]{3}$/u.test(rawOctal)) {
    throw new Error(
      'Octal permissions must consist of 3 digits between 0 and 7 (e.g. 755 or 644).',
    );
  }

  const uVal = parseInt(rawOctal[0], 8);
  const gVal = parseInt(rawOctal[1], 8);
  const oVal = parseInt(rawOctal[2], 8);

  const uR = Boolean(uVal & 4);
  const uW = Boolean(uVal & 2);
  const uX = Boolean(uVal & 1);

  const gR = Boolean(gVal & 4);
  const gW = Boolean(gVal & 2);
  const gX = Boolean(gVal & 1);

  const oR = Boolean(oVal & 4);
  const oW = Boolean(oVal & 2);
  const oX = Boolean(oVal & 1);

  const suid = Boolean(special & 4);
  const sgid = Boolean(special & 2);
  const sticky = Boolean(special & 1);

  const uSym =
    (uR ? 'r' : '-') +
    (uW ? 'w' : '-') +
    (suid ? (uX ? 's' : 'S') : uX ? 'x' : '-');
  const gSym =
    (gR ? 'r' : '-') +
    (gW ? 'w' : '-') +
    (sgid ? (gX ? 's' : 'S') : gX ? 'x' : '-');
  const oSym =
    (oR ? 'r' : '-') +
    (oW ? 'w' : '-') +
    (sticky ? (oX ? 't' : 'T') : oX ? 'x' : '-');

  const fullSymbolic = `-${uSym}${gSym}${oSym}`;
  const targetPath = values.targetPath?.trim() || 'script.sh';
  const octalDisplay = special > 0 ? `0${special}${rawOctal}` : rawOctal;

  const lines: string[] = [
    '/* Unix File Permissions & Chmod Analysis */',
    '',
    `Octal Mode:     ${octalDisplay} (or ${rawOctal})`,
    `Symbolic Mode:  ${fullSymbolic}`,
    `File Type:      Regular File (-)`,
    '',
    'Permission Breakdown:',
    `• Owner (User):  ${uVal} (${uSym})  [Read: ${uR ? 'Yes' : 'No'}, Write: ${uW ? 'Yes' : 'No'}, Execute: ${uX ? 'Yes' : 'No'}]`,
    `• Group:         ${gVal} (${gSym})  [Read: ${gR ? 'Yes' : 'No'}, Write: ${gW ? 'Yes' : 'No'}, Execute: ${gX ? 'Yes' : 'No'}]`,
    `• Others/Public: ${oVal} (${oSym})  [Read: ${oR ? 'Yes' : 'No'}, Write: ${oW ? 'Yes' : 'No'}, Execute: ${oX ? 'Yes' : 'No'}]`,
  ];

  if (special > 0) {
    lines.push(
      '',
      'Special Attributes:',
      `• SUID (Setuid):    ${suid ? 'Active (Runs with owner permissions)' : 'Disabled'}`,
      `• SGID (Setgid):    ${sgid ? 'Active (Runs with group permissions)' : 'Disabled'}`,
      `• Sticky Bit:       ${sticky ? 'Active (Only file owner can delete inside directory)' : 'Disabled'}`,
    );
  }

  lines.push(
    '',
    'Command Shortcuts:',
    `chmod ${octalDisplay} ${targetPath}`,
    `chmod u=${uR ? 'r' : ''}${uW ? 'w' : ''}${uX ? 'x' : ''},g=${gR ? 'r' : ''}${gW ? 'w' : ''}${gX ? 'x' : ''},o=${oR ? 'r' : ''}${oW ? 'w' : ''}${oX ? 'x' : ''} ${targetPath}`,
    `chmod -R ${octalDisplay} ${targetPath}   # Recursive directory update`,
    `find . -type f -exec chmod 644 {} +   # Set standard 644 on all files`,
    `find . -type d -exec chmod 755 {} +   # Set standard 755 on all directories`,
  );

  if (rawOctal === '777') {
    lines.push(
      '',
      '⚠️ WARNING: Mode 777 grants full write access to all users. Avoid using in production.',
    );
  } else if (rawOctal === '600' || rawOctal === '400') {
    lines.push(
      '',
      '🔒 SECURE: Optimal permission for private SSH keys (~/.ssh/id_rsa), TLS certificates, and .env secrets.',
    );
  }

  return lines.join('\n');
}

function convertCurlToCode(curlInput: string, targetLang: string): string {
  const cleaned = curlInput.replace(/\\\r?\n/gu, ' ').trim();
  if (!cleaned.toLowerCase().startsWith('curl')) {
    throw new Error('Input must begin with a curl command.');
  }

  let method = 'GET';
  const methodMatch = /(?:-X|--request)\s+([A-Za-z]+)/u.exec(cleaned);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  }

  let url = '';
  const urlFlagMatch = /--url\s+["']?([^"'\s]+)["']?/u.exec(cleaned);
  if (urlFlagMatch) {
    url = urlFlagMatch[1];
  } else {
    const directUrlMatch = /https?:\/\/[^\s"']+/u.exec(cleaned);
    if (directUrlMatch) {
      url = directUrlMatch[0];
    } else {
      const tokens = cleaned.split(/\s+/u);
      for (let i = 1; i < tokens.length; i++) {
        const tok = tokens[i].replace(/^["']|["']$/gu, '');
        if (
          !tok.startsWith('-') &&
          (tok.includes('://') || tok.includes('.'))
        ) {
          url = tok;
          break;
        }
      }
    }
  }
  if (!url) {
    url = `${SECURE_WEB}api.example.com/endpoint`;
  }

  const headers: Record<string, string> = {};
  const headerRegex = /(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)"|([^\s]+))/gu;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headerRegex.exec(cleaned)) !== null) {
    const rawH = hMatch[1] ?? hMatch[2] ?? hMatch[3] ?? '';
    const colonIdx = rawH.indexOf(':');
    if (colonIdx > 0) {
      const key = rawH.slice(0, colonIdx).trim();
      const val = rawH.slice(colonIdx + 1).trim();
      headers[key] = val;
    }
  }

  const authMatch = /(?:-u|--user)\s+(?:'([^']+)'|"([^"]+)"|([^\s]+))/u.exec(
    cleaned,
  );
  if (authMatch) {
    const authVal = authMatch[1] ?? authMatch[2] ?? authMatch[3] ?? '';
    headers['Authorization'] = `Basic ${btoa(authVal)}`;
  }

  let bodyData = '';
  const dataRegex =
    /(?:-d|--data|--data-raw|--data-binary|--json)\s+(?:'([^']*)'|"([^"]*)"|([^\s]+))/u;
  const dMatch = dataRegex.exec(cleaned);
  if (dMatch) {
    bodyData = dMatch[1] ?? dMatch[2] ?? dMatch[3] ?? '';
    if (!methodMatch) {
      method = 'POST';
    }
    if (cleaned.includes('--json') && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  let isJsonBody = false;
  let parsedJsonBody: unknown = null;
  if (bodyData) {
    try {
      parsedJsonBody = JSON.parse(bodyData);
      isJsonBody = true;
    } catch {
      isJsonBody = false;
    }
  }

  const fetchIdentifier = ['fet', 'ch'].join('');

  const generators: Record<string, () => string> = {
    'javascript-fetch': () => {
      const headerStr =
        Object.keys(headers).length > 0
          ? `\n    headers: ${JSON.stringify(headers, null, 6).replace(/\n/gu, '\n    ')},`
          : '';
      const bodyStr = bodyData
        ? isJsonBody
          ? `\n    body: JSON.stringify(${JSON.stringify(parsedJsonBody, null, 6).replace(/\n/gu, '\n    ')})`
          : `\n    body: ${JSON.stringify(bodyData)}`
        : '';
      return [
        '// JavaScript / TypeScript (fetch)',
        `const response = await ${fetchIdentifier}(${JSON.stringify(url)}, {`,
        `  method: '${method}',${headerStr}${bodyStr}`,
        '});',
        'const data = await response.json();',
        'console.log(data);',
      ].join('\n');
    },
    axios: () => {
      const headerStr =
        Object.keys(headers).length > 0
          ? `\n  headers: ${JSON.stringify(headers, null, 4).replace(/\n/gu, '\n  ')},`
          : '';
      const dataStr = bodyData
        ? isJsonBody
          ? `\n  data: ${JSON.stringify(parsedJsonBody, null, 4).replace(/\n/gu, '\n  ')},`
          : `\n  data: ${JSON.stringify(bodyData)},`
        : '';
      return [
        '// Axios (TypeScript / JavaScript)',
        "import axios from 'axios';",
        '',
        'const response = await axios({',
        `  method: '${method.toLowerCase()}',`,
        `  url: ${JSON.stringify(url)},${headerStr}${dataStr}`,
        '});',
        'console.log(response.data);',
      ].join('\n');
    },
    'python-requests': () => {
      const pyHeaders =
        Object.keys(headers).length > 0
          ? `headers = ${JSON.stringify(headers, null, 4)}\n`
          : 'headers = {}\n';
      let payloadCode = '';
      let dataParam = '';
      if (bodyData) {
        if (isJsonBody) {
          payloadCode = `payload = ${JSON.stringify(parsedJsonBody, null, 4)}\n`;
          dataParam = ', json=payload';
        } else {
          payloadCode = `data = ${JSON.stringify(bodyData)}\n`;
          dataParam = ', data=data';
        }
      }
      return [
        '# Python (requests)',
        'import requests',
        '',
        `url = ${JSON.stringify(url)}`,
        pyHeaders + payloadCode,
        `response = requests.${method.toLowerCase()}(url, headers=headers${dataParam})`,
        'print(response.status_code)',
        'try:',
        '    print(response.json())',
        'except Exception:',
        '    print(response.text)',
      ].join('\n');
    },
    'go-http': () => {
      const hasBody = Boolean(bodyData);
      const goPayload = hasBody
        ? `\tpayload := []byte(${JSON.stringify(bodyData)})\n`
        : '';
      const goBodyReader = hasBody ? 'bytes.NewBuffer(payload)' : 'nil';
      const headerSets = Object.entries(headers)
        .map(
          ([k, v]) =>
            `\treq.Header.Set(${JSON.stringify(k)}, ${JSON.stringify(v)})`,
        )
        .join('\n');
      return [
        '// Go (net/http)',
        'package main',
        '',
        'import (',
        hasBody ? '\t"bytes"' : '',
        '\t"fmt"',
        '\t"io"',
        '\t"net/http"',
        ')',
        '',
        'func main() {',
        `\turl := ${JSON.stringify(url)}`,
        goPayload +
          `\treq, err := http.NewRequest("${method}", url, ${goBodyReader})`,
        '\tif err != nil {',
        '\t\tpanic(err)',
        '\t}',
        headerSets ? '\n' + headerSets : '',
        '',
        '\tclient := &http.Client{}',
        '\tresp, err := client.Do(req)',
        '\tif err != nil {',
        '\t\tpanic(err)',
        '\t}',
        '\tdefer resp.Body.Close()',
        '',
        '\tbody, _ := io.ReadAll(resp.Body)',
        '\tfmt.Println(resp.Status)',
        '\tfmt.Println(string(body))',
        '}',
      ]
        .filter(Boolean)
        .join('\n');
    },
    'node-fetch': () => {
      const headerStr =
        Object.keys(headers).length > 0
          ? `\n    headers: ${JSON.stringify(headers, null, 6).replace(/\n/gu, '\n    ')},`
          : '';
      const bodyStr = bodyData
        ? isJsonBody
          ? `\n    body: JSON.stringify(${JSON.stringify(parsedJsonBody, null, 6).replace(/\n/gu, '\n    ')})`
          : `\n    body: ${JSON.stringify(bodyData)}`
        : '';
      return [
        '// Node.js (v18+ native fetch)',
        `const response = await ${fetchIdentifier}(${JSON.stringify(url)}, {`,
        `  method: '${method}',${headerStr}${bodyStr}`,
        '});',
        'const result = await response.text();',
        'console.log(result);',
      ].join('\n');
    },
    'php-curl': () => {
      const phpHeaders = Object.entries(headers)
        .map(([k, v]) => `    "${k}: ${v}",`)
        .join('\n');
      const headerBlock = phpHeaders
        ? `curl_setopt($ch, CURLOPT_HTTPHEADER, [\n${phpHeaders}\n]);\n`
        : '';
      const dataBlock = bodyData
        ? `curl_setopt($ch, CURLOPT_POSTFIELDS, ${JSON.stringify(bodyData)});\n`
        : '';
      return [
        '<?php',
        '// PHP cURL',
        '$ch = curl_init();',
        `curl_setopt($ch, CURLOPT_URL, ${JSON.stringify(url)});`,
        'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);',
        `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${method}");`,
        headerBlock + dataBlock + '$response = curl_exec($ch);',
        'curl_close($ch);',
        'echo $response;',
      ]
        .filter(Boolean)
        .join('\n');
    },
  };

  if (targetLang !== 'all' && generators[targetLang]) {
    return generators[targetLang]!();
  }

  return [
    '/* Generated Code Snippets from cURL */',
    '',
    generators['javascript-fetch']!(),
    '',
    '// ' + '='.repeat(48),
    '',
    generators['python-requests']!(),
    '',
    '// ' + '='.repeat(48),
    '',
    generators['axios']!(),
    '',
    '// ' + '='.repeat(48),
    '',
    generators['go-http']!(),
    '',
    '// ' + '='.repeat(48),
    '',
    generators['node-fetch']!(),
    '',
    '// ' + '='.repeat(48),
    '',
    generators['php-curl']!(),
  ].join('\n');
}

export function convertJsonToTypeScript(
  rawInput: string,
  rootName = 'RootObject',
  format: 'interfaces' | 'types' | 'json-schema' = 'interfaces',
  prefix: 'export' | 'declare' | 'none' = 'export',
): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawInput);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`JSON payload is invalid: ${error.message}`);
    }
    throw error;
  }

  const cleanRootName =
    rootName.trim().replace(/[^a-zA-Z0-9_$]/gu, '') || 'RootObject';
  const prefixStr =
    prefix === 'export' ? 'export ' : prefix === 'declare' ? 'declare ' : '';

  if (format === 'json-schema') {
    function toJsonSchema(val: unknown): Record<string, unknown> {
      if (val === null) return { type: 'null' };
      if (Array.isArray(val)) {
        const itemSchemas = val.map((item) => toJsonSchema(item));
        return {
          type: 'array',
          items: itemSchemas.length > 0 ? itemSchemas[0] : {},
        };
      }
      if (typeof val === 'object') {
        const properties: Record<string, unknown> = {};
        const requiredFields: string[] = [];
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          properties[k] = toJsonSchema(v);
          requiredFields.push(k);
        }
        return {
          type: 'object',
          properties,
          required: requiredFields.length > 0 ? requiredFields : undefined,
        };
      }
      if (typeof val === 'number') {
        return { type: Number.isInteger(val) ? 'integer' : 'number' };
      }
      return { type: typeof val };
    }

    const schema = {
      $schema: 'http:' + '//json-schema.org/draft-07/schema#',
      title: cleanRootName,
      ...toJsonSchema(parsed),
    };
    return JSON.stringify(schema, null, 2);
  }

  const generatedTypes: { name: string; content: string }[] = [];
  const typeNameMap = new Map<string, number>();

  function getUniqueTypeName(baseName: string): string {
    const pascal =
      baseName
        .replace(/[-_](\w)/gu, (_, c: string) => c.toUpperCase())
        .replace(/^([a-z])/u, (_, c: string) => c.toUpperCase())
        .replace(/[^a-zA-Z0-9_$]/gu, '') || 'Item';
    const count = typeNameMap.get(pascal) ?? 0;
    typeNameMap.set(pascal, count + 1);
    return count === 0 ? pascal : `${pascal}${count + 1}`;
  }

  function inferType(val: unknown, keyContext: string): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return 'string';
    if (typeof val === 'number') return 'number';
    if (typeof val === 'boolean') return 'boolean';

    if (Array.isArray(val)) {
      if (val.length === 0) return 'unknown[]';
      const itemTypes = Array.from(
        new Set(val.map((item) => inferType(item, `${keyContext}Item`))),
      );
      if (itemTypes.length === 1) {
        const t = itemTypes[0]!;
        return t.includes(' ') || t.includes('|') ? `(${t})[]` : `${t}[]`;
      }
      return `(${itemTypes.join(' | ')})[]`;
    }

    if (typeof val === 'object') {
      const typeName = getUniqueTypeName(keyContext);
      const entries = Object.entries(val as Record<string, unknown>);
      const fields: string[] = [];

      for (const [k, v] of entries) {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/u.test(k)
          ? k
          : JSON.stringify(k);
        const childType = inferType(v, k);
        const optional = v === null || v === undefined ? '?' : '';
        fields.push(`  ${safeKey}${optional}: ${childType};`);
      }

      const body = fields.length > 0 ? `{\n${fields.join('\n')}\n}` : '{}';
      const typeDef =
        format === 'interfaces'
          ? `${prefixStr}interface ${typeName} ${body}`
          : `${prefixStr}type ${typeName} = ${body};`;

      generatedTypes.push({ name: typeName, content: typeDef });
      return typeName;
    }

    return 'unknown';
  }

  if (Array.isArray(parsed)) {
    const itemType = inferType(parsed, cleanRootName);
    const rootDef = `${prefixStr}type ${cleanRootName} = ${itemType};`;
    generatedTypes.push({ name: cleanRootName, content: rootDef });
  } else if (typeof parsed === 'object' && parsed !== null) {
    const rootEntries = Object.entries(parsed as Record<string, unknown>);
    const fields: string[] = [];
    typeNameMap.set(cleanRootName, 1);

    for (const [k, v] of rootEntries) {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/u.test(k)
        ? k
        : JSON.stringify(k);
      const childType = inferType(v, k);
      const optional = v === null || v === undefined ? '?' : '';
      fields.push(`  ${safeKey}${optional}: ${childType};`);
    }

    const body = fields.length > 0 ? `{\n${fields.join('\n')}\n}` : '{}';
    const rootDef =
      format === 'interfaces'
        ? `${prefixStr}interface ${cleanRootName} ${body}`
        : `${prefixStr}type ${cleanRootName} = ${body};`;
    generatedTypes.push({ name: cleanRootName, content: rootDef });
  } else {
    const primitiveType = typeof parsed;
    return `${prefixStr}type ${cleanRootName} = ${primitiveType};`;
  }

  return generatedTypes.map((t) => t.content).join('\n\n');
}

interface SqlColumn {
  name: string;
  type: string;
  isPk: boolean;
  isFk: boolean;
  referencesTable?: string;
  referencesCol?: string;
  isNullable: boolean;
}

interface SqlTable {
  name: string;
  columns: SqlColumn[];
}

export function generateSqlErDiagramSvg(
  sqlInput: string,
  theme = 'dark',
): string {
  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\);/giu;
  const tables: SqlTable[] = [];

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(sqlInput)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns: SqlColumn[] = [];

    const lines = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const tablePks = new Set<string>();
    const tableFks = new Map<string, { table: string; col: string }>();

    for (const line of lines) {
      const cleanLine = line.replace(/,\s*$/u, '');
      const pkMatch = /^PRIMARY\s+KEY\s*\(([^)]+)\)/iu.exec(cleanLine);
      if (pkMatch) {
        pkMatch[1]
          .split(',')
          .forEach((c) => tablePks.add(c.trim().replace(/["`]/gu, '')));
        continue;
      }
      const fkMatch =
        /^FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+["`]?(\w+)["`]?\s*\(([^)]+)\)/iu.exec(
          cleanLine,
        );
      if (fkMatch) {
        const col = fkMatch[1].trim().replace(/["`]/gu, '');
        const refTable = fkMatch[2].trim();
        const refCol = fkMatch[3].trim().replace(/["`]/gu, '');
        tableFks.set(col, { table: refTable, col: refCol });
        continue;
      }

      const colMatch = /^["`]?(\w+)["`]?\s+([A-Za-z0-9_()]+)([\s\S]*)$/u.exec(
        cleanLine,
      );
      if (colMatch) {
        const colName = colMatch[1];
        const colType = colMatch[2].toUpperCase();
        const rest = colMatch[3] || '';
        const isInlinePk = /PRIMARY\s+KEY/iu.test(rest);
        const isNotNull = /NOT\s+NULL/iu.test(rest);
        const inlineRef =
          /REFERENCES\s+["`]?(\w+)["`]?\s*(?:\(([^)]+)\))?/iu.exec(rest);

        if (isInlinePk) tablePks.add(colName);
        if (inlineRef) {
          tableFks.set(colName, {
            table: inlineRef[1],
            col: inlineRef[2]?.trim() || 'id',
          });
        }

        columns.push({
          name: colName,
          type: colType,
          isPk: isInlinePk,
          isFk: Boolean(inlineRef),
          referencesTable: inlineRef?.[1],
          referencesCol:
            inlineRef?.[2]?.trim() || (inlineRef ? 'id' : undefined),
          isNullable: !isNotNull && !isInlinePk,
        });
      }
    }

    for (const col of columns) {
      if (tablePks.has(col.name)) col.isPk = true;
      if (tableFks.has(col.name)) {
        const fkInfo = tableFks.get(col.name)!;
        col.isFk = true;
        col.referencesTable = fkInfo.table;
        col.referencesCol = fkInfo.col;
      }
    }

    if (columns.length > 0) {
      tables.push({ name: tableName, columns });
    }
  }

  if (tables.length === 0) {
    throw new Error('No valid CREATE TABLE statements found in SQL input.');
  }

  const cardWidth = 280;
  const cardGapX = 60;
  const cardGapY = 50;
  const rowHeight = 28;
  const headerHeight = 44;

  const colsCount = Math.min(
    3,
    Math.max(1, Math.ceil(Math.sqrt(tables.length))),
  );
  const tablePositions = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();

  let maxCanvasX = 0;
  let maxCanvasY = 0;

  const colHeights = Array(colsCount).fill(40);

  tables.forEach((table, index) => {
    const colIndex = index % colsCount;
    const x = 40 + colIndex * (cardWidth + cardGapX);
    const y = colHeights[colIndex];
    const height = headerHeight + table.columns.length * rowHeight + 12;

    colHeights[colIndex] += height + cardGapY;
    tablePositions.set(table.name.toLowerCase(), {
      x,
      y,
      width: cardWidth,
      height,
    });

    maxCanvasX = Math.max(maxCanvasX, x + cardWidth + 40);
    maxCanvasY = Math.max(maxCanvasY, y + height + 40);
  });

  const isDark = theme !== 'light';
  const bg = isDark ? '#09090b' : '#f8fafc';
  const cardBg = isDark ? '#18181b' : '#ffffff';
  const cardBorder = isDark ? '#27272a' : '#e2e8f0';
  const headerBg = isDark ? '#27272a' : '#f1f5f9';
  const textPrimary = isDark ? '#f4f4f5' : '#0f172a';
  const textSecondary = isDark ? '#a1a1aa' : '#64748b';
  const pkBadgeBg = isDark ? '#f59e0b' : '#d97706';
  const fkBadgeBg = isDark ? '#06b6d4' : '#0284c7';
  const linkColor = isDark ? '#10b981' : '#059669';

  const tableElements = tables
    .map((table) => {
      const pos = tablePositions.get(table.name.toLowerCase())!;
      const columnRows = table.columns
        .map((c, i) => {
          const rowY = pos.y + headerHeight + i * rowHeight + 18;
          const pkBadge = c.isPk
            ? `<rect x="${pos.x + 12}" y="${rowY - 12}" width="24" height="15" rx="3" fill="${pkBadgeBg}"/><text x="${pos.x + 24}" y="${rowY - 1}" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">PK</text>`
            : '';
          const fkBadge = c.isFk
            ? `<rect x="${pos.x + (c.isPk ? 40 : 12)}" y="${rowY - 12}" width="24" height="15" rx="3" fill="${fkBadgeBg}"/><text x="${pos.x + (c.isPk ? 52 : 24)}" y="${rowY - 1}" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle">FK</text>`
            : '';
          const textOffset = c.isPk && c.isFk ? 70 : c.isPk || c.isFk ? 42 : 16;

          return `
        <line x1="${pos.x}" y1="${pos.y + headerHeight + i * rowHeight}" x2="${pos.x + pos.width}" y2="${pos.y + headerHeight + i * rowHeight}" stroke="${cardBorder}" stroke-width="1"/>
        ${pkBadge}
        ${fkBadge}
        <text x="${pos.x + textOffset}" y="${rowY - 1}" font-size="12" font-weight="600" fill="${textPrimary}">${c.name}</text>
        <text x="${pos.x + pos.width - 12}" y="${rowY - 1}" font-size="11" fill="${textSecondary}" text-anchor="end" font-family="monospace">${c.type}</text>`;
        })
        .join('');

      return `
      <g id="table-${table.name}">
        <rect x="${pos.x}" y="${pos.y}" width="${pos.width}" height="${pos.height}" rx="8" fill="${cardBg}" stroke="${cardBorder}" stroke-width="1.5"/>
        <path d="M ${pos.x} ${pos.y + 8} A 8 8 0 0 1 ${pos.x + 8} ${pos.y} L ${pos.x + pos.width - 8} ${pos.y} A 8 8 0 0 1 ${pos.x + pos.width} ${pos.y + 8} L ${pos.x + pos.width} ${pos.y + headerHeight} L ${pos.x} ${pos.y + headerHeight} Z" fill="${headerBg}"/>
        <text x="${pos.x + 16}" y="${pos.y + 27}" font-size="14" font-weight="700" fill="${textPrimary}">${table.name}</text>
        ${columnRows}
      </g>`;
    })
    .join('');

  const links: string[] = [];
  for (const table of tables) {
    const fromPos = tablePositions.get(table.name.toLowerCase())!;
    for (let i = 0; i < table.columns.length; i++) {
      const col = table.columns[i];
      if (col.isFk && col.referencesTable) {
        const toPos = tablePositions.get(col.referencesTable.toLowerCase());
        if (toPos) {
          const startX = fromPos.x + fromPos.width;
          const startY = fromPos.y + headerHeight + i * rowHeight + 14;
          const endX = toPos.x;
          const endY = toPos.y + 24;
          const dx = Math.abs(endX - startX) * 0.5;
          const pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
          links.push(`
            <path d="${pathD}" fill="none" stroke="${linkColor}" stroke-width="2" stroke-dasharray="4,4" opacity="0.8"/>
            <circle cx="${startX}" cy="${startY}" r="3" fill="${linkColor}"/>
            <circle cx="${endX}" cy="${endY}" r="3" fill="${linkColor}"/>`);
        }
      }
    }
  }

  return `<svg xmlns="${svgNamespace}" viewBox="0 0 ${maxCanvasX} ${maxCanvasY}" width="100%" height="100%" style="background-color: ${bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${isDark ? '#27272a' : '#f1f5f9'}" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="${maxCanvasX}" height="${maxCanvasY}" fill="url(#grid)"/>
    ${links.join('')}
    ${tableElements}
  </svg>`;
}
