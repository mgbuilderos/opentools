// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'life-admin',
    title: 'India & life admin',
    description: 'Indian paperwork, identifiers, and household admin.',
    destinations: [
      {
        id: 'aadhaar-pan-masker',
        name: 'Aadhaar and PAN masker',
        description:
          'Find and mask every Aadhaar and PAN number in pasted text or a text file.',
        href: '/life-admin/aadhaar-pan-masker',
        workspaceId: 'aadhaar-pan-masker',
      },
      {
        id: 'life-admin-workbench:aadhaar-masking-tool',
        name: 'Aadhaar masking tool',
        description:
          'Hide the first eight digits of one number and retain only the last four.',
        href: '/life-admin/workbench?tool=aadhaar-masking-tool',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:pan-masking-tool',
        name: 'PAN masking tool',
        description:
          'Hide the first six characters of one ten-character PAN value.',
        href: '/life-admin/workbench?tool=pan-masking-tool',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:bank-account-masking-tool',
        name: 'Bank account masking tool',
        description:
          'Hide all but the last four characters of an account reference.',
        href: '/life-admin/workbench?tool=bank-account-masking-tool',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:indian-address-formatter',
        name: 'Indian address formatter',
        description:
          'Clean spacing and place comma-separated address parts on lines.',
        href: '/life-admin/workbench?tool=indian-address-formatter',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:pin-code-format-checker',
        name: 'PIN code format checker',
        description: 'Check for a six-digit Indian postal-code shape.',
        href: '/life-admin/workbench?tool=pin-code-format-checker',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:indian-phone-number-formatter',
        name: 'Indian phone number formatter',
        description: 'Normalize a mobile number to +91 XXXXX XXXXX.',
        href: '/life-admin/workbench?tool=indian-phone-number-formatter',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:ifsc-format-checker',
        name: 'IFSC format checker',
        description: 'Check the RBI-documented 11-character IFSC structure.',
        href: '/life-admin/workbench?tool=ifsc-format-checker',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:micr-format-checker',
        name: 'MICR format checker',
        description: 'Check whether a MICR value contains exactly nine digits.',
        href: '/life-admin/workbench?tool=micr-format-checker',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:upi-id-format-checker',
        name: 'UPI ID format checker',
        description:
          'Check a conservative user@handle syntax and 45-character limit.',
        href: '/life-admin/workbench?tool=upi-id-format-checker',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:indian-currency-number-to-words',
        name: 'Indian currency number to words',
        description: 'Write rupees using thousand, lakh, and crore groups.',
        href: '/life-admin/workbench?tool=indian-currency-number-to-words',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:cheque-amount-writer',
        name: 'Cheque amount writer',
        description: 'Create an English “Rupees … Only” amount line.',
        href: '/life-admin/workbench?tool=cheque-amount-writer',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:house-rent-split-calculator',
        name: 'House rent split calculator',
        description: 'Split rent and shared charges evenly across occupants.',
        href: '/life-admin/workbench?tool=house-rent-split-calculator',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:electricity-bill-unit-calculator',
        name: 'Electricity unit calculator',
        description:
          'Calculate meter units and an optional user-supplied unit cost.',
        href: '/life-admin/workbench?tool=electricity-bill-unit-calculator',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:lpg-consumption-calculator',
        name: 'LPG consumption calculator',
        description:
          'Estimate daily use and days remaining from measured weights.',
        href: '/life-admin/workbench?tool=lpg-consumption-calculator',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:fuel-cost-calculator',
        name: 'Fuel cost calculator',
        description: 'Estimate fuel needed and cost from distance and mileage.',
        href: '/life-admin/workbench?tool=fuel-cost-calculator',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:mileage-calculator',
        name: 'Mileage calculator',
        description:
          'Calculate kilometres per litre from distance and fuel used.',
        href: '/life-admin/workbench?tool=mileage-calculator',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:road-trip-cost-calculator',
        name: 'Road trip cost calculator',
        description:
          'Combine fuel, toll, stay, food, and other trip estimates.',
        href: '/life-admin/workbench?tool=road-trip-cost-calculator',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:document-expiry-tracker',
        name: 'Document expiry tracker',
        description:
          'Calculate days until a document expires from a supplied date.',
        href: '/life-admin/workbench?tool=document-expiry-tracker',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:warranty-expiry-tracker',
        name: 'Warranty expiry tracker',
        description:
          'Estimate a warranty end date from purchase date and months.',
        href: '/life-admin/workbench?tool=warranty-expiry-tracker',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:emi-due-date-planner',
        name: 'EMI due-date planner',
        description: 'List monthly due dates from a first due date.',
        href: '/life-admin/workbench?tool=emi-due-date-planner',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:school-fee-planner',
        name: 'School fee planner',
        description: 'Split a supplied total into equal scheduled instalments.',
        href: '/life-admin/workbench?tool=school-fee-planner',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:wedding-budget-planner',
        name: 'Wedding budget planner',
        description:
          'Compare major supplied category estimates with a total budget.',
        href: '/life-admin/workbench?tool=wedding-budget-planner',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:notice-period-calculator',
        name: 'Notice period calculator',
        description: 'Add calendar days to a supplied notice date.',
        href: '/life-admin/workbench?tool=notice-period-calculator',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:life-path-number-calculator',
        name: 'Life path number calculator',
        description:
          'Calculate the life path number from a date of birth using digit reduction.',
        href: '/life-admin/workbench?tool=life-path-number-calculator',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:birth-number-calculator',
        name: 'Birth number calculator',
        description:
          'Calculate the birth number from the day of a date of birth using digit reduction.',
        href: '/life-admin/workbench?tool=birth-number-calculator',
        workspaceId: 'life-admin-workbench',
      },
      {
        id: 'life-admin-workbench:personal-year-number-calculator',
        name: 'Personal year number calculator',
        description:
          'Calculate the personal year number for a chosen year from a date of birth using digit reduction.',
        href: '/life-admin/workbench?tool=personal-year-number-calculator',
        workspaceId: 'life-admin-workbench',
      },
    ],
  },
] as const;
