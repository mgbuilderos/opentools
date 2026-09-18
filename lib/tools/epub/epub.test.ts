import { describe, expect, it } from 'vitest';

import { createZip } from '../docx/zip';
import type { ZipEntry } from '../docx/zip';
import { countWords, readBookText, readEpub } from './epub';

const encoder = new TextEncoder();
const file = (path: string, text: string): ZipEntry => ({
  path,
  data: encoder.encode(text),
});

const CONTAINER = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

const PACKAGE = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>The Test Book</dc:title>
    <dc:creator>A. Writer</dc:creator>
    <dc:creator>B. Coauthor</dc:creator>
    <dc:language>en</dc:language>
    <dc:publisher>Nobody Press</dc:publisher>
    <dc:date>2026-01-01</dc:date>
    <dc:identifier id="pub-id">urn:uuid:1234-5678</dc:identifier>
    <dc:identifier scheme="ISBN">978-0-00-000000-0</dc:identifier>
    <dc:subject>Testing</dc:subject>
    <meta name="calibre:series" content="Examples"/>
    <meta property="dcterms:modified">2026-01-02T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="c1" href="text/chapter%201.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="../styles/book.css" media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`;

const NAV = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <body>
    <nav epub:type="toc">
      <ol>
        <li><a href="text/chapter%201.xhtml">Opening</a></li>
        <li><a href="text/chapter2.xhtml">Closing</a></li>
      </ol>
    </nav>
  </body>
</html>`;

const CHAPTER_ONE = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>ignored</title></head>
<body><h1>Opening</h1><p>Four words go here.</p></body></html>`;

