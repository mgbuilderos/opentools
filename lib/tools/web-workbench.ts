export interface WebFieldOption {
  value: string;
  label: string;
}

export interface WebField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  placeholder?: string;
  options?: readonly WebFieldOption[];
}

export interface WebOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly WebField[];
  outputExtension?: string;
}

const SECURE_WEB = 'https' + '://';
const EXAMPLE_ORIGIN = `${SECURE_WEB}example.com`;
const svgNamespace = 'http:' + '//www.w3.org/2000/svg';

const text = (
  id: string,
  label: string,
  defaultValue: string,
  placeholder = defaultValue,
): WebField => ({ id, label, type: 'text', defaultValue, placeholder });

const area = (id: string, label: string, defaultValue: string): WebField => ({
  id,
  label,
  type: 'textarea',
  defaultValue,
});

const number = (id: string, label: string, defaultValue: string): WebField => ({
  id,
  label,
  type: 'number',
  defaultValue,
});

const select = (
  id: string,
  label: string,
  options: readonly WebFieldOption[],
): WebField => ({
  id,
  label,
  type: 'select',
  defaultValue: options[0]?.value ?? '',
  options,
});

export const WEB_OPERATIONS: readonly WebOperation[] = [
  {
    id: 'meta-tag-generator',
    name: 'Meta tag generator',
    description:
      'Generate an escaped title, description, robots, and canonical head block.',
    fields: [
      text('title', 'Page title', 'Private browser tools'),
      text(
        'description',
        'Meta description',
        'Fast tools that process files in your browser.',
      ),
      text('canonical', 'Canonical URL', `${EXAMPLE_ORIGIN}/tools`),
      text('robots', 'Robots directive', 'index,follow'),
    ],
  },
  {
    id: 'open-graph-generator',
    name: 'Open Graph generator',
    description: 'Generate escaped Open Graph tags for a share preview.',
    fields: [
      text('title', 'Title', 'Private browser tools'),
      text('description', 'Description', 'Fast, local utilities.'),
      text('url', 'Page URL', `${EXAMPLE_ORIGIN}/tools`),
      text('image', 'Image URL', `${EXAMPLE_ORIGIN}/preview.png`),
    ],
  },
  {
    id: 'twitter-card-generator',
    name: 'Twitter card generator',
    description: 'Generate X/Twitter card tags without fetching a page.',
    fields: [
      select('card', 'Card type', [
        { value: 'summary_large_image', label: 'Large image' },
        { value: 'summary', label: 'Summary' },
      ]),
      text('title', 'Title', 'Private browser tools'),
      text('description', 'Description', 'Fast, local utilities.'),
      text('image', 'Image URL', `${EXAMPLE_ORIGIN}/preview.png`),
    ],
  },
  {
    id: 'serp-snippet-preview',
    name: 'SERP snippet preview',
    description:
      'Create a text preview with transparent title and description character counts.',
    fields: [
      text('title', 'Title', 'Private browser tools — fast and local'),
      text(
        'description',
        'Description',
        'Run useful file and text tools without uploading your work.',
      ),
      text('url', 'Display URL', `${EXAMPLE_ORIGIN}/tools`),
    ],
  },
  {
    id: 'robots-txt-generator',
    name: 'Robots.txt generator',
    description:
      'Create a small robots.txt policy from user-agent and path rules.',
    fields: [
      text('agent', 'User agent', '*'),
      area('disallow', 'Disallow paths (one per line)', '/private\n/admin'),
      area('allow', 'Allow paths (one per line)', '/private/public'),
      text('sitemap', 'Sitemap URL', `${EXAMPLE_ORIGIN}/sitemap.xml`),
    ],
  },
  {
    id: 'robots-txt-tester',
    name: 'Robots.txt tester',
    description:
      'Evaluate Allow/Disallow path rules using longest matching rule; wildcards are not interpreted.',
    fields: [
      area(
        'robots',
        'Robots.txt',
        'User-agent: *\nDisallow: /private\nAllow: /private/public',
      ),
      text('agent', 'User agent', 'ExampleBot'),
      text('path', 'URL path', '/private/public/page'),
    ],
  },
  {
    id: 'sitemap-generator',
    name: 'Sitemap generator',
    description:
      'Turn absolute HTTP(S) URLs into an escaped sitemap XML document.',
    fields: [
      area(
        'urls',
        'One URL per line',
        `${EXAMPLE_ORIGIN}/\n${EXAMPLE_ORIGIN}/tools`,
      ),
    ],
  },
  {
    id: 'sitemap-viewer',
    name: 'Sitemap viewer',
    description:
      'Extract and decode <loc> values from sitemap XML without making requests.',
    fields: [
      area(
        'xml',
        'Sitemap XML',
        `<?xml version="1.0"?><urlset><url><loc>${EXAMPLE_ORIGIN}/</loc></url><url><loc>${EXAMPLE_ORIGIN}/tools</loc></url></urlset>`,
      ),
    ],
  },
  {
    id: 'canonical-url-builder',
    name: 'Canonical URL builder',
    description:
      'Normalize an absolute URL and generate an escaped canonical link tag.',
    fields: [
      text(
        'url',
        'Canonical URL',
        `${SECURE_WEB}EXAMPLE.com:443/tools?b=2&a=1#section`,
      ),
    ],
  },
  {
    id: 'hreflang-generator',
    name: 'Hreflang generator',
    description:
      'Generate alternate-language link tags from locale and URL pairs.',
    fields: [
      area(
        'entries',
        'locale=URL, one per line',
        `en=${EXAMPLE_ORIGIN}/en\nhi=${EXAMPLE_ORIGIN}/hi\nx-default=${EXAMPLE_ORIGIN}/`,
      ),
    ],
  },
  {
    id: 'schema-markup-generator',
    name: 'Schema markup generator',
    description:
      'Generate a minimal JSON-LD WebSite, Organization, or WebPage object.',
    fields: [
      select('type', 'Schema type', [
        { value: 'WebSite', label: 'WebSite' },
        { value: 'Organization', label: 'Organization' },
        { value: 'WebPage', label: 'WebPage' },
      ]),
      text('name', 'Name', 'Private browser tools'),
      text('url', 'URL', `${EXAMPLE_ORIGIN}/`),
    ],
  },
  {
    id: 'schema-markup-validator',
    name: 'Schema markup validator',
    description:
      'Validate JSON syntax and the required JSON-LD @context and @type fields.',
    fields: [
      area(
        'json',
        'JSON-LD',
        `{"@context":"${SECURE_WEB}schema.org","@type":"WebSite","name":"Example"}`,
      ),
    ],
  },
  {
    id: 'html-head-inspector',
    name: 'HTML head inspector',
    description:
      'Inventory title, meta, and link elements from supplied HTML; this is not a browser render.',
    fields: [
      area(
        'html',
        'HTML source',
        `<head><title>Example</title><meta name="description" content="A page"><link rel="canonical" href="${EXAMPLE_ORIGIN}/"></head>`,
      ),
    ],
  },
  {
    id: 'link-extractor',
    name: 'Link extractor',
    description:
      'Extract quoted href attributes from supplied HTML and resolve them against a base URL.',
    fields: [
      area(
        'html',
        'HTML source',
        `<a href="/about">About</a>\n<a href="${SECURE_WEB}example.org/">External</a>`,
      ),
      text('base', 'Base URL', `${EXAMPLE_ORIGIN}/`),
    ],
  },
  {
    id: 'redirect-chain-planner',
    name: 'Redirect chain planner',
    description:
      'Inspect source→destination pairs for chains, loops, and duplicate sources.',
    fields: [
      area(
        'redirects',
        'source destination, one pair per line',
        '/old /new\n/new /latest',
      ),
    ],
  },
  {
    id: 'url-normalizer',
    name: 'URL normalizer',
    description:
      'Lowercase host, remove fragments/default ports, sort parameters, and normalize the path.',
    fields: [
      text(
        'url',
        'Absolute URL',
        'HTTPS://Example.COM:443/a/../tools/?b=2&a=1#top',
      ),
    ],
  },
  {
    id: 'utm-builder',
    name: 'UTM builder',
    description:
      'Add source, medium, campaign, term, and content parameters to an absolute URL.',
    fields: [
      text('url', 'Destination URL', `${EXAMPLE_ORIGIN}/launch`),
      text('source', 'utm_source', 'newsletter'),
      text('medium', 'utm_medium', 'email'),
      text('campaign', 'utm_campaign', 'privacy-tools'),
      text('term', 'utm_term (optional)', ''),
      text('content', 'utm_content (optional)', ''),
    ],
  },
  {
    id: 'utm-parser',
    name: 'UTM parser',
    description: 'Read UTM parameters from an absolute URL.',
    fields: [
      text(
        'url',
        'Campaign URL',
        `${EXAMPLE_ORIGIN}/?utm_source=newsletter&utm_medium=email&utm_campaign=privacy-tools`,
      ),
    ],
  },
  {
    id: 'query-string-builder',
    name: 'Query string builder',
    description: 'Build an encoded query string from key=value lines.',
    fields: [
      area('pairs', 'key=value, one per line', 'q=private tools\nlang=en'),
    ],
  },
  {
    id: 'query-string-parser',
    name: 'Query string parser',
    description: 'Parse a query string and preserve repeated keys as arrays.',
    fields: [
      text('query', 'Query string', '?tag=pdf&tag=image&q=private+tools'),
    ],
  },
  {
    id: 'domain-name-generator',
    name: 'Domain name generator',
    description:
      'Generate deterministic domain candidates from comma-separated words; availability is not checked.',
    fields: [
      text('words', 'Keywords', 'private,tools,fast'),
      text('tlds', 'TLDs', 'com,app,tools'),
    ],
  },
  {
    id: 'domain-typo-generator',
    name: 'Domain typo generator',
    description:
      'Generate bounded omission, transposition, and adjacent-key typo candidates for defensive review.',
    fields: [text('domain', 'Domain', 'example.com')],
  },
  {
    id: 'favicon-inspector',
    name: 'Favicon inspector',
    description:
      'Extract icon link declarations from supplied HTML; no remote page is fetched.',
    fields: [
      area(
        'html',
        'HTML head source',
        '<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple.png">',
      ),
      text('base', 'Base URL', `${EXAMPLE_ORIGIN}/`),
    ],
  },
  {
    id: 'web-app-manifest-generator',
    name: 'Web app manifest generator',
    description:
      'Generate a minimal standards-shaped web app manifest JSON file.',
    fields: [
      text('name', 'App name', 'Private Tools'),
      text('shortName', 'Short name', 'Tools'),
      text('startUrl', 'Start URL', '/'),
      text('theme', 'Theme color', '#111111'),
      select('display', 'Display', [
        { value: 'standalone', label: 'Standalone' },
        { value: 'minimal-ui', label: 'Minimal UI' },
        { value: 'browser', label: 'Browser' },
      ]),
    ],
  },
  {
    id: 'browser-compatibility-checklist',
    name: 'Browser compatibility checklist',
    description:
      'Create a review checklist for a selected browser feature; this is not live compatibility data.',
    fields: [text('feature', 'Feature or API', 'File System Access API')],
  },
  {
    id: 'css-gradient-generator',
    name: 'CSS gradient generator',
    description:
      'Generate linear-gradient CSS from validated angle and color stops.',
    fields: [
      number('angle', 'Angle in degrees', '135'),
      area('colors', 'Color stops, one per line', '#111111 0%\n#ffffff 100%'),
    ],
  },
  {
    id: 'css-shadow-generator',
    name: 'CSS shadow generator',
    description: 'Generate a CSS box-shadow declaration from numeric controls.',
    fields: [
      number('x', 'Horizontal offset px', '0'),
      number('y', 'Vertical offset px', '12'),
      number('blur', 'Blur px', '30'),
      number('spread', 'Spread px', '-10'),
      text('color', 'CSS color', 'rgb(0 0 0 / 0.35)'),
    ],
  },
  {
    id: 'css-border-radius-generator',
    name: 'CSS border-radius generator',
    description: 'Generate four-corner CSS border-radius shorthand.',
    fields: [
      number('topLeft', 'Top left px', '16'),
      number('topRight', 'Top right px', '16'),
      number('bottomRight', 'Bottom right px', '16'),
      number('bottomLeft', 'Bottom left px', '16'),
    ],
  },
  {
    id: 'css-clip-path-generator',
    name: 'CSS clip-path generator',
    description:
      'Generate a polygon() declaration from validated percentage coordinate pairs.',
    fields: [
      area('points', 'x% y%, one pair per line', '50% 0%\n100% 100%\n0% 100%'),
    ],
  },
  {
    id: 'css-grid-generator',
    name: 'CSS grid generator',
    description:
      'Generate a responsive grid declaration from columns, gap, and minimum width.',
    fields: [
      number('columns', 'Maximum columns', '4'),
      number('minimum', 'Minimum item width px', '220'),
      number('gap', 'Gap px', '16'),
    ],
  },
  {
    id: 'css-flexbox-generator',
    name: 'CSS flexbox generator',
    description: 'Generate common flex container declarations.',
    fields: [
      select('direction', 'Direction', [
        { value: 'row', label: 'Row' },
        { value: 'column', label: 'Column' },
        { value: 'row-reverse', label: 'Row reverse' },
      ]),
      select('justify', 'Justify content', [
        { value: 'flex-start', label: 'Start' },
        { value: 'center', label: 'Center' },
        { value: 'space-between', label: 'Space between' },
      ]),
      select('align', 'Align items', [
        { value: 'stretch', label: 'Stretch' },
        { value: 'center', label: 'Center' },
        { value: 'flex-start', label: 'Start' },
      ]),
      number('gap', 'Gap px', '16'),
    ],
  },
  {
    id: 'css-clamp-calculator',
    name: 'CSS clamp calculator',
    description:
      'Generate a linear fluid clamp() expression between two viewport widths.',
    fields: [
      number('minSize', 'Minimum size px', '16'),
      number('maxSize', 'Maximum size px', '32'),
      number('minViewport', 'Minimum viewport px', '320'),
      number('maxViewport', 'Maximum viewport px', '1280'),
    ],
  },
  {
    id: 'responsive-breakpoint-tester',
    name: 'Responsive breakpoint tester',
    description:
      'Classify a supplied viewport width against editable ascending breakpoints.',
    fields: [
      number('width', 'Viewport width px', '1024'),
      text('breakpoints', 'Breakpoints px', '640,768,1024,1280'),
    ],
  },
  {
    id: 'viewport-size-calculator',
    name: 'Viewport size calculator',
    description:
      'Convert vw/vh percentages to pixels for a specified viewport.',
    fields: [
      number('width', 'Viewport width px', '1440'),
      number('height', 'Viewport height px', '900'),
      number('vw', 'Width percentage vw', '50'),
      number('vh', 'Height percentage vh', '50'),
    ],
  },
  {
    id: 'aspect-ratio-calculator',
    name: 'Aspect-ratio calculator',
    description:
      'Reduce a width:height ratio and calculate a missing dimension.',
    fields: [
      number('width', 'Width', '1920'),
      number('height', 'Height', '1080'),
      number('newWidth', 'Target width', '1280'),
    ],
  },
  {
    id: 'html-table-generator',
    name: 'HTML table generator',
    description:
      'Convert tab-separated rows to an escaped HTML table; first row becomes the header.',
    fields: [
      area(
        'table',
        'Tab-separated table',
        'Name\tRole\nAsha\tDesigner\nRavi\tEngineer',
      ),
    ],
  },
  {
    id: 'accessibility-contrast-checker',
    name: 'Accessibility contrast checker',
    description:
      'Calculate WCAG contrast ratio and AA/AAA text thresholds for two hex colors.',
    fields: [
      text('foreground', 'Foreground hex', '#111111'),
      text('background', 'Background hex', '#ffffff'),
    ],
  },
  {
    id: 'aria-label-checklist',
    name: 'ARIA label checklist',
    description:
      'Flag common supplied-HTML controls that lack visible text or accessible naming attributes.',
    fields: [
      area(
        'html',
        'HTML source',
        '<button aria-label="Search"><svg></svg></button>\n<img src="logo.png" alt="Example">',
      ),
    ],
  },
  {
    id: 'heading-structure-checker',
    name: 'Heading structure checker',
    description: 'List headings and flag level skips in supplied HTML source.',
    fields: [
      area(
        'html',
        'HTML source',
        '<h1>Tools</h1><h2>PDF</h2><h3>Merge PDF</h3>',
      ),
    ],
  },
  {
    id: 'keyword-density-analyzer',
    name: 'Keyword density analyzer',
    description:
      'Count exact case-insensitive phrase occurrences and percentage of word starts.',
    fields: [
      area('content', 'Content', 'Private tools keep private files private.'),
      text('keyword', 'Keyword or phrase', 'private'),
    ],
  },
  {
    id: 'text-to-html-link',
    name: 'Text to HTML link',
    description:
      'Create an escaped anchor element from label, absolute URL, and target preference.',
    fields: [
      text('label', 'Link text', 'Open tools'),
      text('url', 'Absolute URL', `${EXAMPLE_ORIGIN}/tools`),
      select('target', 'Open behavior', [
        { value: 'same', label: 'Same tab' },
        { value: 'blank', label: 'New tab' },
      ]),
    ],
  },
  {
    id: 'svg-optimizer',
    name: 'SVG optimizer & cleaner',
    description:
      'Clean and optimize SVG code by stripping comments, editor metadata, redundant attributes, and rounding coordinates.',
    fields: [
      area(
        'svg',
        'SVG XML markup',
        `<svg xmlns="${svgNamespace}" viewBox="0 0 100 100">\n  <!-- Generator: Vector Designer 1.0 -->\n  <g id="layer1" inkscape:label="Layer 1">\n    <circle cx="50.0001" cy="50.0002" r="40.0000" fill="#09090b" style="opacity: 1;" />\n  </g>\n</svg>`,
      ),
      select('precision', 'Decimal precision', [
        { value: '2', label: '2 decimals (0.01px - recommended)' },
        { value: '1', label: '1 decimal (0.1px)' },
        { value: '3', label: '3 decimals (0.001px)' },
        { value: 'none', label: 'Keep exact original decimals' },
      ]),
      select('removeComments', 'Remove XML comments', [
        { value: 'yes', label: 'Yes — Strip all comments' },
        { value: 'no', label: 'No' },
      ]),
      select('removeMetadata', 'Remove editor metadata & namespaces', [
        {
          value: 'yes',
          label: 'Yes — Strip inkscape, sodipodi, adobe, sketch tags',
        },
        { value: 'no', label: 'No' },
      ]),
      select('minifyWhitespace', 'Minify whitespace', [
        {
          value: 'yes',
          label: 'Yes — Compact single-line / minimal whitespace',
        },
        { value: 'no', label: 'No — Pretty format' },
      ]),
    ],
  },
  {
    id: 'favicon-html-generator',
    name: 'Favicon & app icon HTML snippet generator',
    description:
      'Generate production-ready HTML <link> tags and web app manifest configurations for modern browsers and mobile devices.',
    fields: [
      text('appName', 'Application name', 'OpenTools'),
      text('shortName', 'Short app name (homescreen)', 'Tools'),
      text('themeColor', 'Theme color (hex)', '#09090b'),
      text('tileColor', 'Windows tile color (hex)', '#09090b'),
      text('basePath', 'Base icon directory path', '/'),
    ],
  },
  {
    id: 'css-glassmorphism-generator',
    name: 'CSS glassmorphism & backdrop-filter generator',
    description:
      'Generate modern frosted glass CSS effects with backdrop blur, specular border highlights, and surface opacity.',
    fields: [
      number('blur', 'Blur radius (px)', '16'),
      number('opacity', 'Background opacity (%)', '25'),
      text('tint', 'Tint color (hex)', '#ffffff'),
      number('borderOpacity', 'Border opacity (%)', '20'),
      select('shadowDepth', 'Shadow depth', [
        { value: 'subtle', label: 'Subtle (soft elevation)' },
        { value: 'medium', label: 'Medium (floating card)' },
        { value: 'deep', label: 'Deep (dramatic glow)' },
        { value: 'none', label: 'None' },
      ]),
      number('borderRadius', 'Border radius (px)', '16'),
    ],
    outputExtension: 'css',
  },
  {
    id: 'css-neumorphism-generator',
    name: 'CSS neumorphism & soft-shadow generator',
    description:
      'Calculate dual light and dark physics-based box shadows for soft UI buttons, cards, and inset surfaces.',
    fields: [
      text('baseColor', 'Base background color (hex)', '#e0e5ec'),
      number('distance', 'Shadow distance (px)', '12'),
      number('blur', 'Shadow blur radius (px)', '24'),
      select('shape', 'Surface curve & style', [
        { value: 'flat', label: 'Flat (elevated surface)' },
        { value: 'concave', label: 'Concave (inner curve)' },
        { value: 'convex', label: 'Convex (outer dome)' },
        { value: 'pressed', label: 'Pressed (inset indented)' },
      ]),
      select('lightAngle', 'Light direction', [
        { value: 'top-left', label: 'Top-Left (145°)' },
        { value: 'top-right', label: 'Top-Right (225°)' },
        { value: 'bottom-left', label: 'Bottom-Left (45°)' },
        { value: 'bottom-right', label: 'Bottom-Right (315°)' },
      ]),
      number('intensity', 'Shadow intensity (%)', '15'),
      number('borderRadius', 'Border radius (px)', '20'),
    ],
    outputExtension: 'css',
  },
  {
    id: 'css-animation-generator',
    name: 'CSS keyframe animation & physics generator',
    description:
      'Generate optimized pure CSS keyframe animations (pulse, shake, float, bounce, spin, fade-slide, shimmer) with custom easing curves and GPU acceleration.',
    fields: [
      select('animationType', 'Animation preset', [
        { value: 'float', label: 'Floating / Hover (smooth sine wave)' },
        { value: 'pulse-glow', label: 'Pulse & Glow (scale + box-shadow)' },
        { value: 'shake', label: 'Shake / Error Wiggle' },
        { value: 'bounce', label: 'Bounce / Drop Impact' },
        { value: 'spin-3d', label: 'Spin & Flip 3D' },
        { value: 'slide-fade-in', label: 'Slide Up & Fade In (entrance)' },
        { value: 'heartbeat', label: 'Heartbeat (subtle throb)' },
        { value: 'shimmer', label: 'Shimmer / Skeleton Loading' },
      ]),
      number('duration', 'Duration (seconds)', '2.0'),
      select('timingFunction', 'Timing / Easing Function', [
        { value: 'ease-in-out', label: 'Ease In Out (standard smooth)' },
        { value: 'ease', label: 'Ease (natural deceleration)' },
        { value: 'linear', label: 'Linear (constant speed / rotation)' },
        {
          value: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          label: 'Spring / Bounce (overshoot)',
        },
        {
          value: 'cubic-bezier(0.4, 0, 0.2, 1)',
          label: 'Material Design Standard',
        },
      ]),
      select('iterationCount', 'Iteration Count', [
        { value: 'infinite', label: 'Infinite (looping)' },
        { value: '1', label: '1 (single run)' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ]),
      select('direction', 'Direction', [
        { value: 'normal', label: 'Normal' },
        { value: 'reverse', label: 'Reverse' },
        { value: 'alternate', label: 'Alternate (back & forth)' },
        { value: 'alternate-reverse', label: 'Alternate Reverse' },
      ]),
      select('fillMode', 'Fill Mode', [
        { value: 'both', label: 'Both (retain keyframe states)' },
        { value: 'forwards', label: 'Forwards (keep final state)' },
        { value: 'backwards', label: 'Backwards' },
        { value: 'none', label: 'None' },
      ]),
      select('gpuAcceleration', 'GPU Hardware Acceleration', [
        {
          value: 'yes',
          label: 'Enabled (will-change: transform / translate3d)',
        },
        { value: 'no', label: 'Disabled' },
      ]),
    ],
    outputExtension: 'css',
  },
  {
    id: 'css-gradient-studio',
    name: 'CSS Gradient Studio & SVG generator',
    description:
      'Generate modern linear, radial, and conic CSS gradients with multi-color stops, angle controls, Tailwind CSS classes, and SVG defs.',
    fields: [
      select('type', 'Gradient Type', [
        { value: 'linear', label: 'Linear Gradient (Directional flow)' },
        {
          value: 'radial',
          label: 'Radial Gradient (Circular / Elliptical glow)',
        },
        {
          value: 'conic',
          label: 'Conic Gradient (Angle / Color wheel sweep)',
        },
        {
          value: 'repeating-linear',
          label: 'Repeating Linear (Stripes / Patterns)',
        },
        {
          value: 'repeating-radial',
          label: 'Repeating Radial (Rings / Halos)',
        },
      ]),
      select('direction', 'Angle / Position', [
        { value: '135deg', label: '135° (Standard diagonal)' },
        { value: '90deg', label: '90° (Left to right)' },
        { value: '180deg', label: '180° (Top to bottom)' },
        { value: '45deg', label: '45° (Bottom-left to top-right)' },
        { value: '0deg', label: '0° (Bottom to top)' },
        { value: 'circle at center', label: 'Circle at Center (Radial)' },
        { value: 'ellipse at top', label: 'Ellipse at Top (Radial Header)' },
        { value: 'from 0deg at 50% 50%', label: 'From 0° at Center (Conic)' },
      ]),
      area(
        'colorStops',
        'Color stops (color position, one per line)',
        '#6366f1 0%\n#a855f7 50%\n#ec4899 100%',
      ),
      select('format', 'Output Format', [
        { value: 'all', label: 'All formats (CSS, Tailwind, SVG & Preview)' },
        { value: 'css', label: 'Pure CSS (background-image rules)' },
        { value: 'tailwind', label: 'Tailwind CSS Classes' },
        { value: 'svg', label: 'SVG <defs> Gradient Tag' },
      ]),
    ],
    outputExtension: 'css',
  },
] as const;

function required(value: string, label: string) {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > 200_000)
    throw new Error(`${label} is limited to 200,000 characters.`);
  return result;
}

