import { htmlToMarkdown, markdownToHtml } from './notation';

export interface WritingField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
}

export interface WritingOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly WritingField[];
  notice?: string;
  outputExtension?: string;
}

const text = (
  id: string,
  label: string,
  defaultValue: string,
): WritingField => ({ id, label, type: 'text', defaultValue });
const area = (
  id: string,
  label: string,
  defaultValue: string,
): WritingField => ({ id, label, type: 'textarea', defaultValue });
const number = (
  id: string,
  label: string,
  defaultValue: string,
): WritingField => ({ id, label, type: 'number', defaultValue });
const select = (
  id: string,
  label: string,
  options: readonly { value: string; label: string }[],
): WritingField => ({
  id,
  label,
  type: 'select',
  defaultValue: options[0]?.value ?? '',
  options,
});
const limitedMarkupNotice =
  'Converts a documented common subset, not every extension or arbitrary HTML document. Review the generated output before publishing.';

export const WRITING_OPERATIONS: readonly WritingOperation[] = [
  {
    id: 'text-editor',
    name: 'Plain-text editor & exporter',
    description:
      'Normalize pasted text to UTF-8 LF line endings and download it.',
    fields: [
      area(
        'input',
        'Text',
        'Write or paste text here.\nThe output stays local.',
      ),
    ],
    outputExtension: 'txt',
  },
  {
    id: 'markdown-editor',
    name: 'Markdown editor & exporter',
    description: 'Edit non-empty Markdown and download a UTF-8 file.',
    fields: [
      area(
        'input',
        'Markdown',
        '# Local note\n\n- Clear\n- Private\n- Downloadable',
      ),
    ],
    outputExtension: 'md',
  },
  {
    id: 'html-to-markdown',
    name: 'HTML to Markdown',
    description: 'Convert common semantic HTML tags into readable Markdown.',
    fields: [
      area(
        'input',
        'HTML',
        '<h1>Project</h1><p>A <strong>private</strong> tool.</p><ul><li>Fast</li><li>Local</li></ul>',
      ),
    ],
    notice: limitedMarkupNotice,
    outputExtension: 'md',
  },
  {
    id: 'markdown-to-html',
    name: 'Markdown to HTML',
    description: 'Convert a safe common Markdown subset to escaped HTML.',
    fields: [
      area(
        'input',
        'Markdown',
        '# Project\n\nA **private** tool.\n\n- Fast\n- Local',
      ),
    ],
    notice: limitedMarkupNotice,
    outputExtension: 'html',
  },
  {
    id: 'text-diff',
    name: 'Text diff',
    description:
      'Create a bounded line-level longest-common-subsequence diff for text or code.',
    fields: [
      area('before', 'Before', 'Title\nOld sentence\nShared line'),
      area('after', 'After', 'Title\nNew sentence\nShared line'),
    ],
  },
  {
    id: 'text-merge',
    name: 'Text merge',
    description:
      'Join up to 1,000 supplied text blocks with an explicit separator.',
    fields: [
      area(
        'blocks',
        'Blocks separated by a divider line',
        'First block\n---SPLIT---\nSecond block',
      ),
      text('divider', 'Input divider', '---SPLIT---'),
      text('separator', 'Output separator', '\n\n'),
    ],
  },
  {
    id: 'spelling-variant-converter',
    name: 'US/UK spelling converter',
    description:
      'Convert a disclosed built-in list of common US and UK spelling variants.',
    fields: [
      select('direction', 'Direction', [
        { value: 'us-to-uk', label: 'US to UK' },
        { value: 'uk-to-us', label: 'UK to US' },
      ]),
      area(
        'input',
        'Text',
        'The color and behavior of the center panel are customizable.',
      ),
    ],
    notice:
      'Dictionary-based aid for common variants only; context, proper nouns, domain terms, and many variants need human review.',
  },
  {
    id: 'braille-translator',
    name: 'Basic Braille translator',
    description:
      'Translate basic Latin letters, digits, spaces, and punctuation to Unicode Braille.',
    fields: [area('input', 'Text', 'Hello 2026!')],
    notice:
      'Basic uncontracted character mapping only; it does not implement Grade 2 contractions, language-specific rules, tactile layout, or accessibility certification.',
  },
  {
    id: 'rot-cipher',
    name: 'ROT cipher',
    description:
      'Rotate Latin letters by a chosen value while preserving case.',
    fields: [
      area('input', 'Text', 'Attack at dawn!'),
      number('shift', 'Rotation (0–25)', '13'),
    ],
  },
  {
    id: 'caesar-cipher',
    name: 'Caesar cipher',
    description:
      'Encode or decode Latin letters with an explicit Caesar shift.',
    fields: [
      select('mode', 'Mode', [
        { value: 'encode', label: 'Encode' },
        { value: 'decode', label: 'Decode' },
      ]),
      area('input', 'Text', 'Meet at noon.'),
      number('shift', 'Shift (0–25)', '3'),
    ],
    notice:
      'Classical puzzle cipher only. It provides no modern confidentiality or security.',
  },
  {
    id: 'vigenere-cipher',
    name: 'Vigenère cipher',
    description:
      'Encode or decode Latin letters using a supplied alphabetic key.',
    fields: [
      select('mode', 'Mode', [
        { value: 'encode', label: 'Encode' },
        { value: 'decode', label: 'Decode' },
      ]),
      area('input', 'Text', 'ATTACK AT DAWN'),
      text('key', 'Alphabetic key', 'LEMON'),
    ],
    notice:
      'Classical puzzle cipher only. It provides no modern confidentiality or security.',
  },
  {
    id: 'text-summarization-workspace',
    name: 'Extractive text summarizer',
    description:
      'Rank sentences by local word frequency and preserve selected sentence order.',
    fields: [
      area(
        'input',
        'Source text',
        'Local tools avoid unnecessary uploads. They can also start quickly. Clear navigation helps people find the right action. Performance receipts make saved time visible.',
      ),
      number('sentences', 'Summary sentences (1–20)', '2'),
    ],
    notice:
      'Deterministic extractive ranking only. It does not understand facts, intent, nuance, or truth and may omit important context.',
  },
  {
    id: 'outline-builder',
    name: 'Outline builder',
    description: 'Convert explicit level/title rows into a Markdown outline.',
    fields: [
      area(
        'items',
        'level | heading',
        '1 | Product\n2 | Problem\n2 | Solution\n3 | Privacy\n3 | Performance',
      ),
    ],
    outputExtension: 'md',
  },
  {
    id: 'prompt-template-builder',
    name: 'Prompt-template builder',
    description:
      'Structure supplied role, task, context, constraints, and output requirements.',
    fields: [
      text('role', 'Role', 'You are a careful product analyst.'),
      area('task', 'Task', 'Compare the supplied options and recommend one.'),
      area('context', 'Context', '{{paste context here}}'),
      area(
        'constraints',
        'One constraint per line',
        'Use only supplied facts\nState uncertainty\nDo not invent sources',
      ),
      area(
        'output',
        'Output format',
        'Return a concise comparison table followed by a recommendation.',
      ),
    ],
    outputExtension: 'md',
  },
  {
    id: 'email-signature-generator',
    name: 'Email-signature generator',
    description:
      'Generate a minimal escaped HTML email signature from supplied contact facts.',
    fields: [
      text('name', 'Name', 'Ada Example'),
      text('title', 'Title', 'Product Engineer'),
      text('organization', 'Organization', 'Example Studio'),
      text('email', 'Email', 'ada@example.com'),
      text('phone', 'Phone', '+91 98765 43210'),
      text('website', 'Website', 'https' + '://example.com'),
    ],
    notice:
      'Email clients vary. Send test messages and confirm links, wrapping, dark mode, and accessibility before organization-wide use.',
    outputExtension: 'html',
  },
  {
    id: 'citation-text-generator',
    name: 'Citation text generator',
    description: 'Assemble supplied citation facts into a basic text pattern.',
    fields: [
      text('author', 'Author', 'Example, Ada'),
      text('year', 'Year', '2026'),
      text('title', 'Title', 'Private browser tools'),
      text('source', 'Source / publisher', 'Example Press'),
      text('url', 'URL (optional)', 'https' + '://example.com/article'),
    ],
    notice:
      'Basic starting point only. Verify the current style guide and the exact rules for your source type.',
  },
  {
    id: 'markdown-to-pdf-doc',
    name: 'Markdown to print & PDF document formatter',
    description:
      'Transform raw Markdown into a beautifully typeset, printable HTML document with page headers, footers, and print styles.',
    fields: [
      area(
        'markdown',
        'Markdown source',
        '# Executive Project Summary\n\n## 1. Objective & Philosophy\nOpenTools delivers zero-egress, client-side tools that run entirely in memory.\n\n* **Privacy First**: Zero server telemetry or data uploads.\n* **Standardized**: Governed by immutable W3C, POSIX, and algorithmic specifications.\n* **Reliability**: Instant execution with zero maintenance.\n\n### Core Tenets\n| Feature | Traditional Cloud Tools | OpenTools Local |\n| :--- | :--- | :--- |\n| Data Egress | Uploads to remote servers | 100% In-Browser |\n| Subscriptions | Paid monthly tiers | Free & Patronage |\n| Offline Ready | Requires active internet | Works offline |\n\n> "Simplicity is prerequisite for reliability."\n\n```typescript\nfunction executeSafely(): boolean {\n  return true;\n}\n```',
      ),
      text('title', 'Document title', 'Executive Project Summary'),
      select('pageSize', 'Page size', [
        { value: 'A4', label: 'A4 (210 × 297 mm)' },
        { value: 'letter', label: 'Letter (8.5 × 11 in)' },
        { value: 'legal', label: 'Legal (8.5 × 14 in)' },
      ]),
      select('orientation', 'Orientation', [
        { value: 'portrait', label: 'Portrait' },
        { value: 'landscape', label: 'Landscape' },
      ]),
      select('theme', 'Typography theme', [
        { value: 'modern-clean', label: 'Modern Clean (System Sans-Serif)' },
        {
          value: 'academic-serif',
          label: 'Academic Serif (Georgia / Garamond)',
        },
        {
          value: 'technical-mono',
          label: 'Technical Clean (Monospace headers)',
        },
        { value: 'minimalist', label: 'Minimalist (Swiss Style)' },
      ]),
    ],
    outputExtension: 'html',
  },
] as const;

