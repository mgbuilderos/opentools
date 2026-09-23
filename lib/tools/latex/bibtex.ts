/**
 * BibTeX entry parser, validator, deduplicator, and formatter.
 *
 * Client-side execution with zero external dependencies.
 */

export interface BibTeXEntry {
  type: string;
  citationKey: string;
  fields: Record<string, string>;
  raw: string;
}

export interface BibTeXValidationIssue {
  citationKey: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface BibTeXProcessingResult {
  entries: BibTeXEntry[];
  formatted: string;
  metrics: {
    totalEntries: number;
    duplicatesRemoved: number;
    cleanedFields: number;
    warningsCount: number;
  };
  issues: BibTeXValidationIssue[];
  duplicates: Array<{
    key: string;
    title?: string;
    doi?: string;
    reason: string;
  }>;
}

export interface BibTeXOptions {
  deduplicate?: boolean;
  normalizePageRanges?: boolean;
  cleanScholarJunk?: boolean;
  sortBy?: 'author' | 'year' | 'key' | 'none';
  sortOrder?: 'asc' | 'desc';
}

const REQUIRED_FIELDS_BY_TYPE: Record<string, readonly string[]> = {
  article: ['author', 'title', 'journal', 'year'],
  book: ['author', 'title', 'publisher', 'year'], // Or editor
  inproceedings: ['author', 'title', 'booktitle', 'year'],
  conference: ['author', 'title', 'booktitle', 'year'],
  techreport: ['author', 'title', 'institution', 'year'],
  phdthesis: ['author', 'title', 'school', 'year'],
  mastersthesis: ['author', 'title', 'school', 'year'],
  inbook: ['author', 'title', 'chapter', 'publisher', 'year'],
  incollection: ['author', 'title', 'booktitle', 'publisher', 'year'],
  misc: [],
  manual: ['title'],
  proceedings: ['title', 'year'],
  unpublished: ['author', 'title', 'note'],
};

/**
 * Parses raw BibTeX string into a list of structured BibTeXEntry objects.
 */
export function parseBibTeX(input: string): BibTeXEntry[] {
  const entries: BibTeXEntry[] = [];
  if (!input || !input.trim()) return entries;

  // Match `@type{key, ...}` blocks while respecting nested braces
  const entryStartRegex = /@([a-zA-Z]+)\s*\{\s*([^,\s]+)\s*,/g;
  let match: RegExpExecArray | null;

  while ((match = entryStartRegex.exec(input)) !== null) {
    const entryType = match[1].toLowerCase();
    const citationKey = match[2].trim();
    const startIndex = match.index;
    const bodyStartIndex = match.index + match[0].length;

    // Scan for closing brace matching the opening brace
    let depth = 1;
    let inQuotes = false;
    let inComment = false;
    let endIndex = bodyStartIndex;

    for (let i = bodyStartIndex; i < input.length; i++) {
      const char = input[i];
      const prev = i > 0 ? input[i - 1] : '';

      if (char === '%' && prev !== '\\') {
        inComment = true;
      } else if (char === '\n' && inComment) {
        inComment = false;
      }

      if (inComment) continue;

      if (char === '"' && prev !== '\\') {
        inQuotes = !inQuotes;
      } else if (!inQuotes) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    const rawBody = input.slice(bodyStartIndex, endIndex);
    const rawFull = input.slice(startIndex, endIndex + 1);

    // Parse key-value fields inside the body
    const fields = parseBibTeXFields(rawBody);

    entries.push({
      type: entryType,
      citationKey,
      fields,
      raw: rawFull,
    });

    // Advance regex index
    entryStartRegex.lastIndex = endIndex + 1;
  }

  return entries;
}

/**
 * Parses key-value fields from a BibTeX entry body.
 */
function parseBibTeXFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let currentKey = '';
  let currentValue = '';
  let state: 'seeking_key' | 'seeking_equal' | 'reading_value' = 'seeking_key';
  let depth = 0;
  let inQuotes = false;

  const flushField = () => {
    if (currentKey && currentValue !== undefined) {
      let val = currentValue.trim();
      // Strip outer braces or quotes
      if (val.startsWith('{') && val.endsWith('}')) {
        val = val.slice(1, -1);
      } else if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      fields[currentKey.toLowerCase()] = val.trim();
    }
    currentKey = '';
    currentValue = '';
    state = 'seeking_key';
    depth = 0;
    inQuotes = false;
  };

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    const prev = i > 0 ? body[i - 1] : '';

    if (state === 'seeking_key') {
      if (char === '=') {
        currentKey = currentKey.trim();
        state = 'reading_value';
      } else if (char === ',') {
        currentKey = '';
      } else if (!/\s/.test(char) || currentKey.length > 0) {
        currentKey += char;
      }
    } else if (state === 'reading_value') {
      if (char === '"' && prev !== '\\') {
        inQuotes = !inQuotes;
        currentValue += char;
      } else if (char === '{' && !inQuotes) {
        depth++;
        currentValue += char;
      } else if (char === '}' && !inQuotes) {
        depth--;
        currentValue += char;
      } else if (char === ',' && depth === 0 && !inQuotes) {
        flushField();
      } else {
        currentValue += char;
      }
    }
  }

  flushField();
  return fields;
}

/**
 * Normalizes DOI string (strips URL prefix, lowercases).
 */
export function normalizeDoi(doi?: string): string {
  if (!doi) return '';
  return doi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//iu, '')
    .replace(/^doi:\s*/iu, '');
}

/**
 * Normalizes title string for deduplication (removes punctuation, lowercases, collapses spaces).
 */
export function normalizeTitle(title?: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[{}]/gu, '')
    .replace(/[^\w\s]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Processes, validates, cleans, deduplicates, and formats BibTeX entries.
 */
export function processBibTeX(
  input: string,
  options: BibTeXOptions = {},
): BibTeXProcessingResult {
  const {
    deduplicate = true,
    normalizePageRanges = true,
    cleanScholarJunk = true,
    sortBy = 'none',
    sortOrder = 'asc',
  } = options;

  const rawEntries = parseBibTeX(input);
  const issues: BibTeXValidationIssue[] = [];
  const duplicates: Array<{
    key: string;
    title?: string;
    doi?: string;
    reason: string;
  }> = [];

  let cleanedFieldsCount = 0;

  // 1. Field validation & Cleaning
  const cleanedEntries: BibTeXEntry[] = rawEntries.map((entry) => {
    const fields = { ...entry.fields };

    // Check required fields
    const required = REQUIRED_FIELDS_BY_TYPE[entry.type] ?? [];
    for (const reqField of required) {
      if (reqField === 'author' && entry.type === 'book') {
        if (!fields.author && !fields.editor) {
          issues.push({
            citationKey: entry.citationKey,
            field: 'author/editor',
            severity: 'error',
            message: `Book entry missing required 'author' or 'editor' field.`,
          });
        }
        continue;
      }

      if (!fields[reqField] || !fields[reqField].trim()) {
        issues.push({
          citationKey: entry.citationKey,
          field: reqField,
          severity: 'error',
          message: `Entry missing required field '${reqField}'.`,
        });
      }
    }

    // Normalise page ranges (e.g. "123-145" -> "123--145")
    if (normalizePageRanges && fields.pages) {
      const orig = fields.pages;
      // Match single hyphen between numbers, not already double hyphen
      const normalized = orig.replace(/(\d+)\s*-\s*(\d+)/gu, '$1--$2');
      if (normalized !== orig) {
        fields.pages = normalized;
        cleanedFieldsCount++;
      }
    }

    // Clean Google Scholar junk
    if (cleanScholarJunk) {
      // Remove empty or trivial month fields like month={}
      if (
        fields.month !== undefined &&
        (!fields.month.trim() || fields.month === '{}')
      ) {
        delete fields.month;
        cleanedFieldsCount++;
      }
      // Remove local file links like file={:path/to/file.pdf:PDF}
      if (fields.file && fields.file.startsWith(':')) {
        delete fields.file;
        cleanedFieldsCount++;
      }
      // Clean unescaped & or % in title, journal, booktitle
      for (const f of [
        'title',
        'journal',
        'booktitle',
        'publisher',
        'institution',
      ] as const) {
        if (fields[f]) {
          const orig = fields[f];
          const unescaped = orig
            .replace(/(?<!\\)&/gu, '\\&')
            .replace(/(?<!\\)%/gu, '\\%');
          if (unescaped !== orig) {
            fields[f] = unescaped;
            cleanedFieldsCount++;
          }
        }
      }
    }

    return {
      ...entry,
      fields,
    };
  });

  // 2. Deduplication
  const seenDois = new Map<string, string>(); // normDoi -> citationKey
  const seenTitles = new Map<string, string>(); // normTitle -> citationKey
  const uniqueEntries: BibTeXEntry[] = [];

  for (const entry of cleanedEntries) {
    if (!deduplicate) {
      uniqueEntries.push(entry);
      continue;
    }

    const normDoi = normalizeDoi(entry.fields.doi);
    const normTitle = normalizeTitle(entry.fields.title);

    let isDupe = false;
    let reason = '';

    if (normDoi && seenDois.has(normDoi)) {
      isDupe = true;
      reason = `Duplicate DOI with '${seenDois.get(normDoi)}' (${normDoi})`;
    } else if (normTitle && normTitle.length > 8 && seenTitles.has(normTitle)) {
      isDupe = true;
      reason = `Duplicate Title with '${seenTitles.get(normTitle)}'`;
    }

    if (isDupe) {
      duplicates.push({
        key: entry.citationKey,
        title: entry.fields.title,
        doi: entry.fields.doi,
        reason,
      });
    } else {
      if (normDoi) seenDois.set(normDoi, entry.citationKey);
      if (normTitle) seenTitles.set(normTitle, entry.citationKey);
      uniqueEntries.push(entry);
    }
  }

  // 3. Sorting
  if (sortBy !== 'none') {
    uniqueEntries.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortBy === 'author') {
        valA = a.fields.author ?? '';
        valB = b.fields.author ?? '';
      } else if (sortBy === 'year') {
        valA = a.fields.year ?? '';
        valB = b.fields.year ?? '';
      } else if (sortBy === 'key') {
        valA = a.citationKey;
        valB = b.citationKey;
      }
      const cmp = valA.localeCompare(valB, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }

  // 4. Formatter
  const formatted = uniqueEntries
    .map((entry) => {
      const fieldLines = Object.entries(entry.fields)
        .map(([k, v]) => `  ${k.padEnd(12, ' ')} = {${v}},`)
        .join('\n');
      return `@${entry.type}{${entry.citationKey},\n${fieldLines}\n}`;
    })
    .join('\n\n');

  return {
    entries: uniqueEntries,
    formatted,
    metrics: {
      totalEntries: rawEntries.length,
      duplicatesRemoved: duplicates.length,
      cleanedFields: cleanedFieldsCount,
      warningsCount: issues.length,
    },
    issues,
    duplicates,
  };
}
