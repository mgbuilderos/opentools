import type { Table } from './types';

/**
 * XML as a table notation: a root element whose children are rows, and whose
 * grandchildren are cells named after the column.
 *
 * One parser and one emitter, like every other format in this folder, so
 * `json-to-xml`, `xml-to-csv`, `xml-to-yaml` and the other eighteen pairs XML
 * takes part in are conversions nobody had to write.
 *
 * A column heading is not always a legal XML element name -- "Unit price (£)"
 * is a perfectly ordinary spreadsheet heading -- so a heading that cannot be
 * an element name is emitted as `<field name="Unit price (£)">` and read back
 * from that attribute. The heading therefore survives the round trip instead
 * of being mangled into `Unit_price____`.
 */

const XML_NAME = /^[A-Za-z_][\w.-]*$/u;

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;');
}

function decodeXml(value: string): string {
  return value.replace(
    /&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/giu,
    (entity, body: string) => {
      const named: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
      };
      const lower = body.toLowerCase();
      if (named[lower] !== undefined) return named[lower];
      const point = lower.startsWith('#x')
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isSafeInteger(point) &&
        point > 0 &&
        point <= 0x10ffff &&
        !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point)
        : entity;
    },
  );
}

export function emitXmlTable(table: Table): string {
  const declaration = '<?xml version="1.0" encoding="UTF-8"?>';
  const lines: string[] = [declaration, '<rows>'];
  for (const row of table.rows) {
    lines.push('  <row>');
    table.headers.forEach((header, index) => {
      const cell = escapeXml(row[index] ?? '');
      if (XML_NAME.test(header)) {
        lines.push(`    <${header}>${cell}</${header}>`);
      } else {
        lines.push(`    <field name="${escapeXml(header)}">${cell}</field>`);
      }
    });
    lines.push('  </row>');
  }
  lines.push('</rows>');
  return lines.join('\n');
}

interface Element {
  name: string;
  attributes: Record<string, string>;
  inner: string;
}

/** The direct child elements of a fragment, ignoring text and nesting below. */
function childElements(fragment: string): Element[] {
  const tag = /<(\/?)([A-Za-z_][\w.:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/gu;
  const children: Element[] = [];
  let depth = 0;
  let openedAt = 0;
  let open: { name: string; attributes: string } | undefined;
  let match: RegExpExecArray | null;

  while ((match = tag.exec(fragment)) !== null) {
    const [whole, closing, name, attributes, selfClosing] = match;
    if (selfClosing) {
      if (depth === 0) {
        children.push({
          name,
          attributes: parseAttributes(attributes),
          inner: '',
        });
      }
      continue;
    }
    if (closing) {
      depth -= 1;
      if (depth === 0 && open) {
        children.push({
          name: open.name,
          attributes: parseAttributes(open.attributes),
          inner: fragment.slice(openedAt, match.index),
        });
        open = undefined;
      }
      continue;
    }
    if (depth === 0) {
      open = { name, attributes };
      openedAt = match.index + whole.length;
    }
    depth += 1;
  }
  return children;
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(
    /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu,
  )) {
    attributes[match[1]] = decodeXml(match[2] ?? match[3] ?? '');
  }
  return attributes;
}

function textOf(fragment: string): string {
  return decodeXml(fragment.replace(/<[^>]*>/gu, '')).trim();
}

export function parseXmlTable(input: string): Table {
  const stripped = input
    .replace(/<\?[\s\S]*?\?>/gu, '')
    .replace(/<!--[\s\S]*?-->/gu, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, (_, body: string) =>
      escapeXml(body),
    )
    .replace(/<!DOCTYPE[^>]*>/giu, '')
    .trim();

  if (!stripped) throw new Error('XML input is empty.');

  const roots = childElements(stripped);
  const root = roots[0];
  if (!root) throw new Error('No XML element found.');

  // A single root wrapping the rows is the usual shape; a bare list of row
  // elements with no wrapper is accepted too, because that is what a fragment
  // copied out of a larger document looks like.
  const rowElements =
    roots.length > 1 && roots.every((element) => element.name === root.name)
      ? roots
      : childElements(root.inner);

  if (rowElements.length === 0) {
    throw new Error('XML has no row elements below its root element.');
  }

  const headers: string[] = [];
  const seen = new Set<string>();
  const records: Record<string, string>[] = [];

  for (const rowElement of rowElements) {
    const cells = childElements(rowElement.inner);
    const record: Record<string, string> = {};
    const add = (key: string, value: string) => {
      record[key] = value;
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    };
    if (cells.length > 0) {
      for (const cell of cells) {
        add(cell.attributes.name ?? cell.name, textOf(cell.inner));
      }
    } else {
      // `<row name="Ada" score="91"/>` -- attributes as columns.
      for (const [key, value] of Object.entries(rowElement.attributes)) {
        add(key, value);
      }
      if (Object.keys(rowElement.attributes).length === 0) {
        throw new Error(
          'XML rows must contain one element or attribute per column.',
        );
      }
    }
    records.push(record);
  }

  return {
    headers,
    rows: records.map((record) =>
      headers.map((header) => record[header] ?? ''),
    ),
  };
}