function required(value: string, label: string, maximum = 1_000_000) {
  const output = value.trim();
  if (!output) throw new Error(`${label} is required.`);
  if (output.length > maximum)
    throw new Error(
      `${label} is limited to ${maximum.toLocaleString()} characters.`,
    );
  return output;
}
function integer(
  values: Record<string, string>,
  key: string,
  minimum: number,
  maximum: number,
) {
  const output = Number(values[key]);
  if (!Number.isSafeInteger(output) || output < minimum || output > maximum)
    throw new Error(
      `${key} must be a whole number from ${minimum} to ${maximum}.`,
    );
  return output;
}
function escapeHtml(value: string) {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

function lcsDiff(before: string, after: string) {
  const left = before.split(/\r?\n/gu);
  const right = after.split(/\r?\n/gu);
  if (left.length * right.length > 1_000_000)
    throw new Error('Text diff is limited to one million line-pair cells.');
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

const SPELLING_PAIRS = [
  ['color', 'colour'],
  ['behavior', 'behaviour'],
  ['center', 'centre'],
  ['customize', 'customise'],
  ['organize', 'organise'],
  ['analyze', 'analyse'],
  ['catalog', 'catalogue'],
  ['dialog', 'dialogue'],
  ['favorite', 'favourite'],
  ['honor', 'honour'],
  ['labor', 'labour'],
  ['neighbor', 'neighbour'],
  ['theater', 'theatre'],
  ['meter', 'metre'],
  ['liter', 'litre'],
  ['traveling', 'travelling'],
  ['canceled', 'cancelled'],
  ['license', 'licence'],
  ['defense', 'defence'],
  ['gray', 'grey'],
] as const;
function matchCase(source: string, target: string) {
  return source === source.toLocaleUpperCase()
    ? target.toLocaleUpperCase()
    : /^\p{Lu}/u.test(source)
      ? target[0].toLocaleUpperCase() + target.slice(1)
      : target;
}
function convertSpelling(value: string, direction: string) {
  let output = value;
  for (const [us, uk] of SPELLING_PAIRS) {
    const from = direction === 'uk-to-us' ? uk : us;
    const to = direction === 'uk-to-us' ? us : uk;
    output = output.replace(new RegExp(`\\b${from}\\b`, 'giu'), (match) =>
      matchCase(match, to),
    );
  }
  return output;
}

const BRAILLE_LETTERS = '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵';
function braille(value: string) {
  const punctuation: Record<string, string> = {
    ' ': ' ',
    ',': '⠂',
    ';': '⠆',
    ':': '⠒',
    '.': '⠲',
    '!': '⠖',
    '?': '⠦',
    '-': '⠤',
  };
  const digits = '1234567890';
  return Array.from(value, (character) => {
    const lower = character.toLocaleLowerCase();
    const letter = lower.charCodeAt(0) - 97;
    if (letter >= 0 && letter < 26)
      return `${character === character.toLocaleUpperCase() ? '⠠' : ''}${BRAILLE_LETTERS[letter]}`;
    const digit = digits.indexOf(character);
    if (digit >= 0) return `⠼${BRAILLE_LETTERS[digit]}`;
    return punctuation[character] ?? `⟦${character}⟧`;
  }).join('');
}
function rotate(value: string, shift: number) {
  const normalized = ((shift % 26) + 26) % 26;
  return value.replace(/[A-Za-z]/gu, (character) => {
    const base = character >= 'a' ? 97 : 65;
    return String.fromCharCode(
      base + ((character.charCodeAt(0) - base + normalized) % 26),
    );
  });
}
function vigenere(value: string, rawKey: string, decode: boolean) {
  const key = required(rawKey, 'Key', 1_000).toLocaleUpperCase();
  if (!/^[A-Z]+$/u.test(key))
    throw new Error('Key must contain Latin letters only.');
  let index = 0;
  return value.replace(/[A-Za-z]/gu, (character) => {
    const shift = key.charCodeAt(index++ % key.length) - 65;
    return rotate(character, decode ? -shift : shift);
  });
}

function summarize(value: string, count: number) {
  const source = required(value, 'Source text');
  const sentences =
    source
      .match(/[^.!?]+(?:[.!?]+|$)/gu)
      ?.map((item) => item.trim())
      .filter(Boolean) ?? [];
  if (!sentences.length || sentences.length > 10_000)
    throw new Error('Source must contain from 1 to 10,000 sentences.');
  const stop = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'in',
    'is',
    'it',
    'of',
    'on',
    'or',
    'that',
    'the',
    'this',
    'to',
    'was',
    'were',
    'will',
    'with',
  ]);
  const frequencies = new Map<string, number>();
  const words = (text: string) =>
    text.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? [];
  for (const word of words(source))
    if (!stop.has(word))
      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  return sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score:
        words(sentence).reduce(
          (score, word) => score + (frequencies.get(word) ?? 0),
          0,
        ) / Math.max(1, words(sentence).length),
    }))
    .toSorted((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.min(count, sentences.length))
    .toSorted((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(' ');
}

export function runWritingOperation(
  operationId: string,
  values: Record<string, string>,
) {
  switch (operationId) {
    case 'text-editor':
    case 'markdown-editor':
      return required(values.input, 'Content').replace(/\r\n?/gu, '\n');
    case 'html-to-markdown':
      return htmlToMarkdown(values.input);
    case 'markdown-to-html':
      return markdownToHtml(values.input);
    case 'text-diff':
      return lcsDiff(values.before, values.after);
    case 'text-merge': {
      const divider = required(values.divider, 'Input divider', 10_000);
      const blocks = required(values.blocks, 'Blocks').split(divider);
      if (blocks.length > 1_000)
        throw new Error('Text merge is limited to 1,000 blocks.');
      const separator = values.separator
        .replace(/\\n/gu, '\n')
        .replace(/\\t/gu, '\t');
      return blocks
        .map((block) => block.trim())
        .filter(Boolean)
        .join(separator);
    }
    case 'spelling-variant-converter':
      return convertSpelling(values.input, values.direction);
    case 'braille-translator':
      return braille(required(values.input, 'Text'));
    case 'rot-cipher':
      return rotate(
        required(values.input, 'Text'),
        integer(values, 'shift', 0, 25),
      );
    case 'caesar-cipher': {
      const shift = integer(values, 'shift', 0, 25);
      return rotate(
        required(values.input, 'Text'),
        values.mode === 'decode' ? -shift : shift,
      );
    }
    case 'vigenere-cipher':
      return vigenere(
        required(values.input, 'Text'),
        values.key,
        values.mode === 'decode',
      );
    case 'text-summarization-workspace':
      return summarize(values.input, integer(values, 'sentences', 1, 20));
    case 'outline-builder':
      return values.items
        .split(/\r?\n/gu)
        .map((line, index) => {
          const match = /^\s*([1-6])\s*\|\s*(.+)$/u.exec(line);
          if (!match)
            throw new Error(
              `Outline row ${index + 1} must be level | heading.`,
            );
          return `${'#'.repeat(Number(match[1]))} ${match[2].trim()}`;
        })
        .join('\n\n');
    case 'prompt-template-builder': {
      const constraints = required(values.constraints, 'Constraints')
        .split(/\r?\n/gu)
        .map((item) => item.trim())
        .filter(Boolean);
      return `# Role\n\n${required(values.role, 'Role')}\n\n# Task\n\n${required(values.task, 'Task')}\n\n# Context\n\n${required(values.context, 'Context')}\n\n# Constraints\n\n${constraints.map((item) => `- ${item.replace(/^[-*]\s*/u, '')}`).join('\n')}\n\n# Required output\n\n${required(values.output, 'Output format')}`;
    }
    case 'email-signature-generator': {
      const website = required(values.website, 'Website');
      let url: URL;
      try {
        url = new URL(website);
      } catch {
        throw new Error('Website must be an absolute URL.');
      }
      if (!['http:', 'https:'].includes(url.protocol))
        throw new Error('Website must use HTTP or HTTPS.');
      const email = required(values.email, 'Email');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))
        throw new Error('Enter a plausible email address.');
      return `<table role="presentation" cellspacing="0" cellpadding="0" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.4;color:#111"><tr><td><strong>${escapeHtml(required(values.name, 'Name'))}</strong><br>${escapeHtml(required(values.title, 'Title'))} · ${escapeHtml(required(values.organization, 'Organization'))}<br><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>${values.phone.trim() ? ` · ${escapeHtml(values.phone.trim())}` : ''}<br><a href="${escapeHtml(url.href)}">${escapeHtml(url.hostname)}</a></td></tr></table>`;
    }
    case 'citation-text-generator': {
      const author = required(values.author, 'Author');
      const year = required(values.year, 'Year');
      const title = required(values.title, 'Title');
      const source = required(values.source, 'Source');
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
      return `${author}. (${year}). ${title}. ${source}.${url ? ` ${url}` : ''}`;
    }
    case 'markdown-to-pdf-doc': {
      return generateMarkdownPrintDoc(values);
    }
    default:
      throw new Error('Choose a supported writing operation.');
  }
}

