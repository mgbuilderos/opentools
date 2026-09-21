import type {
  DiffChangeType,
  DiffWord,
  PageDiffSummary,
  PdfDiffChange,
  PdfDiffResult,
  PdfDiffSummary,
} from './types';

export function computeWordDiff(
  wordsA: DiffWord[],
  wordsB: DiffWord[],
  docAName = 'Document A',
  docBName = 'Document B',
  pageCountA = 1,
  pageCountB = 1,
): PdfDiffResult {
  // 1. Compute LCS alignment using Patience / Myers algorithm on word tokens
  const alignment = alignWords(wordsA, wordsB);

  // 2. Extract initial diff chunks (equal, insert, delete)
  const rawChunks = buildDiffChunks(alignment, wordsA, wordsB);

  // 3. Move Detection: match deleted blocks against inserted blocks
  const processedChunks = detectMoves(rawChunks);

  // 4. Formatting detection on equal blocks
  const finalChanges: PdfDiffChange[] = [];
  let changeCounter = 1;
  const nextId = (type: DiffChangeType) =>
    `CHG-${type.toUpperCase()}-${changeCounter++}`;

  for (const chunk of processedChunks) {
    if (chunk.type === 'equal') {
      // Check for formatting changes
      let curFormatWordsA: DiffWord[] = [];
      let curFormatWordsB: DiffWord[] = [];

      for (let i = 0; i < chunk.wordsA.length; i++) {
        const wA = chunk.wordsA[i];
        const wB = chunk.wordsB[i];
        const boldDiff = wA.bold !== wB.bold;
        const sizeDiff = Math.abs(wA.fontSize - wB.fontSize) > 1.5;

        if (boldDiff || sizeDiff) {
          curFormatWordsA.push(wA);
          curFormatWordsB.push(wB);
        } else if (curFormatWordsA.length > 0) {
          finalChanges.push(
            createFormatChange(
              nextId('format'),
              curFormatWordsA,
              curFormatWordsB,
            ),
          );
          curFormatWordsA = [];
          curFormatWordsB = [];
        }
      }

      if (curFormatWordsA.length > 0) {
        finalChanges.push(
          createFormatChange(
            nextId('format'),
            curFormatWordsA,
            curFormatWordsB,
          ),
        );
      }
    } else if (chunk.type === 'insert') {
      finalChanges.push({
        id: nextId('insert'),
        type: 'insert',
        pageB: chunk.wordsB[0]?.pageNumber,
        revisedText: chunk.wordsB.map((w) => w.text).join(' '),
        wordsB: chunk.wordsB,
        description: `Inserted text on Page ${chunk.wordsB[0]?.pageNumber ?? 1}`,
        boxB: boundingBox(chunk.wordsB),
      });
    } else if (chunk.type === 'delete') {
      finalChanges.push({
        id: nextId('delete'),
        type: 'delete',
        pageA: chunk.wordsA[0]?.pageNumber,
        originalText: chunk.wordsA.map((w) => w.text).join(' '),
        wordsA: chunk.wordsA,
        description: `Deleted text on Page ${chunk.wordsA[0]?.pageNumber ?? 1}`,
        boxA: boundingBox(chunk.wordsA),
      });
    } else if (chunk.type === 'move') {
      finalChanges.push({
        id: nextId('move'),
        type: 'move',
        pageA: chunk.wordsA[0]?.pageNumber,
        pageB: chunk.wordsB[0]?.pageNumber,
        originalText: chunk.wordsA.map((w) => w.text).join(' '),
        revisedText: chunk.wordsB.map((w) => w.text).join(' '),
        wordsA: chunk.wordsA,
        wordsB: chunk.wordsB,
        movedFromPage: chunk.wordsA[0]?.pageNumber,
        movedToPage: chunk.wordsB[0]?.pageNumber,
        description: `Clause moved from Page ${chunk.wordsA[0]?.pageNumber ?? 1} to Page ${chunk.wordsB[0]?.pageNumber ?? 1}`,
        boxA: boundingBox(chunk.wordsA),
        boxB: boundingBox(chunk.wordsB),
      });
    }
  }

  // 5. Aggregate summaries per page and overall
  let insertCount = 0;
  let deleteCount = 0;
  let moveCount = 0;
  let formatCount = 0;
  const changedPagesASet = new Set<number>();
  const changedPagesBSet = new Set<number>();

  for (const chg of finalChanges) {
    if (chg.type === 'insert') insertCount++;
    else if (chg.type === 'delete') deleteCount++;
    else if (chg.type === 'move') moveCount++;
    else if (chg.type === 'format') formatCount++;

    if (chg.type !== 'format') {
      if (chg.pageA !== undefined) changedPagesASet.add(chg.pageA);
      if (chg.pageB !== undefined) changedPagesBSet.add(chg.pageB);
    }
  }

  const pageSummariesA: PageDiffSummary[] = [];
  for (let p = 1; p <= pageCountA; p++) {
    const pageChanges = finalChanges.filter((c) => c.pageA === p);
    const ins = pageChanges.filter((c) => c.type === 'insert').length;
    const del = pageChanges.filter((c) => c.type === 'delete').length;
    const mov = pageChanges.filter((c) => c.type === 'move').length;
    const fmt = pageChanges.filter((c) => c.type === 'format').length;
    pageSummariesA.push({
      pageNumber: p,
      insertCount: ins,
      deleteCount: del,
      moveCount: mov,
      formatCount: fmt,
      hasSubstantiveChanges: ins + del + mov > 0,
    });
  }

  const pageSummariesB: PageDiffSummary[] = [];
  for (let p = 1; p <= pageCountB; p++) {
    const pageChanges = finalChanges.filter((c) => c.pageB === p);
    const ins = pageChanges.filter((c) => c.type === 'insert').length;
    const del = pageChanges.filter((c) => c.type === 'delete').length;
    const mov = pageChanges.filter((c) => c.type === 'move').length;
    const fmt = pageChanges.filter((c) => c.type === 'format').length;
    pageSummariesB.push({
      pageNumber: p,
      insertCount: ins,
      deleteCount: del,
      moveCount: mov,
      formatCount: fmt,
      hasSubstantiveChanges: ins + del + mov > 0,
    });
  }

  const summary: PdfDiffSummary = {
    docAName,
    docBName,
    pageCountA,
    pageCountB,
    totalWordsA: wordsA.length,
    totalWordsB: wordsB.length,
    totalChanges: finalChanges.length,
    insertions: insertCount,
    deletions: deleteCount,
    moves: moveCount,
    formatOnly: formatCount,
    changedPagesA: Array.from(changedPagesASet).sort((a, b) => a - b),
    changedPagesB: Array.from(changedPagesBSet).sort((a, b) => a - b),
    pageSummariesA,
    pageSummariesB,
  };

  return {
    summary,
    changes: finalChanges,
    streamA: wordsA,
    streamB: wordsB,
  };
}

