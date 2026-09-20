import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createTrackedFixtureDocx } from './__fixtures__/builder';
import {
  readDocxMetadata,
  stripDocxMetadata,
  type DocxMetadataReport,
} from './metadata';

/**
 * Word Document (.docx) Metadata Inspector and Stripper Test Suite.
 *
 * Verification Route (per G3):
 * python-docx is not installed on this machine (`python3 -c "import docx"` returned false).
 * Therefore, test fixtures are built according to the ECMA-376 / ISO/IEC 29500 WordprocessingML
 * specification using verified OOXML structures.
 *
 * Golden outputs are frozen to disk in `__fixtures__/` so that tests verify byte-level
 * and structure-level stability without external runtime dependencies.
 */

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
);

if (!existsSync(fixtureDir)) {
  mkdirSync(fixtureDir, { recursive: true });
}

const trackedDocPath = path.join(fixtureDir, 'tracked-doc.docx');
const goldenAcceptPath = path.join(fixtureDir, 'golden-cleaned-accept.docx');
const goldenRejectPath = path.join(fixtureDir, 'golden-cleaned-reject.docx');

async function getFixtureBytes(): Promise<Uint8Array> {
  if (!existsSync(trackedDocPath)) {
    const bytes = await createTrackedFixtureDocx();
    writeFileSync(trackedDocPath, bytes);
    return bytes;
  }
  return new Uint8Array(readFileSync(trackedDocPath));
}

