import { describe, expect, it } from 'vitest';
import {
  convertTable,
  detectTableFormat,
  emitTable,
  escapeLatex,
  parseTable,
  unescapeLatex,
} from './index';

describe('Table notation engine', () => {
  const sampleTable = {
    headers: ['Name', 'Score', 'Status'],
    rows: [
      ['Ada', '91', 'Pass'],
      ['Lin', '84', 'Pass'],
      ['Grace', '99', 'Pass'],
    ],
    alignments: ['left' as const, 'right' as const, 'center' as const],
    caption: 'Student Results',
    label: 'tab:results',
  };

  it('preserves LaTeX escaping verbatim for special characters', () => {
    expect(escapeLatex('Cost_INR')).toBe('Cost\\_INR');
    expect(escapeLatex('A4 & letter')).toBe('A4 \\& letter');
    expect(escapeLatex('30% off')).toBe('30\\% off');
    expect(escapeLatex('$100')).toBe('\\$100');
    expect(escapeLatex('#1')).toBe('\\#1');
    expect(escapeLatex('~approx')).toBe('\\textasciitilde{}approx');
    expect(escapeLatex('x^2')).toBe('x\\textasciicircum{}2');
    expect(escapeLatex('C:\\path')).toBe('C:\\textbackslash{}path');
    expect(escapeLatex('{braces}')).toBe('\\{braces\\}');

    // Unescape round-trip
    expect(unescapeLatex('Cost\\_INR')).toBe('Cost_INR');
    expect(unescapeLatex('A4 \\& letter')).toBe('A4 & letter');
    expect(unescapeLatex('30\\% off')).toBe('30% off');
    expect(unescapeLatex('\\$100')).toBe('$100');
    expect(unescapeLatex('\\#1')).toBe('#1');
    expect(unescapeLatex('\\textasciitilde{}approx')).toBe('~approx');
    expect(unescapeLatex('x\\textasciicircum{}2')).toBe('x^2');
    expect(unescapeLatex('C:\\textbackslash{}path')).toBe('C:\\path');
  });

  it('emits booktabs LaTeX by default and supports plain tabular', () => {
    const booktabs = emitTable(sampleTable, 'latex', {
      latex: { style: 'booktabs', environment: 'plain' },
    });
    expect(booktabs).toContain('\\toprule');
    expect(booktabs).toContain('\\midrule');
    expect(booktabs).toContain('\\bottomrule');
    expect(booktabs).not.toContain('\\hline');

    const tabular = emitTable(sampleTable, 'latex', {
      latex: { style: 'tabular', environment: 'plain' },
    });
    expect(tabular).toContain('\\hline');
    expect(tabular).not.toContain('\\toprule');
  });

  it('supports caption, label, and longtable in LaTeX', () => {
    const tableFloat = emitTable(sampleTable, 'latex', {
      latex: { environment: 'table', placement: 'htbp' },
    });
    expect(tableFloat).toContain('\\begin{table}[htbp]');
    expect(tableFloat).toContain('\\caption{Student Results}');
    expect(tableFloat).toContain('\\label{tab:results}');
    expect(tableFloat).toContain('\\end{table}');

    const longtable = emitTable(sampleTable, 'latex', {
      latex: { environment: 'longtable' },
    });
    expect(longtable).toContain('\\begin{longtable}{lrc}');
    expect(longtable).toContain('\\endfirsthead');
    expect(longtable).toContain('\\endhead');
    expect(longtable).toContain('\\end{longtable}');
  });

  it('supports decimal alignment in LaTeX with siunitx S column', () => {
    const decimalTable = {
      headers: ['Item', 'Amount'],
      rows: [
        ['Alpha', '12.34'],
        ['Beta', '104.5'],
      ],
      alignments: ['left' as const, 'decimal' as const],
    };
    const latex = emitTable(decimalTable, 'latex', {
      latex: { useSiunitx: true, environment: 'plain' },
    });
    expect(latex).toContain('\\begin{tabular}{lS}');
  });

  it('round-trips CSV -> LaTeX -> CSV', () => {
    const csvSource = 'Name,Score,Status\nAda,91,Pass\nLin,84,Pass';
    const parsed = parseTable(csvSource, 'csv');
    const latex = emitTable(parsed, 'latex', {
      latex: { style: 'booktabs', environment: 'plain' },
    });
    const parsedBack = parseTable(latex, 'latex');
    const csvOutput = emitTable(parsedBack, 'csv');
    expect(csvOutput).toBe(csvSource);
  });

  it('round-trips CSV -> Markdown -> CSV', () => {
    const csvSource = 'Name,Score\nAda,91\nLin,84';
    const parsed = parseTable(csvSource, 'csv');
    const md = emitTable(parsed, 'markdown');
    expect(md).toContain('| Name | Score |');
    const parsedBack = parseTable(md, 'markdown');
    const csvOutput = emitTable(parsedBack, 'csv');
    expect(csvOutput).toBe(csvSource);
  });

  it('round-trips CSV -> HTML -> CSV', () => {
    const csvSource = 'City,Temp\nLondon,18\nTokyo,26';
    const parsed = parseTable(csvSource, 'csv');
    const html = emitTable(parsed, 'html');
    expect(html).toContain('<table>');
    expect(html).toContain('City</th>');
    const parsedBack = parseTable(html, 'html');
    const csvOutput = emitTable(parsedBack, 'csv');
    expect(csvOutput).toBe(csvSource);
  });

  it('round-trips CSV -> JSON -> CSV', () => {
    const csvSource = 'Name,Role\nAda,Admin\nBob,User';
    const parsed = parseTable(csvSource, 'csv');
    const json = emitTable(parsed, 'json', { json: { pretty: false } });
    const parsedBack = parseTable(json, 'json');
    const csvOutput = emitTable(parsedBack, 'csv');
    expect(csvOutput).toBe(csvSource);
  });

  it('round-trips CSV -> SQL -> CSV', () => {
    const csvSource = 'id,name,score\n1,Ada,95\n2,Lin,88';
    const parsed = parseTable(csvSource, 'csv');
    const sql = emitTable(parsed, 'sql', {
      sql: { tableName: 'students', includeCreateTable: true },
    });
    expect(sql).toContain('CREATE TABLE "students"');
    expect(sql).toContain('INSERT INTO "students" ("id", "name", "score") VALUES');
    const parsedBack = parseTable(sql, 'sql');
    const csvOutput = emitTable(parsedBack, 'csv');
    expect(csvOutput).toBe(csvSource);
  });

  it('round-trips CSV -> AsciiDoc -> CSV', () => {
    const csvSource = 'Tool,Stars\nGit,100\nLinux,200';
    const parsed = parseTable(csvSource, 'csv');
    const adoc = emitTable(parsed, 'asciidoc');
    expect(adoc).toContain('|===');
    const parsedBack = parseTable(adoc, 'asciidoc');
    const csvOutput = emitTable(parsedBack, 'csv');
    expect(csvOutput).toBe(csvSource);
  });

  it('round-trips CSV -> reStructuredText -> CSV', () => {
    const csvSource = 'ColA,ColB\nValA,ValB\nValC,ValD';
    const parsed = parseTable(csvSource, 'csv');
    const rst = emitTable(parsed, 'rst');
    expect(rst).toContain('====');
    const parsedBack = parseTable(rst, 'rst');
    const csvOutput = emitTable(parsedBack, 'csv');
    expect(csvOutput).toBe(csvSource);
  });

  it('auto-detects table formats accurately', () => {
    expect(detectTableFormat('a,b,c\n1,2,3')).toBe('csv');
    expect(detectTableFormat('a\tb\tc\n1\t2\t3')).toBe('tsv');
    expect(detectTableFormat('| a | b |\n|---|---|')).toBe('markdown');
    expect(detectTableFormat('\\begin{tabular}{ll}\na & b \\\\\n\\end{tabular}')).toBe(
      'latex',
    );
    expect(detectTableFormat('<table><tr><th>A</th></tr></table>')).toBe('html');
    expect(detectTableFormat('[{"a":1,"b":2}]')).toBe('json');
    expect(detectTableFormat('INSERT INTO users (a, b) VALUES (1, 2);')).toBe(
      'sql',
    );
    expect(detectTableFormat('[cols="1,1"]\n|===\n| A | B\n|===')).toBe('asciidoc');
  });

  it('refuses ragged markdown table by name (G7)', () => {
    const ragged = '| A | B |\n|---|---|\n| 1 | 2 | 3 |';
    expect(() => parseTable(ragged, 'markdown')).toThrow(
      'Ragged Markdown table row at line 3: expected 2 columns, found 3.',
    );
  });

  it('refuses empty input (G7)', () => {
    expect(() => parseTable('', 'csv')).toThrow('CSV input is empty.');
  });
});
