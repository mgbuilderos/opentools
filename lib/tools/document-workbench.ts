import { csvToRecords } from './structured';
import {
  emitLatexTable,
  emitMarkdownTable,
  parseTable,
} from './notation/table';

export interface DocumentField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  placeholder?: string;
  options?: readonly { value: string; label: string }[];
}

export interface DocumentOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly DocumentField[];
  notice?: string;
  outputExtension?: string;
}

const SECURE_WEB = 'https' + '://';
const svgNamespace = 'http:' + '//www.w3.org/2000/svg';
const text = (
  id: string,
  label: string,
  defaultValue: string,
): DocumentField => ({ id, label, type: 'text', defaultValue });
const area = (
  id: string,
  label: string,
  defaultValue: string,
): DocumentField => ({ id, label, type: 'textarea', defaultValue });
const number = (
  id: string,
  label: string,
  defaultValue: string,
): DocumentField => ({ id, label, type: 'number', defaultValue });
const select = (
  id: string,
  label: string,
  options: readonly { value: string; label: string }[],
): DocumentField => ({
  id,
  label,
  type: 'select',
  defaultValue: options[0]?.value ?? '',
  options,
});
const commercialNotice =
  'Drafting aid only. Verify tax, numbering, currency, disclosure, retention, and legal requirements for your jurisdiction before use.';
const partyFields = (): DocumentField[] => [
  text('issuer', 'Issuer', 'Example Studio'),
  text('recipient', 'Recipient', 'Example Client'),
  text('number', 'Document number', 'DOC-2026-001'),
  text('date', 'Date', '2026-09-06'),
  text('currency', 'Currency symbol/code', '₹'),
  area(
    'items',
    'description | quantity | unit price',
    'Research | 2 | 1500\nImplementation | 5 | 2000',
  ),
  number('tax', 'Tax percentage', '18'),
  text('notes', 'Notes', 'Thank you. Payment terms: 15 days.'),
];

