/**
 * Redaction Targets Engine:
 * Converts manual rectangles, text search queries, and automated PII/secret detections
 * into precise PDF user-space bounding boxes for redaction.
 */

import {
  findDetections,
  type Detection,
  type DetectionCategory,
} from '../redaction/detectors';
import type { PdfTextItem } from './pdf-text';
import { readPdfGeometry, type PdfPageGeometry } from './pdf-geometry';

export interface RedactionRect {
  /** Bottom-left x coordinate in PDF user points. */
  x: number;
  /** Bottom-left y coordinate in PDF user points. */
  y: number;
  /** Width in PDF user points. */
  width: number;
  /** Height in PDF user points. */
  height: number;
}

export interface RedactionTarget {
  id: string;
  pageNumber: number; // 1-indexed
  rect: RedactionRect;
  label: string;
  source: 'manual' | 'search' | 'detection';
  category?: DetectionCategory | 'text';
}

export interface SearchRedactionOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface DetectRedactionOptions {
  categories?: Iterable<DetectionCategory>;
}

export interface CharMapEntry {
  itemIndex: number;
  charOffsetInItem: number;
}

export interface PageTextModel {
  pageNumber: number;
  text: string;
  charMap: CharMapEntry[];
  items: PdfTextItem[];
  viewBox: readonly [number, number, number, number];
}

/**
 * Builds a unified text model of a page with a 1:1 character mapping back
 * to original PdfTextItem instances and their coordinates.
 */
export function buildPageTextModel(
  page: PdfPageGeometry,
  pageNumber: number,
): PageTextModel {
  let text = '';
  const charMap: CharMapEntry[] = [];
  const items = page.items;

  // Sort items in natural reading order: top-to-bottom (descending y), then left-to-right (ascending x)
  // We use a small vertical tolerance (e.g. 4pt) to group items on the same baseline.
  const indexedItems = items.map((item, idx) => ({ item, idx }));
  indexedItems.sort((a, b) => {
    const yDiff = b.item.y - a.item.y;
    if (Math.abs(yDiff) > 4) {
      return yDiff;
    }
    return a.item.x - b.item.x;
  });

  let prevY: number | null = null;
  let prevRightX: number | null = null;

  for (const { item, idx } of indexedItems) {
    if (item.text.length === 0) continue;

    // Check if we need to insert a space or newline separator between items
    if (prevY !== null) {
      const isNewLine = Math.abs(item.y - prevY) > 4;
      if (isNewLine) {
        text += '\n';
        charMap.push({ itemIndex: -1, charOffsetInItem: -1 });
      } else if (prevRightX !== null && item.x - prevRightX > 2) {
        text += ' ';
        charMap.push({ itemIndex: -1, charOffsetInItem: -1 });
      }
    }

    prevY = item.y;
    prevRightX = item.x + item.width;

    for (let c = 0; c < item.text.length; c++) {
      text += item.text[c];
      charMap.push({ itemIndex: idx, charOffsetInItem: c });
    }
  }

  return {
    pageNumber,
    text,
    charMap,
    items,
    viewBox: page.viewBox,
  };
}

/**
 * Calculates a bounding rectangle in PDF coordinates for a slice of a PdfTextItem.
 */
export function computeSubItemRect(
  item: PdfTextItem,
  charStart: number,
  charLength: number,
): RedactionRect {
  const totalChars = Math.max(1, item.text.length);
  const avgCharWidth = item.width / totalChars;

  const startOffset = Math.max(0, Math.min(totalChars, charStart));
  const length = Math.max(1, Math.min(totalChars - startOffset, charLength));

  const x = item.x + startOffset * avgCharWidth - 1;
  const width = length * avgCharWidth + 2;
  // Font baseline is at y. Text ascenders extend upward ~0.8*fontSize, descenders downward ~0.25*fontSize.
  const y = item.y - item.fontSize * 0.25;
  const height = item.fontSize * 1.25;

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
  };
}

/**
 * Maps a character span [start, end) in the page's unified text model
 * to one or more RedactionRects.
 */
export function mapSpanToRects(
  model: PageTextModel,
  start: number,
  end: number,
): RedactionRect[] {
  if (start >= end || start < 0 || end > model.charMap.length) return [];

  // Group matched characters by itemIndex
  const itemRanges = new Map<number, { min: number; max: number }>();

  for (let i = start; i < end; i++) {
    const entry = model.charMap[i];
    if (!entry || entry.itemIndex < 0) continue;

    const current = itemRanges.get(entry.itemIndex);
    if (!current) {
      itemRanges.set(entry.itemIndex, {
        min: entry.charOffsetInItem,
        max: entry.charOffsetInItem,
      });
    } else {
      current.min = Math.min(current.min, entry.charOffsetInItem);
      current.max = Math.max(current.max, entry.charOffsetInItem);
    }
  }

  const rects: RedactionRect[] = [];
  for (const [itemIdx, range] of itemRanges.entries()) {
    const item = model.items[itemIdx];
    if (!item) continue;
    const count = range.max - range.min + 1;
    rects.push(computeSubItemRect(item, range.min, count));
  }

  return rects;
}

