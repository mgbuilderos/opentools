export interface FinanceField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  defaultValue: string;
  options?: readonly { value: string; label: string }[];
}

export interface FinanceOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly FinanceField[];
  notice: string;
  outputExtension?: string;
}

const number = (
  id: string,
  label: string,
  defaultValue: string,
): FinanceField => ({ id, label, type: 'number', defaultValue });
const area = (
  id: string,
  label: string,
  defaultValue: string,
): FinanceField => ({ id, label, type: 'textarea', defaultValue });
const scenarioNotice =
  'Scenario math only—not financial, investment, tax, accounting, or lending advice. Rates, fees, compounding, timing, taxes, insurance, rounding, and provider rules can change the real result.';
const businessNotice =
  'Planning estimate only—not accounting, tax, valuation, or business advice. Use consistent periods and verify definitions against your records and professional requirements.';
const taxNotice =
  'Arithmetic using only the rate you supply. This tool does not determine jurisdiction, classification, exemptions, filing, credits, thresholds, or the legally correct rate.';
const loanFields = () => [
  number('principal', 'Principal', '1000000'),
  number('annualRate', 'Annual rate (%)', '8.5'),
  number('years', 'Term (years)', '20'),
];
const compoundFields = () => [
  number('principal', 'Starting amount', '100000'),
  number('annualRate', 'Annual rate (%)', '8'),
  number('years', 'Years', '10'),
  number('frequency', 'Compounds per year', '12'),
];
const taxFields = () => [
  number('amount', 'Amount before tax', '1000'),
  number('rate', 'Tax rate (%)', '18'),
];

