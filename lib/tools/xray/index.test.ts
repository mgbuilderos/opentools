import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFHexString, PDFName } from 'pdf-lib';

import { createTrackedFixtureDocx } from '../docx/__fixtures__/builder';
import { createZip } from '../docx/zip';
import {
  CATEGORY_ORDER,
  canStripFormat,
  cleanFileName,
  rankFindings,
  stripFile,
  xrayFile,
  type XrayFinding,
} from './index';

const toolsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function fixture(relative: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(toolsDir, relative)));
}

const encoder = new TextEncoder();
const asText = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

/** A PDF carrying identity in all four of the places a PDF keeps it. */
const XMP = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/">
   <dc:creator><rdf:Seq><rdf:li>Jane Partner</rdf:li></rdf:Seq></dc:creator>
   <xmp:CreatorTool>AcmeWriter 9</xmp:CreatorTool>
   <xmpMM:DocumentID>uuid:9f2b-lineage</xmpMM:DocumentID>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

async function revealingPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.addPage();
  doc.setTitle('Confidential Merger Memo');
  doc.setAuthor('Jane Partner');
  doc.setCreator('AcmeWriter 9');
  doc.setCreationDate(new Date('2021-03-04T05:06:07Z'));
  const stream = doc.context.stream(XMP, { Type: 'Metadata', Subtype: 'XML' });
  doc.catalog.set(PDFName.of('Metadata'), doc.context.register(stream));
  doc.context.trailerInfo.ID = doc.context.obj([
    PDFHexString.of('0123456789abcdef0123456789abcdef'),
    PDFHexString.of('fedcba9876543210fedcba9876543210'),
  ]);
  return doc.save();
}

const CORE_PROPS_NS =
  'http://schemas.openxmlformats.org/package/2006/metadata/core-properties';
const APP_PROPS_NS =
  'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties';

