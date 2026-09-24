// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
//
// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'finance',
    title: 'Finance & business',
    description: 'Loans, tax, invoices, margins, and business maths.',
    destinations: [
      {
        id: 'finance-business-workbench:loan-emi-calculator',
        name: 'Loan EMI calculator',
        description:
          'Calculate equal monthly principal-and-interest payment for a fixed-rate amortizing loan.',
        href: '/finance/workbench?tool=loan-emi-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:mortgage-calculator',
        name: 'Mortgage principal & interest calculator',
        description:
          'Calculate fixed monthly principal/interest and total interest.',
        href: '/finance/workbench?tool=mortgage-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:simple-interest-calculator',
        name: 'Simple-interest calculator',
        description:
          'Multiply principal by annual rate by years for simple interest that is never compounded, shown as the interest alone and as principal plus interest.',
        href: '/finance/workbench?tool=simple-interest-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:compound-interest-calculator',
        name: 'Compound-interest calculator',
        description:
          'Calculate compound growth at an explicit annual frequency.',
        href: '/finance/workbench?tool=compound-interest-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:sip-calculator',
        name: 'Monthly contribution growth calculator',
        description:
          'Project end-of-month contributions at a constant monthly-equivalent return.',
        href: '/finance/workbench?tool=sip-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:lumpsum-investment-calculator',
        name: 'Lump-sum growth calculator',
        description: 'Project a one-time amount with monthly compounding.',
        href: '/finance/workbench?tool=lumpsum-investment-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:recurring-deposit-calculator',
        name: 'Recurring-deposit scenario',
        description:
          'Project fixed end-of-month deposits with an assumed constant rate.',
        href: '/finance/workbench?tool=recurring-deposit-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:fixed-deposit-calculator',
        name: 'Fixed-deposit scenario',
        description:
          'Project a fixed principal with explicit compounding frequency.',
        href: '/finance/workbench?tool=fixed-deposit-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:cagr-calculator',
        name: 'CAGR calculator',
        description:
          'Calculate compound annual growth from beginning value, ending value, and years.',
        href: '/finance/workbench?tool=cagr-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:roi-calculator',
        name: 'ROI calculator',
        description:
          'Enter what something cost and what it is worth or sold for, and see the net return in money and as a percentage of the cost, worked out in your browser.',
        href: '/finance/workbench?tool=roi-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:irr-calculator',
        name: 'Periodic IRR calculator',
        description:
          'Find one periodic discount rate whose NPV is approximately zero.',
        href: '/finance/workbench?tool=irr-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:xirr-calculator',
        name: 'Dated XIRR calculator',
        description: 'Find one annualized rate for irregular dated cash flows.',
        href: '/finance/workbench?tool=xirr-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:npv-calculator',
        name: 'NPV calculator',
        description: 'Discount equally spaced cash flows to period zero.',
        href: '/finance/workbench?tool=npv-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:inflation-calculator',
        name: 'Inflation scenario calculator',
        description:
          'Project the future cost of a current amount under constant inflation.',
        href: '/finance/workbench?tool=inflation-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:future-value-calculator',
        name: 'Future-value calculator',
        description:
          'Calculate a lump sum’s future value with periodic compounding.',
        href: '/finance/workbench?tool=future-value-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:present-value-calculator',
        name: 'Present-value calculator',
        description: 'Discount one future amount using periodic compounding.',
        href: '/finance/workbench?tool=present-value-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:annuity-calculator',
        name: 'Ordinary-annuity future-value calculator',
        description: 'Project equal end-of-period payments at a constant rate.',
        href: '/finance/workbench?tool=annuity-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:retirement-corpus-calculator',
        name: 'Retirement corpus scenario',
        description:
          'Estimate a retirement-date corpus from expenses, inflation, duration, and return assumptions.',
        href: '/finance/workbench?tool=retirement-corpus-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:emergency-fund-calculator',
        name: 'Emergency-fund scenario',
        description:
          'Multiply essential monthly expenses by reserve months and add one-off needs.',
        href: '/finance/workbench?tool=emergency-fund-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:savings-goal-calculator',
        name: 'Savings-goal contribution calculator',
        description:
          'Estimate the end-of-month contribution needed to reach a target.',
        href: '/finance/workbench?tool=savings-goal-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:debt-payoff-calculator',
        name: 'Debt-payoff calculator',
        description:
          'Simulate fixed monthly payments on one balance with monthly interest.',
        href: '/finance/workbench?tool=debt-payoff-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:credit-card-payoff-calculator',
        name: 'Credit-card payoff scenario',
        description:
          'Simulate fixed payments using a constant monthly APR fraction.',
        href: '/finance/workbench?tool=credit-card-payoff-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:debt-to-income-calculator',
        name: 'Debt-to-income calculator',
        description:
          'Calculate stated monthly debt payments as a percentage of stated gross monthly income.',
        href: '/finance/workbench?tool=debt-to-income-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:net-worth-calculator',
        name: 'Net-worth calculator',
        description:
          'List assets and liabilities one per line as name and amount, in your own browser tab, and the two totals are subtracted, with every line itemised back.',
        href: '/finance/workbench?tool=net-worth-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:budget-planner',
        name: 'Budget planner',
        description:
          'Total category expenses and show remaining stated income.',
        href: '/finance/workbench?tool=budget-planner',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:50-30-20-budget-calculator',
        name: '50/30/20 budget split',
        description:
          'Split stated income into 50%, 30%, and 20% reference amounts.',
        href: '/finance/workbench?tool=50-30-20-budget-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:gst-calculator',
        name: 'GST arithmetic calculator',
        description: 'Add a user-supplied GST percentage to a pre-tax amount.',
        href: '/finance/workbench?tool=gst-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:vat-calculator',
        name: 'VAT arithmetic calculator',
        description: 'Add a user-supplied VAT percentage to a pre-tax amount.',
        href: '/finance/workbench?tool=vat-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:sales-tax-calculator',
        name: 'Sales-tax arithmetic calculator',
        description:
          'Add a user-supplied sales-tax percentage to a pre-tax amount.',
        href: '/finance/workbench?tool=sales-tax-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:hourly-to-salary-calculator',
        name: 'Hourly-to-salary calculator',
        description:
          'Annualize an hourly rate using explicit weekly hours and working weeks.',
        href: '/finance/workbench?tool=hourly-to-salary-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:overtime-calculator',
        name: 'Overtime pay calculator',
        description:
          'Multiply hourly rate, overtime hours, and a supplied multiplier.',
        href: '/finance/workbench?tool=overtime-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:freelance-rate-calculator',
        name: 'Freelance-rate scenario',
        description:
          'Divide desired income plus expenses by estimated billable hours.',
        href: '/finance/workbench?tool=freelance-rate-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:markup-calculator',
        name: 'Markup calculator',
        description: 'Add a markup percentage to cost and show gross margin.',
        href: '/finance/workbench?tool=markup-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:margin-calculator',
        name: 'Margin calculator',
        description: 'Calculate gross profit and margin from revenue and cost.',
        href: '/finance/workbench?tool=margin-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:break-even-calculator',
        name: 'Break-even calculator',
        description:
          'Calculate units and sales from fixed cost and unit contribution.',
        href: '/finance/workbench?tool=break-even-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:profit-calculator',
        name: 'Profit calculator',
        description:
          'Take fixed and variable costs off revenue to see profit, total costs and margin as a percentage. Margin is reported as undefined when revenue is zero.',
        href: '/finance/workbench?tool=profit-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:discount-calculator',
        name: 'Discount calculator',
        description:
          'Enter an original price and a percentage off to see the amount taken off and the price after the reduction, for a sale tag that shows only the percentage.',
        href: '/finance/workbench?tool=discount-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:commission-calculator',
        name: 'Commission calculator',
        description:
          'Multiply eligible sales by a supplied commission percentage.',
        href: '/finance/workbench?tool=commission-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:tip-calculator',
        name: 'Tip calculator',
        description:
          'Type the bill before tip and the percentage you mean to leave; you get the tip on its own and the bill plus tip, so a card slip can be checked quickly.',
        href: '/finance/workbench?tool=tip-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:split-bill-calculator',
        name: 'Split-bill calculator',
        description:
          'Enter the bill, a tip percentage and how many people are paying, from 1 to 100,000, and get the tip, the total and the equal share per person.',
        href: '/finance/workbench?tool=split-bill-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:inventory-turnover-calculator',
        name: 'Inventory-turnover calculator',
        description:
          'Divide cost of goods sold by average inventory for a consistent period.',
        href: '/finance/workbench?tool=inventory-turnover-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:customer-acquisition-cost-calculator',
        name: 'Customer-acquisition cost calculator',
        description:
          'Divide supplied acquisition spend by supplied new customers.',
        href: '/finance/workbench?tool=customer-acquisition-cost-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:lifetime-value-calculator',
        name: 'Simplified customer LTV calculator',
        description:
          'Estimate monthly ARPU × gross-margin fraction ÷ monthly churn fraction.',
        href: '/finance/workbench?tool=lifetime-value-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:churn-rate-calculator',
        name: 'Customer churn-rate calculator',
        description:
          'Divide customers lost during a period by customers at period start.',
        href: '/finance/workbench?tool=churn-rate-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:mrr-calculator',
        name: 'MRR calculator',
        description:
          'Sum customer count × monthly recurring price across supplied plans.',
        href: '/finance/workbench?tool=mrr-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:arr-calculator',
        name: 'ARR calculator',
        description:
          'Annualize a supplied monthly recurring revenue by multiplying by 12.',
        href: '/finance/workbench?tool=arr-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:runway-calculator',
        name: 'Cash-runway calculator',
        description: 'Divide available cash by positive monthly net burn.',
        href: '/finance/workbench?tool=runway-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:burn-rate-calculator',
        name: 'Net burn-rate calculator',
        description:
          'Calculate average monthly cash decline over a supplied period.',
        href: '/finance/workbench?tool=burn-rate-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:invoice-late-fee-calculator',
        name: 'Invoice late-fee arithmetic',
        description:
          'Calculate simple monthly late fee using a user-supplied percentage and months.',
        href: '/finance/workbench?tool=invoice-late-fee-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:payment-fee-calculator',
        name: 'Payment fee & invoice calculator (Stripe / PayPal)',
        description:
          'Calculate merchant processing fees and the reverse invoice amount needed to receive exact net funds.',
        href: '/finance/workbench?tool=payment-fee-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:salary-hourly-converter',
        name: 'Salary to hourly & take-home converter',
        description:
          'Convert annual salary into monthly, bi-weekly, weekly, daily, and hourly gross & net take-home rates.',
        href: '/finance/workbench?tool=salary-hourly-converter',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:mortgage-extra-payment',
        name: 'Mortgage extra payment & savings calculator',
        description:
          'Calculate total interest savings and years saved by making extra monthly principal payments.',
        href: '/finance/workbench?tool=mortgage-extra-payment',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:saas-mrr-calculator',
        name: 'SaaS MRR growth & churn projection',
        description:
          'Project recurring revenue trajectory over 12 months factoring in new growth, expansion, and churn.',
        href: '/finance/workbench?tool=saas-mrr-calculator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:invoice-generator',
        name: 'Printable client bill maker',
        description:
          'Lay out a print-ready bill with itemised lines, a tax line and payment instructions. Rupee amounts group in lakh and crore.',
        href: '/finance/workbench?tool=invoice-generator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:receipt-generator',
        name: 'Printable payment receipt maker',
        description:
          'Generate official, print-ready payment receipts with reference IDs, payer/payee details, and itemized confirmation.',
        href: '/finance/workbench?tool=receipt-generator',
        workspaceId: 'finance-business-workbench',
      },
      {
        id: 'finance-business-workbench:timesheet-calculator',
        name: 'Weekly timesheet & billable overtime calculator',
        description:
          'Calculate daily work hours, 1.5x overtime, meal breaks, hourly pay, and generate a print-ready signed weekly timesheet.',
        href: '/finance/workbench?tool=timesheet-calculator',
        workspaceId: 'finance-business-workbench',
      },
    ],
  },
];
