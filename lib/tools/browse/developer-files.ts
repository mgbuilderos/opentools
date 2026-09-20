// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'encodings-tokens-hashes',
    title: 'Encodings, Tokens & Hashes',
    description: 'Base64, UUID v4, and Unix timestamps.',
    destinations: [
      {
        id: 'base64-encode',
        name: 'Base64 encoder',
        description: 'Encode Unicode text as standard Base64 in this tab.',
        href: '/developer/base64-encoder',
        workspaceId: 'base64-encode',
      },
      {
        id: 'base64-decode',
        name: 'Base64 decoder',
        description: 'Decode standard Base64 into validated UTF-8 text.',
        href: '/developer/base64-decoder',
        workspaceId: 'base64-decode',
      },
      {
        id: 'uuid-generator',
        name: 'UUID generator',
        description: 'Generate cryptographically random UUID v4 values.',
        href: '/developer/uuid-generator',
        workspaceId: 'uuid-generator',
      },
      {
        id: 'unix-timestamp',
        name: 'Unix timestamp converter',
        description: 'Convert Unix seconds, milliseconds, and ISO dates.',
        href: '/developer/unix-timestamp',
        workspaceId: 'unix-timestamp',
      },
    ],
  },
  {
    id: 'engineering-workbenches',
    title: 'Engineering Workbenches',
    description: 'Type generators, regex, token parsers, and converters.',
    destinations: [
      {
        id: 'developer-data-workbench:url-encode-component',
        name: 'URL component encoder',
        description: 'Percent-encode one query value or path segment.',
        href: '/developer/workbench?tool=url-encode-component',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:url-decode-component',
        name: 'URL component decoder',
        description:
          'Decode one percent-encoded component; plus signs stay plus.',
        href: '/developer/workbench?tool=url-decode-component',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:url-encode',
        name: 'Full URL encoder',
        description:
          'Encode unsafe characters while preserving URL separators.',
        href: '/developer/workbench?tool=url-encode',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:url-decode',
        name: 'Full URL decoder',
        description: 'Decode percent escapes in a complete URL string.',
        href: '/developer/workbench?tool=url-decode',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:html-entity-encode',
        name: 'HTML entity encoder',
        description:
          'Escape ampersands, angle brackets, quotes, and apostrophes.',
        href: '/developer/workbench?tool=html-entity-encode',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:html-entity-decode',
        name: 'HTML entity decoder',
        description:
          'Decode the five core named entities and numeric entities.',
        href: '/developer/workbench?tool=html-entity-decode',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:base64-encode-text',
        name: 'Base64 text encoder',
        description: 'Encode UTF-8 text as padded standard Base64.',
        href: '/developer/workbench?tool=base64-encode-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:base64-decode-text',
        name: 'Base64 text decoder',
        description: 'Decode padded standard Base64 and validate UTF-8.',
        href: '/developer/workbench?tool=base64-decode-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:base64url-encode-text',
        name: 'Base64URL text encoder',
        description: 'Encode UTF-8 text with URL-safe Base64 and no padding.',
        href: '/developer/workbench?tool=base64url-encode-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:base64url-decode-text',
        name: 'Base64URL text decoder',
        description: 'Decode URL-safe Base64 text and validate UTF-8.',
        href: '/developer/workbench?tool=base64url-decode-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:jwt-inspector',
        name: 'JWT inspector',
        description:
          'Decode the header and payload locally without trusting them.',
        href: '/developer/workbench?tool=jwt-inspector',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:json-format',
        name: 'JSON formatter',
        description: 'Validate JSON and format it with two-space indentation.',
        href: '/developer/workbench?tool=json-format',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:json-minify',
        name: 'JSON minifier',
        description: 'Validate JSON and remove insignificant whitespace.',
        href: '/developer/workbench?tool=json-minify',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:json-sort-keys',
        name: 'JSON key sorter',
        description:
          'Recursively sort object keys while preserving array order.',
        href: '/developer/workbench?tool=json-sort-keys',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:json-to-csv',
        name: 'JSON to CSV',
        description:
          'Convert an array of flat JSON objects into quoted-safe CSV.',
        href: '/developer/workbench?tool=json-to-csv',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:csv-to-json',
        name: 'CSV to JSON',
        description: 'Parse strict header-based CSV, including quoted fields.',
        href: '/developer/workbench?tool=csv-to-json',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:query-string-parser',
        name: 'Query-string parser',
        description:
          'Turn a query string into JSON; repeated keys become arrays.',
        href: '/developer/workbench?tool=query-string-parser',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:query-string-builder',
        name: 'Query-string builder',
        description:
          'Build a query string from a JSON object of scalar or array values.',
        href: '/developer/workbench?tool=query-string-builder',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:url-parser',
        name: 'URL parser',
        description: 'Inspect the standard components of an absolute URL.',
        href: '/developer/workbench?tool=url-parser',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:url-origin-extractor',
        name: 'URL origin extractor',
        description:
          'Return the protocol, hostname, and effective port origin.',
        href: '/developer/workbench?tool=url-origin-extractor',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:url-path-segments',
        name: 'URL path segments',
        description: 'Decode and list each non-empty pathname segment.',
        href: '/developer/workbench?tool=url-path-segments',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:url-normalizer',
        name: 'URL normalizer',
        description:
          'Apply the browser URL parser without sorting query parameters.',
        href: '/developer/workbench?tool=url-normalizer',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:query-parameter-set',
        name: 'Set query parameter',
        description: 'Set or replace one query parameter on an absolute URL.',
        href: '/developer/workbench?tool=query-parameter-set',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:query-parameter-remove',
        name: 'Remove query parameter',
        description:
          'Remove every instance of one parameter from an absolute URL.',
        href: '/developer/workbench?tool=query-parameter-remove',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:regex-tester',
        name: 'Regular-expression tester',
        description:
          'List bounded JavaScript regex matches and capture groups.',
        href: '/developer/workbench?tool=regex-tester',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:regex-extractor',
        name: 'Regex extractor',
        description: 'Extract one capture group from up to 200 matches.',
        href: '/developer/workbench?tool=regex-extractor',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:regex-replacer',
        name: 'Regex replacer',
        description:
          'Replace text with JavaScript replacement tokens such as $& and $1.',
        href: '/developer/workbench?tool=regex-replacer',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:json-string-escape',
        name: 'JSON string escaper',
        description: 'Escape text for the inside of a JSON string literal.',
        href: '/developer/workbench?tool=json-string-escape',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:json-string-unescape',
        name: 'JSON string unescaper',
        description: 'Decode JSON string escapes without evaluating code.',
        href: '/developer/workbench?tool=json-string-unescape',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:unicode-code-points',
        name: 'Unicode code-point inspector',
        description: 'List Unicode scalar values by user-perceived character.',
        href: '/developer/workbench?tool=unicode-code-points',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:code-points-to-text',
        name: 'Code points to text',
        description: 'Create text from hexadecimal Unicode scalar values.',
        href: '/developer/workbench?tool=code-points-to-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:utf8-byte-encoder',
        name: 'UTF-8 byte encoder',
        description: 'Show UTF-8 bytes as space-separated decimal values.',
        href: '/developer/workbench?tool=utf8-byte-encoder',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:utf8-byte-decoder',
        name: 'UTF-8 byte decoder',
        description: 'Decode decimal bytes with strict UTF-8 validation.',
        href: '/developer/workbench?tool=utf8-byte-decoder',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:byte-counter',
        name: 'UTF-8 byte counter',
        description:
          'Count Unicode characters, UTF-16 code units, and UTF-8 bytes.',
        href: '/developer/workbench?tool=byte-counter',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:hex-encode-text',
        name: 'Text to hexadecimal',
        description: 'Encode UTF-8 bytes as lowercase hexadecimal.',
        href: '/developer/workbench?tool=hex-encode-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:hex-decode-text',
        name: 'Hexadecimal to text',
        description:
          'Decode even-length hexadecimal with strict UTF-8 validation.',
        href: '/developer/workbench?tool=hex-decode-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:binary-encode-text',
        name: 'Text to binary bytes',
        description: 'Encode UTF-8 bytes as eight-bit binary groups.',
        href: '/developer/workbench?tool=binary-encode-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:binary-decode-text',
        name: 'Binary bytes to text',
        description:
          'Decode eight-bit binary groups with strict UTF-8 validation.',
        href: '/developer/workbench?tool=binary-decode-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:sha-256-text',
        name: 'SHA-256 text hash',
        description:
          'Hash UTF-8 text with the browser Web Crypto implementation.',
        href: '/developer/workbench?tool=sha-256-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:sha-384-text',
        name: 'SHA-384 text hash',
        description:
          'Hash UTF-8 text with the browser Web Crypto implementation.',
        href: '/developer/workbench?tool=sha-384-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:sha-512-text',
        name: 'SHA-512 text hash',
        description:
          'Hash UTF-8 text with the browser Web Crypto implementation.',
        href: '/developer/workbench?tool=sha-512-text',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:hex-to-rgb',
        name: 'HEX to RGB',
        description:
          'Convert 3, 4, 6, or 8 digit CSS hexadecimal colors to RGBA.',
        href: '/developer/workbench?tool=hex-to-rgb',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:rgb-to-hex',
        name: 'RGB to HEX',
        description:
          'Convert integer RGB channels and optional alpha to CSS hexadecimal.',
        href: '/developer/workbench?tool=rgb-to-hex',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:hex-to-hsl',
        name: 'HEX to HSL',
        description: 'Convert a CSS hexadecimal color to rounded HSL values.',
        href: '/developer/workbench?tool=hex-to-hsl',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-data-workbench:hsl-to-hex',
        name: 'HSL to HEX',
        description:
          'Convert hue, saturation, lightness, and optional alpha to HEX.',
        href: '/developer/workbench?tool=hsl-to-hex',
        workspaceId: 'developer-data-workbench',
      },
      {
        id: 'developer-advanced-workbench:json-editor',
        name: 'JSON editor',
        description:
          'Validate and normalize edited JSON with two-space indentation.',
        href: '/developer/advanced?tool=json-editor',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:json-diff',
        name: 'JSON diff',
        description: 'Compare two parsed JSON values and list changed paths.',
        href: '/developer/advanced?tool=json-diff',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:json-path-tester',
        name: 'JSON path tester',
        description:
          'Resolve a bounded JSON path using property and array-index notation.',
        href: '/developer/advanced?tool=json-path-tester',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:jwt-decoder',
        name: 'JWT decoder & inspector',
        description:
          'Decode and inspect compact JWT header, payload, signature presence, and time claims without verification.',
        href: '/developer/advanced?tool=jwt-decoder',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:regex-explainer',
        name: 'Regex explainer',
        description:
          'Validate a JavaScript regular expression and annotate its common tokens in source order.',
        href: '/developer/advanced?tool=regex-explainer',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:ulid-generator',
        name: 'ULID generator',
        description:
          'Generate one Crockford Base32 ULID from the current time and secure randomness.',
        href: '/developer/advanced?tool=ulid-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:nano-id-generator',
        name: 'Nano ID generator',
        description:
          'Generate URL-safe random identifiers using browser cryptographic randomness.',
        href: '/developer/advanced?tool=nano-id-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:random-token-generator',
        name: 'Random token generator',
        description:
          'Generate cryptographically random bytes as hexadecimal or Base64URL.',
        href: '/developer/advanced?tool=random-token-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:password-generator',
        name: 'Password generator',
        description:
          'Generate passwords with secure randomness and an explicit character preset.',
        href: '/developer/advanced?tool=password-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:hmac-generator',
        name: 'HMAC generator',
        description:
          'Calculate a keyed HMAC for UTF-8 text through Web Crypto.',
        href: '/developer/advanced?tool=hmac-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:checksum-calculator',
        name: 'Text checksum calculator',
        description: 'Calculate a SHA checksum for pasted UTF-8 text.',
        href: '/developer/advanced?tool=checksum-calculator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:cron-expression-parser',
        name: 'Cron expression parser',
        description:
          'Validate and explain the five fields of a standard five-part cron expression.',
        href: '/developer/advanced?tool=cron-expression-parser',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:cron-expression-builder',
        name: 'Cron expression builder',
        description:
          'Build a validated five-field cron expression from explicit fields.',
        href: '/developer/advanced?tool=cron-expression-builder',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:epoch-calculator',
        name: 'Epoch calculator',
        description:
          'Convert ISO date-time, Unix seconds, or Unix milliseconds.',
        href: '/developer/advanced?tool=epoch-calculator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:number-base-converter',
        name: 'Number-base converter',
        description:
          'Convert signed integers between bases 2 through 36 with BigInt precision.',
        href: '/developer/advanced?tool=number-base-converter',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:binary-calculator',
        name: 'Binary calculator',
        description:
          'Add, subtract, multiply, divide, or take the remainder of binary integers.',
        href: '/developer/advanced?tool=binary-calculator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:bitwise-calculator',
        name: 'Bitwise calculator',
        description: 'Apply AND, OR, XOR, shift, or NOT to BigInt integers.',
        href: '/developer/advanced?tool=bitwise-calculator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:ip-address-converter',
        name: 'IPv4 address converter',
        description:
          'Convert an IPv4 dotted address to unsigned decimal, hexadecimal, and binary.',
        href: '/developer/advanced?tool=ip-address-converter',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:ipv4-subnet-calculator',
        name: 'IPv4 subnet calculator',
        description:
          'Calculate network, broadcast, mask, usable range, and host capacity.',
        href: '/developer/advanced?tool=ipv4-subnet-calculator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:cidr-calculator',
        name: 'CIDR calculator',
        description:
          'Parse an IPv4 CIDR block and calculate its exact address range.',
        href: '/developer/advanced?tool=cidr-calculator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:ipv6-subnet-calculator',
        name: 'IPv6 subnet calculator',
        description:
          'Parse an IPv6 address and calculate the normalized network and final address for a prefix.',
        href: '/developer/advanced?tool=ipv6-subnet-calculator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:http-header-parser',
        name: 'HTTP header parser',
        description:
          'Parse header lines into a case-normalized JSON object without making a request.',
        href: '/developer/advanced?tool=http-header-parser',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:cookie-parser',
        name: 'Cookie parser',
        description:
          'Parse a Cookie request header into decoded name/value pairs.',
        href: '/developer/advanced?tool=cookie-parser',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:ini-viewer',
        name: 'INI viewer',
        description:
          'Parse a bounded INI subset into a section-preserving JSON object.',
        href: '/developer/advanced?tool=ini-viewer',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:user-agent-parser',
        name: 'User-agent parser',
        description:
          'Identify common browser engine, operating-system family, and mobile hints.',
        href: '/developer/advanced?tool=user-agent-parser',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:sql-parameter-binder',
        name: 'SQL parameter preview',
        description:
          'Replace positional ? markers with safely quoted display literals from a JSON array.',
        href: '/developer/advanced?tool=sql-parameter-binder',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:sql-formatter',
        name: 'SQL formatter',
        description:
          'Format a bounded SQL statement using quote- and comment-aware tokenization.',
        href: '/developer/advanced?tool=sql-formatter',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:sql-minifier',
        name: 'SQL minifier',
        description:
          'Remove comments and unnecessary whitespace with quote-aware SQL tokenization.',
        href: '/developer/advanced?tool=sql-minifier',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:graphql-formatter',
        name: 'GraphQL formatter',
        description:
          'Indent a bounded GraphQL document with string- and comment-aware lexical formatting.',
        href: '/developer/advanced?tool=graphql-formatter',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:graphql-variable-builder',
        name: 'GraphQL variable builder',
        description:
          'Validate that GraphQL variables are a JSON object and format them.',
        href: '/developer/advanced?tool=graphql-variable-builder',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:gitignore-generator',
        name: '.gitignore generator',
        description:
          'Generate ignore rules from reviewed built-in ecosystem presets.',
        href: '/developer/advanced?tool=gitignore-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:dockerignore-generator',
        name: '.dockerignore generator',
        description:
          'Generate a conservative Docker build-context ignore file.',
        href: '/developer/advanced?tool=dockerignore-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:editorconfig-generator',
        name: 'EditorConfig generator',
        description:
          'Build a root EditorConfig with explicit indentation and line-ending choices.',
        href: '/developer/advanced?tool=editorconfig-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:package-json-inspector',
        name: 'package.json inspector',
        description:
          'Inspect package identity, module type, scripts, dependencies, and engines.',
        href: '/developer/advanced?tool=package-json-inspector',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:semantic-version-calculator',
        name: 'Semantic-version calculator',
        description:
          'Validate a SemVer core version and calculate its next major, minor, or patch.',
        href: '/developer/advanced?tool=semantic-version-calculator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:chmod-calculator',
        name: 'Unix chmod & permissions calculator',
        description:
          'Calculate POSIX file permissions, convert octal to symbolic modes, and generate exact chmod commands.',
        href: '/developer/advanced?tool=chmod-calculator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:escape-sequence-viewer',
        name: 'Escape-sequence viewer',
        description:
          'List JavaScript-style control, quote, slash, and Unicode escapes without evaluating code.',
        href: '/developer/advanced?tool=escape-sequence-viewer',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:webhook-payload-tester',
        name: 'Webhook payload inspector',
        description:
          'Validate a pasted JSON payload and summarize its local structure.',
        href: '/developer/advanced?tool=webhook-payload-tester',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:openapi-viewer',
        name: 'OpenAPI viewer',
        description:
          'Inspect a JSON OpenAPI document and list declared HTTP operations.',
        href: '/developer/advanced?tool=openapi-viewer',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:openapi-example-generator',
        name: 'OpenAPI example generator',
        description:
          'Generate one JSON example from a bounded object schema subset.',
        href: '/developer/advanced?tool=openapi-example-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:curl-to-code',
        name: 'cURL to code converter',
        description:
          'Convert a cURL command line into idiomatic JavaScript fetch, Axios, Python requests, Go, Node.js, and PHP code.',
        href: '/developer/advanced?tool=curl-to-code',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:svg-cleaner',
        name: 'SVG cleaner & optimizer',
        description:
          'Remove XML declarations, comments, editor metadata, and redundant whitespace from SVG markup.',
        href: '/developer/advanced?tool=svg-cleaner',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:cron-generator',
        name: 'Cron expression generator & translator',
        description:
          'Parse, build, and translate 5-field crontab schedules into plain English with next run estimates.',
        href: '/developer/advanced?tool=cron-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:regex-tester',
        name: 'Regular expression tester & inspector',
        description:
          'Test and analyze regular expressions with live match highlighting, capture group extraction, and flags.',
        href: '/developer/advanced?tool=regex-tester',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:dummy-data-generator',
        name: 'Mock & dummy data generator',
        description:
          'Generate structured realistic mock dataset records for testing databases and APIs in JSON, CSV, or SQL.',
        href: '/developer/advanced?tool=dummy-data-generator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:git-flight-rules',
        name: 'Git emergency scenarios ("Flight Rules")',
        description:
          'Quick copy-paste solutions for common Git mistakes, branch recovery, and commit operations.',
        href: '/developer/advanced?tool=git-flight-rules',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:docker-cheatsheet',
        name: 'Docker & Compose generator & cheatsheet',
        description:
          'Generate multi-container docker-compose.yml templates and essential container management CLI commands.',
        href: '/developer/advanced?tool=docker-cheatsheet',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:http-status-codes',
        name: 'HTTP status codes reference',
        description:
          'Searchable encyclopedia of 1xx–5xx HTTP response status codes with RFC definitions and API guidance.',
        href: '/developer/advanced?tool=http-status-codes',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:llm-secret-scrubber',
        name: 'LLM Secret & API Key Scrubber',
        description:
          'Redact API keys, AWS credentials, tokens, connection strings, emails, and passwords before pasting prompts into ChatGPT or Claude.',
        href: '/developer/advanced?tool=llm-secret-scrubber',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:har-sanitizer',
        name: 'HAR (HTTP Archive) Sanitizer',
        description:
          'Sanitize .har network capture files by stripping cookies, authorization headers, and sensitive query tokens before sharing.',
        href: '/developer/advanced?tool=har-sanitizer',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:sql-pii-obfuscator',
        name: 'SQL PII Obfuscator & Sanitizer',
        description:
          'Mask sensitive customer emails, credit cards, and phone numbers in SQL queries and data dumps for safe debugging.',
        href: '/developer/advanced?tool=sql-pii-obfuscator',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:json-to-typescript',
        name: 'JSON to TypeScript & JSON Schema converter',
        description:
          'Infer strict TypeScript interface, type alias, or JSON Schema Draft-07 definitions from parsed JSON objects.',
        href: '/developer/advanced?tool=json-to-typescript',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:sql-to-er-diagram',
        name: 'SQL Schema to Visual ER Diagram',
        description:
          'Parse SQL DDL CREATE TABLE statements into an interactive, publication-grade SVG Entity-Relationship diagram with table nodes and foreign key links.',
        href: '/developer/advanced?tool=sql-to-er-diagram',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:er-diagram-to-sql',
        name: 'ER Diagram to SQL Converter',
        description:
          'Turn a Mermaid erDiagram into runnable CREATE TABLE statements for PostgreSQL, MySQL or SQLite, with primary keys, foreign keys and junction tables for many-to-many.',
        href: '/developer/advanced?tool=er-diagram-to-sql',
        workspaceId: 'developer-advanced-workbench',
      },
      {
        id: 'developer-advanced-workbench:json-to-zod-schema',
        name: 'JSON to Zod Schema Generator',
        description:
          'Generate strict, type-safe TypeScript Zod validation schemas (z.object, z.string().email(), z.number().int(), z.array(), z.infer) directly from JSON data.',
        href: '/developer/advanced?tool=json-to-zod-schema',
        workspaceId: 'developer-advanced-workbench',
      },
    ],
  },
];
