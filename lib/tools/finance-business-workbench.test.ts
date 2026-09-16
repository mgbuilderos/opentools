import { describe, expect, it } from 'vitest';

import {
  FINANCE_OPERATIONS,
  runFinanceOperation,
} from './finance-business-workbench';

function defaults(id: string) {
  const operation = FINANCE_OPERATIONS.find((item) => item.id === id);
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('finance and business workbench', () => {
  it('publishes 56 unique operations whose defaults all run', () => {
    expect(FINANCE_OPERATIONS).toHaveLength(56);
    expect(new Set(FINANCE_OPERATIONS.map((item) => item.id)).size).toBe(56);
    for (const operation of FINANCE_OPERATIONS) {
      expect(
        runFinanceOperation(operation.id, defaults(operation.id)),
      ).not.toBe('');
      expect(operation.notice.length).toBeGreaterThan(20);
    }
  });

  it('calculates zero-rate and fixed-rate amortizing payments', () => {
    expect(
      runFinanceOperation('loan-emi-calculator', {
        principal: '1200',
        annualRate: '0',
        years: '1',
      }),
    ).toContain('Monthly principal + interest: 100');
    const mortgage = runFinanceOperation('mortgage-calculator', {
      principal: '100000',
      annualRate: '6',
      years: '30',
    });
    expect(Number(mortgage.match(/interest: ([\d.]+)/u)?.[1])).toBeCloseTo(
      599.5505,
      4,
    );
  });

  it('calculates simple, compound, contribution, and present values', () => {
    expect(
      runFinanceOperation('simple-interest-calculator', {
        principal: '1000',
        annualRate: '10',
        years: '2',
      }),
    ).toContain('Final amount: 1200');
    expect(
      runFinanceOperation('compound-interest-calculator', {
        principal: '1000',
        annualRate: '10',
        years: '2',
        frequency: '1',
      }),
    ).toContain('Future value: 1210');
    expect(
      runFinanceOperation('sip-calculator', {
        monthly: '100',
        annualRate: '0',
        years: '1',
      }),
    ).toContain('Projected value: 1200');
    expect(
      runFinanceOperation('present-value-calculator', {
        future: '1210',
        annualRate: '10',
        years: '2',
        frequency: '1',
      }),
    ).toContain('Present value: 1000');
  });

  it('finds periodic and dated return roots for simple cases', () => {
    const irr = runFinanceOperation('irr-calculator', { flows: '-100,110' });
    expect(Number(irr.match(/IRR: ([\d.]+)/u)?.[1])).toBeCloseTo(10, 8);
    const xirr = runFinanceOperation('xirr-calculator', {
      flows: '2026-01-01 | -100\n2027-01-01 | 110',
    });
    expect(Number(xirr.match(/XIRR: ([\d.]+)/u)?.[1])).toBeCloseTo(10, 8);
  });

  it('calculates NPV, CAGR, ROI, and annuity arithmetic', () => {
    expect(
      runFinanceOperation('npv-calculator', {
        rate: '10',
        flows: '-100,110',
      }),
    ).toContain('NPV: 0');
    expect(
      runFinanceOperation('cagr-calculator', {
        beginning: '100',
        ending: '121',
        years: '2',
      }),
    ).toContain('CAGR: 10%');
    expect(
      runFinanceOperation('roi-calculator', { gain: '125', cost: '100' }),
    ).toContain('ROI: 25%');
    expect(
      runFinanceOperation('annuity-calculator', {
        payment: '100',
        rate: '0',
        periods: '12',
      }),
    ).toContain('Future value: 1200');
  });

  it('simulates debt payoff and rejects negative-amortization payments', () => {
    expect(
      runFinanceOperation('debt-payoff-calculator', {
        balance: '1200',
        annualRate: '0',
        payment: '100',
      }),
    ).toContain('Payoff months: 12');
    expect(() =>
      runFinanceOperation('credit-card-payoff-calculator', {
        balance: '1000',
        annualRate: '120',
        payment: '50',
      }),
    ).toThrow('does not exceed');
  });

  it('totals budgets, assets, liabilities, and rate-supplied tax', () => {
    expect(
      runFinanceOperation('net-worth-calculator', {
        assets: 'Cash | 100\nHome | 400',
        liabilities: 'Debt | 200',
      }),
    ).toContain('Net worth: 300');
    expect(
      runFinanceOperation('budget-planner', {
        income: '1000',
        expenses: 'Housing | 400\nFood | 200',
      }),
    ).toContain('Remaining: 400');
    expect(
      runFinanceOperation('gst-calculator', {
        amount: '1000',
        rate: '18',
      }),
    ).toContain('Total: 1180');
  });

  it('calculates markup, margin, break-even, and profit consistently', () => {
    expect(
      runFinanceOperation('markup-calculator', {
        cost: '100',
        markup: '50',
      }),
    ).toContain('Gross margin: 33.3333333333%');
    expect(
      runFinanceOperation('margin-calculator', {
        revenue: '150',
        cost: '100',
      }),
    ).toContain('Gross margin: 33.3333333333%');
    expect(
      runFinanceOperation('break-even-calculator', {
        fixed: '1000',
        price: '15',
        variable: '10',
      }),
    ).toContain('Break-even units (exact): 200');
    expect(
      runFinanceOperation('profit-calculator', {
        revenue: '2000',
        fixed: '500',
        variable: '750',
      }),
    ).toContain('Profit: 750');
    expect(
      runFinanceOperation('profit-calculator', {
        revenue: '0',
        fixed: '500',
        variable: '750',
      }),
    ).toContain('Profit margin: not defined (revenue is zero)');
  });

  it('calculates operating metrics from explicitly supplied definitions', () => {
    expect(
      runFinanceOperation('customer-acquisition-cost-calculator', {
        spend: '1000',
        customers: '10',
      }),
    ).toContain('100');
    expect(
      runFinanceOperation('lifetime-value-calculator', {
        arpu: '100',
        grossMargin: '80',
        churn: '5',
      }),
    ).toContain('Simplified LTV: 1600');
    expect(
      runFinanceOperation('mrr-calculator', {
        plans: 'A | 10 | 100\nB | 5 | 200',
      }),
    ).toContain('MRR: 2000');
    expect(
      runFinanceOperation('runway-calculator', {
        cash: '1000',
        monthlyBurn: '100',
      }),
    ).toContain('10 months');
  });

  it('calculates payment fees, salary breakdowns, mortgage savings, and SaaS MRR', () => {
    const fees = runFinanceOperation('payment-fee-calculator', {
      amount: '1000',
      percentFee: '2.9',
      fixedFee: '0.30',
    });
    expect(fees).toContain('Processing Fee:     29.3');
    expect(fees).toContain('Net Funds Received: 970.7');
    expect(fees).toContain('To receive exact 1000 after fees, invoice:');

    const salary = runFinanceOperation('salary-hourly-converter', {
      salary: '75000',
      hoursPerWeek: '40',
      weeksPerYear: '52',
      taxRate: '20',
    });
    expect(salary).toContain('Gross Annual Salary:     75000');
    expect(salary).toContain('Hourly Rate:');
    expect(salary).toContain('Monthly:');

    const mortgageExtra = runFinanceOperation('mortgage-extra-payment', {
      principal: '300000',
      rate: '6',
      years: '30',
      extraMonthly: '200',
    });
    expect(mortgageExtra).toContain('Accelerated Monthly Payment:');
    expect(mortgageExtra).toContain('Total Interest Saved:');
    expect(mortgageExtra).toContain('Payoff Time Shortened By:');

    const saas = runFinanceOperation('saas-mrr-calculator', {
      startingMrr: '10000',
      monthlyGrowthRate: '10',
      churnRate: '2',
      expansionRate: '2',
      months: '6',
    });
    expect(saas).toContain('Starting MRR: 10000');
    expect(saas).toContain('Ending Projected MRR');
    expect(saas).toContain('Ending Projected ARR');
  });

  it('rejects invalid roots, periods, and contribution margins', () => {
    expect(() =>
      runFinanceOperation('irr-calculator', { flows: '1,2,3' }),
    ).toThrow('negative and one positive');
    expect(() =>
      runFinanceOperation('loan-emi-calculator', {
        principal: '1000',
        annualRate: '5',
        years: '1.1',
      }),
    ).toThrow('whole months');
    expect(() =>
      runFinanceOperation('break-even-calculator', {
        fixed: '1000',
        price: '10',
        variable: '10',
      }),
    ).toThrow('must exceed');
  });

  it('generates zero-egress printable invoices and payment receipts', () => {
    const invoice = runFinanceOperation('invoice-generator', {
      invoiceNumber: 'INV-TEST-99',
      invoiceDate: '2026-09-16',
      dueDate: '2026-09-30',
      sender: 'Acme Studio Inc.',
      client: 'Globex Corp.',
      currency: 'USD',
      items: 'Web Engineering, 20, 100\nDesign System, 1, 500',
      taxRate: '10',
      discount: '100',
      notes: 'Pay via Bank Transfer or UPI.',
    });
    expect(invoice).toContain('INVOICE');
    expect(invoice).toContain('# INV-TEST-99');
    expect(invoice).toContain('Acme Studio Inc.');
    expect(invoice).toContain('Globex Corp.');
    expect(invoice).toContain('Web Engineering');
    expect(invoice).toContain('$2,500.00');
    expect(invoice).toContain('$2,640.00 USD');
    expect(invoice).toContain('@media print');

    const receipt = runFinanceOperation('receipt-generator', {
      receiptNumber: 'REC-TEST-42',
      paymentDate: '2026-09-16',
      payer: 'Sarah Jenkins',
      payee: 'MG Services',
      amount: '750',
      currency: 'INR',
      paymentMethod: 'UPI / Instant Pay',
      transactionReference: 'TXN-998811',
      description: 'Consulting fees',
    });
    expect(receipt).toContain('PAYMENT RECEIPT');
    expect(receipt).toContain('# REC-TEST-42');
    expect(receipt).toContain('PAID IN FULL');
    expect(receipt).toContain('₹750.00');
    expect(receipt).toContain('TXN-998811');

    const timesheet = runFinanceOperation('timesheet-calculator', {
      employeeName: 'Alex Morgan',
      clientProject: 'Acme Corp',
      weekEnding: '2026-09-20',
      hourlyRate: '50',
      overtimeRateMultiplier: '1.5',
      standardWeeklyLimit: '40',
      dailyEntries:
        'Mon | 09:00 | 17:00 | 30 | Design\nTue | 09:00 | 17:00 | 30 | Code',
      currency: 'USD',
    });
    expect(timesheet).toContain('WEEKLY TIMESHEET');
    expect(timesheet).toContain('Alex Morgan');
    expect(timesheet).toContain('Acme Corp');
    expect(timesheet).toContain('7.50 hrs');
    expect(timesheet).toContain('$750.00');
  });
});
