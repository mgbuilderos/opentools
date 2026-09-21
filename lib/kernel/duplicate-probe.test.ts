import { expect, it } from 'vitest';
import { runDateOperation } from '@/lib/tools/date-workbench';
import { runAdvancedDeveloperOperation } from '@/lib/tools/developer-advanced-workbench';
import { runDeveloperDataOperation } from '@/lib/tools/developer-data-workbench';
import { runDocumentOperation } from '@/lib/tools/document-workbench';
import { runFinanceOperation } from '@/lib/tools/finance-business-workbench';
import { runSpreadsheetOperation } from '@/lib/tools/spreadsheet-workbench';
import { runWebOperation } from '@/lib/tools/web-workbench';

it('keeps the nine measured duplicate-operation observations current', async () => {
  const rows = [
    {
      id: 'csv-to-json',
      a: await runDeveloperDataOperation('csv-to-json', {
        input: 'name,note\nAda,"hello, world"',
      }),
      b: runSpreadsheetOperation('csv-to-json', {
        input: 'name,note\nAda,"hello, world"',
      }),
    },
    {
      id: 'json-to-csv',
      a: await runDeveloperDataOperation('json-to-csv', {
        input: '[{"name":"Ada","note":"hello, world"}]',
      }),
      b: runSpreadsheetOperation('json-to-csv', {
        input: '[{"name":"Ada","note":"hello, world"}]',
      }),
    },
    {
      id: 'query-string-builder',
      a: await runDeveloperDataOperation('query-string-builder', {
        input: '{"q":"hello world","tag":["a","b"]}',
      }),
      b: runWebOperation('query-string-builder', {
        pairs: 'q=hello world\ntag=a\ntag=b',
      }),
    },
    {
      id: 'query-string-parser',
      a: await runDeveloperDataOperation('query-string-parser', {
        input: '?q=hello+world&tag=a&tag=b',
      }),
      b: runWebOperation('query-string-parser', {
        query: '?q=hello+world&tag=a&tag=b',
      }),
    },
    {
      id: 'regex-tester',
      a: await runDeveloperDataOperation('regex-tester', {
        input: 'Ada 42, Lin 7',
        pattern: '(\\w+) (\\d+)',
        flags: 'g',
      }),
      b: await runAdvancedDeveloperOperation('regex-tester', {
        testText: 'Ada 42, Lin 7',
        pattern: '(\\w+) (\\d+)',
        flags: 'g',
      }),
    },
    {
      id: 'url-normalizer',
      a: await runDeveloperDataOperation('url-normalizer', {
        input: 'HTTPS://Example.COM:443/a?b=2&a=1#frag',
      }),
      b: runWebOperation('url-normalizer', {
        url: 'HTTPS://Example.COM:443/a?b=2&a=1#frag',
      }),
    },
    {
      id: 'invoice-generator',
      a: runDocumentOperation('invoice-generator', {
        issuer: 'Example Studio',
        recipient: 'Example Client',
        number: 'INV-42',
        date: '2026-09-21',
        currency: '$',
        items: 'Research | 2 | 100',
        tax: '10',
        notes: 'Net 15',
      }),
      b: runFinanceOperation('invoice-generator', {
        sender: 'Example Studio',
        client: 'Example Client',
        invoiceNumber: 'INV-42',
        invoiceDate: '2026-09-21',
        dueDate: '2026-10-06',
        currency: 'USD',
        items: 'Research | 2 | 100',
        taxRate: '10',
        discount: '0',
        notes: 'Net 15',
      }),
    },
    {
      id: 'receipt-generator',
      a: runDocumentOperation('receipt-generator', {
        issuer: 'Example Studio',
        recipient: 'Example Client',
        number: 'REC-42',
        date: '2026-09-21',
        currency: '$',
        items: 'Research | 2 | 100',
        tax: '10',
        notes: 'Paid',
        paidBy: 'UPI-42',
      }),
      b: runFinanceOperation('receipt-generator', {
        receiptNumber: 'REC-42',
        paymentDate: '2026-09-21',
        payer: 'Example Client',
        payee: 'Example Studio',
        amount: '220',
        currency: 'USD',
        paymentMethod: 'UPI',
        transactionReference: 'UPI-42',
        description: 'Research',
      }),
    },
    {
      id: 'timesheet-calculator',
      a: runDateOperation('timesheet-calculator', {
        shifts: '09:00-17:30/30\n09:15-18:00/45',
      }),
      b: runFinanceOperation('timesheet-calculator', {
        employeeName: 'Ada',
        clientProject: 'Example',
        weekEnding: '2026-09-21',
        hourlyRate: '100',
        overtimeRateMultiplier: '1.5',
        standardWeeklyLimit: '40',
        currency: 'USD',
        dailyEntries:
          'Mon | 09:00 | 17:30 | 30 | Research\nTue | 09:15 | 18:00 | 45 | Research',
      }),
    },
  ];

  expect(rows.slice(0, 4).map((row) => [row.id, row.a === row.b])).toEqual([
    ['csv-to-json', true],
    ['json-to-csv', true],
    ['query-string-builder', true],
    ['query-string-parser', true],
  ]);

  const regex = rows[4];
  expect(regex.a).not.toBe(regex.b);
  expect(regex.a).toContain('"count": 2');
  expect(regex.b).toContain('Total Matches Found: 2');

  expect(rows[5]).toMatchObject({
    a: 'https://example.com/a?b=2&a=1#frag',
    b: 'https://example.com/a?a=1&b=2',
  });

  for (const row of rows.slice(6)) expect(row.a).not.toBe(row.b);
  expect(rows[6].a).toContain('**Total:** $220.00');
  expect(rows[6].b).toContain('220.00');
  expect(rows[7].a).toContain('**Total:** $220.00');
  expect(rows[7].b).toContain('220.00');
  expect(rows[8].a).toBe('16.00 hours · 16h 0m');
  expect(rows[8].b).toContain('16.00');
});
