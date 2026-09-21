import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function createSampleContracts(): Promise<{
  docABytes: Uint8Array;
  docBBytes: Uint8Array;
  docAName: string;
  docBName: string;
}> {
  const docA = await PDFDocument.create();
  const docB = await PDFDocument.create();

  const fontRegularA = await docA.embedFont(StandardFonts.Helvetica);
  const fontBoldA = await docA.embedFont(StandardFonts.HelveticaBold);

  const fontRegularB = await docB.embedFont(StandardFonts.Helvetica);
  const fontBoldB = await docB.embedFont(StandardFonts.HelveticaBold);

  // --- Document A: Original Draft (v1.0) ---
  // Page 1
  const pageA1 = docA.addPage([595, 842]);
  let y = 780;
  pageA1.drawText('MASTER SERVICES AGREEMENT (V1.0)', {
    x: 50,
    y,
    size: 16,
    font: fontBoldA,
  });
  y -= 35;
  pageA1.drawText(
    'This Master Services Agreement is entered into between Acme Corp ("Client") and Nova ("Provider").',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularA,
    },
  );
  y -= 25;
  pageA1.drawText('SECTION 1: SCOPE OF SERVICES', {
    x: 50,
    y,
    size: 12,
    font: fontBoldA,
  });
  y -= 20;
  pageA1.drawText(
    'Provider agrees to perform enterprise consulting, data architecture, and software auditing.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularA,
    },
  );
  y -= 30;
  pageA1.drawText('SECTION 2: CONFIDENTIALITY OBLIGATIONS', {
    x: 50,
    y,
    size: 12,
    font: fontBoldA,
  });
  y -= 20;
  pageA1.drawText(
    'All proprietary data and intellectual work shall remain confidential for seven years post-termination.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularA,
    },
  );
  y -= 30;
  pageA1.drawText('SECTION 3: PAYMENT TERMS', {
    x: 50,
    y,
    size: 12,
    font: fontBoldA,
  });
  y -= 20;
  pageA1.drawText(
    'Invoices shall be rendered monthly and paid within thirty (30) calendar days of invoice date.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularA,
    },
  );

  // Page 2
  const pageA2 = docA.addPage([595, 842]);
  y = 780;
  pageA2.drawText('SECTION 4: WARRANTIES AND LIABILITIES', {
    x: 50,
    y,
    size: 12,
    font: fontBoldA,
  });
  y -= 20;
  pageA2.drawText(
    'Provider warrants that all professional deliverables will conform to the technical specifications.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularA,
    },
  );
  y -= 20;
  pageA2.drawText(
    'Neither party shall be liable for indirect, punitive, or consequential damages arising hereunder.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularA,
    },
  );
  y -= 30;
  pageA2.drawText('SECTION 5: SIGNATURES AND EXECUTION', {
    x: 50,
    y,
    size: 12,
    font: fontBoldA,
  });
  y -= 20;
  pageA2.drawText(
    'Executed by authorized corporate officers as of the effective date recorded above.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularA,
    },
  );

  // --- Document B: Revised Counterparty Redline (v2.0) ---
  // Changes:
  // 1. Insert compliance clause on Page 1
  // 2. Change payment terms: "thirty (30)" -> "sixty (60)"
  // 3. Move Confidentiality Section from Page 1 to Page 2
  // Page 1
  const pageB1 = docB.addPage([595, 842]);
  y = 780;
  pageB1.drawText('MASTER SERVICES AGREEMENT (V2.0)', {
    x: 50,
    y,
    size: 16,
    font: fontBoldB,
  });
  y -= 35;
  pageB1.drawText(
    'This Master Services Agreement is entered into between Acme Corp ("Client") and Nova ("Provider").',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularB,
    },
  );
  y -= 25;
  pageB1.drawText('SECTION 1: SCOPE OF SERVICES', {
    x: 50,
    y,
    size: 12,
    font: fontBoldB,
  });
  y -= 20;
  pageB1.drawText(
    'Provider agrees to perform enterprise consulting, data architecture, and software auditing.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularB,
    },
  );
  y -= 30;
  // Inserted compliance clause
  pageB1.drawText('SECTION 1.1: REGULATORY COMPLIANCE AND DATA RESIDENCY', {
    x: 50,
    y,
    size: 12,
    font: fontBoldB,
  });
  y -= 20;
  pageB1.drawText(
    'Both parties shall strictly adhere to applicable data sovereignty, residency, and privacy statutes.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularB,
    },
  );
  y -= 30;
  // Notice: Confidentiality clause is REMOVED from Page 1 and moved to Page 2!
  pageB1.drawText('SECTION 3: PAYMENT TERMS', {
    x: 50,
    y,
    size: 12,
    font: fontBoldB,
  });
  y -= 20;
  pageB1.drawText(
    'Invoices shall be rendered monthly and paid within sixty (60) calendar days of invoice date.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularB,
    },
  );

  // Page 2
  const pageB2 = docB.addPage([595, 842]);
  y = 780;
  // Moved Confidentiality clause lands on Page 2
  pageB2.drawText('SECTION 2: CONFIDENTIALITY OBLIGATIONS', {
    x: 50,
    y,
    size: 12,
    font: fontBoldB,
  });
  y -= 20;
  pageB2.drawText(
    'All proprietary data and intellectual work shall remain confidential for seven years post-termination.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularB,
    },
  );
  y -= 30;
  pageB2.drawText('SECTION 4: WARRANTIES AND LIABILITIES', {
    x: 50,
    y,
    size: 12,
    font: fontBoldB,
  });
  y -= 20;
  pageB2.drawText(
    'Provider warrants that all professional deliverables will conform to the technical specifications.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularB,
    },
  );
  y -= 20;
  pageB2.drawText(
    'Neither party shall be liable for indirect, punitive, or consequential damages arising hereunder.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularB,
    },
  );
  y -= 30;
  pageB2.drawText('SECTION 5: SIGNATURES AND EXECUTION', {
    x: 50,
    y,
    size: 12,
    font: fontBoldB,
  });
  y -= 20;
  pageB2.drawText(
    'Executed by authorized corporate officers as of the effective date recorded above.',
    {
      x: 50,
      y,
      size: 10,
      font: fontRegularB,
    },
  );

  const docABytes = await docA.save();
  const docBBytes = await docB.save();

  return {
    docABytes,
    docBBytes,
    docAName: 'contract-draft-v1.pdf',
    docBName: 'contract-counterparty-v2.pdf',
  };
}
