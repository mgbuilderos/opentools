// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'qr-generators',
    title: 'QR Code Generators',
    description: 'Wi-Fi, URLs, contact vCards, payments, and custom payloads.',
    destinations: [
      {
        id: 'qr-barcode-workbench:qr-code-generator',
        name: 'QR code generator',
        description:
          'Create a downloadable SVG QR symbol from supplied content.',
        href: '/qr/workbench?tool=qr-code-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:url-qr-code',
        name: 'URL QR code',
        description: 'Encode a validated HTTP or HTTPS destination.',
        href: '/qr/workbench?tool=url-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:text-qr-code',
        name: 'Text QR code',
        description: 'Encode plain Unicode text without a redirect service.',
        href: '/qr/workbench?tool=text-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:wi-fi-qr-code',
        name: 'Wi-Fi QR code',
        description:
          'Create a Wi-Fi configuration payload for a supplied network.',
        href: '/qr/workbench?tool=wi-fi-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:vcard-qr-code',
        name: 'vCard QR code',
        description: 'Create a compact vCard 3.0 contact payload.',
        href: '/qr/workbench?tool=vcard-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:email-qr-code',
        name: 'Email QR code',
        description: 'Encode a mailto draft with recipient, subject, and body.',
        href: '/qr/workbench?tool=email-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:sms-qr-code',
        name: 'SMS QR code',
        description: 'Encode a phone number and draft SMS body.',
        href: '/qr/workbench?tool=sms-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:phone-qr-code',
        name: 'Phone QR code',
        description: 'Create a tel URI QR symbol.',
        href: '/qr/workbench?tool=phone-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:location-qr-code',
        name: 'Location QR code',
        description: 'Encode latitude and longitude as a geo URI.',
        href: '/qr/workbench?tool=location-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:calendar-event-qr-code',
        name: 'Calendar event QR code',
        description: 'Create an iCalendar event payload using UTC timestamps.',
        href: '/qr/workbench?tool=calendar-event-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:upi-qr-code',
        name: 'UPI QR code',
        description:
          'Create a UPI payment deep-link payload from supplied values.',
        href: '/qr/workbench?tool=upi-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:bitcoin-qr-code',
        name: 'Bitcoin QR code',
        description: 'Create a BIP21-shaped bitcoin payment URI.',
        href: '/qr/workbench?tool=bitcoin-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:app-store-qr-code',
        name: 'App Store QR code',
        description: 'Encode a supplied official app-listing URL.',
        href: '/qr/workbench?tool=app-store-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:multi-link-qr-code',
        name: 'Multi-link QR code',
        description: 'Encode a tiny self-contained offline HTML link list.',
        href: '/qr/workbench?tool=multi-link-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-svg-export',
        name: 'QR code SVG export',
        description: 'Create a scalable vector QR symbol with chosen colors.',
        href: '/qr/workbench?tool=qr-code-svg-export',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-logo-embedder',
        name: 'QR code logo embedder',
        description:
          'Embed a local PNG, JPEG, or WebP image in a high-correction QR SVG.',
        href: '/qr/workbench?tool=qr-code-logo-embedder',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-batch-generator',
        name: 'QR code batch generator',
        description: 'Generate up to 12 QR symbols in one SVG sheet.',
        href: '/qr/workbench?tool=qr-code-batch-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-contact-sheet',
        name: 'QR code contact sheet',
        description: 'Create a printable labelled grid of up to 12 QR symbols.',
        href: '/qr/workbench?tool=qr-code-contact-sheet',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-error-correction-tester',
        name: 'QR error-correction tester',
        description: 'Compare L, M, Q, and H symbols for the same payload.',
        href: '/qr/workbench?tool=qr-code-error-correction-tester',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-frame-generator',
        name: 'Framed QR card generator',
        description:
          'Generate a print-ready vector QR card with custom CTA badge and border.',
        href: '/qr/workbench?tool=qr-code-frame-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:mecard-qr-code',
        name: 'MeCard QR code',
        description:
          'Create an ultra-compact MeCard contact QR code for fast mobile address-book scanning.',
        href: '/qr/workbench?tool=mecard-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:social-media-qr-code',
        name: 'Social media QR code',
        description:
          'Create a direct profile link QR code for YouTube, X, Instagram, LinkedIn, GitHub, or Facebook.',
        href: '/qr/workbench?tool=social-media-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:crypto-payment-qr-code',
        name: 'Crypto payment QR code',
        description:
          'Create a direct wallet payment QR code for Ethereum, Solana, Bitcoin, or USDT.',
        href: '/qr/workbench?tool=crypto-payment-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:ean-13-generator',
        name: 'EAN-13 generator',
        description:
          'Validate or add a GTIN-13 check digit and draw the EAN-13 bars.',
        href: '/qr/workbench?tool=ean-13-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:ean-8-generator',
        name: 'EAN-8 generator',
        description:
          'Validate or add a GTIN-8 check digit and draw the EAN-8 bars.',
        href: '/qr/workbench?tool=ean-8-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:upc-a-generator',
        name: 'UPC-A generator',
        description:
          'Validate or add a GTIN-12 check digit and draw UPC-A bars.',
        href: '/qr/workbench?tool=upc-a-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:code-39-generator',
        name: 'Code 39 generator',
        description:
          'Draw Code 39 for uppercase text using the standard character set.',
        href: '/qr/workbench?tool=code-39-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:itf-14-generator',
        name: 'ITF-14 generator',
        description:
          'Validate or add a GTIN-14 check digit and draw Interleaved 2 of 5 bars.',
        href: '/qr/workbench?tool=itf-14-generator',
        workspaceId: 'qr-barcode-workbench',
      },
    ],
  },
  {
    id: 'barcode-labels',
    title: 'Linear Barcodes & Print Sheets',
    description:
      'EAN-13, EAN-8, UPC-A, Code 39, ITF-14, and printable code sheets.',
    destinations: [
      {
        id: 'qr-barcode-workbench:qr-code-generator',
        name: 'QR code generator',
        description:
          'Create a downloadable SVG QR symbol from supplied content.',
        href: '/qr/workbench?tool=qr-code-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:url-qr-code',
        name: 'URL QR code',
        description: 'Encode a validated HTTP or HTTPS destination.',
        href: '/qr/workbench?tool=url-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:text-qr-code',
        name: 'Text QR code',
        description: 'Encode plain Unicode text without a redirect service.',
        href: '/qr/workbench?tool=text-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:wi-fi-qr-code',
        name: 'Wi-Fi QR code',
        description:
          'Create a Wi-Fi configuration payload for a supplied network.',
        href: '/qr/workbench?tool=wi-fi-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:vcard-qr-code',
        name: 'vCard QR code',
        description: 'Create a compact vCard 3.0 contact payload.',
        href: '/qr/workbench?tool=vcard-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:email-qr-code',
        name: 'Email QR code',
        description: 'Encode a mailto draft with recipient, subject, and body.',
        href: '/qr/workbench?tool=email-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:sms-qr-code',
        name: 'SMS QR code',
        description: 'Encode a phone number and draft SMS body.',
        href: '/qr/workbench?tool=sms-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:phone-qr-code',
        name: 'Phone QR code',
        description: 'Create a tel URI QR symbol.',
        href: '/qr/workbench?tool=phone-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:location-qr-code',
        name: 'Location QR code',
        description: 'Encode latitude and longitude as a geo URI.',
        href: '/qr/workbench?tool=location-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:calendar-event-qr-code',
        name: 'Calendar event QR code',
        description: 'Create an iCalendar event payload using UTC timestamps.',
        href: '/qr/workbench?tool=calendar-event-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:upi-qr-code',
        name: 'UPI QR code',
        description:
          'Create a UPI payment deep-link payload from supplied values.',
        href: '/qr/workbench?tool=upi-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:bitcoin-qr-code',
        name: 'Bitcoin QR code',
        description: 'Create a BIP21-shaped bitcoin payment URI.',
        href: '/qr/workbench?tool=bitcoin-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:app-store-qr-code',
        name: 'App Store QR code',
        description: 'Encode a supplied official app-listing URL.',
        href: '/qr/workbench?tool=app-store-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:multi-link-qr-code',
        name: 'Multi-link QR code',
        description: 'Encode a tiny self-contained offline HTML link list.',
        href: '/qr/workbench?tool=multi-link-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-svg-export',
        name: 'QR code SVG export',
        description: 'Create a scalable vector QR symbol with chosen colors.',
        href: '/qr/workbench?tool=qr-code-svg-export',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-logo-embedder',
        name: 'QR code logo embedder',
        description:
          'Embed a local PNG, JPEG, or WebP image in a high-correction QR SVG.',
        href: '/qr/workbench?tool=qr-code-logo-embedder',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-batch-generator',
        name: 'QR code batch generator',
        description: 'Generate up to 12 QR symbols in one SVG sheet.',
        href: '/qr/workbench?tool=qr-code-batch-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-contact-sheet',
        name: 'QR code contact sheet',
        description: 'Create a printable labelled grid of up to 12 QR symbols.',
        href: '/qr/workbench?tool=qr-code-contact-sheet',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-error-correction-tester',
        name: 'QR error-correction tester',
        description: 'Compare L, M, Q, and H symbols for the same payload.',
        href: '/qr/workbench?tool=qr-code-error-correction-tester',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:qr-code-frame-generator',
        name: 'Framed QR card generator',
        description:
          'Generate a print-ready vector QR card with custom CTA badge and border.',
        href: '/qr/workbench?tool=qr-code-frame-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:mecard-qr-code',
        name: 'MeCard QR code',
        description:
          'Create an ultra-compact MeCard contact QR code for fast mobile address-book scanning.',
        href: '/qr/workbench?tool=mecard-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:social-media-qr-code',
        name: 'Social media QR code',
        description:
          'Create a direct profile link QR code for YouTube, X, Instagram, LinkedIn, GitHub, or Facebook.',
        href: '/qr/workbench?tool=social-media-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:crypto-payment-qr-code',
        name: 'Crypto payment QR code',
        description:
          'Create a direct wallet payment QR code for Ethereum, Solana, Bitcoin, or USDT.',
        href: '/qr/workbench?tool=crypto-payment-qr-code',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:ean-13-generator',
        name: 'EAN-13 generator',
        description:
          'Validate or add a GTIN-13 check digit and draw the EAN-13 bars.',
        href: '/qr/workbench?tool=ean-13-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:ean-8-generator',
        name: 'EAN-8 generator',
        description:
          'Validate or add a GTIN-8 check digit and draw the EAN-8 bars.',
        href: '/qr/workbench?tool=ean-8-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:upc-a-generator',
        name: 'UPC-A generator',
        description:
          'Validate or add a GTIN-12 check digit and draw UPC-A bars.',
        href: '/qr/workbench?tool=upc-a-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:code-39-generator',
        name: 'Code 39 generator',
        description:
          'Draw Code 39 for uppercase text using the standard character set.',
        href: '/qr/workbench?tool=code-39-generator',
        workspaceId: 'qr-barcode-workbench',
      },
      {
        id: 'qr-barcode-workbench:itf-14-generator',
        name: 'ITF-14 generator',
        description:
          'Validate or add a GTIN-14 check digit and draw Interleaved 2 of 5 bars.',
        href: '/qr/workbench?tool=itf-14-generator',
        workspaceId: 'qr-barcode-workbench',
      },
    ],
  },
];
