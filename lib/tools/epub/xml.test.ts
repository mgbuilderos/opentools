import { describe, expect, it } from 'vitest';

import {
  decodeXmlEntities,
  findAll,
  findFirst,
  NO_VOID_ELEMENTS,
  parseXml,
  textOf,
  xhtmlToText,
} from './xml';

describe('decodeXmlEntities', () => {
  it('decodes the five XML entities and the numeric forms', () => {
    expect(decodeXmlEntities('a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;')).toBe(
      'a & b <c> "d" \'e\'',
    );
    expect(decodeXmlEntities('&#65;&#x42;&#x1F600;')).toBe('AB\u{1F600}');
  });

  it('leaves an entity it does not know exactly as written', () => {
    // Guessing at `&copyright;` would silently change the book's text.
    expect(decodeXmlEntities('&copyright; &unknown;')).toBe('&copyright; &unknown;');
  });

  it('leaves a lone surrogate alone rather than throwing', () => {
    expect(decodeXmlEntities('&#xD800;')).toBe('&#xD800;');
  });
});

describe('parseXml', () => {
  it('reads elements, attributes and nesting', () => {
    const root = parseXml(
      `<package version="3.0"><metadata><dc:title>Book</dc:title></metadata></package>`,
    );
    expect(root?.name).toBe('package');
    expect(root?.attributes.version).toBe('3.0');
    // The `dc:` prefix is stripped so lookups do not have to know it.
    expect(textOf(findFirst(root, 'title'))).toBe('Book');
  });

  it('accepts single-quoted and unquoted attribute values', () => {
    const root = parseXml(`<item id='x' href=y.xhtml media-type="text/html"/>`);
    expect(root?.attributes).toMatchObject({
      id: 'x',
      href: 'y.xhtml',
      'media-type': 'text/html',
    });
  });

  it('does not mistake a > inside an attribute for the end of the tag', () => {
    const root = parseXml(`<a title="1 > 0">text</a>`);
    expect(root?.attributes.title).toBe('1 > 0');
    expect(textOf(root)).toBe('text');
  });

  it('ignores comments and processing instructions', () => {
    const root = parseXml(
      `<?xml version="1.0"?><!-- <fake/> --><root><p>kept</p></root>`,
    );
    expect(root?.name).toBe('root');
    expect(findAll(root, 'fake')).toHaveLength(0);
    expect(textOf(root)).toBe('kept');
  });

  it('takes CDATA verbatim, without decoding entities inside it', () => {
    const root = parseXml(`<p><![CDATA[a &amp; <b> c]]></p>`);
    expect(textOf(root)).toBe('a &amp; <b> c');
  });

  it('skips a doctype and never expands its entities', () => {
    // This is the shape of a "billion laughs" denial-of-service payload. The
    // reader must not expand `&lol;` - an EPUB is an untrusted file.
    const root = parseXml(
      `<!DOCTYPE root [<!ENTITY lol "haha">]><root>&lol;</root>`,
    );
    expect(root?.name).toBe('root');
    expect(textOf(root)).toBe('&lol;');
  });

  it('treats void elements as self-closing so they do not swallow siblings', () => {
    const root = parseXml(`<div><br><p>after</p></div>`);
    expect(findFirst(root, 'p')).not.toBeNull();
    expect(textOf(findFirst(root, 'p'))).toBe('after');
  });

  it('recovers from a stray closing tag instead of losing the document', () => {
    const root = parseXml(`<div><p>one</i></p><p>two</p></div>`);
    expect(findAll(root, 'p')).toHaveLength(2);
  });

  it('returns null when there is no element at all', () => {
    expect(parseXml('   ')).toBeNull();
  });

  it('treats <meta> as void for XHTML but as a container for strict XML', () => {
    // This is not a preference. In an XHTML chapter `<meta charset="utf-8">`
    // has no closing tag, so treating it as a container swallows the chapter.
    // In an EPUB 3 package document `<meta property="...">value</meta>` carries
    // its value as text, so treating it as void loses the value. Both shapes
    // are real, so the caller says which document it is reading.
    const source = `<metadata><meta property="dcterms:modified">2026-01-02</meta></metadata>`;

    const asXhtml = parseXml(source);
    expect(textOf(findFirst(asXhtml, 'meta'))).toBe('');

    const asXml = parseXml(source, { voidElements: NO_VOID_ELEMENTS });
    expect(textOf(findFirst(asXml, 'meta'))).toBe('2026-01-02');
  });

  it('keeps the rest of an XHTML body when <meta> is left unclosed', () => {
    const root = parseXml(`<html><head><meta charset="utf-8"></head><body><p>kept</p></body></html>`);
    expect(xhtmlToText(`<html><head><meta charset="utf-8"></head><body><p>kept</p></body></html>`)).toBe('kept');
    expect(findAll(root, 'p')).toHaveLength(1);
  });
});

describe('xhtmlToText', () => {
  it('keeps paragraph breaks and drops the markup', () => {
    const text = xhtmlToText(
      `<html><body><h1>Title</h1><p>One.</p><p>Two.<br/>Still two.</p></body></html>`,
    );
    expect(text).toBe('Title\n\nOne.\n\nTwo.\nStill two.');
  });

  it('drops scripts, styles and the document head', () => {
    const text = xhtmlToText(
      `<html><head><title>meta</title><style>p{color:red}</style></head>` +
        `<body><script>alert(1)</script><p>Only this.</p></body></html>`,
    );
    expect(text).toBe('Only this.');
  });

  it('keeps list items on separate lines', () => {
    expect(xhtmlToText(`<body><ul><li>a</li><li>b</li></ul></body>`)).toBe('a\nb');
  });

  it('collapses runs of whitespace the way a reader sees them', () => {
    expect(xhtmlToText(`<p>a    b\n\n\tc</p>`)).toBe('a b c');
  });

  it('decodes entities in prose', () => {
    expect(xhtmlToText(`<p>Tom &amp; Jerry &#8212; friends</p>`)).toBe(
      'Tom & Jerry — friends',
    );
  });
});
