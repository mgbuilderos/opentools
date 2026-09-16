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
    id: 'audio-trimmer',
    name: 'Audio trimmer & cutter',
    description:
      'Trim start/end timestamps, adjust gain, and apply anti-pop crossfades.',
    notice:
      'Zero remote egress. Trims uncompressed PCM WAV files and exports WAV clips in this tab. Other audio formats are not supported.',
    outputExtension: 'wav',
    fields: [
      file('audio', 'WAV audio file (uncompressed PCM)', 'audio/wav,.wav'),
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
    id: 'app-store-mockup-generator',
    name: 'App Store & Play Store screenshot mockup generator',
    description:
      'Generate clean marketing screenshot frames with smartphone hardware bezels, gradient backgrounds, and high-impact marketing header taglines in SVG format.',
    outputExtension: 'svg',
    fields: [
      text('appName', 'App / Product Name', 'OpenTools Mobile'),
      text(
        'tagline',
        'Headline / Benefit Tagline',
        'Private Offline Utilities in Your Pocket',
      ),
      text(
        'subheadline',
        'Sub-headline / Detail',
        '100% Client-Side • Zero Data Collection • Lightning Fast',
      ),
      select('deviceFrame', 'Device Frame & Bezel', [
        {
          value: 'modern-phone-notch',
          label: 'Modern Smartphone (Dynamic Island / Notch)',
        },
        {
          value: 'minimal-bezel',
          label: 'Minimalist Bezel (Clean Wireframe)',
        },
        { value: 'tablet', label: 'Tablet Screen Frame' },
      ]),
      select('themeColor', 'Background Gradient Theme', [
        { value: 'slate-zinc', label: 'Slate & Zinc (Monochrome)' },
        { value: 'midnight-blue', label: 'Midnight Blue & Indigo' },
        { value: 'emerald-teal', label: 'Emerald & Teal' },
        { value: 'sunset-orange', label: 'Sunset & Amber' },
        { value: 'violet-purple', label: 'Violet & Purple Glow' },
      ]),
      select('screenPlaceholder', 'Mockup Screen Content', [
        {
          value: 'analytics-dashboard',
          label: 'Analytics & Metric Cards',
        },
        { value: 'chat-feed', label: 'Chat & Message Thread' },
        { value: 'task-kanban', label: 'Tasks & Productivity List' },
      ]),
    ],
  },
  {
    id: 'social-media-post-formatter',
    name: 'Social media Unicode text formatter (LinkedIn, X, Instagram)',
    description:
      'Transform plain text into Unicode bold, italic, monospace, script, circled, and bulleted lists for social posts without formatting tools.',
    fields: [
      area(
        'text',
        'Post text to format',
        '🚀 Building in Public:\n\n1. 100% client-side privacy\n2. Zero file uploads to servers\n3. Free forever for developers\n\nCheck out OpenTools today!',
      ),
      select('style', 'Typography Style', [
        { value: 'bold-sans', label: 'Bold Sans-Serif (𝗛𝗲𝗹𝗹𝗼 𝗪𝗼𝗿𝗹𝗱)' },
        { value: 'bold-serif', label: 'Bold Serif (𝐇𝐞𝐥𝐥𝐨 𝐖𝐨𝐫𝐥𝐝)' },
        { value: 'italic-sans', label: 'Italic Sans-Serif (𝘏𝘦𝘭𝘭𝘰 𝘞𝘰𝘳𝘭𝘥)' },
        { value: 'italic-serif', label: 'Italic Serif (𝐻𝑒𝓁𝓁𝑜 𝒲𝑜𝓇𝓁𝒹)' },
        { value: 'bold-italic-sans', label: 'Bold Italic Sans (𝙃𝙚𝙡𝙡𝙤 𝙒𝙤𝙧𝙡𝙙)' },
        { value: 'monospace', label: 'Monospace (𝙷𝚎𝚕𝚕𝚘 𝚆𝚘𝚛𝚕𝚍)' },
        { value: 'script-bold', label: 'Script Bold / Cursive ( Hello 𝓦orld)' },
        { value: 'circled', label: 'Circled / Bubble (Ⓗⓔⓛⓛⓞ Ⓦⓞⓡⓛⓓ)' },
        { value: 'squared', label: 'Squared / Boxed (🄷🄴🄻🄻🄾 🅆🄾🅁🄻🄳)' },
        { value: 'strikethrough', label: 'Strikethrough (H̶e̶l̶l̶o̶)' },
        { value: 'underline', label: 'Underline (H̲e̲l̲l̲o̲)' },
      ]),
      select('bulletStyle', 'List Bullet Style', [
        { value: 'none', label: 'Keep original bullets / numbers' },
        { value: 'bullet-disc', label: 'Solid Disc (•)' },
        { value: 'bullet-arrow', label: 'Arrow (➤)' },
        { value: 'bullet-check', label: 'Checkmark (✓)' },
        { value: 'bullet-star', label: 'Star (★)' },
        { value: 'numbered-circled', label: 'Circled Numbers (① ② ③)' },
      ]),
    ],
    outputExtension: 'txt',
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
    case 'audio-trimmer': {
      const bytes = parseDataUrlBytes(values.audio);
      if (!bytes || bytes.length === 0)
        throw new Error('Choose a WAV audio file to trim.');
      const decoded = decodePcmWav(bytes);
      if (!decoded || decoded.channels.length === 0)
        throw new Error(
          'Only uncompressed PCM WAV files are supported. Convert the audio to WAV first.',
        );
      const sampleRate = decoded.sampleRate;
      const sourceChannels = decoded.channels;

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
    case 'subtitle-converter': {
      const raw = required(values.subtitles, 'Subtitles');
      const targetFormat = values.targetFormat === 'srt' ? 'srt' : 'vtt';
      const offset = parseFloat(values.offset || '0') || 0;
      return convertSubtitles(raw, targetFormat, offset);
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
    case 'app-store-mockup-generator': {
      return generateAppStoreMockupSvg(values);
    }
    case 'social-media-post-formatter': {
      return formatSocialMediaPost(values);
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

function generateAppStoreMockupSvg(values: Record<string, string>): string {
  const appName = escapeXml(values.appName?.trim() || 'App Name');
  const tagline = escapeXml(
    values.tagline?.trim() || 'Headline / Benefit Tagline',
  );
  const subheadline = escapeXml(
    values.subheadline?.trim() || 'Sub-headline / Detail',
  );
  const frame = values.deviceFrame || 'modern-phone-notch';
  const theme = values.themeColor || 'slate-zinc';
  const screenContent = values.screenPlaceholder || 'analytics-dashboard';

  let gradStart = '#09090b';
  let gradEnd = '#27272a';
  let accentColor = '#3b82f6';

  if (theme === 'midnight-blue') {
    gradStart = '#030712';
    gradEnd = '#1e1b4b';
    accentColor = '#6366f1';
  } else if (theme === 'emerald-teal') {
    gradStart = '#022c22';
    gradEnd = '#064e3b';
    accentColor = '#10b981';
  } else if (theme === 'sunset-orange') {
    gradStart = '#431407';
    gradEnd = '#7c2d12';
    accentColor = '#f97316';
  } else if (theme === 'violet-purple') {
    gradStart = '#1e1b4b';
    gradEnd = '#4c1d95';
    accentColor = '#a855f7';
  }

  const isTablet = frame === 'tablet';
  const phoneWidth = isTablet ? 780 : 540;
  const phoneHeight = isTablet ? 1040 : 1080;
  const phoneX = (1200 - phoneWidth) / 2;
  const phoneY = 340;
  const bezelRadius = isTablet ? 36 : 54;
  const screenX = phoneX + 16;
  const screenY = phoneY + 16;
  const screenW = phoneWidth - 32;
  const screenH = phoneHeight - 32;
  const screenRadius = bezelRadius - 12;

  let innerScreenSvg = '';
  if (screenContent === 'analytics-dashboard') {
    innerScreenSvg = `
      <rect x="${screenX + 24}" y="${screenY + 36}" width="${screenW - 48}" height="48" rx="8" fill="#18181b" />
      <circle cx="${screenX + 48}" cy="${screenY + 60}" r="12" fill="${accentColor}" />
      <text x="${screenX + 72}" y="${screenY + 66}" fill="#f4f4f5" font-size="16" font-weight="700" font-family="system-ui, sans-serif">Security Dashboard</text>
      
      <rect x="${screenX + 24}" y="${screenY + 104}" width="${screenW - 48}" height="108" rx="12" fill="#18181b" stroke="#27272a" stroke-width="1" />
      <text x="${screenX + 44}" y="${screenY + 134}" fill="#a1a1aa" font-size="13" font-weight="600" font-family="system-ui, sans-serif">LOCAL OPERATIONS</text>
      <text x="${screenX + 44}" y="${screenY + 172}" fill="#ffffff" font-size="28" font-weight="800" font-family="system-ui, sans-serif">1,248,920</text>
      <rect x="${screenX + screenW - 140}" y="${screenY + 124}" width="72" height="26" rx="6" fill="#064e3b" />
      <text x="${screenX + screenW - 104}" y="${screenY + 142}" fill="#34d399" font-size="12" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">+100% 🔒</text>

      <rect x="${screenX + 24}" y="${screenY + 228}" width="${screenW - 48}" height="108" rx="12" fill="#18181b" stroke="#27272a" stroke-width="1" />
      <text x="${screenX + 44}" y="${screenY + 258}" fill="#a1a1aa" font-size="13" font-weight="600" font-family="system-ui, sans-serif">NETWORK EGRESS</text>
      <text x="${screenX + 44}" y="${screenY + 296}" fill="${accentColor}" font-size="28" font-weight="800" font-family="system-ui, sans-serif">0 Bytes</text>
      <rect x="${screenX + screenW - 140}" y="${screenY + 248}" width="72" height="26" rx="6" fill="#1e1b4b" />
      <text x="${screenX + screenW - 104}" y="${screenY + 266}" fill="#818cf8" font-size="12" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">OFFLINE</text>

      <rect x="${screenX + 24}" y="${screenY + 352}" width="${screenW - 48}" height="160" rx="12" fill="#18181b" stroke="#27272a" stroke-width="1" />
      <text x="${screenX + 44}" y="${screenY + 382}" fill="#a1a1aa" font-size="13" font-weight="600" font-family="system-ui, sans-serif">THROUGHPUT SPEED (MB/s)</text>
      <path d="M ${screenX + 44} ${screenY + 470} Q ${screenX + 120} ${screenY + 410}, ${screenX + 200} ${screenY + 440} T ${screenX + 340} ${screenY + 395} T ${screenX + screenW - 48} ${screenY + 410}" fill="none" stroke="${accentColor}" stroke-width="4" stroke-linecap="round" />

      <rect x="${screenX + 24}" y="${screenY + 532}" width="${screenW - 48}" height="52" rx="10" fill="${accentColor}" />
      <text x="${screenX + screenW / 2}" y="${screenY + 564}" fill="#ffffff" font-size="16" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">Execute Local Task</text>
    `;
  } else if (screenContent === 'chat-feed') {
    innerScreenSvg = `
      <rect x="${screenX + 24}" y="${screenY + 36}" width="${screenW - 48}" height="48" rx="8" fill="#18181b" />
      <text x="${screenX + screenW / 2}" y="${screenY + 66}" fill="#f4f4f5" font-size="16" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">Offline AI Terminal</text>

      <rect x="${screenX + 24}" y="${screenY + 110}" width="${screenW - 120}" height="76" rx="12" fill="#27272a" />
      <text x="${screenX + 44}" y="${screenY + 140}" fill="#f4f4f5" font-size="14" font-weight="500" font-family="system-ui, sans-serif">Does any data leave my device?</text>
      <text x="${screenX + 44}" y="${screenY + 164}" fill="#a1a1aa" font-size="11" font-family="system-ui, sans-serif">10:42 AM</text>

      <rect x="${screenX + 100}" y="${screenY + 204}" width="${screenW - 124}" height="96" rx="12" fill="${accentColor}" />
      <text x="${screenX + 120}" y="${screenY + 234}" fill="#ffffff" font-size="14" font-weight="500" font-family="system-ui, sans-serif">Zero bytes. Everything runs</text>
      <text x="${screenX + 120}" y="${screenY + 258}" fill="#ffffff" font-size="14" font-weight="500" font-family="system-ui, sans-serif">in WebAssembly client-side.</text>
      <text x="${screenX + screenW - 44}" y="${screenY + 282}" fill="rgba(255,255,255,0.8)" font-size="11" text-anchor="end" font-family="system-ui, sans-serif">10:43 AM ✓✓</text>

      <rect x="${screenX + 24}" y="${screenY + 318}" width="${screenW - 100}" height="76" rx="12" fill="#27272a" />
      <text x="${screenX + 44}" y="${screenY + 348}" fill="#f4f4f5" font-size="14" font-weight="500" font-family="system-ui, sans-serif">Are all tools 100% free?</text>
      <text x="${screenX + 44}" y="${screenY + 372}" fill="#a1a1aa" font-size="11" font-family="system-ui, sans-serif">10:44 AM</text>
    `;
  } else {
    innerScreenSvg = `
      <rect x="${screenX + 24}" y="${screenY + 36}" width="${screenW - 48}" height="48" rx="8" fill="#18181b" />
      <text x="${screenX + screenW / 2}" y="${screenY + 66}" fill="#f4f4f5" font-size="16" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">Workflow Queue</text>

      <rect x="${screenX + 24}" y="${screenY + 104}" width="${screenW - 48}" height="84" rx="10" fill="#18181b" stroke="#059669" stroke-width="2" />
      <text x="${screenX + 44}" y="${screenY + 138}" fill="#34d399" font-size="15" font-weight="700" font-family="system-ui, sans-serif">✓ Client Parser Pipeline</text>
      <text x="${screenX + 44}" y="${screenY + 164}" fill="#a1a1aa" font-size="12" font-family="system-ui, sans-serif">Completed • 0.4ms</text>

      <rect x="${screenX + 24}" y="${screenY + 204}" width="${screenW - 48}" height="84" rx="10" fill="#18181b" stroke="${accentColor}" stroke-width="2" />
      <text x="${screenX + 44}" y="${screenY + 238}" fill="${accentColor}" font-size="15" font-weight="700" font-family="system-ui, sans-serif">⚡ In-Memory Vector Engine</text>
      <text x="${screenX + 44}" y="${screenY + 264}" fill="#a1a1aa" font-size="12" font-family="system-ui, sans-serif">Active • Processing 5,000 nodes</text>

      <rect x="${screenX + 24}" y="${screenY + 304}" width="${screenW - 48}" height="84" rx="10" fill="#18181b" stroke="#3f3f46" stroke-width="1" />
      <text x="${screenX + 44}" y="${screenY + 338}" fill="#f4f4f5" font-size="15" font-weight="600" font-family="system-ui, sans-serif">🔒 Zero-Egress Assertion Gate</text>
      <text x="${screenX + 44}" y="${screenY + 364}" fill="#71717a" font-size="12" font-family="system-ui, sans-serif">Queued</text>
    `;
  }

  const notchSvg =
    frame === 'modern-phone-notch'
      ? `<rect x="${600 - 80}" y="${phoneY + 24}" width="160" height="32" rx="16" fill="#000000" />`
      : '';

  return `<svg xmlns="${svgNamespace}" viewBox="0 0 1200 1600" width="1200" height="1600">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradStart}" />
      <stop offset="100%" stop-color="${gradEnd}" />
    </linearGradient>
    <filter id="shadowGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="rgba(0,0,0,0.6)" />
    </filter>
  </defs>

  <rect width="1200" height="1600" fill="url(#bgGrad)" />

  <g text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
    <rect x="${600 - 100}" y="76" width="200" height="36" rx="18" fill="rgba(255,255,255,0.12)" />
    <text x="600" y="100" fill="#ffffff" font-size="15" font-weight="700" letter-spacing="1">${appName.toUpperCase()}</text>
    <text x="600" y="180" fill="#ffffff" font-size="44" font-weight="800">${tagline}</text>
    <text x="600" y="235" fill="#d4d4d8" font-size="20" font-weight="500">${subheadline}</text>
  </g>

  <g filter="url(#shadowGlow)">
    <rect x="${phoneX}" y="${phoneY}" width="${phoneWidth}" height="${phoneHeight}" rx="${bezelRadius}" fill="#09090b" stroke="#3f3f46" stroke-width="4" />
    <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="${screenRadius}" fill="#0a0a0c" />
    ${innerScreenSvg}
    ${notchSvg}
    <rect x="${600 - 70}" y="${phoneY + phoneHeight - 24}" width="140" height="5" rx="3" fill="#52525b" />
  </g>
</svg>`;
}

function formatSocialMediaPost(values: Record<string, string>): string {
  const text = required(values.text, 'Post text');
  const style = values.style || 'bold-sans';
  const bulletStyle = values.bulletStyle || 'none';

  function transformChar(ch: string, s: string): string {
    const code = ch.charCodeAt(0);

    if (s === 'bold-sans') {
      if (code >= 65 && code <= 90)
        return String.fromCodePoint(0x1d5d4 + (code - 65));
      if (code >= 97 && code <= 122)
        return String.fromCodePoint(0x1d5ee + (code - 97));
      if (code >= 48 && code <= 57)
        return String.fromCodePoint(0x1d7ec + (code - 48));
    } else if (s === 'bold-serif') {
      if (code >= 65 && code <= 90)
        return String.fromCodePoint(0x1d400 + (code - 65));
      if (code >= 97 && code <= 122)
        return String.fromCodePoint(0x1d41a + (code - 97));
      if (code >= 48 && code <= 57)
        return String.fromCodePoint(0x1d7ce + (code - 48));
    } else if (s === 'italic-sans') {
      if (code >= 65 && code <= 90)
        return String.fromCodePoint(0x1d608 + (code - 65));
      if (code >= 97 && code <= 122)
        return String.fromCodePoint(0x1d622 + (code - 97));
    } else if (s === 'italic-serif') {
      if (code >= 65 && code <= 90)
        return String.fromCodePoint(0x1d434 + (code - 65));
      if (code >= 97 && code <= 122) {
        if (ch === 'h') return 'ℎ';
        return String.fromCodePoint(0x1d44e + (code - 97));
      }
    } else if (s === 'bold-italic-sans') {
      if (code >= 65 && code <= 90)
        return String.fromCodePoint(0x1d63c + (code - 65));
      if (code >= 97 && code <= 122)
        return String.fromCodePoint(0x1d656 + (code - 97));
    } else if (s === 'monospace') {
      if (code >= 65 && code <= 90)
        return String.fromCodePoint(0x1d670 + (code - 65));
      if (code >= 97 && code <= 122)
        return String.fromCodePoint(0x1d68a + (code - 97));
      if (code >= 48 && code <= 57)
        return String.fromCodePoint(0x1d7f6 + (code - 48));
    } else if (s === 'script-bold') {
      if (code >= 65 && code <= 90)
        return String.fromCodePoint(0x1d4d0 + (code - 65));
      if (code >= 97 && code <= 122)
        return String.fromCodePoint(0x1d4ea + (code - 97));
    } else if (s === 'circled') {
      if (code >= 65 && code <= 90)
        return String.fromCodePoint(0x24b6 + (code - 65));
      if (code >= 97 && code <= 122)
        return String.fromCodePoint(0x24d0 + (code - 97));
      if (code >= 49 && code <= 57)
        return String.fromCodePoint(0x2460 + (code - 49));
      if (code === 48) return '⓪';
    } else if (s === 'squared') {
      if (code >= 65 && code <= 90)
        return String.fromCodePoint(0x1f130 + (code - 65));
      if (code >= 97 && code <= 122)
        return String.fromCodePoint(0x1f130 + (code - 97));
    } else if (s === 'strikethrough') {
      return `${ch}\u0336`;
    } else if (s === 'underline') {
      return `${ch}\u0332`;
    }
    return ch;
  }

  const circledNumbers = [
    '①',
    '②',
    '③',
    '④',
    '⑤',
    '⑥',
    '⑦',
    '⑧',
    '⑨',
    '⑩',
    '⑪',
    '⑫',
    '⑬',
    '⑭',
    '⑮',
    '⑯',
    '⑰',
    '⑱',
    '⑲',
    '⑳',
  ];

  let listIndex = 0;
  const lines = text.split(/\r?\n/gu).map((line) => {
    let processedLine = line;

    if (bulletStyle !== 'none') {
      const match = /^(\s*)(?:\d+[.)]|[-*+])\s+(.*)$/u.exec(line);
      if (match) {
        const indent = match[1];
        const content = match[2];
        let bulletSymbol = '• ';
        if (bulletStyle === 'bullet-disc') bulletSymbol = '• ';
        else if (bulletStyle === 'bullet-arrow') bulletSymbol = '➤ ';
        else if (bulletStyle === 'bullet-check') bulletSymbol = '✓ ';
        else if (bulletStyle === 'bullet-star') bulletSymbol = '★ ';
        else if (bulletStyle === 'numbered-circled') {
          bulletSymbol = `${circledNumbers[listIndex % circledNumbers.length]} `;
          listIndex++;
        }
        processedLine = `${indent}${bulletSymbol}${content}`;
      }
    }

    let out = '';
    for (const char of processedLine) {
      out += transformChar(char, style);
    }
    return out;
  });

  return lines.join('\n');
}