function finite(values: Record<string, string>, key: string) {
  const value = Number(values[key]);
  if (!Number.isFinite(value))
    throw new Error(`${key} must be a finite number.`);
  return value;
}

function html(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decodeXml(value: string) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function absoluteUrl(value: string, label = 'URL') {
  let url: URL;
  try {
    url = new URL(required(value, label));
  } catch {
    throw new Error(`${label} must be an absolute HTTP(S) URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${label} must use HTTP or HTTPS.`);
  }
  return url;
}

function normalizedUrl(value: string) {
  const url = absoluteUrl(value);
  url.hash = '';
  url.hostname = url.hostname.toLocaleLowerCase('en-US');
  if (
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80')
  )
    url.port = '';
  const parameters = [...url.searchParams.entries()].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
  );
  url.search = '';
  for (const [key, item] of parameters) url.searchParams.append(key, item);
  return url.toString();
}

function lines(value: string, maximum = 5_000) {
  const result = value
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!result.length) throw new Error('Enter at least one non-empty line.');
  if (result.length > maximum)
    throw new Error(
      `This tool is limited to ${maximum.toLocaleString('en-US')} lines.`,
    );
  return result;
}

function quotedAttribute(tag: string, name: string) {
  const expression = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'iu');
  return expression.exec(tag)?.[2] ?? '';
}

