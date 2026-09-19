/**
 * Just enough XML to read the inside of a spreadsheet.
 *
 * **Why not `DOMParser`.** It exists in a browser but not in Node, so anything
 * built on it can only be tested in a browser — and the whole reason the engines
 * in this project are pure is that a few hundred unit tests are worth more than
 * a handful of browser ones. Nor is a dependency warranted: the XML inside an
 * `.xlsx` is machine-written, flat, and uses a handful of tags.
 *
 * **Why not a regular expression.** Attribute order is not guaranteed, tags may
 * or may not be self-closing, and `<t xml:space="preserve"> </t>` must keep its
 * space. A scanner handles all three and is barely longer.
 *
 * This is deliberately not a general XML parser. It does not resolve namespaces,
 * validate anything, or handle documents that nest an element inside another of
 * the same name — none of which appears in the parts of a spreadsheet we read.
 */

/** The five entities XML predefines, plus numeric character references. */
export function decodeEntities(text: string): string {
  if (!text.includes('&')) return text;
  return text.replace(
    /&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/gu,
    (whole, code: string) => {
      switch (code) {
        case 'amp':
          return '&';
        case 'lt':
          return '<';
        case 'gt':
          return '>';
        case 'quot':
          return '"';
        case 'apos':
          return "'";
        default: {
          const value =
            code[1] === 'x' || code[1] === 'X'
              ? Number.parseInt(code.slice(2), 16)
              : Number.parseInt(code.slice(1), 10);
          // An unpaired surrogate or an out-of-range value is left as written
          // rather than turned into a replacement character.
          return Number.isFinite(value) && value >= 0 && value <= 0x10ffff
            ? String.fromCodePoint(value)
            : whole;
        }
      }
    },
  );
}

/** Reads the attributes out of a tag's source text. */
export function attributes(tagBody: string): Record<string, string> {
  const found: Record<string, string> = {};
  // name="value" or name='value'. Values may contain the other quote character.
  const pattern = /([A-Za-z_:][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/gu;
  let match = pattern.exec(tagBody);
  while (match) {
    found[match[1]] = decodeEntities(match[3] ?? match[4] ?? '');
    match = pattern.exec(tagBody);
  }
  return found;
}

export interface Element {
  attrs: Record<string, string>;
  /** The raw markup between the open and close tags. Empty when self-closing. */
  inner: string;
}

/**
 * Walks every `<name …>` element at any depth, in document order.
 *
 * Self-closing tags yield an empty `inner`. Elements that nest another of the
 * same name are not supported and do not occur in the files this reads.
 */
export function eachElement(
  xml: string,
  name: string,
  visit: (element: Element) => void,
): void {
  const open = new RegExp(`<${name}(\\s[^>]*?)?(/)?>`, 'gu');
  let match = open.exec(xml);
  while (match) {
    const attrs = attributes(match[1] ?? '');
    if (match[2] === '/') {
      visit({ attrs, inner: '' });
      open.lastIndex = match.index + match[0].length;
    } else {
      const bodyStart = match.index + match[0].length;
      const close = xml.indexOf(`</${name}>`, bodyStart);
      if (close === -1) {
        // Truncated document: yield what is there rather than losing the row.
        visit({ attrs, inner: xml.slice(bodyStart) });
        return;
      }
      visit({ attrs, inner: xml.slice(bodyStart, close) });
      open.lastIndex = close + name.length + 3;
    }
    match = open.exec(xml);
  }
}

/** The text of the first `<name>` inside `xml`, entities decoded. */
export function firstText(xml: string, name: string): string | null {
  let found: string | null = null;
  eachElement(xml, name, (element) => {
    if (found === null) found = decodeEntities(element.inner);
  });
  return found;
}

/**
 * Every `<t>` inside a shared string, joined.
 *
 * A styled cell is stored as runs — `<si><r><t>Hello </t></r><r><t>world</t></r></si>`
 * — so taking only the first `<t>` silently truncates any cell somebody made
 * partly bold. Joining every one recovers the whole string and loses only the
 * styling, which a spreadsheet's *text* does not depend on.
 */
export function joinedText(xml: string): string {
  let text = '';
  eachElement(xml, 't', (element) => {
    text += decodeEntities(element.inner);
  });
  return text;
}

/** `A1` → `{ column: 0, row: 0 }`. Returns `null` for anything else. */
export function parseCellReference(
  reference: string,
): { column: number; row: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/u.exec(reference);
  if (!match) return null;
  const letters = match[1].toUpperCase();
  let column = 0;
  for (let index = 0; index < letters.length; index += 1) {
    // Spreadsheet columns are base-26 with no zero: A is 1, Z is 26, AA is 27.
    column = column * 26 + (letters.charCodeAt(index) - 64);
  }
  return { column: column - 1, row: Number.parseInt(match[2], 10) - 1 };
}

/** `0` → `A`, `26` → `AA`. The inverse of `parseCellReference`'s column half. */
export function columnName(index: number): string {
  let remaining = index + 1;
  let name = '';
  while (remaining > 0) {
    const digit = (remaining - 1) % 26;
    name = String.fromCharCode(65 + digit) + name;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return name;
}

/** Escapes text for use inside an XML element or attribute. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&apos;');
}
