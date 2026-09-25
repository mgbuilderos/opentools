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
const text = (
  id: string,
  label: string,
  defaultValue: string,
): FinanceField => ({ id, label, type: 'text', defaultValue });
const area = (
  id: string,
  label: string,
  defaultValue: string,
): FinanceField => ({ id, label, type: 'textarea', defaultValue });
const select = (
  id: string,
  label: string,
  options: readonly { value: string; label: string }[],
  defaultValue = options[0]?.value ?? '',
): FinanceField => ({ id, label, type: 'select', defaultValue, options });
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
    description:
      'Multiply principal by annual rate by years for simple interest that is never compounded, shown as the interest alone and as principal plus interest.',
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
    description:
      'Enter what something cost and what it is worth or sold for, and see the net return in money and as a percentage of the cost, worked out in your browser.',
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
    description:
      'List assets and liabilities one per line as name and amount, in your own browser tab, and the two totals are subtracted, with every line itemised back.',
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
    description:
      'Take fixed and variable costs off revenue to see profit, total costs and margin as a percentage. Margin is reported as undefined when revenue is zero.',
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
    description:
      'Enter an original price and a percentage off to see the amount taken off and the price after the reduction, for a sale tag that shows only the percentage.',
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
    description:
      'Type the bill before tip and the percentage you mean to leave; you get the tip on its own and the bill plus tip, so a card slip can be checked quickly.',
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
    description:
      'Enter the bill, a tip percentage and how many people are paying, from 1 to 100,000, and get the tip, the total and the equal share per person.',
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
  {
    id: 'invoice-generator',
    name: 'Printable client bill maker',
    description:
      'Lay out a print-ready bill with itemised lines, a tax line and payment instructions. Rupee amounts group in lakh and crore.',
    fields: [
      text('invoiceNumber', 'Bill number', 'MG/2026-27/014'),
      area(
        'sender',
        'Your firm (one detail per line)',
        'M. G. & Associates\nChartered Accountants\n3rd Floor, Suvarna Chambers, F. C. Road\nPune 411004, Maharashtra\nbilling@mgassociates.example',
      ),
      area(
        'client',
        'Billed to (one detail per line)',
        'Shreeji Textiles Private Limited\nPlot 42, MIDC Industrial Area\nNashik 422010, Maharashtra\naccounts@shreejitextiles.example',
      ),
      // Printed exactly as typed. Indian practice reads DD/MM/YYYY, and the
      // defaults sit inside FY 2026-27, which runs 01/04/2026 to 31/03/2027.
      text('invoiceDate', 'Bill date (DD/MM/YYYY)', '21/09/2026'),
      text('dueDate', 'Payment due date (DD/MM/YYYY)', '05/10/2026'),
      select('currency', 'Currency', [
        { value: 'INR', label: 'INR (₹) — grouped in lakh and crore' },
        { value: 'USD', label: 'USD ($)' },
        { value: 'EUR', label: 'EUR (€)' },
        { value: 'GBP', label: 'GBP (£)' },
        { value: 'CAD', label: 'CAD ($)' },
        { value: 'AUD', label: 'AUD ($)' },
        { value: 'JPY', label: 'JPY (¥)' },
        { value: 'SGD', label: 'SGD ($)' },
      ]),
      area(
        'items',
        'Line items (Description, Quantity, Unit Price)',
        'Statutory audit for FY 2025-26, 1, 125000\nIncome tax return filing and computation, 1, 25000\nGST monthly return filing (Apr-Sep 2026), 6, 4500\nRepresentation before assessing officer (hours), 8, 3500',
      ),
      number('taxRate', 'Tax rate you are charging (%)', '18'),
      number('discount', 'Discount amount', '0'),
      area(
        'notes',
        'Payment terms & notes',
        'Payable within 15 days of receipt.\nBank: State Bank of India, F. C. Road branch\nAccount: 3894 2210 7745\nIFSC: SBIN0001234\nUPI: mgassociates@upi\nThis is a bill for professional services. Where a tax invoice under the GST law is required, it will be issued separately with the particulars that law prescribes.',
      ),
    ],
    notice:
      '100% private. All invoice computations and print templates are generated locally in browser memory with zero server uploads.',
    outputExtension: 'html',
  },
  {
    id: 'receipt-generator',
    name: 'Printable payment receipt maker',
    description:
      'Generate official, print-ready payment receipts with reference IDs, payer/payee details, and itemized confirmation.',
    fields: [
      text('receiptNumber', 'Receipt number / ID', 'REC-2026-9042'),
      text('paymentDate', 'Payment date (YYYY-MM-DD)', '2026-09-16'),
      text('payer', 'Received from (Payer)', 'Sarah Jenkins'),
      text('payee', 'Issued by (Payee / Business)', 'MG Digital Services'),
      number('amount', 'Amount received', '450'),
      select('currency', 'Currency', [
        { value: 'USD', label: 'USD ($)' },
        { value: 'EUR', label: 'EUR (€)' },
        { value: 'GBP', label: 'GBP (£)' },
        { value: 'INR', label: 'INR (₹)' },
        { value: 'CAD', label: 'CAD ($)' },
        { value: 'AUD', label: 'AUD ($)' },
        { value: 'JPY', label: 'JPY (¥)' },
      ]),
      select('paymentMethod', 'Payment method', [
        { value: 'UPI / Instant Pay', label: 'UPI / Instant Pay' },
        { value: 'Credit / Debit Card', label: 'Credit / Debit Card' },
        { value: 'Bank Transfer / Wire', label: 'Bank Transfer / Wire' },
        { value: 'Cash', label: 'Cash' },
        { value: 'Cheque', label: 'Cheque' },
      ]),
      text(
        'transactionReference',
        'Transaction reference / ID',
        'TXN-88492019',
      ),
      area(
        'description',
        'Payment memo / for',
        'Payment in full for Website Performance Optimization & Technical SEO Audit.',
      ),
    ],
    notice:
      '100% private. All receipt formatting and print layouts are generated client-side.',
    outputExtension: 'html',
  },
  {
    id: 'timesheet-calculator',
    name: 'Weekly timesheet & billable overtime calculator',
    description:
      'Calculate daily work hours, 1.5x overtime, meal breaks, hourly pay, and generate a print-ready signed weekly timesheet.',
    fields: [
      text('employeeName', 'Employee / Contractor Name', 'Alex Morgan'),
      text(
        'clientProject',
        'Client / Project Name',
        'Acme Corp — Web Platform v2',
      ),
      text('weekEnding', 'Week Ending Date (YYYY-MM-DD)', '2026-09-20'),
      number('hourlyRate', 'Regular Hourly Rate', '50'),
      number(
        'overtimeRateMultiplier',
        'Overtime Rate Multiplier (e.g. 1.5)',
        '1.5',
      ),
      number(
        'standardWeeklyLimit',
        'Standard Overtime Threshold (hours/week)',
        '40',
      ),
      area(
        'dailyEntries',
        'Daily hours log (Day | Start Time | End Time | Break (min) | Task Note)',
        'Mon | 09:00 | 17:30 | 30 | Frontend engineering & API integration\nTue | 09:00 | 18:00 | 30 | Component architecture & unit test suites\nWed | 09:00 | 18:00 | 30 | Code review & client sync call\nThu | 09:00 | 19:00 | 45 | Database indexing & performance optimization\nFri | 09:00 | 17:00 | 30 | QA validation, documentation & weekly wrap',
      ),
      select('currency', 'Currency', [
        { value: 'USD', label: 'USD ($)' },
        { value: 'EUR', label: 'EUR (€)' },
        { value: 'GBP', label: 'GBP (£)' },
        { value: 'INR', label: 'INR (₹)' },
        { value: 'CAD', label: 'CAD ($)' },
        { value: 'AUD', label: 'AUD ($)' },
      ]),
    ],
    notice:
      '100% private. All hours arithmetic, rate calculations, and print layouts execute locally in browser memory.',
    outputExtension: 'html',
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
    case 'invoice-generator': {
      const invoiceNo = values.invoiceNumber?.trim() || 'INV-001';
      const invoiceDate = values.invoiceDate?.trim() || '2026-09-16';
      const dueDate = values.dueDate?.trim() || '2026-09-30';
      const sender = values.sender?.trim() || 'Sender';
      const client = values.client?.trim() || 'Client';
      const curCode = values.currency || 'USD';
      const curSym = CURRENCY_SYMBOLS[curCode] || '$';
      const taxPct = Math.max(0, parseFloat(values.taxRate || '0') || 0);
      const discountVal = Math.max(0, parseFloat(values.discount || '0') || 0);
      const notes = values.notes?.trim() || '';

      const lines = (values.items || '')
        .split(/\r?\n/gu)
        .filter((l) => l.trim());
      const parsedItems = lines.map((line) => {
        const parts = line.includes(',')
          ? line.split(',')
          : line.includes('|')
            ? line.split('|')
            : line.split('\t');
        const desc = (parts[0] || 'Item').trim();
        const qty = Math.max(1, parseFloat((parts[1] || '1').trim()) || 1);
        const rate = Math.max(0, parseFloat((parts[2] || '0').trim()) || 0);
        const amount = qty * rate;
        return { desc, qty, rate, amount };
      });

      if (parsedItems.length === 0) {
        parsedItems.push({
          desc: 'Consulting / Engineering Services',
          qty: 1,
          rate: 1000,
          amount: 1000,
        });
      }

      const subtotal = parsedItems.reduce((acc, i) => acc + i.amount, 0);
      const discountedSubtotal = Math.max(0, subtotal - discountVal);
      const taxAmount = (discountedSubtotal * taxPct) / 100;
      const grandTotal = discountedSubtotal + taxAmount;

      return generateInvoiceHtml({
        invoiceNo,
        invoiceDate,
        dueDate,
        sender,
        client,
        currency: curSym,
        currencyCode: curCode,
        items: parsedItems,
        subtotal,
        discount: discountVal,
        taxPercent: taxPct,
        taxAmount,
        grandTotal,
        notes,
      });
    }
    case 'receipt-generator': {
      const receiptNo = values.receiptNumber?.trim() || 'REC-001';
      const paymentDate = values.paymentDate?.trim() || '2026-09-16';
      const payer = values.payer?.trim() || 'Payer';
      const payee = values.payee?.trim() || 'Payee';
      const amount = Math.max(0, parseFloat(values.amount || '0') || 0);
      const curCode = values.currency || 'USD';
      const curSym = CURRENCY_SYMBOLS[curCode] || '$';
      const method = values.paymentMethod || 'UPI / Instant Pay';
      const ref = values.transactionReference?.trim() || 'N/A';
      const desc =
        values.description?.trim() || 'Payment for services rendered';

      return generateReceiptHtml({
        receiptNo,
        paymentDate,
        payer,
        payee,
        amount,
        currency: curSym,
        currencyCode: curCode,
        paymentMethod: method,
        reference: ref,
        description: desc,
      });
    }
    case 'timesheet-calculator': {
      const employeeName = values.employeeName?.trim() || 'Employee Name';
      const clientProject = values.clientProject?.trim() || 'Client / Project';
      const weekEnding =
        values.weekEnding?.trim() || new Date().toISOString().slice(0, 10);
      const hourlyRate = Math.max(0, parseFloat(values.hourlyRate || '0') || 0);
      const overtimeRateMultiplier = Math.max(
        1,
        parseFloat(values.overtimeRateMultiplier || '1.5') || 1.5,
      );
      const standardWeeklyLimit = Math.max(
        0,
        parseFloat(values.standardWeeklyLimit || '40') || 40,
      );
      const curCode = values.currency || 'USD';
      const curSym = CURRENCY_SYMBOLS[curCode] || '$';
      const rawEntries = values.dailyEntries || '';

      const lines = rawEntries
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const entries: TimesheetDayEntry[] = [];

      for (const line of lines) {
        const parts = line.split('|').map((p) => p.trim());
        if (parts.length < 3) continue;
        const day = parts[0] || 'Day';
        const start = parts[1] || '09:00';
        const end = parts[2] || '17:00';
        const breakMin = parts[3] ? Math.max(0, parseFloat(parts[3]) || 0) : 0;
        const task = parts[4] || '';

        const startParts = start.split(':').map((s) => parseInt(s, 10) || 0);
        const endParts = end.split(':').map((s) => parseInt(s, 10) || 0);
        const startMin = (startParts[0] || 0) * 60 + (startParts[1] || 0);
        let endMin = (endParts[0] || 0) * 60 + (endParts[1] || 0);
        if (endMin < startMin) endMin += 24 * 60;
        const netMinutes = Math.max(0, endMin - startMin - breakMin);
        const hours = Math.round((netMinutes / 60) * 100) / 100;

        entries.push({ day, start, end, breakMin, hours, task });
      }

      const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
      const regularHours = Math.min(totalHours, standardWeeklyLimit);
      const overtimeHours = Math.max(0, totalHours - standardWeeklyLimit);
      const regularPay = regularHours * hourlyRate;
      const overtimeRate = hourlyRate * overtimeRateMultiplier;
      const overtimePay = overtimeHours * overtimeRate;
      const grossPay = regularPay + overtimePay;

      return generateTimesheetHtml({
        employeeName,
        clientProject,
        weekEnding,
        hourlyRate,
        overtimeRateMultiplier,
        standardWeeklyLimit,
        currency: curSym,
        currencyCode: curCode,
        entries,
        totalHours,
        regularHours,
        overtimeHours,
        regularPay,
        overtimePay,
        grossPay,
      });
    }
    default:
      throw new Error('Choose a supported finance or business operation.');
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
  SGD: 'SG$',
};