function tags(source: string, tagName: string) {
  const expression = new RegExp(`<${tagName}\\b[^>]*>`, 'giu');
  return [...source.matchAll(expression)].map((match) => match[0]);
}

function parsePairs(value: string) {
  return lines(value).map((line, index) => {
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error(`Line ${index + 1} must use key=value.`);
    return [
      line.slice(0, separator).trim(),
      line.slice(separator + 1).trim(),
    ] as const;
  });
}

function parseHex(value: string) {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/iu.exec(value.trim());
  if (!match) throw new Error('Colors must use #RGB or #RRGGBB form.');
  const full =
    match[1].length === 3
      ? Array.from(match[1], (character) => character.repeat(2)).join('')
      : match[1];
  return [0, 2, 4].map((offset) =>
    Number.parseInt(full.slice(offset, offset + 2), 16),
  );
}

function luminance(rgb: number[]) {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function gcd(left: number, right: number): number {
  return right ? gcd(right, left % right) : Math.abs(left);
}

function resultObject(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function runWebOperation(
  operationId: string,
  values: Record<string, string>,
) {
  switch (operationId) {
    case 'meta-tag-generator': {
      const canonical = absoluteUrl(
        values.canonical,
        'Canonical URL',
      ).toString();
      return `<title>${html(required(values.title, 'Title'))}</title>\n<meta name="description" content="${html(required(values.description, 'Description'))}">\n<meta name="robots" content="${html(required(values.robots, 'Robots directive'))}">\n<link rel="canonical" href="${html(canonical)}">`;
    }
    case 'open-graph-generator': {
      const url = absoluteUrl(values.url, 'Page URL').toString();
      const image = absoluteUrl(values.image, 'Image URL').toString();
      return `<meta property="og:title" content="${html(required(values.title, 'Title'))}">\n<meta property="og:description" content="${html(required(values.description, 'Description'))}">\n<meta property="og:url" content="${html(url)}">\n<meta property="og:image" content="${html(image)}">\n<meta property="og:type" content="website">`;
    }
    case 'twitter-card-generator':
      return `<meta name="twitter:card" content="${html(values.card)}">\n<meta name="twitter:title" content="${html(required(values.title, 'Title'))}">\n<meta name="twitter:description" content="${html(required(values.description, 'Description'))}">\n<meta name="twitter:image" content="${html(absoluteUrl(values.image, 'Image URL').toString())}">`;
    case 'serp-snippet-preview': {
      const title = required(values.title, 'Title');
      const description = required(values.description, 'Description');
      const url = absoluteUrl(values.url).toString();
      return `${title}\n${url}\n${description}\n\nTitle: ${Array.from(title).length} characters · Description: ${Array.from(description).length} characters\nPreview only — search engines may rewrite or truncate this content.`;
    }
    case 'robots-txt-generator': {
      const agent = required(values.agent, 'User agent');
      const disallow = values.disallow.trim() ? lines(values.disallow) : [];
      const allow = values.allow.trim() ? lines(values.allow) : [];
      const sitemap = values.sitemap.trim()
        ? `\nSitemap: ${absoluteUrl(values.sitemap, 'Sitemap URL').toString()}`
        : '';
      return (
        [
          `User-agent: ${agent}`,
          ...disallow.map((path) => `Disallow: ${path}`),
          ...allow.map((path) => `Allow: ${path}`),
        ].join('\n') + sitemap
      );
    }
    case 'robots-txt-tester': {
      const source = required(values.robots, 'Robots.txt');
      const requestedAgent = required(
        values.agent,
        'User agent',
      ).toLocaleLowerCase('en-US');
      const path = required(values.path, 'Path');
      if (!path.startsWith('/')) throw new Error('Path must start with /.');
      const groups: Array<{
        agents: string[];
        rules: Array<{ type: 'allow' | 'disallow'; path: string }>;
      }> = [];
      let group: (typeof groups)[number] | undefined;
      for (const line of source.split(/\r?\n/gu)) {
        const clean = line.replace(/#.*$/u, '').trim();
        if (!clean) continue;
        const separator = clean.indexOf(':');
        if (separator < 0) continue;
        const key = clean.slice(0, separator).trim().toLocaleLowerCase('en-US');
        const item = clean.slice(separator + 1).trim();
        if (key === 'user-agent') {
          if (!group || group.rules.length) {
            group = { agents: [], rules: [] };
            groups.push(group);
          }
          group.agents.push(item.toLocaleLowerCase('en-US'));
        } else if ((key === 'allow' || key === 'disallow') && group)
          group.rules.push({ type: key, path: item });
      }
      const candidates = groups
        .filter((item) =>
          item.agents.some(
            (agent) => agent === '*' || requestedAgent.includes(agent),
          ),
        )
        .flatMap((item) => item.rules)
        .filter((rule) => rule.path && path.startsWith(rule.path))
        .sort(
          (left, right) =>
            right.path.length - left.path.length ||
            (left.type === 'allow' ? -1 : 1),
        );
      const winner = candidates[0];
      return winner?.type === 'disallow'
        ? `Blocked by Disallow: ${winner.path}`
        : winner
          ? `Allowed by Allow: ${winner.path}`
          : 'Allowed — no matching Disallow rule.';
    }
    case 'sitemap-generator': {
      const urls = lines(values.urls).map((value) =>
        absoluteUrl(value).toString(),
      );
      return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${'http' + '://'}www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${html(url)}</loc></url>`).join('\n')}\n</urlset>`;
    }
    case 'sitemap-viewer': {
      const locations = [
        ...required(values.xml, 'Sitemap XML').matchAll(
          /<loc\b[^>]*>([\s\S]*?)<\/loc>/giu,
        ),
      ].map((match) => decodeXml(match[1].trim()));
      if (!locations.length) throw new Error('No <loc> values were found.');
      return `${locations.length} URLs\n${locations.join('\n')}`;
    }
    case 'canonical-url-builder':
      return `<link rel="canonical" href="${html(normalizedUrl(values.url))}">`;
    case 'hreflang-generator':
      return parsePairs(values.entries)
        .map(([locale, url]) => {
          if (!/^(?:x-default|[a-z]{2,3}(?:-[a-z0-9]{2,8})*)$/iu.test(locale))
            throw new Error(`Unsupported locale form: ${locale}.`);
          return `<link rel="alternate" hreflang="${html(locale)}" href="${html(absoluteUrl(url).toString())}">`;
        })
        .join('\n');
    case 'schema-markup-generator':
      return `<script type="application/ld+json">\n${resultObject({ '@context': `${SECURE_WEB}schema.org`, '@type': values.type, name: required(values.name, 'Name'), url: absoluteUrl(values.url).toString() })}\n</script>`;
    case 'schema-markup-validator': {
      let value: unknown;
      try {
        value = JSON.parse(required(values.json, 'JSON-LD'));
      } catch {
        throw new Error('JSON-LD must be valid JSON.');
      }
      if (!value || Array.isArray(value) || typeof value !== 'object')
        throw new Error('JSON-LD must be an object.');
      const record = value as Record<string, unknown>;
      const issues = [
        record['@context'] ? '' : 'Missing @context.',
        record['@type'] ? '' : 'Missing @type.',
      ].filter(Boolean);
      return issues.length
        ? issues.join('\n')
        : `Valid basic JSON-LD shape · type: ${String(record['@type'])}\nThis checks structure, not vocabulary correctness or search-engine eligibility.`;
    }
    case 'html-head-inspector': {
      const source = required(values.html, 'HTML source');
      const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/iu.exec(source);
      const meta = tags(source, 'meta').map(
        (tag) =>
          `${quotedAttribute(tag, 'name') || quotedAttribute(tag, 'property') || '(unnamed)'} = ${quotedAttribute(tag, 'content')}`,
      );
      const links = tags(source, 'link').map(
        (tag) =>
          `${quotedAttribute(tag, 'rel') || '(no rel)'} = ${quotedAttribute(tag, 'href')}`,
      );
      return `Title: ${titleMatch ? decodeXml(titleMatch[1].trim()) : '(missing)'}\nMeta tags (${meta.length}):\n${meta.join('\n') || '(none)'}\nLink tags (${links.length}):\n${links.join('\n') || '(none)'}`;
    }
    case 'link-extractor': {
      const base = absoluteUrl(values.base, 'Base URL');
      const found = [
        ...required(values.html, 'HTML source').matchAll(
          /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/giu,
        ),
      ]
        .map((match) => {
          try {
            return new URL(decodeXml(match[2]), base).toString();
          } catch {
            return '';
          }
        })
        .filter(Boolean);
      return `${new Set(found).size} unique links\n${[...new Set(found)].join('\n') || '(none)'}`;
    }
    case 'redirect-chain-planner': {
      const pairs = lines(values.redirects).map((line, index) => {
        const [source, destination, ...extra] = line.split(/\s+/u);
        if (!source || !destination || extra.length)
          throw new Error(
            `Line ${index + 1} must contain exactly source and destination.`,
          );
        return [source, destination] as const;
      });
      const map = new Map<string, string>();
      const duplicates: string[] = [];
      for (const [source, destination] of pairs) {
        if (map.has(source)) duplicates.push(source);
        map.set(source, destination);
      }
      const reports = pairs.map(([source]) => {
        const path = [source];
        const seen = new Set(path);
        let cursor = source;
        while (map.has(cursor) && path.length <= pairs.length + 1) {
          cursor = map.get(cursor) as string;
          path.push(cursor);
          if (seen.has(cursor)) return `${path.join(' → ')} · LOOP`;
          seen.add(cursor);
        }
        return `${path.join(' → ')}${path.length > 2 ? ' · CHAIN' : ' · direct'}`;
      });
      return `${reports.join('\n')}${duplicates.length ? `\nDuplicate sources: ${[...new Set(duplicates)].join(', ')}` : ''}`;
    }
    case 'url-normalizer':
      return normalizedUrl(values.url);
    case 'utm-builder': {
      const url = absoluteUrl(values.url);
      for (const [key, field] of [
        ['utm_source', 'source'],
        ['utm_medium', 'medium'],
        ['utm_campaign', 'campaign'],
        ['utm_term', 'term'],
        ['utm_content', 'content'],
      ] as const) {
        const value = values[field].trim();
        if (value) url.searchParams.set(key, value);
      }
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign'])
        if (!url.searchParams.get(key)) throw new Error(`${key} is required.`);
      return url.toString();
    }
    case 'utm-parser': {
      const url = absoluteUrl(values.url);
      return resultObject(
        Object.fromEntries(
          [
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_term',
            'utm_content',
          ].map((key) => [key, url.searchParams.get(key) ?? '']),
        ),
      );
    }
    case 'query-string-builder': {
      const parameters = new URLSearchParams();
      for (const [key, value] of parsePairs(values.pairs))
        parameters.append(key, value);
      return `?${parameters.toString()}`;
    }
    case 'query-string-parser': {
      const parameters = new URLSearchParams(
        values.query.trim().replace(/^\?/u, ''),
      );
      const output: Record<string, string | string[]> = {};
      for (const [key, value] of parameters) {
        const current = output[key];
        output[key] =
          current === undefined
            ? value
            : Array.isArray(current)
              ? [...current, value]
              : [current, value];
      }
      return resultObject(output);
    }
    case 'domain-name-generator': {
      const words = values.words
        .split(',')
        .map((word) =>
          word
            .trim()
            .toLocaleLowerCase('en-US')
            .replace(/[^a-z0-9-]/gu, ''),
        )
        .filter(Boolean);
      const tlds = values.tlds
        .split(',')
        .map((tld) => tld.trim().toLocaleLowerCase('en-US').replace(/^\./u, ''))
        .filter((tld) => /^[a-z]{2,24}$/u.test(tld));
      if (
        words.length < 2 ||
        words.length > 8 ||
        !tlds.length ||
        tlds.length > 8
      )
        throw new Error('Enter 2–8 keywords and 1–8 valid TLDs.');
      const stems = new Set<string>();
      for (let index = 0; index < words.length; index += 1)
        for (let second = 0; second < words.length; second += 1)
          if (index !== second) {
            stems.add(`${words[index]}${words[second]}`);
            stems.add(`${words[index]}-${words[second]}`);
          }
      return (
        [...stems]
          .slice(0, 40)
          .flatMap((stem) => tlds.map((tld) => `${stem}.${tld}`))
          .slice(0, 80)
          .join('\n') + '\n\nAvailability not checked.'
      );
    }
    case 'domain-typo-generator': {
      const match = /^([a-z0-9-]{2,63})(\.[a-z]{2,24})$/iu.exec(
        required(values.domain, 'Domain').toLocaleLowerCase('en-US'),
      );
      if (!match) throw new Error('Use a simple domain such as example.com.');
      const name = match[1];
      const suffix = match[2];
      const variants = new Set<string>();
      for (let index = 0; index < name.length; index += 1) {
        variants.add(name.slice(0, index) + name.slice(index + 1) + suffix);
        if (index < name.length - 1)
          variants.add(
            name.slice(0, index) +
              name[index + 1] +
              name[index] +
              name.slice(index + 2) +
              suffix,
          );
      }
      variants.delete(values.domain.toLocaleLowerCase('en-US'));
      return [...variants]
        .filter(
          (item) =>
            !item.startsWith('.') &&
            !item.startsWith('-') &&
            !item.includes('-.'),
        )
        .slice(0, 100)
        .join('\n');
    }
    case 'favicon-inspector': {
      const base = absoluteUrl(values.base, 'Base URL');
      const icons = tags(required(values.html, 'HTML source'), 'link')
        .filter((tag) => /\brel\s*=\s*(["'])[^"']*icon/iu.test(tag))
        .map((tag) => {
          const href = quotedAttribute(tag, 'href');
          if (!href) return '';
          try {
            return `${quotedAttribute(tag, 'rel') || 'icon'} · ${new URL(href, base).toString()}${quotedAttribute(tag, 'type') ? ` · ${quotedAttribute(tag, 'type')}` : ''}`;
          } catch {
            return '';
          }
        })
        .filter(Boolean);
      if (!icons.length)
        throw new Error('No quoted icon link declarations were found.');
      return icons.join('\n');
    }
    case 'web-app-manifest-generator':
      return resultObject({
        name: required(values.name, 'App name'),
        short_name: required(values.shortName, 'Short name'),
        start_url: required(values.startUrl, 'Start URL'),
        display: values.display,
        theme_color: required(values.theme, 'Theme color'),
        background_color: values.theme,
      });
    case 'browser-compatibility-checklist': {
      const feature = required(values.feature, 'Feature');
      return `Compatibility review: ${feature}\n□ Identify required browser/version matrix\n□ Verify current support in primary documentation\n□ Test feature detection, not user-agent sniffing\n□ Define a usable fallback\n□ Test permission-denied and unavailable states\n□ Test keyboard, touch, and reduced-motion behavior\n□ Record the verification date\n\nChecklist only — support data is not fetched.`;
    }
    case 'css-gradient-generator': {
      const angle = finite(values, 'angle');
      if (Math.abs(angle) > 360_000)
        throw new Error('Angle is outside the supported range.');
      const colors = lines(values.colors, 20);
      if (colors.some((color) => /[;{}]/u.test(color)))
        throw new Error('Color stops cannot contain CSS statement delimiters.');
      return `background: linear-gradient(${angle}deg, ${colors.join(', ')});`;
    }
    case 'css-shadow-generator': {
      const blur = finite(values, 'blur');
      if (blur < 0) throw new Error('Blur cannot be negative.');
      const color = required(values.color, 'Color');
      if (/[;{}]/u.test(color))
        throw new Error('Color cannot contain CSS statement delimiters.');
      return `box-shadow: ${finite(values, 'x')}px ${finite(values, 'y')}px ${blur}px ${finite(values, 'spread')}px ${color};`;
    }
    case 'css-border-radius-generator': {
      const radii = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].map(
        (key) => finite(values, key),
      );
      if (radii.some((value) => value < 0))
        throw new Error('Corner radii cannot be negative.');
      return `border-radius: ${radii.map((value) => `${value}px`).join(' ')};`;
    }
    case 'css-clip-path-generator': {
      const points = lines(values.points, 100);
      if (
        points.some(
          (point) => !/^-?\d+(?:\.\d+)?%\s+-?\d+(?:\.\d+)?%$/u.test(point),
        )
      )
        throw new Error('Every point must use x% y%.');
      return `clip-path: polygon(${points.join(', ')});`;
    }
    case 'css-grid-generator': {
      const columns = finite(values, 'columns');
      const minimum = finite(values, 'minimum');
      const gap = finite(values, 'gap');
      if (
        !Number.isInteger(columns) ||
        columns < 1 ||
        columns > 24 ||
        minimum <= 0 ||
        gap < 0
      )
        throw new Error(
          'Use 1–24 columns, a positive minimum width, and a non-negative gap.',
        );
      return `display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(min(${minimum}px, 100%), 1fr));\ngap: ${gap}px;\n/* Maximum-column container: ${(columns * minimum + (columns - 1) * gap).toFixed(0)}px */`;
    }
    case 'css-flexbox-generator': {
      const gap = finite(values, 'gap');
      if (gap < 0) throw new Error('Gap cannot be negative.');
      return `display: flex;\nflex-direction: ${values.direction};\njustify-content: ${values.justify};\nalign-items: ${values.align};\ngap: ${gap}px;`;
    }
    case 'css-clamp-calculator': {
      const minSize = finite(values, 'minSize');
      const maxSize = finite(values, 'maxSize');
      const minViewport = finite(values, 'minViewport');
      const maxViewport = finite(values, 'maxViewport');
      if (minSize >= maxSize || minViewport >= maxViewport || minViewport <= 0)
        throw new Error(
          'Maximum size and viewport must be greater than their minimums.',
        );
      const slope = (maxSize - minSize) / (maxViewport - minViewport);
      const intercept = minSize - slope * minViewport;
      return `clamp(${minSize}px, ${intercept.toFixed(4)}px + ${(slope * 100).toFixed(4)}vw, ${maxSize}px)`;
    }
    case 'responsive-breakpoint-tester': {
      const width = finite(values, 'width');
      const breakpoints = values.breakpoints.split(',').map(Number);
      if (
        width < 0 ||
        !breakpoints.length ||
        breakpoints.some((value) => !Number.isFinite(value) || value <= 0) ||
        breakpoints.some(
          (value, index) => index > 0 && value <= breakpoints[index - 1],
        )
      )
        throw new Error(
          'Use a non-negative width and ascending positive breakpoints.',
        );
      const lower = [...breakpoints].reverse().find((value) => width >= value);
      const upper = breakpoints.find((value) => width < value);
      return `${width}px falls in ${lower ? `≥${lower}px` : `<${breakpoints[0]}px`} range${upper ? ` and below ${upper}px` : ' with no higher configured breakpoint'}.`;
    }
    case 'viewport-size-calculator': {
      const width = finite(values, 'width');
      const height = finite(values, 'height');
      const vw = finite(values, 'vw');
      const vh = finite(values, 'vh');
      if (width <= 0 || height <= 0)
        throw new Error('Viewport dimensions must be positive.');
      return `${vw}vw = ${((width * vw) / 100).toFixed(2)}px\n${vh}vh = ${((height * vh) / 100).toFixed(2)}px`;
    }
    case 'aspect-ratio-calculator': {
      const width = finite(values, 'width');
      const height = finite(values, 'height');
      const target = finite(values, 'newWidth');
      if (
        width <= 0 ||
        height <= 0 ||
        target <= 0 ||
        !Number.isInteger(width) ||
        !Number.isInteger(height)
      )
        throw new Error(
          'Dimensions must be positive, with whole-number source dimensions.',
        );
      const divisor = gcd(width, height);
      return `${width / divisor}:${height / divisor}\nAt ${target}px wide: ${((target * height) / width).toFixed(2)}px high`;
    }
    case 'html-table-generator': {
      const rows = lines(values.table, 2_000).map((row) => row.split('\t'));
      const width = rows[0].length;
      if (!width || rows.some((row) => row.length !== width))
        throw new Error(
          'Every tab-separated row must have the same number of columns.',
        );
      const cells = (row: string[], element: 'th' | 'td') =>
        `    <tr>${row.map((cell) => `<${element}>${html(cell)}</${element}>`).join('')}</tr>`;
      return `<table>\n  <thead>\n${cells(rows[0], 'th')}\n  </thead>\n  <tbody>\n${rows
        .slice(1)
        .map((row) => cells(row, 'td'))
        .join('\n')}\n  </tbody>\n</table>`;
    }
    case 'accessibility-contrast-checker': {
      const first = luminance(parseHex(values.foreground));
      const second = luminance(parseHex(values.background));
      const ratio =
        (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
      return `${ratio.toFixed(2)}:1\nAA normal text: ${ratio >= 4.5 ? 'pass' : 'fail'}\nAA large text: ${ratio >= 3 ? 'pass' : 'fail'}\nAAA normal text: ${ratio >= 7 ? 'pass' : 'fail'}\nAAA large text: ${ratio >= 4.5 ? 'pass' : 'fail'}`;
    }
    case 'aria-label-checklist': {
      const source = required(values.html, 'HTML source');
      const candidates = [
        ...source.matchAll(
          /<(button|img|input|select|textarea|a)\b[^>]*>(?:[\s\S]*?<\/\1>)?/giu,
        ),
      ].map((match) => match[0]);
      const issues = candidates.flatMap((tag, index) => {
        const kind =
          /^<(\w+)/u.exec(tag)?.[1].toLocaleLowerCase('en-US') ?? 'element';
        const named =
          /\b(?:aria-label|aria-labelledby|alt|title)\s*=\s*(["'])\S[\s\S]*?\1/iu.test(
            tag,
          ) ||
          (kind !== 'img' && />\s*[^<\s][\s\S]*?</u.test(tag));
        return named
          ? []
          : [
              `${index + 1}. ${kind} may lack an accessible name: ${tag.slice(0, 100)}`,
            ];
      });
      return issues.length
        ? `${issues.length} potential issues\n${issues.join('\n')}`
        : `${candidates.length} inspected elements · no obvious missing names found.\nSource heuristic only; run a browser accessibility audit before release.`;
    }
    case 'heading-structure-checker': {
      const headings = [
        ...required(values.html, 'HTML source').matchAll(
          /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/giu,
        ),
      ].map((match) => ({
        level: Number(match[1]),
        text: decodeXml(match[2].replace(/<[^>]*>/gu, '').trim()),
      }));
      if (!headings.length) throw new Error('No h1–h6 elements were found.');
      const reports: string[] = [];
      let previous = 0;
      for (const heading of headings) {
        const skipped =
          previous && heading.level > previous + 1 ? ' · LEVEL SKIP' : '';
        reports.push(
          `h${heading.level}: ${heading.text || '(empty)'}${skipped}`,
        );
        previous = heading.level;
      }
      return reports.join('\n');
    }
    case 'keyword-density-analyzer': {
      const content = required(values.content, 'Content');
      const keyword = required(values.keyword, 'Keyword').toLocaleLowerCase(
        'en-US',
      );
      const words =
        content
          .toLocaleLowerCase('en-US')
          .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
      const phraseWords =
        keyword.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
      if (!phraseWords.length)
        throw new Error('Keyword must contain a word or number.');
      let matches = 0;
      for (
        let index = 0;
        index <= words.length - phraseWords.length;
        index += 1
      )
        if (phraseWords.every((word, offset) => words[index + offset] === word))
          matches += 1;
      return `${matches} exact phrase matches\n${words.length} total words\n${words.length ? (((matches * phraseWords.length) / words.length) * 100).toFixed(2) : '0.00'}% of word positions`;
    }
    case 'text-to-html-link': {
      const url = absoluteUrl(values.url).toString();
      const target =
        values.target === 'blank'
          ? ' target="_blank" rel="noopener noreferrer"'
          : '';
      return `<a href="${html(url)}"${target}>${html(required(values.label, 'Link text'))}</a>`;
    }
    case 'svg-optimizer': {
      return optimizeSvg(values);
    }
    case 'favicon-html-generator': {
      return generateFaviconHtml(values);
    }
    case 'css-glassmorphism-generator': {
      return generateGlassmorphismCss(values);
    }
    case 'css-neumorphism-generator': {
      return generateNeumorphismCss(values);
    }
    case 'css-animation-generator': {
      return generateAnimationCss(values);
    }
    case 'css-gradient-studio': {
      return generateGradientStudioCss(values);
    }
    default:
      throw new Error('Choose a supported web or SEO operation.');
  }
}

function optimizeSvg(values: Record<string, string>): string {
  const rawSvg = required(values.svg, 'SVG XML markup');
  if (!rawSvg.toLowerCase().includes('<svg')) {
    throw new Error('Input must contain a valid <svg> root element.');
  }

  const removeComments = values.removeComments !== 'no';
  const removeMetadata = values.removeMetadata !== 'no';
  const minifyWhitespace = values.minifyWhitespace !== 'no';
  const precision = values.precision || '2';

  let optimized = rawSvg;

  // 1. Remove XML declarations and doctype
  optimized = optimized.replace(/<\?xml[\s\S]*?\?>/giu, '');
  optimized = optimized.replace(/<!DOCTYPE[\s\S]*?>/giu, '');

  // 2. Remove comments
  if (removeComments) {
    optimized = optimized.replace(/<!--[\s\S]*?-->/gu, '');
  }

  // 3. Remove metadata, editor tags, and namespaces
  if (removeMetadata) {
    optimized = optimized.replace(/<metadata[\s\S]*?<\/metadata>/giu, '');
    optimized = optimized.replace(/<sodipodi:namedview[\s\S]*?\/>/giu, '');
    optimized = optimized.replace(/<inkscape:[a-zA-Z0-9_-]+[\s\S]*?\/>/giu, '');
    optimized = optimized.replace(
      /\s*xmlns:(?:inkscape|sodipodi|adobe|sketch|serif|i|x)="[^"]*"/giu,
      '',
    );
    optimized = optimized.replace(
      /\s*(?:inkscape|sodipodi|adobe|sketch|serif|i|x):[a-zA-Z0-9_-]+="[^"]*"/giu,
      '',
    );
    optimized = optimized.replace(/\s*id="Layer_\d+"/giu, '');
    optimized = optimized.replace(/\s*xml:space="preserve"/giu, '');
  }

  // 4. Round numeric coordinates
  if (precision !== 'none') {
    const decimals = parseInt(precision, 10);
    if (!isNaN(decimals) && decimals >= 0 && decimals <= 4) {
      optimized = optimized.replace(
        /(\b(?:d|points|viewBox|cx|cy|r|rx|ry|x|y|x1|y1|x2|y2|width|height)=")([^"]+)(")/giu,
        (_match, prefix, content, suffix) => {
          const rounded = content.replace(/-?\d+\.\d+/gu, (numStr: string) => {
            const val = parseFloat(numStr);
            return val.toFixed(decimals).replace(/\.?0+$/u, '');
          });
          return `${prefix}${rounded}${suffix}`;
        },
      );
    }
  }

  // 5. Minify whitespace
  if (minifyWhitespace) {
    optimized = optimized
      .replace(/>\s+</gu, '><')
      .replace(/\s{2,}/gu, ' ')
      .trim();
  } else {
    optimized = optimized.trim();
  }

  const origBytes = new TextEncoder().encode(rawSvg).length;
  const optBytes = new TextEncoder().encode(optimized).length;
  const savedBytes = Math.max(0, origBytes - optBytes);
  const pct =
    origBytes > 0 ? ((savedBytes / origBytes) * 100).toFixed(2) : '0.00';

  return [
    '/* SVG Optimization Report */',
    `Original Size:   ${origBytes.toLocaleString()} bytes`,
    `Optimized Size:  ${optBytes.toLocaleString()} bytes`,
    `Reduction:       ${pct}% saved (${savedBytes.toLocaleString()} bytes removed)`,
    '',
    '=== Optimized SVG Code ===',
    optimized,
  ].join('\n');
}

function generateFaviconHtml(values: Record<string, string>): string {
  const appName = values.appName?.trim() || 'OpenTools';
  const shortName = values.shortName?.trim() || appName.slice(0, 12);
  const themeColor = values.themeColor?.trim() || '#09090b';
  const tileColor = values.tileColor?.trim() || '#09090b';
  let basePath = (values.basePath?.trim() || '/').replace(/\/+$/u, '');
  if (basePath && !basePath.startsWith('/')) {
    basePath = `/${basePath}`;
  }
  const prefix = basePath ? `${basePath}/` : '/';

  const htmlTags = [
    `<!-- Standard Favicon & Multi-Platform Web App Icons -->`,
    `<link rel="icon" type="image/x-icon" href="${prefix}favicon.ico">`,
    `<link rel="icon" type="image/png" sizes="16x16" href="${prefix}favicon-16x16.png">`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${prefix}favicon-32x32.png">`,
    `<link rel="icon" type="image/png" sizes="48x48" href="${prefix}favicon-48x48.png">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${prefix}apple-touch-icon.png">`,
    `<link rel="manifest" href="${prefix}site.webmanifest">`,
    `<meta name="theme-color" content="${themeColor}">`,
    `<meta name="apple-mobile-web-app-title" content="${appName}">`,
    `<meta name="application-name" content="${appName}">`,
    `<meta name="msapplication-TileColor" content="${tileColor}">`,
  ].join('\n');

  const manifest = JSON.stringify(
    {
      name: appName,
      short_name: shortName,
      icons: [
        {
          src: `${prefix}android-chrome-192x192.png`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: `${prefix}android-chrome-512x512.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      theme_color: themeColor,
      background_color: themeColor,
      display: 'standalone',
      start_url: '/',
    },
    null,
    2,
  );

  return [
    '/* HTML <head> Favicon Tags */',
    htmlTags,
    '',
    '/* site.webmanifest Content */',
    manifest,
  ].join('\n');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num) || clean.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function adjustHexColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  const newR = Math.max(
    0,
    Math.min(
      255,
      Math.round(r + (percent > 0 ? (255 - r) * factor : r * factor)),
    ),
  );
  const newG = Math.max(
    0,
    Math.min(
      255,
      Math.round(g + (percent > 0 ? (255 - g) * factor : g * factor)),
    ),
  );
  const newB = Math.max(
    0,
    Math.min(
      255,
      Math.round(b + (percent > 0 ? (255 - b) * factor : b * factor)),
    ),
  );
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
}

function generateGlassmorphismCss(values: Record<string, string>): string {
  const blur = Math.max(
    0,
    Math.min(100, parseFloat(values.blur || '16') || 16),
  );
  const opacity =
    Math.max(0, Math.min(100, parseFloat(values.opacity || '25') || 25)) / 100;
  const tint = values.tint?.trim() || '#ffffff';
  const borderOpacity =
    Math.max(0, Math.min(100, parseFloat(values.borderOpacity || '20') || 20)) /
    100;
  const shadowDepth = values.shadowDepth || 'subtle';
  const radius = Math.max(
    0,
    Math.min(100, parseFloat(values.borderRadius || '16') || 16),
  );

  const { r, g, b } = hexToRgb(tint);

  let shadow = 'none';
  if (shadowDepth === 'subtle') {
    shadow = '0 8px 32px 0 rgba(0, 0, 0, 0.12)';
  } else if (shadowDepth === 'medium') {
    shadow =
      '0 12px 40px 0 rgba(0, 0, 0, 0.25), 0 2px 6px 0 rgba(0, 0, 0, 0.08)';
  } else if (shadowDepth === 'deep') {
    shadow =
      '0 20px 50px 0 rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.1) inset';
  }

  const cssProperties = [
    `background: rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)});`,
    `-webkit-backdrop-filter: blur(${blur}px);`,
    `backdrop-filter: blur(${blur}px);`,
    `border: 1px solid rgba(${r}, ${g}, ${b}, ${borderOpacity.toFixed(2)});`,
    `border-radius: ${radius}px;`,
    `box-shadow: ${shadow};`,
  ].join('\n  ');

  return `/* Glassmorphism CSS */
.glass-card {
  ${cssProperties}
}

/* HTML Container Template */
<div class="glass-card" style="padding: 24px; max-width: 400px;">
  <h3 style="margin-top: 0; color: inherit;">Glassmorphic Card</h3>
  <p style="margin-bottom: 0; opacity: 0.9;">Frosted glass effect with GPU blur acceleration.</p>
</div>`;
}

function generateNeumorphismCss(values: Record<string, string>): string {
  const baseColor = values.baseColor?.trim() || '#e0e5ec';
  const distance = Math.max(
    1,
    Math.min(60, parseFloat(values.distance || '12') || 12),
  );
  const blur = Math.max(
    1,
    Math.min(100, parseFloat(values.blur || '24') || 24),
  );
  const shape = values.shape || 'flat';
  const lightAngle = values.lightAngle || 'top-left';
  const intensity = Math.max(
    5,
    Math.min(40, parseFloat(values.intensity || '15') || 15),
  );
  const radius = Math.max(
    0,
    Math.min(100, parseFloat(values.borderRadius || '20') || 20),
  );

  let xLight = -distance;
  let yLight = -distance;
  let xDark = distance;
  let yDark = distance;

  if (lightAngle === 'top-right') {
    xLight = distance;
    yLight = -distance;
    xDark = -distance;
    yDark = distance;
  } else if (lightAngle === 'bottom-left') {
    xLight = -distance;
    yLight = distance;
    xDark = distance;
    yDark = -distance;
  } else if (lightAngle === 'bottom-right') {
    xLight = distance;
    yLight = distance;
    xDark = -distance;
    yDark = -distance;
  }

  const lightColor = adjustHexColor(baseColor, intensity * 1.5);
  const darkColor = adjustHexColor(baseColor, -intensity * 1.5);

  let bgCss = `background: ${baseColor};`;
  if (shape === 'concave') {
    bgCss = `background: linear-gradient(145deg, ${darkColor}, ${lightColor});`;
  } else if (shape === 'convex') {
    bgCss = `background: linear-gradient(145deg, ${lightColor}, ${darkColor});`;
  }

  let shadowCss = `box-shadow: ${xDark}px ${yDark}px ${blur}px ${darkColor}, ${xLight}px ${yLight}px ${blur}px ${lightColor};`;
  if (shape === 'pressed') {
    shadowCss = `box-shadow: inset ${xDark}px ${yDark}px ${blur}px ${darkColor}, inset ${xLight}px ${yLight}px ${blur}px ${lightColor};`;
  }

  return `/* Neumorphism (${shape}) CSS */
.neumorphic-element {
  border-radius: ${radius}px;
  ${bgCss}
  ${shadowCss}
}

/* HTML Button / Container Template */
<div class="neumorphic-element" style="padding: 24px; max-width: 320px; text-align: center;">
  <span style="font-weight: 600; color: #334155;">Soft UI Surface</span>
</div>`;
}

function generateAnimationCss(values: Record<string, string>): string {
  const animType = values.animationType || 'float';
  const duration = Math.max(
    0.1,
    Math.min(60, parseFloat(values.duration || '2.0') || 2.0),
  );
  const timing = values.timingFunction || 'ease-in-out';
  const iteration = values.iterationCount || 'infinite';
  const direction = values.direction || 'normal';
  const fillMode = values.fillMode || 'both';
  const gpu = values.gpuAcceleration !== 'no';

  let keyframeName = animType;
  let keyframeBody = '';

  switch (animType) {
    case 'float':
      keyframeBody = `  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-14px);
  }`;
      break;
    case 'pulse-glow':
      keyframeBody = `  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 24px 8px rgba(99, 102, 241, 0.25);
  }`;
      break;
    case 'shake':
      keyframeBody = `  0%, 100% {
    transform: translateX(0);
  }
  15%, 45%, 75% {
    transform: translateX(-8px) rotate(-1.5deg);
  }
  30%, 60%, 90% {
    transform: translateX(8px) rotate(1.5deg);
  }`;
      break;
    case 'bounce':
      keyframeBody = `  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-26px);
  }
  60% {
    transform: translateY(-12px);
  }`;
      break;
    case 'spin-3d':
      keyframeBody = `  0% {
    transform: perspective(600px) rotateY(0deg) rotateX(0deg);
  }
  50% {
    transform: perspective(600px) rotateY(180deg) rotateX(15deg);
  }
  100% {
    transform: perspective(600px) rotateY(360deg) rotateX(0deg);
  }`;
      break;
    case 'slide-fade-in':
      keyframeBody = `  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }`;
      break;
    case 'heartbeat':
      keyframeBody = `  0% {
    transform: scale(1);
  }
  14% {
    transform: scale(1.18);
  }
  28% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.18);
  }
  70% {
    transform: scale(1);
  }`;
      break;
    case 'shimmer':
      keyframeBody = `  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }`;
      break;
    default:
      keyframeName = 'custom-anim';
      keyframeBody = `  0% { transform: scale(1); }
  100% { transform: scale(1.1); }`;
  }

  const gpuCss = gpu
    ? `\n  will-change: transform, opacity;\n  transform: translateZ(0);\n  backface-visibility: hidden;`
    : '';

  return `/* 1. CSS Keyframe Definition */