export const FINANCE_OPERATIONS: readonly FinanceOperation[] = [
  {
    id: 'loan-emi-calculator',
    name: 'Loan EMI calculator',
    description:
      'Calculate equal monthly principal-and-interest payment for a fixed-rate amortizing loan.',
    fields: loanFields(),
    notice: scenarioNotice,
  },
  {
    id: 'mortgage-calculator',
    name: 'Mortgage principal & interest calculator',
    description:
      'Calculate fixed monthly principal/interest and total interest.',
    fields: loanFields(),
    notice:
      'Principal-and-interest scenario only. A real housing payment can also include taxes, insurance, mortgage insurance, fees, escrow changes, association fees, and other costs.',
  },
  {
    id: 'simple-interest-calculator',
    name: 'Simple-interest calculator',
    description: 'Calculate I = Prt and final amount.',
    fields: [
      number('principal', 'Principal', '100000'),
      number('annualRate', 'Annual rate (%)', '8'),
      number('years', 'Years', '3'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'compound-interest-calculator',
    name: 'Compound-interest calculator',
    description: 'Calculate compound growth at an explicit annual frequency.',
    fields: compoundFields(),
    notice: scenarioNotice,
  },
  {
    id: 'sip-calculator',
    name: 'Monthly contribution growth calculator',
    description:
      'Project end-of-month contributions at a constant monthly-equivalent return.',
    fields: [
      number('monthly', 'Monthly contribution', '10000'),
      number('annualRate', 'Assumed annual rate (%)', '10'),
      number('years', 'Years', '10'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'lumpsum-investment-calculator',
    name: 'Lump-sum growth calculator',
    description: 'Project a one-time amount with monthly compounding.',
    fields: [
      number('principal', 'Starting amount', '100000'),
      number('annualRate', 'Assumed annual rate (%)', '10'),
      number('years', 'Years', '10'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'recurring-deposit-calculator',
    name: 'Recurring-deposit scenario',
    description:
      'Project fixed end-of-month deposits with an assumed constant rate.',
    fields: [
      number('monthly', 'Monthly deposit', '5000'),
      number('annualRate', 'Annual rate (%)', '7'),
      number('years', 'Years', '5'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'fixed-deposit-calculator',
    name: 'Fixed-deposit scenario',
    description:
      'Project a fixed principal with explicit compounding frequency.',
    fields: compoundFields(),
    notice: scenarioNotice,
  },
  {
    id: 'cagr-calculator',
    name: 'CAGR calculator',
    description:
      'Calculate compound annual growth from beginning value, ending value, and years.',
    fields: [
      number('beginning', 'Beginning value', '100'),
      number('ending', 'Ending value', '180'),
      number('years', 'Years', '5'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'roi-calculator',
    name: 'ROI calculator',
    description: 'Calculate simple return relative to stated cost.',
    fields: [
      number('gain', 'Final value / proceeds', '130000'),
      number('cost', 'Cost', '100000'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'irr-calculator',
    name: 'Periodic IRR calculator',
    description:
      'Find one periodic discount rate whose NPV is approximately zero.',
    fields: [
      area(
        'flows',
        'Cash flows from period 0, comma/newline separated',
        '-1000, 300, 400, 500',
      ),
    ],
    notice:
      'IRR can have no solution or multiple solutions and assumes equally spaced periods. This tool reports the first sign-change root it finds; do not use it alone for decisions.',
  },
  {
    id: 'xirr-calculator',
    name: 'Dated XIRR calculator',
    description: 'Find one annualized rate for irregular dated cash flows.',
    fields: [
      area(
        'flows',
        'YYYY-MM-DD | cash flow',
        '2026-01-01 | -1000\n2026-07-01 | 300\n2027-01-01 | 900',
      ),
    ],
    notice:
      'XIRR can have no solution or multiple solutions. Uses actual day differences divided by 365 and reports the first sign-change root found.',
  },
  {
    id: 'npv-calculator',
    name: 'NPV calculator',
    description: 'Discount equally spaced cash flows to period zero.',
    fields: [
      number('rate', 'Discount rate per period (%)', '8'),
      area('flows', 'Cash flows from period 0', '-1000, 400, 400, 400'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'inflation-calculator',
    name: 'Inflation scenario calculator',
    description:
      'Project the future cost of a current amount under constant inflation.',
    fields: [
      number('amount', 'Current amount', '100000'),
      number('annualRate', 'Inflation rate (%)', '5'),
      number('years', 'Years', '10'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'future-value-calculator',
    name: 'Future-value calculator',
    description:
      'Calculate a lump sum’s future value with periodic compounding.',
    fields: compoundFields(),
    notice: scenarioNotice,
  },
  {
    id: 'present-value-calculator',
    name: 'Present-value calculator',
    description: 'Discount one future amount using periodic compounding.',
    fields: [
      number('future', 'Future amount', '200000'),
      number('annualRate', 'Annual discount rate (%)', '8'),
      number('years', 'Years', '10'),
      number('frequency', 'Compounds per year', '12'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'annuity-calculator',
    name: 'Ordinary-annuity future-value calculator',
    description: 'Project equal end-of-period payments at a constant rate.',
    fields: [
      number('payment', 'Payment per period', '1000'),
      number('rate', 'Rate per period (%)', '0.5'),
      number('periods', 'Number of periods', '120'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'retirement-corpus-calculator',
    name: 'Retirement corpus scenario',
    description:
      'Estimate a retirement-date corpus from expenses, inflation, duration, and return assumptions.',
    fields: [
      number('annualExpense', 'Current annual expense', '600000'),
      number('yearsToRetirement', 'Years until retirement', '20'),
      number('retirementYears', 'Years in retirement', '25'),
      number('inflationRate', 'Annual inflation (%)', '5'),
      number('returnRate', 'Annual return during retirement (%)', '7'),
    ],
    notice:
      'Simplified annual, end-of-year withdrawal scenario. It ignores taxes, fees, longevity uncertainty, sequence risk, irregular expenses, income, and changing inflation/returns. Not retirement advice.',
  },
  {
    id: 'emergency-fund-calculator',
    name: 'Emergency-fund scenario',
    description:
      'Multiply essential monthly expenses by reserve months and add one-off needs.',
    fields: [
      number('monthly', 'Essential monthly expenses', '50000'),
      number('months', 'Reserve months', '6'),
      number('oneOff', 'One-off reserve', '50000'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'savings-goal-calculator',
    name: 'Savings-goal contribution calculator',
    description:
      'Estimate the end-of-month contribution needed to reach a target.',
    fields: [
      number('goal', 'Target amount', '1000000'),
      number('current', 'Current savings', '100000'),
      number('annualRate', 'Assumed annual rate (%)', '7'),
      number('years', 'Years', '5'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'debt-payoff-calculator',
    name: 'Debt-payoff calculator',
    description:
      'Simulate fixed monthly payments on one balance with monthly interest.',
    fields: [
      number('balance', 'Current balance', '200000'),
      number('annualRate', 'Annual rate (%)', '18'),
      number('payment', 'Monthly payment', '10000'),
    ],
    notice:
      'Simplified one-balance simulation. It ignores changing rates, fees, payment allocation rules, daily accrual, taxes, and lender terms. Confirm payoff figures with the lender.',
  },
  {
    id: 'credit-card-payoff-calculator',
    name: 'Credit-card payoff scenario',
    description:
      'Simulate fixed payments using a constant monthly APR fraction.',
    fields: [
      number('balance', 'Current balance', '100000'),
      number('annualRate', 'APR (%)', '36'),
      number('payment', 'Monthly payment', '6000'),
    ],
    notice:
      'Simplified scenario; card issuers may use daily balances, fees, minimum formulas, promotional rates, and different allocation rules. Confirm terms and payoff with the issuer.',
  },
  {
    id: 'debt-to-income-calculator',
    name: 'Debt-to-income calculator',
    description:
      'Calculate stated monthly debt payments as a percentage of stated gross monthly income.',
    fields: [
      number('debt', 'Monthly debt payments', '30000'),
      number('income', 'Gross monthly income', '100000'),
    ],
    notice:
      'Arithmetic ratio only. Lenders can define included debts/income differently and use other eligibility criteria.',
  },
  {
    id: 'net-worth-calculator',
    name: 'Net-worth calculator',
    description: 'Subtract listed liabilities from listed assets.',
    fields: [
      area(
        'assets',
        'asset | amount',
        'Cash | 200000\nInvestments | 500000\nProperty | 4000000',
      ),
      area(
        'liabilities',
        'liability | amount',
        'Mortgage | 2500000\nOther debt | 100000',
      ),
    ],
    notice: businessNotice,
  },
  {
    id: 'budget-planner',
    name: 'Budget planner',
    description: 'Total category expenses and show remaining stated income.',
    fields: [
      number('income', 'Income for the period', '100000'),
      area(
        'expenses',
        'category | amount',
        'Housing | 30000\nFood | 15000\nTransport | 8000\nOther | 12000',
      ),
    ],
    notice: scenarioNotice,
  },
  {
    id: '50-30-20-budget-calculator',
    name: '50/30/20 budget split',
    description:
      'Split stated income into 50%, 30%, and 20% reference amounts.',
    fields: [number('income', 'Income to allocate', '100000')],
    notice:
      'Reference split only, not a universal recommendation. Actual needs, obligations, goals, taxes, and local costs differ.',
  },
  {
    id: 'gst-calculator',
    name: 'GST arithmetic calculator',
    description: 'Add a user-supplied GST percentage to a pre-tax amount.',
    fields: taxFields(),
    notice: taxNotice,
  },
  {
    id: 'vat-calculator',
    name: 'VAT arithmetic calculator',
    description: 'Add a user-supplied VAT percentage to a pre-tax amount.',
    fields: taxFields(),
    notice: taxNotice,
  },
  {
    id: 'sales-tax-calculator',
    name: 'Sales-tax arithmetic calculator',
    description:
      'Add a user-supplied sales-tax percentage to a pre-tax amount.',
    fields: taxFields(),
    notice: taxNotice,
  },
  {
    id: 'hourly-to-salary-calculator',
    name: 'Hourly-to-salary calculator',
    description:
      'Annualize an hourly rate using explicit weekly hours and working weeks.',
    fields: [
      number('hourly', 'Hourly rate', '1000'),
      number('hours', 'Hours per week', '40'),
      number('weeks', 'Paid working weeks/year', '52'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'overtime-calculator',
    name: 'Overtime pay calculator',
    description:
      'Multiply hourly rate, overtime hours, and a supplied multiplier.',
    fields: [
      number('hourly', 'Base hourly rate', '1000'),
      number('hours', 'Overtime hours', '10'),
      number('multiplier', 'Overtime multiplier', '1.5'),
    ],
    notice:
      'Arithmetic only. Overtime eligibility, base-rate definitions, thresholds, exclusions, taxation, and legal multipliers depend on applicable law and employment terms.',
  },
  {
    id: 'freelance-rate-calculator',
    name: 'Freelance-rate scenario',
    description:
      'Divide desired income plus expenses by estimated billable hours.',
    fields: [
      number('income', 'Desired annual personal income', '1200000'),
      number('businessCosts', 'Annual business costs', '300000'),
      number('taxReserve', 'Annual tax/contingency reserve', '300000'),
      number('billableHours', 'Annual billable hours', '1000'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'markup-calculator',
    name: 'Markup calculator',
    description: 'Add a markup percentage to cost and show gross margin.',
    fields: [
      number('cost', 'Cost', '100'),
      number('markup', 'Markup (%)', '50'),
    ],
    notice: businessNotice,
  },
  {
    id: 'margin-calculator',
    name: 'Margin calculator',
    description: 'Calculate gross profit and margin from revenue and cost.',
    fields: [
      number('revenue', 'Revenue', '150'),
      number('cost', 'Cost', '100'),
    ],
    notice: businessNotice,
  },
  {
    id: 'break-even-calculator',
    name: 'Break-even calculator',
    description:
      'Calculate units and sales from fixed cost and unit contribution.',
    fields: [
      number('fixed', 'Fixed costs for period', '100000'),
      number('price', 'Sale price per unit', '500'),
      number('variable', 'Variable cost per unit', '300'),
    ],
    notice:
      'Single-product estimate using consistent periods. Mixed/semi-variable costs, capacity, demand, taxes, financing, and multiple products require a fuller analysis.',
  },
  {
    id: 'profit-calculator',
    name: 'Profit calculator',
    description: 'Subtract fixed and variable costs from revenue.',
    fields: [
      number('revenue', 'Revenue', '500000'),
      number('fixed', 'Fixed costs', '100000'),
      number('variable', 'Variable costs', '250000'),
    ],
    notice: businessNotice,
  },
  {
    id: 'discount-calculator',
    name: 'Discount calculator',
    description: 'Calculate discount amount and final price.',
    fields: [
      number('price', 'Original price', '1000'),
      number('discount', 'Discount (%)', '20'),
    ],
    notice: businessNotice,
  },
  {
    id: 'commission-calculator',
    name: 'Commission calculator',
    description: 'Multiply eligible sales by a supplied commission percentage.',
    fields: [
      number('sales', 'Eligible sales', '500000'),
      number('rate', 'Commission (%)', '5'),
    ],
    notice: businessNotice,
  },
  {
    id: 'tip-calculator',
    name: 'Tip calculator',
    description: 'Calculate a user-supplied tip and total bill.',
    fields: [
      number('bill', 'Bill before tip', '2000'),
      number('rate', 'Tip (%)', '10'),
    ],
    notice:
      'Arithmetic only. Tipping practices, service charges, tax treatment, and local norms differ.',
  },
  {
    id: 'split-bill-calculator',
    name: 'Split-bill calculator',
    description: 'Add a supplied tip and split total equally.',
    fields: [
      number('bill', 'Bill before tip', '3000'),
      number('tip', 'Tip (%)', '10'),
      number('people', 'People', '3'),
    ],
    notice:
      'Equal arithmetic split only; it does not account for item-level shares, service charges, or local tax/tip practices.',
  },
  {
    id: 'inventory-turnover-calculator',
    name: 'Inventory-turnover calculator',
    description:
      'Divide cost of goods sold by average inventory for a consistent period.',
    fields: [
      number('cogs', 'Cost of goods sold', '1200000'),
      number('averageInventory', 'Average inventory', '300000'),
    ],
    notice: businessNotice,
  },
  {
    id: 'customer-acquisition-cost-calculator',
    name: 'Customer-acquisition cost calculator',
    description: 'Divide supplied acquisition spend by supplied new customers.',
    fields: [
      number('spend', 'Acquisition spend', '200000'),
      number('customers', 'New customers attributed', '400'),
    ],
    notice:
      'Definition and attribution estimate only. Include/exclude costs consistently and do not treat this ratio as causal proof.',
  },
  {
    id: 'lifetime-value-calculator',
    name: 'Simplified customer LTV calculator',
    description:
      'Estimate monthly ARPU × gross-margin fraction ÷ monthly churn fraction.',
    fields: [
      number('arpu', 'Monthly ARPU', '1000'),
      number('grossMargin', 'Gross margin (%)', '70'),
      number('churn', 'Monthly customer churn (%)', '5'),
    ],
    notice:
      'Simplified steady-state estimate only. Cohorts, expansion, contraction, retention shape, discounting, servicing costs, and segment mix can materially change LTV.',
  },
  {
    id: 'churn-rate-calculator',
    name: 'Customer churn-rate calculator',
    description:
      'Divide customers lost during a period by customers at period start.',
    fields: [
      number('lost', 'Customers lost', '50'),
      number('starting', 'Customers at period start', '1000'),
    ],
    notice: businessNotice,
  },
  {
    id: 'mrr-calculator',
    name: 'MRR calculator',
    description:
      'Sum customer count × monthly recurring price across supplied plans.',
    fields: [
      area(
        'plans',
        'plan | customers | monthly price',
        'Starter | 100 | 500\nPro | 40 | 1500',
      ),
    ],
    notice:
      'Simple recurring-price total only. Confirm treatment of discounts, usage, one-time fees, refunds, churn, annual contracts, currency, and revenue-recognition policy.',
  },
  {
    id: 'arr-calculator',
    name: 'ARR calculator',
    description:
      'Annualize a supplied monthly recurring revenue by multiplying by 12.',
    fields: [number('mrr', 'Monthly recurring revenue', '110000')],
    notice:
      'Simple MRR × 12 annualization only. Confirm your organization’s ARR/MRR definitions and exclusions.',
  },
  {
    id: 'runway-calculator',
    name: 'Cash-runway calculator',
    description: 'Divide available cash by positive monthly net burn.',
    fields: [
      number('cash', 'Available cash', '5000000'),
      number('monthlyBurn', 'Monthly net burn', '500000'),
    ],
    notice:
      'Constant-burn estimate only. Cash timing, receivables, debt, financing, taxes, growth, seasonality, and one-off events can change runway.',
  },
  {
    id: 'burn-rate-calculator',
    name: 'Net burn-rate calculator',
    description:
      'Calculate average monthly cash decline over a supplied period.',
    fields: [
      number('startingCash', 'Starting cash', '6000000'),
      number('endingCash', 'Ending cash', '4500000'),
      number('months', 'Months', '3'),
    ],
    notice: businessNotice,
  },
  {
    id: 'invoice-late-fee-calculator',
    name: 'Invoice late-fee arithmetic',
    description:
      'Calculate simple monthly late fee using a user-supplied percentage and months.',
    fields: [
      number('invoice', 'Outstanding invoice amount', '100000'),
      number('monthlyRate', 'Monthly late-fee rate (%)', '1.5'),
      number('months', 'Late months', '2'),
    ],
    notice:
      'Arithmetic only. Contract terms, applicable law, notice, grace periods, compounding, taxes, caps, and enforceability determine whether any fee is valid.',
  },
  {
    id: 'payment-fee-calculator',
    name: 'Payment fee & invoice calculator (Stripe / PayPal)',
    description:
      'Calculate merchant processing fees and the reverse invoice amount needed to receive exact net funds.',
    fields: [
      number('amount', 'Invoice / Transaction amount', '1000'),
      number('percentFee', 'Percentage fee (%)', '2.9'),
      number('fixedFee', 'Fixed fee per transaction ($)', '0.30'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'salary-hourly-converter',
    name: 'Salary to hourly & take-home converter',
    description:
      'Convert annual salary into monthly, bi-weekly, weekly, daily, and hourly gross & net take-home rates.',
    fields: [
      number('salary', 'Annual gross salary', '75000'),
      number('hoursPerWeek', 'Hours worked per week', '40'),
      number('weeksPerYear', 'Working weeks per year', '52'),
      number('taxRate', 'Estimated tax & deductions (%)', '22'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'mortgage-extra-payment',
    name: 'Mortgage extra payment & savings calculator',
    description:
      'Calculate total interest savings and years saved by making extra monthly principal payments.',
    fields: [
      number('principal', 'Mortgage loan balance', '300000'),
      number('rate', 'Annual interest rate (%)', '6.5'),
      number('years', 'Original term (years)', '30'),
      number('extraMonthly', 'Extra monthly principal payment', '150'),
    ],
    notice: scenarioNotice,
  },
  {
    id: 'saas-mrr-calculator',
    name: 'SaaS MRR growth & churn projection',
    description:
      'Project recurring revenue trajectory over 12 months factoring in new growth, expansion, and churn.',
    fields: [
      number('startingMrr', 'Starting monthly recurring revenue', '10000'),
      number('monthlyGrowthRate', 'New customer MRR growth rate (%)', '8'),
      number('churnRate', 'Monthly customer churn rate (%)', '3'),
      number('expansionRate', 'Monthly expansion revenue rate (%)', '2'),
      number('months', 'Projection months (1 to 36)', '12'),
    ],
    notice: businessNotice,
  },
] as const;

function finite(
  values: Record<string, string>,
  key: string,
  minimum = -Number.MAX_VALUE,
  maximum = Number.MAX_VALUE,
) {
  const output = Number(values[key]);
  if (!Number.isFinite(output) || output < minimum || output > maximum)
    throw new Error(
      `${key} must be a finite number from ${minimum} to ${maximum}.`,
    );
  return output;
}
function positive(values: Record<string, string>, key: string) {
  return finite(values, key, Number.MIN_VALUE);
}
function percent(
  values: Record<string, string>,
  key: string,
  minimum = -99.999999,
  maximum = 1_000_000,
) {
  return finite(values, key, minimum, maximum) / 100;
}
function format(value: number) {
  if (!Number.isFinite(value))
    throw new Error('The scenario did not produce a finite result.');
  if (Math.abs(value) < 1e-10) return '0';
  return Number(value.toPrecision(12)).toString();
}
function currency(value: number) {
  return format(value);
}
function payment(principal: number, annualRate: number, years: number) {
  const periods = years * 12;
  if (!Number.isSafeInteger(periods) || periods < 1 || periods > 12_000)
    throw new Error('Term must resolve to 1–12,000 whole months.');
  const rate = annualRate / 12;
  return rate === 0
    ? principal / periods
    : (principal * rate * (1 + rate) ** periods) / ((1 + rate) ** periods - 1);
}
function future(
  principal: number,
  rate: number,
  years: number,
  frequency: number,
) {
  const periods = years * frequency;
  if (!Number.isSafeInteger(periods) || periods < 0 || periods > 1_000_000)
    throw new Error(
      'Years × frequency must be a whole number no greater than 1,000,000.',
    );
  return principal * (1 + rate / frequency) ** periods;
}
function monthlyContribution(
  amount: number,
  annualRate: number,
  years: number,
) {
  const periods = years * 12;
  if (!Number.isSafeInteger(periods) || periods < 1 || periods > 12_000)
    throw new Error('Term must resolve to 1–12,000 whole months.');
  const rate = annualRate / 12;
  return rate === 0
    ? amount * periods
    : (amount * ((1 + rate) ** periods - 1)) / rate;
}
function numbers(value: string) {
  const output = value
    .split(/[\s,]+/u)
    .filter(Boolean)
    .map(Number);
  if (
    output.length < 2 ||
    output.length > 10_000 ||
    output.some((item) => !Number.isFinite(item))
  )
    throw new Error('Enter from 2 to 10,000 finite cash flows.');
  return output;
}
function pipeRows(value: string, columns: number) {
  const output = value
    .split(/\r?\n/gu)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!output.length || output.length > 10_000)
    throw new Error('Enter from 1 to 10,000 rows.');
  return output.map((line, index) => {
    const row = line.split('|').map((item) => item.trim());
    if (row.length !== columns || row.some((item) => !item))
      throw new Error(
        `Row ${index + 1} must have ${columns} non-empty pipe-separated fields.`,
      );
    return row;
  });
}
function periodicNpv(flows: number[], rate: number) {
  return flows.reduce(
    (sum, flow, index) => sum + flow / (1 + rate) ** index,
    0,
  );
}
function findRoot(calculate: (rate: number) => number) {
  const points = [
    -0.9999,
    ...Array.from(
      { length: 4000 },
      (_, index) => 10 ** (-4 + (index * 10) / 3999) - 1,
    ),
  ];
  let previousRate = points[0];
  let previous = calculate(previousRate);
  for (const rate of points.slice(1)) {
    const current = calculate(rate);
    if (
      Number.isFinite(previous) &&
      Number.isFinite(current) &&
      (previous === 0 || Math.sign(previous) !== Math.sign(current))
    ) {
      let low = previousRate;
      let high = rate;
      for (let iteration = 0; iteration < 200; iteration += 1) {
        const middle = (low + high) / 2;
        const value = calculate(middle);
        if (Math.abs(value) < 1e-10) return middle;
        if (Math.sign(value) === Math.sign(calculate(low))) low = middle;
        else high = middle;
      }
      return (low + high) / 2;
    }
    previousRate = rate;
    previous = current;
  }
  throw new Error(
    'No sign-change rate root was found in the supported search range.',
  );
}
function listTotal(value: string, label: string) {
  const rows = pipeRows(value, 2);
  let total = 0;
  const detail = rows.map(([name, raw]) => {
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0)
      throw new Error(`${label} ${name} must be non-negative.`);
    total += amount;
    return `${name}: ${currency(amount)}`;
  });
  return { total, detail };
}
function payoff(balance: number, annualRate: number, monthlyPayment: number) {
  const rate = annualRate / 12;
  if (monthlyPayment <= balance * rate)
    throw new Error(
      'Payment does not exceed first-month interest, so this fixed-payment scenario never pays down.',
    );
  let outstanding = balance;
  let interest = 0;
  let months = 0;
  while (outstanding > 1e-8 && months < 12_000) {
    const charge = outstanding * rate;
    const paid = Math.min(monthlyPayment, outstanding + charge);
    interest += charge;
    outstanding = outstanding + charge - paid;
    months += 1;
  }
  if (months >= 12_000)
    throw new Error('Payoff exceeds the 12,000-month simulation limit.');
  return { months, interest, total: balance + interest };
}
function tax(values: Record<string, string>) {
  const amount = finite(values, 'amount', 0);
  const rate = percent(values, 'rate', 0);
  const charge = amount * rate;
  return `Pre-tax amount: ${currency(amount)}\nSupplied rate: ${format(rate * 100)}%\nTax arithmetic: ${currency(charge)}\nTotal: ${currency(amount + charge)}`;
}

export function runFinanceOperation(
  operationId: string,
  values: Record<string, string>,
): string {
  switch (operationId) {
    case 'loan-emi-calculator':
    case 'mortgage-calculator': {
      const principal = positive(values, 'principal');
      const rate = percent(values, 'annualRate');
      const years = positive(values, 'years');
      const monthly = payment(principal, rate, years);
      const periods = years * 12;
      return `Monthly principal + interest: ${currency(monthly)}\nPayments: ${periods}\nTotal paid: ${currency(monthly * periods)}\nTotal interest: ${currency(monthly * periods - principal)}`;
    }
    case 'simple-interest-calculator': {
      const principal = finite(values, 'principal', 0);
      const interest =
        principal * percent(values, 'annualRate') * finite(values, 'years', 0);
      return `Interest: ${currency(interest)}\nFinal amount: ${currency(principal + interest)}`;
    }
    case 'compound-interest-calculator':
    case 'fixed-deposit-calculator':
    case 'future-value-calculator': {
      const principal = finite(values, 'principal', 0);
      const frequency = finite(values, 'frequency', 1, 365);
      if (!Number.isSafeInteger(frequency))
        throw new Error('Frequency must be a whole number from 1 to 365.');
      const output = future(
        principal,
        percent(values, 'annualRate'),
        finite(values, 'years', 0),
        frequency,
      );
      return `Future value: ${currency(output)}\nGrowth: ${currency(output - principal)}`;
    }
    case 'sip-calculator':
    case 'recurring-deposit-calculator': {
      const monthly = finite(values, 'monthly', 0);
      const years = positive(values, 'years');
      const output = monthlyContribution(
        monthly,
        percent(values, 'annualRate'),
        years,
      );
      return `Projected value: ${currency(output)}\nContributed: ${currency(monthly * years * 12)}\nScenario growth: ${currency(output - monthly * years * 12)}`;
    }
    case 'lumpsum-investment-calculator': {
      const principal = finite(values, 'principal', 0);
      const output = future(
        principal,
        percent(values, 'annualRate'),
        finite(values, 'years', 0),
        12,
      );
      return `Projected value: ${currency(output)}\nScenario growth: ${currency(output - principal)}`;
    }
    case 'cagr-calculator': {
      const beginning = positive(values, 'beginning');
      const ending = positive(values, 'ending');
      const years = positive(values, 'years');
      return `CAGR: ${format(((ending / beginning) ** (1 / years) - 1) * 100)}%`;
    }
    case 'roi-calculator': {
      const cost = positive(values, 'cost');
      const gain = finite(values, 'gain');
      return `Net return: ${currency(gain - cost)}\nROI: ${format(((gain - cost) / cost) * 100)}%`;
    }
    case 'irr-calculator': {
      const flows = numbers(values.flows);
      if (!flows.some((item) => item < 0) || !flows.some((item) => item > 0))
        throw new Error(
          'IRR needs at least one negative and one positive flow.',
        );
      const rate = findRoot((candidate) => periodicNpv(flows, candidate));
      return `Periodic IRR: ${format(rate * 100)}%\nNPV at root: ${format(periodicNpv(flows, rate))}`;
    }
    case 'xirr-calculator': {
      const rows = pipeRows(values.flows, 2)
        .map(([rawDate, rawFlow]) => {
          const date = new Date(`${rawDate}T00:00:00Z`);
          const flow = Number(rawFlow);
          if (
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== rawDate ||
            !Number.isFinite(flow)
          )
            throw new Error(`Invalid dated flow: ${rawDate} | ${rawFlow}.`);
          return { date, flow };
        })
        .toSorted((a, b) => a.date.getTime() - b.date.getTime());
      if (
        !rows.some((item) => item.flow < 0) ||
        !rows.some((item) => item.flow > 0)
      )
        throw new Error(
          'XIRR needs at least one negative and one positive flow.',
        );
      const origin = rows[0].date.getTime();
      const calculate = (rate: number) =>
        rows.reduce(
          (sum, item) =>
            sum +
            item.flow /
              (1 + rate) ** ((item.date.getTime() - origin) / 86_400_000 / 365),
          0,
        );
      const rate = findRoot(calculate);
      return `Annualized XIRR: ${format(rate * 100)}%\nXNPV at root: ${format(calculate(rate))}`;
    }
    case 'npv-calculator': {
      const flows = numbers(values.flows);
      const rate = percent(values, 'rate');
      return `NPV: ${currency(periodicNpv(flows, rate))}`;
    }
    case 'inflation-calculator': {
      const amount = finite(values, 'amount', 0);
      const output =
        amount *
        (1 + percent(values, 'annualRate', 0)) ** finite(values, 'years', 0);
      return `Projected future cost: ${currency(output)}\nIncrease: ${currency(output - amount)}`;
    }
    case 'present-value-calculator': {
      const frequency = finite(values, 'frequency', 1, 365);
      if (!Number.isSafeInteger(frequency))
        throw new Error('Frequency must be a whole number.');
      const years = finite(values, 'years', 0);
      const output =
        finite(values, 'future', 0) /
        (1 + percent(values, 'annualRate') / frequency) ** (frequency * years);
      return `Present value: ${currency(output)}`;
    }
    case 'annuity-calculator': {
      const payment = finite(values, 'payment', 0);
      const rate = percent(values, 'rate');
      const periods = finite(values, 'periods', 1, 1_000_000);
      if (!Number.isSafeInteger(periods))
        throw new Error('Periods must be a whole number.');
      const output =
        rate === 0
          ? payment * periods
          : (payment * ((1 + rate) ** periods - 1)) / rate;
      return `Future value: ${currency(output)}\nTotal payments: ${currency(payment * periods)}`;
    }
    case 'retirement-corpus-calculator': {
      const yearsTo = finite(values, 'yearsToRetirement', 0, 200);
      const yearsIn = finite(values, 'retirementYears', 1, 200);
      if (!Number.isSafeInteger(yearsTo) || !Number.isSafeInteger(yearsIn))
        throw new Error('Year counts must be whole numbers.');
      const expense =
        finite(values, 'annualExpense', 0) *
        (1 + percent(values, 'inflationRate', 0)) ** yearsTo;
      const realRate =
        (1 + percent(values, 'returnRate')) /
          (1 + percent(values, 'inflationRate', 0)) -
        1;
      const corpus =
        Math.abs(realRate) < 1e-12
          ? expense * yearsIn
          : (expense * (1 - (1 + realRate) ** -yearsIn)) / realRate;
      return `First retirement-year expense: ${currency(expense)}\nImplied real return: ${format(realRate * 100)}%\nRetirement-date corpus: ${currency(corpus)}`;
    }
    case 'emergency-fund-calculator':
      return `Scenario target: ${currency(finite(values, 'monthly', 0) * finite(values, 'months', 0) + finite(values, 'oneOff', 0))}`;
    case 'savings-goal-calculator': {
      const goal = finite(values, 'goal', 0);
      const current = finite(values, 'current', 0);
      const years = positive(values, 'years');
      const periods = years * 12;
      if (!Number.isSafeInteger(periods) || periods > 12_000)
        throw new Error('Term must resolve to whole months up to 12,000.');
      const rate = percent(values, 'annualRate') / 12;
      const currentFuture = current * (1 + rate) ** periods;
      const gap = Math.max(0, goal - currentFuture);
      const payment =
        rate === 0 ? gap / periods : (gap * rate) / ((1 + rate) ** periods - 1);
      return `Required end-of-month contribution: ${currency(payment)}\nCurrent savings projected value: ${currency(currentFuture)}\nTarget: ${currency(goal)}`;
    }
    case 'debt-payoff-calculator':
    case 'credit-card-payoff-calculator': {
      const output = payoff(
        positive(values, 'balance'),
        percent(values, 'annualRate', 0),
        positive(values, 'payment'),
      );
      return `Payoff months: ${output.months}\nTotal interest: ${currency(output.interest)}\nTotal paid: ${currency(output.total)}`;
    }
    case 'debt-to-income-calculator':
      return `Debt-to-income ratio: ${format((finite(values, 'debt', 0) / positive(values, 'income')) * 100)}%`;
    case 'net-worth-calculator': {
      const assets = listTotal(values.assets, 'Asset');
      const liabilities = listTotal(values.liabilities, 'Liability');
      return `Assets: ${currency(assets.total)}\n${assets.detail.join('\n')}\n\nLiabilities: ${currency(liabilities.total)}\n${liabilities.detail.join('\n')}\n\nNet worth: ${currency(assets.total - liabilities.total)}`;
    }
    case 'budget-planner': {
      const income = finite(values, 'income', 0);
      const expenses = listTotal(values.expenses, 'Expense');
      return `Income: ${currency(income)}\nExpenses: ${currency(expenses.total)}\nRemaining: ${currency(income - expenses.total)}\n\n${expenses.detail.join('\n')}`;
    }
    case '50-30-20-budget-calculator': {
      const income = finite(values, 'income', 0);
      return `50% reference: ${currency(income * 0.5)}\n30% reference: ${currency(income * 0.3)}\n20% reference: ${currency(income * 0.2)}`;
    }
    case 'gst-calculator':
    case 'vat-calculator':
    case 'sales-tax-calculator':
      return tax(values);
    case 'hourly-to-salary-calculator': {
      const output =
        finite(values, 'hourly', 0) *
        finite(values, 'hours', 0, 168) *
        finite(values, 'weeks', 0, 53);
      return `Annualized gross amount: ${currency(output)}`;
    }
    case 'overtime-calculator':
      return `Overtime amount: ${currency(finite(values, 'hourly', 0) * finite(values, 'hours', 0) * finite(values, 'multiplier', 0))}`;
    case 'freelance-rate-calculator': {
      const total =
        finite(values, 'income', 0) +
        finite(values, 'businessCosts', 0) +
        finite(values, 'taxReserve', 0);
      return `Scenario hourly rate: ${currency(total / positive(values, 'billableHours'))}\nAnnual revenue target: ${currency(total)}`;
    }
    case 'markup-calculator': {
      const cost = finite(values, 'cost', 0);
      const price = cost * (1 + percent(values, 'markup', 0));
      return `Sale price: ${currency(price)}\nGross profit: ${currency(price - cost)}\nGross margin: ${format(price ? ((price - cost) / price) * 100 : 0)}%`;
    }
    case 'margin-calculator': {
      const revenue = finite(values, 'revenue');
      const cost = finite(values, 'cost');
      if (revenue === 0)
        throw new Error('Revenue must be non-zero for margin.');
      return `Gross profit: ${currency(revenue - cost)}\nGross margin: ${format(((revenue - cost) / revenue) * 100)}%`;
    }
    case 'break-even-calculator': {
      const fixed = finite(values, 'fixed', 0);
      const price = positive(values, 'price');
      const variable = finite(values, 'variable', 0);
      const contribution = price - variable;
      if (contribution <= 0)
        throw new Error('Sale price must exceed variable cost per unit.');
      const units = fixed / contribution;
      return `Unit contribution: ${currency(contribution)}\nBreak-even units (exact): ${format(units)}\nWhole units to cover fixed cost: ${Math.ceil(units)}\nBreak-even sales (exact): ${currency(units * price)}`;
    }
    case 'profit-calculator': {
      const revenue = finite(values, 'revenue');
      const costs = finite(values, 'fixed', 0) + finite(values, 'variable', 0);
      const margin = revenue
        ? `${format(((revenue - costs) / revenue) * 100)}%`
        : 'not defined (revenue is zero)';
      return `Profit: ${currency(revenue - costs)}\nTotal costs: ${currency(costs)}\nProfit margin: ${margin}`;
    }
    case 'discount-calculator': {
      const price = finite(values, 'price', 0);
      const discount = price * percent(values, 'discount', 0);
      return `Discount: ${currency(discount)}\nFinal price: ${currency(price - discount)}`;
    }
    case 'commission-calculator':
      return `Commission: ${currency(finite(values, 'sales', 0) * percent(values, 'rate', 0))}`;
    case 'tip-calculator': {
      const bill = finite(values, 'bill', 0);
      const tip = bill * percent(values, 'rate', 0);
      return `Tip: ${currency(tip)}\nTotal: ${currency(bill + tip)}`;
    }
    case 'split-bill-calculator': {
      const bill = finite(values, 'bill', 0);
      const tip = bill * percent(values, 'tip', 0);
      const people = finite(values, 'people', 1, 100_000);
      if (!Number.isSafeInteger(people))
        throw new Error('People must be a whole number.');
      return `Tip: ${currency(tip)}\nTotal: ${currency(bill + tip)}\nPer person: ${currency((bill + tip) / people)}`;
    }
    case 'inventory-turnover-calculator':
      return `Inventory turnover: ${format(finite(values, 'cogs', 0) / positive(values, 'averageInventory'))} times per period`;
    case 'customer-acquisition-cost-calculator': {
      const customers = finite(values, 'customers', 1, 1_000_000_000);
      if (!Number.isSafeInteger(customers))
        throw new Error('New customers must be a whole number.');
      return `Acquisition cost per attributed customer: ${currency(finite(values, 'spend', 0) / customers)}`;
    }
    case 'lifetime-value-calculator': {
      const churn = percent(values, 'churn', 0);
      if (churn <= 0)
        throw new Error(
          'Monthly churn must be positive for this simplified formula.',
        );
      return `Simplified LTV: ${currency((finite(values, 'arpu', 0) * percent(values, 'grossMargin', 0)) / churn)}`;
    }
    case 'churn-rate-calculator': {
      const lost = finite(values, 'lost', 0);
      const starting = positive(values, 'starting');
      if (lost > starting)
        throw new Error('Lost customers cannot exceed starting customers.');
      return `Customer churn: ${format((lost / starting) * 100)}%`;
    }
    case 'mrr-calculator': {
      let total = 0;
      const detail = pipeRows(values.plans, 3).map(
        ([plan, rawCustomers, rawPrice]) => {
          const customers = Number(rawCustomers);
          const price = Number(rawPrice);
          if (
            !Number.isSafeInteger(customers) ||
            customers < 0 ||
            !Number.isFinite(price) ||
            price < 0
          )
            throw new Error(`Invalid plan row for ${plan}.`);
          const amount = customers * price;
          total += amount;
          return `${plan}: ${currency(amount)}`;
        },
      );
      return `MRR: ${currency(total)}\n\n${detail.join('\n')}`;
    }
    case 'arr-calculator':
      return `ARR: ${currency(finite(values, 'mrr', 0) * 12)}`;
    case 'runway-calculator':
      return `Constant-burn runway: ${format(finite(values, 'cash', 0) / positive(values, 'monthlyBurn'))} months`;
    case 'burn-rate-calculator':
      return `Average monthly net burn: ${currency((finite(values, 'startingCash') - finite(values, 'endingCash')) / positive(values, 'months'))}`;
    case 'invoice-late-fee-calculator': {
      const invoice = finite(values, 'invoice', 0);
      const fee =
        invoice *
        percent(values, 'monthlyRate', 0) *
        finite(values, 'months', 0);
      return `Simple late-fee arithmetic: ${currency(fee)}\nOutstanding plus fee: ${currency(invoice + fee)}`;
    }
    case 'payment-fee-calculator': {
      const amount = finite(values, 'amount', 0);
      const percentRate = percent(values, 'percentFee', 0);
      const fixedFee = finite(values, 'fixedFee', 0);
      const totalFee = amount * percentRate + fixedFee;
      const netReceived = Math.max(0, amount - totalFee);
      const reverseInvoice =
        percentRate >= 1 ? amount : (amount + fixedFee) / (1 - percentRate);
      return `/* Transaction Fee Summary */
Invoice Amount:     ${currency(amount)}
Processing Fee:     ${currency(totalFee)} (${(percentRate * 100).toFixed(2)}% + ${currency(fixedFee)})
Net Funds Received: ${currency(netReceived)}

/* Reverse Calculation */
To receive exact ${currency(amount)} after fees, invoice: ${currency(reverseInvoice)}`;
    }
    case 'salary-hourly-converter': {
      const salary = finite(values, 'salary', 0);
      const hoursPerWeek = Math.max(1, finite(values, 'hoursPerWeek', 1, 168));
      const weeksPerYear = Math.max(1, finite(values, 'weeksPerYear', 1, 52));
      const taxRate = percent(values, 'taxRate', 0, 100);

      const totalHours = hoursPerWeek * weeksPerYear;
      const hourlyGross = salary / totalHours;
      const dailyGross = hourlyGross * (hoursPerWeek / 5);
      const weeklyGross = salary / weeksPerYear;
      const biweeklyGross = weeklyGross * 2;
      const monthlyGross = salary / 12;

      const netFactor = 1 - taxRate;
      return `/* Salary to Hourly Breakdown */
Gross Annual Salary:     ${currency(salary)}
Estimated Tax Rate:      ${(taxRate * 100).toFixed(1)}%

Monthly:                  ${currency(monthlyGross)} (Gross) | ${currency(monthlyGross * netFactor)} (Net)
Bi-Weekly:                ${currency(biweeklyGross)} (Gross) | ${currency(biweeklyGross * netFactor)} (Net)
Weekly:                   ${currency(weeklyGross)} (Gross) | ${currency(weeklyGross * netFactor)} (Net)
Daily (8h day):           ${currency(dailyGross)} (Gross) | ${currency(dailyGross * netFactor)} (Net)
Hourly Rate:              ${currency(hourlyGross)} (Gross) | ${currency(hourlyGross * netFactor)} (Net)

Total working hours: ${totalHours} hrs/year`;
    }
    case 'mortgage-extra-payment': {
      const principal = finite(values, 'principal', 1);
      const annualRate = percent(values, 'rate', 0);
      const years = finite(values, 'years', 1, 50);
      const extraMonthly = finite(values, 'extraMonthly', 0);

      const monthlyRate = annualRate / 12;
      const totalMonths = years * 12;

      const standardMonthly =
        monthlyRate === 0
          ? principal / totalMonths
          : (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
            (Math.pow(1 + monthlyRate, totalMonths) - 1);

      let balance = principal;
      let acceleratedMonths = 0;
      let totalInterestPaidAccelerated = 0;
      const acceleratedPayment = standardMonthly + extraMonthly;

      while (balance > 0 && acceleratedMonths < totalMonths * 2) {
        acceleratedMonths++;
        const interest = balance * monthlyRate;
        totalInterestPaidAccelerated += interest;
        const principalPaid = Math.min(balance, acceleratedPayment - interest);
        balance -= principalPaid;
        if (balance <= 0.01) break;
      }

      const standardTotalInterest = standardMonthly * totalMonths - principal;
      const totalSavings = Math.max(
        0,
        standardTotalInterest - totalInterestPaidAccelerated,
      );
      const monthsSaved = Math.max(0, totalMonths - acceleratedMonths);
      const yearsSaved = (monthsSaved / 12).toFixed(1);

      return `/* Mortgage Extra Payment Analysis */
Standard Monthly Payment:     ${currency(standardMonthly)}
Accelerated Monthly Payment:  ${currency(acceleratedPayment)} (+${currency(extraMonthly)}/mo)

Total Interest Saved:         ${currency(totalSavings)}
Payoff Time Shortened By:     ${monthsSaved} months (~${yearsSaved} years)
Original Payoff Term:         ${years} years (${totalMonths} months)
New Accelerated Payoff Term:  ${(acceleratedMonths / 12).toFixed(1)} years (${acceleratedMonths} months)`;
    }
    case 'saas-mrr-calculator': {
      const starting = finite(values, 'startingMrr', 0);
      const growthRate = percent(values, 'monthlyGrowthRate', -100);
      const churnRate = percent(values, 'churnRate', 0, 100);
      const expansionRate = percent(values, 'expansionRate', 0);
      const months = Math.max(
        1,
        Math.min(36, parseInt(values.months || '12', 10) || 12),
      );

      let currentMrr = starting;
      const linesOut: string[] = [
        `Starting MRR: ${currency(starting)}`,
        `Net Monthly Growth: ${((growthRate + expansionRate - churnRate) * 100).toFixed(2)}%`,
        '',
        'Month       Projected MRR       New MRR        Churned MRR     Expansion MRR',
      ];

      for (let m = 1; m <= months; m++) {
        const newMrr = currentMrr * growthRate;
        const expMrr = currentMrr * expansionRate;
        const churnMrr = currentMrr * churnRate;
        currentMrr = currentMrr + newMrr + expMrr - churnMrr;
        linesOut.push(
          `Month ${m.toString().padEnd(5)} ${currency(currentMrr).padEnd(19)} +${currency(newMrr).padEnd(14)} -${currency(churnMrr).padEnd(15)} +${currency(expMrr)}`,
        );
      }

      linesOut.push('');
      linesOut.push(
        `Ending Projected MRR (Month ${months}): ${currency(currentMrr)}`,
      );
      linesOut.push(
        `Ending Projected ARR:                 ${currency(currentMrr * 12)}`,
      );

      return linesOut.join('\n');
    }
    default:
      throw new Error('Choose a supported finance or business operation.');
  }
}
