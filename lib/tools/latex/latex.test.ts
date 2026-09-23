import { describe, expect, it } from 'vitest';
import {
  buildLatexAligned,
  buildLatexCases,
  buildLatexMatrix,
  countLatexWords,
  normalizeDoi,
  normalizeTitle,
  parseBibTeX,
  processBibTeX,
  readLatexTable,
  searchLatexSymbols,
} from './index';

describe('BibTeX workbench engine', () => {
  const sampleBib = `
@article{vaswani2017attention,
  title = {Attention Is All You Need},
  author = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  journal = {Advances in Neural Information Processing Systems},
  year = {2017},
  pages = {5998-6008},
  month = {},
  doi = {https://doi.org/10.48550/arXiv.1706.03762}
}

@article{vaswani_duplicate,
  title = {Attention is all you need},
  author = {Vaswani, A.},
  journal = {NeurIPS},
  year = {2017},
  doi = {10.48550/arXiv.1706.03762}
}

@article{incomplete_entry,
  title = {Incomplete paper without author or year}
}
  `;

  it('parses BibTeX entries accurately', () => {
    const entries = parseBibTeX(sampleBib);
    expect(entries).toHaveLength(3);
    expect(entries[0].citationKey).toBe('vaswani2017attention');
    expect(entries[0].type).toBe('article');
    expect(entries[0].fields.title).toBe('Attention Is All You Need');
  });

  it('normalizes DOIs and titles', () => {
    expect(normalizeDoi('https://doi.org/10.1000/182')).toBe('10.1000/182');
    expect(normalizeDoi('doi: 10.1000/182')).toBe('10.1000/182');
    expect(normalizeTitle('Attention Is All You Need!')).toBe(
      'attention is all you need',
    );
  });

  it('validates, normalizes page ranges, cleans scholar junk, and deduplicates', () => {
    const result = processBibTeX(sampleBib, {
      deduplicate: true,
      normalizePageRanges: true,
      cleanScholarJunk: true,
      sortBy: 'key',
    });

    // 1 dupe removed, 2 unique entries remain
    expect(result.metrics.duplicatesRemoved).toBe(1);
    expect(result.entries).toHaveLength(2);

    const vaswani = result.entries.find(
      (e) => e.citationKey === 'vaswani2017attention',
    );
    expect(vaswani).toBeDefined();

    // Page range normalized 5998-6008 -> 5998--6008
    expect(vaswani?.fields.pages).toBe('5998--6008');

    // Empty month stripped
    expect(vaswani?.fields.month).toBeUndefined();

    // Incomplete entry flagged with error
    const issue = result.issues.find(
      (i) => i.citationKey === 'incomplete_entry',
    );
    expect(issue).toBeDefined();
    expect(issue?.field).toBe('author');
  });
});

describe('LaTeX word count engine', () => {
  const doc = `
\\documentclass{article}
\\usepackage{amsmath}
% This is a comment that must not be counted in prose
\\title{My Paper Title}
\\begin{document}
\\section{Introduction to Algorithms}
This is a standard paragraph with ten words for checking accuracy.

Here is an inline math formula $E = mc^2$ and a display equation:
\\begin{equation}
  \\int_0^1 x^2 \\, dx = \\frac{1}{3}
\\end{equation}

We reference the method \\cite{vaswani2017attention} and cite Figure~\\ref{fig:arch}.
\\textbf{Bold text} and \\textit{italic text} should be counted properly.

\\begin{figure}
  \\caption{A detailed description of the model architecture.}
\\end{figure}
\\end{document}
  `;

  it('counts prose body words, headers, and captions separately from math and comments', () => {
    const res = countLatexWords(doc);

    // Comments not counted
    // Section header: "Introduction to Algorithms" = 3 words
    expect(res.headerWords).toBe(3);

    // Caption: "A detailed description of the model architecture" = 7 words
    expect(res.captionWords).toBe(7);

    // Math elements counted (1 inline + 1 display = 2)
    expect(res.mathElements).toBe(2);

    // Body words counted (bold/italic unwrapped, cite keys excluded)
    expect(res.bodyWords).toBeGreaterThan(15);
    expect(res.totalWords).toBe(
      res.bodyWords + res.headerWords + res.captionWords,
    );
  });
});

describe('LaTeX symbols catalog', () => {
  it('searches symbols by query and category', () => {
    const greek = searchLatexSymbols('alpha', 'greek');
    expect(greek.length).toBeGreaterThan(0);
    expect(greek[0].command).toBe('\\alpha');

    const arrows = searchLatexSymbols('arrow', 'arrows');
    expect(arrows.length).toBeGreaterThan(3);

    const intSym = searchLatexSymbols('integral');
    expect(intSym.some((s) => s.command === '\\int')).toBe(true);
  });
});

describe('LaTeX equation and matrix builder', () => {
  it('builds pmatrix, bmatrix, and vmatrix environments', () => {
    const pmat = buildLatexMatrix({
      type: 'pmatrix',
      rows: 2,
      cols: 2,
      data: [
        ['1', '2'],
        ['3', '4'],
      ],
    });
    expect(pmat).toContain('\\begin{pmatrix}');
    expect(pmat).toContain('1 & 2');
    expect(pmat).toContain('3 & 4');
    expect(pmat).toContain('\\end{pmatrix}');
  });

  it('builds piecewise cases environment', () => {
    const cases = buildLatexCases('f(x)', [
      { expression: 'x^2', condition: 'x \\ge 0' },
      { expression: '-x', condition: 'x < 0' },
    ]);
    expect(cases).toContain('f(x) = \\begin{cases}');
    expect(cases).toContain('x^2 & \\text{if } x \\ge 0');
    expect(cases).toContain('\\end{cases}');
  });

  it('builds aligned derivations', () => {
    const aligned = buildLatexAligned([
      { left: '2x + 3y', relation: '=', right: '7', comment: 'Equation 1' },
      { left: '4x - y', relation: '=', right: '1', comment: 'Equation 2' },
    ]);
    expect(aligned).toContain('\\begin{aligned}');
    expect(aligned).toContain('2x + 3y &= 7 && \\text{(Equation 1)}');
    expect(aligned).toContain('\\end{aligned}');
  });
});

describe('LaTeX table reader', () => {
  const latexTable = `
\\begin{table}
\\centering
\\begin{tabular}{lrr}
\\toprule
Item & Qty & Price \\\\
\\midrule
Apples & 10 & 2.50 \\\\
Bananas & 5 & 1.20 \\\\
\\bottomrule
\\end{tabular}
\\end{table}
  `;

  it('parses LaTeX tabular and converts to CSV, Markdown, and JSON', () => {
    const res = readLatexTable(latexTable);
    expect(res.metrics.rowCount).toBe(2);
    expect(res.metrics.colCount).toBe(3);
    expect(res.csv).toContain('Item,Qty,Price');
    expect(res.csv).toContain('Apples,10,2.50');
    expect(res.markdown).toMatch(/\|\s*Item\s*\|\s*Qty\s*\|\s*Price\s*\|/);
    expect(res.json).toContain('"Item": "Apples"');
  });
});