interface RawChunk {
  type: 'equal' | 'insert' | 'delete' | 'move';
  wordsA: DiffWord[];
  wordsB: DiffWord[];
}

function boundingBox(
  words: DiffWord[],
):
  | { page: number; x: number; y: number; width: number; height: number }
  | undefined {
  if (words.length === 0) return undefined;
  const page = words[0].pageNumber;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const w of words) {
    if (w.pageNumber === page) {
      if (w.x < minX) minX = w.x;
      if (w.x + w.width > maxX) maxX = w.x + w.width;
      if (w.y < minY) minY = w.y;
      if (w.y + w.height > maxY) maxY = w.y + w.height;
    }
  }

  return {
    page,
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.max(Math.round(maxX - minX), 10),
    height: Math.max(Math.round(maxY - minY), 10),
  };
}

function createFormatChange(
  id: string,
  wordsA: DiffWord[],
  wordsB: DiffWord[],
): PdfDiffChange {
  const pA = wordsA[0]?.pageNumber ?? 1;
  const pB = wordsB[0]?.pageNumber ?? 1;
  const boldChange = wordsA[0]?.bold !== wordsB[0]?.bold;
  const fontDesc = boldChange
    ? wordsB[0]?.bold
      ? 'Formatting changed: style set to bold'
      : 'Formatting changed: bold style removed'
    : `Formatting changed: font size changed from ${wordsA[0]?.fontSize.toFixed(1)}pt to ${wordsB[0]?.fontSize.toFixed(1)}pt`;

  return {
    id,
    type: 'format',
    pageA: pA,
    pageB: pB,
    originalText: wordsA.map((w) => w.text).join(' '),
    revisedText: wordsB.map((w) => w.text).join(' '),
    wordsA,
    wordsB,
    description: fontDesc,
    boxA: boundingBox(wordsA),
    boxB: boundingBox(wordsB),
  };
}