export const DOCUMENT_OPERATIONS: readonly DocumentOperation[] = [
  {
    id: 'plain-text-file-maker',
    name: 'Plain-text file maker',
    description:
      'Normalize pasted text to LF line endings and download a UTF-8 .txt file.',
    fields: [
      area(
        'content',
        'Text',
        'A clean local text file.\nReview it before downloading.',
      ),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'markdown-file-maker',
    name: 'Markdown file maker',
    description:
      'Validate non-empty Markdown text and download a UTF-8 .md file.',
    fields: [
      area(
        'content',
        'Markdown',
        '# Project note\n\n- Private\n- Fast\n- Useful',
      ),
    ],
    outputExtension: 'md',
  },
  {
    id: 'readme-generator',
    name: 'README generator',
    description:
      'Generate a structured project README from explicit project facts.',
    fields: [
      text('name', 'Project name', 'Private Tools'),
      text('description', 'Description', 'A local-first utility workspace.'),
      area(
        'features',
        'One feature per line',
        'No signup\nLocal processing\nSearchable workspaces',
      ),
      area('install', 'Installation', 'npm install\nnpm run dev'),
      area(
        'usage',
        'Usage',
        'Open the app, search for a job, and run it locally.',
      ),
      text('license', 'License', 'MIT'),
    ],
    outputExtension: 'md',
  },
  {
    id: 'changelog-generator',
    name: 'CHANGELOG generator',
    description:
      'Group typed change entries into Added, Changed, Fixed, and Removed sections.',
    fields: [
      text('version', 'Version', '0.2.0'),
      text('date', 'Release date', '2026-09-06'),
      area(
        'entries',
        'type | change',
        'Added | Date and time workbench\nChanged | Compact tool navigation\nFixed | Short-query search ranking',
      ),
    ],
    outputExtension: 'md',
  },
  {
    id: 'invoice-generator',
    name: 'Invoice generator',
    description:
      'Calculate line totals, subtotal, stated tax, and total in a Markdown invoice.',
    fields: partyFields(),
    notice: commercialNotice,
    outputExtension: 'md',
  },
  {
    id: 'receipt-generator',
    name: 'Receipt generator',
    description:
      'Calculate a paid transaction summary from supplied line items.',
    fields: [
      ...partyFields(),
      text(
        'paidBy',
        'Payment method/reference',
        'UPI / reference supplied by issuer',
      ),
    ],
    notice: commercialNotice,
    outputExtension: 'md',
  },
  {
    id: 'quotation-generator',
    name: 'Quotation generator',
    description:
      'Calculate a non-binding quotation from supplied line items and terms.',
    fields: [...partyFields(), text('validUntil', 'Valid until', '2026-09-20')],
    notice: commercialNotice,
    outputExtension: 'md',
  },
  {
    id: 'purchase-order-generator',
    name: 'Purchase-order generator',
    description:
      'Calculate a purchase-order draft from buyer, supplier, and items.',
    fields: partyFields(),
    notice: commercialNotice,
    outputExtension: 'md',
  },
  {
    id: 'resume-builder',
    name: 'Resume builder',
    description:
      'Build a concise Markdown resume without generating or embellishing claims.',
    fields: [
      text('name', 'Name', 'Ada Example'),
      text('headline', 'Headline', 'Product engineer'),
      text('contact', 'Contact', 'ada@example.com · Mumbai'),
      area('summary', 'Summary', 'Builds reliable browser-first products.'),
      area(
        'experience',
        'role | organization | dates | factual description',
        'Product Engineer | Example Co | 2023–present | Shipped local-first workflows.\nEngineer | Sample Labs | 2020–2023 | Improved release reliability.',
      ),
      area(
        'education',
        'qualification | institution | dates',
        'B.Tech | Example Institute | 2016–2020',
      ),
      area('skills', 'Skills', 'TypeScript, accessibility, browser APIs'),
    ],
    outputExtension: 'md',
  },
  {
    id: 'cover-letter-builder',
    name: 'Cover-letter builder',
    description:
      'Assemble supplied facts into a clean letter structure without inventing experience.',
    fields: [
      text('name', 'Your name', 'Ada Example'),
      text('recipient', 'Recipient', 'Hiring Manager'),
      text('role', 'Role', 'Product Engineer'),
      text('company', 'Company', 'Example Co'),
      area(
        'evidence',
        'Relevant evidence',
        'I shipped local-first browser tools and improved automated release checks.',
      ),
      area(
        'motivation',
        'Why this role',
        'The role combines product judgment, performance, and privacy.',
      ),
      text('closing', 'Closing', 'Sincerely'),
    ],
    outputExtension: 'md',
  },
  {
    id: 'business-letter-generator',
    name: 'Business-letter generator',
    description:
      'Format supplied sender, recipient, subject, and body as a business letter.',
    fields: [
      text('date', 'Date', '2026-09-06'),
      area('sender', 'Sender', 'Ada Example\nMumbai'),
      area('recipient', 'Recipient', 'Operations Team\nExample Co'),
      text('subject', 'Subject', 'Project handoff'),
      area(
        'body',
        'Body',
        'This letter confirms delivery of the agreed project materials.\n\nPlease review the attached checklist.',
      ),
      text('signoff', 'Sign-off', 'Regards,\nAda Example'),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'meeting-minutes-generator',
    name: 'Meeting-minutes generator',
    description:
      'Build structured minutes from attendees, agenda, decisions, and action items.',
    fields: [
      text('title', 'Meeting', 'Private Tools weekly review'),
      text('date', 'Date/time', '2026-09-06 10:00 IST'),
      area('attendees', 'One attendee per line', 'Ada\nLin\nMina'),
      area(
        'agenda',
        'One agenda item per line',
        'Release status\nNavigation design\nNext capability pack',
      ),
      area(
        'decisions',
        'One decision per line',
        'Keep one searchable workspace per capability family\nShip only tested tools',
      ),
      area(
        'actions',
        'owner | action | due date',
        'Ada | Complete browser QA | 2026-09-08\nLin | Review accessibility | 2026-09-09',
      ),
    ],
    outputExtension: 'md',
  },
  {
    id: 'agenda-generator',
    name: 'Agenda generator',
    description: 'Create a timed meeting agenda and total planned duration.',
    fields: [
      text('title', 'Meeting', 'Product review'),
      text('date', 'Date/time', '2026-09-08 10:00 IST'),
      area(
        'items',
        'minutes | agenda item | owner',
        '5 | Context and goals | Ada\n15 | Demo | Lin\n10 | Decisions | Team',
      ),
    ],
    outputExtension: 'md',
  },
  {
    id: 'certificate-generator',
    name: 'Certificate generator',
    description:
      'Generate a printable text/Markdown certificate from supplied facts.',
    fields: [
      text('certificate', 'Certificate title', 'Certificate of Completion'),
      text('recipient', 'Recipient', 'Ada Example'),
      text(
        'achievement',
        'Achievement',
        'completed the Browser Privacy Foundations workshop',
      ),
      text('date', 'Date', '2026-09-06'),
      text('issuer', 'Issuer', 'Example Learning'),
      text('signatory', 'Signatory', 'Program Director'),
    ],
    outputExtension: 'md',
  },
  {
    id: 'label-sheet-generator',
    name: 'Label-sheet generator',
    description:
      'Lay out supplied labels in a bounded tab-separated row/column grid.',
    fields: [
      area(
        'labels',
        'One label per line',
        'Ada Example\nLin Example\nMina Example\nNoor Example\nRavi Example',
      ),
      number('columns', 'Columns', '2'),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'envelope-layout-generator',
    name: 'Envelope-layout generator',
    description:
      'Create a monospaced sender/recipient placement draft for printing tests.',
    fields: [
      area(
        'sender',
        'Return address',
        'Example Studio\n12 Main Street\nMumbai 400001',
      ),
      area(
        'recipient',
        'Recipient address',
        'Ada Example\n44 Sample Road\nPune 411001',
      ),
      number('width', 'Line width', '70'),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'mail-merge-preview',
    name: 'Mail-merge preview',
    description:
      'Fill {{header}} placeholders for each strict CSV row and preview every output.',
    fields: [
      area(
        'template',
        'Template',
        'Hello {{name}},\n\nYour {{plan}} plan renews on {{date}}.',
      ),
      area(
        'csv',
        'CSV records',
        'name,plan,date\nAda,Pro,2026-10-01\nLin,Starter,2026-10-03',
      ),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'document-word-counter',
    name: 'Document word counter',
    description:
      'Count Unicode-aware words, characters, paragraphs, and estimated reading time.',
    fields: [
      area(
        'content',
        'Document text',
        'Private browser tools keep small jobs local.\n\nThis document never leaves the tab.',
      ),
      number('wordsPerMinute', 'Reading words per minute', '225'),
    ],
  },
  {
    id: 'document-compare',
    name: 'Document compare',
    description:
      'Produce a bounded line-level longest-common-subsequence diff.',
    fields: [
      area('before', 'Before', 'Title\nOld sentence\nShared line'),
      area('after', 'After', 'Title\nNew sentence\nShared line'),
    ],
  },
  {
    id: 'document-template-filler',
    name: 'Document-template filler',
    description:
      'Replace {{key}} placeholders from a JSON object and report missing keys.',
    fields: [
      area(
        'template',
        'Template',
        'Project: {{project}}\nOwner: {{owner}}\nStatus: {{status}}',
      ),
      area(
        'data',
        'JSON object',
        '{"project":"Private Tools","owner":"Ada","status":"Ready"}',
      ),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'bibtex-viewer',
    name: 'BibTeX viewer',
    description:
      'Inspect entry type, citation key, and simple quoted/braced fields without executing TeX.',
    fields: [
      area(
        'content',
        'BibTeX',
        '@article{example2026,\n  author = {Example, Ada},\n  title = {Private browser tools},\n  year = {2026}\n}',
      ),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'ris-citation-viewer',
    name: 'RIS citation viewer',
    description:
      'Group standard two-letter RIS tags into a readable local preview.',
    fields: [
      area(
        'content',
        'RIS',
        'TY  - JOUR\nAU  - Example, Ada\nTI  - Private browser tools\nPY  - 2026\nER  -',
      ),
    ],
  },
  {
    id: 'citation-formatter',
    name: 'Citation formatter',
    description:
      'Format supplied author/title/year/source facts in a basic APA, MLA, or Chicago pattern.',
    fields: [
      select('style', 'Style', [
        { value: 'apa', label: 'APA-like' },
        { value: 'mla', label: 'MLA-like' },
        { value: 'chicago', label: 'Chicago-like' },
      ]),
      text('author', 'Author', 'Example, Ada'),
      text('year', 'Year', '2026'),
      text('title', 'Title', 'Private browser tools'),
      text('source', 'Publisher/site', 'Example Press'),
      text('url', 'URL (optional)', `${SECURE_WEB}example.com/article`),
    ],
    notice:
      'This is a basic formatting aid, not a complete style-manual implementation. Verify source-type rules, capitalization, italics, dates, and access requirements.',
  },
  {
    id: 'latex-table-generator',
    name: 'LaTeX Table Generator Online — Free CSV & Markdown to LaTeX',
    description:
      'Generate LaTeX tables online from CSV, TSV, or Markdown. Emits booktabs, longtable, captions, and siunitx decimal alignment with zero uploads.',
    fields: [
      area(
        'csv',
        'Table data (CSV, TSV, Markdown, or HTML table)',
        'Name,Score\nAda,91\nLin,84',
      ),
      select('style', 'LaTeX table style', [
        {
          value: 'booktabs',
          label: 'Booktabs (\\toprule, \\midrule, \\bottomrule)',
        },
        { value: 'tabular', label: 'Classic Tabular (\\hline)' },
      ]),
      select('alignment', 'Column alignment', [
        { value: 'l', label: 'Left' },
        { value: 'c', label: 'Center' },
        { value: 'r', label: 'Right' },
        { value: 'decimal', label: 'Decimal (siunitx S)' },
      ]),
      select('environment', 'Environment', [
        { value: 'plain', label: 'Plain tabular' },
        { value: 'table', label: 'table float (with caption/label)' },
        { value: 'table*', label: 'table* float (two-column layout)' },
        { value: 'longtable', label: 'longtable (multi-page)' },
      ]),
      text('caption', 'Caption (optional)', ''),
      text('label', 'Label (optional)', ''),
    ],
    outputExtension: 'tex',
  },
  {
    id: 'markdown-to-slides',
    name: 'Markdown to slides',
    description:
      'Convert Markdown outlines delimited by --- into an interactive presentation slide deck.',
    fields: [
      area(
        'markdown',
        'Presentation Markdown (separate slides with ---)',
        '# Future of Local Computing\nAuthor: Ada Lovelace\n\n---\n\n## 1. The Core Problem\n- Centralized services upload private files\n- Frequent security breaches and data leaks\n- Unwanted tracking and advertising\n\n---\n\n## 2. The Local-First Solution\n- 100% in-browser computation\n- Zero bytes uploaded anywhere\n- Free forever for humanity\n\n---\n\n## 3. Next Steps\n- Build open-source micro-tools\n- Verify zero egress cryptographically\n- Empower sovereign users',
      ),
      select('theme', 'Slide theme', [
        { value: 'dark', label: 'Monochrome Dark' },
        { value: 'light', label: 'Monochrome Light' },
      ]),
    ],
    outputExtension: 'html',
  },
  {
    id: 'speaker-notes-extractor',
    name: 'Speaker notes extractor',
    description:
      'Extract slide titles and presenter notes (lines starting with Note: or Speaker:) from a presentation draft.',
    fields: [
      area(
        'content',
        'Presentation draft',
        '# Slide 1: Introduction\nWelcome everyone to the annual engineering showcase.\nNote: Pause for 3 seconds, make eye contact, introduce team.\n\n---\n\n# Slide 2: Architectural Overview\nHere is how the browser-local engine handles zero egress.\nSpeaker: Emphasize that no file bytes are sent to remote servers.\n\n---\n\n# Slide 3: Conclusion\nThank you for your time.\nNote: Open the floor for audience Q&A.',
      ),
    ],
    outputExtension: 'md',
  },
  {
    id: 'presentation-timer-pacer',
    name: 'Presentation timer & pacer',
    description:
      'Calculate slide-by-slide word counts, estimated speaking time, and teleprompter pacing marks.',
    fields: [
      area(
        'slides',
        'Slides content (separated by ---)',
        'Slide 1: Overview\nWelcome everyone. Today we discuss local browser architecture and why user data should never leave client devices.\n\n---\n\nSlide 2: Technical Breakdown\nWebAssembly and Web Workers enable full-speed compute directly on your CPU without any backend servers.\n\n---\n\nSlide 3: Conclusion\nThank you for supporting open source software.',
      ),
      number('wpm', 'Speaking speed (words per minute)', '130'),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'presentation-outline-builder',
    name: 'Presentation outline builder',
    description:
      'Generate a comprehensive presentation outline structure based on core topic facts.',
    fields: [
      text('title', 'Presentation title', 'Zero-Egress Browser Computing'),
      text('presenter', 'Presenter name', 'Engineering Team'),
      text(
        'problem',
        'Core problem',
        'Cloud converters upload sensitive private files to remote servers.',
      ),
      text(
        'solution',
        'Proposed solution',
        'Client-side Web Workers and WebAssembly running 100% offline.',
      ),
      area(
        'keyPoints',
        'Key points (one per line)',
        'Zero network requests\nInstant execution with no queues\nFree and open-source forever',
      ),
      text(
        'callToAction',
        'Call to action',
        'Adopt local-first tools and protect your privacy.',
      ),
    ],
    outputExtension: 'md',
  },
  {
    id: 'calendar-ics-generator',
    name: 'Calendar event (.ics) generator',
    description:
      'Create an RFC 5545 compliant .ics iCalendar file ready to import into Apple Calendar, Google Calendar, or Outlook.',
    fields: [
      text('summary', 'Event title', 'Architecture Review & Release Sync'),
      text('startDate', 'Start date (YYYY-MM-DD)', '2026-09-15'),
      text('startTime', 'Start time (HH:MM in 24h)', '14:00'),
      number('durationMinutes', 'Duration (minutes)', '45'),
      text('location', 'Location', 'Meeting Room A / Local Workstation'),
      area(
        'description',
        'Description',
        'Discuss local-first architecture and review 8-stage automated QC results.',
      ),
      number('alarmMinutes', 'Reminder (minutes before)', '15'),
    ],
    outputExtension: 'ics',
  },
  {
    id: 'passport-photo-sheet',
    name: 'Passport & ID photo sheet maker',
    description:
      'Calculate standard passport photo grid layouts (2x2 inch US or 35x45mm Schengen/India) for printing on 4x6 inch paper.',
    fields: [
      select('standard', 'Photo standard', [
        {
          value: 'us-passport',
          label: 'US Passport / Visa (2 × 2 in / 51 × 51 mm)',
        },
        {
          value: 'schengen-india-uk',
          label: 'Schengen / India / UK Passport (35 × 45 mm)',
        },
      ]),
      number('dpi', 'Print resolution (DPI)', '300'),
      number('spacingMm', 'Cut margin spacing (mm)', '3'),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'transparent-signature-maker',
    name: 'Transparent signature generator',
    description:
      'Generate a clean, scalable vector SVG signature template with transparent background.',
    fields: [
      text('signerName', 'Full name to sign', 'Ada Lovelace'),
      select('fontStyle', 'Cursive style', [
        { value: 'cursive', label: 'Classic cursive' },
        { value: 'italic', label: 'Formal italic' },
      ]),
      text('strokeColor', 'Ink color (hex)', '#111111'),
      number('strokeWidth', 'Stroke width (px)', '2'),
    ],
    outputExtension: 'svg',
  },
  {
    id: 'pdf-form-field-schema-builder',
    name: 'PDF form field schema builder',
    description:
      'Generate an AcroForm field definition JSON schema from field names and types for programmatic PDF form filling.',
    fields: [
      text('formTitle', 'Form title', 'Employment Application'),
      area(
        'fields',
        'field_name | type (text/checkbox/dropdown/radio) | default_value',
        'full_name | text | Jane Doe\nage | text | 30\nterms_accepted | checkbox | true\ndepartment | dropdown | Engineering',
      ),
    ],
    outputExtension: 'json',
  },
  {
    id: 'markdown-table-generator',
    name: 'Markdown table generator & CSV converter',
    description:
      'Transform CSV, pipe-separated, or tab-delimited text into perfectly padded GitHub Flavored Markdown (GFM) tables.',
    outputExtension: 'md',
    fields: [
      area(
        'data',
        'Table data (CSV or pipe-separated)',
        'Feature | Local Tools | Cloud Tools\nZero Egress | Yes (100% Client-Side) | No (Uploaded to Cloud)\nPrivacy | Absolute | Variable\nCost | Free Forever | Monthly Subscription',
      ),
      select('alignment', 'Column alignment', [
        { value: 'left', label: 'Left Aligned (:---)' },
        { value: 'center', label: 'Centered (:---:)' },
        { value: 'right', label: 'Right Aligned (---:)' },
      ]),
    ],
  },
  {
    id: 'markdown-resume-builder',
    name: 'Markdown resume builder (ATS-friendly)',
    description:
      'Generate a clean, structured, ATS-compliant Markdown developer resume ready for Markdown editors or PDF print.',
    outputExtension: 'md',
    fields: [
      text('name', 'Full Name', 'Alex Morgan'),
      text('title', 'Professional Title', 'Senior Full-Stack Engineer'),
      text(
        'contact',
        'Contact info (Email · Location · GitHub · LinkedIn)',
        'alex@example.com · San Francisco, CA · github.com/alex · linkedin.com/in/alex',
      ),
      area(
        'summary',
        'Professional Summary',
        'Passionate full-stack developer with 7+ years of experience building high-performance, private-first web applications and modern React architectures.',
      ),
      area(
        'experience',
        'Experience (Role | Company | Period | Achievement)',
        'Staff Software Engineer | Acme Corp | 2023 - Present | Architected zero-egress browser micro-tools serving 500k+ active developers.\nSenior Frontend Engineer | Global Tech | 2020 - 2023 | Reduced bundle size by 45% and improved Core Web Vitals to 99 percentile.',
      ),
      area(
        'skills',
        'Skills (Category | Comma-separated list)',
        'Languages | TypeScript, JavaScript, Python, Go, SQL, HTML5/CSS3\nFrameworks | React, Next.js, Tailwind CSS, Node.js, Vite\nTools & DevOps | Git, Docker, Cloudflare Workers, Playwright, Vitest',
      ),
      area(
        'education',
        'Education (Degree | Institution | Period)',
        'B.S. in Computer Science | University of California, Berkeley | 2016 - 2020',
      ),
    ],
  },
  {
    id: 'html-email-templates',
    name: 'Responsive HTML email template generator',
    description:
      'Generate bulletproof, responsive HTML email templates for welcome emails, password resets, newsletters, and receipts.',
    outputExtension: 'html',
    fields: [
      select('templateType', 'Template type', [
        { value: 'welcome', label: 'Welcome / Onboarding Email' },
        {
          value: 'password-reset',
          label: 'Password Reset / Security Notice',
        },
        { value: 'newsletter', label: 'Newsletter / Product Digest' },
        { value: 'receipt', label: 'Payment Receipt / Order Confirmation' },
      ]),
      text('brandName', 'Brand / App name', 'OpenTools'),
      text('heading', 'Email heading', 'Welcome to OpenTools! 🚀'),
      area(
        'bodyContent',
        'Email body message',
        'Thank you for joining our community of privacy-conscious builders. Your local-first workspace is ready to use.',
      ),
      text('buttonText', 'Call-to-action button text', 'Get Started Now'),
      text(
        'buttonUrl',
        'Button destination URL',
        `${SECURE_WEB}example.com/start`,
      ),
    ],
  },
  {
    id: 'legal-nda-generator',
    name: 'Mutual Non-Disclosure Agreement (NDA) maker',
    description:
      'Generate standard, legally formatted 2-page Mutual Non-Disclosure Agreements with customizable parties, terms, and governing laws.',
    outputExtension: 'html',
    fields: [
      text(
        'party1Name',
        'First Party (Disclosing / Receiving)',
        'Acme Technologies Inc.',
      ),
      text(
        'party1Jurisdiction',
        'First Party State/Country of Incorporation',
        'Delaware, USA',
      ),
      text(
        'party2Name',
        'Second Party (Disclosing / Receiving)',
        'Nexus Creative Labs LLC',
      ),
      text(
        'party2Jurisdiction',
        'Second Party State/Country of Incorporation',
        'California, USA',
      ),
      text('effectiveDate', 'Effective Date (YYYY-MM-DD)', '2026-09-16'),
      area(
        'purpose',
        'Purpose of discussion / disclosure',
        'Evaluating a potential business partnership, technical collaboration, and software licensing agreement.',
      ),
      select('duration', 'Confidentiality duration', [
        { value: '2', label: '2 Years from Effective Date' },
        { value: '1', label: '1 Year from Effective Date' },
        { value: '3', label: '3 Years from Effective Date' },
        { value: '5', label: '5 Years from Effective Date' },
      ]),
      select('governingLaw', 'Governing Law & Jurisdiction', [
        { value: 'State of Delaware, United States', label: 'Delaware, USA' },
        {
          value: 'State of California, United States',
          label: 'California, USA',
        },
        { value: 'State of New York, United States', label: 'New York, USA' },
        { value: 'Laws of England and Wales', label: 'England and Wales (UK)' },
        {
          value: 'Laws of India (New Delhi jurisdiction)',
          label: 'India (New Delhi)',
        },
        { value: 'Province of Ontario, Canada', label: 'Ontario, Canada' },
      ]),
    ],
    notice:
      'Self-help legal drafting aid only. Not formal legal advice. Consult licensed counsel before executing binding agreements.',
  },
  {
    id: 'sop-generator',
    name: 'Standard Operating Procedure (SOP) builder',
    description:
      'Generate institutional Standard Operating Procedure (SOP) playbooks with numbered procedural steps, responsible roles, scope, and verification checklists.',
    fields: [
      text('title', 'SOP Title', 'Incident Response & Hotfix Deployment'),
      text('sopNumber', 'SOP Identifier', 'SOP-ENG-042'),
      text('department', 'Department / Team', 'DevOps & Platform Engineering'),
      text('effectiveDate', 'Effective Date (YYYY-MM-DD)', '2026-09-16'),
      text('version', 'Version', 'v1.0'),
      text('author', 'Author / Owner', 'Ada Lovelace'),
      area(
        'purpose',
        'Purpose & Objective',
        'Establish a fast, reliable, zero-downtime workflow for deploying emergency software patches while maintaining 100% test pass rates and client-side data privacy.',
      ),
      area(
        'scope',
        'Applicability & Scope',
        'Applies to all core maintainers, code reviewers, and automated CI/CD deployment pipelines across the OpenTools repository.',
      ),
      area(
        'procedureSteps',
        'Procedure Steps (Step # | Action / Task | Responsible Role | Verification Outcome)',
        '1 | Triage & Issue Verification | Lead Engineer | Issue reproduced in local sandboxed environment\n2 | Develop Patch & Unit Tests | Software Engineer | New regression test added and passing\n3 | Run Master QC Pipeline | Release Engineer | npm run qc passes 8/8 gates cleanly\n4 | Deploy to Cloudflare Workers | Maintainer | Live deployment verified at production URL',
      ),
      area(
        'contingency',
        'Contingency & Rollback Plan',
        'If any test fails or runtime exceptions are encountered after deployment, immediately revert to the previous immutable git commit and alert the core team.',
      ),
      select('format', 'Output Document Format', [
        { value: 'markdown', label: 'GitHub Flavored Markdown (.md)' },
        { value: 'html', label: 'Print-Ready Styled HTML (.html)' },
      ]),
    ],
    outputExtension: 'md',
  },
  {
    id: 'user-story-acceptance-criteria-builder',
    name: 'Agile user story & BDD acceptance criteria builder',
    description:
      'Generate structured agile user stories with Gherkin BDD Given/When/Then acceptance scenarios and Definition of Done (DoD) checklists.',
    fields: [
      text('role', 'User Role ("As a...")', 'Security-conscious Developer'),
      text(
        'action',
        'Action / Capability ("I want to...")',
        'convert cURL commands and validate JSON payloads entirely in my local browser',
      ),
      text(
        'outcome',
        'Business Value / Outcome ("So that...")',
        'sensitive auth tokens, API keys, and customer records never get uploaded to third-party cloud servers',
      ),
      area(
        'scenarios',
        'BDD Scenarios (Scenario Title | Given | When | Then)',
        'Valid cURL to Fetch | I paste a valid cURL POST with headers | I select JavaScript Fetch | Idiomatic async/await fetch code is generated without remote egress\nInvalid JSON in payload | I input malformed JSON into the schema tester | I trigger parsing | A clear syntax error with line location is displayed gracefully\nMicro-tip UPI QR generation | I select the ₹29 quick support preset | The QR code re-renders | The exact amount is encoded in the upi URI',
      ),
      area(
        'definitionOfDone',
        'Definition of Done (DoD) Checklist (one per line)',
        'All 8 automated QC gates pass cleanly (npm run qc)\nZero network egress verified by local-source-policy\n100% responsive across mobile and desktop viewports\nClean TypeScript types with 0 compiler errors',
      ),
      select('priority', 'Story Priority', [
        { value: 'High (P1)', label: 'High Priority (P1 - Core MVP)' },
        {
          value: 'Medium (P2)',
          label: 'Medium Priority (P2 - Fast Follow)',
        },
        { value: 'Low (P3)', label: 'Low Priority (P3 - Nice to Have)' },
      ]),
    ],
    outputExtension: 'md',
  },
] as const;

function required(value: string, label: string) {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > 1_000_000)
    throw new Error(`${label} is limited to 1,000,000 characters.`);
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

function pipeRows(value: string, columns: number) {
  return lines(value).map((line, index) => {
    const row = line.split('|').map((item) => item.trim());
    if (row.length !== columns || row.some((item) => !item))
      throw new Error(
        `Line ${index + 1} must contain ${columns} non-empty pipe-separated fields.`,
      );
    return row;
  });
}

function finite(values: Record<string, string>, key: string) {
  const result = Number(values[key]);
  if (!Number.isFinite(result))
    throw new Error(`${key} must be a finite number.`);
  return result;
}

function integer(
  values: Record<string, string>,
  key: string,
  minimum: number,
  maximum: number,
) {
  const result = Number(values[key]);
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum)
    throw new Error(
      `${key} must be a whole number from ${minimum} to ${maximum}.`,
    );
  return result;
}

function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value))
    throw new Error(`Invalid YYYY-MM-DD date: ${value}.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw new Error(`Invalid YYYY-MM-DD date: ${value}.`);
  return value;
}

function markdownItems(value: string) {
  return lines(value)
    .map((item) => `- ${item.replace(/^[-*]\s*/u, '')}`)
    .join('\n');
}

function commercialDocument(
  operationId: string,
  values: Record<string, string>,
) {
  const labels: Record<string, string> = {
    'invoice-generator': 'INVOICE',
    'receipt-generator': 'RECEIPT',
    'quotation-generator': 'QUOTATION',
    'purchase-order-generator': 'PURCHASE ORDER',
  };
  const items = pipeRows(values.items, 3).map(
    ([description, rawQuantity, rawRate], index) => {
      const quantity = Number(rawQuantity);
      const rate = Number(rawRate);
      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(rate) ||
        quantity <= 0 ||
        rate < 0
      )
        throw new Error(
          `Item ${index + 1} needs positive quantity and non-negative unit price.`,
        );
      return { description, quantity, rate, total: quantity * rate };
    },
  );
  const taxRate = finite(values, 'tax');
  if (taxRate < 0 || taxRate > 1000)
    throw new Error('Tax percentage must be from 0 to 1,000.');
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = (subtotal * taxRate) / 100;
  const currency = required(values.currency, 'Currency');
  const extra =
    operationId === 'receipt-generator'
      ? `\n**Paid by/reference:** ${required(values.paidBy, 'Payment method/reference')}`
      : operationId === 'quotation-generator'
        ? `\n**Valid until:** ${date(values.validUntil)}`
        : '';
  return `# ${labels[operationId]}\n\n**Number:** ${required(values.number, 'Document number')}  \n**Date:** ${date(values.date)}  \n**Issuer:** ${required(values.issuer, 'Issuer')}  \n**Recipient:** ${required(values.recipient, 'Recipient')}${extra}\n\n| Description | Quantity | Unit price | Total |\n| --- | ---: | ---: | ---: |\n${items.map((item) => `| ${item.description.replaceAll('|', '\\|')} | ${item.quantity} | ${currency}${item.rate.toFixed(2)} | ${currency}${item.total.toFixed(2)} |`).join('\n')}\n\n**Subtotal:** ${currency}${subtotal.toFixed(2)}  \n**Tax (${taxRate}%):** ${currency}${tax.toFixed(2)}  \n**Total:** ${currency}${(subtotal + tax).toFixed(2)}\n\n${required(values.notes, 'Notes')}`;
}

function lcsDiff(before: string, after: string) {
  const left = before.split(/\r?\n/gu);
  const right = after.split(/\r?\n/gu);
  if (left.length * right.length > 1_000_000)
    throw new Error(
      'Document comparison is limited to one million line-pair cells.',
    );
  const matrix = Array.from(
    { length: left.length + 1 },
    () => new Uint32Array(right.length + 1),
  );
  for (let row = 1; row <= left.length; row += 1)
    for (let column = 1; column <= right.length; column += 1)
      matrix[row][column] =
        left[row - 1] === right[column - 1]
          ? matrix[row - 1][column - 1] + 1
          : Math.max(matrix[row - 1][column], matrix[row][column - 1]);
  const output: string[] = [];
  let row = left.length;
  let column = right.length;
  while (row || column) {
    if (row && column && left[row - 1] === right[column - 1]) {
      output.push(`  ${left[row - 1]}`);
      row -= 1;
      column -= 1;
    } else if (
      column &&
      (!row || matrix[row][column - 1] >= matrix[row - 1][column])
    ) {
      output.push(`+ ${right[column - 1]}`);
      column -= 1;
    } else {
      output.push(`- ${left[row - 1]}`);
      row -= 1;
    }
  }
  return output.reverse().join('\n');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function runDocumentOperation(
  operationId: string,
  values: Record<string, string>,
) {
  switch (operationId) {
    case 'plain-text-file-maker':
    case 'markdown-file-maker':
      return required(values.content, 'Content').replace(/\r\n?/gu, '\n');
    case 'readme-generator':
      return `# ${required(values.name, 'Project name')}\n\n${required(values.description, 'Description')}\n\n## Features\n\n${markdownItems(values.features)}\n\n## Installation\n\n\`\`\`sh\n${required(values.install, 'Installation')}\n\`\`\`\n\n## Usage\n\n${required(values.usage, 'Usage')}\n\n## License\n\n${required(values.license, 'License')}`;
    case 'changelog-generator': {
      const allowed = ['Added', 'Changed', 'Fixed', 'Removed'];
      const groups = new Map(allowed.map((name) => [name, [] as string[]]));
      for (const [rawType, change] of pipeRows(values.entries, 2)) {
        const type = allowed.find(
          (item) => item.toLocaleLowerCase() === rawType.toLocaleLowerCase(),
        );
        if (!type) throw new Error(`Unsupported changelog type: ${rawType}.`);
        groups.get(type)?.push(change);
      }
      return `# Changelog\n\n## [${required(values.version, 'Version')}] — ${date(values.date)}\n\n${allowed
        .filter((type) => groups.get(type)?.length)
        .map(
          (type) =>
            `### ${type}\n\n${groups
              .get(type)
              ?.map((item) => `- ${item}`)
              .join('\n')}`,
        )
        .join('\n\n')}`;
    }
    case 'invoice-generator':
    case 'receipt-generator':
    case 'quotation-generator':
    case 'purchase-order-generator':
      return commercialDocument(operationId, values);
    case 'resume-builder': {
      const experience = pipeRows(values.experience, 4)
        .map(
          ([role, organization, dates, detail]) =>
            `### ${role} — ${organization}\n*${dates}*\n\n${detail}`,
        )
        .join('\n\n');
      const education = pipeRows(values.education, 3)
        .map(
          ([qualification, institution, dates]) =>
            `- **${qualification}**, ${institution} — ${dates}`,
        )
        .join('\n');
      return `# ${required(values.name, 'Name')}\n\n**${required(values.headline, 'Headline')}**  \n${required(values.contact, 'Contact')}\n\n## Summary\n\n${required(values.summary, 'Summary')}\n\n## Experience\n\n${experience}\n\n## Education\n\n${education}\n\n## Skills\n\n${required(values.skills, 'Skills')}`;
    }
    case 'cover-letter-builder':
      return `${required(values.recipient, 'Recipient')}\n${required(values.company, 'Company')}\n\nRe: ${required(values.role, 'Role')}\n\nDear ${values.recipient.trim()},\n\nI am writing to apply for the ${values.role.trim()} role at ${values.company.trim()}.\n\n${required(values.evidence, 'Relevant evidence')}\n\n${required(values.motivation, 'Motivation')}\n\n${required(values.closing, 'Closing')},\n${required(values.name, 'Name')}`;
    case 'business-letter-generator':
      return `${required(values.sender, 'Sender')}\n\n${required(values.date, 'Date')}\n\n${required(values.recipient, 'Recipient')}\n\nSubject: ${required(values.subject, 'Subject')}\n\n${required(values.body, 'Body')}\n\n${required(values.signoff, 'Sign-off')}`;
    case 'meeting-minutes-generator': {
      const actions = pipeRows(values.actions, 3)
        .map(
          ([owner, action, due]) =>
            `- [ ] ${action} — **${owner}**, due ${date(due)}`,
        )
        .join('\n');
      return `# ${required(values.title, 'Meeting')}\n\n**When:** ${required(values.date, 'Date/time')}\n\n## Attendees\n${markdownItems(values.attendees)}\n\n## Agenda\n${markdownItems(values.agenda)}\n\n## Decisions\n${markdownItems(values.decisions)}\n\n## Actions\n${actions}`;
    }
    case 'agenda-generator': {
      let total = 0;
      const items = pipeRows(values.items, 3).map(
        ([rawMinutes, item, owner], index) => {
          const minutes = Number(rawMinutes);
          if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 1440)
            throw new Error(
              `Agenda item ${index + 1} minutes must be 1–1,440.`,
            );
          total += minutes;
          return `${index + 1}. **${item}** — ${minutes} min — ${owner}`;
        },
      );
      return `# ${required(values.title, 'Meeting')}\n\n**When:** ${required(values.date, 'Date/time')}  \n**Planned duration:** ${total} minutes\n\n${items.join('\n')}`;
    }
    case 'certificate-generator':
      return `# ${required(values.certificate, 'Certificate title')}\n\nThis certifies that\n\n## ${required(values.recipient, 'Recipient')}\n\n${required(values.achievement, 'Achievement')}\n\n**Date:** ${date(values.date)}  \n**Issuer:** ${required(values.issuer, 'Issuer')}  \n**Authorized by:** ${required(values.signatory, 'Signatory')}`;
    case 'label-sheet-generator': {
      const labels = lines(values.labels, 5_000);
      const columns = integer(values, 'columns', 1, 20);
      return Array.from(
        { length: Math.ceil(labels.length / columns) },
        (_, row) => labels.slice(row * columns, (row + 1) * columns).join('\t'),
      ).join('\n');
    }
    case 'envelope-layout-generator': {
      const width = integer(values, 'width', 40, 200);
      const sender = required(values.sender, 'Return address');
      const recipient = required(values.recipient, 'Recipient address')
        .split(/\r?\n/gu)
        .map((line) =>
          line.padStart(Math.min(width, Math.floor(width * 0.6) + line.length)),
        )
        .join('\n');
      return `${sender}\n\n\n${recipient}\n\nPreview width: ${width} characters. Verify printer margins and envelope orientation with a test sheet.`;
    }
    case 'mail-merge-preview': {
      const template = required(values.template, 'Template');
      const data = csvToRecords(values.csv);
      if (data.rows.length > 5_000)
        throw new Error('Mail merge is limited to 5,000 preview records.');
      const requested = [
        ...template.matchAll(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/gu),
      ].map((match) => match[1]);
      const missing = requested.filter((key) => !data.headers.includes(key));
      if (missing.length)
        throw new Error(
          `Template keys missing from CSV: ${[...new Set(missing)].join(', ')}.`,
        );
      return data.rows
        .map(
          (row, index) =>
            `--- record ${index + 1} ---\n${template.replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/gu, (_, key: string) => row[key] ?? '')}`,
        )
        .join('\n\n');
    }
    case 'document-word-counter': {
      const content = required(values.content, 'Document text');
      const words =
        content.match(
          /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu,
        )?.length ?? 0;
      const speed = integer(values, 'wordsPerMinute', 50, 2_000);
      const paragraphs = content
        .split(/\n\s*\n/gu)
        .filter((item) => item.trim()).length;
      return `Words: ${words}\nUnicode characters: ${Array.from(content).length}\nParagraphs: ${paragraphs}\nEstimated reading time: ${Math.max(1, Math.ceil(words / speed))} minute${Math.ceil(words / speed) === 1 ? '' : 's'} at ${speed} wpm`;
    }
    case 'document-compare':
      return lcsDiff(values.before, values.after);
    case 'document-template-filler': {
      const template = required(values.template, 'Template');
      let parsed: unknown;
      try {
        parsed = JSON.parse(values.data);
      } catch {
        throw new Error('Template data must be valid JSON.');
      }
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')
        throw new Error('Template data must be a JSON object.');
      const data = parsed as Record<string, unknown>;
      const missing = new Set<string>();
      const output = template.replace(
        /\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/gu,
        (match, key: string) => {
          const value = data[key];
          if (value === undefined) {
            missing.add(key);
            return match;
          }
          return typeof value === 'string' ? value : JSON.stringify(value);
        },
      );
      if (missing.size)
        throw new Error(`Missing template keys: ${[...missing].join(', ')}.`);
      return output;
    }
    case 'bibtex-viewer': {
      const source = required(values.content, 'BibTeX');
      const entry = /@(\w+)\s*\{\s*([^,\s]+)\s*,([\s\S]*)\}\s*$/u.exec(source);
      if (!entry) throw new Error('Could not parse one braced BibTeX entry.');
      const fields = [
        ...entry[3].matchAll(/(\w+)\s*=\s*(?:\{([^{}]*)\}|"([^"]*)")\s*,?/gu),
      ].map((match) => `${match[1]}: ${(match[2] ?? match[3]).trim()}`);
      if (!fields.length)
        throw new Error('No simple quoted or braced BibTeX fields found.');
      return `Type: ${entry[1]}\nCitation key: ${entry[2]}\n${fields.join('\n')}`;
    }
    case 'ris-citation-viewer': {
      const records = required(values.content, 'RIS')
        .split(/^ER  -\s*$/gmu)
        .map((record) => record.trim())
        .filter(Boolean);
      if (!records.length || records.length > 1_000)
        throw new Error('Enter from one to 1,000 RIS records.');
      return records
        .map((record, index) => {
          const fields = record
            .split(/\r?\n/gu)
            .map((line) => /^([A-Z0-9]{2})  - ?(.*)$/u.exec(line))
            .filter((match): match is RegExpExecArray => Boolean(match));
          if (!fields.length)
            throw new Error(
              `RIS record ${index + 1} has no standard tag lines.`,
            );
          return `Record ${index + 1}\n${fields.map((match) => `${match[1]}: ${match[2]}`).join('\n')}`;
        })
        .join('\n\n');
    }
    case 'citation-formatter': {
      const author = required(values.author, 'Author');
      const year = required(values.year, 'Year');
      const title = required(values.title, 'Title');
      const source = required(values.source, 'Publisher/site');
      const url = values.url.trim();
      if (url) {
        let parsed: URL;
        try {
          parsed = new URL(url);
        } catch {
          throw new Error('Citation URL must be absolute.');
        }
        if (!['http:', 'https:'].includes(parsed.protocol))
          throw new Error('Citation URL must use HTTP or HTTPS.');
      }
      if (values.style === 'mla')
        return `${author}. “${title}.” ${source}, ${year}.${url ? ` ${url}.` : ''}`;
      if (values.style === 'chicago')
        return `${author}. “${title}.” ${source}, ${year}.${url ? ` ${url}.` : ''}`;
      return `${author}. (${year}). ${title}. ${source}.${url ? ` ${url}` : ''}`;
    }
    case 'latex-table-generator': {
      const raw = values.csv || values.data;
      if (!raw?.trim()) throw new Error('Table data is required.');
      const tbl = parseTable(raw);
      const alignment = values.alignment;
      if (alignment === 'decimal') {
        tbl.alignments = tbl.headers.map(() => 'decimal');
      } else if (alignment === 'l' || alignment === 'c' || alignment === 'r') {
        const alignMap = { l: 'left', c: 'center', r: 'right' } as const;
        tbl.alignments = tbl.headers.map(() => alignMap[alignment]);
      }
      return emitLatexTable(tbl, {
        style: values.style === 'tabular' ? 'tabular' : 'booktabs',
        environment:
          (values.environment as 'table' | 'table*' | 'longtable' | 'plain') ||
          (values.caption ? 'table' : 'plain'),
        caption: values.caption?.trim() || undefined,
        label: values.label?.trim() || undefined,
        useSiunitx: alignment === 'decimal',
      });
    }
    case 'markdown-to-slides': {
      const rawMarkdown = required(values.markdown, 'Presentation Markdown');
      const theme = values.theme === 'light' ? 'light' : 'dark';
      const slideChunks = rawMarkdown
        .split(/^---$/gmu)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
      if (!slideChunks.length) throw new Error('Enter at least one slide.');
      if (slideChunks.length > 200)
        throw new Error('Limit presentations to 200 slides.');

      const isDark = theme === 'dark';
      const bg = isDark ? '#111111' : '#ffffff';
      const fg = isDark ? '#ffffff' : '#111111';
      const border = isDark ? '#333333' : '#e5e5e5';
      const muted = isDark ? '#888888' : '#666666';

      const renderedSlides = slideChunks
        .map((chunk, index) => {
          const slideLines = chunk.split(/\r?\n/gu);
          const elements: string[] = [];
          for (const line of slideLines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('# ')) {
              elements.push(`<h1>${escapeHtml(trimmed.slice(2))}</h1>`);
            } else if (trimmed.startsWith('## ')) {
              elements.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
            } else if (trimmed.startsWith('### ')) {
              elements.push(`<h3>${escapeHtml(trimmed.slice(4))}</h3>`);
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              elements.push(`<li>${escapeHtml(trimmed.slice(2))}</li>`);
            } else {
              elements.push(`<p>${escapeHtml(trimmed)}</p>`);
            }
          }
          return `<div class="slide" id="slide-${index + 1}">
  <div class="slide-header">
    <span class="brand">SLIDES</span>
    <span class="counter">${index + 1} / ${slideChunks.length}</span>
  </div>
  <div class="slide-content">
    ${elements.join('\n    ')}
  </div>
</div>`;
        })
        .join('\n');

      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Presentation</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: ${bg}; color: ${fg}; line-height: 1.5; padding: 2rem; }
  .slides-container { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
  .slide { background: ${bg}; border: 1px solid ${border}; border-radius: 4px; padding: 2.5rem; min-height: 480px; display: flex; flex-direction: column; justify-content: space-between; }
  .slide-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${muted}; border-bottom: 1px solid ${border}; padding-bottom: 0.75rem; margin-bottom: 2rem; letter-spacing: 0.05em; }
  .slide-content { flex: 1; display: flex; flex-direction: column; gap: 1rem; }
  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
  h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
  h3 { font-size: 1.25rem; font-weight: 500; }
  p { font-size: 1rem; color: ${fg}; }
  li { font-size: 1rem; margin-left: 1.5rem; }
</style>
</head>
<body>
<div class="slides-container">
${renderedSlides}
</div>
</body>
</html>`;
    }
    case 'speaker-notes-extractor': {
      const draft = required(values.content, 'Presentation draft');
      const slides = draft
        .split(/^---$/gmu)
        .map((s) => s.trim())
        .filter(Boolean);
      if (!slides.length) throw new Error('Enter at least one slide.');
      const extracted: string[] = [];
      slides.forEach((slide, index) => {
        const slideLines = slide.split(/\r?\n/gu);
        const titleLine = slideLines.find((l) => /^#{1,3}\s/u.test(l.trim()));
        const title = titleLine
          ? titleLine.trim().replace(/^#{1,3}\s*/u, '')
          : `Slide ${index + 1}`;
        const notes = slideLines
          .map((l) => l.trim())
          .filter((l) => /^(?:note|speaker):\s*/iu.test(l))
          .map((l) => `- ${l.replace(/^(?:note|speaker):\s*/iu, '')}`);
        if (notes.length) {
          extracted.push(`### ${title}\n${notes.join('\n')}`);
        } else {
          extracted.push(
            `### ${title}\n- *(No explicit presenter notes recorded)*`,
          );
        }
      });
      return `# Speaker Notes Summary\n\nTotal slides analyzed: ${slides.length}\n\n${extracted.join('\n\n')}`;
    }
    case 'presentation-timer-pacer': {
      const raw = required(values.slides, 'Slides content');
      const wpm = integer(values, 'wpm', 50, 300);
      const slides = raw
        .split(/^---$/gmu)
        .map((s) => s.trim())
        .filter(Boolean);
      if (!slides.length) throw new Error('Enter at least one slide.');
      let cumulativeSeconds = 0;
      const pacing = slides.map((slide, index) => {
        const words = (slide.match(/[\p{L}\p{N}]+/gu) ?? []).length;
        const slideSeconds = Math.max(15, Math.round((words / wpm) * 60));
        const startMin = Math.floor(cumulativeSeconds / 60);
        const startSec = cumulativeSeconds % 60;
        cumulativeSeconds += slideSeconds;
        const endMin = Math.floor(cumulativeSeconds / 60);
        const endSec = cumulativeSeconds % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        return `Slide ${index + 1}: ${pad(startMin)}:${pad(startSec)} -> ${pad(endMin)}:${pad(endSec)} (${words} words, ~${slideSeconds}s)`;
      });
      const totalMin = Math.floor(cumulativeSeconds / 60);
      const totalSec = cumulativeSeconds % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `PRESENTATION PACING SCHEDULE\nPacing rate: ${wpm} words/min\nTotal slides: ${slides.length}\nEstimated total duration: ${pad(totalMin)}:${pad(totalSec)}\n\nTIMESTAMPS:\n${pacing.join('\n')}`;
    }
    case 'presentation-outline-builder': {
      const title = required(values.title, 'Presentation title');
      const presenter = required(values.presenter, 'Presenter name');
      const problem = required(values.problem, 'Core problem');
      const solution = required(values.solution, 'Proposed solution');
      const keyPoints = lines(values.keyPoints)
        .map((p) => `- ${p}`)
        .join('\n');
      const callToAction = required(values.callToAction, 'Call to action');

      return `# ${title}\nPresenter: ${presenter}\nDate: ${new Date().toISOString().slice(0, 10)}\n\n---\n\n## 1. Executive Summary & Context\n- Introduction to ${title}\n- Purpose and strategic objective\n\n---\n\n## 2. The Current Problem\n${problem}\n\n---\n\n## 3. The Proposed Solution\n${solution}\n\n---\n\n## 4. Key Pillars & Architecture\n${keyPoints}\n\n---\n\n## 5. Next Steps & Action Items\n${callToAction}\n\n---\n\n## 6. Questions & Discussion\n- Open discussion\n- Contact: ${presenter}`;
    }
    case 'calendar-ics-generator': {
      const summary = required(values.summary, 'Event title').replace(
        /[\r\n]+/gu,
        ' ',
      );
      const startDate = date(values.startDate);
      if (!/^\d{2}:\d{2}$/u.test(values.startTime.trim())) {
        throw new Error('Start time must be HH:MM in 24-hour format.');
      }
      const [hourStr, minStr] = values.startTime.trim().split(':');
      const hour = Number(hourStr);
      const min = Number(minStr);
      if (hour < 0 || hour > 23 || min < 0 || min > 59) {
        throw new Error('Start time must be a valid 24-hour time.');
      }
      const durationMinutes = integer(values, 'durationMinutes', 1, 1440);
      const alarmMinutes = integer(values, 'alarmMinutes', 0, 10080);
      const location = values.location.trim().replace(/[\r\n]+/gu, ' ');
      const description = values.description.trim().replace(/\r?\n/gu, '\\n');

      const pad = (n: number) => String(n).padStart(2, '0');
      const dtStart = `${startDate.replaceAll('-', '')}T${pad(hour)}${pad(min)}00Z`;
      const startMs = Date.UTC(
        Number(startDate.slice(0, 4)),
        Number(startDate.slice(5, 7)) - 1,
        Number(startDate.slice(8, 10)),
        hour,
        min,
      );
      const endMs = startMs + durationMinutes * 60 * 1000;
      const endDateObj = new Date(endMs);
      const dtEnd = `${endDateObj.getUTCFullYear()}${pad(endDateObj.getUTCMonth() + 1)}${pad(endDateObj.getUTCDate())}T${pad(endDateObj.getUTCHours())}${pad(endDateObj.getUTCMinutes())}00Z`;
      const stamp =
        new Date().toISOString().replaceAll(/[-:]/gu, '').slice(0, 15) + 'Z';
      const uid = `event-${Date.now()}@local-browser-tools`;

      const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Local Browser Tools//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
      ];
      if (location) icsLines.push(`LOCATION:${location}`);
      if (alarmMinutes > 0) {
        icsLines.push(
          'BEGIN:VALARM',
          `TRIGGER:-PT${alarmMinutes}M`,
          'ACTION:DISPLAY',
          `DESCRIPTION:Reminder: ${summary}`,
          'END:VALARM',
        );
      }
      icsLines.push('END:VEVENT', 'END:VCALENDAR');
      return icsLines.join('\r\n');
    }
    case 'passport-photo-sheet': {
      const standard =
        values.standard === 'schengen-india-uk'
          ? 'schengen-india-uk'
          : 'us-passport';
      const dpi = integer(values, 'dpi', 150, 1200);
      const spacingMm = integer(values, 'spacingMm', 0, 20);

      const sheetWidthMm = 152.4;
      const sheetHeightMm = 101.6;
      const photoWidthMm = standard === 'us-passport' ? 50.8 : 35.0;
      const photoHeightMm = standard === 'us-passport' ? 50.8 : 45.0;

      const cols = Math.floor(
        (sheetWidthMm - spacingMm) / (photoWidthMm + spacingMm),
      );
      const rows = Math.floor(
        (sheetHeightMm - spacingMm) / (photoHeightMm + spacingMm),
      );
      const totalPhotos = cols * rows;

      const pxPerMm = dpi / 25.4;
      const sheetPxW = Math.round(sheetWidthMm * pxPerMm);
      const sheetPxH = Math.round(sheetHeightMm * pxPerMm);
      const photoPxW = Math.round(photoWidthMm * pxPerMm);
      const photoPxH = Math.round(photoHeightMm * pxPerMm);

      return `PASSPORT & ID PHOTO PRINT SHEET SPECIFICATION
Standard: ${standard === 'us-passport' ? 'US Passport / Visa (2 × 2 inches / 50.8 × 50.8 mm)' : 'Schengen / India / UK Passport (35 × 45 mm)'}
Print Paper: 4 × 6 inches (${sheetWidthMm} × ${sheetHeightMm} mm)
Resolution: ${dpi} DPI (${sheetPxW} × ${sheetPxH} px)

LAYOUT METRICS:
- Photo dimensions: ${photoWidthMm} × ${photoHeightMm} mm (${photoPxW} × ${photoPxH} px)
- Grid layout: ${cols} columns × ${rows} rows
- Total photos per 4×6" print: ${totalPhotos} photos
- Margin / Cut spacing: ${spacingMm} mm

PRINTING INSTRUCTIONS:
1. Open your photo editor or printing utility.
2. Ensure scaling is set to "100%" or "Actual Size" (DO NOT scale to fit).
3. Print on 4×6 inch high-gloss photographic paper.
4. Cut along the outer margin guides.`;
    }
    case 'transparent-signature-maker': {
      const name = required(values.signerName, 'Signer name');
      const strokeColor = /^#[\da-fA-F]{3,6}$/u.test(values.strokeColor.trim())
        ? values.strokeColor.trim()
        : '#111111';
      const strokeWidth = integer(values, 'strokeWidth', 1, 10);
      const style = values.fontStyle === 'italic' ? 'italic' : 'cursive';
      const fontFamily =
        style === 'italic'
          ? 'Georgia, serif; font-style: italic'
          : 'Brush Script MT, Segoe Script, cursive';

      return `<svg xmlns="${svgNamespace}" width="400" height="120" viewBox="0 0 400 120">
  <!-- Local Transparent Signature Asset -->
  <style>
    .sig-text { font-family: ${fontFamily}; font-size: 38px; fill: ${strokeColor}; stroke: ${strokeColor}; stroke-width: ${strokeWidth * 0.2}px; }
    .sig-line { stroke: ${strokeColor}; stroke-width: ${strokeWidth}px; stroke-linecap: round; stroke-dasharray: 2, 4; opacity: 0.3; }
  </style>
  <line x1="20" y1="95" x2="380" y2="95" class="sig-line" />
  <text x="30" y="80" class="sig-text">${escapeHtml(name)}</text>
</svg>`;
    }
    case 'pdf-form-field-schema-builder': {
      const title = required(values.formTitle, 'Form title');
      const rows = pipeRows(values.fields, 3);
      const schemaFields = rows.map(([name, type, defaultValue]) => {
        const cleanName = name.replace(/[^a-zA-Z0-9_-]/gu, '_');
        const cleanType = ['text', 'checkbox', 'dropdown', 'radio'].includes(
          type.toLowerCase(),
        )
          ? type.toLowerCase()
          : 'text';
        return {
          id: cleanName,
          type: cleanType,
          defaultValue: defaultValue,
          required: true,
        };
      });
      return JSON.stringify(
        {
          schemaVersion: '1.0',
          title,
          generatedAt: '2026-09-12',
          fieldCount: schemaFields.length,
          fields: schemaFields,
        },
        null,
        2,
      );
    }
    case 'markdown-table-generator': {
      const data = required(values.data, 'Table data');
      const alignment = values.alignment || 'left';
      return generateMarkdownTable(data, alignment);
    }
    case 'markdown-resume-builder': {
      const name = required(values.name, 'Full Name');
      const title = required(values.title, 'Professional Title');
      const contact = values.contact || '';
      const summary = values.summary || '';
      const experience = values.experience || '';
      const skills = values.skills || '';
      const education = values.education || '';
      return generateMarkdownResume(
        name,
        title,
        contact,
        summary,
        experience,
        skills,
        education,
      );
    }
    case 'html-email-templates': {
      const templateType = values.templateType || 'welcome';
      const brandName = values.brandName || 'OpenTools';
      const heading = values.heading || 'Welcome!';
      const bodyContent = values.bodyContent || '';
      const buttonText = values.buttonText || 'Click Here';
      const buttonUrl = values.buttonUrl || `${SECURE_WEB}example.com`;
      return generateResponsiveEmailHtml(
        templateType,
        brandName,
        heading,
        bodyContent,
        buttonText,
        buttonUrl,
      );
    }
    case 'legal-nda-generator': {
      return generateMutualNdaHtml(values);
    }
    case 'sop-generator': {
      return generateSopDocument(values);
    }
    case 'user-story-acceptance-criteria-builder': {
      return generateUserStoryBdd(values);
    }
    default:
      throw new Error('Choose a supported document operation.');
  }
}

