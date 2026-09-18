/**
 * A small XML reader, written for the EPUB tools in this folder.
 *
 * An EPUB's index is XML: `META-INF/container.xml` names the package document,
 * and the package document lists the book's metadata, its files and the order
 * they are read in. To open one we have to read that XML.
 *
 * `DOMParser` is not used, for two reasons that both matter here:
 *
 * 1. **It does not exist in the unit-test environment.** `vitest.config.ts` sets
 *    `environment: 'node'`, so a parser that only works in a browser could only
 *    ever be tested in a browser — and this project has learned the hard way
 *    (capsule trap 2) that a page which is only checked by a browser suite is a
 *    page whose failures arrive in production.
 * 2. **`DOMParser` on an XHTML string is permissive in ways that differ between
 *    engines.** The same book would then read differently in Chrome and Safari.
 *
 * So this is a scanner, not a validator. It reads well-formed XML and gives up
 * honestly on anything else rather than guessing. It deliberately does **not**
 * resolve external entities or DTDs — an EPUB is an untrusted file from the
 * internet, and entity expansion is how "billion laughs" denial-of-service
 * attacks work. Doctype declarations are skipped, not followed.
 */

/**
 * A child of an element: either a run of character data or another element.
 *
 * Text and elements are kept in one ordered list rather than in separate
 * `text` and `children` fields. That ordering is not a detail — in
 * `<p>Two.<br/>Still two.</p>` the line break belongs *between* the two runs of
 * text, and a reader that stores text separately from children puts it after
 * both and silently joins the lines.
 */
export type XmlNode = string | XmlElement;

/** One element, with its namespace prefix stripped so lookups stay simple. */
export interface XmlElement {
  /** Local name, lowercased and without any `opf:` / `dc:` prefix. */
  name: string;
  /** The name exactly as the document wrote it. */
  qualifiedName: string;
  /** Attributes, keyed by lowercased local name. */
  attributes: Record<string, string>;
  /** Character data and child elements, in document order. */
  nodes: XmlNode[];
  /** Child elements only, for callers that do not care about text. */
  children: XmlElement[];
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Turn the five XML entities, the numeric forms, and `&nbsp;` into characters.
 * Anything else is left exactly as written rather than guessed at.
 */
export function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) && code > 0 ? safeFromCodePoint(code, whole) : whole;
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? safeFromCodePoint(code, whole) : whole;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? whole;
  });
}

function safeFromCodePoint(code: number, fallback: string): string {
  // Surrogates and out-of-range values would throw; leave those as written.
  if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return fallback;
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

/** Strip a namespace prefix: `dc:title` → `title`, `opf:role` → `role`. */
function localName(name: string): string {
  const colon = name.indexOf(':');
  return (colon === -1 ? name : name.slice(colon + 1)).toLowerCase();
}

interface Token {
  /** `raw` is CDATA: character data that must NOT be entity-decoded. */
  kind: 'open' | 'close' | 'selfClosing' | 'text' | 'raw';
  name: string;
  attributes: Record<string, string>;
  text: string;
}

const ATTRIBUTE_PATTERN = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'<>`]+))/g;

function readAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match = ATTRIBUTE_PATTERN.exec(source);
  while (match !== null) {
    const raw = match[3] ?? match[4] ?? match[5] ?? '';
    attributes[localName(match[1])] = decodeXmlEntities(raw);
    match = ATTRIBUTE_PATTERN.exec(source);
  }
  return attributes;
}

/**
 * Split the document into tags and character data.
 *
 * Comments, CDATA sections, processing instructions and doctype declarations
 * are handled explicitly so that a `<` inside any of them cannot be mistaken
 * for the start of a tag.
 */
