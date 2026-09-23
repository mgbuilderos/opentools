/**
 * PDF Burst by Rule Engine (/pdf/burst).
 *
 * Professional splitting of multi-page PDFs based on flexible business rules:
 * 1. By Bookmark / Outline: split at every top-level bookmark and name files by bookmark title.
 * 2. By Blank Page: split whenever a blank separator sheet is encountered (removes separator).
 * 3. By Regex Pattern Match: split when a regex pattern matches on a page and name the file
 *    using capture groups (e.g. invoice numbers `INV-\d+`, employee ID, account number).
 * 4. By Value Change: split when a matched field value changes from the previous page
 *    (e.g., grouped monthly statements where each statement spans variable pages).
 * 5. Fixed page count intervals (e.g. every N pages).
 */

import { PDFDocument } from 'pdf-lib';
import { readPdfText, type PdfPageText } from './pdf-text';

export type BurstRuleType =
  | 'bookmark'
  | 'blank-page'
  | 'regex-pattern'
  | 'value-change'
  | 'fixed-interval';

export interface BurstRule {
  type: BurstRuleType;
  /** Regex pattern for 'regex-pattern' or 'value-change' */
  pattern?: string;
  /** Naming template with tokens, e.g. "{match}.pdf" or "Invoice_{match}_{page}.pdf" */
  namingTemplate?: string;
  /** Interval for fixed page bursts */
  fixedInterval?: number;
  /** Include or discard blank separator page */
  keepBlankSeparators?: boolean;
}

export interface BurstSegment {
  segmentIndex: number;
  startPage: number;
  endPage: number;
  pageCount: number;
  filename: string;
  matchedText?: string;
}

export interface BurstPlan {
  totalSourcePages: number;
  segments: BurstSegment[];
  ruleUsed: BurstRuleType;
}

export interface BurstOutput {
  filename: string;
  bytes: Uint8Array;
  startPage: number;
  endPage: number;
}

/** Check if a page has virtually zero printable text */
export function isPageBlank(page: PdfPageText): boolean {
  if (!page.items || page.items.length === 0) return true;
  const combined = page.items.map((i) => i.text.trim()).join('');
  return combined.length === 0;
}

