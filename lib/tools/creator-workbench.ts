import {
  area,
  file,
  number,
  select,
  text,
  type StandardField as CreatorField,
  type StandardOperation as CreatorOperation,
} from './workbench-helpers';

export type { CreatorField, CreatorOperation };

const SECURE_WEB = 'https' + '://';
const svgNamespace = 'http:' + '//www.w3.org/2000/svg';
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
  {
    id: 'audio-format-converter',
    name: 'Audio format converter',
    description:
      'Transcode audio inputs to clean uncompressed 16-bit PCM WAV locally in-memory.',
    notice:
      'Zero remote egress. Decodes audio inputs and serializes clean uncompressed 16-bit PCM WAV in your browser.',
    outputExtension: 'wav',
    fields: [
      file(
        'audio',
        'Audio file (WAV, MP3, OGG, M4A, FLAC)',
        'audio/*,.wav,.mp3,.ogg,.m4a,.flac',
      ),
      select('targetFormat', 'Target format', [
        { value: 'wav', label: '16-bit PCM WAV (.wav)' },
      ]),
      select('sampleRate', 'Output sample rate', [
        { value: '44100', label: '44,100 Hz (CD quality)' },
        { value: '48000', label: '48,000 Hz (Studio/Broadcast)' },
        { value: '22050', label: '22,050 Hz (Speech/Compact)' },
      ]),
      select('channels', 'Channels', [
        { value: 'stereo', label: 'Stereo (2 channels)' },
        { value: 'mono', label: 'Mono (1 channel)' },
      ]),
    ],
  },
  {
    id: 'audio-trimmer',
    name: 'Audio trimmer & cutter',
    description:
      'Trim start/end timestamps, adjust gain, and apply anti-pop crossfades.',
    notice:
      'Zero remote egress. Edits and exports 16-bit PCM WAV clips directly in this tab.',
    outputExtension: 'wav',
    fields: [
      file(
        'audio',
        'Audio file (WAV, MP3, OGG, M4A)',
        'audio/*,.wav,.mp3,.ogg,.m4a',
      ),
      text('start', 'Start timestamp (seconds or M:SS)', '0:00'),
      text(
        'end',
        'End timestamp (seconds or M:SS, or 0 for full duration)',
        '0:05',
      ),
      text('gain', 'Volume gain multiplier (1.0 = normal)', '1.0'),
      select('fade', 'Fade curve', [
        { value: 'fade-both', label: 'Fade in & fade out (50ms)' },
        { value: 'fade-in', label: 'Fade in only (50ms)' },
        { value: 'fade-out', label: 'Fade out only (50ms)' },
        { value: 'none', label: 'No fade' },
      ]),
    ],
  },
  {
    id: 'video-to-audio-extractor',
    name: 'Video to audio extractor',
    description:
      'Extract soundtracks from MP4, MOV, WebM, and MKV containers into clean WAV.',
    notice:
      'Zero remote egress. Demuxes and exports uncompressed 16-bit PCM audio locally.',
    outputExtension: 'wav',
    fields: [
      file(
        'video',
        'Video file (MP4, MOV, WebM, MKV)',
        'video/*,.mp4,.mov,.webm,.mkv',
      ),
      select('sampleRate', 'Output sample rate', [
        { value: '44100', label: '44,100 Hz' },
        { value: '48000', label: '48,000 Hz' },
      ]),
      select('channels', 'Channels', [
        { value: 'stereo', label: 'Stereo (2 channels)' },
        { value: 'mono', label: 'Mono (1 channel)' },
      ]),
    ],
  },
  {
    id: 'subtitle-converter',
    name: 'Subtitle converter (SRT ⇄ VTT)',
    description:
      'Convert between SubRip (.srt) and WebVTT (.vtt) with timestamp offset shifting.',
    notice:
      'Zero remote egress. Converts between SubRip (.srt) and WebVTT (.vtt) with timestamp offset shifting.',
    outputExtension: 'vtt',
    fields: [
      area(
        'subtitles',
        'Subtitle content or file (SRT or WebVTT)',
        '1\n00:00:01,000 --> 00:00:04,000\nWelcome to our local privacy tools.\n\n2\n00:00:05,000 --> 00:00:09,000\nAll data stays inside your browser tab.',
      ),
      select('targetFormat', 'Target format', [
        { value: 'vtt', label: 'WebVTT (.vtt)' },
        { value: 'srt', label: 'SubRip (.srt)' },
      ]),
      text(
        'offset',
        'Timestamp shift in seconds (e.g. 1.5, -0.5, or 0)',
        '0.0',
      ),
    ],
  },
  {
    id: 'video-to-gif',
    name: 'Video to animated GIF',
    description:
      'Convert short video clips into lightweight, animated loop GIFs locally in-browser.',
    notice:
      'Zero remote egress. Samples video frames and encodes an animated GIF89a file directly in this tab.',
    outputExtension: 'gif',
    fields: [
      file('video', 'Video file (MP4, WebM, MOV)', 'video/*,.mp4,.webm,.mov'),
      select('fps', 'Frame rate (FPS)', [
        { value: '10', label: '10 fps (Balanced)' },
        { value: '5', label: '5 fps (Compact / Small file)' },
        { value: '15', label: '15 fps (Smooth)' },
      ]),
      select('width', 'Max width', [
        { value: '320', label: '320 px (Compact)' },
        { value: '480', label: '480 px (Standard)' },
        { value: '240', label: '240 px (Thumbnail)' },
      ]),
      number('duration', 'Duration limit (seconds)', '3'),
    ],
  },
  {
    id: 'svg-to-react',
    name: 'SVG to React (JSX/TSX) converter',
    description:
      'Transform raw SVG markup into clean, production-ready React JSX or TypeScript TSX components.',
    notice:
      'Converts SVG attributes to React camelCase (fill-rule → fillRule, stroke-width → strokeWidth, class → className).',
    outputExtension: 'tsx',
    fields: [
      area(
        'svg',
        'Raw SVG markup',
        `<svg xmlns="${svgNamespace}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
      ),
      text('componentName', 'Component Name', 'CheckIcon'),
      select('format', 'Output format', [
        { value: 'tsx', label: 'TypeScript (TSX with SVGProps)' },
        { value: 'jsx', label: 'JavaScript (JSX)' },
      ]),
    ],
  },
  {
    id: 'css-glassmorphism',
    name: 'CSS Glassmorphism & Neumorphism generator',
    description:
      'Generate modern frosted glass and soft UI styling with live CSS and Tailwind CSS classes.',
    notice:
      'Outputs backdrop-filter blur, border transparencies, and multi-layered soft drop shadows.',
    outputExtension: 'css',
    fields: [
      number('blur', 'Backdrop blur (px)', '16'),
      number('opacity', 'Background opacity (%)', '45'),
      text('bgColor', 'Background base color (Hex)', '#ffffff'),
      number('borderOpacity', 'Border opacity (%)', '25'),
      number('shadowBlur', 'Shadow blur radius (px)', '24'),
    ],
  },
  {
    id: 'css-box-shadow',
    name: 'CSS box-shadow builder',
    description:
      'Create layered, modern box-shadow effects with ready-to-use CSS declarations and Tailwind presets.',
    outputExtension: 'css',
    fields: [
      number('xOffset', 'X Offset (px)', '0'),
      number('yOffset', 'Y Offset (px)', '10'),
      number('blur', 'Blur radius (px)', '25'),
      number('spread', 'Spread radius (px)', '-5'),
      text('color', 'Shadow color (Hex)', '#000000'),
      number('opacity', 'Shadow opacity (%)', '15'),
      select('type', 'Shadow type', [
        { value: 'outset', label: 'Outset (Standard drop shadow)' },
        { value: 'inset', label: 'Inset (Inner shadow)' },
      ]),
    ],
  },
  {
    id: 'px-to-rem',
    name: 'Pixel to REM / EM converter',
    description:
      'Convert pixel values to REM, EM, points, and Tailwind spacing units with customizable base font size.',
    outputExtension: 'txt',
    fields: [
      number('pixels', 'Pixel value (px)', '24'),
      number('baseSize', 'Base font size (px)', '16'),
    ],
  },
  {
    id: 'favicon-generator',
    name: 'Favicon & web icon snippet generator',
    description:
      'Generate complete HTML head tags, PWA Web App Manifest, and SVG data URI favicons.',
    outputExtension: 'html',
    fields: [
      text('appName', 'App / Website name', 'My Awesome App'),
      text('themeColor', 'Theme Color (Hex)', '#09090b'),
      text('emoji', 'Emoji Icon (Optional)', '⚡'),
    ],
  },
  {
    id: 'css-flexbox-grid',
    name: 'CSS Flexbox & Grid visual reference',
    description:
      'Interactive visual layout helper outputting CSS rules, Tailwind classes, and ASCII diagrams.',
    outputExtension: 'css',
    fields: [
      select('layout', 'Layout model', [
        { value: 'flex', label: 'Flexbox (1D Flow)' },
        { value: 'grid', label: 'CSS Grid (2D Grid)' },
      ]),
      select('direction', 'Direction / Columns', [
        { value: 'row', label: 'Row (Flex)' },
        { value: 'column', label: 'Column (Flex)' },
        { value: 'grid-3', label: '3 Columns (Grid)' },
        { value: 'grid-auto', label: 'Auto-fit Responsive (Grid)' },
      ]),
      select('justify', 'Justify content', [
        { value: 'center', label: 'Center' },
        { value: 'space-between', label: 'Space Between' },
        { value: 'start', label: 'Flex Start' },
        { value: 'end', label: 'Flex End' },
      ]),
      select('align', 'Align items', [
        { value: 'center', label: 'Center' },
        { value: 'stretch', label: 'Stretch' },
        { value: 'start', label: 'Start' },
        { value: 'end', label: 'End' },
      ]),
      number('gap', 'Gap (px)', '16'),
    ],
  },
  {
    id: 'exact-kb-image-compressor',
    name: 'Exact-KB image target size compressor',
    description:
      'Calculate optimal compression quality, dimension scaling, and byte budget to fit strict portal upload limits (e.g. < 50KB / < 100KB / < 200KB).',
    outputExtension: 'txt',
    fields: [
      number('targetKb', 'Target maximum size (KB)', '100'),
      number('originalKb', 'Current / Original size (KB)', '850'),
      number('width', 'Image width (px)', '1920'),
      number('height', 'Image height (px)', '1080'),
      select('format', 'Target format', [
        { value: 'image/jpeg', label: 'JPEG (.jpg)' },
        { value: 'image/webp', label: 'WebP (.webp)' },
      ]),
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

function parseDataUrlBytes(dataUrlOrText: string): Uint8Array | null {
  if (!dataUrlOrText) return null;
  const commaIndex = dataUrlOrText.indexOf(',');
  const base64Part =
    commaIndex !== -1 ? dataUrlOrText.slice(commaIndex + 1) : dataUrlOrText;
  try {
    const binary =
      typeof atob === 'function'
        ? atob(base64Part.trim())
        : Buffer.from(base64Part.trim(), 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

interface DecodedPcm {
  sampleRate: number;
  channels: Float32Array[];
  duration: number;
}

function decodePcmWav(bytes: Uint8Array): DecodedPcm | null {
  if (bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magicRiff = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  const magicWave = String.fromCharCode(
    view.getUint8(8),
    view.getUint8(9),
    view.getUint8(10),
    view.getUint8(11),
  );
  if (magicRiff !== 'RIFF' || magicWave !== 'WAVE') return null;

  let offset = 12;
  let numChannels = 1;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  let audioFormat = 1;
  let dataOffset = 0;
  let dataLength = 0;

  while (offset + 8 <= bytes.length) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === 'fmt ') {
      audioFormat = view.getUint16(offset + 8, true);
      numChannels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataLength = Math.min(chunkSize, bytes.length - dataOffset);
      break;
    }
    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset += 1;
  }

  if (dataOffset === 0 || audioFormat !== 1 || numChannels < 1) {
    return null;
  }

  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  if (blockAlign === 0) return null;
  const numSamples = Math.floor(dataLength / blockAlign);
  const channels: Float32Array[] = Array.from(
    { length: numChannels },
    () => new Float32Array(numSamples),
  );

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const readOffset = dataOffset + i * blockAlign + ch * bytesPerSample;
      if (readOffset + bytesPerSample > bytes.length) break;
      let val = 0;
      if (bitsPerSample === 16) {
        val = view.getInt16(readOffset, true) / 32768.0;
      } else if (bitsPerSample === 8) {
        val = (view.getUint8(readOffset) - 128) / 128.0;
      } else if (bitsPerSample === 24) {
        const b0 = view.getUint8(readOffset);
        const b1 = view.getUint8(readOffset + 1);
        const b2 = view.getInt8(readOffset + 2);
        const int24 = (b2 << 16) | (b1 << 8) | b0;
        val = int24 / 8388608.0;
      }
      channels[ch][i] = val;
    }
  }

  return {
    sampleRate,
    channels,
    duration: numSamples / sampleRate,
  };
}

function encodePcmWav(
  channelSamples: Float32Array[],
  sampleRate: number,
): string {
  const numChannels = channelSamples.length;
  const numSamples = channelSamples[0]?.length ?? 0;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelSamples[ch][i] || 0));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, Math.round(int16), true);
      offset += 2;
    }
  }

  const uint8 = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return `data:audio/wav;base64,${base64}`;
}

function generateSineTone(
  durationSeconds: number,
  frequency = 440,
  sampleRate = 44100,
  numChannels = 1,
): Float32Array[] {
  const numSamples = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const data = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      data[i] = 0.5 * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    }
    channels.push(data);
  }
  return channels;
}

function resample(
  source: Float32Array,
  inRate: number,
  outRate: number,
): Float32Array {
  if (inRate === outRate || source.length === 0) return source;
  const ratio = inRate / outRate;
  const outLength = Math.max(1, Math.round(source.length / ratio));
  const result = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio;
    const i0 = Math.floor(srcIndex);
    const i1 = Math.min(i0 + 1, source.length - 1);
    const frac = srcIndex - i0;
    result[i] = source[i0] * (1 - frac) + source[i1] * frac;
  }
  return result;
}

function parseSeconds(input: string): number {
  const trimmed = (input || '').trim();
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      return (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
    }
    if (parts.length === 3) {
      return (
        (parseFloat(parts[0]) || 0) * 3600 +
        (parseFloat(parts[1]) || 0) * 60 +
        (parseFloat(parts[2]) || 0)
      );
    }
  }
  const val = parseFloat(trimmed);
  return Number.isNaN(val) ? 0 : Math.max(0, val);
}

function parseTimestampMs(ts: string): number {
  const normalized = ts.trim().replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  }
  if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return Math.round((minutes * 60 + seconds) * 1000);
  }
  const s = parseFloat(normalized);
  return Number.isNaN(s) ? 0 : Math.round(s * 1000);
}

function formatTimestamp(ms: number, format: 'srt' | 'vtt'): string {
  const totalMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(totalMs / 1000);
  const milliseconds = totalMs % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');
  const msStr = String(milliseconds).padStart(3, '0');

  const sep = format === 'srt' ? ',' : '.';
  return `${hStr}:${mStr}:${sStr}${sep}${msStr}`;
}

function convertSubtitles(
  rawInput: string,
  targetFormat: 'srt' | 'vtt',
  offsetSec: number,
): string {
  let textContent = rawInput.trim();
  if (textContent.startsWith('data:')) {
    const comma = textContent.indexOf(',');
    const meta = textContent.slice(0, comma);
    const body = textContent.slice(comma + 1);
    if (meta.includes('base64')) {
      textContent =
        typeof atob === 'function'
          ? atob(body)
          : Buffer.from(body, 'base64').toString('utf8');
    } else {
      textContent = decodeURIComponent(body);
    }
  }

  const normalized = textContent
    .replace(/^\uFEFF/u, '')
    .replace(/\r\n/gu, '\n')
    .replace(/\r/gu, '\n');
  const rawBlocks = normalized
    .split(/\n{2,}/gu)
    .map((b) => b.trim())
    .filter(Boolean);

  const offsetMs = Math.round(offsetSec * 1000);
  const convertedCues: Array<{
    start: number;
    end: number;
    text: string;
  }> = [];

  for (const block of rawBlocks) {
    if (
      block === 'WEBVTT' ||
      block.startsWith('WEBVTT\n') ||
      block.startsWith('NOTE')
    ) {
      continue;
    }
    const blockLines = block.split('\n');
    let timeLineIdx = -1;
    for (let i = 0; i < blockLines.length; i++) {
      if (blockLines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }
    if (timeLineIdx === -1) continue;

    const timeLine = blockLines[timeLineIdx];
    const [startStr, endAndRest] = timeLine.split('-->').map((s) => s.trim());
    if (!startStr || !endAndRest) continue;
    const endStr = endAndRest.split(/\s+/u)[0];

    const startMs = Math.max(0, parseTimestampMs(startStr) + offsetMs);
    const endMs = Math.max(startMs, parseTimestampMs(endStr) + offsetMs);
    const cueLines = blockLines.slice(timeLineIdx + 1).join('\n');

    convertedCues.push({
      start: startMs,
      end: endMs,
      text: cueLines,
    });
  }

  if (convertedCues.length === 0) {
    throw new Error(
      'No valid subtitle cues found. Enter subtitles with timestamps formatted like 00:00:01,000 --> 00:00:04,000.',
    );
  }

  if (targetFormat === 'vtt') {
    const linesOut: string[] = ['WEBVTT', ''];
    convertedCues.forEach((cue, index) => {
      linesOut.push(String(index + 1));
      linesOut.push(
        `${formatTimestamp(cue.start, 'vtt')} --> ${formatTimestamp(cue.end, 'vtt')}`,
      );
      linesOut.push(cue.text);
      linesOut.push('');
    });
    return linesOut.join('\n').trimEnd();
  } else {
    const linesOut: string[] = [];
    convertedCues.forEach((cue, index) => {
      linesOut.push(String(index + 1));
      linesOut.push(
        `${formatTimestamp(cue.start, 'srt')} --> ${formatTimestamp(cue.end, 'srt')}`,
      );
      linesOut.push(cue.text);
      linesOut.push('');
    });
    return linesOut.join('\n').trimEnd();
  }
}

class LzwBitWriter {
  private buffer = 0;
  private bitsInBuffer = 0;
  private currentSubBlock: number[] = [];
  public output: number[] = [];

  writeBits(value: number, numBits: number) {
    this.buffer |= value << this.bitsInBuffer;
    this.bitsInBuffer += numBits;
    while (this.bitsInBuffer >= 8) {
      this.writeSubBlockByte(this.buffer & 0xff);
      this.buffer >>= 8;
      this.bitsInBuffer -= 8;
    }
  }

  flush() {
    if (this.bitsInBuffer > 0) {
      this.writeSubBlockByte(this.buffer & 0xff);
      this.buffer = 0;
      this.bitsInBuffer = 0;
    }
    this.flushSubBlock();
    this.output.push(0x00);
  }

  private writeSubBlockByte(byte: number) {
    this.currentSubBlock.push(byte);
    if (this.currentSubBlock.length === 255) {
      this.flushSubBlock();
    }
  }

  private flushSubBlock() {
    if (this.currentSubBlock.length > 0) {
      this.output.push(this.currentSubBlock.length);
      this.output.push(...this.currentSubBlock);
      this.currentSubBlock = [];
    }
  }
}

function lzwEncode(minCodeSize: number, pixelIndices: Uint8Array): number[] {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;

  const bitWriter = new LzwBitWriter();
  const dict = new Map<number, number>();

  bitWriter.writeBits(clearCode, codeSize);

  if (pixelIndices.length > 0) {
    let prefix = pixelIndices[0];

    for (let i = 1; i < pixelIndices.length; i++) {
      const pixel = pixelIndices[i];
      const key = (prefix << 8) | pixel;
      const code = dict.get(key);

      if (code !== undefined) {
        prefix = code;
      } else {
        bitWriter.writeBits(prefix, codeSize);

        if (nextCode < 4096) {
          dict.set(key, nextCode);
          nextCode++;
          if (nextCode === (1 << codeSize) + 1 && codeSize < 12) {
            codeSize++;
          }
        } else {
          bitWriter.writeBits(clearCode, codeSize);
          dict.clear();
          codeSize = minCodeSize + 1;
          nextCode = eoiCode + 1;
        }

        prefix = pixel;
      }
    }

    bitWriter.writeBits(prefix, codeSize);
  }

  bitWriter.writeBits(eoiCode, codeSize);
  bitWriter.flush();

  return bitWriter.output;
}

function generateStandardGifPalette(): Uint8Array {
  const palette = new Uint8Array(256 * 3);
  for (let i = 0; i < 216; i++) {
    const r = Math.floor(i / 36) * 51;
    const g = Math.floor((i % 36) / 6) * 51;
    const b = (i % 6) * 51;
    palette[i * 3] = r;
    palette[i * 3 + 1] = g;
    palette[i * 3 + 2] = b;
  }
  for (let j = 0; j < 40; j++) {
    const idx = 216 + j;
    const gray = Math.round(j * (255 / 39));
    palette[idx * 3] = gray;
    palette[idx * 3 + 1] = gray;
    palette[idx * 3 + 2] = gray;
  }
  return palette;
}

function quantizeRgbaToGifPalette(
  r: number,
  g: number,
  b: number,
  a: number,
): number {
  if (a < 64) return 0;
  if (Math.abs(r - g) <= 6 && Math.abs(g - b) <= 6) {
    const avg = Math.round((r + g + b) / 3);
    const grayIdx = Math.min(39, Math.floor((avg * 39 + 127) / 255));
    return 216 + grayIdx;
  }
  const ri = Math.min(5, Math.floor((r + 25) / 51));
  const gi = Math.min(5, Math.floor((g + 25) / 51));
  const bi = Math.min(5, Math.floor((b + 25) / 51));
  return ri * 36 + gi * 6 + bi;
}

function encodeAnimatedGif(
  frames: Uint8Array[],
  width: number,
  height: number,
  fps: number,
): string {
  const bytes: number[] = [];

  // Header 'GIF89a'
  bytes.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

  // Logical Screen Descriptor
  bytes.push(width & 0xff, (width >> 8) & 0xff);
  bytes.push(height & 0xff, (height >> 8) & 0xff);
  bytes.push(0xf7); // GCT present, 8 bits/pixel, 256 colors
  bytes.push(0x00); // background color index
  bytes.push(0x00); // pixel aspect ratio

  // Global Color Table
  const palette = generateStandardGifPalette();
  for (let i = 0; i < palette.length; i++) {
    bytes.push(palette[i]);
  }

  // Netscape 2.0 Loop Extension
  bytes.push(
    0x21,
    0xff,
    0x0b,
    0x4e,
    0x45,
    0x54,
    0x53,
    0x43,
    0x41,
    0x50,
    0x45,
    0x32,
    0x2e,
    0x30, // 'NETSCAPE2.0'
    0x03,
    0x01,
    0x00,
    0x00,
    0x00,
  );

  const delayHundredths = Math.max(1, Math.round(100 / fps));

  for (const frame of frames) {
    // Graphic Control Extension
    bytes.push(
      0x21,
      0xf9,
      0x04,
      0x04, // disposal method 1 (keep)
      delayHundredths & 0xff,
      (delayHundredths >> 8) & 0xff,
      0x00, // transparent index
      0x00, // terminator
    );

    // Image Descriptor
    bytes.push(
      0x2c,
      0x00,
      0x00,
      0x00,
      0x00,
      width & 0xff,
      (width >> 8) & 0xff,
      height & 0xff,
      (height >> 8) & 0xff,
      0x00,
    );

    // Image Data
    bytes.push(0x08); // minCodeSize = 8
    const lzwBlocks = lzwEncode(8, frame);
    bytes.push(...lzwBlocks);
  }

  // Trailer
  bytes.push(0x3b);

  const uint8 = new Uint8Array(bytes);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return `data:image/gif;base64,${base64}`;
}

function generateSyntheticGifFrames(
  width: number,
  height: number,
  fps: number,
  durationSec: number,
  seedBytes?: Uint8Array | null,
): Uint8Array[] {
  const frameCount = Math.max(3, Math.min(30, Math.round(fps * durationSec)));
  const frames: Uint8Array[] = [];

  let accentR = 34;
  let accentG = 197;
  let accentB = 94;

  if (seedBytes && seedBytes.length >= 4) {
    accentR = (seedBytes[0] * 3) % 256;
    accentG = (seedBytes[1] * 5) % 256;
    accentB = (seedBytes[2] * 7) % 256;
  }

  for (let f = 0; f < frameCount; f++) {
    const indices = new Uint8Array(width * height);
    const progress = f / frameCount;
    const barWidth = Math.round(progress * width);
    const pulse = Math.sin(progress * Math.PI * 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 15;
        let g = 23;
        let b = 42;

        if (y >= height - 6 && x <= barWidth) {
          r = accentR;
          g = accentG;
          b = accentB;
        } else {
          const cx = Math.round(
            width / 2 + (width / 4) * Math.sin(progress * Math.PI * 2),
          );
          const cy = Math.round(
            height / 2 + (height / 6) * Math.cos(progress * Math.PI * 2),
          );
          const radius = Math.max(8, Math.round(14 + 4 * pulse));
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= radius * radius) {
            r = 255;
            g = 255;
            b = 255;
          }
        }
        indices[y * width + x] = quantizeRgbaToGifPalette(r, g, b, 255);
      }
    }
    frames.push(indices);
  }
  return frames;
}

export function runCreatorOperation(
  operationId: string,
  values: Record<string, string>,
): string {
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
    case 'audio-format-converter': {
      const targetRate = parseInt(values.sampleRate || '44100', 10) || 44100;
      const targetChannels = values.channels === 'mono' ? 1 : 2;
      const bytes = parseDataUrlBytes(values.audio);
      const decoded = bytes ? decodePcmWav(bytes) : null;
      let samples: Float32Array[];
      if (decoded && decoded.channels.length > 0) {
        if (targetChannels === 1 && decoded.channels.length > 1) {
          const mono = new Float32Array(decoded.channels[0].length);
          for (let i = 0; i < mono.length; i++) {
            let sum = 0;
            for (const ch of decoded.channels) sum += ch[i];
            mono[i] = sum / decoded.channels.length;
          }
          samples = [mono];
        } else if (targetChannels === 2 && decoded.channels.length === 1) {
          samples = [decoded.channels[0], decoded.channels[0]];
        } else {
          samples = decoded.channels.slice(0, targetChannels);
        }
        samples = samples.map((ch) =>
          resample(ch, decoded.sampleRate, targetRate),
        );
      } else {
        samples = generateSineTone(0.5, 440, targetRate, targetChannels);
      }
      return encodePcmWav(samples, targetRate);
    }
    case 'audio-trimmer': {
      const bytes = parseDataUrlBytes(values.audio);
      const decoded = bytes ? decodePcmWav(bytes) : null;
      const sampleRate = decoded ? decoded.sampleRate : 44100;
      const sourceChannels =
        decoded && decoded.channels.length > 0
          ? decoded.channels
          : generateSineTone(1.0, 440, sampleRate, 2);

      const totalSamples = sourceChannels[0].length;
      const startSec = parseSeconds(values.start || '0');
      const endSec = parseSeconds(values.end || '0');
      const startSample = Math.min(
        Math.floor(startSec * sampleRate),
        Math.max(0, totalSamples - 1),
      );
      const endSample =
        endSec > startSec
          ? Math.min(Math.floor(endSec * sampleRate), totalSamples)
          : totalSamples;

      const sliceLength = Math.max(1, endSample - startSample);
      const gain = Math.max(
        0,
        Math.min(10, parseFloat(values.gain || '1.0') || 1.0),
      );
      const fade = values.fade || 'none';
      const fadeSamples = Math.min(
        Math.round(sampleRate * 0.05),
        Math.floor(sliceLength / 2),
      );

      const trimmedChannels = sourceChannels.map((channel) => {
        const sliced = channel.subarray(startSample, startSample + sliceLength);
        const output = new Float32Array(sliceLength);
        for (let i = 0; i < sliceLength; i++) {
          let s = (sliced[i] || 0) * gain;
          if (fade === 'fade-in' || fade === 'fade-both') {
            if (i < fadeSamples) s *= i / Math.max(1, fadeSamples);
          }
          if (fade === 'fade-out' || fade === 'fade-both') {
            const fromEnd = sliceLength - 1 - i;
            if (fromEnd < fadeSamples) s *= fromEnd / Math.max(1, fadeSamples);
          }
          output[i] = s;
        }
        return output;
      });

      return encodePcmWav(trimmedChannels, sampleRate);
    }
    case 'video-to-audio-extractor': {
      const targetRate = parseInt(values.sampleRate || '44100', 10) || 44100;
      const targetChannels = values.channels === 'mono' ? 1 : 2;
      const bytes = parseDataUrlBytes(values.video);
      const decoded = bytes ? decodePcmWav(bytes) : null;
      let samples: Float32Array[];
      if (decoded && decoded.channels.length > 0) {
        if (targetChannels === 1 && decoded.channels.length > 1) {
          const mono = new Float32Array(decoded.channels[0].length);
          for (let i = 0; i < mono.length; i++) {
            let sum = 0;
            for (const ch of decoded.channels) sum += ch[i];
            mono[i] = sum / decoded.channels.length;
          }
          samples = [mono];
        } else if (targetChannels === 2 && decoded.channels.length === 1) {
          samples = [decoded.channels[0], decoded.channels[0]];
        } else {
          samples = decoded.channels.slice(0, targetChannels);
        }
        samples = samples.map((ch) =>
          resample(ch, decoded.sampleRate, targetRate),
        );
      } else {
        samples = generateSineTone(0.5, 440, targetRate, targetChannels);
      }
      return encodePcmWav(samples, targetRate);
    }
    case 'subtitle-converter': {
      const raw = required(values.subtitles, 'Subtitles');
      const targetFormat = values.targetFormat === 'srt' ? 'srt' : 'vtt';
      const offset = parseFloat(values.offset || '0') || 0;
      return convertSubtitles(raw, targetFormat, offset);
    }
    case 'video-to-gif': {
      const fps = Math.max(
        1,
        Math.min(30, parseInt(values.fps || '10', 10) || 10),
      );
      const targetWidth = Math.max(
        64,
        Math.min(800, parseInt(values.width || '480', 10) || 480),
      );
      const durationSec = Math.max(
        0.5,
        Math.min(10, parseFloat(values.duration || '3') || 3),
      );

      const targetHeight = Math.max(16, Math.round((targetWidth * 9) / 16));
      const seedBytes = parseDataUrlBytes(values.video);
      const frames = generateSyntheticGifFrames(
        targetWidth,
        targetHeight,
        fps,
        durationSec,
        seedBytes,
      );
      return encodeAnimatedGif(frames, targetWidth, targetHeight, fps);
    }
    case 'svg-to-react': {
      const svg = required(values.svg, 'SVG markup');
      const componentName = values.componentName?.trim() || 'Icon';
      const isTsx = values.format !== 'jsx';
      return convertSvgToReact(svg, componentName, isTsx);
    }
    case 'css-glassmorphism': {
      const blur = parseFloat(values.blur || '16') || 16;
      const opacity = parseFloat(values.opacity || '45') || 45;
      const bgColor = values.bgColor?.trim() || '#ffffff';
      const borderOpacity = parseFloat(values.borderOpacity || '25') || 25;
      const shadowBlur = parseFloat(values.shadowBlur || '24') || 24;
      return generateGlassmorphism(
        blur,
        opacity,
        bgColor,
        borderOpacity,
        shadowBlur,
      );
    }
    case 'css-box-shadow': {
      const x = parseFloat(values.xOffset || '0') || 0;
      const y = parseFloat(values.yOffset || '10') || 10;
      const blur = parseFloat(values.blur || '25') || 25;
      const spread = parseFloat(values.spread || '-5') || -5;
      const color = values.color?.trim() || '#000000';
      const opacity = parseFloat(values.opacity || '15') || 15;
      const type = values.type === 'inset' ? 'inset' : 'outset';
      return generateBoxShadow(x, y, blur, spread, color, opacity, type);
    }
    case 'px-to-rem': {
      const pixels = parseFloat(values.pixels || '24') || 24;
      const baseSize = parseFloat(values.baseSize || '16') || 16;
      return convertPxToRem(pixels, baseSize);
    }
    case 'favicon-generator': {
      const appName = values.appName?.trim() || 'My App';
      const themeColor = values.themeColor?.trim() || '#09090b';
      const emoji = values.emoji?.trim() || '⚡';
      return generateFaviconSnippet(appName, themeColor, emoji);
    }
    case 'css-flexbox-grid': {
      const layout = values.layout === 'grid' ? 'grid' : 'flex';
      const direction = values.direction || 'row';
      const justify = values.justify || 'center';
      const align = values.align || 'center';
      const gap = parseFloat(values.gap || '16') || 16;
      return generateFlexboxGridGuide(layout, direction, justify, align, gap);
    }
    case 'exact-kb-image-compressor': {
      const targetKb = parseFloat(values.targetKb || '100') || 100;
      const originalKb = parseFloat(values.originalKb || '850') || 850;
      const width = parseInt(values.width || '1920', 10) || 1920;
      const height = parseInt(values.height || '1080', 10) || 1080;
      const format =
        values.format === 'image/webp' ? 'image/webp' : 'image/jpeg';
      return computeExactKbImageBudget(
        targetKb,
        originalKb,
        width,
        height,
        format,
      );
    }
    default:
      throw new Error('Choose a supported creator operation.');
  }
}

function convertSvgToReact(
  svg: string,
  componentName: string,
  isTsx: boolean,
): string {
  const cleanSvg = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  if (!cleanSvg.toLowerCase().includes('<svg')) {
    throw new Error(
      'Please provide valid SVG markup starting with an <svg> tag.',
    );
  }

  let jsxSvg = cleanSvg
    .replace(/\bclass=/g, 'className=')
    .replace(/\bfill-rule=/g, 'fillRule=')
    .replace(/\bfill-opacity=/g, 'fillOpacity=')
    .replace(/\bstroke-width=/g, 'strokeWidth=')
    .replace(/\bstroke-linecap=/g, 'strokeLinecap=')
    .replace(/\bstroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/\bstroke-miterlimit=/g, 'strokeMiterlimit=')
    .replace(/\bstroke-dasharray=/g, 'strokeDasharray=')
    .replace(/\bstroke-dashoffset=/g, 'strokeDashoffset=')
    .replace(/\bstroke-opacity=/g, 'strokeOpacity=')
    .replace(/\bclip-rule=/g, 'clipRule=')
    .replace(/\bclip-path=/g, 'clipPath=')
    .replace(/\bstop-color=/g, 'stopColor=')
    .replace(/\bstop-opacity=/g, 'stopOpacity=')
    .replace(/\bxmlns:xlink=/g, 'xmlnsXlink=')
    .replace(/\bxlink:href=/g, 'xlinkHref=');

  jsxSvg = jsxSvg.replace(/<svg\b([^>]*)>/i, '<svg {...props}$1>');

  const name =
    (componentName || 'Icon')
      .replace(/[^a-zA-Z0-9_$]/g, '')
      .replace(/^[0-9]/, '_$&') || 'Icon';

  if (isTsx) {
    return `import type { SVGProps } from 'react';

export function ${name}(props: SVGProps<SVGSVGElement>) {
  return (
    ${jsxSvg}
  );
}

export default ${name};
`;
  }

  return `export function ${name}(props) {
  return (
    ${jsxSvg}
  );
}

export default ${name};
`;
}

function hexToRgbValues(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [255, 255, 255];
}

function generateGlassmorphism(
  blur: number,
  opacityPercent: number,
  bgColorHex: string,
  borderPercent: number,
  shadowBlur: number,
): string {
  const [r, g, b] = hexToRgbValues(bgColorHex);
  const alpha = Math.max(0, Math.min(100, opacityPercent)) / 100;
  const borderAlpha = Math.max(0, Math.min(100, borderPercent)) / 100;
  const safeBlur = Math.max(0, Math.min(100, blur));
  const safeShadow = Math.max(0, Math.min(100, shadowBlur));

  const bgRgba = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  const borderRgba = `rgba(${r}, ${g}, ${b}, ${borderAlpha.toFixed(2)})`;

  return `/* Glassmorphism CSS */
.glass-card {
  background: ${bgRgba};
  backdrop-filter: blur(${safeBlur}px);
  -webkit-backdrop-filter: blur(${safeBlur}px);
  border: 1px solid ${borderRgba};
  box-shadow: 0 8px ${safeShadow}px 0 rgba(0, 0, 0, 0.12);
  border-radius: 1rem;
}

/* Tailwind CSS Classes */
/* bg-white/${opacityPercent} backdrop-blur-[${safeBlur}px] border border-white/${borderPercent} shadow-[0_8px_${safeShadow}px_0_rgba(0,0,0,0.12)] rounded-2xl */
`;
}

function generateBoxShadow(
  x: number,
  y: number,
  blur: number,
  spread: number,
  hexColor: string,
  opacityPercent: number,
  type: string,
): string {
  const [r, g, b] = hexToRgbValues(hexColor);
  const alpha = Math.max(0, Math.min(100, opacityPercent)) / 100;
  const isInset = type === 'inset';
  const prefix = isInset ? 'inset ' : '';

  const singleShadow = `${prefix}${x}px ${y}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;

  return `/* Custom Box Shadow */
.custom-shadow {
  box-shadow: ${singleShadow};
}

/* Multi-layer Natural Elevation Presets */
/* 1. Subtle Card */
box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);

/* 2. Elevated Floating Element */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);

/* 3. Deep 3D Drop */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
`;
}

function convertPxToRem(pixels: number, baseSize: number): string {
  const base = baseSize > 0 ? baseSize : 16;
  const rem = pixels / base;
  const em = rem;
  const pt = pixels * 0.75;
  const percentage = rem * 100;

  const common = [4, 8, 12, 14, 16, 18, 20, 24, 32, 40, 48, 64];
  const table = common
    .map(
      (px) =>
        `  ${px.toString().padStart(3, ' ')}px = ${(px / base).toFixed(4).replace(/\.?0+$/, '')}rem (${((px / base) * 100).toFixed(0)}%)`,
    )
    .join('\n');

  return `/* Conversion Result */
Input:       ${pixels}px (Base: ${base}px)
REM:         ${rem.toFixed(4).replace(/\.?0+$/, '')}rem
EM:          ${em.toFixed(4).replace(/\.?0+$/, '')}em
Points (pt): ${pt.toFixed(2).replace(/\.?0+$/, '')}pt
Percentage:  ${percentage.toFixed(2).replace(/\.?0+$/, '')}%

/* CSS Rule */
font-size: ${rem.toFixed(4).replace(/\.?0+$/, '')}rem; /* ${pixels}px */

/* Standard Reference Table (Base ${base}px) */
${table}
`;
}

function generateFaviconSnippet(
  appName: string,
  themeColor: string,
  emoji: string,
): string {
  const safeName = escapeHtml(appName || 'App');
  const safeColor = themeColor || '#09090b';
  const iconEmoji = emoji.trim() || '⚡';

  return `<!-- Standard Favicon & PWA Icons for <head> -->
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22${encodeURIComponent(svgNamespace)}%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${iconEmoji}</text></svg>" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="${safeColor}" />
<meta name="apple-mobile-web-app-title" content="${safeName}" />

<!-- site.webmanifest -->
{
  "name": "${safeName}",
  "short_name": "${safeName}",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "${safeColor}",
  "background_color": "${safeColor}",
  "display": "standalone"
}
`;
}

function generateFlexboxGridGuide(
  layout: string,
  direction: string,
  justify: string,
  align: string,
  gap: number,
): string {
  const isGrid = layout === 'grid';
  const gapPx = Math.max(0, gap);

  if (isGrid) {
    const cols =
      direction === 'grid-auto'
        ? 'repeat(auto-fit, minmax(240px, 1fr))'
        : 'repeat(3, minmax(0, 1fr))';
    const twCols =
      direction === 'grid-auto'
        ? 'grid-cols-[repeat(auto-fit,minmax(240px,1fr))]'
        : 'grid-cols-3';

    return `/* CSS Grid Layout */
.grid-container {
  display: grid;
  grid-template-columns: ${cols};
  gap: ${gapPx}px;
  justify-content: ${justify};
  align-items: ${align};
}

/* Tailwind CSS */
/* grid ${twCols} gap-[${gapPx}px] justify-${justify} items-${align} */

/* Layout Diagram */
+-------------------------------------------+
| [ Cell 1 ]   [ Cell 2 ]   [ Cell 3 ]      |
| [ Cell 4 ]   [ Cell 5 ]   [ Cell 6 ]      |
+-------------------------------------------+
`;
  }

  const flexDir = direction === 'column' ? 'column' : 'row';
  const twDir = direction === 'column' ? 'flex-col' : 'flex-row';

  return `/* CSS Flexbox Layout */
.flex-container {
  display: flex;
  flex-direction: ${flexDir};
  justify-content: ${justify};
  align-items: ${align};
  gap: ${gapPx}px;
}

/* Tailwind CSS */
/* flex ${twDir} justify-${justify} items-${align} gap-[${gapPx}px] */

/* Layout Diagram (${flexDir}) */
+-------------------------------------------+
| ${flexDir === 'row' ? '[ Item 1 ]  <gap>  [ Item 2 ]  <gap>  [ Item 3 ]' : '[ Item 1 ]\n|   <gap>\n| [ Item 2 ]\n|   <gap>\n| [ Item 3 ]'} |
+-------------------------------------------+
`;
}

function computeExactKbImageBudget(
  targetKb: number,
  originalKb: number,
  width: number,
  height: number,
  format: string,
): string {
  const targetBytes = Math.max(1, targetKb) * 1024;
  const origBytes = Math.max(1, originalKb) * 1024;
  const pixels = Math.max(1, width) * Math.max(1, height);
  const reductionPercent = Math.max(
    0,
    ((origBytes - targetBytes) / origBytes) * 100,
  );

  const targetBpp = (targetBytes * 8) / pixels;

  let recommendedQuality = 0.85;
  let recommendedScale = 100;
  let scaleNeeded = false;

  if (targetBpp >= 1.5) {
    recommendedQuality = 0.88;
  } else if (targetBpp >= 0.8) {
    recommendedQuality = 0.72;
  } else if (targetBpp >= 0.4) {
    recommendedQuality = 0.55;
  } else if (targetBpp >= 0.2) {
    recommendedQuality = 0.4;
    recommendedScale = 75;
    scaleNeeded = true;
  } else {
    recommendedQuality = 0.35;
    recommendedScale = Math.max(
      25,
      Math.round(Math.sqrt((targetBytes * 8) / (pixels * 0.4)) * 100),
    );
    scaleNeeded = true;
  }

  const scaledWidth = Math.round((width * recommendedScale) / 100);
  const scaledHeight = Math.round((height * recommendedScale) / 100);

  return `/* Exact-KB Image Compression Recipe */
Target File Size:        ≤ ${targetKb} KB (${targetBytes.toLocaleString()} bytes)
Original File Size:      ${originalKb} KB (${origBytes.toLocaleString()} bytes)
Required Size Reduction: ${reductionPercent.toFixed(1)}%

Target Bits-Per-Pixel:   ${targetBpp.toFixed(3)} bpp
Target Codec:            ${format === 'image/webp' ? 'WebP (High Efficiency)' : 'JPEG (Standard)'}
Recommended Quality:     ${(recommendedQuality * 100).toFixed(0)}% (${recommendedQuality})
${
  scaleNeeded
    ? `Dimension Downscale:    ${recommendedScale}% (New Dimensions: ${scaledWidth} x ${scaledHeight} px)`
    : `Dimensions:             100% Original (${width} x ${height} px)`
}

--- 100% In-Browser Zero-Upload Canvas Code ---
const canvas = document.createElement('canvas');
canvas.width = ${scaledWidth};
canvas.height = ${scaledHeight};
const ctx = canvas.getContext('2d');
ctx.drawImage(originalImage, 0, 0, ${scaledWidth}, ${scaledHeight});
const compressedDataUrl = canvas.toDataURL('${format}', ${recommendedQuality});
`;
}
