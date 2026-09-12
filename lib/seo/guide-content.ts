import { type ToolCatalogEntry, getToolBySlug } from './tool-catalog-data';

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
  leadParagraph: string;
  technicalArchitecture: string;
  steps: readonly GuideStep[];
  comparison: readonly GuideComparisonRow[];
  faqs: readonly GuideFaq[];
  jsonLd: Record<string, unknown>;
}

export function generateToolGuide(tool: ToolCatalogEntry): ToolGuideData {
  const metaTitle = `How to ${tool.name} Online Free — 100% Private Browser Tool`;
  const metaDescription = `${tool.name} directly in your browser. 100% client-side execution with zero server uploads, complete privacy, no file size limits to server, and completely free forever.`;
  const eyebrow = `${tool.category} / Free Browser Utility`;
  const heading = `How to ${tool.name} Online Without Uploading Your Files`;
  const leadParagraph = `${tool.name} gives you instant, operator-grade ${tool.category.toLowerCase()} processing right inside your browser tab. Unlike conventional online converters that upload your confidential files to remote cloud servers, this tool executes 100% locally on your device using native ${tool.executionMode === 'local-wasm' ? 'WebAssembly and typed memory buffers' : 'modern browser APIs'}. Zero bytes leave your machine.`;

  const technicalArchitecture = `This utility leverages modern client-side sandboxing and offline-capable browser runtimes. By enforcing a strict Content Security Policy (connect-src \x27none\x27), your browser is cryptographically barred from transmitting document contents or metadata to any external server. Memory buffers are revoked immediately upon download, ensuring complete compliance with enterprise zero-trust security standards.`;

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

  const jsonLd = {
    '@context': 'https://schema.org',
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
      },
      {
        '@type': 'HowTo',
        name: `How to ${tool.name} Online Free`,
        description: leadParagraph,
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
            item: 'https://opentools.org',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Guides',
            item: 'https://opentools.org/guides',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: tool.category,
            item: `https://opentools.org/?category=${tool.category.toLowerCase()}`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: tool.name,
            item: `https://opentools.org/guides/${tool.slug}`,
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
    leadParagraph,
    technicalArchitecture,
    steps,
    comparison,
    faqs,
    jsonLd,
  };
}

export function getGuideBySlug(slug: string): ToolGuideData | undefined {
  const tool = getToolBySlug(slug);
  if (!tool) return undefined;
  return generateToolGuide(tool);
}