/**
 * Move detection algorithm:
 * Identifies deleted blocks that reappear identically in inserted blocks.
 * Turns delete + insert into 'move'.
 */
function detectMoves(chunks: RawChunk[]): RawChunk[] {
  const result: RawChunk[] = [...chunks];

  const deleteIndices: number[] = [];
  const insertIndices: number[] = [];

  for (let i = 0; i < result.length; i++) {
    // Minimum 3 words to classify as a moved clause (avoids spurious single-word moves like "the" or "and")
    if (result[i].type === 'delete' && result[i].wordsA.length >= 3) {
      deleteIndices.push(i);
    } else if (result[i].type === 'insert' && result[i].wordsB.length >= 3) {
      insertIndices.push(i);
    }
  }

  const matchedInserts = new Set<number>();

  for (const delIdx of deleteIndices) {
    const delChunk = result[delIdx];
    const delNorm = delChunk.wordsA.map((w) => w.normalizedText).join(' ');

    for (const insIdx of insertIndices) {
      if (matchedInserts.has(insIdx)) continue;
      const insChunk = result[insIdx];
      const insNorm = insChunk.wordsB.map((w) => w.normalizedText).join(' ');

      if (delNorm === insNorm) {
        // Exact match found! Convert both to a moved pair.
        matchedInserts.add(insIdx);
        result[delIdx] = {
          type: 'move',
          wordsA: delChunk.wordsA,
          wordsB: insChunk.wordsB,
        };
        // Mark the insert chunk as consumed so it doesn't double-count
        result[insIdx] = {
          type: 'equal', // Neutralized
          wordsA: [],
          wordsB: [],
        };
        break;
      }
    }
  }

  // Filter out neutralized empty chunks
  return result.filter((c) => c.wordsA.length > 0 || c.wordsB.length > 0);
}

/**
 * Fast Hunt-Szymanski / Myers alignment on word sequences.
 */
function alignWords(
  wordsA: DiffWord[],
  wordsB: DiffWord[],
): Array<{ type: 'equal' | 'insert' | 'delete'; a?: DiffWord; b?: DiffWord }> {
  const n = wordsA.length;
  const m = wordsB.length;

  // Trim common prefix
  let prefix = 0;
  while (
    prefix < n &&
    prefix < m &&
    wordsA[prefix].normalizedText === wordsB[prefix].normalizedText
  ) {
    prefix++;
  }

  // Trim common suffix
  let suffix = 0;
  while (
    suffix < n - prefix &&
    suffix < m - prefix &&
    wordsA[n - 1 - suffix].normalizedText ===
      wordsB[m - 1 - suffix].normalizedText
  ) {
    suffix++;
  }

  const midA = wordsA.slice(prefix, n - suffix);
  const midB = wordsB.slice(prefix, m - suffix);

  const midAlignment = lcsDiff(midA, midB);

  const result: Array<{
    type: 'equal' | 'insert' | 'delete';
    a?: DiffWord;
    b?: DiffWord;
  }> = [];

  for (let i = 0; i < prefix; i++) {
    result.push({ type: 'equal', a: wordsA[i], b: wordsB[i] });
  }

  result.push(...midAlignment);

  for (let i = 0; i < suffix; i++) {
    const a = wordsA[n - suffix + i];
    const b = wordsB[m - suffix + i];
    result.push({ type: 'equal', a, b });
  }

  return result;
}