const CHAPTER_TWO = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body><p>Three more words.</p></body></html>`;

function epubEntries(): ZipEntry[] {
  return [
    file('mimetype', 'application/epub+zip'),
    file('META-INF/container.xml', CONTAINER),
    file('OEBPS/content.opf', PACKAGE),
    file('OEBPS/nav.xhtml', NAV),
    file('OEBPS/text/chapter 1.xhtml', CHAPTER_ONE),
    file('OEBPS/text/chapter2.xhtml', CHAPTER_TWO),
    file('styles/book.css', 'p { margin: 0 }'),
  ];
}

const buildEpub = (entries = epubEntries()) => createZip(entries);

describe('readEpub', () => {
  it('reads the book’s metadata, and flags the identifier the book calls its own', async () => {
    const book = await readEpub(await buildEpub());

    expect(book.version).toBe('3.0');
    expect(book.packagePath).toBe('OEBPS/content.opf');
    expect(book.metadata.title).toBe('The Test Book');
    expect(book.metadata.creators).toEqual(['A. Writer', 'B. Coauthor']);
    expect(book.metadata.language).toBe('en');
    expect(book.metadata.publisher).toBe('Nobody Press');
    expect(book.metadata.subjects).toEqual(['Testing']);

    // Both identifiers are surfaced, and only one is the book's own id. This is
    // the privacy point of the tool: store-bought books embed identifiers.
    expect(book.metadata.identifiers).toEqual([
      { value: 'urn:uuid:1234-5678', scheme: null, isPrimary: true },
      { value: '978-0-00-000000-0', scheme: 'ISBN', isPrimary: false },
    ]);
  });

  it('reads EPUB 2 and EPUB 3 style meta elements alike', async () => {
    const book = await readEpub(await buildEpub());
    expect(book.metadata.other).toEqual(
      expect.arrayContaining([
        { name: 'calibre:series', value: 'Examples' },
        { name: 'dcterms:modified', value: '2026-01-02T00:00:00Z' },
      ]),
    );
  });

  it('lists chapters in reading order, with titles from the table of contents', async () => {
    const book = await readEpub(await buildEpub());
    expect(book.chapters.map((chapter) => [chapter.order, chapter.title])).toEqual([
      [1, 'Opening'],
      [2, 'Closing'],
    ]);
  });

  it('resolves hrefs against the package document’s own folder, and decodes %20', async () => {
    const book = await readEpub(await buildEpub());
    expect(book.chapters.map((chapter) => chapter.path)).toEqual([
      'OEBPS/text/chapter 1.xhtml',
      'OEBPS/text/chapter2.xhtml',
    ]);
  });

  it('counts manifest files the reading order never uses', async () => {
    const book = await readEpub(await buildEpub());
    // nav.xhtml and book.css are in the manifest but not in the spine.
    expect(book.manifestCount).toBe(4);
    expect(book.unusedManifestCount).toBe(2);
    expect(book.hasNavigationDocument).toBe(true);
  });

  it('refuses a DRM-protected book by name instead of returning empty chapters', async () => {
    const entries = epubEntries();
    entries.push(file('META-INF/encryption.xml', '<encryption/>'));
    await expect(readEpub(await buildEpub(entries))).rejects.toThrow(/DRM-protected/);
  });

  it('refuses a plain ZIP that is not an EPUB', async () => {
    const zip = await createZip([file('readme.txt', 'hello')]);
    await expect(readEpub(zip)).rejects.toThrow(/not an EPUB/);
  });

  it('refuses when the package document named by the index is missing', async () => {
    const entries = epubEntries().filter((entry) => entry.path !== 'OEBPS/content.opf');
    await expect(readEpub(await buildEpub(entries))).rejects.toThrow(
      /there is no such file inside the archive/,
    );
  });

  it('refuses a book whose package document declares no reading order', async () => {
    const entries = epubEntries().map((entry) =>
      entry.path === 'OEBPS/content.opf'
        ? file('OEBPS/content.opf', PACKAGE.replace(/<spine>[\s\S]*<\/spine>/, '<spine/>'))
        : entry,
    );
    await expect(readEpub(await buildEpub(entries))).rejects.toThrow(
      /declares no reading order/,
    );
  });

  it('warns, but still opens, when the mimetype file is missing', async () => {
    const entries = epubEntries().filter((entry) => entry.path !== 'mimetype');
    const book = await readEpub(await buildEpub(entries));
    expect(book.chapters).toHaveLength(2);
    expect(book.warnings.join(' ')).toMatch(/no `mimetype` file/);
  });

  it('names a chapter the reading order points at but the archive does not contain', async () => {
    const entries = epubEntries().filter(
      (entry) => entry.path !== 'OEBPS/text/chapter2.xhtml',
    );
    const book = await readEpub(await buildEpub(entries));
    expect(book.chapters).toHaveLength(1);
    expect(book.warnings.join(' ')).toMatch(/missing from the archive/);
  });

  it('falls back to an EPUB 2 NCX for chapter titles when there is no nav document', async () => {
    const ncx = `<?xml version="1.0"?>
      <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/">
        <navMap>
          <navPoint><navLabel><text>From the NCX</text></navLabel>
            <content src="text/chapter2.xhtml"/></navPoint>
        </navMap>
      </ncx>`;
    const packageWithNcx = PACKAGE.replace(
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
      '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    );
    const entries = epubEntries()
      .filter((entry) => entry.path !== 'OEBPS/nav.xhtml')
      .map((entry) =>
        entry.path === 'OEBPS/content.opf'
          ? file('OEBPS/content.opf', packageWithNcx)
          : entry,
      );
    entries.push(file('OEBPS/toc.ncx', ncx));

    const book = await readEpub(await buildEpub(entries));
    expect(book.hasNcx).toBe(true);
    expect(book.hasNavigationDocument).toBe(false);
    expect(book.chapters[1].title).toBe('From the NCX');
  });
});

describe('readBookText', () => {
  it('returns the book in reading order, as plain text with word counts', async () => {
    const bytes = await buildEpub();
    const book = await readEpub(bytes);
    const text = await readBookText(bytes, book);

    expect(text.chapters.map((chapter) => chapter.text)).toEqual([
      'Opening\n\nFour words go here.',
      'Three more words.',
    ]);
    expect(text.chapters.map((chapter) => chapter.words)).toEqual([5, 3]);
    expect(text.words).toBe(8);
    expect(text.failures).toEqual([]);
    // The heading is kept, the <title> in <head> is not.
    expect(text.text).not.toMatch(/ignored/);
  });

  it('uses the table-of-contents title as the section heading', async () => {
    const bytes = await buildEpub();
    const book = await readEpub(bytes);
    const text = await readBookText(bytes, book);
    expect(text.text.startsWith('Opening\n\n')).toBe(true);
    expect(text.text).toMatch(/Closing/);
  });
});

describe('countWords', () => {
  it('counts runs of non-space, and nothing for empty text', () => {
    expect(countWords('  one   two\nthree  ')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });
});