function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let pending = '';

  const flushText = () => {
    if (pending.length > 0) {
      tokens.push({ kind: 'text', name: '', attributes: {}, text: pending });
      pending = '';
    }
  };

  while (index < source.length) {
    const next = source.indexOf('<', index);
    if (next === -1) {
      pending += source.slice(index);
      break;
    }
    pending += source.slice(index, next);

    if (source.startsWith('<!--', next)) {
      const end = source.indexOf('-->', next + 4);
      index = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', next)) {
      const end = source.indexOf(']]>', next + 9);
      // CDATA is character data verbatim. It gets its own token so that the
      // entity decoder never runs over it - inside CDATA, `&amp;` is literally
      // the five characters `&amp;`, not an ampersand.
      flushText();
      tokens.push({
        kind: 'raw',
        name: '',
        attributes: {},
        text: source.slice(next + 9, end === -1 ? source.length : end),
      });
      index = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<?', next)) {
      const end = source.indexOf('?>', next + 2);
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    if (source.startsWith('<!', next)) {
      // A doctype may contain a bracketed internal subset. Skip it without
      // reading it: external entities are never resolved here, on purpose.
      let cursor = next + 2;
      let depth = 0;
      while (cursor < source.length) {
        const char = source[cursor];
        if (char === '[') depth += 1;
        else if (char === ']') depth -= 1;
        else if (char === '>' && depth <= 0) break;
        cursor += 1;
      }
      index = cursor + 1;
      continue;
    }

    const end = findTagEnd(source, next);
    if (end === -1) {
      pending += source.slice(next);
      break;
    }

    const inner = source.slice(next + 1, end);
    flushText();
    if (inner.startsWith('/')) {
      tokens.push({ kind: 'close', name: localName(inner.slice(1).trim()), attributes: {}, text: '' });
    } else {
      const selfClosing = inner.endsWith('/');
      const body = selfClosing ? inner.slice(0, -1) : inner;
      const nameMatch = /^([^\s/>]+)/.exec(body);
      const qualified = nameMatch ? nameMatch[1] : '';
      tokens.push({
        kind: selfClosing ? 'selfClosing' : 'open',
        name: qualified,
        attributes: readAttributes(body.slice(qualified.length)),
        text: '',
      });
    }
    index = end + 1;
  }

  flushText();
  return tokens;
}

/** Find the `>` that closes a tag, ignoring any inside a quoted attribute. */
function findTagEnd(source: string, start: number): number {
  let quote: string | null = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '>') return index;
  }
  return -1;
}

/**
 * Tags in XHTML that never have a closing tag, so they must not open a scope.
 *
 * `meta` is the awkward one, and it is the reason this set is an option rather
 * than a constant. In an XHTML chapter `<meta>` is void. In an EPUB 3 *package
 * document* it is not: `<meta property="dcterms:modified">2026-01-02</meta>`
 * carries its value as text. Treat it as void there and the value is silently
 * attached to the wrong element; treat it as non-void in a chapter whose author
 * wrote `<meta charset="utf-8">` unclosed and the rest of the chapter is
 * swallowed into an element that is then dropped as non-prose. So the caller
 * says which document it is reading.
 */
export const HTML_VOID_ELEMENTS: ReadonlySet<string> = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** For strict XML such as an OPF package document: every tag closes itself. */
export const NO_VOID_ELEMENTS: ReadonlySet<string> = new Set();

export interface ParseXmlOptions {
  /** Defaults to {@link HTML_VOID_ELEMENTS}. */
  voidElements?: ReadonlySet<string>;
}

/**
 * Read a document into a tree. Returns `null` when there is no root element.
 *
 * Mismatched closing tags are tolerated by unwinding to the nearest matching
 * open element: real books in the wild are not always well formed, and
 * refusing to show a book because one `</i>` is stray would help nobody.
 */
export function parseXml(
  source: string,
  options: ParseXmlOptions = {},
): XmlElement | null {
  const voidElements = options.voidElements ?? HTML_VOID_ELEMENTS;
  const tokens = tokenize(source);
  const roots: XmlElement[] = [];
  const stack: XmlElement[] = [];

  const push = (element: XmlElement) => {
    const parent = stack[stack.length - 1];
    if (parent) {
      parent.nodes.push(element);
      parent.children.push(element);
    } else {
      roots.push(element);
    }
  };

  for (const token of tokens) {
    if (token.kind === 'text' || token.kind === 'raw') {
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.nodes.push(
          token.kind === 'raw' ? token.text : decodeXmlEntities(token.text),
        );
      }
      continue;
    }

    if (token.kind === 'close') {
      for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
        if (stack[depth].name === token.name) {
          stack.length = depth;
          break;
        }
      }
      continue;
    }

    const element: XmlElement = {
      name: localName(token.name),
      qualifiedName: token.name,
      attributes: token.attributes,
      nodes: [],
      children: [],
    };
    push(element);
    if (token.kind === 'open' && !voidElements.has(element.name)) {
      stack.push(element);
    }
  }

  return roots[0] ?? null;
}

