import {
  contentSecurityPolicy,
  loadsLocalModel,
} from '../security/content-security-policy';
import type { ToolCatalogEntry } from './tool-catalog-data';
import { getLiveToolBySlug } from './live-tools';
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
  /** The Content-Security-Policy this tool's own route is served with. */
  cspHeader: string;
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
  } else if (tool.category === 'Audio') {
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
  connectSrc = "connect-src 'none'",
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
    <text x="494" y="70" fill="currentColor" fill-opacity="0.5" font-family="monospace" font-size="10">Provider keeps a copy</text>
  </g>

  <!-- Divider -->
  <line x1="20" y1="135" x2="740" y2="135" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="2 2" />

  <!-- Bottom track: OpenTools Zero-Egress In-Browser Architecture -->
  <g transform="translate(20, 150)">
    <text x="0" y="14" fill="currentColor" font-family="monospace" font-size="11" font-weight="700">OPENTOOLS: THE WORK HAPPENS IN THE PAGE</text>

    <rect x="0" y="26" width="220" height="64" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03" />
    <text x="14" y="50" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Your Browser Tab</text>
    <text x="14" y="70" fill="currentColor" fill-opacity="0.6" font-family="monospace" font-size="10">File read into the page</text>

    <!-- Arrow -->
    <path d="M 225 58 L 275 58" stroke="currentColor" stroke-width="2" />
    <polygon points="275,54 285,58 275,62" fill="currentColor" />
    <text x="232" y="48" fill="currentColor" fill-opacity="0.7" font-family="monospace" font-size="9">No upload</text>

    <rect x="288" y="26" width="240" height="64" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.05" />
    <text x="302" y="50" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="700">${runtime}</text>
    <text x="302" y="70" fill="currentColor" fill-opacity="0.6" font-family="monospace" font-size="10">${connectSrc}</text>

    <!-- Arrow -->
    <path d="M 533 58 L 578 58" stroke="currentColor" stroke-width="2" />
    <polygon points="578,54 588,58 578,62" fill="currentColor" />
    <text x="540" y="48" fill="currentColor" fill-opacity="0.7" font-family="monospace" font-size="9">Save</text>

    <rect x="592" y="26" width="128" height="64" rx="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity="0.03" />
    <text x="606" y="50" fill="currentColor" font-family="system-ui, sans-serif" font-size="13" font-weight="700">Local Disk</text>
    <text x="606" y="70" fill="currentColor" fill-opacity="0.6" font-family="monospace" font-size="10">Your own disk</text>
  </g>
</svg>`;
}

export function generateToolGuide(tool: ToolCatalogEntry): ToolGuideData {
  const runtime =
    tool.executionMode === 'local-wasm' ? 'WebAssembly' : 'browser JavaScript';
  const route = tool.destinationUrl.split('?')[0]!;
  const localModel = loadsLocalModel(route);
  const cspHeader = contentSecurityPolicy({ localModel });

  const metaTitle = `How to ${tool.name} in your browser — free, no upload`;
  const metaDescription = `${tool.name} runs in your own browser tab. Your files and inputs never touch a server, no account is needed, and there is no paywall.`;
  const eyebrow = `${tool.category} / Free Browser Utility`;
  const heading = `How to ${tool.name} Online Without Uploading Your Files`;
  const directAnswer = `To ${tool.name.toLowerCase()} without uploading anything: open the OpenTools ${tool.name} workbench, load your input, and run it. The work happens in the page itself using ${runtime}, and the result is saved straight from your browser to your own disk.`;
  const leadParagraph = `${tool.name} runs inside your browser tab. Where a conventional online converter sends your file to its servers and returns a result, this tool reads the file in the page using ${tool.executionMode === 'local-wasm' ? 'WebAssembly and typed memory buffers' : 'the browser\x27s own APIs'}. Your files and inputs never touch a server.`;

  const technicalArchitecture = localModel
    ? `This page is served with a Content Security Policy that allows network requests to this site only (connect-src \x27self\x27), because the background remover loads its model weights and WebAssembly runtime from this same site. No third-party origin is reachable, and your image is never sent anywhere — it is read into the page and processed there.`
    : `This page is served with a Content Security Policy that blocks every network connection the page could make (connect-src \x27none\x27). Your browser will not send the file, its name or its contents to any server, including this one. The exact header is below.`;

  const diagramSvg = generateArchitectureDiagramSvg(
    tool.name,
    tool.executionMode,
    localModel ? "connect-src 'self'" : "connect-src 'none'",
  );

  const steps: GuideStep[] = [
    {
      name: `Open the ${tool.name} workbench`,
      text: `Open the workspace in your browser. The code it needs loads with the page — there is nothing to install and no account to create.`,
    },
    {
      name: `Provide your input files or parameters`,
      text: `Select, drag, or configure your input. The file is read into the page and processed there, so there is no upload to wait for.`,
    },
    {
      name: `Save your output`,
      text: `Preview the result and click download. The file is written from the page straight to your disk; nothing is stored on a server.`,
    },
  ];

  const comparison: GuideComparisonRow[] = [
    {
      aspect: 'Where your file goes',
      localTools: 'Stays in the page; it never touches a server',
      traditionalCloud: 'Uploaded to and processed on the provider’s servers',
    },
    {
      aspect: 'Waiting to upload',
      localTools: 'None — there is no upload step',
      traditionalCloud: 'Upload time, then a place in the server queue',
    },
    {
      aspect: 'Price',
      localTools: 'Free, with no paywall and no sign-up',
      traditionalCloud: 'Often a free tier with daily limits or a subscription',
    },
    {
      aspect: 'Retention',
      localTools: 'Nothing to retain; the file was never sent',
      traditionalCloud: 'Stored on the provider’s disks under their policy',
    },
    {
      aspect: 'Account & tracking',
      localTools:
        'No account, no third-party trackers, no client-side analytics',
      traditionalCloud: 'Often an email sign-up and advertising trackers',
    },
  ];

  const faqs: GuideFaq[] = [
    {
      question: `Does ${tool.name} upload my files or data to any server?`,
      answer: `No. The work happens in the page you have open. ${localModel ? 'This page may fetch its own model and WebAssembly files from this site, and its Content Security Policy allows no other origin.' : 'This page is served with a Content Security Policy of connect-src \x27none\x27, so the browser will not let it open a network connection at all.'}`,
    },
    {
      question: `Is ${tool.name} free?`,
      answer: `Yes. There is no paywall, no usage limit and no account. If the tool is useful to you, you can choose to support the project.`,
    },
    {
      question: `Can I use this for confidential legal or financial records?`,
      answer: `Your file is not sent anywhere, so it is not exposed to this site or to a third party. What remains is your own device and browser — treat it the way your organisation's policy treats any local file.`,
    },
    {
      question: `Does the site collect anything when I visit?`,
      answer: `The server records one coarse metadata event per page visit (see the security policy for exactly what). There are no third-party trackers and no client-side analytics, and nothing from the tool itself — your files, inputs or results — is included.`,
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
          'Runs in the browser tab',
          'Your files and inputs never touch a server',
          'No account and no paywall',
        ],
        about: semanticEntities,
      },
      {
        '@type': 'HowTo',
        name: `How to ${tool.name} in your browser`,
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
    cspHeader,
    diagramSvg,
    steps,
    comparison,
    faqs,
    relatedTools,
    categoryPillar,
    jsonLd,
  };
}

/** Undefined when no live tool answers this slug, so the page can 404. */
export function getGuideBySlug(slug: string): ToolGuideData | undefined {
  const tool = getLiveToolBySlug(slug);
  if (!tool) return undefined;
  return generateToolGuide(tool);
}