@keyframes ${keyframeName} {
${keyframeBody}
}

/* 2. Target Animation Class */
.animated-element {
  animation-name: ${keyframeName};
  animation-duration: ${duration}s;
  animation-timing-function: ${timing};
  animation-delay: 0s;
  animation-iteration-count: ${iteration};
  animation-direction: ${direction};
  animation-fill-mode: ${fillMode};${gpuCss}
}

/* 3. HTML Integration Example */
<div class="animated-element" style="display: inline-block; padding: 16px 24px; background: #18181b; color: #ffffff; border-radius: 8px; font-weight: 600;">
  Animated Content
</div>`;
}

function generateGradientStudioCss(values: Record<string, string>): string {
  const type = values.type || 'linear';
  const direction = values.direction || '135deg';
  const rawStops = required(values.colorStops, 'Color stops');
  const format = values.format || 'all';

  const stopLines = rawStops
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!stopLines.length) {
    throw new Error('Enter at least one color stop.');
  }

  const parsedStops = stopLines.map((line, idx) => {
    const parts = line.split(/\s+/u);
    if (parts.length === 1) {
      const defaultPos = Math.round(
        (idx / Math.max(1, stopLines.length - 1)) * 100,
      );
      return { color: parts[0], pos: `${defaultPos}%` };
    }
    return { color: parts[0], pos: parts.slice(1).join(' ') };
  });

  const stopsCss = parsedStops.map((s) => `${s.color} ${s.pos}`).join(', ');

  let cssFunc = '';
  if (type === 'radial') {
    const dir =
      direction.includes('at') ||
      direction.includes('circle') ||
      direction.includes('ellipse')
        ? direction
        : 'circle at center';
    cssFunc = `radial-gradient(${dir}, ${stopsCss})`;
  } else if (type === 'conic') {
    const dir =
      direction.includes('from') || direction.includes('at')
        ? direction
        : 'from 0deg at center';
    cssFunc = `conic-gradient(${dir}, ${stopsCss})`;
  } else if (type === 'repeating-linear') {
    cssFunc = `repeating-linear-gradient(${direction}, ${stopsCss})`;
  } else if (type === 'repeating-radial') {
    const dir =
      direction.includes('at') ||
      direction.includes('circle') ||
      direction.includes('ellipse')
        ? direction
        : 'circle at center';
    cssFunc = `repeating-radial-gradient(${dir}, ${stopsCss})`;
  } else {
    cssFunc = `linear-gradient(${direction}, ${stopsCss})`;
  }

  const twClass = `bg-[${cssFunc.replaceAll(' ', '_')}]`;

  const svgStops = parsedStops
    .map((s) => {
      const offset = s.pos.endsWith('%')
        ? s.pos
        : `${parseInt(s.pos, 10) || 0}%`;
      return `    <stop offset="${offset}" stop-color="${s.color}"/>`;
    })
    .join('\n');

  const svgGrad =
    type === 'radial' || type === 'repeating-radial'
      ? `<radialGradient id="gradient" cx="50%" cy="50%" r="50%">\n${svgStops}\n  </radialGradient>`
      : `<linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">\n${svgStops}\n  </linearGradient>`;

  const pureCss = `/* Standard CSS */\n.gradient-surface {\n  background-image: ${cssFunc};\n}`;

  if (format === 'css') {
    return pureCss;
  }
  if (format === 'tailwind') {
    return `<!-- Tailwind CSS Arbitrary Value -->\n<div class="${twClass}"></div>`;
  }
  if (format === 'svg') {
    return `<!-- SVG Gradient Definition -->\n<defs>\n  ${svgGrad}\n</defs>`;
  }

  return `/* 1. Pure CSS Declarations */\n.gradient-surface {\n  background-image: ${cssFunc};\n}\n\n/* 2. Tailwind CSS Utility */\n${twClass}\n\n/* 3. SVG <defs> Tag */\n<defs>\n  ${svgGrad}\n</defs>\n\n/* 4. HTML Preview Container */\n<div style="width: 100%; height: 240px; border-radius: 16px; background-image: ${cssFunc};"></div>`;
}