function generateMarkdownPrintDoc(values: Record<string, string>): string {
  const md = required(values.markdown, 'Markdown source');
  const title = values.title?.trim() || 'Document';
  const pageSize = values.pageSize || 'A4';
  const orientation = values.orientation || 'portrait';
  const theme = values.theme || 'modern-clean';

  const bodyHtml = markdownToHtml(md);

  let fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  let headingFont = 'inherit';
  if (theme === 'academic-serif') {
    fontFamily = 'Georgia, "Times New Roman", Garamond, serif';
    headingFont = 'Georgia, serif';
  } else if (theme === 'technical-mono') {
    fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    headingFont = '"SF Mono", "Segoe UI Mono", "Courier New", monospace';
  } else if (theme === 'minimalist') {
    fontFamily = 'Helvetica Neue, Arial, sans-serif';
    headingFont = 'Helvetica Neue, Arial, sans-serif';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: 20mm 18mm;
    }
    @media print {
      body {
        background: #fff !important;
        color: #000 !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .document-container {
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        padding: 0 !important;
      }
      h1, h2, h3, table, pre, blockquote {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
    body {
      font-family: ${fontFamily};
      background: #f4f4f5;
      color: #18181b;
      margin: 0;
      padding: 32px 16px;
      line-height: 1.65;
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
    .btn:hover {
      background: #27272a;
    }
    .document-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      padding: 48px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: ${headingFont};
      color: #09090b;
      font-weight: 700;
      line-height: 1.25;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    h1 { font-size: 26pt; border-bottom: 2px solid #e4e4e7; padding-bottom: 8px; margin-top: 0; }
    h2 { font-size: 18pt; border-bottom: 1px solid #f4f4f5; padding-bottom: 6px; }
    h3 { font-size: 14pt; }
    p { margin-top: 0; margin-bottom: 1.2em; font-size: 11pt; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #e4e4e7;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    blockquote {
      margin: 1.5em 0;
      padding: 12px 20px;
      border-left: 4px solid #18181b;
      background: #f8fafc;
      font-style: italic;
      color: #3f3f46;
    }
    pre {
      background: #09090b;
      color: #f4f4f5;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 9.5pt;
      line-height: 1.45;
      margin: 1.5em 0;
    }
    code {
      font-family: "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.9em;
    }
    ul, ol {
      margin-top: 0;
      margin-bottom: 1.2em;
      padding-left: 24px;
      font-size: 11pt;
    }
    li {
      margin-bottom: 0.35em;
    }
    hr {
      border: 0;
      border-top: 1px solid #e4e4e7;
      margin: 2em 0;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <article class="document-container">
    ${bodyHtml}
  </article>
</body>
</html>`;
}
