import { csvToRecords } from './structured';

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
        'Private browser tools can process small jobs in the tab.\n\nReview the result before downloading.',
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
    name: 'LaTeX table generator',
    description:
      'Convert strict CSV into an escaped LaTeX tabular environment.',
    fields: [
      area('csv', 'CSV table', 'Name,Score\nAda,91\nLin,84'),
      select('alignment', 'Column alignment', [
        { value: 'l', label: 'Left' },
        { value: 'c', label: 'Center' },
        { value: 'r', label: 'Right' },
      ]),
    ],
    outputExtension: 'tex',
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

function latex(value: string) {
  const escapes: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '#': '\\#',
    $: '\\$',
    '%': '\\%',
    '&': '\\&',
    _: '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };
  return Array.from(value, (character) => escapes[character] ?? character).join(
    '',
  );
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
      const data = csvToRecords(values.csv);
      const columns = Array.from(
        { length: data.headers.length },
        () => values.alignment,
      ).join('');
      const row = (items: string[]) => `${items.map(latex).join(' & ')} \\\\`;
      return `\\begin{tabular}{${columns}}\n${row(data.headers)}\n\\hline\n${data.rows.map((item) => row(data.headers.map((name) => item[name]))).join('\n')}\n\\end{tabular}`;
    }
    default:
      throw new Error('Choose a supported document operation.');
  }
}
