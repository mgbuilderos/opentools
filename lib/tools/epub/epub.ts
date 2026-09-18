/**
 * An EPUB reader, built on the ZIP reader in `lib/tools/archive/zip-reader.ts`.
 *
 * An EPUB is a ZIP with a fixed shape: `META-INF/container.xml` names a package
 * document (the `.opf`), and that package document carries the book's metadata,
 * the list of its files, and the order they are read in. Because the archive
 * layer already exists and already verifies every file against the checksum the
 * archive itself stores, the only new work here is reading that index.
 *
 * Why this is worth having, given every e-reader can open an EPUB:
 *
 * 1. **Turning a book into plain text normally means uploading the book.** The
 *    online EPUB converters all take the file to a server. This does not.
 * 2. **An EPUB carries identifying metadata most people never see.** Books
 *    bought from a store routinely embed a unique identifier, and some embed
 *    the purchaser. This names every identifier in the file instead of hiding
 *    them, which is the same promise the metadata scrubber makes for photos.
 * 3. **DRM is refused by name, never worked around.** A protected book is
 *    reported as protected. This tool does not remove DRM and does not pretend
 *    the text it could not read was empty.
 */

import { extractEntry, readZip } from '../archive/zip-reader';
import type { ZipArchive, ZipArchiveEntry } from '../archive/zip-reader';
import {
  findAll,
  findFirst,
  NO_VOID_ELEMENTS,
  parseXml,
  textOf,
  xhtmlToText,
} from './xml';

/** container.xml, the OPF and the NCX are strict XML: nothing is a void tag. */
const STRICT_XML = { voidElements: NO_VOID_ELEMENTS } as const;

const CONTAINER_PATH = 'META-INF/container.xml';
const ENCRYPTION_PATH = 'META-INF/encryption.xml';
const RIGHTS_PATH = 'META-INF/rights.xml';
const MIMETYPE_PATH = 'mimetype';
const EPUB_MIMETYPE = 'application/epub+zip';

/** One identifier declared by the book, with the scheme it claims. */
export interface EpubIdentifier {
  value: string;
  scheme: string | null;
  /** True when the package document points at this as the book's own id. */
  isPrimary: boolean;
}

export interface EpubMetadata {
  title: string | null;
  creators: string[];
  contributors: string[];
  language: string | null;
  publisher: string | null;
  date: string | null;
  description: string | null;
  rights: string | null;
  subjects: string[];
  identifiers: EpubIdentifier[];
  /** Everything else the package document declared, verbatim. */
  other: { name: string; value: string }[];
}

export interface EpubChapter {
  /** Position in the reading order, starting at 1. */
  order: number;
  /** The manifest id the spine referred to. */
  id: string;
  /** Path inside the archive, already resolved against the package document. */
  path: string;
  mediaType: string;
  /** Title from the table of contents, when the book provides one. */
  title: string | null;
  /** Compressed and uncompressed size of this chapter in the archive. */
  uncompressedSize: number;
}

export interface EpubBook {
  /** The version the package document declares, e.g. `3.0`. */
  version: string | null;
  packagePath: string;
  metadata: EpubMetadata;
  chapters: EpubChapter[];
  manifestCount: number;
  /** Files listed in the manifest that the reading order never uses. */
  unusedManifestCount: number;
  hasNavigationDocument: boolean;
  hasNcx: boolean;
  archive: ZipArchive;
  /** Things worth telling the reader that are not fatal. */
  warnings: string[];
}

/** Resolve an href from the package document against the package's own folder. */
function resolvePath(base: string, href: string): string {
  const cleaned = decodeHref(href.split('#')[0].trim());
  if (cleaned.length === 0) return '';
  if (cleaned.startsWith('/')) return cleaned.slice(1);

  const segments = base.split('/').slice(0, -1);
  for (const part of cleaned.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') segments.pop();
    else segments.push(part);
  }
  return segments.join('/');
}

/** Hrefs inside an EPUB are URL-encoded, so `My%20Book.xhtml` is one file. */
function decodeHref(href: string): string {
  try {
    return decodeURIComponent(href);
  } catch {
    // A stray `%` that is not an escape would throw; the raw name is better
    // than refusing the whole book.
    return href;
  }
}

function findEntry(archive: ZipArchive, path: string): ZipArchiveEntry | null {
  const wanted = path.toLowerCase();
  return (
    archive.entries.find((entry) => entry.path.toLowerCase() === wanted) ?? null
  );
}

async function readTextEntry(
  bytes: Uint8Array,
  archive: ZipArchive,
  path: string,
): Promise<string | null> {
  const entry = findEntry(archive, path);
  if (!entry || entry.isDirectory) return null;
  const raw = await extractEntry(bytes, entry);
  return new TextDecoder('utf-8').decode(raw);
}

