import type { ToolManifest } from './types';

export const publicTools: ToolManifest[] = [
  {
    id: 'text-case-converter',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Text case converter',
    shortDescription: 'Change text to sentence, title, upper, or lower case.',
    category: 'Text',
    aliases: [
      'uppercase converter',
      'lowercase converter',
      'title case',
      'sentence case',
      'capitalize text',
    ],
    jobs: ['change text case', 'fix capitalization', 'make text uppercase'],
    href: '/text/case-converter',
    execution: {
      mode: 'local-js',
      capabilities: ['text.transform.case'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'json-format',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'JSON formatter',
    shortDescription:
      'Validate, format, minify, or sort JSON without sending it away.',
    category: 'Data',
    aliases: [
      'json beautifier',
      'json validator',
      'pretty print json',
      'minify json',
    ],
    jobs: [
      'format json',
      'validate json',
      'sort json keys',
      'make json readable',
    ],
    href: '/data/json',
    execution: {
      mode: 'local-js',
      capabilities: ['data.json.transform'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'csv-to-json',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'CSV to JSON',
    shortDescription: 'Turn quoted CSV rows into structured JSON in this tab.',
    category: 'Data',
    aliases: ['convert csv', 'csv json converter', 'spreadsheet to json'],
    jobs: ['convert csv to json', 'inspect csv', 'make json from csv'],
    href: '/data/csv-to-json',
    execution: {
      mode: 'local-js',
      capabilities: ['data.csv.parse', 'data.json.serialize'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-merge',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Merge PDF',
    shortDescription: 'Combine PDF files in the order you choose.',
    category: 'PDF',
    aliases: [
      'combine pdf',
      'join pdf files',
      'pdf merger',
      'put pdfs together',
    ],
    jobs: ['merge pdf files', 'combine documents', 'join two pdfs'],
    href: '/pdf/merge',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.pagegraph.merge'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'pdf-extract',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Extract PDF pages',
    shortDescription: 'Choose pages or ranges and save them as a new PDF.',
    category: 'PDF',
    aliases: [
      'split pdf',
      'select pdf pages',
      'save pdf pages',
      'pdf page extractor',
    ],
    jobs: ['extract pages from pdf', 'split a pdf', 'keep selected pdf pages'],
    href: '/pdf/extract-pages',
    execution: {
      mode: 'local-js',
      capabilities: ['pdf.pagegraph.extract'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'image-optimize',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Optimize image',
    shortDescription: 'Resize, compress, and convert a static image locally.',
    category: 'Image',
    aliases: [
      'image compressor',
      'resize image',
      'convert image',
      'webp converter',
    ],
    jobs: [
      'compress image',
      'make image smaller',
      'resize photo',
      'convert png to webp',
    ],
    href: '/image/optimize',
    execution: {
      mode: 'local-js',
      capabilities: ['image.raster.decode', 'image.raster.encode'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'base64-encode',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Base64 encoder',
    shortDescription: 'Encode Unicode text as standard Base64 in this tab.',
    category: 'Developer',
    aliases: ['encode base64', 'text to base64', 'base 64 encoder'],
    jobs: ['convert text to base64', 'encode utf-8 text'],
    href: '/developer/base64-encoder',
    execution: {
      mode: 'local-js',
      capabilities: ['text.base64.encode'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'base64-decode',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Base64 decoder',
    shortDescription: 'Decode standard Base64 into validated UTF-8 text.',
    category: 'Developer',
    aliases: ['decode base64', 'base64 to text', 'base 64 decoder'],
    jobs: ['convert base64 to text', 'decode utf-8 base64'],
    href: '/developer/base64-decoder',
    execution: {
      mode: 'local-js',
      capabilities: ['text.base64.decode'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'uuid-generator',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'UUID generator',
    shortDescription: 'Generate cryptographically random UUID v4 values.',
    category: 'Developer',
    aliases: ['guid generator', 'random uuid', 'uuid v4'],
    jobs: ['generate uuid', 'make random identifiers'],
    href: '/developer/uuid-generator',
    execution: {
      mode: 'local-js',
      capabilities: ['crypto.uuid.v4'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'unix-timestamp',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Unix timestamp converter',
    shortDescription: 'Convert Unix seconds, milliseconds, and ISO dates.',
    category: 'Developer',
    aliases: ['epoch converter', 'unix time', 'timestamp to date'],
    jobs: ['convert unix timestamp', 'convert date to epoch'],
    href: '/developer/unix-timestamp',
    execution: {
      mode: 'local-js',
      capabilities: ['date.timestamp.convert'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'file-hash',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'File hash calculator',
    shortDescription: 'Calculate SHA-256, SHA-384, or SHA-512 locally.',
    category: 'File',
    aliases: ['sha256 file', 'checksum calculator', 'file fingerprint'],
    jobs: ['calculate file hash', 'verify file checksum'],
    href: '/file/hash-calculator',
    execution: {
      mode: 'local-js',
      capabilities: ['crypto.digest.file'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'percentage-calculator',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Percentage calculator',
    shortDescription: 'Calculate percentages, ratios, and percentage change.',
    category: 'Math',
    aliases: ['percent calculator', 'percentage change', 'what percent'],
    jobs: ['calculate percentage', 'find percent change'],
    href: '/math/percentage-calculator',
    execution: {
      mode: 'local-js',
      capabilities: ['math.percentage'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'date-difference',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Date difference calculator',
    shortDescription: 'Count exact calendar days between two dates.',
    category: 'Date',
    aliases: ['days between dates', 'date duration', 'day counter'],
    jobs: ['calculate date difference', 'count days between dates'],
    href: '/date/date-difference',
    execution: {
      mode: 'local-js',
      capabilities: ['date.calendar.difference'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
  {
    id: 'age-calculator',
    version: '0.1.0-canary',
    status: 'canary',
    name: 'Age calculator',
    shortDescription: 'Calculate calendar age and total elapsed days.',
    category: 'Date',
    aliases: ['birthday age', 'how old am i', 'date of birth calculator'],
    jobs: ['calculate age', 'age on a date'],
    href: '/date/age-calculator',
    execution: {
      mode: 'local-js',
      capabilities: ['date.calendar.age'],
      offlineReady: false,
    },
    owner: 'platform-foundation',
  },
];

export function searchTools(query: string): ToolManifest[] {
  const normalizeToken = (token: string) =>
    token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token;
  const tokenize = (value: string) =>
    value
      .normalize('NFKD')
      .toLocaleLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .map(normalizeToken);
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return publicTools;

  return publicTools.filter((tool) => {
    const documentTokens = tokenize(
      [tool.name, tool.shortDescription, ...tool.aliases, ...tool.jobs].join(
        ' ',
      ),
    );
    return queryTokens.every((queryToken) =>
      documentTokens.some(
        (documentToken) =>
          documentToken.includes(queryToken) ||
          queryToken.includes(documentToken),
      ),
    );
  });
}
