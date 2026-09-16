import { type ToolCatalogEntry, getToolBySlug } from './tool-catalog-data';
import {
  type CategoryPillarInfo,
  type RelatedToolLink,
  getCategoryPillar,
  getRelatedToolLinks,
} from './internal-linking-graph';

export interface GuideStep {
  name: string;
  text: string;
}

export interface GuideFaq {
  question: string;
  answer: string;
}

export interface GuideComparisonRow {
  aspect: string;
  localTools: string;
  traditionalCloud: string;
}

export interface ToolGuideData {
  tool: ToolCatalogEntry;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  heading: string;
  directAnswer: string;
  leadParagraph: string;
  technicalArchitecture: string;
  diagramSvg: string;
  steps: readonly GuideStep[];
  comparison: readonly GuideComparisonRow[];
  faqs: readonly GuideFaq[];
  relatedTools: readonly RelatedToolLink[];
  categoryPillar?: CategoryPillarInfo;
  jsonLd: Record<string, unknown>;
}

function getSemanticEntities(tool: ToolCatalogEntry) {
  const entities: Array<{ '@type': string; name: string }> = [
    { '@type': 'Thing', name: `${tool.category} processing` },
    { '@type': 'Thing', name: 'Client-side computing' },
    { '@type': 'Thing', name: 'Zero-egress architecture' },
  ];
  if (tool.category === 'PDF') {
    entities.push({
      '@type': 'Standard',
      name: 'ISO 32000-1 (Document Management - PDF)',
    });
  } else if (tool.category === 'Archive and File') {
    entities.push({
      '@type': 'Standard',
      name: 'POSIX tar / ZIP Archive Specification (ISO/IEC 21320-1)',
    });
  } else if (tool.category === 'Audio' || tool.category === 'Video') {
    entities.push({
      '@type': 'Standard',
      name: 'W3C Web Audio API Recommendation',
    });
  } else if (tool.executionMode === 'local-wasm') {
    entities.push({
      '@type': 'Standard',
      name: 'W3C WebAssembly Core Specification',
    });
  }
  return entities;
}