function escapeHtmlStr(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  sender: string;
  client: string;
  currency: string;
  currencyCode: string;
  items: Array<{ desc: string; qty: number; rate: number; amount: number }>;
  subtotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  notes: string;
}

/**
 * Group a money figure the way the chosen currency is actually written.
 *
 * All three printable documents below grouped every currency in `en-US`, so a
 * bill denominated in rupees printed ₹1,234,567.89. That is not a rounding
 * nicety: an Indian practice reads in lakh and crore, and a bill that groups
 * in thousands and millions reads as one that was not written for the client
 * it is addressed to. `en-IN` gives ₹12,34,567.89 — the same number, grouped
 * the way the reader counts.
 *
 * Keyed on the currency rather than on the visitor's own locale, because the
 * document is read by whoever it is sent to, not by whoever generated it.
 */
const MONEY_LOCALES: Record<string, string> = { INR: 'en-IN' };

function moneyFormatter(currencyCode: string) {
  return new Intl.NumberFormat(MONEY_LOCALES[currencyCode] ?? 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function generateInvoiceHtml(d: InvoiceData): string {
  const money = moneyFormatter(d.currencyCode);
  const formatMoney = (n: number) => `${d.currency}${money.format(n)}`;

  const itemRows = d.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e4e4e7;">${escapeHtmlStr(item.desc)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e4e4e7; text-align: center;">${item.qty}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e4e4e7; text-align: right;">${formatMoney(item.rate)}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: 600;">${formatMoney(item.amount)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${escapeHtmlStr(d.invoiceNo)}</title>
  <style>
    @media print {
      body { background: #fff !important; color: #000 !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .invoice-card { box-shadow: none !important; border: none !important; max-width: 100% !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f4f4f5;
      color: #18181b;
      margin: 0;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      border-bottom: 2px solid #18181b;
      padding-bottom: 20px;
    }
    .title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #f4f4f5;
      border: 1px solid #d4d4d8;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .grid { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 32px; }
    .col { flex: 1; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; font-weight: 700; margin-bottom: 4px; }
    .info { font-size: 14px; white-space: pre-line; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
    th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #18181b; font-size: 12px; text-transform: uppercase; color: #71717a; }
    .totals-container { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-table { width: 320px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .grand-total { border-top: 2px solid #18181b; padding-top: 10px; font-size: 18px; font-weight: 800; }
    .notes-box { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 16px; font-size: 13px; color: #3f3f46; white-space: pre-line; }
    .print-bar { text-align: center; margin-bottom: 24px; }
    .btn { background: #18181b; color: #fff; border: none; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; }
    .btn:hover { background: #27272a; }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1 class="title">INVOICE</h1>
        <div class="badge"># ${escapeHtmlStr(d.invoiceNo)}</div>
      </div>
      <div style="text-align: right;">
        <div class="label">Date Issued</div>
        <div class="info" style="font-weight: 600;">${escapeHtmlStr(d.invoiceDate)}</div>
        <div class="label" style="margin-top: 8px;">Due Date</div>
        <div class="info" style="font-weight: 600; color: #dc2626;">${escapeHtmlStr(d.dueDate)}</div>
      </div>
    </div>

    <div class="grid">
      <div class="col">
        <div class="label">From</div>
        <div class="info">${escapeHtmlStr(d.sender)}</div>
      </div>
      <div class="col">
        <div class="label">Billed To</div>
        <div class="info">${escapeHtmlStr(d.client)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 110px;">Unit Price</th>
          <th style="text-align: right; width: 120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals-container">
      <div class="totals-table">
        <div class="totals-row">
          <span style="color: #71717a;">Subtotal:</span>
          <span>${formatMoney(d.subtotal)}</span>
        </div>
        ${
          d.discount > 0
            ? `<div class="totals-row" style="color: #16a34a;">
          <span>Discount:</span>
          <span>-${formatMoney(d.discount)}</span>
        </div>`
            : ''
        }
        ${
          d.taxPercent > 0
            ? `<div class="totals-row">
          <span style="color: #71717a;">Tax (${d.taxPercent}%):</span>
          <span>+${formatMoney(d.taxAmount)}</span>
        </div>`
            : ''
        }
        <div class="totals-row grand-total">
          <span>Total Due:</span>
          <span>${formatMoney(d.grandTotal)} ${escapeHtmlStr(d.currencyCode)}</span>
        </div>
      </div>
    </div>

    ${
      d.notes
        ? `<div class="notes-box">
      <div class="label" style="margin-bottom: 6px;">Notes & Payment Instructions</div>
      ${escapeHtmlStr(d.notes)}
    </div>`
        : ''
    }
  </div>
</body>
</html>`;
}

interface ReceiptData {
  receiptNo: string;
  paymentDate: string;
  payer: string;
  payee: string;
  amount: number;
  currency: string;
  currencyCode: string;
  paymentMethod: string;
  reference: string;
  description: string;
}

function generateReceiptHtml(d: ReceiptData): string {
  const money = moneyFormatter(d.currencyCode);
  const formatMoney = (n: number) => `${d.currency}${money.format(n)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${escapeHtmlStr(d.receiptNo)}</title>
  <style>
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .receipt-card { box-shadow: none !important; border: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f4f4f5;
      color: #18181b;
      margin: 0;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .receipt-card {
      max-width: 650px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #18181b;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .title { font-size: 24px; font-weight: 800; margin: 0; }
    .status-badge {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .amount-banner {
      background: #fafafa;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      margin-bottom: 28px;
    }
    .amount-val { font-size: 36px; font-weight: 800; color: #18181b; }
    .amount-lbl { font-size: 12px; color: #71717a; text-transform: uppercase; font-weight: 600; }
    .meta-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f4f4f5; font-size: 14px; }
    .meta-lbl { color: #71717a; font-weight: 600; }
    .meta-val { font-weight: 600; }
    .memo { margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 6px; font-size: 13px; color: #334155; }
    .print-bar { text-align: center; margin-bottom: 24px; }
    .btn { background: #18181b; color: #fff; border: none; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; }
    .btn:hover { background: #27272a; }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="receipt-card">
    <div class="header">
      <div>
        <h1 class="title">PAYMENT RECEIPT</h1>
        <div style="font-size: 13px; color: #71717a; margin-top: 4px;"># ${escapeHtmlStr(d.receiptNo)}</div>
      </div>
      <div class="status-badge">✓ PAID IN FULL</div>
    </div>

    <div class="amount-banner">
      <div class="amount-lbl">Amount Received</div>
      <div class="amount-val">${formatMoney(d.amount)} <span style="font-size: 18px; color: #71717a;">${escapeHtmlStr(d.currencyCode)}</span></div>
    </div>

    <div class="meta-row">
      <span class="meta-lbl">Payment Date</span>
      <span class="meta-val">${escapeHtmlStr(d.paymentDate)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Received From (Payer)</span>
      <span class="meta-val">${escapeHtmlStr(d.payer)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Issued By (Payee)</span>
      <span class="meta-val">${escapeHtmlStr(d.payee)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Payment Method</span>
      <span class="meta-val">${escapeHtmlStr(d.paymentMethod)}</span>
    </div>
    <div class="meta-row">
      <span class="meta-lbl">Transaction Reference</span>
      <span class="meta-val" style="font-family: monospace;">${escapeHtmlStr(d.reference)}</span>
    </div>

    <div class="memo">
      <div style="font-weight: 700; margin-bottom: 4px; color: #0f172a; font-size: 12px; text-transform: uppercase;">Payment For</div>
      ${escapeHtmlStr(d.description)}
    </div>
  </div>
</body>
</html>`;
}

interface TimesheetDayEntry {
  day: string;
  start: string;
  end: string;
  breakMin: number;
  hours: number;
  task: string;
}

interface TimesheetData {
  employeeName: string;
  clientProject: string;
  weekEnding: string;
  hourlyRate: number;
  overtimeRateMultiplier: number;
  standardWeeklyLimit: number;
  currency: string;
  currencyCode: string;
  entries: TimesheetDayEntry[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
}

function generateTimesheetHtml(d: TimesheetData): string {
  const money = moneyFormatter(d.currencyCode);
  const formatMoney = (n: number) => `${d.currency}${money.format(n)}`;

  const rows = d.entries
    .map(
      (entry) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-weight: 600;">${escapeHtmlStr(entry.day)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-family: monospace;">${escapeHtmlStr(entry.start)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-family: monospace;">${escapeHtmlStr(entry.end)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; text-align: center;">${entry.breakMin > 0 ? `${entry.breakMin} m` : '—'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; text-align: right; font-weight: 700;">${entry.hours.toFixed(2)} hrs</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #52525b;">${escapeHtmlStr(entry.task)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Timesheet — ${escapeHtmlStr(d.employeeName)} (${escapeHtmlStr(d.weekEnding)})</title>
  <style>
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .timesheet-card { box-shadow: none !important; border: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f4f4f5;
      color: #18181b;
      margin: 0;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .timesheet-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #18181b;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .title { font-size: 24px; font-weight: 800; margin: 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-card { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 14px 18px; }
    .info-label { font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 700; margin-bottom: 4px; }
    .info-val { font-size: 15px; font-weight: 600; color: #18181b; }
    .table-container { overflow-x: auto; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; text-align: center; }
    .stat-card.highlight { background: #18181b; color: #ffffff; border-color: #18181b; }
    .stat-card.highlight .stat-lbl { color: #a1a1aa; }
    .stat-lbl { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .stat-val { font-size: 20px; font-weight: 800; }
    .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7; margin-top: 24px; }
    .sig-line { border-bottom: 1px solid #18181b; height: 40px; margin-bottom: 8px; }
    .sig-label { font-size: 12px; color: #71717a; font-weight: 600; }
    .print-bar { text-align: center; margin-bottom: 24px; }
    .btn { background: #18181b; color: #fff; border: none; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; }
    .btn:hover { background: #27272a; }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="timesheet-card">
    <div class="header">
      <div>
        <h1 class="title">WEEKLY TIMESHEET</h1>
        <div style="font-size: 13px; color: #71717a; margin-top: 4px;">Standard Hours & Overtime Accounting</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; color: #71717a; font-weight: 600; text-transform: uppercase;">Week Ending</div>
        <div style="font-size: 16px; font-weight: 800;">${escapeHtmlStr(d.weekEnding)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="info-card">
        <div class="info-label">Employee / Contractor</div>
        <div class="info-val">${escapeHtmlStr(d.employeeName)}</div>
      </div>
      <div class="info-card">
        <div class="info-label">Client / Project</div>
        <div class="info-val">${escapeHtmlStr(d.clientProject)}</div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Start</th>
            <th>End</th>
            <th style="text-align: center;">Break</th>
            <th style="text-align: right;">Hours</th>
            <th>Task / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <div class="summary-grid">
      <div class="stat-card">
        <div class="stat-lbl">Regular Hours</div>
        <div class="stat-val">${d.regularHours.toFixed(2)} hrs</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Overtime Hours</div>
        <div class="stat-val" style="color: ${d.overtimeHours > 0 ? '#b91c1c' : '#18181b'};">${d.overtimeHours.toFixed(2)} hrs</div>
      </div>
      <div class="stat-card">
        <div class="stat-lbl">Total Hours</div>
        <div class="stat-val">${d.totalHours.toFixed(2)} hrs</div>
      </div>
      <div class="stat-card highlight">
        <div class="stat-lbl">Gross Pay</div>
        <div class="stat-val">${formatMoney(d.grossPay)}</div>
      </div>
    </div>

    <div style="font-size: 12px; color: #71717a; margin-bottom: 24px; padding: 10px 14px; background: #fafafa; border-radius: 6px;">
      <strong>Rate Details:</strong> Regular Rate: ${formatMoney(d.hourlyRate)}/hr | Overtime Rate (${d.overtimeRateMultiplier}x): ${formatMoney(d.hourlyRate * d.overtimeRateMultiplier)}/hr | Standard Weekly Limit: ${d.standardWeeklyLimit} hrs
    </div>

    <div class="signature-grid">
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Employee Signature & Date</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-label">Supervisor / Approver Signature & Date</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
