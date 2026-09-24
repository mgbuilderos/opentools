// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
//
// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'css-visual-studios',
    title: 'CSS & Visual Design Studios',
    description:
      'Multi-stop gradients, glassmorphism, neumorphism, and animations.',
    destinations: [
      {
        id: 'web-workbench:css-gradient-generator',
        name: 'CSS gradient generator',
        description:
          'Generate linear-gradient CSS from validated angle and color stops.',
        href: '/web/workbench?tool=css-gradient-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-shadow-generator',
        name: 'CSS shadow generator',
        description:
          'Generate a CSS box-shadow declaration from numeric controls.',
        href: '/web/workbench?tool=css-shadow-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-border-radius-generator',
        name: 'CSS border-radius generator',
        description:
          'Set a pixel radius for each corner and get the border-radius shorthand back in top-left, top-right, bottom-right, bottom-left order. Negatives are refused.',
        href: '/web/workbench?tool=css-border-radius-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-clip-path-generator',
        name: 'CSS clip-path generator',
        description:
          'Generate a polygon() declaration from validated percentage coordinate pairs.',
        href: '/web/workbench?tool=css-clip-path-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-grid-generator',
        name: 'CSS grid generator',
        description:
          'Generate a responsive grid declaration from columns, gap, and minimum width.',
        href: '/web/workbench?tool=css-grid-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-flexbox-generator',
        name: 'CSS flexbox generator',
        description:
          'Pick a direction, a justify-content and align-items value, and a pixel gap, then copy the matching flex container block without recalling the property names.',
        href: '/web/workbench?tool=css-flexbox-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-clamp-calculator',
        name: 'CSS clamp calculator',
        description:
          'Generate a linear fluid clamp() expression between two viewport widths.',
        href: '/web/workbench?tool=css-clamp-calculator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-glassmorphism-generator',
        name: 'CSS glassmorphism & backdrop-filter generator',
        description:
          'Generate modern frosted glass CSS effects with backdrop blur, specular border highlights, and surface opacity.',
        href: '/web/workbench?tool=css-glassmorphism-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-neumorphism-generator',
        name: 'CSS neumorphism & soft-shadow generator',
        description:
          'Calculate dual light and dark physics-based box shadows for soft UI buttons, cards, and inset surfaces.',
        href: '/web/workbench?tool=css-neumorphism-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-animation-generator',
        name: 'CSS keyframe animation & physics generator',
        description:
          'Generate optimized pure CSS keyframe animations (pulse, shake, float, bounce, spin, fade-slide, shimmer) with custom easing curves and GPU acceleration.',
        href: '/web/workbench?tool=css-animation-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:css-gradient-studio',
        name: 'CSS Gradient Studio & SVG generator',
        description:
          'Generate modern linear, radial, and conic CSS gradients with multi-color stops, angle controls, Tailwind CSS classes, and SVG defs.',
        href: '/web/workbench?tool=css-gradient-studio',
        workspaceId: 'web-workbench',
      },
    ],
  },
  {
    id: 'webmaster-metadata',
    title: 'Webmaster & Search Engine Metadata',
    description: 'Meta tags, Open Graph tags, robots.txt, and sitemaps.',
    destinations: [
      {
        id: 'file-to-html',
        name: 'File to HTML converter',
        description:
          'Turn images into email-ready HTML with the images packaged alongside it, or into one standalone web page.',
        href: '/web/file-to-html',
        workspaceId: 'file-to-html',
      },
      {
        id: 'web-workbench:meta-tag-generator',
        name: 'Meta tag generator',
        description:
          'Generate an escaped title, description, robots, and canonical head block.',
        href: '/web/workbench?tool=meta-tag-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:open-graph-generator',
        name: 'Open Graph generator',
        description: 'Generate escaped Open Graph tags for a share preview.',
        href: '/web/workbench?tool=open-graph-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:twitter-card-generator',
        name: 'Twitter card generator',
        description: 'Generate X/Twitter card tags without fetching a page.',
        href: '/web/workbench?tool=twitter-card-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:serp-snippet-preview',
        name: 'SERP snippet preview',
        description:
          'Create a text preview with transparent title and description character counts.',
        href: '/web/workbench?tool=serp-snippet-preview',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:robots-txt-generator',
        name: 'Robots.txt generator',
        description:
          'Create a small robots.txt policy from user-agent and path rules.',
        href: '/web/workbench?tool=robots-txt-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:robots-txt-tester',
        name: 'Robots.txt tester',
        description:
          'Evaluate Allow/Disallow path rules using longest matching rule; wildcards are not interpreted.',
        href: '/web/workbench?tool=robots-txt-tester',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:sitemap-generator',
        name: 'Sitemap generator',
        description:
          'Turn absolute HTTP(S) URLs into an escaped sitemap XML document.',
        href: '/web/workbench?tool=sitemap-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:sitemap-viewer',
        name: 'Sitemap viewer',
        description:
          'Extract and decode <loc> values from sitemap XML without making requests.',
        href: '/web/workbench?tool=sitemap-viewer',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:canonical-url-builder',
        name: 'Canonical URL builder',
        description:
          'Normalize an absolute URL and generate an escaped canonical link tag.',
        href: '/web/workbench?tool=canonical-url-builder',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:hreflang-generator',
        name: 'Hreflang generator',
        description:
          'Generate alternate-language link tags from locale and URL pairs.',
        href: '/web/workbench?tool=hreflang-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:schema-markup-generator',
        name: 'Schema markup generator',
        description:
          'Generate a minimal JSON-LD WebSite, Organization, or WebPage object.',
        href: '/web/workbench?tool=schema-markup-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:schema-markup-validator',
        name: 'Schema markup validator',
        description:
          'Validate JSON syntax and the required JSON-LD @context and @type fields.',
        href: '/web/workbench?tool=schema-markup-validator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:html-head-inspector',
        name: 'HTML head inspector',
        description:
          'Inventory title, meta, and link elements from supplied HTML; this is not a browser render.',
        href: '/web/workbench?tool=html-head-inspector',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:link-extractor',
        name: 'Link extractor',
        description:
          'Extract quoted href attributes from supplied HTML and resolve them against a base URL.',
        href: '/web/workbench?tool=link-extractor',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:redirect-chain-planner',
        name: 'Redirect chain planner',
        description:
          'Inspect source→destination pairs for chains, loops, and duplicate sources.',
        href: '/web/workbench?tool=redirect-chain-planner',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:url-normalizer',
        name: 'URL normalizer',
        description:
          'Lowercase host, remove fragments/default ports, sort parameters, and normalize the path.',
        href: '/web/workbench?tool=url-normalizer',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:utm-builder',
        name: 'UTM builder',
        description:
          'Add source, medium, campaign, term, and content parameters to an absolute URL.',
        href: '/web/workbench?tool=utm-builder',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:utm-parser',
        name: 'UTM parser',
        description:
          'Paste a campaign web address and read back its utm_source, utm_medium, utm_campaign, utm_term and utm_content values. HTTP and HTTPS addresses only.',
        href: '/web/workbench?tool=utm-parser',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:query-string-builder',
        name: 'Query string builder',
        description: 'Build an encoded query string from key=value lines.',
        href: '/web/workbench?tool=query-string-builder',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:query-string-parser',
        name: 'Query string parser',
        description:
          'Parse a query string and preserve repeated keys as arrays.',
        href: '/web/workbench?tool=query-string-parser',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:domain-name-generator',
        name: 'Domain name generator',
        description:
          'Generate deterministic domain candidates from comma-separated words; availability is not checked.',
        href: '/web/workbench?tool=domain-name-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:domain-typo-generator',
        name: 'Domain typo generator',
        description:
          'Generate bounded omission, transposition, and adjacent-key typo candidates for defensive review.',
        href: '/web/workbench?tool=domain-typo-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:favicon-inspector',
        name: 'Favicon inspector',
        description:
          'Extract icon link declarations from supplied HTML; no remote page is fetched.',
        href: '/web/workbench?tool=favicon-inspector',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:web-app-manifest-generator',
        name: 'Web app manifest generator',
        description:
          'Generate a minimal standards-shaped web app manifest JSON file.',
        href: '/web/workbench?tool=web-app-manifest-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:browser-compatibility-checklist',
        name: 'Browser compatibility checklist',
        description:
          'Create a review checklist for a selected browser feature; this is not live compatibility data.',
        href: '/web/workbench?tool=browser-compatibility-checklist',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:responsive-breakpoint-tester',
        name: 'Responsive breakpoint tester',
        description:
          'Classify a supplied viewport width against editable ascending breakpoints.',
        href: '/web/workbench?tool=responsive-breakpoint-tester',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:viewport-size-calculator',
        name: 'Viewport size calculator',
        description:
          'Convert vw/vh percentages to pixels for a specified viewport.',
        href: '/web/workbench?tool=viewport-size-calculator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:aspect-ratio-calculator',
        name: 'Aspect-ratio calculator',
        description:
          'Reduce a width:height ratio and calculate a missing dimension.',
        href: '/web/workbench?tool=aspect-ratio-calculator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:html-table-generator',
        name: 'HTML table generator',
        description:
          'Convert tab-separated rows to an escaped HTML table; first row becomes the header.',
        href: '/web/workbench?tool=html-table-generator',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:accessibility-contrast-checker',
        name: 'Accessibility contrast checker',
        description:
          'Calculate WCAG contrast ratio and AA/AAA text thresholds for two hex colors.',
        href: '/web/workbench?tool=accessibility-contrast-checker',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:aria-label-checklist',
        name: 'ARIA label checklist',
        description:
          'Flag common supplied-HTML controls that lack visible text or accessible naming attributes.',
        href: '/web/workbench?tool=aria-label-checklist',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:heading-structure-checker',
        name: 'Heading structure checker',
        description:
          'List headings and flag level skips in supplied HTML source.',
        href: '/web/workbench?tool=heading-structure-checker',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:keyword-density-analyzer',
        name: 'Keyword density analyzer',
        description:
          'Count exact case-insensitive phrase occurrences and percentage of word starts.',
        href: '/web/workbench?tool=keyword-density-analyzer',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:text-to-html-link',
        name: 'Text to HTML link',
        description:
          'Create an escaped anchor element from label, absolute URL, and target preference.',
        href: '/web/workbench?tool=text-to-html-link',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:svg-optimizer',
        name: 'SVG optimizer & cleaner',
        description:
          'Clean and optimize SVG code by stripping comments, editor metadata, redundant attributes, and rounding coordinates.',
        href: '/web/workbench?tool=svg-optimizer',
        workspaceId: 'web-workbench',
      },
      {
        id: 'web-workbench:favicon-html-generator',
        name: 'Favicon & app icon HTML snippet generator',
        description:
          'Generate production-ready HTML <link> tags and web app manifest configurations for modern browsers and mobile devices.',
        href: '/web/workbench?tool=favicon-html-generator',
        workspaceId: 'web-workbench',
      },
    ],
  },
];