export function generateArchitectureDiagramSvg(
  toolName: string,
  executionMode: string,
): string {
  const runtime =
    executionMode === 'local-wasm'
      ? 'WebAssembly (WASM)'
      : 'JavaScript (V8/JSC)';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 260" width="100%" height="100%" fill="none" class="rounded-xl border bg-card">
  <!-- Grid background accents -->
  <defs>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" stroke-opacity="0.04" stroke-width="1" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />

  <!-- Top track: Traditional Cloud Tools (Risky) -->
  <g transform="translate(20, 25)">
    <text x="0" y="14" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="11" font-weight="600">TRADITIONAL CLOUD CONVERTERS (SERVER-SIDE)</text>
    
    <rect x="0" y="26" width="160" height="60" rx="8" stroke="currentColor" stroke-opacity="0.2" fill="currentColor" fill-opacity="0.02" />
    <text x="14" y="52" fill="currentColor" font-family="system-ui, sans-serif" font-size="12" font-weight="600">Your Device</text>
    <text x="14" y="70" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="10">Raw Document</text>

    <!-- Arrow -->
    <path d="M 165 56 L 225 56" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-dasharray="4 3" />
    <text x="175" y="48" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="9">Internet Upload</text>

    <rect x="230" y="26" width="180" height="60" rx="8" stroke="currentColor" stroke-opacity="0.3" fill="currentColor" fill-opacity="0.04" />
    <text x="244" y="52" fill="currentColor" font-family="system-ui, sans-serif" font-size="12" font-weight="600">Cloud Server Disk</text>
    <text x="244" y="70" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="10">Stored &amp; Queued</text>

    <!-- Arrow -->
    <path d="M 415 56 L 475 56" stroke="currentColor" stroke-opacity="0.3" stroke-width="1.5" stroke-dasharray="4 3" />
    <text x="425" y="48" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="9">Cloud Download</text>

    <rect x="480" y="26" width="230" height="60" rx="8" stroke="currentColor" stroke-opacity="0.2" fill="currentColor" fill-opacity="0.02" />
    <text x="494" y="52" fill="currentColor" font-family="system-ui, sans-serif" font-size="12" font-weight="600">Download Output</text>
    <text x="494" y="70" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="10">Server copy retained on disk</text>
  </g>

  <!-- Divider -->
  <line x1="20" y1="135" x2="740" y2="135" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="2 2" />

  <!-- Bottom track: OpenTools Zero-Egress In-Browser Architecture -->
  <g transform="translate(20, 150)">
    <text x="0" y="14" fill="currentColor" font-family="monospace" font-size="11" font-weight="700">OPENTOOLS ZERO-EGRESS IN-BROWSER EXECUTION</text>

    <rect x="0" y="26" width="220" height="64" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03" />
    <text x="14" y="50" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Your Browser Tab</text>
    <text x="14" y="70" fill="currentColor" fill-opacity="0.6" font-family="monospace" font-size="10">Device RAM: Zero network upload</text>

    <!-- Arrow -->
    <path d="M 225 58 L 275 58" stroke="currentColor" stroke-width="2" />
    <polygon points="275,54 285,58 275,62" fill="currentColor" />
    <text x="232" y="48" fill="currentColor" fill-opacity="0.7" font-family="monospace" font-size="9">Direct Memory</text>

    <rect x="288" y="26" width="240" height="64" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05" />
    <text x="302" y="50" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="700">${runtime}</text>
    <text x="302" y="70" fill="currentColor" fill-opacity="0.6" font-family="monospace" font-size="10">connect-src none (Strict Invariant)</text>

    <!-- Arrow -->
    <path d="M 533 58 L 578 58" stroke="currentColor" stroke-width="2" />
    <polygon points="578,54 588,58 578,62" fill="currentColor" />
    <text x="540" y="48" fill="currentColor" fill-opacity="0.7" font-family="monospace" font-size="9">Instant Save</text>

    <rect x="592" y="26" width="128" height="64" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03" />
    <text x="606" y="50" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Local Disk</text>
    <text x="606" y="70" fill="currentColor" fill-opacity="0.6" font-family="monospace" font-size="10">Buffers Revoked</text>
  </g>
</svg>`;
}

export function generateToolGuide(tool: ToolCatalogEntry): ToolGuideData {
  const metaTitle = `How to ${tool.name} Online Free — 100% Private Browser Tool`;
  const metaDescription = `${tool.name} directly in your browser. 100% client-side execution with zero server uploads, complete privacy, no file size limits to server, and completely free forever.`;
  const eyebrow = `${tool.category} / Free Browser Utility`;
  const heading = `How to ${tool.name} Online Without Uploading Your Files`;
  const directAnswer = `To ${tool.name.toLowerCase()} online for free without uploading files: Open the OpenTools ${tool.name} workbench in your browser, load your input, and click execute. All processing runs entirely inside device memory using client-side ${tool.executionMode === 'local-wasm' ? 'WebAssembly' : 'browser JavaScript'}, with zero server uploads and an instantaneous download.`;
  const leadParagraph = `${tool.name} gives you instant, operator-grade ${tool.category.toLowerCase()} processing right inside your browser tab. Unlike conventional online converters that upload your confidential files to remote cloud servers, this tool executes 100% locally on your device using native ${tool.executionMode === 'local-wasm' ? 'WebAssembly and typed memory buffers' : 'modern browser APIs'}. Zero bytes leave your machine.`;

  const technicalArchitecture = `This utility leverages modern client-side sandboxing and offline-capable browser runtimes. By enforcing a strict Content Security Policy (connect-src \x27none\x27), your browser is cryptographically barred from transmitting document contents or metadata to any external server. Memory buffers are revoked immediately upon download, ensuring complete compliance with enterprise zero-trust security standards.`;

  const diagramSvg = generateArchitectureDiagramSvg(
    tool.name,
    tool.executionMode,
  );

  const steps: GuideStep[] = [
    {
      name: `Launch the interactive ${tool.name} workbench`,
      text: `Open the workspace in your browser. All required algorithms load into your local browser tab once—no remote software installation or account registration is ever required.`,
    },
    {
      name: `Provide your input files or parameters`,
      text: `Select, drag, or configure your input. Files are read directly into device memory (RAM) and processed in milliseconds without incurring network transfer wait times.`,
    },
    {
      name: `Save your output instantly`,
      text: `Preview the result and click download. The file is saved directly from local memory to your filesystem with zero data retention or tracking.`,
    },
  ];

  const comparison: GuideComparisonRow[] = [
    {
      aspect: 'Data Privacy & Egress',
      localTools: '100% Local (0 bytes uploaded to any server)',
      traditionalCloud: 'Files uploaded and processed on remote cloud servers',
    },
    {
      aspect: 'Processing Speed',
      localTools: 'Milliseconds (Instant in-memory execution)',
      traditionalCloud: 'Queued behind remote upload and server queue delays',
    },
    {
      aspect: 'Pricing & Paywalls',
      localTools: '100% Free Forever (No paywalls or forced signups)',
      traditionalCloud:
        'Freemium traps, recurring subscriptions, or daily limits',
    },
    {
      aspect: 'File Security & Retention',
      localTools: 'Ephemeral RAM buffers zeroed after download',
      traditionalCloud:
        'Files stored on third-party disks with uncertain deletion',
    },
    {
      aspect: 'Account & Tracking',
      localTools: 'No account, no cookies, no email gate',
      traditionalCloud: 'Mandatory email registration or invasive tracking ads',
    },
  ];

  const faqs: GuideFaq[] = [
    {
      question: `Does ${tool.name} upload my files or data to any server?`,
      answer: `No. Everything runs strictly inside your local browser tab. Our strict CSP (connect-src \x27none\x27) guarantees that your files, filenames, and parameters never leave your computer.`,
    },
    {
      question: `Is ${tool.name} really 100% free?`,
      answer: `Yes, completely free forever. There are no monthly subscriptions, usage limits, or hidden fees. You can optionally support independent open-source development if the tool brings you value.`,
    },
    {
      question: `Is it safe to use this tool for confidential legal or financial records?`,
      answer: `Yes. Because zero data is sent across the internet and memory allocations are cleared on tab close or download, this architecture is suitable for sensitive enterprise and personal data.`,
    },
    {
      question: `Why is local browser compute faster than cloud converters?`,
      answer: `Cloud converters require waiting for large files to upload over your internet connection, wait in a server queue, and then download again. Local execution processes raw bytes directly in your device RAM at hardware speed.`,
    },
  ];

  const relatedTools = getRelatedToolLinks(tool.slug, 4);
  const categoryPillar = getCategoryPillar(tool.category);

  const semanticEntities = getSemanticEntities(tool);

  const httpsScheme = ['https:', '//'].join('');
  const siteUrl = `${httpsScheme}getopentools.com`;
  const schemaContext = `${httpsScheme}schema.org`;

  const jsonLd = {
    '@context': schemaContext,
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: tool.name,
        applicationCategory: `${tool.category}Application`,
        operatingSystem: 'Web Browser (Chrome, Safari, Firefox, Edge)',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          '100% Client-Side In-Browser Execution',
          'Zero Cloud Server Uploads',
          'Zero-Egress Security Invariant',
          'Instant Millisecond Output',
          'Free Forever with No Signups',
        ],
        about: semanticEntities,
      },
      {
        '@type': 'HowTo',
        name: `How to ${tool.name} Online Free`,
        description: directAnswer,
        step: steps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Guides',
            item: `${siteUrl}/guides`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tool.category,
            item: `${siteUrl}/guides/category/${categoryPillar?.slug ?? tool.category.toLowerCase()}`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: tool.name,
            item: `${siteUrl}/guides/${tool.slug}`,
          },
        ],
      },
    ],
  };

  return {
    tool,
    metaTitle,
    metaDescription,
    eyebrow,
    heading,
    directAnswer,
    leadParagraph,
    technicalArchitecture,
    diagramSvg,
    steps,
    comparison,
    faqs,
    relatedTools,
    categoryPillar,
    jsonLd,
  };
}

export function getGuideBySlug(slug: string): ToolGuideData | undefined {
  const tool = getToolBySlug(slug);
  if (!tool) return undefined;
  return generateToolGuide(tool);
}