let targetCounter = 0;
export function generateTargetId(prefix = 'redact'): string {
  targetCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${targetCounter}`;
}

/**
 * Finds all occurrences of a search string across document pages
 * and returns RedactionTarget instances with exact PDF user-space coordinates.
 */
export function findSearchTargets(
  models: PageTextModel[],
  query: string,
  options: SearchRedactionOptions = {},
): RedactionTarget[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const targets: RedactionTarget[] = [];
  const flags = options.caseSensitive ? 'g' : 'gi';
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patternStr = options.wholeWord ? `\\b${escaped}\\b` : escaped;

  let regex: RegExp;
  try {
    regex = new RegExp(patternStr, flags);
  } catch {
    return [];
  }

  for (const model of models) {
    for (const match of model.text.matchAll(regex)) {
      const matchIndex = match.index;
      if (matchIndex === undefined) continue;
      const matchText = match[0];
      const rects = mapSpanToRects(
        model,
        matchIndex,
        matchIndex + matchText.length,
      );

      for (const rect of rects) {
        targets.push({
          id: generateTargetId('search'),
          pageNumber: model.pageNumber,
          rect,
          label: `Search: "${matchText}"`,
          source: 'search',
          category: 'text',
        });
      }
    }
  }

  return targets;
}

/**
 * Scans document pages for sensitive PII and secrets (emails, credit cards,
 * IP addresses, API keys, private keys) using shared vetted detectors
 * and maps all detections to PDF bounding boxes.
 */
export function findDetectionTargets(
  models: PageTextModel[],
  options: DetectRedactionOptions = {},
): RedactionTarget[] {
  const categories: DetectionCategory[] = options.categories
    ? Array.from(options.categories)
    : ['private-key', 'key', 'email', 'ip', 'card'];

  const targets: RedactionTarget[] = [];

  for (const model of models) {
    const detections: Detection[] = findDetections(model.text, categories);

    for (const detection of detections) {
      const rects = mapSpanToRects(model, detection.start, detection.end);
      const secretSlice = model.text.slice(detection.start, detection.end);
      // Obfuscate secret snippet for UI labeling (e.g. j***@domain.com)
      const maskedLabel = maskSecretSnippet(secretSlice, detection.category);

      for (const rect of rects) {
        targets.push({
          id: generateTargetId('detect'),
          pageNumber: model.pageNumber,
          rect,
          label: `${formatCategoryName(detection.category)}: ${maskedLabel}`,
          source: 'detection',
          category: detection.category,
        });
      }
    }
  }

  return targets;
}

function formatCategoryName(category: DetectionCategory): string {
  switch (category) {
    case 'email':
      return 'Email';
    case 'card':
      return 'Card Number';
    case 'ip':
      return 'IP Address';
    case 'key':
      return 'API Key';
    case 'private-key':
      return 'Private Key';
    default:
      return 'Secret';
  }
}

function maskSecretSnippet(val: string, category: DetectionCategory): string {
  if (category === 'email') {
    const at = val.indexOf('@');
    if (at > 2) {
      return `${val.slice(0, 2)}***${val.slice(at)}`;
    }
    return val;
  }
  if (category === 'card') {
    const clean = val.replace(/\D/g, '');
    if (clean.length >= 4) {
      return `**** **** **** ${clean.slice(-4)}`;
    }
  }
  if (val.length > 8) {
    return `${val.slice(0, 4)}...${val.slice(-4)}`;
  }
  return '***';
}

/**
 * Validates and normalizes manual redaction boxes.
 */
export function createManualTarget(
  pageNumber: number,
  rect: RedactionRect,
  label = 'Manual redaction',
): RedactionTarget {
  return {
    id: generateTargetId('manual'),
    pageNumber,
    rect: {
      x: Math.round(rect.x * 100) / 100,
      y: Math.round(rect.y * 100) / 100,
      width: Math.max(1, Math.round(rect.width * 100) / 100),
      height: Math.max(1, Math.round(rect.height * 100) / 100),
    },
    label,
    source: 'manual',
  };
}

/**
 * Convenience function to load and parse text models for all pages of a PDF.
 */
export async function loadPdfTextModels(pdfBytes: Uint8Array): Promise<{
  models: PageTextModel[];
  pageCount: number;
  hasTextLayer: boolean;
}> {
  const geometries = await readPdfGeometry(pdfBytes);
  const models: PageTextModel[] = [];
  let totalTextChars = 0;

  geometries.forEach((geom, idx) => {
    const model = buildPageTextModel(geom, idx + 1);
    models.push(model);
    totalTextChars += model.text.trim().length;
  });

  return {
    models,
    pageCount: geometries.length,
    hasTextLayer: totalTextChars > 0,
  };
}