function lcsDiff(
  wordsA: DiffWord[],
  wordsB: DiffWord[],
): Array<{ type: 'equal' | 'insert' | 'delete'; a?: DiffWord; b?: DiffWord }> {
  const n = wordsA.length;
  const m = wordsB.length;

  if (n === 0) {
    return wordsB.map((b) => ({ type: 'insert', b }));
  }
  if (m === 0) {
    return wordsA.map((a) => ({ type: 'delete', a }));
  }

  // If search space is small to medium, compute DP LCS matrix
  if (n * m <= 10_000_000) {
    // Flatten 1D array to save memory
    const dp = new Uint32Array((n + 1) * (m + 1));
    const width = m + 1;

    for (let i = 1; i <= n; i++) {
      const aNorm = wordsA[i - 1].normalizedText;
      for (let j = 1; j <= m; j++) {
        if (aNorm === wordsB[j - 1].normalizedText) {
          dp[i * width + j] = dp[(i - 1) * width + (j - 1)] + 1;
        } else {
          const top = dp[(i - 1) * width + j];
          const left = dp[i * width + (j - 1)];
          dp[i * width + j] = top > left ? top : left;
        }
      }
    }

    // Backtrack
    const aligned: Array<{
      type: 'equal' | 'insert' | 'delete';
      a?: DiffWord;
      b?: DiffWord;
    }> = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
      if (
        i > 0 &&
        j > 0 &&
        wordsA[i - 1].normalizedText === wordsB[j - 1].normalizedText
      ) {
        aligned.push({ type: 'equal', a: wordsA[i - 1], b: wordsB[j - 1] });
        i--;
        j--;
      } else if (
        j > 0 &&
        (i === 0 || dp[i * width + (j - 1)] >= dp[(i - 1) * width + j])
      ) {
        aligned.push({ type: 'insert', b: wordsB[j - 1] });
        j--;
      } else if (i > 0) {
        aligned.push({ type: 'delete', a: wordsA[i - 1] });
        i--;
      }
    }

    return aligned.reverse();
  }

  // Fallback for massive docs: word index map
  const bIndexMap = new Map<string, number[]>();
  for (let j = 0; j < m; j++) {
    const key = wordsB[j].normalizedText;
    if (!bIndexMap.has(key)) bIndexMap.set(key, []);
    bIndexMap.get(key)!.push(j);
  }

  let lastJ = 0;
  const aligned: Array<{
    type: 'equal' | 'insert' | 'delete';
    a?: DiffWord;
    b?: DiffWord;
  }> = [];

  for (let i = 0; i < n; i++) {
    const key = wordsA[i].normalizedText;
    const candidates = bIndexMap.get(key);
    const nextJ = candidates?.find((cand) => cand >= lastJ);

    if (nextJ !== undefined) {
      while (lastJ < nextJ) {
        aligned.push({ type: 'insert', b: wordsB[lastJ] });
        lastJ++;
      }
      aligned.push({ type: 'equal', a: wordsA[i], b: wordsB[nextJ] });
      lastJ = nextJ + 1;
    } else {
      aligned.push({ type: 'delete', a: wordsA[i] });
    }
  }

  while (lastJ < m) {
    aligned.push({ type: 'insert', b: wordsB[lastJ] });
    lastJ++;
  }

  return aligned;
}

function buildDiffChunks(
  alignment: Array<{
    type: 'equal' | 'insert' | 'delete';
    a?: DiffWord;
    b?: DiffWord;
  }>,
  _wordsA: DiffWord[],
  _wordsB: DiffWord[],
): RawChunk[] {
  const chunks: RawChunk[] = [];
  let curType: 'equal' | 'insert' | 'delete' | null = null;
  let curA: DiffWord[] = [];
  let curB: DiffWord[] = [];

  for (const item of alignment) {
    if (item.type !== curType) {
      if (curType !== null) {
        chunks.push({ type: curType, wordsA: curA, wordsB: curB });
        curA = [];
        curB = [];
      }
      curType = item.type;
    }

    if (item.a) curA.push(item.a);
    if (item.b) curB.push(item.b);
  }

  if (curType !== null && (curA.length > 0 || curB.length > 0)) {
    chunks.push({ type: curType, wordsA: curA, wordsB: curB });
  }

  return chunks;
}