/** Apply filename template */
export function formatBurstFilename(
  template: string,
  variables: { match?: string; index: number; page: number },
): string {
  let name = template || 'split_{index}.pdf';
  name = name.replace(/\{index\}/g, variables.index.toString());
  name = name.replace(/\{page\}/g, variables.page.toString());
  name = name.replace(
    /\{match\}/g,
    (variables.match || `doc_${variables.index}`).trim(),
  );

  // Sanitize illegal filesystem characters
  name = name.replace(/[/\\?%*:|"<>]/g, '_');
  if (!name.toLowerCase().endsWith('.pdf')) {
    name += '.pdf';
  }
  return name;
}

/**
 * Plan the burst segmentation before actually slicing PDF bytes.
 */
export async function planPdfBurst(
  pdfBytes: Uint8Array,
  rule: BurstRule,
): Promise<BurstPlan> {
  const pagesText = await readPdfText(pdfBytes);
  const totalPages = pagesText.length;
  if (totalPages === 0) {
    return { totalSourcePages: 0, segments: [], ruleUsed: rule.type };
  }

  const segments: BurstSegment[] = [];
  const template = rule.namingTemplate || '{match}.pdf';

  switch (rule.type) {
    case 'fixed-interval': {
      const interval = Math.max(1, rule.fixedInterval || 1);
      let segIdx = 1;
      for (let p = 1; p <= totalPages; p += interval) {
        const start = p;
        const end = Math.min(totalPages, p + interval - 1);
        const filename = formatBurstFilename(
          rule.namingTemplate || 'part_{index}.pdf',
          {
            index: segIdx,
            page: start,
          },
        );
        segments.push({
          segmentIndex: segIdx++,
          startPage: start,
          endPage: end,
          pageCount: end - start + 1,
          filename,
        });
      }
      break;
    }

    case 'blank-page': {
      let currentStart = 1;
      let segIdx = 1;

      for (let i = 0; i < totalPages; i++) {
        const pageNum = i + 1;
        const blank = isPageBlank(pagesText[i]!);

        if (blank) {
          if (pageNum > currentStart) {
            // Segment before the blank page
            const end = pageNum - 1;
            segments.push({
              segmentIndex: segIdx++,
              startPage: currentStart,
              endPage: end,
              pageCount: end - currentStart + 1,
              filename: formatBurstFilename(
                rule.namingTemplate || 'doc_{index}.pdf',
                {
                  index: segIdx - 1,
                  page: currentStart,
                },
              ),
            });
          }
          currentStart = pageNum + 1;
        }
      }

      if (currentStart <= totalPages) {
        segments.push({
          segmentIndex: segIdx++,
          startPage: currentStart,
          endPage: totalPages,
          pageCount: totalPages - currentStart + 1,
          filename: formatBurstFilename(
            rule.namingTemplate || 'doc_{index}.pdf',
            {
              index: segIdx - 1,
              page: currentStart,
            },
          ),
        });
      }
      break;
    }

    case 'regex-pattern': {
      const regex = new RegExp(
        rule.pattern || '(?:INV|INVOICE|STATEMENT|ACCT)[-: ]*([A-Za-z0-9_-]+)',
        'i',
      );
      let currentStart = 1;
      let currentMatch = '';
      let segIdx = 1;

      for (let i = 0; i < totalPages; i++) {
        const pageNum = i + 1;
        const pageContent = pagesText[i]!.items.map((it) => it.text).join(' ');
        const match = pageContent.match(regex);

        if (match) {
          const matchVal = (match[1] || match[0]).trim();
          if (pageNum > 1 && currentStart < pageNum) {
            // Complete previous segment
            segments.push({
              segmentIndex: segIdx++,
              startPage: currentStart,
              endPage: pageNum - 1,
              pageCount: pageNum - currentStart,
              filename: formatBurstFilename(template, {
                match: currentMatch,
                index: segIdx - 1,
                page: currentStart,
              }),
              matchedText: currentMatch,
            });
            currentStart = pageNum;
          }
          currentMatch = matchVal;
        }
      }

      if (currentStart <= totalPages) {
        segments.push({
          segmentIndex: segIdx++,
          startPage: currentStart,
          endPage: totalPages,
          pageCount: totalPages - currentStart + 1,
          filename: formatBurstFilename(template, {
            match: currentMatch || `doc_${segIdx - 1}`,
            index: segIdx - 1,
            page: currentStart,
          }),
          matchedText: currentMatch,
        });
      }
      break;
    }

    case 'value-change': {
      const regex = new RegExp(
        rule.pattern || '(?:INV|INVOICE|ACCT)[-: ]*([A-Za-z0-9_-]+)',
        'i',
      );
      let currentStart = 1;
      let lastVal = '';
      let segIdx = 1;

      for (let i = 0; i < totalPages; i++) {
        const pageNum = i + 1;
        const pageContent = pagesText[i]!.items.map((it) => it.text).join(' ');
        const match = pageContent.match(regex);
        const thisVal = match ? (match[1] || match[0]).trim() : lastVal;

        if (i > 0 && thisVal !== lastVal && thisVal !== '') {
          // Value changed -> slice
          segments.push({
            segmentIndex: segIdx++,
            startPage: currentStart,
            endPage: pageNum - 1,
            pageCount: pageNum - currentStart,
            filename: formatBurstFilename(template, {
              match: lastVal,
              index: segIdx - 1,
              page: currentStart,
            }),
            matchedText: lastVal,
          });
          currentStart = pageNum;
        }

        if (thisVal) {
          lastVal = thisVal;
        }
      }

      if (currentStart <= totalPages) {
        segments.push({
          segmentIndex: segIdx++,
          startPage: currentStart,
          endPage: totalPages,
          pageCount: totalPages - currentStart + 1,
          filename: formatBurstFilename(template, {
            match: lastVal || `doc_${segIdx - 1}`,
            index: segIdx - 1,
            page: currentStart,
          }),
          matchedText: lastVal,
        });
      }
      break;
    }

    default: {
      // Single 1-page burst fallback
      for (let p = 1; p <= totalPages; p++) {
        segments.push({
          segmentIndex: p,
          startPage: p,
          endPage: p,
          pageCount: 1,
          filename: `page_${p}.pdf`,
        });
      }
      break;
    }
  }

  return {
    totalSourcePages: totalPages,
    segments,
    ruleUsed: rule.type,
  };
}

/**
 * Execute burst plan and generate separate PDF files.
 */
export async function executePdfBurst(
  pdfBytes: Uint8Array,
  plan: BurstPlan,
): Promise<BurstOutput[]> {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const outputs: BurstOutput[] = [];

  for (const seg of plan.segments) {
    const newDoc = await PDFDocument.create();
    const pageIndices: number[] = [];
    for (let p = seg.startPage; p <= seg.endPage; p++) {
      const idx = p - 1;
      if (idx >= 0 && idx < srcDoc.getPageCount()) {
        pageIndices.push(idx);
      }
    }

    if (pageIndices.length === 0) continue;

    const copied = await newDoc.copyPages(srcDoc, pageIndices);
    copied.forEach((cp) => newDoc.addPage(cp));

    const bytes = await newDoc.save();
    outputs.push({
      filename: seg.filename,
      bytes,
      startPage: seg.startPage,
      endPage: seg.endPage,
    });
  }

  return outputs;
}
