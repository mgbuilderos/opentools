import fs from 'node:fs';
import path from 'node:path';
import {
  degrees,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFString,
} from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  applyBatesNumbering,
  formatBatesNumber,
  formatBatesRange,
  stampBatesPdf,
  type BatesPosition,
} from './bates';

function getPageLabel(nums: PDFArray, index: number): string {
  const dict = nums.lookup(index, PDFDict);
  const p = dict.lookup(PDFName.of('P')) as PDFHexString | PDFString;
  return p.decodeText();
}

describe('Bates Numbering Engine', () => {
  describe('formatBatesNumber', () => {
    it('formats numbers with default 6-digit zero padding', () => {
      expect(formatBatesNumber(1)).toBe('000001');
      expect(formatBatesNumber(42)).toBe('000042');
      expect(formatBatesNumber(999999)).toBe('999999');
      expect(formatBatesNumber(1000000)).toBe('1000000');
    });

    it('formats numbers with custom prefix, padding, and suffix', () => {
      expect(formatBatesNumber(5, 'PLTF-', 4, '-CONF')).toBe('PLTF-0005-CONF');
      expect(formatBatesNumber(123, 'EXHIBIT_A_', 8)).toBe(
        'EXHIBIT_A_00000123',
      );
      expect(formatBatesNumber(7, 'DOC-', 0)).toBe('DOC-7');
    });

    it('handles zero and floats gracefully', () => {
      expect(formatBatesNumber(0, 'P-', 3)).toBe('P-000');
      expect(formatBatesNumber(3.7, 'P-', 3)).toBe('P-003');
      expect(formatBatesNumber(-5, 'P-', 3)).toBe('P-000');
    });
  });

  describe('formatBatesRange', () => {
    it('formats single-page ranges without hyphen', () => {
      expect(formatBatesRange(1, 1, 'ABC-', 6)).toBe('ABC-000001');
    });

    it('formats multi-page ranges with en-dash', () => {
      expect(formatBatesRange(1, 42, 'ABC-', 6)).toBe(
        'ABC-000001 – ABC-000042',
      );
    });
  });

  describe('applyBatesNumbering - single document', () => {
    it('stamps a multi-page document with sequential Bates numbers and page labels', async () => {
      const doc = await PDFDocument.create();
      doc.addPage([612, 792]);
      doc.addPage([612, 792]);
      doc.addPage([612, 792]);
      const sourceBytes = await doc.save();

      const result = await applyBatesNumbering(
        [{ name: 'brief.pdf', bytes: sourceBytes }],
        {
          prefix: 'DEF-',
          startingNumber: 101,
          paddingWidth: 5,
          suffix: '-EX',
          position: 'bottom-right',
          fontSize: 10,
          marginPt: 36,
          writePageLabels: true,
        },
      );

      expect(result.documents).toHaveLength(1);
      expect(result.totalPageCount).toBe(3);
      expect(result.nextNumber).toBe(104);

      const stamped = result.documents[0];
      expect(stamped.name).toBe('brief.pdf');
      expect(stamped.pageCount).toBe(3);
      expect(stamped.startNumber).toBe(101);
      expect(stamped.endNumber).toBe(103);
      expect(stamped.batesRange).toBe('DEF-00101-EX – DEF-00103-EX');

      // Verify stamped PDF is valid and has PageLabels
      const reloaded = await PDFDocument.load(stamped.bytes);
      expect(reloaded.getPageCount()).toBe(3);

      const pageLabels = reloaded.catalog.lookup(
        PDFName.of('PageLabels'),
        PDFDict,
      );
      expect(pageLabels).toBeDefined();
      const nums = pageLabels.lookup(PDFName.of('Nums'), PDFArray);
      expect(nums.size()).toBe(6); // 3 pages * (index + labelDict)

      const p0 = getPageLabel(nums, 1);
      const p1 = getPageLabel(nums, 3);
      const p2 = getPageLabel(nums, 5);

      expect(p0).toBe('DEF-00101-EX');
      expect(p1).toBe('DEF-00102-EX');
      expect(p2).toBe('DEF-00103-EX');
    });

    it('supports disabling page labels with writePageLabels: false', async () => {
      const doc = await PDFDocument.create();
      doc.addPage([612, 792]);
      const sourceBytes = await doc.save();

      const result = await applyBatesNumbering(
        [{ name: 'doc.pdf', bytes: sourceBytes }],
        {
          writePageLabels: false,
        },
      );

      const reloaded = await PDFDocument.load(result.documents[0].bytes);
      expect(reloaded.catalog.has(PDFName.of('PageLabels'))).toBe(false);
    });

    it('stamps correctly at all 6 positions without throwing', async () => {
      const positions: BatesPosition[] = [
        'top-left',
        'top-center',
        'top-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ];

      for (const pos of positions) {
        const doc = await PDFDocument.create();
        doc.addPage([612, 792]);
        const sourceBytes = await doc.save();

        const result = await applyBatesNumbering(
          [{ name: 'pos.pdf', bytes: sourceBytes }],
          {
            position: pos,
            prefix: `POS-${pos}-`,
          },
        );

        expect(result.documents[0].batesRange).toContain(`POS-${pos}-000001`);
        const reloaded = await PDFDocument.load(result.documents[0].bytes);
        expect(reloaded.getPageCount()).toBe(1);
      }
    });

    it('convenience helper stampBatesPdf stamps a single file', async () => {
      const doc = await PDFDocument.create();
      doc.addPage([612, 792]);
      doc.addPage([612, 792]);
      const sourceBytes = await doc.save();

      const result = await stampBatesPdf(sourceBytes, {
        prefix: 'AUTO-',
        startingNumber: 10,
        paddingWidth: 4,
      });

      expect(result.pageCount).toBe(2);
      expect(result.batesRange).toBe('AUTO-0010 – AUTO-0011');
      expect(result.bytes.byteLength).toBeGreaterThan(sourceBytes.byteLength);
    });
  });

  describe('applyBatesNumbering - rotated and cropped pages', () => {
    it('handles /Rotate 0, 90, 180, 270 and CropBox offsets', async () => {
      const doc = await PDFDocument.create();

      // Page 1: normal
      doc.addPage([612, 792]);

      // Page 2: 90 deg
      const p2 = doc.addPage([612, 792]);
      p2.setRotation(degrees(90));

      // Page 3: 180 deg
      const p3 = doc.addPage([612, 792]);
      p3.setRotation(degrees(180));

      // Page 4: 270 deg
      const p4 = doc.addPage([612, 792]);
      p4.setRotation(degrees(270));

      // Page 5: CropBox offset
      const p5 = doc.addPage([612, 792]);
      p5.setCropBox(36, 36, 540, 720);

      const raw = await doc.save();

      const result = await applyBatesNumbering(
        [{ name: 'rotations.pdf', bytes: raw }],
        {
          prefix: 'ROT-',
          startingNumber: 1,
          paddingWidth: 6,
          position: 'top-right',
        },
      );

      expect(result.documents[0].pageCount).toBe(5);
      expect(result.documents[0].batesRange).toBe('ROT-000001 – ROT-000005');

      const reloaded = await PDFDocument.load(result.documents[0].bytes);
      expect(reloaded.getPage(1).getRotation().angle).toBe(90);
      expect(reloaded.getPage(2).getRotation().angle).toBe(180);
      expect(reloaded.getPage(3).getRotation().angle).toBe(270);
    });
  });

  describe('applyBatesNumbering - legal exhibit bundle across multiple PDFs', () => {
    it('sequences numbers continuously across multiple documents and generates merged bundle', async () => {
      // Document 1: 2 pages
      const d1 = await PDFDocument.create();
      d1.addPage([612, 792]);
      d1.addPage([612, 792]);
      const d1Bytes = await d1.save();

      // Document 2: 3 pages
      const d2 = await PDFDocument.create();
      d2.addPage([612, 792]);
      d2.addPage([612, 792]);
      d2.addPage([612, 792]);
      const d2Bytes = await d2.save();

      // Document 3: 1 page
      const d3 = await PDFDocument.create();
      d3.addPage([612, 792]);
      const d3Bytes = await d3.save();

      const result = await applyBatesNumbering(
        [
          { name: 'Exhibit_A.pdf', bytes: d1Bytes },
          { name: 'Exhibit_B.pdf', bytes: d2Bytes },
          { name: 'Exhibit_C.pdf', bytes: d3Bytes },
        ],
        {
          prefix: 'EXHIBIT-',
          startingNumber: 1,
          paddingWidth: 6,
          writePageLabels: true,
        },
      );

      expect(result.documents).toHaveLength(3);
      expect(result.totalPageCount).toBe(6);
      expect(result.nextNumber).toBe(7);

      // Doc 1: pages 1 to 2
      expect(result.documents[0].name).toBe('Exhibit_A.pdf');
      expect(result.documents[0].pageCount).toBe(2);
      expect(result.documents[0].startNumber).toBe(1);
      expect(result.documents[0].endNumber).toBe(2);
      expect(result.documents[0].batesRange).toBe(
        'EXHIBIT-000001 – EXHIBIT-000002',
      );

      // Doc 2: pages 3 to 5 (continuous!)
      expect(result.documents[1].name).toBe('Exhibit_B.pdf');
      expect(result.documents[1].pageCount).toBe(3);
      expect(result.documents[1].startNumber).toBe(3);
      expect(result.documents[1].endNumber).toBe(5);
      expect(result.documents[1].batesRange).toBe(
        'EXHIBIT-000003 – EXHIBIT-000005',
      );

      // Doc 3: page 6 (continuous!)
      expect(result.documents[2].name).toBe('Exhibit_C.pdf');
      expect(result.documents[2].pageCount).toBe(1);
      expect(result.documents[2].startNumber).toBe(6);
      expect(result.documents[2].endNumber).toBe(6);
      expect(result.documents[2].batesRange).toBe('EXHIBIT-000006');

      // Combined bundle checks
      expect(result.combined).toBeDefined();
      expect(result.combined!.pageCount).toBe(6);
      expect(result.combined!.batesRange).toBe(
        'EXHIBIT-000001 – EXHIBIT-000006',
      );

      const mergedLoaded = await PDFDocument.load(result.combined!.bytes);
      expect(mergedLoaded.getPageCount()).toBe(6);
      const mergedLabels = mergedLoaded.catalog.lookup(
        PDFName.of('PageLabels'),
        PDFDict,
      );
      const mergedNums = mergedLabels.lookup(PDFName.of('Nums'), PDFArray);
      expect(mergedNums.size()).toBe(12); // 6 pages * 2
      const firstLabel = getPageLabel(mergedNums, 1);
      const lastLabel = getPageLabel(mergedNums, 11);
      expect(firstLabel).toBe('EXHIBIT-000001');
      expect(lastLabel).toBe('EXHIBIT-000006');
    });
  });

  describe('Error handling & refusals', () => {
    it('refuses empty inputs array', async () => {
      await expect(applyBatesNumbering([])).rejects.toThrow(
        'No PDF documents provided for Bates numbering.',
      );
    });

    it('refuses PDF with no pages', async () => {
      const zeroPagesPdf = new TextEncoder().encode(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n115\n%%EOF\n',
      );
      await expect(
        applyBatesNumbering([{ name: 'empty.pdf', bytes: zeroPagesPdf }]),
      ).rejects.toThrow('Document "empty.pdf" has no pages.');
    });

    it('refuses corrupt or non-PDF bytes', async () => {
      const corrupt = new Uint8Array([1, 2, 3, 4, 5]);
      await expect(
        applyBatesNumbering([{ name: 'corrupt.pdf', bytes: corrupt }]),
      ).rejects.toThrow('Failed to parse PDF "corrupt.pdf"');
    });

    it('refuses unsupported characters outside standard PDF font encoding', async () => {
      const doc = await PDFDocument.create();
      doc.addPage([612, 792]);
      const bytes = await doc.save();

      await expect(
        applyBatesNumbering([{ name: 'test.pdf', bytes }], {
          prefix: 'RUPEE-₹-',
        }),
      ).rejects.toThrow(
        'The character "₹" is not supported by standard PDF fonts.',
      );

      await expect(
        applyBatesNumbering([{ name: 'test.pdf', bytes }], {
          suffix: '🚀',
        }),
      ).rejects.toThrow('not supported by standard PDF fonts');
    });
  });

  describe('Golden fixture verification (G3 zero CLI dependency)', () => {
    it('matches the structure of frozen golden-bates.pdf', async () => {
      const goldenPath = path.resolve(
        __dirname,
        '__fixtures__/golden-bates.pdf',
      );
      expect(fs.existsSync(goldenPath)).toBe(true);

      const goldenBytes = fs.readFileSync(goldenPath);
      const goldenDoc = await PDFDocument.load(goldenBytes);
      expect(goldenDoc.getPageCount()).toBe(5);

      const labels = goldenDoc.catalog.lookup(
        PDFName.of('PageLabels'),
        PDFDict,
      );
      const nums = labels.lookup(PDFName.of('Nums'), PDFArray);
      expect(nums.size()).toBe(10); // 5 pages * 2

      const p0 = getPageLabel(nums, 1);
      const p4 = getPageLabel(nums, 9);
      expect(p0).toBe('CONFIDENTIAL-000001-PROD');
      expect(p4).toBe('CONFIDENTIAL-000005-PROD');
    });
  });
});