/** A shared workbook: named author, employer, and a revision log. */
async function revealingXlsx(): Promise<Uint8Array> {
  const core =
    `<cp:coreProperties xmlns:cp="${CORE_PROPS_NS}" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    '<dc:creator>Priya Analyst</dc:creator>' +
    '<cp:lastModifiedBy>Regional Director</cp:lastModifiedBy>' +
    '<cp:revision>17</cp:revision>' +
    '</cp:coreProperties>';
  const app =
    `<Properties xmlns="${APP_PROPS_NS}">` +
    '<Company>Northwind Trading</Company>' +
    '<TotalTime>612</TotalTime>' +
    '<Application>Microsoft Excel</Application>' +
    '</Properties>';
  return createZip([
    { path: 'xl/workbook.xml', data: encoder.encode('<workbook/>') },
    { path: 'docProps/core.xml', data: encoder.encode(core) },
    { path: 'docProps/app.xml', data: encoder.encode(app) },
    {
      path: 'xl/revisions/revisionLog1.xml',
      data: encoder.encode('<revisions/>'),
    },
    { path: 'xl/persons/person.xml', data: encoder.encode('<persons/>') },
  ]);
}

describe('xrayFile on a photo with GPS', () => {
  it('leads with the location, because that is what a reader needs first', async () => {
    const report = await xrayFile(
      fixture('metadata/__fixtures__/gps-camera-photo.jpg'),
      'holiday.jpg',
    );

    expect(report.format).toBe('jpeg');
    expect(report.formatLabel).toBe('JPEG photo');
    expect(report.fileName).toBe('holiday.jpg');
    expect(report.hasSensitiveFindings).toBe(true);
    expect(report.canStrip).toBe(true);

    // The first row of the report is the coordinates. Not "a location finding
    // exists somewhere in the list" — the first row.
    expect(report.findings[0]?.id).toBe('image-gps');
    expect(report.findings[0]?.category).toBe('location');
    expect(report.findings[0]?.severity).toBe('high');
  });

  it('offers a map link the reader may open, and resolves no address itself', async () => {
    const report = await xrayFile(
      fixture('metadata/__fixtures__/gps-camera-photo.jpg'),
    );
    const gps = report.findings.find((finding) => finding.id === 'image-gps');

    expect(gps?.mapUrl).toBeTruthy();
    expect(gps?.mapUrl).toContain('openstreetmap.org');
    // The value is coordinates, in degrees, as read from the file. The tool
    // cannot turn them into a street and must not read as though it had.
    expect(gps?.value).toMatch(/[NS].*[EW]/u);
    expect(gps?.consequence).not.toMatch(/\baddress\b|\bstreet\b/iu);
  });

  it('ranks a camera serial number as high and an exposure setting as low', async () => {
    const report = await xrayFile(
      fixture('metadata/__fixtures__/gps-camera-photo.jpg'),
    );
    const byId = new Map(report.findings.map((f) => [f.id, f]));

    const serial = byId.get('image-serial');
    if (serial) {
      expect(serial.severity).toBe('high');
      expect(serial.category).toBe('device');
    }
    for (const id of ['image-exposure', 'image-aperture', 'image-iso']) {
      const finding = byId.get(id);
      if (finding) {
        expect(finding.category).toBe('technical');
        expect(finding.severity).toBe('low');
      }
    }
  });

  it('gives every finding a consequence a person can act on', async () => {
    const report = await xrayFile(
      fixture('metadata/__fixtures__/gps-camera-photo.jpg'),
    );
    expect(report.findings.length).toBeGreaterThan(0);
    for (const finding of report.findings) {
      // The field is required by the type; this checks it was actually written
      // rather than filled with a placeholder.
      expect(finding.consequence.length, finding.id).toBeGreaterThan(20);
      expect(finding.value.length, finding.id).toBeGreaterThan(0);
      expect(finding.source.length, finding.id).toBeGreaterThan(0);
    }
  });

  it('says a clean photo is clean rather than inventing findings', async () => {
    const report = await xrayFile(
      fixture('metadata/__fixtures__/no-metadata.jpg'),
    );
    expect(report.format).toBe('jpeg');
    expect(report.hasSensitiveFindings).toBe(false);
    // Nothing to remove means no strip button; see `canStrip` in index.ts.
    expect(report.canStrip).toBe(false);
  });
});

describe('xrayFile on a PDF', () => {
  it('finds the author in the Info dictionary and again in the XMP packet', async () => {
    const report = await xrayFile(await revealingPdf(), 'memo.pdf');

    expect(report.format).toBe('pdf');
    const labels = report.findings.map((finding) => finding.label);
    expect(labels).toContain('Author');
    expect(labels).toContain('Author (XMP)');

    // Both copies are identity and both are high: someone who clears the
    // document properties in an editor still ships the XMP one.
    for (const label of ['Author', 'Author (XMP)']) {
      const finding = report.findings.find((f) => f.label === label);
      expect(finding?.category, label).toBe('identity');
      expect(finding?.severity, label).toBe('high');
    }
  });

  it('calls the lineage id out as high, since it links drafts together', async () => {
    const report = await xrayFile(await revealingPdf());
    const lineage = report.findings.find(
      (finding) => finding.label === 'Document lineage id',
    );
    expect(lineage?.severity).toBe('high');
    expect(lineage?.value).toBe('uuid:9f2b-lineage');
  });

  it('puts identity above dates in the report', async () => {
    const report = await xrayFile(await revealingPdf());
    const positionOf = (label: string) =>
      report.findings.findIndex((finding) => finding.label === label);
    expect(positionOf('Author')).toBeLessThan(positionOf('Created'));
  });
});

describe('xrayFile on a Word document', () => {
  it('surfaces text that was deleted but never removed', async () => {
    const report = await xrayFile(
      await createTrackedFixtureDocx(),
      'deal.docx',
    );

    expect(report.format).toBe('docx');
    const deleted = report.findings.find(
      (finding) => finding.id === 'docx-deleted-text',
    );

    // The fixture's unaccepted deletion. This is the single most surprising
    // thing the tool can show, so the test names the string.
    expect(deleted).toBeDefined();
    expect(deleted?.value).toContain(
      'Payment of $250,000 shall be wired within 30 days.',
    );
    expect(deleted?.category).toBe('hidden-content');
    expect(deleted?.severity).toBe('high');
  });

  it('names the author, the person who last saved it, and the employer', async () => {
    const report = await xrayFile(await createTrackedFixtureDocx());
    const value = (id: string) =>
      report.findings.find((finding) => finding.id === id)?.value;

    expect(value('ooxml-creator')).toBe('Jane Lawyer');
    expect(value('ooxml-last-modified-by')).toBe('Partner Bob');
    expect(value('ooxml-company')).toBe('Acme Legal LLP');
  });

  it('shows the reviewer comment, the RSIDs and the client code', async () => {
    const report = await xrayFile(await createTrackedFixtureDocx());
    const byId = new Map(report.findings.map((f) => [f.id, f]));

    expect(byId.get('docx-comments')?.value).toContain(
      'Do not share the $250k initial offer',
    );
    expect(byId.get('docx-rsids')?.severity).toBe('high');
    expect(byId.get('ooxml-custom-clientcode')?.value).toBe('CL-8820');
  });

  it('reports the editing time, which contradicts more claims than people expect', async () => {
    const report = await xrayFile(await createTrackedFixtureDocx());
    const editing = report.findings.find(
      (finding) => finding.id === 'ooxml-editing-time',
    );
    expect(editing?.value).toBe('145 minutes');
    expect(editing?.category).toBe('timeline');
  });
});

describe('xrayFile on a spreadsheet', () => {
  it('reads the same document properties out of an xlsx as out of a docx', async () => {
    // The point of sharing one OOXML reader: a spreadsheet gives up its author
    // and its employer exactly as a Word file does.
    const report = await xrayFile(await revealingXlsx(), 'forecast.xlsx');

    expect(report.format).toBe('xlsx');
    const byId = new Map(report.findings.map((f) => [f.id, f]));
    expect(byId.get('ooxml-creator')?.value).toBe('Priya Analyst');
    expect(byId.get('ooxml-last-modified-by')?.value).toBe('Regional Director');
    expect(byId.get('ooxml-company')?.value).toBe('Northwind Trading');
    expect(byId.get('ooxml-revision')?.value).toBe('17');
  });

  it('flags a shared workbook revision log as hidden content', async () => {
    const report = await xrayFile(await revealingXlsx());
    const log = report.findings.find(
      (finding) => finding.id === 'xlsx-revision-log',
    );
    expect(log?.category).toBe('hidden-content');
    expect(log?.severity).toBe('high');
    expect(
      report.findings.find((finding) => finding.id === 'xlsx-persons')
        ?.severity,
    ).toBe('high');
  });

  it('says plainly that it cannot clean a spreadsheet yet', async () => {
    // There is no OOXML writer for xlsx in this repo. A button that returned
    // the file unchanged would be worse than no button.
    const report = await xrayFile(await revealingXlsx());
    expect(report.hasSensitiveFindings).toBe(true);
    expect(report.canStrip).toBe(false);
    expect(canStripFormat('xlsx')).toBe(false);
    await expect(stripFile(await revealingXlsx(), 'xlsx')).rejects.toThrow(
      /no metadata stripper/iu,
    );
  });

  it('reads a real spreadsheet written by another program', async () => {
    const report = await xrayFile(
      fixture('spreadsheet/__fixtures__/sales.xlsx'),
      'sales.xlsx',
    );
    expect(report.format).toBe('xlsx');
    expect(
      report.findings.find((finding) => finding.id === 'ooxml-creator')?.value,
    ).toBe('openpyxl');
  });

  it('finds nothing in a spreadsheet this project wrote, because it writes nothing', async () => {
    const report = await xrayFile(
      fixture('spreadsheet/__fixtures__/golden-written.xlsx'),
    );
    expect(report.format).toBe('xlsx');
    expect(report.hasSensitiveFindings).toBe(false);
  });
});

describe('xrayFile on a video', () => {
  it('opens an MP4 and reports what the container holds', async () => {
    const report = await xrayFile(
      fixture('video/__fixtures__/baseline.mp4'),
      'clip.mp4',
    );
    expect(report.format).toBe('mp4');
    expect(report.warnings).toEqual([]);
    for (const finding of report.findings) {
      expect(finding.consequence.length, finding.id).toBeGreaterThan(20);
    }
  });
});

describe('xrayFile on input it cannot use', () => {
  it('explains an unsupported format instead of throwing', async () => {
    const report = await xrayFile(
      new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0]),
      'sunset.gif',
    );
    expect(report.format).toBe('unsupported');
    expect(report.findings).toEqual([]);
    expect(report.canStrip).toBe(false);
    expect(report.warnings[0]).toContain('not a format the X-ray can open');
  });

  it('handles an empty file', async () => {
    const report = await xrayFile(new Uint8Array(0), 'empty.jpg');
    expect(report.format).toBe('unsupported');
    expect(report.fileSizeBytes).toBe(0);
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it('turns a parser failure on a truncated file into a warning, not an exception', async () => {
    const truncated = (await revealingPdf()).slice(0, 80);
    const report = await xrayFile(truncated, 'cut-short.pdf');
    expect(report.format).toBe('pdf');
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.canStrip).toBe(false);
  });

  it('survives a corrupt image without throwing', async () => {
    const report = await xrayFile(
      fixture('metadata/__fixtures__/corrupt-truncated.jpg'),
    );
    expect(report.format).toBe('jpeg');
    // Either findings or warnings is fine; crashing is not.
    expect(Array.isArray(report.findings)).toBe(true);
  });

  it('reports a ZIP that is not an Office document without claiming an author', async () => {
    const bytes = await createZip([
      { path: 'notes.txt', data: encoder.encode('hello') },
    ]);
    const report = await xrayFile(bytes, 'bundle.zip');
    expect(report.format).toBe('zip');
    expect(
      report.findings.find((finding) => finding.id === 'zip-entries'),
    ).toBeDefined();
    expect(
      report.findings.some((finding) => finding.category === 'identity'),
    ).toBe(false);
  });
});

describe('stripFile', () => {
  it('removes the coordinates it reported from a photo', async () => {
    const bytes = fixture('metadata/__fixtures__/gps-camera-photo.jpg');
    const result = await stripFile(bytes, 'jpeg');

    expect(result.cleanedSize).toBeLessThan(result.originalSize);
    expect(result.removed.length).toBeGreaterThan(0);

    // The check that matters: X-ray the cleaned bytes and the location is gone.
    const after = await xrayFile(result.bytes, 'holiday_clean.jpg');
    expect(
      after.findings.some((finding) => finding.category === 'location'),
    ).toBe(false);
    expect(after.hasSensitiveFindings).toBe(false);
  });

  it('removes the author from a PDF, including the copy in the XMP packet', async () => {
    const result = await stripFile(await revealingPdf(), 'pdf');

    // Not just absent from a re-read: absent from the bytes.
    const text = asText(result.bytes);
    expect(text).not.toContain('Jane Partner');
    expect(text).not.toContain('uuid:9f2b-lineage');

    const after = await xrayFile(result.bytes);
    expect(after.findings).toEqual([]);
  });

  it('takes the deleted text out of a Word file and says that it changed the document', async () => {
    const result = await stripFile(await createTrackedFixtureDocx(), 'docx');

    // The deleted text must not survive in the bytes anywhere.
    expect(asText(result.bytes)).not.toContain(
      'Payment of $250,000 shall be wired within 30 days.',
    );
    expect(asText(result.bytes)).not.toContain('Jane Lawyer');

    // Accepting revisions is a real edit, so the result says so in words the
    // UI can show. See `contentChanged` in index.ts.
    expect(result.contentChanged).toBeTruthy();
    expect(result.contentChanged).toMatch(/accepted/iu);

    const after = await xrayFile(result.bytes);
    expect(
      after.findings.some((finding) => finding.id === 'docx-deleted-text'),
    ).toBe(false);
    expect(
      after.findings.some((finding) => finding.id === 'ooxml-creator'),
    ).toBe(false);
  });

  it('does not claim a content change when a Word file had no tracked changes', async () => {
    const plain = await createZip([
      {
        path: 'word/document.xml',
        data: encoder.encode('<w:document><w:body/></w:document>'),
      },
      {
        path: 'docProps/core.xml',
        data: encoder.encode(
          `<cp:coreProperties xmlns:cp="${CORE_PROPS_NS}" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Sam</dc:creator></cp:coreProperties>`,
        ),
      },
    ]);
    const result = await stripFile(plain, 'docx');
    expect(result.contentChanged).toBeUndefined();
    expect(asText(result.bytes)).not.toContain('Sam');
  });

  it('refuses a format it has no stripper for, rather than returning the file untouched', async () => {
    await expect(stripFile(new Uint8Array(8), 'unsupported')).rejects.toThrow();
    await expect(stripFile(await revealingXlsx(), 'pptx')).rejects.toThrow();
  });
});

describe('rankFindings', () => {
  const make = (
    id: string,
    category: XrayFinding['category'],
    severity: XrayFinding['severity'],
  ): XrayFinding => ({
    id,
    category,
    severity,
    label: id,
    value: 'v',
    consequence: 'c',
    source: 's',
  });

  it('orders by category first, then severity', () => {
    const ranked = rankFindings([
      make('tech', 'technical', 'high'),
      make('date', 'timeline', 'low'),
      make('name', 'identity', 'medium'),
      make('gps', 'location', 'low'),
    ]);
    expect(ranked.map((finding) => finding.id)).toEqual([
      'gps',
      'name',
      'date',
      'tech',
    ]);
  });

  it('puts a high finding above a low one inside the same category', () => {
    const ranked = rankFindings([
      make('model', 'device', 'medium'),
      make('serial', 'device', 'high'),
      make('lens', 'device', 'low'),
    ]);
    expect(ranked.map((finding) => finding.id)).toEqual([
      'serial',
      'model',
      'lens',
    ]);
  });

  it('is stable, so the same file always renders the same way', () => {
    // Two screenshots of one report should match, and a test should be able to
    // assert on a position.
    const input = [
      make('a', 'identity', 'high'),
      make('b', 'identity', 'high'),
      make('c', 'identity', 'high'),
    ];
    expect(rankFindings(input).map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(rankFindings([...input].reverse()).map((f) => f.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('ranks every category the type declares', () => {
    const ranked = rankFindings(
      [...CATEGORY_ORDER]
        .reverse()
        .map((category) => make(category, category, 'medium')),
    );
    expect(ranked.map((finding) => finding.id)).toEqual([...CATEGORY_ORDER]);
  });
});

describe('cleanFileName', () => {
  it('keeps the extension so the cleaned file still opens', () => {
    expect(cleanFileName('holiday.jpg')).toBe('holiday_clean.jpg');
    expect(cleanFileName('report.final.pdf')).toBe('report.final_clean.pdf');
    expect(cleanFileName('noextension')).toBe('noextension_clean');
    expect(cleanFileName('.gitignore')).toBe('.gitignore_clean');
  });
});