function readMetadata(packageElement: ReturnType<typeof parseXml>): EpubMetadata {
  const metadataElement = findFirst(packageElement, 'metadata');
  const uniqueId = packageElement?.attributes['unique-identifier'] ?? null;

  const collect = (name: string): string[] =>
    findAll(metadataElement, name)
      .map((element) => textOf(element))
      .filter((value) => value.length > 0);

  const identifiers: EpubIdentifier[] = findAll(metadataElement, 'identifier').map(
    (element) => ({
      value: textOf(element),
      scheme: element.attributes.scheme ?? null,
      isPrimary: uniqueId !== null && element.attributes.id === uniqueId,
    }),
  );

  const other: { name: string; value: string }[] = [];
  for (const meta of findAll(metadataElement, 'meta')) {
    // EPUB 2 writes `<meta name="..." content="..."/>`; EPUB 3 writes
    // `<meta property="...">value</meta>`. Read both.
    const name = meta.attributes.name ?? meta.attributes.property ?? null;
    const value = meta.attributes.content ?? textOf(meta);
    if (name && value) other.push({ name, value });
  }

  const first = (name: string): string | null => collect(name)[0] ?? null;

  return {
    title: first('title'),
    creators: collect('creator'),
    contributors: collect('contributor'),
    language: first('language'),
    publisher: first('publisher'),
    date: first('date'),
    description: first('description'),
    rights: first('rights'),
    subjects: collect('subject'),
    identifiers: identifiers.filter((identifier) => identifier.value.length > 0),
    other,
  };
}

/** Read the EPUB 3 navigation document, so chapters can carry real titles. */
function readNavigationTitles(source: string, navPath: string): Map<string, string> {
  const titles = new Map<string, string>();
  const root = parseXml(source);
  for (const nav of findAll(root, 'nav')) {
    if ((nav.attributes.type ?? '').toLowerCase() !== 'toc') continue;
    for (const anchor of findAll(nav, 'a')) {
      const href = anchor.attributes.href;
      const label = textOf(anchor);
      if (href && label) titles.set(resolvePath(navPath, href), label);
    }
  }
  return titles;
}

/** Read an EPUB 2 NCX table of contents for the same purpose. */
function readNcxTitles(source: string, ncxPath: string): Map<string, string> {
  const titles = new Map<string, string>();
  const root = parseXml(source, STRICT_XML);
  for (const point of findAll(root, 'navpoint')) {
    const content = findFirst(point, 'content');
    const label = textOf(findFirst(point, 'navlabel'));
    const src = content?.attributes.src;
    if (src && label) titles.set(resolvePath(ncxPath, src), label);
  }
  return titles;
}

/**
 * Open an EPUB and read its index.
 *
 * Throws with a plain reason for anything this cannot open, rather than
 * returning a half-read book.
 */
