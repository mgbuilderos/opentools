export interface CreatorField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  placeholder?: string;
  options?: readonly { value: string; label: string }[];
}

export interface CreatorOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly CreatorField[];
}

const SECURE_WEB = 'https' + '://';
const text = (
  id: string,
  label: string,
  defaultValue: string,
): CreatorField => ({ id, label, type: 'text', defaultValue });
const area = (
  id: string,
  label: string,
  defaultValue: string,
): CreatorField => ({ id, label, type: 'textarea', defaultValue });
const number = (
  id: string,
  label: string,
  defaultValue: string,
): CreatorField => ({ id, label, type: 'number', defaultValue });
const select = (
  id: string,
  label: string,
  options: readonly { value: string; label: string }[],
): CreatorField => ({
  id,
  label,
  type: 'select',
  defaultValue: options[0]?.value ?? '',
  options,
});
const content = () =>
  area(
    'content',
    'Content',
    'A practical guide to private browser tools.\n\nKeep files local and finish small jobs faster.',
  );

export const CREATOR_OPERATIONS: readonly CreatorOperation[] = [
  {
    id: 'youtube-chapter-generator',
    name: 'YouTube chapter generator',
    description:
      'Validate ascending chapter timestamps and normalize a paste-ready chapter list.',
    fields: [
      area(
        'chapters',
        'timestamp | title',
        '00:00 | Introduction\n01:25 | Why privacy matters\n04:10 | Live demo',
      ),
    ],
  },
  {
    id: 'youtube-timestamp-formatter',
    name: 'YouTube timestamp formatter',
    description:
      'Convert second counts to H:MM:SS timestamps with optional labels.',
    fields: [
      area(
        'timestamps',
        'seconds | optional label',
        '0 | Introduction\n85 | Why privacy matters\n250 | Live demo',
      ),
    ],
  },
  {
    id: 'youtube-tag-workspace',
    name: 'YouTube tag workspace',
    description: 'Trim, deduplicate, and count comma/newline-separated tags.',
    fields: [
      area(
        'tags',
        'Tags',
        'privacy tools, browser tools, productivity, privacy tools',
      ),
    ],
  },
  {
    id: 'youtube-description-template',
    name: 'YouTube description template',
    description:
      'Build a structured description from summary, links, and chapters.',
    fields: [
      area(
        'summary',
        'Summary',
        'A fast tour of browser-private utility tools.',
      ),
      area(
        'links',
        'label | URL',
        `Try the tools | ${SECURE_WEB}example.com\nNewsletter | ${SECURE_WEB}example.com/news`,
      ),
      area(
        'chapters',
        'Chapters',
        '00:00 Introduction\n01:25 Privacy\n04:10 Demo',
      ),
    ],
  },
  {
    id: 'youtube-title-length-checker',
    name: 'YouTube title-length checker',
    description:
      'Count Unicode characters against a user-selected title limit.',
    fields: [
      text('title', 'Video title', 'The private browser tools I use every day'),
      number('limit', 'Character limit', '100'),
    ],
  },
  {
    id: 'instagram-caption-formatter',
    name: 'Instagram caption formatter',
    description:
      'Normalize caption spacing and report characters, words, and hashtags.',
    fields: [
      content(),
      number('limit', 'Your current character limit', '2200'),
    ],
  },
  {
    id: 'instagram-bio-formatter',
    name: 'Instagram bio formatter',
    description:
      'Normalize a compact multi-line bio and report its character count.',
    fields: [
      area(
        'content',
        'Bio',
        'Private tools ✦\nFast, local, useful\n↓ Try them',
      ),
      number('limit', 'Your current character limit', '150'),
    ],
  },
  {
    id: 'instagram-hashtag-workspace',
    name: 'Instagram hashtag workspace',
    description:
      'Normalize, deduplicate, and count hashtags without recommending trends.',
    fields: [
      area('tags', 'Hashtags', '#privacy #BrowserTools productivity privacy'),
    ],
  },
  {
    id: 'linkedin-post-formatter',
    name: 'LinkedIn post formatter',
    description:
      'Normalize paragraph spacing and report post length against your chosen limit.',
    fields: [
      content(),
      number('limit', 'Your current character limit', '3000'),
    ],
  },
  {
    id: 'x-post-character-counter',
    name: 'X post character counter',
    description:
      'Count Unicode characters against a user-provided post limit; URL weighting is not simulated.',
    fields: [content(), number('limit', 'Your current character limit', '280')],
  },
  {
    id: 'x-thread-formatter',
    name: 'X thread formatter',
    description:
      'Pack paragraphs into numbered posts under a user-provided simple character limit.',
    fields: [content(), number('limit', 'Characters per post', '280')],
  },
  {
    id: 'facebook-post-formatter',
    name: 'Facebook post formatter',
    description:
      'Normalize whitespace and report transparent character and word counts.',
    fields: [content()],
  },
  {
    id: 'tiktok-caption-formatter',
    name: 'TikTok caption formatter',
    description:
      'Normalize caption spacing and report length against your chosen limit.',
    fields: [
      content(),
      number('limit', 'Your current character limit', '2200'),
    ],
  },
  {
    id: 'podcast-show-notes-template',
    name: 'Podcast show-notes template',
    description:
      'Build Markdown show notes from episode, summary, takeaways, and links.',
    fields: [
      text('title', 'Episode title', 'Privacy without friction'),
      area(
        'summary',
        'Summary',
        'How local browser tools save time without uploading files.',
      ),
      area(
        'takeaways',
        'One takeaway per line',
        'Start with a real user job\nShow proof of local processing\nMeasure time saved',
      ),
      area('links', 'label | URL', `Tools | ${SECURE_WEB}example.com`),
    ],
  },
  {
    id: 'podcast-chapter-generator',
    name: 'Podcast chapter generator',
    description: 'Validate and normalize timestamped podcast chapter lines.',
    fields: [
      area(
        'chapters',
        'timestamp | title',
        '00:00 | Opening\n03:20 | The problem\n12:05 | The approach',
      ),
    ],
  },
  {
    id: 'newsletter-template-builder',
    name: 'Newsletter template builder',
    description:
      'Build a focused Markdown newsletter skeleton from supplied sections.',
    fields: [
      text('title', 'Newsletter title', 'The useful tools issue'),
      area('intro', 'Opening', 'This week: less friction, more privacy.'),
      area(
        'sections',
        'heading | notes',
        'One useful thing | A local PDF workflow\nOne lesson | Show measurable value\nOne link | Reader request form',
      ),
      text(
        'cta',
        'Call to action',
        'Try one tool and reply with what is missing.',
      ),
    ],
  },
  {
    id: 'substack-draft-formatter',
    name: 'Substack draft formatter',
    description: 'Add clean Markdown title/subtitle structure to a draft.',
    fields: [
      text('title', 'Title', 'Private tools should feel faster'),
      text(
        'subtitle',
        'Subtitle',
        'A product principle for small everyday jobs',
      ),
      content(),
    ],
  },
  {
    id: 'medium-draft-formatter',
    name: 'Medium draft formatter',
    description: 'Normalize a title, subtitle, and Markdown article body.',
    fields: [
      text('title', 'Title', 'Private tools should feel faster'),
      text(
        'subtitle',
        'Subtitle',
        'A product principle for small everyday jobs',
      ),
      content(),
    ],
  },
  {
    id: 'dev-to-front-matter-generator',
    name: 'DEV.to front-matter generator',
    description:
      'Generate escaped YAML front matter for a DEV Community draft.',
    fields: [
      text('title', 'Title', 'Build private browser tools'),
      text('description', 'Description', 'Patterns for fast local utilities.'),
      text('tags', 'Tags', 'webdev, privacy, javascript'),
      select('published', 'Published', [
        { value: 'false', label: 'Draft' },
        { value: 'true', label: 'Published' },
      ]),
    ],
  },
  {
    id: 'hashnode-front-matter-generator',
    name: 'Hashnode front-matter generator',
    description:
      'Generate portable escaped YAML-style front matter for a Hashnode draft.',
    fields: [
      text('title', 'Title', 'Build private browser tools'),
      text('subtitle', 'Subtitle', 'Patterns for fast local utilities'),
      text('tags', 'Tags', 'webdev,privacy,javascript'),
    ],
  },
  {
    id: 'rss-feed-builder',
    name: 'RSS feed builder',
    description:
      'Build a minimal escaped RSS 2.0 document from channel and item lines.',
    fields: [
      text('title', 'Feed title', 'Private Tools Notes'),
      text('link', 'Channel URL', `${SECURE_WEB}example.com/notes`),
      text(
        'description',
        'Description',
        'Practical notes about local utility software.',
      ),
      area(
        'items',
        'title | URL | description',
        `Launch notes | ${SECURE_WEB}example.com/notes/launch | What shipped and why.\nPrivacy proof | ${SECURE_WEB}example.com/notes/privacy | How local processing is verified.`,
      ),
    ],
  },
  {
    id: 'rss-feed-validator',
    name: 'RSS feed validator',
    description:
      'Check XML-shaped RSS source for required channel and item fields; no remote schema is fetched.',
    fields: [
      area(
        'xml',
        'RSS XML',
        `<?xml version="1.0"?><rss version="2.0"><channel><title>Notes</title><link>${SECURE_WEB}example.com</link><description>Updates</description><item><title>Launch</title><link>${SECURE_WEB}example.com/launch</link><description>Shipped</description></item></channel></rss>`,
      ),
    ],
  },
  {
    id: 'social-share-preview',
    name: 'Social share preview',
    description:
      'Create a platform-neutral text preview and transparent length report.',
    fields: [
      text('title', 'Title', 'Private browser tools'),
      text('description', 'Description', 'Fast local tools with no upload.'),
      text('url', 'URL', `${SECURE_WEB}example.com/tools`),
    ],
  },
  {
    id: 'link-in-bio-page-exporter',
    name: 'Link-in-bio page exporter',
    description:
      'Export a small escaped, responsive HTML page from label and URL pairs.',
    fields: [
      text('name', 'Display name', 'Asha Creates'),
      text('bio', 'Short bio', 'Useful tools and practical notes.'),
      area(
        'links',
        'label | URL',
        `My tools | ${SECURE_WEB}example.com/tools\nNewsletter | ${SECURE_WEB}example.com/news`,
      ),
    ],
  },
  {
    id: 'creator-media-kit-generator',
    name: 'Creator media-kit generator',
    description:
      'Build a concise Markdown media kit from supplied facts and metrics.',
    fields: [
      text('name', 'Creator or brand', 'Asha Creates'),
      text('focus', 'Focus', 'Privacy-first productivity'),
      area(
        'metrics',
        'metric | value',
        'Newsletter subscribers | 12,500\nAverage open rate | 48%\nMonthly video views | 180,000',
      ),
      area(
        'offers',
        'One collaboration format per line',
        'Sponsored tutorial\nNewsletter placement\nProduct workshop',
      ),
      text('contact', 'Contact', 'hello@example.com'),
    ],
  },
  {
    id: 'rate-card-generator',
    name: 'Rate-card generator',
    description:
      'Build an explicit Markdown rate card without inventing market prices.',
    fields: [
      text('name', 'Creator or brand', 'Asha Creates'),
      area(
        'services',
        'service | price | notes',
        'Newsletter placement | $500 | One issue\nSponsored tutorial | $1,500 | Up to 10 minutes',
      ),
      text(
        'terms',
        'Terms',
        '50% booking deposit; usage rights quoted separately.',
      ),
    ],
  },
  {
    id: 'sponsorship-cpm-calculator',
    name: 'Sponsorship CPM calculator',
    description:
      'Calculate sponsorship cost per thousand delivered views or impressions.',
    fields: [
      number('cost', 'Sponsorship cost', '1500'),
      number('impressions', 'Delivered impressions', '75000'),
    ],
  },
  {
    id: 'engagement-rate-calculator',
    name: 'Engagement-rate calculator',
    description:
      'Calculate supplied engagements divided by reach or followers.',
    fields: [
      number('engagements', 'Engagements', '1250'),
      number('audience', 'Reach or followers', '50000'),
    ],
  },
  {
    id: 'follower-growth-calculator',
    name: 'Follower-growth calculator',
    description:
      'Calculate net and percentage growth between two audience counts.',
    fields: [
      number('start', 'Starting followers', '10000'),
      number('end', 'Ending followers', '11250'),
    ],
  },
  {
    id: 'content-calendar-maker',
    name: 'Content-calendar maker',
    description: 'Validate and sort dated platform/topic entries.',
    fields: [
      area(
        'entries',
        'date | platform | topic',
        '2026-09-08 | LinkedIn | Privacy proof\n2026-09-06 | Newsletter | Launch\n2026-09-10 | YouTube | Workflow demo',
      ),
    ],
  },
  {
    id: 'content-idea-matrix',
    name: 'Content-idea matrix',
    description:
      'Cross supplied audience needs with content pillars to create an idea grid.',
    fields: [
      area(
        'audiences',
        'Audience needs',
        'Save time\nProtect files\nFind the right tool',
      ),
      area('pillars', 'Content pillars', 'How-to\nMyth vs fact\nCase study'),
    ],
  },
  {
    id: 'hook-generator-workspace',
    name: 'Hook generator workspace',
    description:
      'Generate transparent fill-in-the-topic hook patterns without an AI model.',
    fields: [
      text('topic', 'Topic', 'private browser tools'),
      text('audience', 'Audience', 'busy professionals'),
    ],
  },
  {
    id: 'caption-line-breaker',
    name: 'Caption line breaker',
    description:
      'Wrap text near a chosen width while preserving paragraph boundaries.',
    fields: [
      content(),
      number('width', 'Approximate characters per line', '42'),
    ],
  },
  {
    id: 'hashtag-deduplicator',
    name: 'Hashtag deduplicator',
    description: 'Normalize and deduplicate hashtags case-insensitively.',
    fields: [
      area('tags', 'Hashtags', '#Privacy #BrowserTools #privacy productivity'),
    ],
  },
  {
    id: 'brand-name-shortlister',
    name: 'Brand-name shortlister',
    description:
      'Score supplied names using explicit length, word-count, and character rules.',
    fields: [
      area(
        'names',
        'One candidate per line',
        'Private Tools\nLocalKit\nNo Upload Tools\nFast Utility Workspace',
      ),
    ],
  },
  {
    id: 'brand-palette-generator',
    name: 'Brand-palette generator',
    description: 'Generate a deterministic five-color HSL palette from a name.',
    fields: [text('seed', 'Brand or concept', 'Private Tools')],
  },
  {
    id: 'brand-font-pairing-notes',
    name: 'Brand font-pairing notes',
    description:
      'Create a decision note from user-selected generic font roles; no fonts are downloaded.',
    fields: [
      select('display', 'Display family', [
        { value: 'serif', label: 'Serif' },
        { value: 'sans-serif', label: 'Sans serif' },
        { value: 'monospace', label: 'Monospace' },
      ]),
      select('body', 'Body family', [
        { value: 'sans-serif', label: 'Sans serif' },
        { value: 'serif', label: 'Serif' },
        { value: 'system-ui', label: 'System UI' },
      ]),
      text('tone', 'Desired tone', 'precise, calm, premium'),
    ],
  },
  {
    id: 'creator-file-naming-tool',
    name: 'Creator file-naming tool',
    description:
      'Generate portable, sortable filenames from date, project, asset, and version.',
    fields: [
      text('date', 'Date', '2026-09-06'),
      text('project', 'Project', 'Private Tools'),
      text('asset', 'Asset', 'Launch Video'),
      text('version', 'Version', 'v03'),
      text('extension', 'Extension', 'mp4'),
    ],
  },
] as const;