/** Every descendant with this local name, in document order. */
export function findAll(root: XmlElement | null, name: string): XmlElement[] {
  if (!root) return [];
  const wanted = name.toLowerCase();
  const found: XmlElement[] = [];
  const visit = (element: XmlElement) => {
    if (element.name === wanted) found.push(element);
    for (const child of element.children) visit(child);
  };
  visit(root);
  return found;
}

/** The first descendant with this local name, or `null`. */
export function findFirst(root: XmlElement | null, name: string): XmlElement | null {
  return findAll(root, name)[0] ?? null;
}

/** All character data inside an element and its descendants, in document order. */
export function textOf(element: XmlElement | null): string {
  if (!element) return '';
  let out = '';
  for (const node of element.nodes) {
    out += typeof node === 'string' ? node : textOf(node);
  }
  return out.trim();
}

/** Elements that read as their own paragraph, separated by a blank line. */
const PARAGRAPH_ELEMENTS = new Set([
  'article', 'aside', 'blockquote', 'div', 'figure', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'p', 'pre', 'section', 'table',
]);

/** Elements that merely start a new line, such as a list item or table row. */
const LINE_ELEMENTS = new Set([
  'address', 'dd', 'dl', 'dt', 'figcaption', 'footer', 'header', 'hr',
  'li', 'main', 'nav', 'ol', 'td', 'th', 'tr', 'ul',
]);

/** Elements whose text is markup or styling, never prose the reader wants. */
const NON_PROSE_ELEMENTS = new Set(['script', 'style', 'head', 'title', 'meta', 'link']);

const PARAGRAPH_BREAK = '\n\n';
const LINE_BREAK = '\n';

/**
 * Flatten an XHTML chapter to readable plain text.
 *
 * Two rules, both of them what a reader expects rather than what the markup
 * literally says:
 *
 * - **Whitespace inside text collapses to single spaces**, newlines included.
 *   A line break in the source of an XHTML file is not a line break in the
 *   book; it is just how the file was wrapped.
 * - **Structure supplies the breaks.** Paragraphs and headings are separated by
 *   a blank line, list items and table rows by a single line, and `<br/>` by a
 *   single line. Where two breaks meet, the larger one wins rather than the two
 *   adding up - which is why these are emitted as markers and reduced at the
 *   end instead of being concatenated as they are produced.
 *
 * Scripts, styles and the document head are dropped rather than emitted as
 * text: a book's stylesheet is not part of the book.
 */
export function xhtmlToText(source: string): string {
  const root = parseXml(source);
  if (!root) return '';

  const parts: string[] = [];
  const emit = (value: string) => {
    if (value === PARAGRAPH_BREAK || value === LINE_BREAK) {
      const last = parts[parts.length - 1];
      if (last === PARAGRAPH_BREAK) return;
      if (last === LINE_BREAK) {
        if (value === PARAGRAPH_BREAK) parts[parts.length - 1] = PARAGRAPH_BREAK;
        return;
      }
      if (parts.length === 0) return;
      parts.push(value);
      return;
    }
    if (value.length > 0) parts.push(value);
  };

  const visit = (node: XmlNode) => {
    if (typeof node === 'string') {
      emit(node.replace(/\s+/g, ' '));
      return;
    }
    if (NON_PROSE_ELEMENTS.has(node.name)) return;
    if (node.name === 'br') {
      emit(LINE_BREAK);
      return;
    }
    const separator = PARAGRAPH_ELEMENTS.has(node.name)
      ? PARAGRAPH_BREAK
      : LINE_ELEMENTS.has(node.name)
        ? LINE_BREAK
        : null;
    if (separator) emit(separator);
    for (const child of node.nodes) visit(child);
    if (separator) emit(separator);
  };
  visit(root);

  return parts
    .join('')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}