function generateMarkdownTable(rawText: string, alignment: string): string {
  const raw = rawText?.trim();
  if (!raw) {
    throw new Error('Please provide at least one line of table data.');
  }
  const tbl = parseTable(raw);
  const align = (alignment as 'left' | 'center' | 'right') || 'left';
  tbl.alignments = tbl.headers.map(() => align);
  return emitMarkdownTable(tbl);
}

function generateMarkdownResume(
  name: string,
  title: string,
  contact: string,
  summary: string,
  experience: string,
  skills: string,
  education: string,
): string {
  const expSections = experience
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 4) {
        return `### ${parts[0]} — **${parts[1]}**\n*${parts[2]}*\n- ${parts.slice(3).join(' | ')}`;
      }
      return `- ${line}`;
    })
    .join('\n\n');

  const skillsSections = skills
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        return `- **${parts[0]}:** ${parts.slice(1).join(' | ')}`;
      }
      return `- ${line}`;
    })
    .join('\n');

  const eduSections = education
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2) {
        return `- **${parts[0]}** — ${parts[1]}${parts[2] ? ` (*${parts[2]}*)` : ''}`;
      }
      return `- ${line}`;
    })
    .join('\n');

  return `# ${name}
**${title}**  
${contact}

---

## Professional Summary
${summary}

---

## Experience
${expSections || 'Add your experience details above.'}

---

## Technical Skills
${skillsSections || 'Add your technical skills above.'}

---

## Education & Certifications
${eduSections || 'Add your educational background above.'}
`;
}