export async function readEpub(bytes: Uint8Array): Promise<EpubBook> {
  const archive = readZip(bytes);
  const warnings: string[] = [];

  if (findEntry(archive, ENCRYPTION_PATH) || findEntry(archive, RIGHTS_PATH)) {
    throw new Error(
      'This book is DRM-protected: it carries an encryption record, so its chapters are scrambled. This page does not remove DRM and will not pretend an unreadable book was empty.',
    );
  }

  const mimetype = await readTextEntry(bytes, archive, MIMETYPE_PATH);
  if (mimetype === null) {
    warnings.push(
      'The archive has no `mimetype` file. EPUB requires one, so this book may not open in every reader.',
    );
  } else if (mimetype.trim() !== EPUB_MIMETYPE) {
    warnings.push(
      `The \`mimetype\` file says "${mimetype.trim().slice(0, 60)}" rather than "${EPUB_MIMETYPE}".`,
    );
  }

  const containerSource = await readTextEntry(bytes, archive, CONTAINER_PATH);
  if (containerSource === null) {
    throw new Error(
      'This ZIP has no `META-INF/container.xml`, so it is not an EPUB. A plain ZIP of HTML files is not an EPUB, and neither is a MOBI, AZW or PDF renamed to .epub.',
    );
  }

  const rootFile = findFirst(parseXml(containerSource, STRICT_XML), 'rootfile');
  const packagePath = rootFile?.attributes['full-path']
    ? decodeHref(rootFile.attributes['full-path'])
    : null;
  if (!packagePath) {
    throw new Error(
      'The book’s `META-INF/container.xml` does not name a package document, so there is no index to read.',
    );
  }

  const packageSource = await readTextEntry(bytes, archive, packagePath);
  if (packageSource === null) {
    throw new Error(
      `The book’s index points at "${packagePath}", but there is no such file inside the archive.`,
    );
  }

  const packageElement = parseXml(packageSource, STRICT_XML);
  const metadata = readMetadata(packageElement);

  const manifest = new Map<string, { path: string; mediaType: string; properties: string }>();
  for (const item of findAll(findFirst(packageElement, 'manifest'), 'item')) {
    const id = item.attributes.id;
    const href = item.attributes.href;
    if (!id || !href) continue;
    manifest.set(id, {
      path: resolvePath(packagePath, href),
      mediaType: item.attributes['media-type'] ?? '',
      properties: item.attributes.properties ?? '',
    });
  }

  // Titles come from the table of contents when there is one.
  let titles = new Map<string, string>();
  let hasNavigationDocument = false;
  let hasNcx = false;
  for (const [, item] of manifest) {
    if (item.properties.split(/\s+/).includes('nav')) {
      hasNavigationDocument = true;
      const source = await readTextEntry(bytes, archive, item.path);
      if (source) titles = readNavigationTitles(source, item.path);
    }
  }
  for (const [, item] of manifest) {
    if (item.mediaType === 'application/x-dtbncx+xml') {
      hasNcx = true;
      if (titles.size === 0) {
        const source = await readTextEntry(bytes, archive, item.path);
        if (source) titles = readNcxTitles(source, item.path);
      }
    }
  }

  const spine = findFirst(packageElement, 'spine');
  const chapters: EpubChapter[] = [];
  const used = new Set<string>();
  for (const itemRef of findAll(spine, 'itemref')) {
    const id = itemRef.attributes.idref;
    if (!id) continue;
    const item = manifest.get(id);
    if (!item) {
      warnings.push(
        `The reading order refers to "${id}", which the book’s own file list does not contain. That chapter is skipped.`,
      );
      continue;
    }
    const entry = findEntry(archive, item.path);
    if (!entry) {
      warnings.push(
        `The reading order includes "${item.path}", which is missing from the archive. That chapter is skipped.`,
      );
      continue;
    }
    used.add(id);
    chapters.push({
      order: chapters.length + 1,
      id,
      path: item.path,
      mediaType: item.mediaType,
      title: titles.get(item.path) ?? null,
      uncompressedSize: entry.uncompressedSize,
    });
  }

  if (chapters.length === 0) {
    throw new Error(
      'This book’s package document declares no reading order, so there are no chapters to open.',
    );
  }

  return {
    version: findFirst(packageElement, 'package')?.attributes.version
      ?? packageElement?.attributes.version
      ?? null,
    packagePath,
    metadata,
    chapters,
    manifestCount: manifest.size,
    unusedManifestCount: manifest.size - used.size,
    hasNavigationDocument,
    hasNcx,
    archive,
    warnings,
  };
}

/** Read one chapter and flatten it to plain text. */
export async function readChapterText(
  bytes: Uint8Array,
  book: EpubBook,
  chapter: EpubChapter,
): Promise<string> {
  const entry = findEntry(book.archive, chapter.path);
  if (!entry) {
    throw new Error(`"${chapter.path}" is no longer in the archive.`);
  }
  const raw = await extractEntry(bytes, entry);
  return xhtmlToText(new TextDecoder('utf-8').decode(raw));
}

export interface EpubTextChapter {
  order: number;
  title: string;
  path: string;
  text: string;
  words: number;
}

export interface EpubText {
  chapters: EpubTextChapter[];
  text: string;
  words: number;
  /** Chapters that could not be read, with the reason. Never silently dropped. */
  failures: { path: string; reason: string }[];
}

/** Count words the way a reader would: runs of non-space separated by spaces. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Read the whole book as plain text, in reading order.
 *
 * A chapter that cannot be read is recorded in `failures` and named in the
 * output. It is never skipped quietly - a book that silently loses a chapter
 * would be worse than one that says which chapter it lost.
 */
export async function readBookText(
  bytes: Uint8Array,
  book: EpubBook,
): Promise<EpubText> {
  const chapters: EpubTextChapter[] = [];
  const failures: { path: string; reason: string }[] = [];

  for (const chapter of book.chapters) {
    try {
      const text = await readChapterText(bytes, book, chapter);
      chapters.push({
        order: chapter.order,
        title: chapter.title ?? `Section ${chapter.order}`,
        path: chapter.path,
        text,
        words: countWords(text),
      });
    } catch (error) {
      failures.push({
        path: chapter.path,
        reason: error instanceof Error ? error.message : 'unreadable',
      });
    }
  }

  const text = chapters
    .map((chapter) => `${chapter.title}\n\n${chapter.text}`)
    .join('\n\n\n');

  return {
    chapters,
    text,
    words: chapters.reduce((total, chapter) => total + chapter.words, 0),
    failures,
  };
}