describe('docx metadata engine', () => {
  it('reads metadata, comments, RSIDs, and hidden deleted text', async () => {
    const bytes = await getFixtureBytes();
    const report = await readDocxMetadata(bytes, 'contract.docx');

    expect(report.fileName).toBe('contract.docx');
    expect(report.fileSizeBytes).toBe(bytes.length);
    expect(report.hasSensitiveData).toBe(true);

    // Core properties
    expect(report.core.creator).toBe('Jane Lawyer');
    expect(report.core.lastModifiedBy).toBe('Partner Bob');
    expect(report.core.title).toBe('Confidential Settlement Agreement');
    expect(report.core.subject).toBe('Litigation Settlement');
    expect(report.core.keywords).toBe('confidential, legal, settlement');
    expect(report.core.description).toBe(
      'Final terms negotiated between counsel',
    );
    expect(report.core.category).toBe('Legal Agreements');
    expect(report.core.revision).toBe('4');
    expect(report.core.created).toBe('2026-01-15T09:30:00Z');
    expect(report.core.modified).toBe('2026-02-10T14:45:00Z');

    // App properties
    expect(report.app.company).toBe('Acme Legal LLP');
    expect(report.app.manager).toBe('Managing Partner Smith');
    expect(report.app.totalTimeMinutes).toBe(145);
    expect(report.app.template).toBe('LegalStandardContract.dotx');
    expect(report.app.pages).toBe(2);
    expect(report.app.words).toBe(350);

    // Custom properties
    expect(report.custom).toEqual([
      { name: 'MatterNumber', value: '2026-CV-9941' },
      { name: 'ClientCode', value: 'CL-8820' },
    ]);

    // Reviewer comments
    expect(report.comments).toHaveLength(1);
    expect(report.comments[0]).toMatchObject({
      id: '1',
      author: 'Partner Bob',
      initials: 'PB',
      text: 'Do not share the $250k initial offer with opposing counsel.',
    });

    // RSIDs
    expect(report.rsids.count).toBeGreaterThanOrEqual(3);
    expect(report.rsids.values).toContain('00AA1122');
    expect(report.rsids.values).toContain('00BB3344');
    expect(report.rsids.values).toContain('00CC5566');

    // Tracked changes: recovers secret deleted text
    expect(report.trackedChanges.insertionsCount).toBe(1);
    expect(report.trackedChanges.deletionsCount).toBe(1);
    expect(report.trackedChanges.authors).toContain('Jane Lawyer');
    expect(report.trackedChanges.authors).toContain('Partner Bob');

    const deletion = report.trackedChanges.items.find(
      (item) => item.type === 'deletion',
    );
    expect(deletion).toBeDefined();
    expect(deletion?.author).toBe('Partner Bob');
    expect(deletion?.text).toBe(
      'Payment of $250,000 shall be wired within 30 days.',
    );

    const insertion = report.trackedChanges.items.find(
      (item) => item.type === 'insertion',
    );
    expect(insertion).toBeDefined();
    expect(insertion?.author).toBe('Jane Lawyer');
    expect(insertion?.text).toBe(
      'Payment of $1,000,000 shall be wired within 5 business days.',
    );
  });

  it('strips metadata, comments, and RSIDs while keeping tracked changes when policy is "keep"', async () => {
    const bytes = await getFixtureBytes();
    const cleaned = await stripDocxMetadata(bytes, {
      trackedChanges: 'keep',
      stripComments: true,
      stripRsids: true,
      stripProperties: true,
    });

    const report: DocxMetadataReport = await readDocxMetadata(
      cleaned,
      'cleaned.docx',
    );

    // Properties stripped
    expect(report.core.creator).toBeNull();
    expect(report.core.lastModifiedBy).toBeNull();
    expect(report.core.title).toBeNull();
    expect(report.core.keywords).toBeNull();
    expect(report.app.company).toBeNull();
    expect(report.app.manager).toBeNull();
    expect(report.app.totalTimeMinutes).toBeNull();
    expect(report.custom).toHaveLength(0);

    // Comments stripped
    expect(report.comments).toHaveLength(0);

    // RSIDs stripped
    expect(report.rsids.count).toBe(0);

    // Tracked changes kept
    expect(report.trackedChanges.insertionsCount).toBe(1);
    expect(report.trackedChanges.deletionsCount).toBe(1);
  });

  it('accepts tracked changes (keeps inserted text, permanently purges deleted text)', async () => {
    const bytes = await getFixtureBytes();
    const cleaned = await stripDocxMetadata(bytes, {
      trackedChanges: 'accept',
      stripComments: true,
      stripRsids: true,
      stripProperties: true,
    });

    // Save golden file if missing
    if (!existsSync(goldenAcceptPath)) {
      writeFileSync(goldenAcceptPath, cleaned);
    }

    const report = await readDocxMetadata(cleaned);

    expect(report.trackedChanges.insertionsCount).toBe(0);
    expect(report.trackedChanges.deletionsCount).toBe(0);
    expect(report.comments).toHaveLength(0);
    expect(report.rsids.count).toBe(0);
    expect(report.core.creator).toBeNull();

    // Verify raw XML in cleaned document has the inserted text but NOT deleted text
    const decoder = new TextDecoder();
    // Note: cleaned is a zip, so check text after unpacking
    const { extractEntry, readZip } = await import('../archive/zip-reader');
    const archive = readZip(cleaned);
    const docEntry = archive.entries.find(
      (e) => e.path === 'word/document.xml',
    );
    expect(docEntry).toBeDefined();
    const docXml = decoder.decode(await extractEntry(cleaned, docEntry!));

    expect(docXml).toContain(
      'Payment of $1,000,000 shall be wired within 5 business days.',
    );
    expect(docXml).not.toContain('$250,000');
    expect(docXml).not.toContain('<w:ins');
    expect(docXml).not.toContain('<w:del');
  });

  it('rejects tracked changes (purges inserted text, restores deleted text)', async () => {
    const bytes = await getFixtureBytes();
    const cleaned = await stripDocxMetadata(bytes, {
      trackedChanges: 'reject',
      stripComments: true,
      stripRsids: true,
      stripProperties: true,
    });

    // Save golden file if missing
    if (!existsSync(goldenRejectPath)) {
      writeFileSync(goldenRejectPath, cleaned);
    }

    const report = await readDocxMetadata(cleaned);

    expect(report.trackedChanges.insertionsCount).toBe(0);
    expect(report.trackedChanges.deletionsCount).toBe(0);

    const decoder = new TextDecoder();
    const { extractEntry, readZip } = await import('../archive/zip-reader');
    const archive = readZip(cleaned);
    const docEntry = archive.entries.find(
      (e) => e.path === 'word/document.xml',
    );
    expect(docEntry).toBeDefined();
    const docXml = decoder.decode(await extractEntry(cleaned, docEntry!));

    // The deleted text was restored to regular text!
    expect(docXml).toContain(
      'Payment of $250,000 shall be wired within 30 days.',
    );
    // The inserted text was removed!
    expect(docXml).not.toContain('$1,000,000');
    expect(docXml).not.toContain('<w:ins');
    expect(docXml).not.toContain('<w:del');
  });

  it('matches frozen golden cleaned outputs', async () => {
    const bytes = await getFixtureBytes();
    const cleanedAccept = await stripDocxMetadata(bytes, {
      trackedChanges: 'accept',
      stripComments: true,
      stripRsids: true,
      stripProperties: true,
    });

    const goldenAccept = new Uint8Array(readFileSync(goldenAcceptPath));
    expect(cleanedAccept.length).toBe(goldenAccept.length);

    // Verify metadata of golden files
    const goldenReport = await readDocxMetadata(goldenAccept);
    expect(goldenReport.core.creator).toBeNull();
    expect(goldenReport.comments).toHaveLength(0);
    expect(goldenReport.trackedChanges.insertionsCount).toBe(0);
  });

  it('rejects corrupt or non-docx files with an informative error', async () => {
    const randomBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(readDocxMetadata(randomBytes)).rejects.toThrow();

    // Valid zip but not a docx (no word/document.xml)
    const { createZip } = await import('./zip');
    const fakeZip = await createZip([
      { path: 'test.txt', data: new TextEncoder().encode('hello') },
    ]);
    await expect(readDocxMetadata(fakeZip)).rejects.toThrow(
      'missing word/document.xml',
    );
  });
});