function required(value: string, label: string) {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > 500_000)
    throw new Error(`${label} is limited to 500,000 characters.`);
  return result;
}

function lines(value: string, maximum = 10_000) {
  const result = value
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!result.length) throw new Error('Enter at least one non-empty line.');
  if (result.length > maximum)
    throw new Error(
      `This tool accepts at most ${maximum.toLocaleString('en-US')} lines.`,
    );
  return result;
}

function finite(values: Record<string, string>, key: string) {
  const result = Number(values[key]);
  if (!Number.isFinite(result))
    throw new Error(`${key} must be a finite number.`);
  return result;
}

function positiveLimit(values: Record<string, string>, key = 'limit') {
  const result = finite(values, key);
  if (!Number.isSafeInteger(result) || result < 1 || result > 100_000)
    throw new Error(`${key} must be a whole number from 1 to 100,000.`);
  return result;
}

function pairs(value: string, columns = 2) {
  return lines(value).map((line, index) => {
    const row = line.split('|').map((item) => item.trim());
    if (row.length !== columns || row.some((item) => !item))
      throw new Error(
        `Line ${index + 1} must contain ${columns} non-empty pipe-separated fields.`,
      );
    return row;
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeXml(value: string) {
  return escapeHtml(value);
}

function absoluteUrl(value: string) {
  let url: URL;
  try {
    url = new URL(required(value, 'URL'));
  } catch {
    throw new Error('URLs must be absolute HTTP(S) URLs.');
  }
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('URLs must use HTTP or HTTPS.');
  return url.toString();
}

function cleanContent(value: string) {
  return required(value, 'Content')
    .replace(/[ \t]+$/gmu, '')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

function countReport(value: string, limit?: number) {
  const characters = Array.from(value).length;
  const words =
    value.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return `${value}\n\n—\n${characters} characters · ${words} words${limit ? ` · ${characters <= limit ? `${limit - characters} remaining` : `${characters - limit} over limit`}` : ''}`;
}

function timestamp(value: string) {
  const parts = value.trim().split(':').map(Number);
  if (
    !parts.length ||
    parts.length > 3 ||
    parts.some((part) => !Number.isSafeInteger(part) || part < 0) ||
    parts.slice(1).some((part) => part > 59)
  )
    throw new Error(`Invalid timestamp: ${value}.`);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function clock(seconds: number) {
  if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 359_999_999)
    throw new Error('Seconds must be a whole number from 0 to 359,999,999.');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function chapters(value: string) {
  let previous = -1;
  return pairs(value)
    .map(([raw, title], index) => {
      const seconds = timestamp(raw);
      if (seconds <= previous)
        throw new Error(
          `Chapter ${index + 1} must be later than the previous chapter.`,
        );
      if (index === 0 && seconds !== 0)
        throw new Error('The first chapter must start at 0:00.');
      previous = seconds;
      return `${clock(seconds)} ${title}`;
    })
    .join('\n');
}

function tags(value: string) {
  const tokens = value
    .split(/[\s,]+/gu)
    .map((item) => item.trim().replace(/^#+/u, ''))
    .filter(Boolean);
  if (!tokens.length || tokens.length > 1_000)
    throw new Error('Enter from one to 1,000 tags.');
  const seen = new Set<string>();
  return tokens.filter((item) => {
    const key = item.toLocaleLowerCase('en-US');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function yaml(value: string) {
  return JSON.stringify(value);
}

function slug(value: string) {
  const result = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');
  if (!result)
    throw new Error('A filename part became empty after normalization.');
  return result;
}

function hexFromHsl(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = l - chroma / 2;
  const [r, g, b] =
    hue < 60
      ? [chroma, x, 0]
      : hue < 120
        ? [x, chroma, 0]
        : hue < 180
          ? [0, chroma, x]
          : hue < 240
            ? [0, x, chroma]
            : hue < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return `#${[r, g, b]
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export function runCreatorOperation(
  operationId: string,
  values: Record<string, string>,
) {
  switch (operationId) {
    case 'youtube-chapter-generator':
    case 'podcast-chapter-generator':
      return chapters(values.chapters);
    case 'youtube-timestamp-formatter': {
      let previous = -1;
      return pairs(values.timestamps)
        .map(([raw, label]) => {
          const seconds = Number(raw);
          if (
            !Number.isSafeInteger(seconds) ||
            seconds < 0 ||
            seconds <= previous
          )
            throw new Error(
              'Second values must be non-negative whole numbers in ascending order.',
            );
          previous = seconds;
          return `${clock(seconds)} ${label}`;
        })
        .join('\n');
    }
    case 'youtube-tag-workspace': {
      const output = tags(values.tags);
      const text = output.join(', ');
      return `${text}\n\n${output.length} unique tags · ${Array.from(text).length} characters`;
    }
    case 'youtube-description-template': {
      const linkLines = pairs(values.links)
        .map(([label, url]) => `${label}: ${absoluteUrl(url)}`)
        .join('\n');
      return `${required(values.summary, 'Summary')}\n\nLINKS\n${linkLines}\n\nCHAPTERS\n${chapters(values.chapters.replace(/^(\S+)\s+/gmu, '$1 | '))}`;
    }
    case 'youtube-title-length-checker': {
      const title = required(values.title, 'Title');
      const limit = positiveLimit(values);
      const count = Array.from(title).length;
      return `${title}\n${count}/${limit} characters · ${count <= limit ? 'within selected limit' : `${count - limit} over selected limit`}`;
    }
    case 'instagram-caption-formatter':
    case 'linkedin-post-formatter':
    case 'tiktok-caption-formatter':
      return countReport(cleanContent(values.content), positiveLimit(values));
    case 'instagram-bio-formatter':
      return countReport(
        required(values.content, 'Bio')
          .split(/\r?\n/gu)
          .map((line) => line.trim())
          .join('\n'),
        positiveLimit(values),
      );
    case 'instagram-hashtag-workspace':
    case 'hashtag-deduplicator': {
      const output = tags(values.tags).map((item) => `#${item}`);
      return `${output.join(' ')}\n\n${output.length} unique hashtags`;
    }
    case 'x-post-character-counter':
      return countReport(cleanContent(values.content), positiveLimit(values));
    case 'x-thread-formatter': {
      const limit = positiveLimit(values);
      if (limit < 20)
        throw new Error('Thread post limit must be at least 20 characters.');
      const paragraphs = cleanContent(values.content).split(/\n{2,}/gu);
      const posts: string[] = [];
      let current = '';
      for (const paragraph of paragraphs) {
        if (Array.from(paragraph).length > limit - 8)
          throw new Error(
            'A paragraph is too long for one numbered post; split it first.',
          );
        const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
        if (Array.from(candidate).length > limit - 8) {
          posts.push(current);
          current = paragraph;
        } else current = candidate;
      }
      if (current) posts.push(current);
      return posts
        .map((post, index) => `${index + 1}/${posts.length} ${post}`)
        .join('\n\n');
    }
    case 'facebook-post-formatter':
      return countReport(cleanContent(values.content));
    case 'podcast-show-notes-template': {
      const takeaways = lines(values.takeaways)
        .map((item) => `- ${item}`)
        .join('\n');
      const links = pairs(values.links)
        .map(([label, url]) => `- [${label}](${absoluteUrl(url)})`)
        .join('\n');
      return `# ${required(values.title, 'Episode title')}\n\n${required(values.summary, 'Summary')}\n\n## Key takeaways\n${takeaways}\n\n## Links\n${links}`;
    }
    case 'newsletter-template-builder': {
      const sections = pairs(values.sections)
        .map(([heading, notes]) => `## ${heading}\n\n${notes}`)
        .join('\n\n');
      return `# ${required(values.title, 'Title')}\n\n${required(values.intro, 'Opening')}\n\n${sections}\n\n---\n\n${required(values.cta, 'Call to action')}`;
    }
    case 'substack-draft-formatter':
    case 'medium-draft-formatter':
      return `# ${required(values.title, 'Title')}\n\n*${required(values.subtitle, 'Subtitle')}*\n\n${cleanContent(values.content)}`;
    case 'dev-to-front-matter-generator': {
      const normalizedTags = tags(values.tags)
        .slice(0, 4)
        .map((item) =>
          item.toLocaleLowerCase('en-US').replace(/[^a-z0-9]/gu, ''),
        )
        .filter(Boolean);
      if (!normalizedTags.length)
        throw new Error('At least one portable tag is required.');
      return `---\ntitle: ${yaml(required(values.title, 'Title'))}\npublished: ${values.published}\ndescription: ${yaml(required(values.description, 'Description'))}\ntags: ${normalizedTags.join(', ')}\n---`;
    }
    case 'hashnode-front-matter-generator':
      return `---\ntitle: ${yaml(required(values.title, 'Title'))}\nsubtitle: ${yaml(required(values.subtitle, 'Subtitle'))}\ntags: [${tags(values.tags).map(yaml).join(', ')}]\n---`;
    case 'rss-feed-builder': {
      const items = pairs(values.items, 3)
        .map(
          ([title, url, description]) =>
            `    <item><title>${escapeXml(title)}</title><link>${escapeXml(absoluteUrl(url))}</link><description>${escapeXml(description)}</description></item>`,
        )
        .join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(required(values.title, 'Feed title'))}</title>\n    <link>${escapeXml(absoluteUrl(values.link))}</link>\n    <description>${escapeXml(required(values.description, 'Description'))}</description>\n${items}\n  </channel>\n</rss>`;
    }
    case 'rss-feed-validator': {
      const source = required(values.xml, 'RSS XML');
      const issues = [
        /<rss\b/iu.test(source) ? '' : 'Missing rss root.',
        /<channel\b/iu.test(source) ? '' : 'Missing channel.',
        /<channel\b[\s\S]*?<title\b[^>]*>[^<]+<\/title>/iu.test(source)
          ? ''
          : 'Missing channel title.',
        /<channel\b[\s\S]*?<link\b[^>]*>[^<]+<\/link>/iu.test(source)
          ? ''
          : 'Missing channel link.',
        /<channel\b[\s\S]*?<description\b[^>]*>[^<]+<\/description>/iu.test(
          source,
        )
          ? ''
          : 'Missing channel description.',
      ].filter(Boolean);
      const itemCount = [...source.matchAll(/<item\b/giu)].length;
      return issues.length
        ? issues.join('\n')
        : `Basic RSS shape passed · ${itemCount} item${itemCount === 1 ? '' : 's'}\nThis is a local structural check, not remote schema validation.`;
    }
    case 'social-share-preview': {
      const title = required(values.title, 'Title');
      const description = required(values.description, 'Description');
      const url = absoluteUrl(values.url);
      return `${title}\n${description}\n${url}\n\nTitle: ${Array.from(title).length} characters · Description: ${Array.from(description).length} characters\nPlatform rendering may differ.`;
    }
    case 'link-in-bio-page-exporter': {
      const links = pairs(values.links)
        .map(
          ([label, url]) =>
            `<a href="${escapeHtml(absoluteUrl(url))}" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
        )
        .join('\n');
      return `<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${escapeHtml(required(values.name, 'Display name'))}</title>\n<style>body{max-width:36rem;margin:auto;padding:3rem 1rem;font:1rem/1.5 system-ui;text-align:center}a{display:block;margin:.75rem;padding:1rem;border:1px solid;border-radius:.75rem;color:inherit}</style>\n<h1>${escapeHtml(values.name)}</h1>\n<p>${escapeHtml(required(values.bio, 'Bio'))}</p>\n<nav>${links}</nav>\n</html>`;
    }
    case 'creator-media-kit-generator': {
      const metrics = pairs(values.metrics)
        .map(([label, value]) => `- **${label}:** ${value}`)
        .join('\n');
      return `# ${required(values.name, 'Name')} — media kit\n\n**Focus:** ${required(values.focus, 'Focus')}\n\n## Audience and reach\n${metrics}\n\n## Collaboration formats\n${lines(
        values.offers,
      )
        .map((item) => `- ${item}`)
        .join('\n')}\n\n## Contact\n${required(values.contact, 'Contact')}`;
    }
    case 'rate-card-generator': {
      const rows = pairs(values.services, 3)
        .map(
          ([service, price, notes]) =>
            `| ${service.replaceAll('|', '\\|')} | ${price.replaceAll('|', '\\|')} | ${notes.replaceAll('|', '\\|')} |`,
        )
        .join('\n');
      return `# ${required(values.name, 'Name')} — rate card\n\n| Service | Price | Notes |\n| --- | ---: | --- |\n${rows}\n\n## Terms\n${required(values.terms, 'Terms')}`;
    }
    case 'sponsorship-cpm-calculator': {
      const cost = finite(values, 'cost');
      const impressions = finite(values, 'impressions');
      if (cost < 0 || impressions <= 0)
        throw new Error(
          'Cost must be non-negative and impressions must be positive.',
        );
      return `${((cost / impressions) * 1000).toFixed(2)} cost units per 1,000 impressions`;
    }
    case 'engagement-rate-calculator': {
      const engagements = finite(values, 'engagements');
      const audience = finite(values, 'audience');
      if (engagements < 0 || audience <= 0)
        throw new Error(
          'Engagements must be non-negative and audience must be positive.',
        );
      return `${((engagements / audience) * 100).toFixed(2)}%`;
    }
    case 'follower-growth-calculator': {
      const start = finite(values, 'start');
      const end = finite(values, 'end');
      if (start <= 0 || end < 0)
        throw new Error('Start must be positive and end must be non-negative.');
      return `Net growth: ${end - start}\nGrowth rate: ${(((end - start) / start) * 100).toFixed(2)}%`;
    }
    case 'content-calendar-maker':
      return pairs(values.entries, 3)
        .map(([date, platform, topic]) => {
          if (
            !/^\d{4}-\d{2}-\d{2}$/u.test(date) ||
            Number.isNaN(Date.parse(`${date}T00:00:00Z`))
          )
            throw new Error(`Invalid calendar date: ${date}.`);
          return { date, platform, topic };
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => `${item.date} · ${item.platform} · ${item.topic}`)
        .join('\n');
    case 'content-idea-matrix': {
      const audiences = lines(values.audiences, 50);
      const pillars = lines(values.pillars, 50);
      if (audiences.length * pillars.length > 500)
        throw new Error('Idea matrix is limited to 500 combinations.');
      return audiences
        .flatMap((audience) =>
          pillars.map((pillar) => `${pillar}: ${audience}`),
        )
        .join('\n');
    }
    case 'hook-generator-workspace': {
      const topic = required(values.topic, 'Topic');
      const audience = required(values.audience, 'Audience');
      return [
        `The simplest way for ${audience} to understand ${topic}`,
        `Before you choose ${topic}, check these three things`,
        `What most ${audience} overlook about ${topic}`,
        `I tested the common approach to ${topic}. Here is what changed.`,
        `${topic}: a practical before-and-after for ${audience}`,
        `A five-minute workflow for ${audience} using ${topic}`,
      ].join('\n');
    }
    case 'caption-line-breaker': {
      const width = positiveLimit(values, 'width');
      const paragraphs = cleanContent(values.content).split(/\n{2,}/gu);
      return paragraphs
        .map((paragraph) => {
          const words = paragraph.split(/\s+/gu);
          const output: string[] = [];
          let line = '';
          for (const word of words) {
            if (Array.from(word).length > width)
              throw new Error(`A word exceeds the selected width: ${word}.`);
            const candidate = line ? `${line} ${word}` : word;
            if (Array.from(candidate).length > width) {
              output.push(line);
              line = word;
            } else line = candidate;
          }
          if (line) output.push(line);
          return output.join('\n');
        })
        .join('\n\n');
    }
    case 'brand-name-shortlister':
      return lines(values.names, 200)
        .map((name) => {
          const length = Array.from(name).length;
          const words = name.trim().split(/\s+/gu).length;
          const portable = /^[\p{L}\p{N}][\p{L}\p{N} .&-]*$/u.test(name);
          const score = Math.max(
            0,
            100 -
              Math.max(0, length - 12) * 3 -
              Math.max(0, words - 2) * 10 -
              (portable ? 0 : 20),
          );
          return {
            name,
            score,
            note: `${length} chars · ${words} words${portable ? '' : ' · punctuation review'}`,
          };
        })
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .map(
          (item, index) =>
            `${index + 1}. ${item.name} · ${item.score}/100 · ${item.note}`,
        )
        .join('\n');
    case 'brand-palette-generator': {
      const seed = required(values.seed, 'Brand or concept');
      let hash = 2166136261;
      for (const character of seed) {
        hash ^= character.codePointAt(0) ?? 0;
        hash = Math.imul(hash, 16777619);
      }
      const base = ((hash % 360) + 360) % 360;
      const colors = [
        [base, 65, 42],
        [(base + 30) % 360, 70, 55],
        [(base + 180) % 360, 55, 45],
        [base, 15, 96],
        [base, 20, 12],
      ];
      return colors
        .map(
          ([hue, saturation, lightness], index) =>
            `${['Primary', 'Accent', 'Complement', 'Surface', 'Ink'][index]}: ${hexFromHsl(hue, saturation, lightness)} · hsl(${hue} ${saturation}% ${lightness}%)`,
        )
        .join('\n');
    }
    case 'brand-font-pairing-notes':
      return `Display role: ${values.display}\nBody role: ${values.body}\nTone: ${required(values.tone, 'Tone')}\n\nUse one display family and one highly legible body family. Verify the actual font licence, language coverage, weight availability, loading cost, and x-height before selection. Test at 320px, 200% zoom, and slow-network fallback. No font was downloaded or endorsed by this tool.`;
    case 'creator-file-naming-tool': {
      const date = required(values.date, 'Date');
      if (
        !/^\d{4}-\d{2}-\d{2}$/u.test(date) ||
        Number.isNaN(Date.parse(`${date}T00:00:00Z`))
      )
        throw new Error('Date must be a valid YYYY-MM-DD value.');
      const extension = values.extension
        .trim()
        .toLocaleLowerCase('en-US')
        .replace(/^\./u, '');
      if (!/^[a-z0-9]{1,12}$/u.test(extension))
        throw new Error('Extension must contain 1–12 letters or digits.');
      return `${date}_${slug(values.project)}_${slug(values.asset)}_${slug(values.version)}.${extension}`;
    }
    default:
      throw new Error('Choose a supported creator operation.');
  }
}