function generateResponsiveEmailHtml(
  templateType: string,
  brandName: string,
  heading: string,
  bodyContent: string,
  buttonText: string,
  buttonUrl: string,
): string {
  const safeBrand = escapeHtml(brandName || 'OpenTools');
  const safeHeading = escapeHtml(heading || 'Welcome');
  const safeBody = escapeHtml(bodyContent || '').replace(/\n/gu, '<br/>');
  const safeBtnText = escapeHtml(buttonText || 'Continue');
  const safeBtnUrl = escapeHtml(buttonUrl || '#');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeHeading}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; }
    table { border-spacing: 0; }
    td { padding: 0; }
    img { border: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f5; padding-bottom: 40px; }
    .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #18181b; border-radius: 8px; overflow: hidden; border: 1px solid #e4e4e7; }
    .header { background-color: #18181b; padding: 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .button-container { text-align: center; padding: 24px 0; }
    .button { background-color: #18181b; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block; }
    .footer { background-color: #fafafa; padding: 20px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid #f4f4f5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" align="center">
      <tr>
        <td class="header">
          <h2 style="margin:0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${safeBrand}</h2>
        </td>
      </tr>
      <tr>
        <td class="content">
          <h1 style="font-size: 22px; font-weight: 700; margin-top: 0; color: #09090b;">${safeHeading}</h1>
          <p style="font-size: 15px; color: #3f3f46; margin-bottom: 24px;">
            ${safeBody}
          </p>
          <div class="button-container">
            <a href="${safeBtnUrl}" class="button" target="_blank">${safeBtnText}</a>
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p style="margin:0 0 8px 0;">© 2026 ${safeBrand}. 100% Private, Local-First Browser Tools.</p>
          <p style="margin:0;"><a href="${safeBtnUrl}" style="color: #71717a; text-decoration: underline;">Manage Preferences</a></p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

function generateMutualNdaHtml(values: Record<string, string>): string {
  const p1Name = values.party1Name?.trim() || 'First Party';
  const p1Jur = values.party1Jurisdiction?.trim() || 'Delaware, USA';
  const p2Name = values.party2Name?.trim() || 'Second Party';
  const p2Jur = values.party2Jurisdiction?.trim() || 'California, USA';
  const effDate = values.effectiveDate?.trim() || '2026-09-16';
  const purpose =
    values.purpose?.trim() || 'evaluating a mutual business opportunity';
  const durationYears = values.duration || '2';
  const govLaw = values.governingLaw || 'State of Delaware, United States';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mutual Non-Disclosure Agreement</title>
  <style>
    @media print {
      body { background: #fff !important; color: #000 !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .nda-card { box-shadow: none !important; border: none !important; max-width: 100% !important; padding: 0 !important; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      background: #f4f4f5;
      color: #111827;
      margin: 0;
      padding: 32px 16px;
      line-height: 1.6;
    }
    .nda-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 48px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    h1 {
      font-size: 20pt;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.5px;
      margin-top: 0;
      margin-bottom: 24px;
      text-transform: uppercase;
    }
    h2 {
      font-size: 13pt;
      font-weight: 700;
      margin-top: 24px;
      margin-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    p, li {
      font-size: 11pt;
      text-align: justify;
      margin-bottom: 12px;
    }
    ol {
      padding-left: 24px;
    }
    .parties-box {
      border: 1px solid #d1d5db;
      background: #f9fafb;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 24px;
      font-size: 11pt;
    }
    .signature-grid {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      margin-top: 40px;
    }
    .signature-col {
      flex: 1;
      border-top: 1px solid #111827;
      padding-top: 12px;
      font-size: 11pt;
    }
    .print-bar {
      text-align: center;
      margin-bottom: 24px;
    }
    .btn {
      background: #18181b;
      color: #fff;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="nda-card">
    <h1>MUTUAL NON-DISCLOSURE AGREEMENT</h1>
    
    <p>This Mutual Non-Disclosure Agreement (the "<strong>Agreement</strong>") is entered into as of <strong>${escapeHtml(effDate)}</strong> (the "<strong>Effective Date</strong>"), by and between:</p>

    <div class="parties-box">
      <p style="margin:0 0 8px 0;"><strong>Party A:</strong> ${escapeHtml(p1Name)}, incorporated/organized under the laws of ${escapeHtml(p1Jur)}.</p>
      <p style="margin:0;"><strong>Party B:</strong> ${escapeHtml(p2Name)}, incorporated/organized under the laws of ${escapeHtml(p2Jur)}.</p>
    </div>

    <p>Each of Party A and Party B may be referred to individually as a "<strong>Party</strong>" or collectively as the "<strong>Parties</strong>." In connection with discussions concerning <strong>${escapeHtml(purpose)}</strong> (the "<strong>Purpose</strong>"), each Party may disclose to the other Party certain confidential and proprietary information.</p>

    <h2>1. Definition of Confidential Information</h2>
    <p>"<strong>Confidential Information</strong>" means any non-public technical, business, financial, operational, or design information disclosed by either Party to the other, whether orally, in writing, electronically, or by inspection of tangible objects, that is identified as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.</p>

    <h2>2. Non-Disclosure and Use Obligations</h2>
    <p>Each Party agrees to: (a) hold the other Party's Confidential Information in strict confidence; (b) protect such Confidential Information with at least the same degree of care it uses for its own confidential information of like importance, but in no event less than reasonable care; and (c) not use any Confidential Information for any purpose other than the Purpose.</p>

    <h2>3. Term and Termination</h2>
    <p>This Agreement and the obligations of confidentiality hereunder shall remain in effect for a period of <strong>${escapeHtml(durationYears)} years</strong> from the Effective Date, after which the Receiving Party's obligations with respect to Confidential Information disclosed prior to termination shall expire.</p>

    <h2>4. Governing Law and Dispute Resolution</h2>
    <p>This Agreement shall be governed by and construed in accordance with the laws of the <strong>${escapeHtml(govLaw)}</strong>, without regard to its conflict of law principles.</p>

    <div class="signature-grid">
      <div class="signature-col">
        <div style="font-weight: 700; margin-bottom: 24px;">For ${escapeHtml(p1Name)}</div>
        <div>By: ___________________________</div>
        <div style="margin-top: 8px;">Name: _________________________</div>
        <div style="margin-top: 8px;">Title: __________________________</div>
        <div style="margin-top: 8px;">Date: __________________________</div>
      </div>
      <div class="signature-col">
        <div style="font-weight: 700; margin-bottom: 24px;">For ${escapeHtml(p2Name)}</div>
        <div>By: ___________________________</div>
        <div style="margin-top: 8px;">Name: _________________________</div>
        <div style="margin-top: 8px;">Title: __________________________</div>
        <div style="margin-top: 8px;">Date: __________________________</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateSopDocument(values: Record<string, string>): string {
  const title = required(values.title, 'SOP Title');
  const sopNumber = values.sopNumber?.trim() || 'SOP-001';
  const department = values.department?.trim() || 'Operations';
  const effectiveDate = values.effectiveDate?.trim() || '2026-09-16';
  const version = values.version?.trim() || 'v1.0';
  const author = values.author?.trim() || 'Author';
  const purpose = required(values.purpose, 'Purpose & Objective');
  const scope = required(values.scope, 'Applicability & Scope');
  const procedureStepsRaw = values.procedureSteps?.trim() || '';
  const contingency = values.contingency?.trim() || '';
  const format = values.format || 'markdown';

  const stepRows = procedureStepsRaw
    ? procedureStepsRaw
        .split(/\r?\n/gu)
        .map((line) => {
          const parts = line.split('|').map((p) => p.trim());
          return {
            step: parts[0] || '',
            action: parts[1] || '',
            role: parts[2] || 'Assigned Staff',
            outcome: parts[3] || 'Task complete',
          };
        })
        .filter((item) => Boolean(item.step && item.action))
    : [];

  if (format === 'html') {
    const stepRowsHtml = stepRows
      .map(
        (s) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-weight: 700; text-align: center;">${escapeHtml(s.step)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7;">${escapeHtml(s.action)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-weight: 500;">${escapeHtml(s.role)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; color: #52525b;">${escapeHtml(s.outcome)}</td>
      </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SOP: ${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #18181b; }
    .header { border-bottom: 2px solid #18181b; padding-bottom: 16px; margin-bottom: 24px; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f4f4f5; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { text-align: left; padding: 10px 12px; background: #f4f4f5; border-bottom: 2px solid #e4e4e7; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #71717a; letter-spacing: 0.5px;">Standard Operating Procedure · ${escapeHtml(department)}</div>
    <h1 style="margin: 4px 0 0; font-size: 24px; font-weight: 800;">${escapeHtml(title)}</h1>
  </div>
  <div class="meta-grid">
    <div><strong>SOP Number:</strong> ${escapeHtml(sopNumber)}</div>
    <div><strong>Version:</strong> ${escapeHtml(version)}</div>
    <div><strong>Effective Date:</strong> ${escapeHtml(effectiveDate)}</div>
    <div style="grid-column: span 3;"><strong>Author / Owner:</strong> ${escapeHtml(author)}</div>
  </div>
  <h2 style="font-size: 16px; font-weight: 700; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px;">1. Purpose & Objective</h2>
  <p style="line-height: 1.6; margin-bottom: 20px;">${escapeHtml(purpose)}</p>
  <h2 style="font-size: 16px; font-weight: 700; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px;">2. Applicability & Scope</h2>
  <p style="line-height: 1.6; margin-bottom: 20px;">${escapeHtml(scope)}</p>
  <h2 style="font-size: 16px; font-weight: 700; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px;">3. Procedural Execution Steps</h2>
  <table>
    <thead><tr><th style="width: 60px; text-align: center;">Step</th><th>Action / Task</th><th>Responsible Role</th><th>Expected Outcome</th></tr></thead>
    <tbody>${stepRowsHtml}</tbody>
  </table>
  ${contingency ? `<h2 style="font-size: 16px; font-weight: 700; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px; margin-top: 24px;">4. Contingency & Rollback Plan</h2><p style="line-height: 1.6;">${escapeHtml(contingency)}</p>` : ''}
  <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-size: 12px; color: #71717a; display: flex; justify-content: space-between;">
    <div>Authorized by Quality Lead: ________________________</div>
    <div>Approved Date: ________________________</div>
  </div>
</body>
</html>`;
  }

  const stepRowsMd = stepRows
    .map((s) => `| ${s.step} | ${s.action} | ${s.role} | ${s.outcome} |`)
    .join('\n');
  const stepTableMd =
    stepRows.length > 0
      ? `| Step | Action / Procedure | Responsible Role | Verification Outcome |\n| :---: | :--- | :--- | :--- |\n${stepRowsMd}`
      : '_No procedural steps defined._';

  return `# Standard Operating Procedure: ${title}

**SOP Identifier:** ${sopNumber}  
**Version:** ${version}  
**Department:** ${department}  
**Effective Date:** ${effectiveDate}  
**Author / Owner:** ${author}  

---

## 1. Purpose & Objective
${purpose}

---

## 2. Applicability & Scope
${scope}

---

## 3. Procedural Execution Steps
${stepTableMd}

${
  contingency
    ? `---

## 4. Contingency & Rollback Plan
${contingency}`
    : ''
}
`;
}

function generateUserStoryBdd(values: Record<string, string>): string {
  const role = required(values.role, 'User Role');
  const action = required(values.action, 'Action');
  const outcome = required(values.outcome, 'Outcome');
  const scenariosRaw = values.scenarios?.trim() || '';
  const dodRaw = values.definitionOfDone?.trim() || '';
  const priority = values.priority || 'High (P1)';

  const scenarioBlocks = scenariosRaw
    ? scenariosRaw
        .split(/\r?\n/gu)
        .map((line) => {
          const parts = line.split('|').map((p) => p.trim());
          if (parts.length >= 4) {
            return `### Scenario: ${parts[0]}\n- **Given** ${parts[1]}\n- **When** ${parts[2]}\n- **Then** ${parts[3]}`;
          }
          if (parts.length > 0 && parts[0]) {
            return `### Scenario: ${parts[0]}\n- **Given** [precondition]\n- **When** [trigger event]\n- **Then** [expected outcome]`;
          }
          return '';
        })
        .filter(Boolean)
        .join('\n\n')
    : '### Scenario: Standard Happy Path\n- **Given** [precondition]\n- **When** [trigger event]\n- **Then** [expected outcome]';

  const dodItems = dodRaw
    ? dodRaw
        .split(/\r?\n/gu)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `- [ ] ${line.replace(/^-\s*\[\s*\]\s*/u, '')}`)
        .join('\n')
    : '- [ ] Automated unit and regression tests pass\n- [ ] Zero egress privacy policy verified\n- [ ] Code reviewed and merged into main branch';

  return `# User Story: ${role} — ${action}

**Priority:** ${priority}  
**Status:** Ready for Sprint  

---

## User Story Narrative
> **As a** ${role}  
> **I want to** ${action}  
> **So that** ${outcome}  

---

## Acceptance Criteria (Gherkin BDD Scenarios)
${scenarioBlocks}

---

## Definition of Done (DoD)
${dodItems}
`;
}
