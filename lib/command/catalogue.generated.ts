// Generated from `buildCommandCatalogue` -- see lib/command/build-catalogue.ts
// for why, and catalogue.test.ts, which fails if this file drifts from the
// registries it was built from.
//
// Regenerate with `npx tsx scripts/generate-command-index.mjs`.
import type { CommandCatalogueEntry } from './types';

export const COMMAND_CATALOGUE: readonly CommandCatalogueEntry[] = [
  {
    href: '/audio/convert',
    name: 'Audio to WAV converter',
    terms:
      'aiff change fade file flac levelling m4a memo mono mp3 normalise ogg rate recording sample trimming voice volume',
  },
  {
    href: '/audio/loudness',
    name: 'Audio Loudness & Delivery Check',
    terms:
      '1770 17704 4 acx against audiobook bs dbtp ebu file floor integrated itu itur lra luf mastering measure meter noise normalizer peak r r128 range spotify standard streaming true verify',
  },
  {
    href: '/audio/mp3-toolkit',
    name: 'MP3 toolkit',
    terms:
      'audio bitrate check copying cut edit encoding file frame id3 inspect join maker merge no re reencoding remove ringtone song tag trim trimmer',
  },
  {
    href: '/audio/mp3-toolkit?tool=mp3-cut',
    name: 'MP3 cutter',
    terms: 'boundarie clip encoding frame no re reencoding toolkit trim',
  },
  {
    href: '/audio/mp3-toolkit?tool=mp3-inspect',
    name: 'MP3 inspector',
    terms: 'bitrate count frame measure rate sample tag toolkit',
  },
  {
    href: '/audio/mp3-toolkit?tool=mp3-join',
    name: 'MP3 joiner',
    terms: 'channel count end rate sample share toolkit',
  },
  {
    href: '/audio/mp3-toolkit?tool=mp3-tags',
    name: 'MP3 tag editor',
    terms: 'audio id3 read remove replace toolkit touching',
  },
  {
    href: '/batch',
    name: 'The Bench',
    terms:
      '631 analyze array based batch capture convert csv expression extraction flag folder group header highlighting inspect json live machine match object operation regular run strict test tester whole',
  },
  {
    href: '/batch?tool=email-parse-eml',
    name: 'Parse EML',
    terms: '5322 attachment batch bodie header mime read rfc',
    op: 'formats-email file text',
  },
  {
    href: '/batch?tool=email-parse-mbox',
    name: 'Parse mbox',
    terms: 'archive batch body escaped message read separator',
    op: 'formats-email file text',
  },
  {
    href: '/batch?tool=email-parse-msg',
    name: 'Parse MSG',
    terms: 'ansi attachment batch cfb propertie read storage unicode',
    op: 'formats-email file text',
  },
  {
    href: '/batch?tool=finance-parse-ofx',
    name: 'Parse OFX',
    terms: '1 2 account balance batch read transaction x',
    op: 'formats-finance file text',
  },
  {
    href: '/batch?tool=finance-parse-qif',
    name: 'Parse QIF',
    terms: 'account balance batch metadata read statement transaction',
    op: 'formats-finance file text',
  },
  {
    href: '/batch?tool=finance-reconcile',
    name: 'Reconcile statement totals',
    terms: 'balance batch closing compare opening plu rounding transaction',
    op: 'formats-finance text text',
  },
  {
    href: '/batch?tool=pdfcrypt-decrypt',
    name: 'Unlock PDF',
    terms:
      'batch decrypt handler owner password standard standardhandler supplied user',
    op: 'formats-pdfcrypt file files',
  },
  {
    href: '/batch?tool=pdfcrypt-encrypt-r6',
    name: 'Protect PDF with AES-256',
    terms: '6 aes256 batch encrypt revision security standard',
    op: 'formats-pdfcrypt file files',
  },
  {
    href: '/batch?tool=pdfcrypt-inspect',
    name: 'Inspect PDF encryption',
    terms:
      'batch handler identify kind password revision security securityhandler standard',
    op: 'formats-pdfcrypt file text',
  },
  {
    href: '/convert/acres-to-cm2',
    name: 'Convert Acres to Square centimetres',
    terms: 'cm2',
  },
  {
    href: '/convert/acres-to-ft2',
    name: 'Convert Acres to Square feet (acre to ft²)',
    terms: '',
  },
  {
    href: '/convert/acres-to-hectares',
    name: 'Convert Acres to Hectares (acre to ha)',
    terms: '',
  },
  {
    href: '/convert/acres-to-in2',
    name: 'Convert Acres to Square inches (acre to in²)',
    terms: '',
  },
  {
    href: '/convert/acres-to-km2',
    name: 'Convert Acres to Square kilometres (acre to km²)',
    terms: '',
  },
  {
    href: '/convert/acres-to-m2',
    name: 'Convert Acres to Square metres (acre to m²)',
    terms: '',
  },
  {
    href: '/convert/acres-to-mi2',
    name: 'Convert Acres to Square miles (acre to mi²)',
    terms: '',
  },
  {
    href: '/convert/asciidoc-to-csv',
    name: 'AsciiDoc to CSV converter',
    terms: '',
  },
  {
    href: '/convert/asciidoc-to-html',
    name: 'AsciiDoc to HTML converter',
    terms: '',
  },
  {
    href: '/convert/asciidoc-to-json',
    name: 'AsciiDoc to JSON converter',
    terms: '',
  },
  {
    href: '/convert/asciidoc-to-latex',
    name: 'AsciiDoc to LaTeX converter',
    terms: '',
  },
  {
    href: '/convert/asciidoc-to-markdown',
    name: 'AsciiDoc to Markdown converter',
    terms: '',
  },
  {
    href: '/convert/asciidoc-to-rst',
    name: 'AsciiDoc to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/asciidoc-to-sql',
    name: 'AsciiDoc to SQL converter',
    terms: '',
  },
  {
    href: '/convert/asciidoc-to-tsv',
    name: 'AsciiDoc to TSV converter',
    terms: '',
  },
  {
    href: '/convert/asciidoc-to-xml',
    name: 'AsciiDoc to XML converter',
    terms: '',
  },
  {
    href: '/convert/asciidoc-to-yaml',
    name: 'AsciiDoc to YAML converter',
    terms: '',
  },
  {
    href: '/convert/atmospheres-to-bar',
    name: 'Convert Atmospheres to Bar (atm to bar)',
    terms: '',
  },
  {
    href: '/convert/atmospheres-to-kilopascals',
    name: 'Convert Atmospheres to Kilopascals (atm to kPa)',
    terms: '',
  },
  {
    href: '/convert/atmospheres-to-megapascals',
    name: 'Convert Atmospheres to Megapascals (atm to MPa)',
    terms: '',
  },
  {
    href: '/convert/atmospheres-to-pascals',
    name: 'Convert Atmospheres to Pascals (atm to Pa)',
    terms: '',
  },
  {
    href: '/convert/atmospheres-to-psi',
    name: 'Convert Atmospheres to Pounds per square inch',
    terms: 'atm psi',
  },
  {
    href: '/convert/avif-to-jpg',
    name: 'AVIF to JPEG converter',
    terms: 'jpg',
  },
  {
    href: '/convert/avif-to-png',
    name: 'AVIF to PNG converter',
    terms: '',
  },
  {
    href: '/convert/avif-to-webp',
    name: 'AVIF to WebP converter',
    terms: '',
  },
  {
    href: '/convert/bar-to-atmospheres',
    name: 'Convert Bar to Atmospheres (bar to atm)',
    terms: '',
  },
  {
    href: '/convert/bar-to-kilopascals',
    name: 'Convert Bar to Kilopascals (bar to kPa)',
    terms: '',
  },
  {
    href: '/convert/bar-to-megapascals',
    name: 'Convert Bar to Megapascals (bar to MPa)',
    terms: '',
  },
  {
    href: '/convert/bar-to-pascals',
    name: 'Convert Bar to Pascals (bar to Pa)',
    terms: '',
  },
  {
    href: '/convert/bar-to-psi',
    name: 'Convert Bar to Pounds per square inch',
    terms: 'psi',
  },
  {
    href: '/convert/bmp-to-jpg',
    name: 'BMP to JPEG converter',
    terms: 'jpg',
  },
  {
    href: '/convert/bmp-to-png',
    name: 'BMP to PNG converter',
    terms: '',
  },
  {
    href: '/convert/bmp-to-webp',
    name: 'BMP to WebP converter',
    terms: '',
  },
  {
    href: '/convert/btu-h-to-hp',
    name: 'Convert BTU per hour to Mechanical horsepower',
    terms: 'h hp',
  },
  {
    href: '/convert/btu-h-to-kilowatts',
    name: 'Convert BTU per hour to Kilowatts (BTU/h to kW)',
    terms: '',
  },
  {
    href: '/convert/btu-h-to-megawatts',
    name: 'Convert BTU per hour to Megawatts (BTU/h to MW)',
    terms: '',
  },
  {
    href: '/convert/btu-h-to-watts',
    name: 'Convert BTU per hour to Watts (BTU/h to W)',
    terms: '',
  },
  {
    href: '/convert/btu-to-calories',
    name: 'Convert BTU (IT) to Calories',
    terms: 'cal',
  },
  {
    href: '/convert/btu-to-joules',
    name: 'Convert BTU (IT) to Joules',
    terms: 'j',
  },
  {
    href: '/convert/btu-to-kilocalories',
    name: 'Convert BTU (IT) to Kilocalories',
    terms: 'kcal',
  },
  {
    href: '/convert/btu-to-kilojoules',
    name: 'Convert BTU (IT) to Kilojoules',
    terms: 'kj',
  },
  {
    href: '/convert/btu-to-kilowatt-hours',
    name: 'Convert BTU (IT) to Kilowatt-hours',
    terms: 'kilowatthour kwh',
  },
  {
    href: '/convert/btu-to-watt-hours',
    name: 'Convert BTU (IT) to Watt-hours',
    terms: 'watthour wh',
  },
  {
    href: '/convert/bytes-to-gb',
    name: 'Convert Bytes to Gigabytes (10⁹)',
    terms: 'b gb',
  },
  {
    href: '/convert/bytes-to-gib',
    name: 'Convert Bytes to Gibibytes (2³⁰)',
    terms: 'b gib',
  },
  {
    href: '/convert/bytes-to-kb',
    name: 'Convert Bytes to Kilobytes (10³)',
    terms: 'b kb',
  },
  {
    href: '/convert/bytes-to-kib',
    name: 'Convert Bytes to Kibibytes (2¹⁰)',
    terms: 'b kib',
  },
  {
    href: '/convert/bytes-to-mb',
    name: 'Convert Bytes to Megabytes (10⁶)',
    terms: 'b mb',
  },
  {
    href: '/convert/bytes-to-mib',
    name: 'Convert Bytes to Mebibytes (2²⁰)',
    terms: 'b mib',
  },
  {
    href: '/convert/calories-to-btu',
    name: 'Convert Calories to BTU (IT)',
    terms: 'cal',
  },
  {
    href: '/convert/calories-to-joules',
    name: 'Convert Calories to Joules (cal to J)',
    terms: '',
  },
  {
    href: '/convert/calories-to-kilocalories',
    name: 'Convert Calories to Kilocalories (cal to kcal)',
    terms: '',
  },
  {
    href: '/convert/calories-to-kilojoules',
    name: 'Convert Calories to Kilojoules (cal to kJ)',
    terms: '',
  },
  {
    href: '/convert/calories-to-kilowatt-hours',
    name: 'Convert Calories to Kilowatt-hours (cal to kWh)',
    terms: 'kilowatthour',
  },
  {
    href: '/convert/calories-to-watt-hours',
    name: 'Convert Calories to Watt-hours (cal to Wh)',
    terms: 'watthour',
  },
  {
    href: '/convert/celsius-to-fahrenheit',
    name: 'Convert Celsius to Fahrenheit (C to F)',
    terms: '',
  },
  {
    href: '/convert/celsius-to-kelvin',
    name: 'Convert Celsius to Kelvin (C to K)',
    terms: '',
  },
  {
    href: '/convert/centimetres-to-feet',
    name: 'Convert Centimetres to Feet (cm to ft)',
    terms: '',
  },
  {
    href: '/convert/centimetres-to-inches',
    name: 'Convert Centimetres to Inches (cm to in)',
    terms: '',
  },
  {
    href: '/convert/centimetres-to-kilometres',
    name: 'Convert Centimetres to Kilometres (cm to km)',
    terms: '',
  },
  {
    href: '/convert/centimetres-to-metres',
    name: 'Convert Centimetres to Metres (cm to m)',
    terms: '',
  },
  {
    href: '/convert/centimetres-to-miles',
    name: 'Convert Centimetres to Miles (cm to mi)',
    terms: '',
  },
  {
    href: '/convert/centimetres-to-millimetres',
    name: 'Convert Centimetres to Millimetres (cm to mm)',
    terms: '',
  },
  {
    href: '/convert/centimetres-to-nmi',
    name: 'Convert Centimetres to Nautical miles',
    terms: 'cm nmi',
  },
  {
    href: '/convert/centimetres-to-yards',
    name: 'Convert Centimetres to Yards (cm to yd)',
    terms: '',
  },
  {
    href: '/convert/cm2-to-acres',
    name: 'Convert Square centimetres to Acres',
    terms: 'cm2',
  },
  {
    href: '/convert/cm2-to-ft2',
    name: 'Convert Square centimetres to Square feet',
    terms: 'cm2 ft2',
  },
  {
    href: '/convert/cm2-to-hectares',
    name: 'Convert Square centimetres to Hectares',
    terms: 'cm2',
  },
  {
    href: '/convert/cm2-to-in2',
    name: 'Convert Square centimetres to Square inches',
    terms: 'cm2 in2',
  },
  {
    href: '/convert/cm2-to-km2',
    name: 'Convert Square centimetres to Square kilometres',
    terms: 'cm2 km2',
  },
  {
    href: '/convert/cm2-to-m2',
    name: 'Convert Square centimetres to Square metres',
    terms: 'cm2 m2',
  },
  {
    href: '/convert/cm2-to-mi2',
    name: 'Convert Square centimetres to Square miles',
    terms: 'cm2 mi2',
  },
  {
    href: '/convert/cm3-to-cup-us',
    name: 'Convert Cubic centimetres to US cups',
    terms: 'cm3',
  },
  {
    href: '/convert/cm3-to-floz-us',
    name: 'Convert Cubic centimetres to US fluid ounces',
    terms: 'cm3 floz',
  },
  {
    href: '/convert/cm3-to-ft3',
    name: 'Convert Cubic centimetres to Cubic feet',
    terms: 'cm3 ft3',
  },
  {
    href: '/convert/cm3-to-gal-us',
    name: 'Convert Cubic centimetres to US gallons',
    terms: 'cm3 gal',
  },
  {
    href: '/convert/cm3-to-litres',
    name: 'Convert Cubic centimetres to Litres (cm³ to l)',
    terms: '',
  },
  {
    href: '/convert/cm3-to-m3',
    name: 'Convert Cubic centimetres to Cubic metres',
    terms: 'cm3 m3',
  },
  {
    href: '/convert/cm3-to-millilitres',
    name: 'Convert Cubic centimetres to Millilitres',
    terms: 'cm3 ml',
  },
  {
    href: '/convert/csv-to-asciidoc',
    name: 'CSV to AsciiDoc converter',
    terms: '',
  },
  {
    href: '/convert/csv-to-html',
    name: 'CSV to HTML converter',
    terms: '',
  },
  {
    href: '/convert/csv-to-latex',
    name: 'CSV to LaTeX converter',
    terms: '',
  },
  {
    href: '/convert/csv-to-markdown',
    name: 'CSV to Markdown converter',
    terms: '',
  },
  {
    href: '/convert/csv-to-rst',
    name: 'CSV to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/csv-to-xml',
    name: 'CSV to XML converter',
    terms: '',
  },
  {
    href: '/convert/csv-to-yaml',
    name: 'CSV to YAML converter',
    terms: '',
  },
  {
    href: '/convert/cup-us-to-cm3',
    name: 'Convert US cups to Cubic centimetres',
    terms: 'cm3',
  },
  {
    href: '/convert/cup-us-to-floz-us',
    name: 'Convert US cups to US fluid ounces',
    terms: 'floz',
  },
  {
    href: '/convert/cup-us-to-ft3',
    name: 'Convert US cups to Cubic feet',
    terms: 'ft3',
  },
  {
    href: '/convert/cup-us-to-gal-us',
    name: 'Convert US cups to US gallons',
    terms: 'gal',
  },
  {
    href: '/convert/cup-us-to-litres',
    name: 'Convert US cups to Litres',
    terms: 'l',
  },
  {
    href: '/convert/cup-us-to-m3',
    name: 'Convert US cups to Cubic metres',
    terms: 'm3',
  },
  {
    href: '/convert/cup-us-to-millilitres',
    name: 'Convert US cups to Millilitres',
    terms: 'ml',
  },
  {
    href: '/convert/cup-us-to-tbsp',
    name: 'Convert US cups to US tablespoons',
    terms: 'tbsp',
  },
  {
    href: '/convert/cup-us-to-tsp',
    name: 'Convert US cups to US teaspoons',
    terms: 'tsp',
  },
  {
    href: '/convert/days-to-hours',
    name: 'Convert Days to Hours (day to h)',
    terms: '',
  },
  {
    href: '/convert/days-to-milliseconds',
    name: 'Convert Days to Milliseconds (day to ms)',
    terms: '',
  },
  {
    href: '/convert/days-to-minutes',
    name: 'Convert Days to Minutes (day to min)',
    terms: '',
  },
  {
    href: '/convert/days-to-seconds',
    name: 'Convert Days to Seconds (day to s)',
    terms: '',
  },
  {
    href: '/convert/days-to-weeks',
    name: 'Convert Days to Weeks (day to week)',
    terms: '',
  },
  {
    href: '/convert/degrees-to-gradians',
    name: 'Convert Degrees to Gradians (deg to grad)',
    terms: '',
  },
  {
    href: '/convert/degrees-to-radians',
    name: 'Convert Degrees to Radians (deg to rad)',
    terms: '',
  },
  {
    href: '/convert/degrees-to-turns',
    name: 'Convert Degrees to Turns (deg to turn)',
    terms: '',
  },
  {
    href: '/convert/dynes-to-kilogram-force',
    name: 'Convert Dynes to Kilogram-force (dyn to kgf)',
    terms: 'kilogramforce',
  },
  {
    href: '/convert/dynes-to-kilonewtons',
    name: 'Convert Dynes to Kilonewtons (dyn to kN)',
    terms: '',
  },
  {
    href: '/convert/dynes-to-newtons',
    name: 'Convert Dynes to Newtons (dyn to N)',
    terms: '',
  },
  {
    href: '/convert/dynes-to-pound-force',
    name: 'Convert Dynes to Pound-force (dyn to lbf)',
    terms: 'poundforce',
  },
  {
    href: '/convert/fahrenheit-to-celsius',
    name: 'Convert Fahrenheit to Celsius (F to C)',
    terms: '',
  },
  {
    href: '/convert/fahrenheit-to-kelvin',
    name: 'Convert Fahrenheit to Kelvin (F to K)',
    terms: '',
  },
  {
    href: '/convert/feet-to-centimetres',
    name: 'Convert Feet to Centimetres (ft to cm)',
    terms: '',
  },
  {
    href: '/convert/feet-to-inches',
    name: 'Convert Feet to Inches (ft to in)',
    terms: '',
  },
  {
    href: '/convert/feet-to-kilometres',
    name: 'Convert Feet to Kilometres (ft to km)',
    terms: '',
  },
  {
    href: '/convert/feet-to-metres',
    name: 'Convert Feet to Metres (ft to m)',
    terms: '',
  },
  {
    href: '/convert/feet-to-miles',
    name: 'Convert Feet to Miles (ft to mi)',
    terms: '',
  },
  {
    href: '/convert/feet-to-millimetres',
    name: 'Convert Feet to Millimetres (ft to mm)',
    terms: '',
  },
  {
    href: '/convert/feet-to-nmi',
    name: 'Convert Feet to Nautical miles (ft to nmi)',
    terms: '',
  },
  {
    href: '/convert/feet-to-yards',
    name: 'Convert Feet to Yards (ft to yd)',
    terms: '',
  },
  {
    href: '/convert/floz-us-to-cm3',
    name: 'Convert US fluid ounces to Cubic centimetres',
    terms: 'cm3 floz',
  },
  {
    href: '/convert/floz-us-to-cup-us',
    name: 'Convert US fluid ounces to US cups',
    terms: 'floz',
  },
  {
    href: '/convert/floz-us-to-ft3',
    name: 'Convert US fluid ounces to Cubic feet',
    terms: 'floz ft3',
  },
  {
    href: '/convert/floz-us-to-gal-us',
    name: 'Convert US fluid ounces to US gallons',
    terms: 'floz gal',
  },
  {
    href: '/convert/floz-us-to-litres',
    name: 'Convert US fluid ounces to Litres',
    terms: 'floz l',
  },
  {
    href: '/convert/floz-us-to-m3',
    name: 'Convert US fluid ounces to Cubic metres',
    terms: 'floz m3',
  },
  {
    href: '/convert/floz-us-to-millilitres',
    name: 'Convert US fluid ounces to Millilitres',
    terms: 'floz ml',
  },
  {
    href: '/convert/floz-us-to-tbsp',
    name: 'Convert US fluid ounces to US tablespoons',
    terms: 'floz tbsp',
  },
  {
    href: '/convert/floz-us-to-tsp',
    name: 'Convert US fluid ounces to US teaspoons',
    terms: 'floz tsp',
  },
  {
    href: '/convert/formats',
    name: 'File format converter',
    terms:
      'another asciidoc csv data export html json latex markdown one paper paste readme restructuredtext spreadsheet sql table tsv xml yaml',
  },
  {
    href: '/convert/ft-s-to-km-h',
    name: 'Convert Feet per second to Kilometres per hour',
    terms: 'ft h km s',
  },
  {
    href: '/convert/ft-s-to-knots',
    name: 'Convert Feet per second to Knots (ft/s to knot)',
    terms: '',
  },
  {
    href: '/convert/ft-s-to-m-s',
    name: 'Convert Feet per second to Metres per second',
    terms: 'ft m s',
  },
  {
    href: '/convert/ft-s-to-mph',
    name: 'Convert Feet per second to Miles per hour',
    terms: 'ft mph s',
  },
  {
    href: '/convert/ft2-to-acres',
    name: 'Convert Square feet to Acres (ft² to acre)',
    terms: '',
  },
  {
    href: '/convert/ft2-to-cm2',
    name: 'Convert Square feet to Square centimetres',
    terms: 'cm2 ft2',
  },
  {
    href: '/convert/ft2-to-hectares',
    name: 'Convert Square feet to Hectares (ft² to ha)',
    terms: '',
  },
  {
    href: '/convert/ft2-to-in2',
    name: 'Convert Square feet to Square inches',
    terms: 'ft2 in2',
  },
  {
    href: '/convert/ft2-to-km2',
    name: 'Convert Square feet to Square kilometres',
    terms: 'ft2 km2',
  },
  {
    href: '/convert/ft2-to-m2',
    name: 'Convert Square feet to Square metres (ft² to m²)',
    terms: '',
  },
  {
    href: '/convert/ft2-to-mi2',
    name: 'Convert Square feet to Square miles (ft² to mi²)',
    terms: '',
  },
  {
    href: '/convert/ft3-to-cm3',
    name: 'Convert Cubic feet to Cubic centimetres',
    terms: 'cm3 ft3',
  },
  {
    href: '/convert/ft3-to-cup-us',
    name: 'Convert Cubic feet to US cups',
    terms: 'ft3',
  },
  {
    href: '/convert/ft3-to-floz-us',
    name: 'Convert Cubic feet to US fluid ounces',
    terms: 'floz ft3',
  },
  {
    href: '/convert/ft3-to-gal-us',
    name: 'Convert Cubic feet to US gallons',
    terms: 'ft3 gal',
  },
  {
    href: '/convert/ft3-to-litres',
    name: 'Convert Cubic feet to Litres (ft³ to l)',
    terms: '',
  },
  {
    href: '/convert/ft3-to-m3',
    name: 'Convert Cubic feet to Cubic metres (ft³ to m³)',
    terms: '',
  },
  {
    href: '/convert/ft3-to-millilitres',
    name: 'Convert Cubic feet to Millilitres (ft³ to ml)',
    terms: '',
  },
  {
    href: '/convert/gal-us-to-cm3',
    name: 'Convert US gallons to Cubic centimetres',
    terms: 'cm3 gal',
  },
  {
    href: '/convert/gal-us-to-cup-us',
    name: 'Convert US gallons to US cups',
    terms: 'gal',
  },
  {
    href: '/convert/gal-us-to-floz-us',
    name: 'Convert US gallons to US fluid ounces',
    terms: 'floz gal',
  },
  {
    href: '/convert/gal-us-to-ft3',
    name: 'Convert US gallons to Cubic feet',
    terms: 'ft3 gal',
  },
  {
    href: '/convert/gal-us-to-litres',
    name: 'Convert US gallons to Litres',
    terms: 'gal l',
  },
  {
    href: '/convert/gal-us-to-m3',
    name: 'Convert US gallons to Cubic metres',
    terms: 'gal m3',
  },
  {
    href: '/convert/gal-us-to-millilitres',
    name: 'Convert US gallons to Millilitres',
    terms: 'gal ml',
  },
  {
    href: '/convert/gb-to-bytes',
    name: 'Convert Gigabytes (10⁹) to Bytes',
    terms: 'b gb',
  },
  {
    href: '/convert/gb-to-gib',
    name: 'Convert Gigabytes (10⁹) to Gibibytes (2³⁰)',
    terms: 'gb gib',
  },
  {
    href: '/convert/gb-to-kb',
    name: 'Convert Gigabytes (10⁹) to Kilobytes (10³)',
    terms: 'gb kb',
  },
  {
    href: '/convert/gb-to-kib',
    name: 'Convert Gigabytes (10⁹) to Kibibytes (2¹⁰)',
    terms: 'gb kib',
  },
  {
    href: '/convert/gb-to-mb',
    name: 'Convert Gigabytes (10⁹) to Megabytes (10⁶)',
    terms: 'gb mb',
  },
  {
    href: '/convert/gb-to-mib',
    name: 'Convert Gigabytes (10⁹) to Mebibytes (2²⁰)',
    terms: 'gb mib',
  },
  {
    href: '/convert/gib-to-bytes',
    name: 'Convert Gibibytes (2³⁰) to Bytes',
    terms: 'b gib',
  },
  {
    href: '/convert/gib-to-gb',
    name: 'Convert Gibibytes (2³⁰) to Gigabytes (10⁹)',
    terms: 'gb gib',
  },
  {
    href: '/convert/gib-to-kb',
    name: 'Convert Gibibytes (2³⁰) to Kilobytes (10³)',
    terms: 'gib kb',
  },
  {
    href: '/convert/gib-to-kib',
    name: 'Convert Gibibytes (2³⁰) to Kibibytes (2¹⁰)',
    terms: 'gib kib',
  },
  {
    href: '/convert/gib-to-mb',
    name: 'Convert Gibibytes (2³⁰) to Megabytes (10⁶)',
    terms: 'gib mb',
  },
  {
    href: '/convert/gib-to-mib',
    name: 'Convert Gibibytes (2³⁰) to Mebibytes (2²⁰)',
    terms: 'gib mib',
  },
  {
    href: '/convert/gif-to-jpg',
    name: 'GIF to JPEG converter',
    terms: 'jpg',
  },
  {
    href: '/convert/gif-to-png',
    name: 'GIF to PNG converter',
    terms: '',
  },
  {
    href: '/convert/gif-to-webp',
    name: 'GIF to WebP converter',
    terms: '',
  },
  {
    href: '/convert/gigahertz-to-hertz',
    name: 'Convert Gigahertz to Hertz (GHz to Hz)',
    terms: '',
  },
  {
    href: '/convert/gigahertz-to-kilohertz',
    name: 'Convert Gigahertz to Kilohertz (GHz to kHz)',
    terms: '',
  },
  {
    href: '/convert/gigahertz-to-megahertz',
    name: 'Convert Gigahertz to Megahertz (GHz to MHz)',
    terms: '',
  },
  {
    href: '/convert/gigahertz-to-rpm',
    name: 'Convert Gigahertz to Revolutions per minute',
    terms: 'ghz rpm',
  },
  {
    href: '/convert/gradians-to-degrees',
    name: 'Convert Gradians to Degrees (grad to deg)',
    terms: '',
  },
  {
    href: '/convert/gradians-to-radians',
    name: 'Convert Gradians to Radians (grad to rad)',
    terms: '',
  },
  {
    href: '/convert/gradians-to-turns',
    name: 'Convert Gradians to Turns (grad to turn)',
    terms: '',
  },
  {
    href: '/convert/grams-to-kilograms',
    name: 'Convert Grams to Kilograms (g to kg)',
    terms: '',
  },
  {
    href: '/convert/grams-to-milligrams',
    name: 'Convert Grams to Milligrams (g to mg)',
    terms: '',
  },
  {
    href: '/convert/grams-to-ounces',
    name: 'Convert Grams to Ounces (g to oz)',
    terms: '',
  },
  {
    href: '/convert/grams-to-pounds',
    name: 'Convert Grams to Pounds (g to lb)',
    terms: '',
  },
  {
    href: '/convert/grams-to-stone',
    name: 'Convert Grams to Stone (g to stone)',
    terms: '',
  },
  {
    href: '/convert/grams-to-tonne',
    name: 'Convert Grams to Metric tonnes (g to tonne)',
    terms: '',
  },
  {
    href: '/convert/hectares-to-acres',
    name: 'Convert Hectares to Acres (ha to acre)',
    terms: '',
  },
  {
    href: '/convert/hectares-to-cm2',
    name: 'Convert Hectares to Square centimetres',
    terms: 'cm2',
  },
  {
    href: '/convert/hectares-to-ft2',
    name: 'Convert Hectares to Square feet (ha to ft²)',
    terms: '',
  },
  {
    href: '/convert/hectares-to-in2',
    name: 'Convert Hectares to Square inches (ha to in²)',
    terms: '',
  },
  {
    href: '/convert/hectares-to-km2',
    name: 'Convert Hectares to Square kilometres',
    terms: 'km2',
  },
  {
    href: '/convert/hectares-to-m2',
    name: 'Convert Hectares to Square metres (ha to m²)',
    terms: '',
  },
  {
    href: '/convert/hectares-to-mi2',
    name: 'Convert Hectares to Square miles (ha to mi²)',
    terms: '',
  },
  {
    href: '/convert/heic-to-webp',
    name: 'HEIC to WebP converter',
    terms: '',
  },
  {
    href: '/convert/hertz-to-gigahertz',
    name: 'Convert Hertz to Gigahertz (Hz to GHz)',
    terms: '',
  },
  {
    href: '/convert/hertz-to-kilohertz',
    name: 'Convert Hertz to Kilohertz (Hz to kHz)',
    terms: '',
  },
  {
    href: '/convert/hertz-to-megahertz',
    name: 'Convert Hertz to Megahertz (Hz to MHz)',
    terms: '',
  },
  {
    href: '/convert/hertz-to-rpm',
    name: 'Convert Hertz to Revolutions per minute',
    terms: 'hz rpm',
  },
  {
    href: '/convert/hours-to-days',
    name: 'Convert Hours to Days (h to day)',
    terms: '',
  },
  {
    href: '/convert/hours-to-milliseconds',
    name: 'Convert Hours to Milliseconds (h to ms)',
    terms: '',
  },
  {
    href: '/convert/hours-to-minutes',
    name: 'Convert Hours to Minutes (h to min)',
    terms: '',
  },
  {
    href: '/convert/hours-to-seconds',
    name: 'Convert Hours to Seconds (h to s)',
    terms: '',
  },
  {
    href: '/convert/hours-to-weeks',
    name: 'Convert Hours to Weeks (h to week)',
    terms: '',
  },
  {
    href: '/convert/hp-to-btu-h',
    name: 'Convert Mechanical horsepower to BTU per hour',
    terms: 'h hp',
  },
  {
    href: '/convert/hp-to-kilowatts',
    name: 'Convert Mechanical horsepower to Kilowatts',
    terms: 'hp kw',
  },
  {
    href: '/convert/hp-to-megawatts',
    name: 'Convert Mechanical horsepower to Megawatts',
    terms: 'hp mw',
  },
  {
    href: '/convert/hp-to-watts',
    name: 'Convert Mechanical horsepower to Watts (hp to W)',
    terms: '',
  },
  {
    href: '/convert/html-to-asciidoc',
    name: 'HTML to AsciiDoc converter',
    terms: '',
  },
  {
    href: '/convert/html-to-csv',
    name: 'HTML to CSV converter',
    terms: '',
  },
  {
    href: '/convert/html-to-json',
    name: 'HTML to JSON converter',
    terms: '',
  },
  {
    href: '/convert/html-to-latex',
    name: 'HTML to LaTeX converter',
    terms: '',
  },
  {
    href: '/convert/html-to-rst',
    name: 'HTML to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/html-to-sql',
    name: 'HTML to SQL converter',
    terms: '',
  },
  {
    href: '/convert/html-to-tsv',
    name: 'HTML to TSV converter',
    terms: '',
  },
  {
    href: '/convert/html-to-xml',
    name: 'HTML to XML converter',
    terms: '',
  },
  {
    href: '/convert/html-to-yaml',
    name: 'HTML to YAML converter',
    terms: '',
  },
  {
    href: '/convert/in2-to-acres',
    name: 'Convert Square inches to Acres (in² to acre)',
    terms: '',
  },
  {
    href: '/convert/in2-to-cm2',
    name: 'Convert Square inches to Square centimetres',
    terms: 'cm2 in2',
  },
  {
    href: '/convert/in2-to-ft2',
    name: 'Convert Square inches to Square feet',
    terms: 'ft2 in2',
  },
  {
    href: '/convert/in2-to-hectares',
    name: 'Convert Square inches to Hectares (in² to ha)',
    terms: '',
  },
  {
    href: '/convert/in2-to-km2',
    name: 'Convert Square inches to Square kilometres',
    terms: 'in2 km2',
  },
  {
    href: '/convert/in2-to-m2',
    name: 'Convert Square inches to Square metres',
    terms: 'in2 m2',
  },
  {
    href: '/convert/in2-to-mi2',
    name: 'Convert Square inches to Square miles',
    terms: 'in2 mi2',
  },
  {
    href: '/convert/inches-to-centimetres',
    name: 'Convert Inches to Centimetres (in to cm)',
    terms: '',
  },
  {
    href: '/convert/inches-to-feet',
    name: 'Convert Inches to Feet (in to ft)',
    terms: '',
  },
  {
    href: '/convert/inches-to-kilometres',
    name: 'Convert Inches to Kilometres (in to km)',
    terms: '',
  },
  {
    href: '/convert/inches-to-metres',
    name: 'Convert Inches to Metres (in to m)',
    terms: '',
  },
  {
    href: '/convert/inches-to-miles',
    name: 'Convert Inches to Miles (in to mi)',
    terms: '',
  },
  {
    href: '/convert/inches-to-millimetres',
    name: 'Convert Inches to Millimetres (in to mm)',
    terms: '',
  },
  {
    href: '/convert/inches-to-nmi',
    name: 'Convert Inches to Nautical miles (in to nmi)',
    terms: '',
  },
  {
    href: '/convert/inches-to-yards',
    name: 'Convert Inches to Yards (in to yd)',
    terms: '',
  },
  {
    href: '/convert/joules-to-btu',
    name: 'Convert Joules to BTU (IT)',
    terms: 'j',
  },
  {
    href: '/convert/joules-to-calories',
    name: 'Convert Joules to Calories (J to cal)',
    terms: '',
  },
  {
    href: '/convert/joules-to-kilocalories',
    name: 'Convert Joules to Kilocalories (J to kcal)',
    terms: '',
  },
  {
    href: '/convert/joules-to-kilojoules',
    name: 'Convert Joules to Kilojoules (J to kJ)',
    terms: '',
  },
  {
    href: '/convert/joules-to-kilowatt-hours',
    name: 'Convert Joules to Kilowatt-hours (J to kWh)',
    terms: 'kilowatthour',
  },
  {
    href: '/convert/joules-to-watt-hours',
    name: 'Convert Joules to Watt-hours (J to Wh)',
    terms: 'watthour',
  },
  {
    href: '/convert/jpg-to-png',
    name: 'JPEG to PNG converter',
    terms: 'jpg',
  },
  {
    href: '/convert/jpg-to-webp',
    name: 'JPEG to WebP converter',
    terms: 'jpg',
  },
  {
    href: '/convert/json-to-asciidoc',
    name: 'JSON to AsciiDoc converter',
    terms: '',
  },
  {
    href: '/convert/json-to-html',
    name: 'JSON to HTML converter',
    terms: '',
  },
  {
    href: '/convert/json-to-latex',
    name: 'JSON to LaTeX converter',
    terms: '',
  },
  {
    href: '/convert/json-to-markdown',
    name: 'JSON to Markdown converter',
    terms: '',
  },
  {
    href: '/convert/json-to-rst',
    name: 'JSON to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/json-to-sql',
    name: 'JSON to SQL converter',
    terms: '',
  },
  {
    href: '/convert/json-to-tsv',
    name: 'JSON to TSV converter',
    terms: '',
  },
  {
    href: '/convert/json-to-xml',
    name: 'JSON to XML converter',
    terms: '',
  },
  {
    href: '/convert/json-to-yaml',
    name: 'JSON to YAML converter',
    terms: '',
  },
  {
    href: '/convert/kb-to-bytes',
    name: 'Convert Kilobytes (10³) to Bytes',
    terms: 'b kb',
  },
  {
    href: '/convert/kb-to-gb',
    name: 'Convert Kilobytes (10³) to Gigabytes (10⁹)',
    terms: 'gb kb',
  },
  {
    href: '/convert/kb-to-gib',
    name: 'Convert Kilobytes (10³) to Gibibytes (2³⁰)',
    terms: 'gib kb',
  },
  {
    href: '/convert/kb-to-kib',
    name: 'Convert Kilobytes (10³) to Kibibytes (2¹⁰)',
    terms: 'kb kib',
  },
  {
    href: '/convert/kb-to-mb',
    name: 'Convert Kilobytes (10³) to Megabytes (10⁶)',
    terms: 'kb mb',
  },
  {
    href: '/convert/kb-to-mib',
    name: 'Convert Kilobytes (10³) to Mebibytes (2²⁰)',
    terms: 'kb mib',
  },
  {
    href: '/convert/kelvin-to-celsius',
    name: 'Convert Kelvin to Celsius (K to C)',
    terms: '',
  },
  {
    href: '/convert/kelvin-to-fahrenheit',
    name: 'Convert Kelvin to Fahrenheit (K to F)',
    terms: '',
  },
  {
    href: '/convert/kgf-m-to-lbf-ft',
    name: 'Convert Kilogram-force metres to Pound-force feet',
    terms: 'ft kgf kilogramforce lbf m poundforce',
  },
  {
    href: '/convert/kgf-m-to-lbf-in',
    name: 'Convert Kilogram-force metres to Pound-force inches',
    terms: 'kgf kilogramforce lbf m poundforce',
  },
  {
    href: '/convert/kgf-m-to-newton-centimetres',
    name: 'Convert Kilogram-force metres to Newton-centimetres',
    terms: 'cm kgf kilogramforce m n newtoncentimetre',
  },
  {
    href: '/convert/kgf-m-to-newton-metres',
    name: 'Convert Kilogram-force metres to Newton-metres',
    terms: 'kgf kilogramforce m n newtonmetre',
  },
  {
    href: '/convert/kib-to-bytes',
    name: 'Convert Kibibytes (2¹⁰) to Bytes',
    terms: 'b kib',
  },
  {
    href: '/convert/kib-to-gb',
    name: 'Convert Kibibytes (2¹⁰) to Gigabytes (10⁹)',
    terms: 'gb kib',
  },
  {
    href: '/convert/kib-to-gib',
    name: 'Convert Kibibytes (2¹⁰) to Gibibytes (2³⁰)',
    terms: 'gib kib',
  },
  {
    href: '/convert/kib-to-kb',
    name: 'Convert Kibibytes (2¹⁰) to Kilobytes (10³)',
    terms: 'kb kib',
  },
  {
    href: '/convert/kib-to-mb',
    name: 'Convert Kibibytes (2¹⁰) to Megabytes (10⁶)',
    terms: 'kib mb',
  },
  {
    href: '/convert/kib-to-mib',
    name: 'Convert Kibibytes (2¹⁰) to Mebibytes (2²⁰)',
    terms: 'kib mib',
  },
  {
    href: '/convert/kilocalories-to-btu',
    name: 'Convert Kilocalories to BTU (IT)',
    terms: 'kcal',
  },
  {
    href: '/convert/kilocalories-to-calories',
    name: 'Convert Kilocalories to Calories (kcal to cal)',
    terms: '',
  },
  {
    href: '/convert/kilocalories-to-joules',
    name: 'Convert Kilocalories to Joules (kcal to J)',
    terms: '',
  },
  {
    href: '/convert/kilocalories-to-kilojoules',
    name: 'Convert Kilocalories to Kilojoules (kcal to kJ)',
    terms: '',
  },
  {
    href: '/convert/kilocalories-to-kilowatt-hours',
    name: 'Convert Kilocalories to Kilowatt-hours',
    terms: 'kcal kilowatthour kwh',
  },
  {
    href: '/convert/kilocalories-to-watt-hours',
    name: 'Convert Kilocalories to Watt-hours (kcal to Wh)',
    terms: 'watthour',
  },
  {
    href: '/convert/kilogram-force-to-dynes',
    name: 'Convert Kilogram-force to Dynes (kgf to dyn)',
    terms: 'kilogramforce',
  },
  {
    href: '/convert/kilogram-force-to-kilonewtons',
    name: 'Convert Kilogram-force to Kilonewtons',
    terms: 'kgf kilogramforce kn',
  },
  {
    href: '/convert/kilogram-force-to-newtons',
    name: 'Convert Kilogram-force to Newtons (kgf to N)',
    terms: 'kilogramforce',
  },
  {
    href: '/convert/kilogram-force-to-pound-force',
    name: 'Convert Kilogram-force to Pound-force',
    terms: 'kgf kilogramforce lbf poundforce',
  },
  {
    href: '/convert/kilograms-to-grams',
    name: 'Convert Kilograms to Grams (kg to g)',
    terms: '',
  },
  {
    href: '/convert/kilograms-to-milligrams',
    name: 'Convert Kilograms to Milligrams (kg to mg)',
    terms: '',
  },
  {
    href: '/convert/kilograms-to-ounces',
    name: 'Convert Kilograms to Ounces (kg to oz)',
    terms: '',
  },
  {
    href: '/convert/kilograms-to-pounds',
    name: 'Convert Kilograms to Pounds (kg to lb)',
    terms: '',
  },
  {
    href: '/convert/kilograms-to-stone',
    name: 'Convert Kilograms to Stone (kg to stone)',
    terms: '',
  },
  {
    href: '/convert/kilograms-to-tonne',
    name: 'Convert Kilograms to Metric tonnes (kg to tonne)',
    terms: '',
  },
  {
    href: '/convert/kilohertz-to-gigahertz',
    name: 'Convert Kilohertz to Gigahertz (kHz to GHz)',
    terms: '',
  },
  {
    href: '/convert/kilohertz-to-hertz',
    name: 'Convert Kilohertz to Hertz (kHz to Hz)',
    terms: '',
  },
  {
    href: '/convert/kilohertz-to-megahertz',
    name: 'Convert Kilohertz to Megahertz (kHz to MHz)',
    terms: '',
  },
  {
    href: '/convert/kilohertz-to-rpm',
    name: 'Convert Kilohertz to Revolutions per minute',
    terms: 'khz rpm',
  },
  {
    href: '/convert/kilojoules-to-btu',
    name: 'Convert Kilojoules to BTU (IT)',
    terms: 'kj',
  },
  {
    href: '/convert/kilojoules-to-calories',
    name: 'Convert Kilojoules to Calories (kJ to cal)',
    terms: '',
  },
  {
    href: '/convert/kilojoules-to-joules',
    name: 'Convert Kilojoules to Joules (kJ to J)',
    terms: '',
  },
  {
    href: '/convert/kilojoules-to-kilocalories',
    name: 'Convert Kilojoules to Kilocalories (kJ to kcal)',
    terms: '',
  },
  {
    href: '/convert/kilojoules-to-kilowatt-hours',
    name: 'Convert Kilojoules to Kilowatt-hours (kJ to kWh)',
    terms: 'kilowatthour',
  },
  {
    href: '/convert/kilojoules-to-watt-hours',
    name: 'Convert Kilojoules to Watt-hours (kJ to Wh)',
    terms: 'watthour',
  },
  {
    href: '/convert/kilometres-to-centimetres',
    name: 'Convert Kilometres to Centimetres (km to cm)',
    terms: '',
  },
  {
    href: '/convert/kilometres-to-feet',
    name: 'Convert Kilometres to Feet (km to ft)',
    terms: '',
  },
  {
    href: '/convert/kilometres-to-inches',
    name: 'Convert Kilometres to Inches (km to in)',
    terms: '',
  },
  {
    href: '/convert/kilometres-to-metres',
    name: 'Convert Kilometres to Metres (km to m)',
    terms: '',
  },
  {
    href: '/convert/kilometres-to-miles',
    name: 'Convert Kilometres to Miles (km to mi)',
    terms: '',
  },
  {
    href: '/convert/kilometres-to-millimetres',
    name: 'Convert Kilometres to Millimetres (km to mm)',
    terms: '',
  },
  {
    href: '/convert/kilometres-to-nmi',
    name: 'Convert Kilometres to Nautical miles (km to nmi)',
    terms: '',
  },
  {
    href: '/convert/kilometres-to-yards',
    name: 'Convert Kilometres to Yards (km to yd)',
    terms: '',
  },
  {
    href: '/convert/kilonewtons-to-dynes',
    name: 'Convert Kilonewtons to Dynes (kN to dyn)',
    terms: '',
  },
  {
    href: '/convert/kilonewtons-to-kilogram-force',
    name: 'Convert Kilonewtons to Kilogram-force',
    terms: 'kgf kilogramforce kn',
  },
  {
    href: '/convert/kilonewtons-to-newtons',
    name: 'Convert Kilonewtons to Newtons (kN to N)',
    terms: '',
  },
  {
    href: '/convert/kilonewtons-to-pound-force',
    name: 'Convert Kilonewtons to Pound-force (kN to lbf)',
    terms: 'poundforce',
  },
  {
    href: '/convert/kilopascals-to-atmospheres',
    name: 'Convert Kilopascals to Atmospheres (kPa to atm)',
    terms: '',
  },
  {
    href: '/convert/kilopascals-to-bar',
    name: 'Convert Kilopascals to Bar (kPa to bar)',
    terms: '',
  },
  {
    href: '/convert/kilopascals-to-megapascals',
    name: 'Convert Kilopascals to Megapascals (kPa to MPa)',
    terms: '',
  },
  {
    href: '/convert/kilopascals-to-pascals',
    name: 'Convert Kilopascals to Pascals (kPa to Pa)',
    terms: '',
  },
  {
    href: '/convert/kilopascals-to-psi',
    name: 'Convert Kilopascals to Pounds per square inch',
    terms: 'kpa psi',
  },
  {
    href: '/convert/kilowatt-hours-to-btu',
    name: 'Convert Kilowatt-hours to BTU (IT)',
    terms: 'kilowatthour kwh',
  },
  {
    href: '/convert/kilowatt-hours-to-calories',
    name: 'Convert Kilowatt-hours to Calories (kWh to cal)',
    terms: 'kilowatthour',
  },
  {
    href: '/convert/kilowatt-hours-to-joules',
    name: 'Convert Kilowatt-hours to Joules (kWh to J)',
    terms: 'kilowatthour',
  },
  {
    href: '/convert/kilowatt-hours-to-kilocalories',
    name: 'Convert Kilowatt-hours to Kilocalories',
    terms: 'kcal kilowatthour kwh',
  },
  {
    href: '/convert/kilowatt-hours-to-kilojoules',
    name: 'Convert Kilowatt-hours to Kilojoules (kWh to kJ)',
    terms: 'kilowatthour',
  },
  {
    href: '/convert/kilowatt-hours-to-watt-hours',
    name: 'Convert Kilowatt-hours to Watt-hours (kWh to Wh)',
    terms: 'kilowatthour watthour',
  },
  {
    href: '/convert/kilowatts-to-btu-h',
    name: 'Convert Kilowatts to BTU per hour (kW to BTU/h)',
    terms: '',
  },
  {
    href: '/convert/kilowatts-to-hp',
    name: 'Convert Kilowatts to Mechanical horsepower',
    terms: 'hp kw',
  },
  {
    href: '/convert/kilowatts-to-megawatts',
    name: 'Convert Kilowatts to Megawatts (kW to MW)',
    terms: '',
  },
  {
    href: '/convert/kilowatts-to-watts',
    name: 'Convert Kilowatts to Watts (kW to W)',
    terms: '',
  },
  {
    href: '/convert/km-h-to-ft-s',
    name: 'Convert Kilometres per hour to Feet per second',
    terms: 'ft h km s',
  },
  {
    href: '/convert/km-h-to-knots',
    name: 'Convert Kilometres per hour to Knots',
    terms: 'h km',
  },
  {
    href: '/convert/km-h-to-m-s',
    name: 'Convert Kilometres per hour to Metres per second',
    terms: 'h km m s',
  },
  {
    href: '/convert/km-h-to-mph',
    name: 'Convert Kilometres per hour to Miles per hour',
    terms: 'h km mph',
  },
  {
    href: '/convert/km2-to-acres',
    name: 'Convert Square kilometres to Acres (km² to acre)',
    terms: '',
  },
  {
    href: '/convert/km2-to-cm2',
    name: 'Convert Square kilometres to Square centimetres',
    terms: 'cm2 km2',
  },
  {
    href: '/convert/km2-to-ft2',
    name: 'Convert Square kilometres to Square feet',
    terms: 'ft2 km2',
  },
  {
    href: '/convert/km2-to-hectares',
    name: 'Convert Square kilometres to Hectares',
    terms: 'km2',
  },
  {
    href: '/convert/km2-to-in2',
    name: 'Convert Square kilometres to Square inches',
    terms: 'in2 km2',
  },
  {
    href: '/convert/km2-to-m2',
    name: 'Convert Square kilometres to Square metres',
    terms: 'km2 m2',
  },
  {
    href: '/convert/km2-to-mi2',
    name: 'Convert Square kilometres to Square miles',
    terms: 'km2 mi2',
  },
  {
    href: '/convert/knots-to-ft-s',
    name: 'Convert Knots to Feet per second (knot to ft/s)',
    terms: '',
  },
  {
    href: '/convert/knots-to-km-h',
    name: 'Convert Knots to Kilometres per hour',
    terms: 'h km',
  },
  {
    href: '/convert/knots-to-m-s',
    name: 'Convert Knots to Metres per second (knot to m/s)',
    terms: '',
  },
  {
    href: '/convert/knots-to-mph',
    name: 'Convert Knots to Miles per hour (knot to mph)',
    terms: '',
  },
  {
    href: '/convert/l100km-to-mpg-uk',
    name: 'Convert L/100 km to Imperial MPG',
    terms: 'l100km uk',
  },
  {
    href: '/convert/l100km-to-mpg-us',
    name: 'Convert L/100 km to US MPG',
    terms: 'l100km',
  },
  {
    href: '/convert/latex-to-asciidoc',
    name: 'LaTeX to AsciiDoc converter',
    terms: '',
  },
  {
    href: '/convert/latex-to-csv',
    name: 'LaTeX to CSV converter',
    terms: '',
  },
  {
    href: '/convert/latex-to-html',
    name: 'LaTeX to HTML converter',
    terms: '',
  },
  {
    href: '/convert/latex-to-json',
    name: 'LaTeX to JSON converter',
    terms: '',
  },
  {
    href: '/convert/latex-to-markdown',
    name: 'LaTeX to Markdown converter',
    terms: '',
  },
  {
    href: '/convert/latex-to-rst',
    name: 'LaTeX to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/latex-to-sql',
    name: 'LaTeX to SQL converter',
    terms: '',
  },
  {
    href: '/convert/latex-to-tsv',
    name: 'LaTeX to TSV converter',
    terms: '',
  },
  {
    href: '/convert/latex-to-xml',
    name: 'LaTeX to XML converter',
    terms: '',
  },
  {
    href: '/convert/latex-to-yaml',
    name: 'LaTeX to YAML converter',
    terms: '',
  },
  {
    href: '/convert/lbf-ft-to-kgf-m',
    name: 'Convert Pound-force feet to Kilogram-force metres',
    terms: 'ft kgf kilogramforce lbf m poundforce',
  },
  {
    href: '/convert/lbf-ft-to-lbf-in',
    name: 'Convert Pound-force feet to Pound-force inches',
    terms: 'ft lbf poundforce',
  },
  {
    href: '/convert/lbf-ft-to-newton-centimetres',
    name: 'Convert Pound-force feet to Newton-centimetres',
    terms: 'cm ft lbf n newtoncentimetre poundforce',
  },
  {
    href: '/convert/lbf-ft-to-newton-metres',
    name: 'Convert Pound-force feet to Newton-metres',
    terms: 'ft lbf m n newtonmetre poundforce',
  },
  {
    href: '/convert/lbf-in-to-kgf-m',
    name: 'Convert Pound-force inches to Kilogram-force metres',
    terms: 'kgf kilogramforce lbf m poundforce',
  },
  {
    href: '/convert/lbf-in-to-lbf-ft',
    name: 'Convert Pound-force inches to Pound-force feet',
    terms: 'ft lbf poundforce',
  },
  {
    href: '/convert/lbf-in-to-newton-centimetres',
    name: 'Convert Pound-force inches to Newton-centimetres',
    terms: 'cm lbf n newtoncentimetre poundforce',
  },
  {
    href: '/convert/lbf-in-to-newton-metres',
    name: 'Convert Pound-force inches to Newton-metres',
    terms: 'lbf m n newtonmetre poundforce',
  },
  {
    href: '/convert/litres-to-cm3',
    name: 'Convert Litres to Cubic centimetres (l to cm³)',
    terms: '',
  },
  {
    href: '/convert/litres-to-cup-us',
    name: 'Convert Litres to US cups',
    terms: 'l',
  },
  {
    href: '/convert/litres-to-floz-us',
    name: 'Convert Litres to US fluid ounces',
    terms: 'floz l',
  },
  {
    href: '/convert/litres-to-ft3',
    name: 'Convert Litres to Cubic feet (l to ft³)',
    terms: '',
  },
  {
    href: '/convert/litres-to-gal-us',
    name: 'Convert Litres to US gallons',
    terms: 'gal l',
  },
  {
    href: '/convert/litres-to-m3',
    name: 'Convert Litres to Cubic metres (l to m³)',
    terms: '',
  },
  {
    href: '/convert/litres-to-millilitres',
    name: 'Convert Litres to Millilitres (l to ml)',
    terms: '',
  },
  {
    href: '/convert/litres-to-tbsp',
    name: 'Convert Litres to US tablespoons (l to tbsp)',
    terms: '',
  },
  {
    href: '/convert/litres-to-tsp',
    name: 'Convert Litres to US teaspoons (l to tsp)',
    terms: '',
  },
  {
    href: '/convert/m-s-to-ft-s',
    name: 'Convert Metres per second to Feet per second',
    terms: 'ft m s',
  },
  {
    href: '/convert/m-s-to-km-h',
    name: 'Convert Metres per second to Kilometres per hour',
    terms: 'h km m s',
  },
  {
    href: '/convert/m-s-to-knots',
    name: 'Convert Metres per second to Knots (m/s to knot)',
    terms: '',
  },
  {
    href: '/convert/m-s-to-mph',
    name: 'Convert Metres per second to Miles per hour',
    terms: 'm mph s',
  },
  {
    href: '/convert/m2-to-acres',
    name: 'Convert Square metres to Acres (m² to acre)',
    terms: '',
  },
  {
    href: '/convert/m2-to-cm2',
    name: 'Convert Square metres to Square centimetres',
    terms: 'cm2 m2',
  },
  {
    href: '/convert/m2-to-ft2',
    name: 'Convert Square metres to Square feet (m² to ft²)',
    terms: '',
  },
  {
    href: '/convert/m2-to-hectares',
    name: 'Convert Square metres to Hectares (m² to ha)',
    terms: '',
  },
  {
    href: '/convert/m2-to-in2',
    name: 'Convert Square metres to Square inches',
    terms: 'in2 m2',
  },
  {
    href: '/convert/m2-to-km2',
    name: 'Convert Square metres to Square kilometres',
    terms: 'km2 m2',
  },
  {
    href: '/convert/m2-to-mi2',
    name: 'Convert Square metres to Square miles',
    terms: 'm2 mi2',
  },
  {
    href: '/convert/m3-to-cm3',
    name: 'Convert Cubic metres to Cubic centimetres',
    terms: 'cm3 m3',
  },
  {
    href: '/convert/m3-to-cup-us',
    name: 'Convert Cubic metres to US cups',
    terms: 'm3',
  },
  {
    href: '/convert/m3-to-floz-us',
    name: 'Convert Cubic metres to US fluid ounces',
    terms: 'floz m3',
  },
  {
    href: '/convert/m3-to-ft3',
    name: 'Convert Cubic metres to Cubic feet (m³ to ft³)',
    terms: '',
  },
  {
    href: '/convert/m3-to-gal-us',
    name: 'Convert Cubic metres to US gallons',
    terms: 'gal m3',
  },
  {
    href: '/convert/m3-to-litres',
    name: 'Convert Cubic metres to Litres (m³ to l)',
    terms: '',
  },
  {
    href: '/convert/m3-to-millilitres',
    name: 'Convert Cubic metres to Millilitres (m³ to ml)',
    terms: '',
  },
  {
    href: '/convert/markdown-to-asciidoc',
    name: 'Markdown to AsciiDoc converter',
    terms: '',
  },
  {
    href: '/convert/markdown-to-csv',
    name: 'Markdown to CSV converter',
    terms: '',
  },
  {
    href: '/convert/markdown-to-json',
    name: 'Markdown to JSON converter',
    terms: '',
  },
  {
    href: '/convert/markdown-to-latex',
    name: 'Markdown to LaTeX converter',
    terms: '',
  },
  {
    href: '/convert/markdown-to-rst',
    name: 'Markdown to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/markdown-to-sql',
    name: 'Markdown to SQL converter',
    terms: '',
  },
  {
    href: '/convert/markdown-to-tsv',
    name: 'Markdown to TSV converter',
    terms: '',
  },
  {
    href: '/convert/markdown-to-xml',
    name: 'Markdown to XML converter',
    terms: '',
  },
  {
    href: '/convert/markdown-to-yaml',
    name: 'Markdown to YAML converter',
    terms: '',
  },
  {
    href: '/convert/mb-to-bytes',
    name: 'Convert Megabytes (10⁶) to Bytes',
    terms: 'b mb',
  },
  {
    href: '/convert/mb-to-gb',
    name: 'Convert Megabytes (10⁶) to Gigabytes (10⁹)',
    terms: 'gb mb',
  },
  {
    href: '/convert/mb-to-gib',
    name: 'Convert Megabytes (10⁶) to Gibibytes (2³⁰)',
    terms: 'gib mb',
  },
  {
    href: '/convert/mb-to-kb',
    name: 'Convert Megabytes (10⁶) to Kilobytes (10³)',
    terms: 'kb mb',
  },
  {
    href: '/convert/mb-to-kib',
    name: 'Convert Megabytes (10⁶) to Kibibytes (2¹⁰)',
    terms: 'kib mb',
  },
  {
    href: '/convert/mb-to-mib',
    name: 'Convert Megabytes (10⁶) to Mebibytes (2²⁰)',
    terms: 'mb mib',
  },
  {
    href: '/convert/megahertz-to-gigahertz',
    name: 'Convert Megahertz to Gigahertz (MHz to GHz)',
    terms: '',
  },
  {
    href: '/convert/megahertz-to-hertz',
    name: 'Convert Megahertz to Hertz (MHz to Hz)',
    terms: '',
  },
  {
    href: '/convert/megahertz-to-kilohertz',
    name: 'Convert Megahertz to Kilohertz (MHz to kHz)',
    terms: '',
  },
  {
    href: '/convert/megahertz-to-rpm',
    name: 'Convert Megahertz to Revolutions per minute',
    terms: 'mhz rpm',
  },
  {
    href: '/convert/megapascals-to-atmospheres',
    name: 'Convert Megapascals to Atmospheres (MPa to atm)',
    terms: '',
  },
  {
    href: '/convert/megapascals-to-bar',
    name: 'Convert Megapascals to Bar (MPa to bar)',
    terms: '',
  },
  {
    href: '/convert/megapascals-to-kilopascals',
    name: 'Convert Megapascals to Kilopascals (MPa to kPa)',
    terms: '',
  },
  {
    href: '/convert/megapascals-to-pascals',
    name: 'Convert Megapascals to Pascals (MPa to Pa)',
    terms: '',
  },
  {
    href: '/convert/megapascals-to-psi',
    name: 'Convert Megapascals to Pounds per square inch',
    terms: 'mpa psi',
  },
  {
    href: '/convert/megawatts-to-btu-h',
    name: 'Convert Megawatts to BTU per hour (MW to BTU/h)',
    terms: '',
  },
  {
    href: '/convert/megawatts-to-hp',
    name: 'Convert Megawatts to Mechanical horsepower',
    terms: 'hp mw',
  },
  {
    href: '/convert/megawatts-to-kilowatts',
    name: 'Convert Megawatts to Kilowatts (MW to kW)',
    terms: '',
  },
  {
    href: '/convert/megawatts-to-watts',
    name: 'Convert Megawatts to Watts (MW to W)',
    terms: '',
  },
  {
    href: '/convert/metres-to-centimetres',
    name: 'Convert Metres to Centimetres (m to cm)',
    terms: '',
  },
  {
    href: '/convert/metres-to-feet',
    name: 'Convert Metres to Feet (m to ft)',
    terms: '',
  },
  {
    href: '/convert/metres-to-inches',
    name: 'Convert Metres to Inches (m to in)',
    terms: '',
  },
  {
    href: '/convert/metres-to-kilometres',
    name: 'Convert Metres to Kilometres (m to km)',
    terms: '',
  },
  {
    href: '/convert/metres-to-miles',
    name: 'Convert Metres to Miles (m to mi)',
    terms: '',
  },
  {
    href: '/convert/metres-to-millimetres',
    name: 'Convert Metres to Millimetres (m to mm)',
    terms: '',
  },
  {
    href: '/convert/metres-to-nmi',
    name: 'Convert Metres to Nautical miles (m to nmi)',
    terms: '',
  },
  {
    href: '/convert/metres-to-yards',
    name: 'Convert Metres to Yards (m to yd)',
    terms: '',
  },
  {
    href: '/convert/mi2-to-acres',
    name: 'Convert Square miles to Acres (mi² to acre)',
    terms: '',
  },
  {
    href: '/convert/mi2-to-cm2',
    name: 'Convert Square miles to Square centimetres',
    terms: 'cm2 mi2',
  },
  {
    href: '/convert/mi2-to-ft2',
    name: 'Convert Square miles to Square feet (mi² to ft²)',
    terms: '',
  },
  {
    href: '/convert/mi2-to-hectares',
    name: 'Convert Square miles to Hectares (mi² to ha)',
    terms: '',
  },
  {
    href: '/convert/mi2-to-in2',
    name: 'Convert Square miles to Square inches',
    terms: 'in2 mi2',
  },
  {
    href: '/convert/mi2-to-km2',
    name: 'Convert Square miles to Square kilometres',
    terms: 'km2 mi2',
  },
  {
    href: '/convert/mi2-to-m2',
    name: 'Convert Square miles to Square metres',
    terms: 'm2 mi2',
  },
  {
    href: '/convert/mib-to-bytes',
    name: 'Convert Mebibytes (2²⁰) to Bytes',
    terms: 'b mib',
  },
  {
    href: '/convert/mib-to-gb',
    name: 'Convert Mebibytes (2²⁰) to Gigabytes (10⁹)',
    terms: 'gb mib',
  },
  {
    href: '/convert/mib-to-gib',
    name: 'Convert Mebibytes (2²⁰) to Gibibytes (2³⁰)',
    terms: 'gib mib',
  },
  {
    href: '/convert/mib-to-kb',
    name: 'Convert Mebibytes (2²⁰) to Kilobytes (10³)',
    terms: 'kb mib',
  },
  {
    href: '/convert/mib-to-kib',
    name: 'Convert Mebibytes (2²⁰) to Kibibytes (2¹⁰)',
    terms: 'kib mib',
  },
  {
    href: '/convert/mib-to-mb',
    name: 'Convert Mebibytes (2²⁰) to Megabytes (10⁶)',
    terms: 'mb mib',
  },
  {
    href: '/convert/miles-to-centimetres',
    name: 'Convert Miles to Centimetres (mi to cm)',
    terms: '',
  },
  {
    href: '/convert/miles-to-feet',
    name: 'Convert Miles to Feet (mi to ft)',
    terms: '',
  },
  {
    href: '/convert/miles-to-inches',
    name: 'Convert Miles to Inches (mi to in)',
    terms: '',
  },
  {
    href: '/convert/miles-to-kilometres',
    name: 'Convert Miles to Kilometres (mi to km)',
    terms: '',
  },
  {
    href: '/convert/miles-to-metres',
    name: 'Convert Miles to Metres (mi to m)',
    terms: '',
  },
  {
    href: '/convert/miles-to-millimetres',
    name: 'Convert Miles to Millimetres (mi to mm)',
    terms: '',
  },
  {
    href: '/convert/miles-to-nmi',
    name: 'Convert Miles to Nautical miles (mi to nmi)',
    terms: '',
  },
  {
    href: '/convert/miles-to-yards',
    name: 'Convert Miles to Yards (mi to yd)',
    terms: '',
  },
  {
    href: '/convert/milligrams-to-grams',
    name: 'Convert Milligrams to Grams (mg to g)',
    terms: '',
  },
  {
    href: '/convert/milligrams-to-kilograms',
    name: 'Convert Milligrams to Kilograms (mg to kg)',
    terms: '',
  },
  {
    href: '/convert/milligrams-to-ounces',
    name: 'Convert Milligrams to Ounces (mg to oz)',
    terms: '',
  },
  {
    href: '/convert/milligrams-to-pounds',
    name: 'Convert Milligrams to Pounds (mg to lb)',
    terms: '',
  },
  {
    href: '/convert/milligrams-to-stone',
    name: 'Convert Milligrams to Stone (mg to stone)',
    terms: '',
  },
  {
    href: '/convert/milligrams-to-tonne',
    name: 'Convert Milligrams to Metric tonnes',
    terms: 'mg',
  },
  {
    href: '/convert/millilitres-to-cm3',
    name: 'Convert Millilitres to Cubic centimetres',
    terms: 'cm3 ml',
  },
  {
    href: '/convert/millilitres-to-cup-us',
    name: 'Convert Millilitres to US cups',
    terms: 'ml',
  },
  {
    href: '/convert/millilitres-to-floz-us',
    name: 'Convert Millilitres to US fluid ounces',
    terms: 'floz ml',
  },
  {
    href: '/convert/millilitres-to-ft3',
    name: 'Convert Millilitres to Cubic feet (ml to ft³)',
    terms: '',
  },
  {
    href: '/convert/millilitres-to-gal-us',
    name: 'Convert Millilitres to US gallons',
    terms: 'gal ml',
  },
  {
    href: '/convert/millilitres-to-litres',
    name: 'Convert Millilitres to Litres (ml to l)',
    terms: '',
  },
  {
    href: '/convert/millilitres-to-m3',
    name: 'Convert Millilitres to Cubic metres (ml to m³)',
    terms: '',
  },
  {
    href: '/convert/millilitres-to-tbsp',
    name: 'Convert Millilitres to US tablespoons',
    terms: 'ml tbsp',
  },
  {
    href: '/convert/millilitres-to-tsp',
    name: 'Convert Millilitres to US teaspoons (ml to tsp)',
    terms: '',
  },
  {
    href: '/convert/millimetres-to-centimetres',
    name: 'Convert Millimetres to Centimetres (mm to cm)',
    terms: '',
  },
  {
    href: '/convert/millimetres-to-feet',
    name: 'Convert Millimetres to Feet (mm to ft)',
    terms: '',
  },
  {
    href: '/convert/millimetres-to-inches',
    name: 'Convert Millimetres to Inches (mm to in)',
    terms: '',
  },
  {
    href: '/convert/millimetres-to-kilometres',
    name: 'Convert Millimetres to Kilometres (mm to km)',
    terms: '',
  },
  {
    href: '/convert/millimetres-to-metres',
    name: 'Convert Millimetres to Metres (mm to m)',
    terms: '',
  },
  {
    href: '/convert/millimetres-to-miles',
    name: 'Convert Millimetres to Miles (mm to mi)',
    terms: '',
  },
  {
    href: '/convert/millimetres-to-nmi',
    name: 'Convert Millimetres to Nautical miles',
    terms: 'mm nmi',
  },
  {
    href: '/convert/millimetres-to-yards',
    name: 'Convert Millimetres to Yards (mm to yd)',
    terms: '',
  },
  {
    href: '/convert/milliseconds-to-days',
    name: 'Convert Milliseconds to Days (ms to day)',
    terms: '',
  },
  {
    href: '/convert/milliseconds-to-hours',
    name: 'Convert Milliseconds to Hours (ms to h)',
    terms: '',
  },
  {
    href: '/convert/milliseconds-to-minutes',
    name: 'Convert Milliseconds to Minutes (ms to min)',
    terms: '',
  },
  {
    href: '/convert/milliseconds-to-seconds',
    name: 'Convert Milliseconds to Seconds (ms to s)',
    terms: '',
  },
  {
    href: '/convert/milliseconds-to-weeks',
    name: 'Convert Milliseconds to Weeks (ms to week)',
    terms: '',
  },
  {
    href: '/convert/minutes-to-days',
    name: 'Convert Minutes to Days (min to day)',
    terms: '',
  },
  {
    href: '/convert/minutes-to-hours',
    name: 'Convert Minutes to Hours (min to h)',
    terms: '',
  },
  {
    href: '/convert/minutes-to-milliseconds',
    name: 'Convert Minutes to Milliseconds (min to ms)',
    terms: '',
  },
  {
    href: '/convert/minutes-to-seconds',
    name: 'Convert Minutes to Seconds (min to s)',
    terms: '',
  },
  {
    href: '/convert/minutes-to-weeks',
    name: 'Convert Minutes to Weeks (min to week)',
    terms: '',
  },
  {
    href: '/convert/mpg-uk-to-l100km',
    name: 'Convert Imperial MPG to L/100 km',
    terms: 'l100km uk',
  },
  {
    href: '/convert/mpg-uk-to-mpg-us',
    name: 'Convert Imperial MPG to US MPG',
    terms: 'uk',
  },
  {
    href: '/convert/mpg-us-to-l100km',
    name: 'Convert US MPG to L/100 km',
    terms: 'l100km',
  },
  {
    href: '/convert/mpg-us-to-mpg-uk',
    name: 'Convert US MPG to Imperial MPG',
    terms: 'uk',
  },
  {
    href: '/convert/mph-to-ft-s',
    name: 'Convert Miles per hour to Feet per second',
    terms: 'ft mph s',
  },
  {
    href: '/convert/mph-to-km-h',
    name: 'Convert Miles per hour to Kilometres per hour',
    terms: 'h km mph',
  },
  {
    href: '/convert/mph-to-knots',
    name: 'Convert Miles per hour to Knots (mph to knot)',
    terms: '',
  },
  {
    href: '/convert/mph-to-m-s',
    name: 'Convert Miles per hour to Metres per second',
    terms: 'm mph s',
  },
  {
    href: '/convert/newton-centimetres-to-kgf-m',
    name: 'Convert Newton-centimetres to Kilogram-force metres',
    terms: 'cm kgf kilogramforce m n newtoncentimetre',
  },
  {
    href: '/convert/newton-centimetres-to-lbf-ft',
    name: 'Convert Newton-centimetres to Pound-force feet',
    terms: 'cm ft lbf n newtoncentimetre poundforce',
  },
  {
    href: '/convert/newton-centimetres-to-lbf-in',
    name: 'Convert Newton-centimetres to Pound-force inches',
    terms: 'cm lbf n newtoncentimetre poundforce',
  },
  {
    href: '/convert/newton-centimetres-to-newton-metres',
    name: 'Convert Newton-centimetres to Newton-metres',
    terms: 'cm m n newtoncentimetre newtonmetre',
  },
  {
    href: '/convert/newton-metres-to-kgf-m',
    name: 'Convert Newton-metres to Kilogram-force metres',
    terms: 'kgf kilogramforce m n newtonmetre',
  },
  {
    href: '/convert/newton-metres-to-lbf-ft',
    name: 'Convert Newton-metres to Pound-force feet',
    terms: 'ft lbf m n newtonmetre poundforce',
  },
  {
    href: '/convert/newton-metres-to-lbf-in',
    name: 'Convert Newton-metres to Pound-force inches',
    terms: 'lbf m n newtonmetre poundforce',
  },
  {
    href: '/convert/newton-metres-to-newton-centimetres',
    name: 'Convert Newton-metres to Newton-centimetres',
    terms: 'cm m n newtoncentimetre newtonmetre',
  },
  {
    href: '/convert/newtons-to-dynes',
    name: 'Convert Newtons to Dynes (N to dyn)',
    terms: '',
  },
  {
    href: '/convert/newtons-to-kilogram-force',
    name: 'Convert Newtons to Kilogram-force (N to kgf)',
    terms: 'kilogramforce',
  },
  {
    href: '/convert/newtons-to-kilonewtons',
    name: 'Convert Newtons to Kilonewtons (N to kN)',
    terms: '',
  },
  {
    href: '/convert/newtons-to-pound-force',
    name: 'Convert Newtons to Pound-force (N to lbf)',
    terms: 'poundforce',
  },
  {
    href: '/convert/nmi-to-centimetres',
    name: 'Convert Nautical miles to Centimetres',
    terms: 'cm nmi',
  },
  {
    href: '/convert/nmi-to-feet',
    name: 'Convert Nautical miles to Feet (nmi to ft)',
    terms: '',
  },
  {
    href: '/convert/nmi-to-inches',
    name: 'Convert Nautical miles to Inches (nmi to in)',
    terms: '',
  },
  {
    href: '/convert/nmi-to-kilometres',
    name: 'Convert Nautical miles to Kilometres (nmi to km)',
    terms: '',
  },
  {
    href: '/convert/nmi-to-metres',
    name: 'Convert Nautical miles to Metres (nmi to m)',
    terms: '',
  },
  {
    href: '/convert/nmi-to-miles',
    name: 'Convert Nautical miles to Miles (nmi to mi)',
    terms: '',
  },
  {
    href: '/convert/nmi-to-millimetres',
    name: 'Convert Nautical miles to Millimetres',
    terms: 'mm nmi',
  },
  {
    href: '/convert/nmi-to-yards',
    name: 'Convert Nautical miles to Yards (nmi to yd)',
    terms: '',
  },
  {
    href: '/convert/ounces-to-grams',
    name: 'Convert Ounces to Grams (oz to g)',
    terms: '',
  },
  {
    href: '/convert/ounces-to-kilograms',
    name: 'Convert Ounces to Kilograms (oz to kg)',
    terms: '',
  },
  {
    href: '/convert/ounces-to-milligrams',
    name: 'Convert Ounces to Milligrams (oz to mg)',
    terms: '',
  },
  {
    href: '/convert/ounces-to-pounds',
    name: 'Convert Ounces to Pounds (oz to lb)',
    terms: '',
  },
  {
    href: '/convert/ounces-to-stone',
    name: 'Convert Ounces to Stone (oz to stone)',
    terms: '',
  },
  {
    href: '/convert/ounces-to-tonne',
    name: 'Convert Ounces to Metric tonnes (oz to tonne)',
    terms: '',
  },
  {
    href: '/convert/pascals-to-atmospheres',
    name: 'Convert Pascals to Atmospheres (Pa to atm)',
    terms: '',
  },
  {
    href: '/convert/pascals-to-bar',
    name: 'Convert Pascals to Bar (Pa to bar)',
    terms: '',
  },
  {
    href: '/convert/pascals-to-kilopascals',
    name: 'Convert Pascals to Kilopascals (Pa to kPa)',
    terms: '',
  },
  {
    href: '/convert/pascals-to-megapascals',
    name: 'Convert Pascals to Megapascals (Pa to MPa)',
    terms: '',
  },
  {
    href: '/convert/pascals-to-psi',
    name: 'Convert Pascals to Pounds per square inch',
    terms: 'pa psi',
  },
  {
    href: '/convert/png-to-jpg',
    name: 'PNG to JPEG converter',
    terms: 'jpg',
  },
  {
    href: '/convert/png-to-webp',
    name: 'PNG to WebP converter',
    terms: '',
  },
  {
    href: '/convert/pound-force-to-dynes',
    name: 'Convert Pound-force to Dynes (lbf to dyn)',
    terms: 'poundforce',
  },
  {
    href: '/convert/pound-force-to-kilogram-force',
    name: 'Convert Pound-force to Kilogram-force',
    terms: 'kgf kilogramforce lbf poundforce',
  },
  {
    href: '/convert/pound-force-to-kilonewtons',
    name: 'Convert Pound-force to Kilonewtons (lbf to kN)',
    terms: 'poundforce',
  },
  {
    href: '/convert/pound-force-to-newtons',
    name: 'Convert Pound-force to Newtons (lbf to N)',
    terms: 'poundforce',
  },
  {
    href: '/convert/pounds-to-grams',
    name: 'Convert Pounds to Grams (lb to g)',
    terms: '',
  },
  {
    href: '/convert/pounds-to-kilograms',
    name: 'Convert Pounds to Kilograms (lb to kg)',
    terms: '',
  },
  {
    href: '/convert/pounds-to-milligrams',
    name: 'Convert Pounds to Milligrams (lb to mg)',
    terms: '',
  },
  {
    href: '/convert/pounds-to-ounces',
    name: 'Convert Pounds to Ounces (lb to oz)',
    terms: '',
  },
  {
    href: '/convert/pounds-to-stone',
    name: 'Convert Pounds to Stone (lb to stone)',
    terms: '',
  },
  {
    href: '/convert/pounds-to-tonne',
    name: 'Convert Pounds to Metric tonnes (lb to tonne)',
    terms: '',
  },
  {
    href: '/convert/psi-to-atmospheres',
    name: 'Convert Pounds per square inch to Atmospheres',
    terms: 'atm psi',
  },
  {
    href: '/convert/psi-to-bar',
    name: 'Convert Pounds per square inch to Bar',
    terms: 'psi',
  },
  {
    href: '/convert/psi-to-kilopascals',
    name: 'Convert Pounds per square inch to Kilopascals',
    terms: 'kpa psi',
  },
  {
    href: '/convert/psi-to-megapascals',
    name: 'Convert Pounds per square inch to Megapascals',
    terms: 'mpa psi',
  },
  {
    href: '/convert/psi-to-pascals',
    name: 'Convert Pounds per square inch to Pascals',
    terms: 'pa psi',
  },
  {
    href: '/convert/radians-to-degrees',
    name: 'Convert Radians to Degrees (rad to deg)',
    terms: '',
  },
  {
    href: '/convert/radians-to-gradians',
    name: 'Convert Radians to Gradians (rad to grad)',
    terms: '',
  },
  {
    href: '/convert/radians-to-turns',
    name: 'Convert Radians to Turns (rad to turn)',
    terms: '',
  },
  {
    href: '/convert/rpm-to-gigahertz',
    name: 'Convert Revolutions per minute to Gigahertz',
    terms: 'ghz rpm',
  },
  {
    href: '/convert/rpm-to-hertz',
    name: 'Convert Revolutions per minute to Hertz',
    terms: 'hz rpm',
  },
  {
    href: '/convert/rpm-to-kilohertz',
    name: 'Convert Revolutions per minute to Kilohertz',
    terms: 'khz rpm',
  },
  {
    href: '/convert/rpm-to-megahertz',
    name: 'Convert Revolutions per minute to Megahertz',
    terms: 'mhz rpm',
  },
  {
    href: '/convert/rst-to-asciidoc',
    name: 'reStructuredText to AsciiDoc converter',
    terms: 'rst',
  },
  {
    href: '/convert/rst-to-csv',
    name: 'reStructuredText to CSV converter',
    terms: 'rst',
  },
  {
    href: '/convert/rst-to-html',
    name: 'reStructuredText to HTML converter',
    terms: 'rst',
  },
  {
    href: '/convert/rst-to-json',
    name: 'reStructuredText to JSON converter',
    terms: 'rst',
  },
  {
    href: '/convert/rst-to-latex',
    name: 'reStructuredText to LaTeX converter',
    terms: 'rst',
  },
  {
    href: '/convert/rst-to-markdown',
    name: 'reStructuredText to Markdown converter',
    terms: 'rst',
  },
  {
    href: '/convert/rst-to-sql',
    name: 'reStructuredText to SQL converter',
    terms: 'rst',
  },
  {
    href: '/convert/rst-to-tsv',
    name: 'reStructuredText to TSV converter',
    terms: 'rst',
  },
  {
    href: '/convert/rst-to-xml',
    name: 'reStructuredText to XML converter',
    terms: 'rst',
  },
  {
    href: '/convert/rst-to-yaml',
    name: 'reStructuredText to YAML converter',
    terms: 'rst',
  },
  {
    href: '/convert/seconds-to-days',
    name: 'Convert Seconds to Days (s to day)',
    terms: '',
  },
  {
    href: '/convert/seconds-to-hours',
    name: 'Convert Seconds to Hours (s to h)',
    terms: '',
  },
  {
    href: '/convert/seconds-to-milliseconds',
    name: 'Convert Seconds to Milliseconds (s to ms)',
    terms: '',
  },
  {
    href: '/convert/seconds-to-minutes',
    name: 'Convert Seconds to Minutes (s to min)',
    terms: '',
  },
  {
    href: '/convert/seconds-to-weeks',
    name: 'Convert Seconds to Weeks (s to week)',
    terms: '',
  },
  {
    href: '/convert/sql-to-asciidoc',
    name: 'SQL to AsciiDoc converter',
    terms: '',
  },
  {
    href: '/convert/sql-to-csv',
    name: 'SQL to CSV converter',
    terms: '',
  },
  {
    href: '/convert/sql-to-html',
    name: 'SQL to HTML converter',
    terms: '',
  },
  {
    href: '/convert/sql-to-json',
    name: 'SQL to JSON converter',
    terms: '',
  },
  {
    href: '/convert/sql-to-latex',
    name: 'SQL to LaTeX converter',
    terms: '',
  },
  {
    href: '/convert/sql-to-markdown',
    name: 'SQL to Markdown converter',
    terms: '',
  },
  {
    href: '/convert/sql-to-rst',
    name: 'SQL to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/sql-to-tsv',
    name: 'SQL to TSV converter',
    terms: '',
  },
  {
    href: '/convert/sql-to-xml',
    name: 'SQL to XML converter',
    terms: '',
  },
  {
    href: '/convert/sql-to-yaml',
    name: 'SQL to YAML converter',
    terms: '',
  },
  {
    href: '/convert/stone-to-grams',
    name: 'Convert Stone to Grams (stone to g)',
    terms: '',
  },
  {
    href: '/convert/stone-to-kilograms',
    name: 'Convert Stone to Kilograms (stone to kg)',
    terms: '',
  },
  {
    href: '/convert/stone-to-milligrams',
    name: 'Convert Stone to Milligrams (stone to mg)',
    terms: '',
  },
  {
    href: '/convert/stone-to-ounces',
    name: 'Convert Stone to Ounces (stone to oz)',
    terms: '',
  },
  {
    href: '/convert/stone-to-pounds',
    name: 'Convert Stone to Pounds (stone to lb)',
    terms: '',
  },
  {
    href: '/convert/stone-to-tonne',
    name: 'Convert Stone to Metric tonnes (stone to tonne)',
    terms: '',
  },
  {
    href: '/convert/tbsp-to-cup-us',
    name: 'Convert US tablespoons to US cups',
    terms: 'tbsp',
  },
  {
    href: '/convert/tbsp-to-floz-us',
    name: 'Convert US tablespoons to US fluid ounces',
    terms: 'floz tbsp',
  },
  {
    href: '/convert/tbsp-to-litres',
    name: 'Convert US tablespoons to Litres (tbsp to l)',
    terms: '',
  },
  {
    href: '/convert/tbsp-to-millilitres',
    name: 'Convert US tablespoons to Millilitres',
    terms: 'ml tbsp',
  },
  {
    href: '/convert/tbsp-to-tsp',
    name: 'Convert US tablespoons to US teaspoons',
    terms: 'tbsp tsp',
  },
  {
    href: '/convert/tonne-to-grams',
    name: 'Convert Metric tonnes to Grams (tonne to g)',
    terms: '',
  },
  {
    href: '/convert/tonne-to-kilograms',
    name: 'Convert Metric tonnes to Kilograms (tonne to kg)',
    terms: '',
  },
  {
    href: '/convert/tonne-to-milligrams',
    name: 'Convert Metric tonnes to Milligrams',
    terms: 'mg',
  },
  {
    href: '/convert/tonne-to-ounces',
    name: 'Convert Metric tonnes to Ounces (tonne to oz)',
    terms: '',
  },
  {
    href: '/convert/tonne-to-pounds',
    name: 'Convert Metric tonnes to Pounds (tonne to lb)',
    terms: '',
  },
  {
    href: '/convert/tonne-to-stone',
    name: 'Convert Metric tonnes to Stone (tonne to stone)',
    terms: '',
  },
  {
    href: '/convert/tsp-to-cup-us',
    name: 'Convert US teaspoons to US cups',
    terms: 'tsp',
  },
  {
    href: '/convert/tsp-to-floz-us',
    name: 'Convert US teaspoons to US fluid ounces',
    terms: 'floz tsp',
  },
  {
    href: '/convert/tsp-to-litres',
    name: 'Convert US teaspoons to Litres (tsp to l)',
    terms: '',
  },
  {
    href: '/convert/tsp-to-millilitres',
    name: 'Convert US teaspoons to Millilitres (tsp to ml)',
    terms: '',
  },
  {
    href: '/convert/tsp-to-tbsp',
    name: 'Convert US teaspoons to US tablespoons',
    terms: 'tbsp tsp',
  },
  {
    href: '/convert/tsv-to-asciidoc',
    name: 'TSV to AsciiDoc converter',
    terms: '',
  },
  {
    href: '/convert/tsv-to-html',
    name: 'TSV to HTML converter',
    terms: '',
  },
  {
    href: '/convert/tsv-to-json',
    name: 'TSV to JSON converter',
    terms: '',
  },
  {
    href: '/convert/tsv-to-latex',
    name: 'TSV to LaTeX converter',
    terms: '',
  },
  {
    href: '/convert/tsv-to-markdown',
    name: 'TSV to Markdown converter',
    terms: '',
  },
  {
    href: '/convert/tsv-to-rst',
    name: 'TSV to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/tsv-to-sql',
    name: 'TSV to SQL converter',
    terms: '',
  },
  {
    href: '/convert/tsv-to-xml',
    name: 'TSV to XML converter',
    terms: '',
  },
  {
    href: '/convert/tsv-to-yaml',
    name: 'TSV to YAML converter',
    terms: '',
  },
  {
    href: '/convert/turns-to-degrees',
    name: 'Convert Turns to Degrees (turn to deg)',
    terms: '',
  },
  {
    href: '/convert/turns-to-gradians',
    name: 'Convert Turns to Gradians (turn to grad)',
    terms: '',
  },
  {
    href: '/convert/turns-to-radians',
    name: 'Convert Turns to Radians (turn to rad)',
    terms: '',
  },
  {
    href: '/convert/watt-hours-to-btu',
    name: 'Convert Watt-hours to BTU (IT)',
    terms: 'watthour wh',
  },
  {
    href: '/convert/watt-hours-to-calories',
    name: 'Convert Watt-hours to Calories (Wh to cal)',
    terms: 'watthour',
  },
  {
    href: '/convert/watt-hours-to-joules',
    name: 'Convert Watt-hours to Joules (Wh to J)',
    terms: 'watthour',
  },
  {
    href: '/convert/watt-hours-to-kilocalories',
    name: 'Convert Watt-hours to Kilocalories (Wh to kcal)',
    terms: 'watthour',
  },
  {
    href: '/convert/watt-hours-to-kilojoules',
    name: 'Convert Watt-hours to Kilojoules (Wh to kJ)',
    terms: 'watthour',
  },
  {
    href: '/convert/watt-hours-to-kilowatt-hours',
    name: 'Convert Watt-hours to Kilowatt-hours (Wh to kWh)',
    terms: 'kilowatthour watthour',
  },
  {
    href: '/convert/watts-to-btu-h',
    name: 'Convert Watts to BTU per hour (W to BTU/h)',
    terms: '',
  },
  {
    href: '/convert/watts-to-hp',
    name: 'Convert Watts to Mechanical horsepower (W to hp)',
    terms: '',
  },
  {
    href: '/convert/watts-to-kilowatts',
    name: 'Convert Watts to Kilowatts (W to kW)',
    terms: '',
  },
  {
    href: '/convert/watts-to-megawatts',
    name: 'Convert Watts to Megawatts (W to MW)',
    terms: '',
  },
  {
    href: '/convert/webp-to-jpg',
    name: 'WebP to JPEG converter',
    terms: 'jpg',
  },
  {
    href: '/convert/webp-to-png',
    name: 'WebP to PNG converter',
    terms: '',
  },
  {
    href: '/convert/weeks-to-days',
    name: 'Convert Weeks to Days (week to day)',
    terms: '',
  },
  {
    href: '/convert/weeks-to-hours',
    name: 'Convert Weeks to Hours (week to h)',
    terms: '',
  },
  {
    href: '/convert/weeks-to-milliseconds',
    name: 'Convert Weeks to Milliseconds (week to ms)',
    terms: '',
  },
  {
    href: '/convert/weeks-to-minutes',
    name: 'Convert Weeks to Minutes (week to min)',
    terms: '',
  },
  {
    href: '/convert/weeks-to-seconds',
    name: 'Convert Weeks to Seconds (week to s)',
    terms: '',
  },
  {
    href: '/convert/xml-to-asciidoc',
    name: 'XML to AsciiDoc converter',
    terms: '',
  },
  {
    href: '/convert/xml-to-csv',
    name: 'XML to CSV converter',
    terms: '',
  },
  {
    href: '/convert/xml-to-html',
    name: 'XML to HTML converter',
    terms: '',
  },
  {
    href: '/convert/xml-to-json',
    name: 'XML to JSON converter',
    terms: '',
  },
  {
    href: '/convert/xml-to-latex',
    name: 'XML to LaTeX converter',
    terms: '',
  },
  {
    href: '/convert/xml-to-markdown',
    name: 'XML to Markdown converter',
    terms: '',
  },
  {
    href: '/convert/xml-to-rst',
    name: 'XML to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/xml-to-sql',
    name: 'XML to SQL converter',
    terms: '',
  },
  {
    href: '/convert/xml-to-tsv',
    name: 'XML to TSV converter',
    terms: '',
  },
  {
    href: '/convert/xml-to-yaml',
    name: 'XML to YAML converter',
    terms: '',
  },
  {
    href: '/convert/yaml-to-asciidoc',
    name: 'YAML to AsciiDoc converter',
    terms: '',
  },
  {
    href: '/convert/yaml-to-csv',
    name: 'YAML to CSV converter',
    terms: '',
  },
  {
    href: '/convert/yaml-to-html',
    name: 'YAML to HTML converter',
    terms: '',
  },
  {
    href: '/convert/yaml-to-json',
    name: 'YAML to JSON converter',
    terms: '',
  },
  {
    href: '/convert/yaml-to-latex',
    name: 'YAML to LaTeX converter',
    terms: '',
  },
  {
    href: '/convert/yaml-to-markdown',
    name: 'YAML to Markdown converter',
    terms: '',
  },
  {
    href: '/convert/yaml-to-rst',
    name: 'YAML to reStructuredText converter',
    terms: 'rst',
  },
  {
    href: '/convert/yaml-to-sql',
    name: 'YAML to SQL converter',
    terms: '',
  },
  {
    href: '/convert/yaml-to-tsv',
    name: 'YAML to TSV converter',
    terms: '',
  },
  {
    href: '/convert/yaml-to-xml',
    name: 'YAML to XML converter',
    terms: '',
  },
  {
    href: '/convert/yards-to-centimetres',
    name: 'Convert Yards to Centimetres (yd to cm)',
    terms: '',
  },
  {
    href: '/convert/yards-to-feet',
    name: 'Convert Yards to Feet (yd to ft)',
    terms: '',
  },
  {
    href: '/convert/yards-to-inches',
    name: 'Convert Yards to Inches (yd to in)',
    terms: '',
  },
  {
    href: '/convert/yards-to-kilometres',
    name: 'Convert Yards to Kilometres (yd to km)',
    terms: '',
  },
  {
    href: '/convert/yards-to-metres',
    name: 'Convert Yards to Metres (yd to m)',
    terms: '',
  },
  {
    href: '/convert/yards-to-miles',
    name: 'Convert Yards to Miles (yd to mi)',
    terms: '',
  },
  {
    href: '/convert/yards-to-millimetres',
    name: 'Convert Yards to Millimetres (yd to mm)',
    terms: '',
  },
  {
    href: '/convert/yards-to-nmi',
    name: 'Convert Yards to Nautical miles (yd to nmi)',
    terms: '',
  },
  {
    href: '/creator/app-store-mockup-generator',
    name: 'App Store & Play Store screenshot mockup generator',
    terms:
      'background bezel clean format frame gradient hardware header high highimpact impact marketing smartphone svg tagline',
    op: 'creator text text',
  },
  {
    href: '/creator/audio-trimmer',
    name: 'Audio trimmer & cutter',
    terms:
      'adjust anti antipop apply crossfade end gain pop start timestamp trim',
    op: 'creator text text',
  },
  {
    href: '/creator/brand-font-pairing-notes',
    name: 'Brand font-pairing notes',
    terms:
      'create decision downloaded fontpairing generic no role selected user userselected',
    op: 'creator text text',
  },
  {
    href: '/creator/brand-name-shortlister',
    name: 'Brand-name shortlister',
    terms:
      'brandname character count explicit length rule score supplied word wordcount',
    op: 'creator text text',
  },
  {
    href: '/creator/brand-palette-generator',
    name: 'Brand-palette generator',
    terms: 'brandpalette color deterministic five fivecolor hsl name',
    op: 'creator text text',
  },
  {
    href: '/creator/caption-line-breaker',
    name: 'Caption line breaker',
    terms: 'boundarie chosen near paragraph preserving text width wrap',
    op: 'creator text text',
  },
  {
    href: '/creator/content-calendar-maker',
    name: 'Content-calendar maker',
    terms:
      'back checked come contentcalendar date dated day dd each entrie line mm one order paste per pipe platform post read real row separated sort sorted topic validate yyyy yyyymmdd',
    op: 'creator text text',
  },
  {
    href: '/creator/content-idea-matrix',
    name: 'Content-idea matrix',
    terms: 'audience contentidea create cros grid pillar supplied',
    op: 'creator text text',
  },
  {
    href: '/creator/creator-file-naming-tool',
    name: 'Creator file-naming tool',
    terms:
      'asset date filename filenaming generate portable project sortable version',
    op: 'creator text text',
  },
  {
    href: '/creator/creator-media-kit-generator',
    name: 'Creator media-kit generator',
    terms: 'build concise fact markdown mediakit metric supplied',
    op: 'creator text text',
  },
  {
    href: '/creator/css-box-shadow',
    name: 'CSS box-shadow builder',
    terms:
      'boxshadow create declaration effect layered modern preset ready readytouse tailwind',
    op: 'creator text text',
  },
  {
    href: '/creator/css-flexbox-grid',
    name: 'CSS Flexbox & Grid visual reference',
    terms:
      'ascii classe diagram helper interactive layout outputting rule tailwind',
    op: 'creator none text',
  },
  {
    href: '/creator/css-glassmorphism',
    name: 'CSS Glassmorphism & Neumorphism generator',
    terms: 'classe frosted glas live modern soft styling tailwind ui',
    op: 'creator text text',
  },
  {
    href: '/creator/dev-to-front-matter-generator',
    name: 'DEV.to front-matter generator',
    terms: 'community draft escaped frontmatter yaml',
    op: 'creator text text',
  },
  {
    href: '/creator/engagement-rate-calculator',
    name: 'Engagement-rate calculator',
    terms: 'divided engagementrate follower reach supplied',
    op: 'creator none text',
  },
  {
    href: '/creator/facebook-post-formatter',
    name: 'Facebook post formatter',
    terms: 'character count normalize report transparent whitespace word',
    op: 'creator text text',
  },
  {
    href: '/creator/favicon-generator',
    name: 'Favicon & web icon snippet generator',
    terms: 'app complete data head html manifest pwa svg tag uri',
    op: 'creator text text',
  },
  {
    href: '/creator/follower-growth-calculator',
    name: 'Follower-growth calculator',
    terms: 'audience between count followergrowth net percentage two',
    op: 'creator none text',
  },
  {
    href: '/creator/hashnode-front-matter-generator',
    name: 'Hashnode front-matter generator',
    terms: 'draft escaped frontmatter portable style yaml yamlstyle',
    op: 'creator text text',
  },
  {
    href: '/creator/hashtag-deduplicator',
    name: 'Hashtag deduplicator',
    terms: 'case caseinsensitively insensitively normalize',
    op: 'creator text text',
  },
  {
    href: '/creator/hook-generator-workspace',
    name: 'Hook generator workspace',
    terms: 'ai fill fillinthetopic model pattern topic transparent',
    op: 'creator text text',
  },
  {
    href: '/creator/instagram-bio-formatter',
    name: 'Instagram bio formatter',
    terms: 'character compact count line multi multiline normalize report',
    op: 'creator text text',
  },
  {
    href: '/creator/instagram-caption-formatter',
    name: 'Instagram caption formatter',
    terms: 'character hashtag normalize report spacing word',
    op: 'creator text text',
  },
  {
    href: '/creator/instagram-hashtag-workspace',
    name: 'Instagram hashtag workspace',
    terms: 'count deduplicate normalize recommending trend',
    op: 'creator text text',
  },
  {
    href: '/creator/link-in-bio-page-exporter',
    name: 'Link-in-bio page exporter',
    terms: 'escaped export html label linkinbio pair responsive small url',
    op: 'creator text text',
  },
  {
    href: '/creator/linkedin-post-formatter',
    name: 'LinkedIn post formatter',
    terms: 'against chosen length limit normalize paragraph report spacing',
    op: 'creator text text',
  },
  {
    href: '/creator/medium-draft-formatter',
    name: 'Medium draft formatter',
    terms: 'article body markdown normalize subtitle title',
    op: 'creator text text',
  },
  {
    href: '/creator/newsletter-template-builder',
    name: 'Newsletter template builder',
    terms: 'focused markdown section skeleton supplied',
    op: 'creator text text',
  },
  {
    href: '/creator/podcast-chapter-generator',
    name: 'Podcast chapter generator',
    terms: 'line normalize timestamped validate',
    op: 'creator text text',
  },
  {
    href: '/creator/podcast-show-notes-template',
    name: 'Podcast show-notes template',
    terms: 'build episode link markdown shownote summary takeaway',
    op: 'creator text text',
  },
  {
    href: '/creator/px-to-rem',
    name: 'Pixel to REM / EM converter',
    terms: 'base customizable font point px size spacing tailwind unit value',
    op: 'creator none text',
  },
  {
    href: '/creator/rate-card-generator',
    name: 'Rate-card generator',
    terms: 'build explicit inventing markdown market price ratecard',
    op: 'creator text text',
  },
  {
    href: '/creator/rss-feed-builder',
    name: 'RSS feed builder',
    terms: '0 2 channel document escaped item line minimal',
    op: 'creator text text',
  },
  {
    href: '/creator/rss-feed-validator',
    name: 'RSS feed validator',
    terms:
      'channel check fetched field item no remote required schema shaped source xml xmlshaped',
    op: 'creator text text',
  },
  {
    href: '/creator/social-media-post-formatter',
    name: 'Social media Unicode text formatter (LinkedIn, X, Instagram)',
    terms:
      'bold bulleted circled formatting italic list monospace plain post script tool transform',
    op: 'creator text text',
  },
  {
    href: '/creator/social-share-preview',
    name: 'Social share preview',
    terms:
      'create length neutral platform platformneutral report text transparent',
    op: 'creator text text',
  },
  {
    href: '/creator/sponsorship-cpm-calculator',
    name: 'Sponsorship CPM calculator',
    terms: 'cost delivered impression per thousand view',
    op: 'creator none text',
  },
  {
    href: '/creator/substack-draft-formatter',
    name: 'Substack draft formatter',
    terms: 'add clean markdown structure subtitle title',
    op: 'creator text text',
  },
  {
    href: '/creator/subtitle-converter',
    name: 'Subtitle converter (SRT ⇄ VTT)',
    terms: 'between offset shifting subrip timestamp webvtt',
    op: 'creator text text',
  },
  {
    href: '/creator/svg-to-react',
    name: 'SVG to React (JSX/TSX) converter',
    terms:
      'clean component markup production productionready raw ready transform typescript',
    op: 'creator text text',
  },
  {
    href: '/creator/tiktok-caption-formatter',
    name: 'TikTok caption formatter',
    terms: 'against chosen length limit normalize report spacing',
    op: 'creator text text',
  },
  {
    href: '/creator/word-cloud-generator',
    name: 'Word cloud generator',
    terms: 'appear downloadable each often removed sized stop svg text',
    op: 'creator text text',
  },
  {
    href: '/creator/workbench',
    name: 'Creator & social workbench',
    terms: 'content format locally measure package plan',
  },
  {
    href: '/creator/x-post-character-counter',
    name: 'X post character counter',
    terms:
      'against limit provided simulated unicode url user userprovided weighting',
    op: 'creator text text',
  },
  {
    href: '/creator/x-thread-formatter',
    name: 'X thread formatter',
    terms:
      'character limit numbered pack paragraph post provided simple user userprovided',
    op: 'creator text text',
  },
  {
    href: '/creator/youtube-chapter-generator',
    name: 'YouTube chapter generator',
    terms: 'ascending list normalize paste pasteready ready timestamp validate',
    op: 'creator text text',
  },
  {
    href: '/creator/youtube-description-template',
    name: 'YouTube description template',
    terms: 'build chapter link structured summary',
    op: 'creator text text',
  },
  {
    href: '/creator/youtube-tag-workspace',
    name: 'YouTube tag workspace',
    terms: 'comma count deduplicate newline newlineseparated separated trim',
    op: 'creator text text',
  },
  {
    href: '/creator/youtube-timestamp-formatter',
    name: 'YouTube timestamp formatter',
    terms: 'convert count h label mm optional second ss',
    op: 'creator text text',
  },
  {
    href: '/creator/youtube-title-length-checker',
    name: 'YouTube title-length checker',
    terms:
      'against character count limit selected titlelength unicode user userselected',
    op: 'creator text text',
  },
  {
    href: '/data/address-column-cleaner',
    name: 'Address-column cleaner',
    terms: 'addresscolumn collapse comma normalize spacing whitespace',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/column-statistics',
    name: 'Column statistics',
    terms:
      'calculate count deviation maximum mean median minimum numeric population',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-cleaner',
    name: 'CSV cleaner',
    terms: 'blank cell completely header record remove trim',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-column-renamer',
    name: 'CSV column renamer',
    terms: 'duplicate header new old pair preventing',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-column-selector',
    name: 'CSV column selector',
    terms: 'comma commaseparated keep order selection separated',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-deduplicator',
    name: 'CSV deduplicator',
    terms: 'column duplicate full key later remove row selected',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-diff',
    name: 'CSV diff',
    terms: 'added changed compare dataset key removed report row two',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-editor',
    name: 'CSV editor',
    terms: 'input normalize output panel quoted validate',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-filter',
    name: 'CSV filter',
    terms: 'bounded column condition keep matche row selected simple whose',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-group-by',
    name: 'CSV group by',
    terms: 'calculate column count numeric one row sum',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-join',
    name: 'CSV join',
    terms: 'column dataset inner key left leftjoin named two',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-merger',
    name: 'CSV merger',
    terms:
      'added append appended below both dataset exactly first header kept match once one order paste row same second stack two',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-pivot-table',
    name: 'CSV pivot table',
    terms: 'column count create field row sum value',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-schema-inferer',
    name: 'CSV schema inferer',
    terms:
      'boolean column conservative date infer integer iso isodate number text type',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-sorter',
    name: 'CSV sorter',
    terms: 'column named number row stable stablesort text',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-splitter',
    name: 'CSV splitter',
    terms: 'header labelled part repeated row separately',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-to-json',
    name: 'CSV to JSON',
    terms: 'convert inspect quoted row spreadsheet structured tab',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-to-sql',
    name: 'CSV to SQL',
    terms: 'escaped generate identifier insert quoted statement text value',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-to-tsv',
    name: 'CSV to TSV',
    terms:
      'cell convert inside newline rejecting separated tab tabseparated value',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-transposer',
    name: 'CSV transposer',
    terms: 'bounded column rectangular row swap table',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-type-converter',
    name: 'CSV type converter',
    terms: 'boolean column date iso normalize number one text trimmed',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/csv-viewer',
    name: 'CSV viewer',
    terms:
      'based header headerbased parse preview separated strict tab table tabseparated',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/data-sampling-tool',
    name: 'Data sampling tool',
    terms: 'bounded random replacement sample select',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/date-column-normalizer',
    name: 'Date-column normalizer',
    terms: 'datecolumn dd iso mm normalize one yyyy yyyymmdd',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/excel',
    name: 'Excel converter',
    terms:
      'csv export file one online open read real sheet spreadsheet tab view workbook xlsx',
  },
  {
    href: '/data/json',
    name: 'JSON formatter',
    terms:
      'away beautifier key minify pretty print readable sending sort validate',
  },
  {
    href: '/data/json-to-csv',
    name: 'JSON to CSV',
    terms: 'array bounded convert object quoted',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/markdown-table-to-csv',
    name: 'Markdown table to CSV',
    terms: 'convert delimited pipe pipedelimited quoted simple',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/missing-value-analyzer',
    name: 'Missing-value analyzer',
    terms: 'blank column count marker missingvalue n na null per undefined',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/outlier-detector',
    name: 'Outlier detector',
    terms:
      '1 5 5x both column csv every fall fence flag four iqr needed number numeric outside paste quartile reported row value',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/phone-column-normalizer',
    name: 'Phone-column normalizer',
    terms:
      'country countryandnationaldigit digit form national normalize one phonecolumn',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/pivot-table-planner',
    name: 'Pivot-table planner',
    terms:
      'choice concise configuration field pivottable plan produce validate',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/random-row-selector',
    name: 'Random row selector',
    terms:
      'back checking column come complete csv dataset draw every number one paste pasted picking randomnes rather record select spot spotchecking together value whole winner',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/spreadsheet-blank-row-remover',
    name: 'Spreadsheet blank-row remover',
    terms: 'blankrow contain csv line physical separator whitespace',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/spreadsheet-cell-inspector',
    name: 'Spreadsheet cell inspector',
    terms:
      '1 8 based blank byte character column data exact hold look name named number one read row sheet utf utf8 value whether',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/spreadsheet-data-profiler',
    name: 'Spreadsheet data profiler',
    terms: 'column count inferred missingnes per profile row type uniquenes',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/spreadsheet-duplicate-finder',
    name: 'Spreadsheet duplicate finder',
    terms: 'chosen column number report row value',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/spreadsheet-formula-viewer',
    name: 'Spreadsheet formula viewer',
    terms: 'beginning cell csv evaluated list never',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/table-to-markdown',
    name: 'Table to Markdown',
    terms: 'convert csv escaped github githubstyle style',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/tsv-to-csv',
    name: 'TSV to CSV',
    terms: 'convert quoted rectangular row separated tab tabseparated',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/vlookup-generator',
    name: 'VLOOKUP generator',
    terms: 'cell explicit formula range setting spreadsheet',
    op: 'spreadsheet text text',
  },
  {
    href: '/data/workbench',
    name: 'CSV & spreadsheet workbench',
    terms:
      'array based clean compare convert data header inspect json object reshape strict tabular',
  },
  {
    href: '/data/workbook-audit',
    name: 'Excel Workbook Audit & Formula Inspector',
    terms:
      'anomalie benford broken cell check circular column constant detect error export find forensic hardcoded hidden law numeric reference report run sheet spreadsheet statistical test xlsx',
  },
  {
    href: '/date/add-days-to-date',
    name: 'Add days to date',
    terms: 'arithmetic calendar stable utc utcstable',
    op: 'date text text',
  },
  {
    href: '/date/age-calculator',
    name: 'Age calculator',
    terms: 'am birth birthday calendar date day elapsed old total',
  },
  {
    href: '/date/anniversary-calculator',
    name: 'Anniversary calculator',
    terms: '28 29 complete count day feb needed remaining year',
    op: 'date text text',
  },
  {
    href: '/date/birthday-countdown',
    name: 'Birthday countdown',
    terms: '28 29 calendar count day feb leap month next non nonleap year',
    op: 'date text text',
  },
  {
    href: '/date/business-days-calculator',
    name: 'Business-days calculator',
    terms: 'businessday count date end excluding friday including monday start',
    op: 'date text text',
  },
  {
    href: '/date/date-difference',
    name: 'Date difference calculator',
    terms: 'between calendar count day duration exact two',
  },
  {
    href: '/date/day-of-year-calculator',
    name: 'Day-of-year calculator',
    terms:
      '0100 1 31 365 366 9999 based correctly counted date dayofyear december enter january leap one ordinal position read',
    op: 'date text text',
  },
  {
    href: '/date/duration-calculator',
    name: 'Duration calculator',
    terms: 'between elapsed explicit offset time timestamp two',
    op: 'date text text',
  },
  {
    href: '/date/hours-calculator',
    name: 'Hours calculator',
    terms: '24 24hour allowing between overnight span time two',
    op: 'date text text',
  },
  {
    href: '/date/iso-date-formatter',
    name: 'ISO date formatter',
    terms: 'explicit normalize offset timestamp utc validate',
    op: 'date text text',
  },
  {
    href: '/date/leap-year-checker',
    name: 'Leap-year checker',
    terms:
      '1 1900 4 400 9999 apply century divisible enter except gregorian including leapyear ordinary proleptic read rule unles whether',
    op: 'date none text',
  },
  {
    href: '/date/meeting-time-planner',
    name: 'Meeting-time planner',
    terms: 'acros compare iana instant meetingtime multiple one proposed zone',
    op: 'date text text',
  },
  {
    href: '/date/subtract-days-from-date',
    name: 'Subtract days from date',
    terms: 'arithmetic calendar stable utc utcstable',
    op: 'date text text',
  },
  {
    href: '/date/timezone-converter',
    name: 'Timezone converter',
    terms: 'absolute format iana one selected time timestamp zone',
    op: 'date text text',
  },
  {
    href: '/date/week-number-calculator',
    name: 'ISO week-number calculator',
    terms:
      '8601 calendar date december differ early fall iso8601 january late read returned s weeknumber www year yyyy yyyywww',
    op: 'date text text',
  },
  {
    href: '/date/workbench',
    name: 'Date & time workbench',
    terms: 'calculate hour timesheet workday zone',
  },
  {
    href: '/date/workbench?tool=timesheet-calculator',
    name: 'Timesheet calculator',
    terms: 'add break hh minute mm mmhh optional shift slash workbench',
    op: 'date text text',
  },
  {
    href: '/date/workday-calculator',
    name: 'Workday calculator',
    terms: 'add holiday included public subtract weekday',
    op: 'date text text',
  },
  {
    href: '/date/world-clock',
    name: 'World clock',
    terms:
      'absolute comma commaseparated iana instant list one separated time zone',
    op: 'date text text',
  },
  {
    href: '/developer/advanced',
    name: 'Advanced developer workbench',
    terms:
      'analyze build calculate capture config expression extraction flag generate group highlighting inspect json live match network regular secure test tester token',
  },
  {
    href: '/developer/base64-decode-text',
    name: 'Base64 text decoder',
    terms:
      '8 back byte correct decoded encoded error if ignored mojibake must padded padding paste rather read readable rejected standard string utf utf8 valid validate whitespace',
    op: 'developer-data text text',
  },
  {
    href: '/developer/base64-decoder',
    name: 'Base64 decoder',
    terms: '64 8 base convert standard text utf utf8 validated',
  },
  {
    href: '/developer/base64-encode-text',
    name: 'Base64 text encoder',
    terms:
      '8 accented alphabet ascii byte character copy emoji encoded equal first letter non nonascii padded padding paste plu read slash specifie standard string utf utf8',
    op: 'developer-data text text',
  },
  {
    href: '/developer/base64-encoder',
    name: 'Base64 encoder',
    terms: '64 8 base convert standard tab text unicode utf',
  },
  {
    href: '/developer/base64url-decode-text',
    name: 'Base64URL text decoder',
    terms:
      '8 accepted alphabet back base64 byte dash handle hyphen invalid jwt non nonutf8 padding query report reported safe sequence string underscore url urlsafe utf validate',
    op: 'developer-data text text',
  },
  {
    href: '/developer/base64url-encode-text',
    name: 'Base64URL text encoder',
    terms: '8 base64 no padding safe url urlsafe utf utf8',
    op: 'developer-data text text',
  },
  {
    href: '/developer/binary-calculator',
    name: 'Binary calculator',
    terms: 'add divide integer multiply remainder subtract',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/binary-decode-text',
    name: 'Binary bytes to text',
    terms: '8 bit decode eight eightbit group strict utf utf8 validation',
    op: 'developer-data text text',
  },
  {
    href: '/developer/binary-encode-text',
    name: 'Text to binary bytes',
    terms:
      '8 bit character checking dump each eight eightbit encode group legible map one paste per read separated space spaceseparated stay teaching useful utf utf8 zero',
    op: 'developer-data text text',
  },
  {
    href: '/developer/bitwise-calculator',
    name: 'Bitwise calculator',
    terms: 'apply bigint integer shift xor',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/byte-counter',
    name: 'UTF-8 byte counter',
    terms: '16 character code unicode unit utf16 utf8',
    op: 'developer-data text text',
  },
  {
    href: '/developer/checksum-calculator',
    name: 'Text checksum calculator',
    terms:
      '256 384 512 8 api compare copy crypto digest hexadecimal lowercase paste pasted pick published read result run sha sha256 sha384 sha512 utf value web',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/chmod-calculator',
    name: 'Unix chmod & permissions calculator',
    terms: 'command convert exact file generate mode octal posix symbolic',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/cidr-calculator',
    name: 'CIDR calculator',
    terms: 'addres block exact ipv4 parse range',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/code-points-to-text',
    name: 'Code points to text',
    terms: 'create hexadecimal scalar unicode value',
    op: 'developer-data text text',
  },
  {
    href: '/developer/cookie-parser',
    name: 'Cookie parser',
    terms: 'decoded header name pair request value',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/cron-expression-builder',
    name: 'Cron expression builder',
    terms: 'explicit field five fivefield validated',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/cron-expression-parser',
    name: 'Cron expression parser',
    terms: 'explain field five fivepart part standard validate',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/cron-generator',
    name: 'Cron expression generator & translator',
    terms:
      '5 5field build crontab english estimate field next parse plain run schedule',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/curl-to-code',
    name: 'cURL to code converter',
    terms:
      'axio command fetch go idiomatic javascript js line node php python request',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/docker-cheatsheet',
    name: 'Docker & Compose generator & cheatsheet',
    terms:
      'cli command container dockercompose essential management multi multicontainer template yml',
    op: 'developer-advanced none text',
  },
  {
    href: '/developer/dockerignore-generator',
    name: '.dockerignore generator',
    terms: 'build buildcontext conservative context docker file ignore',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/dummy-data-generator',
    name: 'Mock & dummy data generator',
    terms:
      'api csv database dataset json realistic record sql structured testing',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/editorconfig-generator',
    name: 'EditorConfig generator',
    terms: 'build choice ending explicit indentation line lineending root',
    op: 'developer-advanced none text',
  },
  {
    href: '/developer/epoch-calculator',
    name: 'Epoch calculator',
    terms: 'convert date datetime iso millisecond second time unix',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/er-diagram-to-sql',
    name: 'ER Diagram to SQL Converter',
    terms:
      'create erdiagram foreign junction key manytomany mermaid mysql postgresql primary runnable sqlite statement table',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/escape-sequence-viewer',
    name: 'Escape-sequence viewer',
    terms:
      'code control escapesequence evaluating javascript javascriptstyle list quote slash style unicode',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/git-flight-rules',
    name: 'Git emergency scenarios ("Flight Rules")',
    terms:
      'branch commit common copy copypaste mistake operation paste quick recovery solution',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/gitignore-generator',
    name: '.gitignore generator',
    terms: 'built builtin ecosystem ignore preset reviewed rule',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/graphql-formatter',
    name: 'GraphQL formatter',
    terms:
      'aware bounded comment commentaware document formatting indent lexical string',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/graphql-variable-builder',
    name: 'GraphQL variable builder',
    terms: 'format json object validate',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/har-sanitizer',
    name: 'HAR (HTTP Archive) Sanitizer',
    terms:
      'authorization capture cookie file header network query sanitize sensitive sharing stripping token',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/hex-decode-text',
    name: 'Hexadecimal to text',
    terms: '8 decode even evenlength hex length strict utf utf8 validation',
    op: 'developer-data text text',
  },
  {
    href: '/developer/hex-encode-text',
    name: 'Text to hexadecimal',
    terms:
      '8 byte character copy digit each emoji encode encoded hex lowercase multi no paste per separator stored such two utf utf8',
    op: 'developer-data text text',
  },
  {
    href: '/developer/hex-to-hsl',
    name: 'HEX to HSL',
    terms: 'color convert css hexadecimal rounded value',
    op: 'developer-data text text',
  },
  {
    href: '/developer/hex-to-rgb',
    name: 'HEX to RGB',
    terms: '3 4 6 8 color convert css digit hexadecimal rgba',
    op: 'developer-data text text',
  },
  {
    href: '/developer/hmac-generator',
    name: 'HMAC generator',
    terms: '8 calculate crypto keyed text through utf utf8 web',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/hsl-to-hex',
    name: 'HSL to HEX',
    terms: 'alpha convert hue lightnes optional saturation',
    op: 'developer-data none text',
  },
  {
    href: '/developer/html-entity-decode',
    name: 'HTML entity decoder',
    terms: 'core entitie five named numeric',
    op: 'developer-data text text',
  },
  {
    href: '/developer/html-entity-encode',
    name: 'HTML entity encoder',
    terms: 'ampersand angle apostrophe bracket escape quote',
    op: 'developer-data text text',
  },
  {
    href: '/developer/http-header-parser',
    name: 'HTTP header parser',
    terms: 'case casenormalized json line normalized object request',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/http-status-codes',
    name: 'HTTP status codes reference',
    terms:
      '1xx 5xx api definition encyclopedia guidance response rfc searchable',
    op: 'developer-advanced none text',
  },
  {
    href: '/developer/ini-viewer',
    name: 'INI viewer',
    terms:
      'bounded json object parse preserving section sectionpreserving subset',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/ip-address-converter',
    name: 'IPv4 address converter',
    terms: 'binary decimal dotted hexadecimal ip unsigned',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/ipv4-subnet-calculator',
    name: 'IPv4 subnet calculator',
    terms: 'broadcast capacity host mask network range usable',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/ipv6-subnet-calculator',
    name: 'IPv6 subnet calculator',
    terms: 'addres final network normalized parse prefix',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/json-diff',
    name: 'JSON diff',
    terms: 'changed compare list parsed path two value',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/json-editor',
    name: 'JSON editor',
    terms: 'edited indentation normalize space two twospace validate',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/json-format',
    name: 'JSON formatter',
    terms: 'indentation space two twospace validate',
    op: 'developer-data text text',
  },
  {
    href: '/developer/json-minify',
    name: 'JSON minifier',
    terms: 'insignificant minify remove validate whitespace',
    op: 'developer-data text text',
  },
  {
    href: '/developer/json-path-tester',
    name: 'JSON path tester',
    terms: 'array arrayindex bounded index notation property resolve',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/json-sort-keys',
    name: 'JSON key sorter',
    terms: 'array object order preserving recursively',
    op: 'developer-data text text',
  },
  {
    href: '/developer/json-string-escape',
    name: 'JSON string escaper',
    terms: 'escape inside literal text',
    op: 'developer-data text text',
  },
  {
    href: '/developer/json-string-unescape',
    name: 'JSON string unescaper',
    terms: 'code decode escape evaluating unescape',
    op: 'developer-data text text',
  },
  {
    href: '/developer/json-to-typescript',
    name: 'JSON to TypeScript & JSON Schema converter',
    terms:
      '07 alia definition draft draft07 infer interface object parsed strict type',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/json-to-zod-schema',
    name: 'JSON to Zod Schema Generator',
    terms:
      'array data directly email infer int number object safe strict string type typesafe typescript validation z',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/jwt-decoder',
    name: 'JWT decoder & inspector',
    terms: 'claim compact header payload presence signature time verification',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/jwt-inspector',
    name: 'JWT inspector',
    terms: 'decode header locally payload trusting',
    op: 'developer-data text text',
  },
  {
    href: '/developer/llm-secret-scrubber',
    name: 'LLM Secret & API Key Scrubber',
    terms:
      'aws chatgpt claude connection credential email password pasting prompt redact string token',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/nano-id-generator',
    name: 'Nano ID generator',
    terms: 'cryptographic identifier random randomnes safe url urlsafe',
    op: 'developer-advanced none text',
  },
  {
    href: '/developer/number-base-converter',
    name: 'Number-base converter',
    terms: '2 36 between bigint integer numberbase precision signed through',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/openapi-example-generator',
    name: 'OpenAPI example generator',
    terms: 'bounded json object one schema subset',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/openapi-viewer',
    name: 'OpenAPI viewer',
    terms: 'declared document http inspect json list operation',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/package-json-inspector',
    name: 'package.json inspector',
    terms: 'dependencie engine identity module script type',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/password-generator',
    name: 'Password generator',
    terms: 'character explicit preset randomnes secure',
    op: 'developer-advanced none text',
  },
  {
    href: '/developer/query-parameter-remove',
    name: 'Remove query parameter',
    terms: 'absolute every instance one url',
    op: 'developer-data text text',
  },
  {
    href: '/developer/query-parameter-set',
    name: 'Set query parameter',
    terms: 'absolute one replace url',
    op: 'developer-data text text',
  },
  {
    href: '/developer/random-token-generator',
    name: 'Random token generator',
    terms: 'base64url byte cryptographically hexadecimal',
    op: 'developer-advanced none text',
  },
  {
    href: '/developer/regex-explainer',
    name: 'Regex explainer',
    terms:
      'annotate common expression javascript order regular source token validate',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/regex-extractor',
    name: 'Regex extractor',
    terms:
      '0 200 capture choose every expression group line list match matche one paste pattern per pull read regular regularexpression result returning text whole',
    op: 'developer-data text text',
  },
  {
    href: '/developer/regex-replacer',
    name: 'Regex replacer',
    terms: '1 javascript replace replacement such text token',
    op: 'developer-data text text',
  },
  {
    href: '/developer/regex-tester',
    name: 'Regular-expression tester',
    terms:
      'bounded capture group javascript list matche regex regularexpression',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/rgb-to-hex',
    name: 'RGB to HEX',
    terms: 'alpha channel convert css hexadecimal integer optional',
    op: 'developer-data none text',
  },
  {
    href: '/developer/semantic-version-calculator',
    name: 'Semantic-version calculator',
    terms: 'core major minor next patch semanticversion semver validate',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/sha-256-text',
    name: 'SHA-256 text hash',
    terms:
      '64 64character 8 back cache character choice comparison copy crypto digest fingerprint git hexadecimal implementation integrity jwt key object one paste read sha256 usual utf web',
    op: 'developer-data text text',
  },
  {
    href: '/developer/sha-384-text',
    name: 'SHA-384 text hash',
    terms:
      '2 512 8 96 96character back character copy crypto digest hexadecimal implementation longer paste read required sha2 sha384 spec truncated used utf value variant vendor web',
    op: 'developer-data text text',
  },
  {
    href: '/developer/sha-512-text',
    name: 'SHA-512 text hash',
    terms:
      '128 128character 2 8 archival asked back character copy crypto digest family hexadecimal implementation longest often option paste read sha2 sha512 signing utf web widest workflow',
    op: 'developer-data text text',
  },
  {
    href: '/developer/sql-formatter',
    name: 'SQL formatter',
    terms: 'aware bounded comment commentaware quote statement tokenization',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/sql-minifier',
    name: 'SQL minifier',
    terms:
      'aware comment quote quoteaware remove tokenization unnecessary whitespace',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/sql-parameter-binder',
    name: 'SQL parameter preview',
    terms:
      'array binder display json literal marker positional quoted replace safely',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/sql-pii-obfuscator',
    name: 'SQL PII Obfuscator & Sanitizer',
    terms:
      'card credit customer data debugging dump email mask number phone querie safe sensitive',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/sql-to-er-diagram',
    name: 'SQL Schema to Visual ER Diagram',
    terms:
      'create dbml ddl erdiagram export interactive mermaid online plantuml server svg upload zero',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/svg-cleaner',
    name: 'SVG cleaner & optimizer',
    terms:
      'comment declaration edit markup metadata redundant remove whitespace xml',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/ulid-generator',
    name: 'ULID generator',
    terms: 'base32 crockford current one randomnes secure time',
    op: 'developer-advanced none text',
  },
  {
    href: '/developer/unicode-code-points',
    name: 'Unicode code-point inspector',
    terms: 'character codepoint list perceived scalar user userperceived value',
    op: 'developer-data text text',
  },
  {
    href: '/developer/unix-timestamp',
    name: 'Unix timestamp converter',
    terms: 'date epoch iso millisecond second time',
  },
  {
    href: '/developer/url-decode',
    name: 'Full URL decoder',
    terms:
      '26 3f acros addres back character complete encoded escape every leaving link paste percent read reserved resolved separator sequence stand string structure such unchanged web whole xx',
    op: 'developer-data text text',
  },
  {
    href: '/developer/url-decode-component',
    name: 'URL component decoder',
    terms: 'encoded one percent percentencoded plu sign stay',
    op: 'developer-data text text',
  },
  {
    href: '/developer/url-encode',
    name: 'Full URL encoder',
    terms: 'character preserving separator unsafe',
    op: 'developer-data text text',
  },
  {
    href: '/developer/url-encode-component',
    name: 'URL component encoder',
    terms:
      'addres ampersand being character copy encoded escape escaped form inside larger mark must one paste path percent percentencode placed query question segment slashe space survive value web',
    op: 'developer-data text text',
  },
  {
    href: '/developer/url-origin-extractor',
    name: 'URL origin extractor',
    terms: 'effective hostname port protocol return',
    op: 'developer-data text text',
  },
  {
    href: '/developer/url-parser',
    name: 'URL parser',
    terms: 'absolute component inspect standard',
    op: 'developer-data text text',
  },
  {
    href: '/developer/url-path-segments',
    name: 'URL path segments',
    terms:
      '20 addres array decode decoded dropped each empty json list non one part paste pathname percent percentdecoded read remaining space split web',
    op: 'developer-data text text',
  },
  {
    href: '/developer/user-agent-parser',
    name: 'User-agent parser',
    terms:
      'common engine family hint identify mobile operating operatingsystem system useragent',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/utf8-byte-decoder',
    name: 'UTF-8 byte decoder',
    terms: 'decimal strict utf8 validation',
    op: 'developer-data text text',
  },
  {
    href: '/developer/utf8-byte-encoder',
    name: 'UTF-8 byte encoder',
    terms: 'decimal separated space spaceseparated utf8 value',
    op: 'developer-data text text',
  },
  {
    href: '/developer/uuid-generator',
    name: 'UUID generator',
    terms: 'cryptographically guid identifier random v4 value',
  },
  {
    href: '/developer/webhook-payload-tester',
    name: 'Webhook payload inspector',
    terms: 'json local pasted structure summarize tester validate',
    op: 'developer-advanced text text',
  },
  {
    href: '/developer/workbench',
    name: 'Developer & data workbench',
    terms: 'convert decode encode hash inspect test',
  },
  {
    href: '/developer/workbench?tool=csv-to-json',
    name: 'CSV to JSON',
    terms:
      'based field header headerbased including parse quoted strict workbench',
    op: 'developer-data text text',
  },
  {
    href: '/developer/workbench?tool=json-to-csv',
    name: 'JSON to CSV',
    terms: 'array convert flat object quoted quotedsafe safe workbench',
    op: 'developer-data text text',
  },
  {
    href: '/developer/workbench?tool=query-string-builder',
    name: 'Query-string builder',
    terms: 'array json object querystring scalar value workbench',
    op: 'developer-data text text',
  },
  {
    href: '/developer/workbench?tool=query-string-parser',
    name: 'Query-string parser',
    terms: 'array become json key querystring repeated workbench',
    op: 'developer-data text text',
  },
  {
    href: '/developer/workbench?tool=url-normalizer',
    name: 'URL normalizer',
    terms: 'apply parameter parse query sorting workbench',
    op: 'developer-data text text',
  },
  {
    href: '/documents/agenda-generator',
    name: 'Agenda generator',
    terms: 'create duration meeting planned timed total',
    op: 'document text text',
  },
  {
    href: '/documents/bibtex-viewer',
    name: 'BibTeX viewer',
    terms:
      'braced citation entry executing field inspect key quoted simple tex type',
    op: 'document text text',
  },
  {
    href: '/documents/business-letter-generator',
    name: 'Business-letter generator',
    terms: 'body businessletter format recipient sender subject supplied',
    op: 'document text text',
  },
  {
    href: '/documents/calendar-ics-generator',
    name: 'Calendar event (.ics) generator',
    terms:
      '5545 apple compliant create file google icalendar import outlook ready rfc',
    op: 'document text text',
  },
  {
    href: '/documents/certificate-generator',
    name: 'Certificate generator',
    terms: 'fact markdown printable supplied text',
    op: 'document text text',
  },
  {
    href: '/documents/changelog-generator',
    name: 'CHANGELOG generator',
    terms: 'added change changed entrie fixed group removed section typed',
    op: 'document text text',
  },
  {
    href: '/documents/citation-formatter',
    name: 'Citation formatter',
    terms:
      'apa author basic chicago fact mla pattern source supplied title year',
    op: 'document text text',
  },
  {
    href: '/documents/cover-letter-builder',
    name: 'Cover-letter builder',
    terms:
      'assemble clean coverletter experience fact inventing structure supplied',
    op: 'document text text',
  },
  {
    href: '/documents/document-compare',
    name: 'Document compare',
    terms:
      'bounded common diff level line linelevel longest longestcommonsubsequence produce subsequence',
    op: 'document text text',
  },
  {
    href: '/documents/document-template-filler',
    name: 'Document-template filler',
    terms:
      'documenttemplate json key missing object placeholder replace report',
    op: 'document text text',
  },
  {
    href: '/documents/document-word-counter',
    name: 'Document word counter',
    terms:
      'aware character estimated paragraph reading time unicode unicodeaware',
    op: 'document text text',
  },
  {
    href: '/documents/envelope-layout-generator',
    name: 'Envelope-layout generator',
    terms:
      'create draft envelopelayout monospaced placement printing recipient sender test',
    op: 'document text text',
  },
  {
    href: '/documents/html-email-templates',
    name: 'Responsive HTML email template generator',
    terms: 'bulletproof newsletter password receipt reset welcome',
    op: 'document text text',
  },
  {
    href: '/documents/label-sheet-generator',
    name: 'Label-sheet generator',
    terms:
      'bounded column grid labelsheet lay row separated supplied tab tabseparated',
    op: 'document text text',
  },
  {
    href: '/documents/latex-table-generator',
    name: 'LaTeX table generator',
    terms:
      'alignment booktab caption csv decimal emit longtable markdown online siunitx tsv upload zero',
    op: 'document text text',
  },
  {
    href: '/documents/legal-nda-generator',
    name: 'Mutual Non-Disclosure Agreement (NDA) maker',
    terms:
      '2 2page customizable formatted generate governing law legal legally nondisclosure page partie standard term',
    op: 'document text text',
  },
  {
    href: '/documents/mail-merge-preview',
    name: 'Mail-merge preview',
    terms: 'csv each every fill header mailmerge output placeholder row strict',
    op: 'document text text',
  },
  {
    href: '/documents/markdown-file-maker',
    name: 'Markdown file maker',
    terms: '8 download empty md non nonempty text utf utf8 validate',
    op: 'document text text',
  },
  {
    href: '/documents/markdown-resume-builder',
    name: 'Markdown resume builder (ATS-friendly)',
    terms:
      'atscompliant atsfriendly clean compliant developer edit generate pdf print ready structured',
    op: 'document text text',
  },
  {
    href: '/documents/markdown-table-generator',
    name: 'Markdown table generator & CSV converter',
    terms:
      'delimited flavored gfm github padded perfectly pipe pipeseparated separated tab tabdelimited text transform',
    op: 'document text text',
  },
  {
    href: '/documents/markdown-to-slides',
    name: 'Markdown to slides',
    terms: 'convert deck delimited interactive outline presentation',
    op: 'document text text',
  },
  {
    href: '/documents/meeting-minutes-generator',
    name: 'Meeting-minutes generator',
    terms:
      'action agenda attendee build decision item meetingminute structured',
    op: 'document text text',
  },
  {
    href: '/documents/metadata',
    name: 'Word document metadata viewer and stripper',
    terms:
      'author change check comment company deleted detail docx editing find held hidden inside propertie remove sending text time tracked who wrote',
  },
  {
    href: '/documents/passport-photo-sheet',
    name: 'Passport & ID photo sheet maker',
    terms:
      '2x2 35x45mm 4x6 calculate grid inch india layout paper printing schengen standard us',
    op: 'document none text',
  },
  {
    href: '/documents/pdf-form-field-schema-builder',
    name: 'PDF form field schema builder',
    terms: 'acroform definition filling generate json name programmatic type',
    op: 'document text text',
  },
  {
    href: '/documents/plain-text-file-maker',
    name: 'Plain-text file maker',
    terms: '8 download ending lf line normalize pasted plaintext txt utf utf8',
    op: 'document text text',
  },
  {
    href: '/documents/presentation-outline-builder',
    name: 'Presentation outline builder',
    terms: 'based comprehensive core fact generate structure topic',
    op: 'document text text',
  },
  {
    href: '/documents/presentation-timer-pacer',
    name: 'Presentation timer & pacer',
    terms:
      'calculate count estimated mark pacing slide slidebyslide speaking teleprompter time word',
    op: 'document text text',
  },
  {
    href: '/documents/purchase-order-generator',
    name: 'Purchase-order generator',
    terms: 'buyer calculate draft item purchaseorder supplier',
    op: 'document text text',
  },
  {
    href: '/documents/quotation-generator',
    name: 'Quotation generator',
    terms: 'binding calculate item line non nonbinding supplied term',
    op: 'document text text',
  },
  {
    href: '/documents/readme-generator',
    name: 'README generator',
    terms: 'explicit fact project structured',
    op: 'document text text',
  },
  {
    href: '/documents/resume-builder',
    name: 'Resume builder',
    terms: 'claim concise embellishing generating markdown',
    op: 'document text text',
  },
  {
    href: '/documents/ris-citation-viewer',
    name: 'RIS citation viewer',
    terms: 'group letter local preview readable standard tag two twoletter',
    op: 'document text text',
  },
  {
    href: '/documents/sop-generator',
    name: 'Standard Operating Procedure (SOP) builder',
    terms:
      'checklist generate institutional numbered playbook procedural responsible role scope step verification',
    op: 'document text text',
  },
  {
    href: '/documents/speaker-notes-extractor',
    name: 'Speaker notes extractor',
    terms: 'draft line presentation presenter slide starting title',
    op: 'document text text',
  },
  {
    href: '/documents/transparent-signature-maker',
    name: 'Transparent signature generator',
    terms: 'background clean maker scalable svg template vector',
    op: 'document text text',
  },
  {
    href: '/documents/user-story-acceptance-criteria-builder',
    name: 'Agile user story & BDD acceptance criteria builder',
    terms:
      'checklist definition dod generate gherkin given scenario storie structured',
    op: 'document text text',
  },
  {
    href: '/documents/workbench',
    name: 'Documents & office workbench',
    terms: 'calculate compare download draft inspect merge',
  },
  {
    href: '/documents/workbench?tool=invoice-generator',
    name: 'Invoice generator',
    terms: 'calculate line markdown stated subtotal tax total workbench',
    op: 'document text text',
  },
  {
    href: '/documents/workbench?tool=receipt-generator',
    name: 'Receipt generator',
    terms: 'calculate item line paid summary supplied transaction workbench',
    op: 'document text text',
  },
  {
    href: '/file/archive',
    name: 'ZIP opener and packer',
    terms:
      'archive check damage extract file inside new one online open pack unzip view',
  },
  {
    href: '/file/base64-file-decoder',
    name: 'Base64 file decoder',
    terms: 'downloadable standard strict',
    op: 'file-workbench none files',
  },
  {
    href: '/file/base64-file-encoder',
    name: 'Base64 file encoder',
    terms: 'one padded selected standard',
    op: 'file-workbench file files',
  },
  {
    href: '/file/binary-file-viewer',
    name: 'Binary-file viewer',
    terms: 'binaryfile bit bounded byte display eight eightbit group window',
    op: 'file-workbench file files',
  },
  {
    href: '/file/bulk-file-renamer',
    name: 'Bulk file renamer',
    terms: 'byte copied download filename literal replace selected text',
    op: 'file-workbench files files',
  },
  {
    href: '/file/data-uri-file-extractor',
    name: 'Data-URI file extractor',
    terms: 'base64 datauri decode downloadable strict',
    op: 'file-workbench none files',
  },
  {
    href: '/file/data-uri-file-maker',
    name: 'Data-URI file maker',
    terms:
      '16 base64 copy css datauri encode filled fixture html kept media mib one paste prefix read result script selected straight test type',
    op: 'file-workbench file files',
  },
  {
    href: '/file/directory-tree-generator',
    name: 'Directory-tree generator',
    terms:
      'build directorytree folder folderpicker path picker relative sorted text',
    op: 'file-workbench files files',
  },
  {
    href: '/file/duplicate-file-finder',
    name: 'Duplicate-file finder',
    terms:
      '256 byte digest duplicatefile exact group length selected sha sha256',
    op: 'file-workbench files files',
  },
  {
    href: '/file/empty-file-finder',
    name: 'Empty-file finder',
    terms: 'byte emptyfile exactly length list selected whose zero',
    op: 'file-workbench files files',
  },
  {
    href: '/file/exif-metadata-inspector',
    name: 'Image EXIF & GPS metadata inspector',
    terms:
      'camera coordinate embedded exposure file inside model setting software tag',
    op: 'file-workbench file files',
  },
  {
    href: '/file/exif-metadata-stripper',
    name: 'Image EXIF & metadata scrubber',
    terms:
      'block camera comment coordinate file gps iptc jpeg png remove serial sharing strip thumbnail timestamp xmp',
    op: 'file-workbench file files',
  },
  {
    href: '/file/file-checksum-verifier',
    name: 'File checksum verifier',
    terms: 'calculate compare cryptographic digest expected hexadecimal value',
    op: 'file-workbench file files',
  },
  {
    href: '/file/file-chunk-joiner',
    name: 'File chunk joiner',
    terms: 'byte byteforbyte order picker selected',
    op: 'file-workbench files files',
  },
  {
    href: '/file/file-chunk-splitter',
    name: 'File chunk splitter',
    terms:
      '000 1 back byte byteexact download every exact joined numbered one order original part pick piece read separately set size tab',
    op: 'file-workbench file files',
  },
  {
    href: '/file/file-compressor',
    name: 'Gzip file compressor',
    terms: 'api compres compression format one standard stream',
    op: 'file-workbench file files',
  },
  {
    href: '/file/file-decrypt',
    name: 'AES-GCM file decryptor',
    terms: 'aesgcm back byte decrypt enc original password',
    op: 'file-workbench file files',
  },
  {
    href: '/file/file-encrypt',
    name: 'AES-GCM file encryptor',
    terms:
      '256 256bit aesgcm authenticated bit derivation encrypt locally password pbkdf2',
    op: 'file-workbench file files',
  },
  {
    href: '/file/file-extension-changer',
    name: 'File extension changer',
    terms:
      'byte change converting copie downloaded encode never pick rather re relabel rename untouched whose wrong',
    op: 'file-workbench files files',
  },
  {
    href: '/file/file-list-to-csv',
    name: 'File list to CSV',
    terms: 'api export metadata path selected strict',
    op: 'file-workbench files files',
  },
  {
    href: '/file/file-metadata-viewer',
    name: 'File metadata viewer',
    terms: 'api byte hint list mime modification name path relative size time',
    op: 'file-workbench files files',
  },
  {
    href: '/file/file-signature-inspector',
    name: 'File-signature inspector',
    terms: 'against byte common disclosed filesignature leading set',
    op: 'file-workbench files files',
  },
  {
    href: '/file/file-size-analyzer',
    name: 'File-size analyzer',
    terms: 'byte calculate filesize rank selected total',
    op: 'file-workbench files files',
  },
  {
    href: '/file/filename-case-converter',
    name: 'Filename case converter',
    terms: 'kebab lower snake stem title upper',
    op: 'file-workbench files files',
  },
  {
    href: '/file/filename-cleaner',
    name: 'Filename cleaner',
    terms: 'compact create download extension name preserving safe',
    op: 'file-workbench files files',
  },
  {
    href: '/file/folder-manifest-generator',
    name: 'Folder-manifest generator',
    terms:
      '256 create digest foldermanifest json metadata path relative sha sha256',
    op: 'file-workbench files files',
  },
  {
    href: '/file/hash-calculator',
    name: 'File hash calculator',
    terms:
      '256 384 512 checksum fingerprint locally sha sha256 sha384 sha512 verify',
  },
  {
    href: '/file/hex-patch-generator',
    name: 'Hex-patch generator',
    terms:
      'byte compare equal equallength file hexpatch instruction length list replacement two',
    op: 'file-workbench files files',
  },
  {
    href: '/file/hex-viewer',
    name: 'Hex viewer',
    terms: 'ascii bounded byte display file hexadecimal offset window',
    op: 'file-workbench file files',
  },
  {
    href: '/file/large-file-finder',
    name: 'Large-file finder',
    terms: 'above byte explicit largefile list selected threshold',
    op: 'file-workbench files files',
  },
  {
    href: '/file/magic-byte-inspector',
    name: 'Magic-byte inspector',
    terms: '32 common commonsignature first magicbyte match signature',
    op: 'file-workbench files files',
  },
  {
    href: '/file/mime-type-detector',
    name: 'MIME-type detector',
    terms:
      'browserreported byte common compare extension filename leading leadingbyte mimetype reported signature',
    op: 'file-workbench files files',
  },
  {
    href: '/file/sequential-file-renamer',
    name: 'Sequential file renamer',
    terms: 'create download extension name numbered preserving',
    op: 'file-workbench files files',
  },
  {
    href: '/file/workbench',
    name: 'Private file workbench',
    terms: 'download encode hash inspect join local rename split',
  },
  {
    href: '/finance/50-30-20-budget-calculator',
    name: '50/30/20 budget split',
    terms: 'amount calculate income reference stated',
    op: 'finance-business none text',
  },
  {
    href: '/finance/annuity-calculator',
    name: 'Ordinary-annuity future-value calculator',
    terms:
      'constant end endofperiod equal futurevalue ordinaryannuity payment period project rate',
    op: 'finance-business none text',
  },
  {
    href: '/finance/arr-calculator',
    name: 'ARR calculator',
    terms: '12 annualize monthly multiplying recurring revenue supplied',
    op: 'finance-business none text',
  },
  {
    href: '/finance/break-even-calculator',
    name: 'Break-even calculator',
    terms: 'breakeven contribution cost fixed sale unit',
    op: 'finance-business none text',
  },
  {
    href: '/finance/budget-planner',
    name: 'Budget planner',
    terms: 'category expense income remaining stated total',
    op: 'finance-business text text',
  },
  {
    href: '/finance/burn-rate-calculator',
    name: 'Net burn-rate calculator',
    terms: 'average burnrate cash decline monthly period supplied',
    op: 'finance-business none text',
  },
  {
    href: '/finance/cagr-calculator',
    name: 'CAGR calculator',
    terms: 'annual beginning compound ending growth value year',
    op: 'finance-business none text',
  },
  {
    href: '/finance/churn-rate-calculator',
    name: 'Customer churn-rate calculator',
    terms: 'churnrate divide during lost period start',
    op: 'finance-business none text',
  },
  {
    href: '/finance/commission-calculator',
    name: 'Commission calculator',
    terms: 'eligible multiply percentage sale supplied',
    op: 'finance-business none text',
  },
  {
    href: '/finance/compound-interest-calculator',
    name: 'Compound-interest calculator',
    terms: 'annual compoundinterest explicit frequency growth',
    op: 'finance-business none text',
  },
  {
    href: '/finance/credit-card-payoff-calculator',
    name: 'Credit-card payoff scenario',
    terms:
      'apr calculate constant creditcard fixed fraction monthly payment simulate',
    op: 'finance-business none text',
  },
  {
    href: '/finance/customer-acquisition-cost-calculator',
    name: 'Customer-acquisition cost calculator',
    terms: 'customeracquisition divide new spend supplied',
    op: 'finance-business none text',
  },
  {
    href: '/finance/debt-payoff-calculator',
    name: 'Debt-payoff calculator',
    terms: 'balance debtpayoff fixed interest monthly one payment simulate',
    op: 'finance-business none text',
  },
  {
    href: '/finance/debt-to-income-calculator',
    name: 'Debt-to-income calculator',
    terms: 'debttoincome gros monthly payment percentage stated',
    op: 'finance-business none text',
  },
  {
    href: '/finance/discount-calculator',
    name: 'Discount calculator',
    terms:
      'amount both come enter final left list off original pay percentage price read reduction sale tag',
    op: 'finance-business none text',
  },
  {
    href: '/finance/emergency-fund-calculator',
    name: 'Emergency-fund scenario',
    terms:
      'add calculate emergencyfund essential expense month monthly multiply off one oneoff reserve',
    op: 'finance-business none text',
  },
  {
    href: '/finance/fixed-deposit-calculator',
    name: 'Fixed-deposit scenario',
    terms:
      'calculate compounding explicit fixeddeposit frequency principal project',
    op: 'finance-business none text',
  },
  {
    href: '/finance/freelance-rate-calculator',
    name: 'Freelance-rate scenario',
    terms:
      'billable calculate desired divide estimated expense freelancerate hour income plu',
    op: 'finance-business none text',
  },
  {
    href: '/finance/future-value-calculator',
    name: 'Future-value calculator',
    terms: 'compounding futurevalue lump periodic s sum',
    op: 'finance-business none text',
  },
  {
    href: '/finance/gst-calculator',
    name: 'GST arithmetic calculator',
    terms: 'add amount percentage pre pretax supplied tax user usersupplied',
    op: 'finance-business none text',
  },
  {
    href: '/finance/hourly-to-salary-calculator',
    name: 'Hourly-to-salary calculator',
    terms: 'annualize explicit hour hourlytosalary rate week weekly working',
    op: 'finance-business none text',
  },
  {
    href: '/finance/inflation-calculator',
    name: 'Inflation scenario calculator',
    terms: 'amount constant cost current future project',
    op: 'finance-business none text',
  },
  {
    href: '/finance/inventory-turnover-calculator',
    name: 'Inventory-turnover calculator',
    terms: 'average consistent cost divide good inventoryturnover period sold',
    op: 'finance-business none text',
  },
  {
    href: '/finance/invoice-generator',
    name: 'Printable client bill maker',
    terms:
      'amount crore generate group instruction invoice itemised lakh lay line payment print printready ready rupee tax',
    op: 'finance-business text text',
  },
  {
    href: '/finance/invoice-late-fee-calculator',
    name: 'Invoice late-fee arithmetic',
    terms:
      'calculate latefee month monthly percentage simple supplied user usersupplied',
    op: 'finance-business none text',
  },
  {
    href: '/finance/irr-calculator',
    name: 'Periodic IRR calculator',
    terms: 'approximately discount find npv one rate whose zero',
    op: 'finance-business text text',
  },
  {
    href: '/finance/lifetime-value-calculator',
    name: 'Simplified customer LTV calculator',
    terms:
      'arpu churn estimate fraction gros grossmargin lifetime margin monthly value',
    op: 'finance-business none text',
  },
  {
    href: '/finance/loan-emi-calculator',
    name: 'Loan EMI calculator',
    terms:
      'amortizing equal fixed fixedrate interest monthly payment principal principalandinterest rate',
    op: 'finance-business none text',
  },
  {
    href: '/finance/lumpsum-investment-calculator',
    name: 'Lump-sum growth calculator',
    terms:
      'amount compounding investment lumpsum monthly one onetime project time',
    op: 'finance-business none text',
  },
  {
    href: '/finance/margin-calculator',
    name: 'Margin calculator',
    terms: 'cost gros profit revenue',
    op: 'finance-business none text',
  },
  {
    href: '/finance/markup-calculator',
    name: 'Markup calculator',
    terms: 'add cost gros margin percentage',
    op: 'finance-business none text',
  },
  {
    href: '/finance/mortgage-calculator',
    name: 'Mortgage principal & interest calculator',
    terms: 'fixed monthly total',
    op: 'finance-business none text',
  },
  {
    href: '/finance/mortgage-extra-payment',
    name: 'Mortgage extra payment & savings calculator',
    terms: 'interest monthly principal saved total year',
    op: 'finance-business none text',
  },
  {
    href: '/finance/mrr-calculator',
    name: 'MRR calculator',
    terms: 'acros count customer monthly plan price recurring sum supplied',
    op: 'finance-business text text',
  },
  {
    href: '/finance/net-worth-calculator',
    name: 'Net-worth calculator',
    terms:
      'account amount anywhere asset back difference every itemised liabilitie line list listed name networth no nothing one owe per read sent subtract subtracted tab total two',
    op: 'finance-business text text',
  },
  {
    href: '/finance/npv-calculator',
    name: 'NPV calculator',
    terms: 'cash discount equally flow period spaced zero',
    op: 'finance-business text text',
  },
  {
    href: '/finance/overtime-calculator',
    name: 'Overtime pay calculator',
    terms: 'hour hourly multiplier multiply rate supplied',
    op: 'finance-business none text',
  },
  {
    href: '/finance/payment-fee-calculator',
    name: 'Payment fee & invoice calculator (Stripe / PayPal)',
    terms: 'amount exact fund merchant needed net processing receive reverse',
    op: 'finance-business none text',
  },
  {
    href: '/finance/present-value-calculator',
    name: 'Present-value calculator',
    terms: 'amount compounding discount future one periodic presentvalue',
    op: 'finance-business none text',
  },
  {
    href: '/finance/profit-calculator',
    name: 'Profit calculator',
    terms:
      'both cost enter fixed leave line margin off percentage read reported revenue subtract total undefined variable zero',
    op: 'finance-business none text',
  },
  {
    href: '/finance/receipt-generator',
    name: 'Printable payment receipt maker',
    terms:
      'confirmation detail generate ids itemized official payee payer print printready ready reference',
    op: 'finance-business text text',
  },
  {
    href: '/finance/recurring-deposit-calculator',
    name: 'Recurring-deposit scenario',
    terms:
      'assumed calculate constant end endofmonth fixed month project rate recurringdeposit',
    op: 'finance-business none text',
  },
  {
    href: '/finance/retirement-corpus-calculator',
    name: 'Retirement corpus scenario',
    terms:
      'assumption calculate date duration estimate expense inflation retirementdate return',
    op: 'finance-business none text',
  },
  {
    href: '/finance/roi-calculator',
    name: 'ROI calculator',
    terms:
      'back came cost enter gain money net percentage read relative return simple sold stated worked worth',
    op: 'finance-business none text',
  },
  {
    href: '/finance/runway-calculator',
    name: 'Cash-runway calculator',
    terms: 'available burn cashrunway divide monthly net positive',
    op: 'finance-business none text',
  },
  {
    href: '/finance/saas-mrr-calculator',
    name: 'SaaS MRR growth & churn projection',
    terms:
      '12 calculate expansion factoring month new project recurring revenue trajectory',
    op: 'finance-business none text',
  },
  {
    href: '/finance/salary-hourly-converter',
    name: 'Salary to hourly & take-home converter',
    terms: 'annual bi biweekly daily gros monthly net rate takehome weekly',
    op: 'finance-business none text',
  },
  {
    href: '/finance/sales-tax-calculator',
    name: 'Sales-tax arithmetic calculator',
    terms:
      'add amount percentage pre pretax salestax supplied user usersupplied',
    op: 'finance-business none text',
  },
  {
    href: '/finance/savings-goal-calculator',
    name: 'Savings-goal contribution calculator',
    terms: 'end endofmonth estimate month needed reach savingsgoal target',
    op: 'finance-business none text',
  },
  {
    href: '/finance/simple-interest-calculator',
    name: 'Simple-interest calculator',
    terms:
      'alone amount annual both compounded enter final multiply never plu principal prt rate read shown simpleinterest time total worked year',
    op: 'finance-business none text',
  },
  {
    href: '/finance/sip-calculator',
    name: 'Monthly contribution growth calculator',
    terms:
      'constant end endofmonth equivalent month monthlyequivalent project return sip',
    op: 'finance-business none text',
  },
  {
    href: '/finance/split-bill-calculator',
    name: 'Split-bill calculator',
    terms:
      '000 1 100 add each enter equal equally paying people per percentage person read s share splitbill supplied tip total',
    op: 'finance-business none text',
  },
  {
    href: '/finance/timesheet-calculator',
    name: 'Weekly timesheet & billable overtime calculator',
    terms:
      '1 5x break daily generate hour hourly meal pay print printready ready signed work',
    op: 'finance-business text text',
  },
  {
    href: '/finance/tip-calculator',
    name: 'Tip calculator',
    terms:
      'bill card checked enter hand leave mean percentage plu quickly read slip supplied total type user',
    op: 'finance-business none text',
  },
  {
    href: '/finance/vat-calculator',
    name: 'VAT arithmetic calculator',
    terms: 'add amount percentage pre pretax supplied tax user usersupplied',
    op: 'finance-business none text',
  },
  {
    href: '/finance/workbench',
    name: 'Finance & business workbench',
    terms: 'borrowing budget operating pricing saving scenario transparent',
  },
  {
    href: '/finance/xirr-calculator',
    name: 'Dated XIRR calculator',
    terms: 'annualized cash find flow irregular one rate',
    op: 'finance-business text text',
  },
  {
    href: '/image/background-remover',
    name: 'Remove Image Background',
    terms:
      'clear colour cut itself model net never one photo picture plain run subject u2 u2net uploaded',
  },
  {
    href: '/image/editor',
    name: 'Image editor',
    terms: 'adjust crop flip locally rotate static',
  },
  {
    href: '/image/exact-size',
    name: 'Resize image to exact KB',
    terms:
      '50 change compres dpi fit form limit online photo pixel portal real reduce reducer resizer set signature size upload value',
  },
  {
    href: '/image/heic-to-jpg',
    name: 'HEIC to JPG converter',
    terms:
      'attach folder form heif iphone jpeg open pc phone photo png refuse save tab window',
  },
  {
    href: '/image/heic-to-png',
    name: 'HEIC to PNG',
    terms:
      'compression convert decoded losslessly no photo picture round second uploading written',
  },
  {
    href: '/image/image-brightness',
    name: 'Image brightness',
    terms: 'adjust saving',
  },
  {
    href: '/image/image-contrast',
    name: 'Image contrast',
    terms: 'adjust saving',
  },
  {
    href: '/image/image-cropper',
    name: 'Image cropper',
    terms: 'coordinate crop exact pixel',
  },
  {
    href: '/image/image-flipper',
    name: 'Image flipper',
    terms: 'flip horizontally',
  },
  {
    href: '/image/image-grayscale',
    name: 'Image grayscale',
    terms: 'color convert toward',
  },
  {
    href: '/image/image-rotator',
    name: 'Rotate image',
    terms: '90 degree rotator step',
  },
  {
    href: '/image/metadata',
    name: 'Photo metadata viewer and stripper',
    terms:
      'camera check clean client data date exif find gps hidden location number publishing remove reveal serial sharing',
  },
  {
    href: '/image/optimize',
    name: 'Optimize image',
    terms:
      'compres compress convert locally photo png resize smaller static webp',
  },
  {
    href: '/image/solid-background-remover',
    name: 'Solid background remover',
    terms: 'color image plain plaincolor selected transparent',
  },
  {
    href: '/image/to-text',
    name: 'Image to text',
    terms:
      'character copy english extract ocr optical page photo photographed picture read recognition scanned screenshot selectable several',
  },
  {
    href: '/latex',
    name: 'LaTeX Authoring & Academic Notation Hub',
    terms:
      'bibtex build clean cleaning command convert count csv deduplicate deduplication document equation find format generate generation grade lookup markdown markup math matrice matrix multi multiformat online read reference research researchgrade symbol table texcount tool word',
  },
  {
    href: '/latex/bibtex',
    name: 'BibTeX Workbench',
    terms:
      'bib clean deduplicate doi field file format normalise page range required title validate',
  },
  {
    href: '/latex/equations',
    name: 'LaTeX Matrix & Equation Builder',
    terms: 'bmatrix case generate interactive piecewise pmatrix visual vmatrix',
  },
  {
    href: '/latex/symbols',
    name: 'LaTeX Symbol Finder',
    terms:
      'arrow delimiter directory greek letter operator relation searchable',
  },
  {
    href: '/latex/table-generator',
    name: 'Multi-Format Table Generator',
    terms:
      '8 asciidoc between convert csv html json latex markdown multiformat sql technical tsv',
  },
  {
    href: '/latex/table-reader',
    name: 'LaTeX Table Reader',
    terms: 'booktab clean code csv json markdown parse structured tabular tsv',
  },
  {
    href: '/latex/word-count',
    name: 'LaTeX Word Count',
    terms:
      'accurate body caption document equation header journal prose separate',
  },
  {
    href: '/life-admin/aadhaar-masking-tool',
    name: 'Aadhaar masking tool',
    terms: 'digit eight first four hide last number one retain',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/aadhaar-pan-masker',
    name: 'Aadhaar and PAN masker',
    terms:
      'csv document every file find hide identity log masked masking number pasted redact sharing text',
  },
  {
    href: '/life-admin/bank-account-masking-tool',
    name: 'Bank account masking tool',
    terms: 'character four hide last reference',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/birth-number-calculator',
    name: 'Birth number calculator',
    terms: 'date day digit reduction',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/cheque-amount-writer',
    name: 'Cheque amount writer',
    terms:
      'around copy create crore english enter figure grouped indian lakh line million paise rather rupee spelled tab type word wrapped',
    op: 'life-admin none text',
  },
  {
    href: '/life-admin/document-expiry-tracker',
    name: 'Document expiry tracker',
    terms: 'calculate date day expire supplied until',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/electricity-bill-unit-calculator',
    name: 'Electricity unit calculator',
    terms: 'bill cost meter optional supplied user usersupplied',
    op: 'life-admin none text',
  },
  {
    href: '/life-admin/emi-due-date-planner',
    name: 'EMI due-date planner',
    terms:
      '31st 600 amount back count csv day duedate every fall first instalment last list month monthly number one read shorter',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/fuel-cost-calculator',
    name: 'Fuel cost calculator',
    terms: 'distance estimate mileage needed',
    op: 'life-admin none text',
  },
  {
    href: '/life-admin/house-rent-split-calculator',
    name: 'House rent split calculator',
    terms: 'acros charge evenly occupant shared',
    op: 'life-admin none text',
  },
  {
    href: '/life-admin/ifsc-format-checker',
    name: 'IFSC format checker',
    terms: '11 11character character documented rbi rbidocumented structure',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/indian-address-formatter',
    name: 'Indian address formatter',
    terms: 'clean comma commaseparated line part place separated spacing',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/indian-currency-number-to-words',
    name: 'Indian currency number to words',
    terms: 'crore group lakh rupee thousand write',
    op: 'life-admin none text',
  },
  {
    href: '/life-admin/indian-phone-number-formatter',
    name: 'Indian phone number formatter',
    terms:
      '6 9 91 accepted back beginning bracket contact digit form international leading mobile normalize paste ready space spaced ten way written xxxxx zero',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/life-path-number-calculator',
    name: 'Life path number calculator',
    terms: 'birth date digit reduction',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/lpg-consumption-calculator',
    name: 'LPG consumption calculator',
    terms: 'daily day estimate measured remaining weight',
    op: 'life-admin none text',
  },
  {
    href: '/life-admin/micr-format-checker',
    name: 'MICR format checker',
    terms: 'contain digit exactly nine value whether',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/mileage-calculator',
    name: 'Mileage calculator',
    terms: 'distance fuel kilometre litre per used',
    op: 'life-admin none text',
  },
  {
    href: '/life-admin/notice-period-calculator',
    name: 'Notice period calculator',
    terms:
      '3 650 add arithmetic calendar counted date day end given holiday last length plain read served supplied weekend working',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/pan-masking-tool',
    name: 'PAN masking tool',
    terms: 'character first hide one six ten tencharacter value',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/personal-year-number-calculator',
    name: 'Personal year number calculator',
    terms: 'birth chosen date digit reduction',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/pin-code-format-checker',
    name: 'PIN code format checker',
    terms:
      'against digit exist first form has indian non nonzero paste postal reject shape six sixdigit space stripped test whether zero',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/road-trip-cost-calculator',
    name: 'Road trip cost calculator',
    terms: 'combine estimate food fuel stay toll',
    op: 'life-admin none text',
  },
  {
    href: '/life-admin/school-fee-planner',
    name: 'School fee planner',
    terms: 'equal instalment scheduled split supplied total',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/upi-id-format-checker',
    name: 'UPI ID format checker',
    terms: '45 45character character conservative handle limit syntax user',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/warranty-expiry-tracker',
    name: 'Warranty expiry tracker',
    terms: 'date end estimate month purchase',
    op: 'life-admin text text',
  },
  {
    href: '/life-admin/wedding-budget-planner',
    name: 'Wedding budget planner',
    terms: 'category compare estimate major supplied total',
    op: 'life-admin none text',
  },
  {
    href: '/life-admin/workbench',
    name: 'India & life-admin workbench',
    terms:
      'check cost date estimate format household identifier lifeadmin mask plan',
  },
  {
    href: '/math/angle-converter',
    name: 'Angle converter',
    terms:
      'between cad code converted degree drawing enter exact expect factor figure gradian pick radian rather read shown trigonometry two unit',
    op: 'math none text',
  },
  {
    href: '/math/area-converter',
    name: 'Area converter',
    terms:
      'acre between centimetre common feet floor hectare imperial inche kilometre land metre metric mile millimetre one plu square through tool',
    op: 'math none text',
  },
  {
    href: '/math/average-calculator',
    name: 'Average calculator',
    terms:
      'arithmetic between came comma count divided entered line list mean new number paste read semicolon separated space total typed value work',
    op: 'math text text',
  },
  {
    href: '/math/basic-calculator',
    name: 'Basic calculator',
    terms: 'arithmetic evaluate parenthese power',
    op: 'math text text',
  },
  {
    href: '/math/circle-calculator',
    name: 'Circle calculator',
    terms: 'area circumference diameter radiu',
    op: 'math none text',
  },
  {
    href: '/math/coin-flipper',
    name: 'Coin flipper',
    terms:
      '100 along came count each even every fair flip head independent listed odd once one read result set tail tos virtual',
    op: 'math none text',
  },
  {
    href: '/math/combination-calculator',
    name: 'Combination calculator',
    terms:
      'allow both cannot choose enter item larger matter n ncr number order r read selection way whole work',
    op: 'math none text',
  },
  {
    href: '/math/complex-number-calculator',
    name: 'Complex-number calculator',
    terms: 'add bi complexnumber coordinate divide multiply pair subtract',
    op: 'math none text',
  },
  {
    href: '/math/confidence-interval-calculator',
    name: 'Confidence-interval calculator',
    terms:
      'approximation confidenceinterval deviation mean n normal normalapproximation z',
    op: 'math none text',
  },
  {
    href: '/math/cooking-unit-converter',
    name: 'Cooking-unit converter',
    terms: 'assuming cookingunit density ingredient measure volume volumeonly',
    op: 'math none text',
  },
  {
    href: '/math/correlation-calculator',
    name: 'Correlation calculator',
    terms: 'equal equallength length list pearson two',
    op: 'math text text',
  },
  {
    href: '/math/data-size-converter',
    name: 'Data-size converter',
    terms:
      '000 024 1 against between binary byte confused datasize decimal file gibibyte gigabyte kibibyte kilobyte mebibyte megabyte never power ten two unit',
    op: 'math none text',
  },
  {
    href: '/math/determinant-calculator',
    name: 'Determinant calculator',
    terms: '6 matrix square',
    op: 'math text text',
  },
  {
    href: '/math/dice-roller',
    name: 'Dice roller',
    terms:
      '000 1 100 added along both d100 d20 each every face individual listed one read roll rolled set side total two work',
    op: 'math none text',
  },
  {
    href: '/math/distance-converter',
    name: 'Distance converter',
    terms:
      'between centimetre dimension drawing feet imperial inche kilometre leg length metre metric mile millimetre nautical one tool travel yard',
    op: 'math none text',
  },
  {
    href: '/math/energy-converter',
    name: 'Energy converter',
    terms:
      'answer between bill btu calorie enter exact factor figure food heating hour joule kilocalorie kilojoule kilowatt kilowatthour label pick read shown two unit watt watthour',
    op: 'math none text',
  },
  {
    href: '/math/exponent-calculator',
    name: 'Exponent calculator',
    terms:
      '0 2 5 8 9 base both boxe enter finite fractional included including negative number power raise raised read result such',
    op: 'math none text',
  },
  {
    href: '/math/force-converter',
    name: 'Force converter',
    terms:
      'answer between common converted dyne exact factor homework kilogram kilogramforce kilonewton load newton physic pound poundforce rating spring unit value',
    op: 'math none text',
  },
  {
    href: '/math/fraction-calculator',
    name: 'Fraction calculator',
    terms:
      'add answer back come denominator divide enter lowest multiply number numerator read reduced subtract term two whole wholenumber written',
    op: 'math none text',
  },
  {
    href: '/math/frequency-converter',
    name: 'Frequency converter',
    terms:
      'band between clock common converted exact factor gigahertz hertz kilohertz megahertz minute motor per plu radio rating revolution scale speed',
    op: 'math none text',
  },
  {
    href: '/math/fuel-economy-converter',
    name: 'Fuel-economy converter',
    terms:
      '100 answer between differ enter figure fueleconomy gallon handled imperial km l litre mpg per pick read reciprocal relationship same size two unit us',
    op: 'math none text',
  },
  {
    href: '/math/gcd-calculator',
    name: 'GCD calculator',
    terms:
      '18 48 6 both common divide divisor each enter exactly find greatest ignored integer largest number read same sign two value whole',
    op: 'math none text',
  },
  {
    href: '/math/geometry-calculator',
    name: 'Geometry calculator',
    terms: '2d area perimeter selected shape',
    op: 'math none text',
  },
  {
    href: '/math/lcm-calculator',
    name: 'LCM calculator',
    terms:
      'adding both common denominator different divide each enter exactly find fraction integer multiple number read smallest two useful value whole',
    op: 'math none text',
  },
  {
    href: '/math/linear-equation-solver',
    name: 'Linear-equation solver',
    terms:
      '0 ax b cannot coefficient enter has linearequation no read satisfie since single solve tab term two value worked x zero',
    op: 'math none text',
  },
  {
    href: '/math/linear-regression-calculator',
    name: 'Linear-regression calculator',
    terms: 'fit intercept leastsquare line linearregression slope square x y',
    op: 'math text text',
  },
  {
    href: '/math/logarithm-calculator',
    name: 'Logarithm calculator',
    terms:
      '1 10 2 above b base e enter equal exponent log must name number order positive raised reach read whether work x zero',
    op: 'math none text',
  },
  {
    href: '/math/margin-of-error-calculator',
    name: 'Margin-of-error calculator',
    terms: 'deviation explicit marginoferror n sample score z',
    op: 'math none text',
  },
  {
    href: '/math/mass-converter',
    name: 'Mass converter',
    terms:
      'against amount between body exact factor gram imperial kilogram metric milligram ounce parcel pound recipe stone tab tonne unit weight',
    op: 'math none text',
  },
  {
    href: '/math/matrix-calculator',
    name: 'Matrix calculator',
    terms: 'add bounded matrice multiply numeric subtract',
    op: 'math text text',
  },
  {
    href: '/math/median-calculator',
    name: 'Median calculator',
    terms:
      'averaged central count even find first length list mean middle number order paste sorted two value',
    op: 'math text text',
  },
  {
    href: '/math/mode-calculator',
    name: 'Mode calculator',
    terms:
      'both comma count every find first found frequent highest list listed number one paste read separated space tie tied top two twoway value way',
    op: 'math text text',
  },
  {
    href: '/math/number-to-words',
    name: 'Number to words',
    terms: '999 english safe spell whole',
    op: 'math none text',
  },
  {
    href: '/math/percentage-calculator',
    name: 'Percentage calculator',
    terms: 'change find percent ratio',
  },
  {
    href: '/math/percentile-calculator',
    name: 'Percentile calculator',
    terms: 'finite interpolate list number requested',
    op: 'math text text',
  },
  {
    href: '/math/permutation-calculator',
    name: 'Permutation calculator',
    terms:
      'allow arrange arrangement both cannot chosen enter item larger matter must n npr number order ordered r read way whole work',
    op: 'math none text',
  },
  {
    href: '/math/polygon-calculator',
    name: 'Regular-polygon calculator',
    terms: 'area count length perimeter regularpolygon side',
    op: 'math none text',
  },
  {
    href: '/math/power-converter',
    name: 'Power converter',
    terms:
      'against appliance between btu common converted each engine exact factor heating horsepower hour kilowatt mechanical megawatt output per rating shown unit watt',
    op: 'math none text',
  },
  {
    href: '/math/pressure-converter',
    name: 'Pressure converter',
    terms: 'common engineering pascal unit',
    op: 'math none text',
  },
  {
    href: '/math/prime-factorization',
    name: 'Prime factorization',
    terms: 'factor integer one positive safe trillion',
    op: 'math none text',
  },
  {
    href: '/math/prime-number-checker',
    name: 'Prime-number checker',
    terms:
      '2 division divisor enter factor found integer list no odd one positive primality primenumber read report safe smallest trial trillion whether whole',
    op: 'math none text',
  },
  {
    href: '/math/probability-calculator',
    name: 'Probability calculator',
    terms: 'divided favorable outcome total',
    op: 'math none text',
  },
  {
    href: '/math/proportion-calculator',
    name: 'Proportion calculator',
    terms:
      'b c distance down enter fourth know map missing mixing number ratio read recipe scaling solve tab term three useful value worked x',
    op: 'math none text',
  },
  {
    href: '/math/quadratic-equation-solver',
    name: 'Quadratic-equation solver',
    terms:
      '0 ax2 bi both bx c coefficient complex decide discriminant enter form given including negative pair quadraticequation read real root solve three whether',
    op: 'math none text',
  },
  {
    href: '/math/random-number-generator',
    name: 'Random-number generator',
    terms:
      '100 between both bound draw end high included inclusive integer low maximum minimum possible provide randomnes randomnumber range result set whole',
    op: 'math none text',
  },
  {
    href: '/math/ratio-calculator',
    name: 'Ratio calculator',
    terms:
      '12 18 2 3 aspect down drawing enter handy integer lowest mean mixe number read reduce same scale simplest simplifying such term two whole worked',
    op: 'math none text',
  },
  {
    href: '/math/rectangle-calculator',
    name: 'Rectangle calculator',
    terms:
      'above area both corner cornertocorner diagonal enter height length must once perimeter read result tab three unit used width work worked zero',
    op: 'math none text',
  },
  {
    href: '/math/roman-numeral-converter',
    name: 'Roman-numeral converter',
    terms: '1 3999 canonical integer parse romannumeral',
    op: 'math text text',
  },
  {
    href: '/math/root-calculator',
    name: 'Root calculator',
    terms: 'nth number real realnumber validation',
    op: 'math none text',
  },
  {
    href: '/math/rounding-calculator',
    name: 'Rounding calculator',
    terms: 'chosen decimal finite number place round',
    op: 'math none text',
  },
  {
    href: '/math/sample-size-calculator',
    name: 'Sample-size calculator',
    terms:
      '1 correction e2 estimate finite finitepopulation p population proportion samplesize z2p',
    op: 'math none text',
  },
  {
    href: '/math/scientific-calculator',
    name: 'Scientific calculator',
    terms: 'apply common degree explicit function radian',
    op: 'math none text',
  },
  {
    href: '/math/scientific-notation-converter',
    name: 'Scientific-notation converter',
    terms: 'finite normalized number scientificnotation',
    op: 'math none text',
  },
  {
    href: '/math/sequence-generator',
    name: 'Sequence generator',
    terms:
      '000 1 arithmetic between copy count decimal down first list negative read run set starting step term value whole',
    op: 'math none text',
  },
  {
    href: '/math/significant-figures-calculator',
    name: 'Significant-figures calculator',
    terms: '1 100 finite non nonzero number round significantfigure zero',
    op: 'math none text',
  },
  {
    href: '/math/speed-converter',
    name: 'Speed converter',
    terms:
      'between exact factor feet figure hour kilometre knot metre mile one per running second standard tool travel unit wind',
    op: 'math none text',
  },
  {
    href: '/math/standard-deviation-calculator',
    name: 'Standard-deviation calculator',
    terms:
      '1 data divide divided list minu n number one paste population rather read root same spread square squared standarddeviation unit variance work',
    op: 'math text text',
  },
  {
    href: '/math/surface-area-calculator',
    name: 'Surface-area calculator',
    terms: 'closed common solid surfacearea total',
    op: 'math none text',
  },
  {
    href: '/math/system-of-equations-solver',
    name: 'System-of-equations solver',
    terms: '2 a1x a2x b1y b2y c1 c2 linear solve systemofequation',
    op: 'math none text',
  },
  {
    href: '/math/temperature-converter',
    name: 'Temperature converter',
    terms:
      'absolute applied below between celsiu converted each enter fahrenheit figure kelvin negative offset pick rather reading rejected scale two value zero',
    op: 'math none text',
  },
  {
    href: '/math/time-unit-converter',
    name: 'Time-unit converter',
    terms:
      'against between converted day duration each elapsed exact factor given hour millisecond minute run second span tab timeout timeunit week wrong',
    op: 'math none text',
  },
  {
    href: '/math/torque-converter',
    name: 'Torque converter',
    terms:
      'between centimetre common exact factor feet force inche kilogram kilogramforce metre newton newtoncentimetre newtonmetre pound poundforce spec tightening unit',
    op: 'math none text',
  },
  {
    href: '/math/triangle-calculator',
    name: 'Triangle calculator',
    terms: 'area base height perpendicular',
    op: 'math none text',
  },
  {
    href: '/math/variance-calculator',
    name: 'Variance calculator',
    terms:
      '1 averaged distance divided each every list mean minu n number one paste population rather read s set squared value whole work',
    op: 'math text text',
  },
  {
    href: '/math/volume-calculator',
    name: 'Volume calculator',
    terms: 'common dimension explicit solid',
    op: 'math none text',
  },
  {
    href: '/math/volume-converter',
    name: 'Volume converter',
    terms:
      'between centimetre common cubic cup drink feet fluid gallon imperial liquid litre metre metric millilitre ounce pint quart tab tank us',
    op: 'math none text',
  },
  {
    href: '/math/words-to-number',
    name: 'Words to number',
    terms: 'billion english parse supported whole wholenumber',
    op: 'math text text',
  },
  {
    href: '/math/workbench',
    name: 'Math & unit workbench',
    terms: 'arithmetic conversion geometry number statistic theory',
  },
  {
    href: '/math/z-score-calculator',
    name: 'Z-score calculator',
    terms: 'deviation mean population standard value zscore',
    op: 'math none text',
  },
  {
    href: '/pdf/bates',
    name: 'Bates numbering for PDFs',
    terms:
      'acros add bundle continue continuing count document every exhibit file filing legal next number one page prefix sequence sequential several stamp stamping',
  },
  {
    href: '/pdf/burst',
    name: 'Burst PDF by Rule and Dynamic Naming',
    terms:
      'autosplit batch blank bookmark bulk document dynamically file individual inside invoice match name number output page pattern regex separated split statement text',
  },
  {
    href: '/pdf/compare',
    name: 'Compare PDF Documents Online',
    terms:
      'acros between change clause comparison contract deleted deletion detect diff draft file find formatting generate inserted insertion legal moved page redline reflow reflowed resilience stream text two version whole wholedocument word',
  },
  {
    href: '/pdf/compress',
    name: 'Compress PDF',
    terms:
      'attachment below compactly document email encode inside limit metadata optimize photo re reduce reencode rewrite shrink size smaller strip uploading',
  },
  {
    href: '/pdf/delete-pdf-pages',
    name: 'Delete PDF pages',
    terms: 'local new omit selected',
  },
  {
    href: '/pdf/drawing-register',
    name: 'PDF Drawing Register from Title Blocks',
    terms:
      'architectural author bluebeam cad create csv date extract index list multipage number revision set sheet split spreadsheet',
  },
  {
    href: '/pdf/excel-to-pdf',
    name: 'Convert Excel to PDF',
    terms:
      'document financial formatted gridline header multi multisheet payroll printable server sheet spreadsheet support upload vector xlsx',
  },
  {
    href: '/pdf/extract-pages',
    name: 'Extract PDF pages',
    terms: 'choose keep new range save select selected split',
  },
  {
    href: '/pdf/images-to-pdf',
    name: 'Images to PDF',
    terms:
      'arrange combine convert file generated jpeg jpg locally one photo png',
  },
  {
    href: '/pdf/merge',
    name: 'Merge PDF',
    terms: 'choose combine document file join order together two',
  },
  {
    href: '/pdf/metadata',
    name: 'PDF metadata viewer and remover',
    terms:
      'author authoring check clear date document held inside name packet program propertie reveal sending strip who wrote xmp',
  },
  {
    href: '/pdf/ocr',
    name: 'OCR PDF',
    terms:
      'add character copy document download english extract image invisible layer optical page photographed preserving recognition scan scanned searchable text visible',
  },
  {
    href: '/pdf/page-tools',
    name: 'PDF page tools',
    terms: 'label number remove reorder rotate watermark',
  },
  {
    href: '/pdf/pdf-metadata-editor',
    name: 'PDF metadata editor',
    terms: 'author keyword set subject title',
  },
  {
    href: '/pdf/pdf-page-numbers',
    name: 'PDF page numbers',
    terms: 'add centered every output',
  },
  {
    href: '/pdf/pdf-watermark',
    name: 'PDF watermark',
    terms: 'acros every page place text',
  },
  {
    href: '/pdf/preflight',
    name: 'PDF Print Preflight Checker',
    terms:
      '3mm alignment alternative bleed box commercial embedded embedding find font if image inspect low margin pitstop ppi pres resolution sending trim trimbox verify',
  },
  {
    href: '/pdf/redact',
    name: 'Redact & Black Out PDF',
    terms:
      'annotation boxe card confidential draw email metadata number page permanently pii private purge rasterise rectangle redacted redaction removal remove sensitive text',
  },
  {
    href: '/pdf/reorder-pdf-pages',
    name: 'Reorder PDF pages',
    terms: 'new order requested save',
  },
  {
    href: '/pdf/rotate-pdf',
    name: 'Rotate PDF',
    terms: 'every page quarter',
  },
  {
    href: '/pdf/sign',
    name: 'Sign and fill PDF',
    terms:
      'add complete document draw esign final form handwritten page signature uploading',
  },
  {
    href: '/pdf/to-excel',
    name: 'PDF to Excel',
    terms:
      'balance bank clean client column convert csv data detection extract reconcile reconciliation running server spreadsheet statement table upload uploading xlsx zero',
  },
  {
    href: '/pdf/to-word',
    name: 'PDF to Word',
    terms:
      'acros block carried contract convert copy document docx editable extract image layout pull selection table text uploading',
  },
  {
    href: '/productivity/checklist-maker',
    name: 'Checklist maker',
    terms: 'downloadable list markdown normalize',
    op: 'productivity text text',
  },
  {
    href: '/productivity/daily-planner',
    name: 'Daily planner',
    terms: 'block duration lay sequential starting task time',
    op: 'productivity text text',
  },
  {
    href: '/productivity/decision-matrix',
    name: 'Decision matrix',
    terms: 'criterion each option rank score sum unweighted',
    op: 'productivity text text',
  },
  {
    href: '/productivity/eisenhower-matrix',
    name: 'Eisenhower matrix',
    terms: 'delegate eliminate group quadrant schedule task',
    op: 'productivity text text',
  },
  {
    href: '/productivity/goal-breakdown-tool',
    name: 'Goal-breakdown tool',
    terms: 'execution goalbreakdown milestone numbered ordered outline',
    op: 'productivity text text',
  },
  {
    href: '/productivity/grocery-list-generator',
    name: 'Grocery-list generator',
    terms: 'aisle checklist compact entrie grocerylist group item markdown',
    op: 'productivity text text',
  },
  {
    href: '/productivity/habit-streak-calculator',
    name: 'Habit-streak calculator',
    terms: 'asof completion current daily date explicit habitstreak longest',
    op: 'productivity text text',
  },
  {
    href: '/productivity/monthly-planner',
    name: 'Monthly planner',
    terms: 'dated item month selected sort validate within',
    op: 'productivity text text',
  },
  {
    href: '/productivity/name-picker',
    name: 'Name picker',
    terms: 'list local one pick randomnes',
    op: 'productivity text text',
  },
  {
    href: '/productivity/packing-list-generator',
    name: 'Packing-list generator',
    terms: 'category checklist compact entrie group item markdown packinglist',
    op: 'productivity text text',
  },
  {
    href: '/productivity/random-picker',
    name: 'Random picker',
    terms: 'bounded item number pick replacement unique',
    op: 'productivity text text',
  },
  {
    href: '/productivity/seating-chart-maker',
    name: 'Seating-chart maker',
    terms: 'bounded column grid name row rowbycolumn seatingchart shuffle',
    op: 'productivity text text',
  },
  {
    href: '/productivity/study-schedule-maker',
    name: 'Study-schedule maker',
    terms:
      'acros allocate daily day hour limit sequentially studyschedule topic',
    op: 'productivity text text',
  },
  {
    href: '/productivity/task-prioritization-matrix',
    name: 'Task-prioritization matrix',
    terms:
      'confidence effort explicit impact rank score taskprioritization urgency',
    op: 'productivity text text',
  },
  {
    href: '/productivity/team-generator',
    name: 'Team generator',
    terms: 'acros balanced distribute name shuffle',
    op: 'productivity text text',
  },
  {
    href: '/productivity/tournament-bracket-maker',
    name: 'Tournament-bracket maker',
    terms:
      'bye elimination entrant first round seed single singleelimination tournamentbracket transparent',
    op: 'productivity text text',
  },
  {
    href: '/productivity/weekly-planner',
    name: 'Weekly planner',
    terms:
      'against back belong copy day dropped first group grouped item line monday nothing one order paste per pipe read ready separated sorted sunday task through week weekday',
    op: 'productivity text text',
  },
  {
    href: '/productivity/weighted-scoring-matrix',
    name: 'Weighted-scoring matrix',
    terms:
      'comma commaseparated criterion explicit option rank score separated weight weightedscoring',
    op: 'productivity text text',
  },
  {
    href: '/productivity/workbench',
    name: 'Planning & productivity workbench',
    terms: 'compare group locally pick plan prioritize schedule',
  },
  {
    href: '/qr/app-store-qr-code',
    name: 'App Store QR code',
    terms:
      'addres checked download encode insert itself link listing official packaging page paste poster scanned shape slide supplied svg symbol url',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/bitcoin-qr-code',
    name: 'Bitcoin QR code',
    terms:
      'addres amount app bip21 build checked create download enter label message optional payment read real shape shapechecked shaped symbol uri verified wallet',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/calendar-event-qr-code',
    name: 'Calendar event QR code',
    terms: 'create icalendar payload timestamp utc',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/code-39-generator',
    name: 'Code 39 generator',
    terms: 'character draw set standard text uppercase',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/crypto-payment-qr-code',
    name: 'Crypto payment QR code',
    terms: 'bitcoin create direct ethereum solana usdt wallet',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/ean-13-generator',
    name: 'EAN-13 generator',
    terms: 'add bar check digit draw ean13 gtin gtin13 validate',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/ean-8-generator',
    name: 'EAN-8 generator',
    terms: 'add bar check digit draw ean8 gtin gtin8 validate',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/email-qr-code',
    name: 'Email QR code',
    terms: 'body draft encode mailto recipient subject',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/itf-14-generator',
    name: 'ITF-14 generator',
    terms:
      '2 5 add bar check digit draw gtin gtin14 interleaved itf14 validate',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/location-qr-code',
    name: 'Location QR code',
    terms:
      'app both checked coordinate download drawn encode enter geo label latitude longitude map open optional phone place point range rangechecked svg symbol uri whichever',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/mecard-qr-code',
    name: 'MeCard QR code',
    terms:
      'addres addressbook book compact contact create fast mobile scanning ultra ultracompact',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/multi-link-qr-code',
    name: 'Multi-link QR code',
    terms:
      'contained encode html list multilink offline self selfcontained tiny',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/phone-qr-code',
    name: 'Phone QR code',
    terms:
      'anyone asking bracket country countrycode create dashe dialler download encode enter instead kept leading number open plu scan scanning space stripped symbol tel type uri',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/qr-code-batch-generator',
    name: 'QR code batch generator',
    terms:
      '12 choose column correction cut destination download error errorcorrection grid laid level line one paste payload per print ready sharing sheet single svg symbol three threecolumn',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/qr-code-contact-sheet',
    name: 'QR code contact sheet',
    terms: '12 create grid labelled printable symbol',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/qr-code-error-correction-tester',
    name: 'QR error-correction tester',
    terms: 'code compare errorcorrection h l m payload q same symbol',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/qr-code-frame-generator',
    name: 'Framed QR card generator',
    terms: 'badge border code cta custom frame print printready ready vector',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/qr-code-generator',
    name: 'QR code generator',
    terms: 'content create downloadable supplied svg symbol',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/qr-code-logo-embedder',
    name: 'QR code logo embedder',
    terms: 'correction embed high highcorrection image jpeg local png svg webp',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/qr-code-svg-export',
    name: 'QR code SVG export',
    terms: 'chosen color create scalable symbol vector',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/sms-qr-code',
    name: 'SMS QR code',
    terms:
      'already app body draft encode filled message messaging new number open phone ready recipient scan scanning send symbol text uri',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/social-media-qr-code',
    name: 'Social media QR code',
    terms:
      'create direct facebook github instagram link linkedin profile x youtube',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/text-qr-code',
    name: 'Text QR code',
    terms: 'encode plain redirect service unicode',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/upc-a-generator',
    name: 'UPC-A generator',
    terms: '12 add bar check digit draw gtin gtin12 upca validate',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/upi-qr-code',
    name: 'UPI QR code',
    terms: 'create deep deeplink link payload payment supplied value',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/url-qr-code',
    name: 'URL QR code',
    terms:
      'addres check checked choose complete correction destination download downloadable drawn encode error errorcorrection http level link must paste preview svg symbol validated width',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/vcard-qr-code',
    name: 'vCard QR code',
    terms:
      '0 3 add addres build camera carrying checked compact contact create download email fill name offer organisation organization payload phone save scan shape symbol',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/wi-fi-qr-code',
    name: 'Wi-Fi QR code',
    terms: 'configuration create network payload supplied wifi',
    op: 'qr-barcode text text',
  },
  {
    href: '/qr/workbench',
    name: 'QR & barcode workbench',
    terms: 'common create linear locally payload printable sheet',
  },
  {
    href: '/schema',
    name: 'Schema Architecture & Data Modeling Hub',
    terms:
      'compile conversion convert database dbml ddl diagram dialect dictionary diff diffing django er erd erdiagram generate markdown mermaid migration model mysql orm plantuml postgresql prisma sql sqlalchemy sqlite',
  },
  {
    href: '/schema/data-dictionary',
    name: 'Automated Data Dictionary Generator',
    terms:
      'clean column compile ddl dictionarie documentation documentationready key markdown ready sql table',
  },
  {
    href: '/schema/dialect-converter',
    name: 'SQL Dialect Converter',
    terms:
      'between database ddl mysql postgresql server sqlite syntax translate',
  },
  {
    href: '/schema/erd',
    name: 'SQL to ER Diagram',
    terms:
      'dbml ddl entity entityrelationship erd erdiagram generate interactive mermaid notation plantuml relationship',
  },
  {
    href: '/schema/erd-to-sql',
    name: 'Mermaid ERD to SQL DDL Generator',
    terms:
      'convert create directly erdiagram executable model mysql postgresql sqlite table text',
  },
  {
    href: '/schema/orm-models',
    name: 'SQL DDL to ORM Models',
    terms:
      'classe declarative definition django generate prisma py schema sqlalchemy',
  },
  {
    href: '/schema/schema-diff',
    name: 'SQL Schema Diff & Migration Generator',
    terms: 'compare database ddl forward script two',
  },
  {
    href: '/science/apa-citation-formatter',
    name: 'APA citation formatter',
    terms: 'apalike basic fact pattern supplied',
    op: 'science-education text text',
  },
  {
    href: '/science/astronomy-unit-converter',
    name: 'Astronomy-unit converter',
    terms:
      'astronomyunit au constant fixed kilometre light lightyear parsec year',
    op: 'science-education none text',
  },
  {
    href: '/science/attendance-percentage-calculator',
    name: 'Attendance-percentage calculator',
    terms: 'attendancepercentage current needed reach session target',
    op: 'science-education none text',
  },
  {
    href: '/science/battery-runtime-calculator',
    name: 'Battery-runtime calculator',
    terms:
      'batteryruntime capacity current efficiency estimate ideal load usable',
    op: 'science-education none text',
  },
  {
    href: '/science/bibtex-generator',
    name: 'BibTeX generator',
    terms: 'article entry escaped fact one supplied',
    op: 'science-education text text',
  },
  {
    href: '/science/bmi-calculator',
    name: 'BMI calculator',
    terms: 'body height index mas ponderal weight',
    op: 'science-education none text',
  },
  {
    href: '/science/bmr-calculator',
    name: 'BMR calculator',
    terms:
      'basal benedict formula harri harrisbenedict jeor metabolic mifflin mifflinst rate revised st',
    op: 'science-education none text',
  },
  {
    href: '/science/buoyancy-calculator',
    name: 'Buoyancy calculator',
    terms:
      '80665 9 archimedean buoyant changed density displaced enter fluid force gravity ideal m multiply newton read s2 start upward volume ρvg',
    op: 'science-education none text',
  },
  {
    href: '/science/capacitor-code-calculator',
    name: 'Capacitor-code calculator',
    terms:
      'capacitance capacitorcode decode digit eia nf pf three threedigit μf',
    op: 'science-education text text',
  },
  {
    href: '/science/cgpa-calculator',
    name: 'CGPA calculator',
    terms: 'credit cumulative gpa period',
    op: 'science-education text text',
  },
  {
    href: '/science/chicago-citation-formatter',
    name: 'Chicago citation formatter',
    terms: 'basic chicagolike fact pattern supplied',
    op: 'science-education text text',
  },
  {
    href: '/science/citation-generator',
    name: 'Citation generator',
    terms: 'basic fact format selected style supplied',
    op: 'science-education text text',
  },
  {
    href: '/science/coulomb-s-law-calculator',
    name: 'Coulomb’s-law calculator',
    terms: 'between charge coulombslaw electrostatic force magnitude point two',
    op: 'science-education none text',
  },
  {
    href: '/science/decibel-converter',
    name: 'Decibel/intensity converter',
    terms: 'back db level reference sound spl',
    op: 'science-education none text',
  },
  {
    href: '/science/density-calculator',
    name: 'Density calculator',
    terms:
      'above cubic divide empty enter has kg kilogram m3 mas metre per read rejected volume zero',
    op: 'science-education none text',
  },
  {
    href: '/science/doppler-effect-calculator',
    name: 'Doppler-effect calculator',
    terms:
      'classical collinear dopplereffect frequency motion observed observer source',
    op: 'science-education none text',
  },
  {
    href: '/science/electric-power-calculator',
    name: 'Electric-power calculator',
    terms: 'conductance current dc electricpower resistance voltage',
    op: 'science-education none text',
  },
  {
    href: '/science/exam-score-calculator',
    name: 'Exam-score calculator',
    terms: 'blank correct examscore mark penalty wrong',
    op: 'science-education none text',
  },
  {
    href: '/science/flashcard-maker',
    name: 'Flashcard maker',
    terms: 'back convert front line markdown numbered',
    op: 'science-education text text',
  },
  {
    href: '/science/free-fall-calculator',
    name: 'Free-fall calculator',
    terms: 'freefall ideal impact rest speed time',
    op: 'science-education none text',
  },
  {
    href: '/science/function-table-generator',
    name: 'Quadratic function-table generator',
    terms: 'ax2 bounded bx c f functiontable range x',
    op: 'science-education none text',
  },
  {
    href: '/science/gpa-calculator',
    name: 'Credit-weighted GPA calculator',
    terms: 'course creditweighted grade point supplied',
    op: 'science-education text text',
  },
  {
    href: '/science/grade-calculator',
    name: 'Grade calculator',
    terms: 'band earned letter percentage simple stated',
    op: 'science-education none text',
  },
  {
    href: '/science/half-life-calculator',
    name: 'Half-life calculator',
    terms: 'elapsed halflife halflive live quantity remaining',
    op: 'science-education none text',
  },
  {
    href: '/science/ideal-weight-calculator',
    name: 'Ideal body weight calculator',
    terms: 'devine estimate formula hamwi miller robinson',
    op: 'science-education none text',
  },
  {
    href: '/science/kinetic-energy-calculator',
    name: 'Kinetic-energy calculator',
    terms:
      '1 2mv2 carrie combination enter fine joule kilogram kineticenergy mas metre negative per read second since speed squared term velocity',
    op: 'science-education none text',
  },
  {
    href: '/science/led-resistor-calculator',
    name: 'LED resistor calculator',
    terms: 'dissipation ideal serie',
    op: 'science-education none text',
  },
  {
    href: '/science/lens-equation-calculator',
    name: 'Thin-lens equation calculator',
    terms: 'distance focal image magnification object solve thinlen',
    op: 'science-education none text',
  },
  {
    href: '/science/magnification-calculator',
    name: 'Magnification calculator',
    terms: 'image linear object size',
    op: 'science-education none text',
  },
  {
    href: '/science/mla-citation-formatter',
    name: 'MLA citation formatter',
    terms: 'basic fact mlalike pattern supplied',
    op: 'science-education text text',
  },
  {
    href: '/science/mole-calculator',
    name: 'Mole calculator',
    terms: 'count mas molar particle',
    op: 'science-education none text',
  },
  {
    href: '/science/momentum-calculator',
    name: 'Momentum calculator',
    terms:
      'enter keep kilogram linear mas metre mv negative p per read result second sign time velocity work',
    op: 'science-education none text',
  },
  {
    href: '/science/ohm-s-law-calculator',
    name: 'Ohm’s-law calculator',
    terms: 'current ohmslaw power resistance voltage',
    op: 'science-education none text',
  },
  {
    href: '/science/ph-calculator',
    name: 'pH calculator',
    terms: 'concentration hydrogen hydrogenion ideal ion poh',
    op: 'science-education none text',
  },
  {
    href: '/science/planet-weight-calculator',
    name: 'Planet-weight calculator',
    terms: 'approximate force gravity mas planetweight selected surface',
    op: 'science-education none text',
  },
  {
    href: '/science/potential-energy-calculator',
    name: 'Potential-energy calculator',
    terms: 'acceleration explicit gravitational joule mgh potentialenergy',
    op: 'science-education none text',
  },
  {
    href: '/science/projectile-motion-calculator',
    name: 'Projectile-motion calculator',
    terms:
      'flight ground height ideal level levelground peak projectilemotion range time',
    op: 'science-education none text',
  },
  {
    href: '/science/quiz-generator-workspace',
    name: 'Quiz generator workspace',
    terms: 'answer distractor fact printable question supplied',
    op: 'science-education text text',
  },
  {
    href: '/science/radioactive-decay-calculator',
    name: 'Radioactive-decay calculator',
    terms: 'constant n n0e radioactivedecay supplied λt',
    op: 'science-education none text',
  },
  {
    href: '/science/resistor-color-code',
    name: 'Resistor color-code calculator',
    terms:
      'back band blue colorcode colour decode digit four fourth multiplier ohm pick range read resistance silver state tolerance two value',
    op: 'science-education none text',
  },
  {
    href: '/science/reynolds-number-calculator',
    name: 'Reynolds-number calculator',
    terms:
      'characteristic density dimensionles divide dynamic enter input kg length m m3 pa predict re read reynoldsnumber s si time turbulence velocity viscosity μ ρvl',
    op: 'science-education none text',
  },
  {
    href: '/science/set-calculator',
    name: 'Set calculator',
    terms: 'difference intersection symmetric union',
    op: 'science-education text text',
  },
  {
    href: '/science/solution-dilution-calculator',
    name: 'Solution dilution calculator',
    terms: 'c1v1 c2v2 ideal relation solve v2',
    op: 'science-education none text',
  },
  {
    href: '/science/sound-intensity-calculator',
    name: 'Sound-intensity calculator',
    terms: '10 12 acoustic area level m2 power soundintensity versu w',
    op: 'science-education none text',
  },
  {
    href: '/science/statistics-distribution-viewer',
    name: 'Statistics-distribution viewer',
    terms:
      'deviation finite numeric population quartile sample statisticsdistribution summarize',
    op: 'science-education text text',
  },
  {
    href: '/science/study-time-planner',
    name: 'Study-time planner',
    terms: 'acros allocate bounded day hour sequentially studytime topic',
    op: 'science-education text text',
  },
  {
    href: '/science/tdee-calculator',
    name: 'TDEE calculator',
    terms:
      'activity bmr daily energy estimate expenditure jeor mifflin mifflinst multiplier st total',
    op: 'science-education none text',
  },
  {
    href: '/science/truth-table-generator',
    name: 'Truth-table generator',
    terms:
      'boolean bounded combination evaluate expression truthtable variable',
    op: 'science-education text text',
  },
  {
    href: '/science/unit-circle-viewer',
    name: 'Unit-circle value viewer',
    terms: 'angle calculate cosine radian sine tangent unitcircle',
    op: 'science-education none text',
  },
  {
    href: '/science/venn-diagram-data-builder',
    name: 'Venn-diagram data builder',
    terms: 'calculate exclusive region set seven supplied three venndiagram',
    op: 'science-education text text',
  },
  {
    href: '/science/wave-speed-calculator',
    name: 'Wave-speed calculator',
    terms:
      'behind enter frequency fλ hertz light metre multiply per read relation second sound string v wavelength wavespeed',
    op: 'science-education none text',
  },
  {
    href: '/science/weighted-grade-calculator',
    name: 'Weighted-grade calculator',
    terms: 'component course percentage score weight weightedgrade',
    op: 'science-education text text',
  },
  {
    href: '/science/workbench',
    name: 'Science & learning workbench',
    terms: 'calculate formula logic material set study transparent',
  },
  {
    href: '/subtitles/subtitle-check',
    name: 'Check subtitles for problems',
    terms:
      'cue fast goe line long order outoforder overlap past read report text',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-clean',
    name: 'Clean up a subtitle file',
    terms:
      'apart auto autogenerated caption cue drop empty formatting generated line overlapping pull remove renumber repair tag usual',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-framerate',
    name: 'Convert subtitle frame rate',
    terms:
      'another cause file framerate hour matche one retime second slip usual video',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-merge',
    name: 'Join two subtitle files',
    terms: 'assembled first merge part second video',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-shift',
    name: 'Shift subtitle timing',
    terms: 'ahead amount behind consistently earlier every later move run same',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-speed',
    name: 'Retime subtitles for a speed change',
    terms: '1 25 down export match re reexport slowed sped such video',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-split',
    name: 'Split a subtitle file in two',
    terms: 'cut moment part video',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-sync',
    name: 'Sync subtitles to two known moments',
    terms:
      'drift first fix further giving goe last line right start time true video',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-to-lrc',
    name: 'Convert subtitles to LRC lyrics (.lrc)',
    terms: 'file music player produce timed',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-to-sbv',
    name: 'Convert subtitles to YouTube SBV (.sbv)',
    terms: 'accept format produce studio upload',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-to-srt',
    name: 'Convert subtitles to SubRip (.srt)',
    terms: 'accept almost every file format lrc player sbv substation webvtt',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-to-text',
    name: 'Subtitles to a plain transcript',
    terms: 'keep numbering readable said strip text timing',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-to-vtt',
    name: 'Convert subtitles to WebVTT (.vtt)',
    terms: 'element file format html srt video',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/subtitle-trim',
    name: 'Keep only part of a subtitle file',
    terms: 'clip drop inside longer range rest time trim video',
    op: 'subtitle text text',
  },
  {
    href: '/subtitles/workbench',
    name: 'Subtitle workbench',
    terms:
      'caption check convert edit file fix join lrc reading resync sbv speed srt sync timing transcript trim vtt webvtt',
  },
  {
    href: '/text/anagram-finder',
    name: 'Anagram finder',
    terms:
      'accent candidate case entry every exact exactly ignored itself letter line list match one paste per provide punctuation read same skipped word',
    op: 'text text text',
  },
  {
    href: '/text/blank-line-remover',
    name: 'Blank-line remover',
    terms:
      'back blankline block clean closed crlf document double empty ending file first itself list normalized order paste pasted same spaced strip text way whitespace whitespaceonly window',
    op: 'text text text',
  },
  {
    href: '/text/braille-translator',
    name: 'Basic Braille translator',
    terms: 'digit latin letter punctuation space unicode',
    op: 'writing text text',
  },
  {
    href: '/text/caesar-cipher',
    name: 'Caesar cipher',
    terms: 'decode encode explicit latin letter shift',
    op: 'writing text text',
  },
  {
    href: '/text/case-converter',
    name: 'Text case converter',
    terms:
      'capitalization capitalize change fix lower lowercase sentence title upper uppercase',
  },
  {
    href: '/text/character-counter',
    name: 'Character counter',
    terms: 'excluding including space unicode',
    op: 'text text text',
  },
  {
    href: '/text/citation-text-generator',
    name: 'Citation text generator',
    terms: 'assemble basic fact pattern supplied',
    op: 'writing text text',
  },
  {
    href: '/text/diacritic-remover',
    name: 'Diacritic remover',
    terms: 'combining decomposition mark unicode',
    op: 'text text text',
  },
  {
    href: '/text/duplicate-line-remover',
    name: 'Duplicate-line remover',
    terms:
      'appearance back both case count deduplicated difference drop duplicateline each every exact first keep kept later list literal matching occurrence order original paste repeat space trailing',
    op: 'text text text',
  },
  {
    href: '/text/email-signature-generator',
    name: 'Email-signature generator',
    terms: 'contact emailsignature escaped fact html minimal supplied',
    op: 'writing text text',
  },
  {
    href: '/text/emoji-extractor',
    name: 'Emoji extractor',
    terms: 'character extended list order pictographic reading',
    op: 'text text text',
  },
  {
    href: '/text/emoji-remover',
    name: 'Emoji remover',
    terms:
      'back behind caption character csv double extended filename import including joined leave message multi multipart part paste pictographic reject removing sequence space system text tidy',
    op: 'text text text',
  },
  {
    href: '/text/find-and-replace',
    name: 'Find and replace',
    terms: 'expression literal regular regularexpression rule text',
    op: 'text text text',
  },
  {
    href: '/text/html-to-markdown',
    name: 'HTML to Markdown',
    terms: 'common convert readable semantic tag',
    op: 'writing text text',
  },
  {
    href: '/text/line-number-adder',
    name: 'Line-number adder',
    terms:
      'aligned back copy else every exact front largest linenumber list numbered padded passage paste pointing prefix quoting reviewer somewhere stable stay text width zero zeropadded',
    op: 'text text text',
  },
  {
    href: '/text/line-shuffler',
    name: 'Line shuffler',
    terms:
      'back data drawing list mixing name new order paste prompt question quiz random randomize randomnes reordering row sample set test useful',
    op: 'text text text',
  },
  {
    href: '/text/line-sorter',
    name: 'Line sorter',
    terms:
      'accented ascending aware back code comparison descending expect filed find land letter list locale localeaware order paste point rather read word',
    op: 'text text text',
  },
  {
    href: '/text/lorem-ipsum-generator',
    name: 'Lorem ipsum generator',
    terms:
      '1 20 anywhere copy each familiar fetched filler first five generated line local long opening paragraph placeholder rather sentence set tab text three',
    op: 'text none text',
  },
  {
    href: '/text/markdown-editor',
    name: 'Markdown editor & exporter',
    terms: '8 download empty file non nonempty utf utf8',
    op: 'writing text text',
  },
  {
    href: '/text/markdown-to-html',
    name: 'Markdown to HTML',
    terms: 'common convert escaped safe subset',
    op: 'writing text text',
  },
  {
    href: '/text/markdown-to-pdf-doc',
    name: 'Markdown to print & PDF document formatter',
    terms:
      'beautifully doc footer header html page printable raw style transform typeset',
    op: 'writing text text',
  },
  {
    href: '/text/morse-code-translator',
    name: 'Morse-code translator',
    terms: 'digit international latin letter morsecode',
    op: 'text text text',
  },
  {
    href: '/text/nato-alphabet-translator',
    name: 'NATO alphabet translator',
    terms: 'digit latin letter phonetic spell',
    op: 'text text text',
  },
  {
    href: '/text/outline-builder',
    name: 'Outline builder',
    terms: 'convert explicit level markdown row title',
    op: 'writing text text',
  },
  {
    href: '/text/palindrome-checker',
    name: 'Palindrome checker',
    terms: 'case ignoring letter number punctuation',
    op: 'text text text',
  },
  {
    href: '/text/paragraph-counter',
    name: 'Paragraph counter',
    terms:
      'blank block counted draft empty has holding left line non once paste read run separated text total whitespace',
    op: 'text text text',
  },
  {
    href: '/text/pig-latin-translator',
    name: 'Pig Latin translator',
    terms:
      'ay capitalisation consonant convert end english gain leading left move paste punctuation read sentence simple starting text translation vowel way word',
    op: 'text text text',
  },
  {
    href: '/text/prompt-template-builder',
    name: 'Prompt-template builder',
    terms:
      'constraint context output prompttemplate requirement role structure supplied task',
    op: 'writing text text',
  },
  {
    href: '/text/punctuation-cleaner',
    name: 'Punctuation cleaner',
    terms: 'remaining remove tidy unicode whitespace',
    op: 'text text text',
  },
  {
    href: '/text/random-word-generator',
    name: 'Random word generator',
    terms:
      '1 100 20 back built builtin draft draw drawn english exercise line list naming neutral nothing one passphrase pasting per pick plain prompt set small',
    op: 'text none text',
  },
  {
    href: '/text/reading-time',
    name: 'Reading time calculator',
    terms:
      '225 draft estimate figure long longer minute newsletter paste per piece post read reported second top word',
    op: 'text text text',
  },
  {
    href: '/text/regex-replace',
    name: 'Regex replace',
    terms:
      'available capture case every expression group javascript leaving lower match matche matching page paste pattern read regular replacement rewritten switch text upper',
    op: 'text text text',
  },
  {
    href: '/text/rot-cipher',
    name: 'ROT cipher',
    terms: 'case chosen latin letter preserving rotate value',
    op: 'writing text text',
  },
  {
    href: '/text/sentence-counter',
    name: 'Sentence counter',
    terms: 'boundarie estimate punctuation terminal',
    op: 'text text text',
  },
  {
    href: '/text/slug-generator',
    name: 'Slug generator',
    terms:
      'accent ascii back become character copy create dropped every folded friendly headline hyphen lowercase paste plain punctuation space stray stripped trimmed turned url',
    op: 'text text text',
  },
  {
    href: '/text/smart-quote-converter',
    name: 'Smart-quote converter',
    terms: 'mark quotation smartquote straight typographic',
    op: 'text text text',
  },
  {
    href: '/text/spelling-variant-converter',
    name: 'US/UK spelling converter',
    terms: 'built builtin common disclosed list variant',
    op: 'writing text text',
  },
  {
    href: '/text/subtitles-text-cleaner',
    name: 'Subtitles text cleaner',
    terms: 'common indexe markup remove srt timestamp vtt',
    op: 'text text text',
  },
  {
    href: '/text/text-deduplicator',
    name: 'Text deduplicator',
    terms:
      'appeared back both case delimited differ duplicate each exact first ids keeping list matching once one order paste remove repeated run separated spelling survive tag token two whitespace whitespaceseparated word',
    op: 'text text text',
  },
  {
    href: '/text/text-diff',
    name: 'Text diff',
    terms:
      'bounded code common create level line linelevel longest longestcommonsubsequence subsequence',
    op: 'writing text text',
  },
  {
    href: '/text/text-editor',
    name: 'Plain-text editor & exporter',
    terms: '8 download ending lf line normalize pasted plaintext utf utf8',
    op: 'writing text text',
  },
  {
    href: '/text/text-merge',
    name: 'Text merge',
    terms: '000 1 block explicit join separator supplied',
    op: 'writing text text',
  },
  {
    href: '/text/text-repeater',
    name: 'Text repeater',
    terms:
      '1 100 between block content copie copy data draft each filling fixture handy layout line paste placeholder repeat set test time whole word',
    op: 'text text text',
  },
  {
    href: '/text/text-reverser',
    name: 'Text reverser',
    terms:
      'accented backward breaking character emoji flag instead kept letter paste perceived piece read reverse separate sequence split stay unicode user userperceived whole',
    op: 'text text text',
  },
  {
    href: '/text/text-splitter',
    name: 'Text splitter',
    terms: 'delimiter line literal one part per',
    op: 'text text text',
  },
  {
    href: '/text/text-summarization-workspace',
    name: 'Extractive text summarizer',
    terms:
      'frequency local order preserve rank selected sentence summarization word workspace',
    op: 'writing text text',
  },
  {
    href: '/text/transcript-formatter',
    name: 'Transcript formatter',
    terms: 'normalize preserving spacing speaker',
    op: 'text text text',
  },
  {
    href: '/text/unicode-normalizer',
    name: 'Unicode normalizer',
    terms:
      'accented between byte character compare consistent convert equal file form nfc nfd nfkc nfkd normalization normalize paste pasted pick same should system text two unequal word',
    op: 'text text text',
  },
  {
    href: '/text/vigenere-cipher',
    name: 'Vigenère cipher',
    terms: 'alphabetic decode encode key latin letter supplied vigenere',
    op: 'writing text text',
  },
  {
    href: '/text/whitespace-remover',
    name: 'Whitespace remover',
    terms:
      'back break carrying clean collapse copied double email end every line one paste pdf run single space stray tab text tidy trim turning',
    op: 'text text text',
  },
  {
    href: '/text/word-counter',
    name: 'Word counter',
    terms:
      'accented aware between boundarie contraction counted digit dont letter once passage paste properly read run script single space stay such t text unicode',
    op: 'text text text',
  },
  {
    href: '/text/workbench',
    name: 'Text workbench',
    terms: 'clean count inspect locally transform translate',
  },
  {
    href: '/text/writing',
    name: 'Writing workbench',
    terms: 'compare convert edit export structure summarize',
  },
  {
    href: '/video/compress',
    name: 'Compress video',
    terms:
      'acceleration bitrate compress custom discord email file hardware lower mp4 preset quality reduce shrink size smaller via webcodec',
  },
  {
    href: '/video/convert',
    name: 'Video converter',
    terms:
      'audio change container encoding frame lossles mov mp4 quicktime re reencoding remux',
  },
  {
    href: '/video/crop',
    name: 'Crop video',
    terms:
      '1 16 4 5 9 adjust aspect bar black canva change encoding framing gpu hardware instagram landscape mp4 ratio re rectangle reel slicing square tiktok vertical',
  },
  {
    href: '/video/extract-audio',
    name: 'Extract audio from video',
    terms:
      'aac encoding lossles m4a mov mp3 mp4 re reencoding rip save separate sound track',
  },
  {
    href: '/video/merge',
    name: 'Video joiner',
    terms:
      'clip combine concatenate encoding end endtoend file los matching merge mov mp4 multiple quality re stitch together two',
  },
  {
    href: '/video/metadata',
    name: 'Video metadata scrubber',
    terms:
      'camera clean coordinate detail device gps inspect location model mov mp4 privacy remove strip tag timestamp view',
  },
  {
    href: '/video/mute',
    name: 'Mute video',
    terms:
      'audio background create encoding instantly mov mp4 re reencoding remove silence silent sound strip track',
  },
  {
    href: '/video/resize',
    name: 'Resize video',
    terms:
      '1080p 480p 4k 720p aspect audio change dimension downscale encoding hardware hd keeping mp4 preservation ratio resolution scale untouched',
  },
  {
    href: '/video/rotate',
    name: 'Video rotator',
    terms:
      '180 270 90 degree fix flip horizontally instantly landscape los mov mp4 portrait quality rotate sideway vertically',
  },
  {
    href: '/video/split',
    name: 'Video splitter',
    terms:
      'clip cut divider download downloadable long middle multiple part remove section unwanted zip',
  },
  {
    href: '/video/to-gif',
    name: 'Video to GIF converter',
    terms:
      'animated clip color create custom dither export mov mp4 resolution speed',
  },
  {
    href: '/video/trim',
    name: 'Video trimmer',
    terms:
      'audio clip cut encoding extract media mov mp3 mp4 mute off online re reencoding remove shorten social sound start trim',
  },
  {
    href: '/web/accessibility-contrast-checker',
    name: 'Accessibility contrast checker',
    terms: 'aa aaa calculate color hex ratio text threshold two wcag',
    op: 'web text text',
  },
  {
    href: '/web/aria-label-checklist',
    name: 'ARIA label checklist',
    terms:
      'accessible attribute common control flag html lack naming supplied suppliedhtml text visible',
    op: 'web text text',
  },
  {
    href: '/web/aspect-ratio-calculator',
    name: 'Aspect-ratio calculator',
    terms: 'aspectratio dimension height missing reduce width',
    op: 'web none text',
  },
  {
    href: '/web/browser-compatibility-checklist',
    name: 'Browser compatibility checklist',
    terms: 'create data feature live review selected',
    op: 'web text text',
  },
  {
    href: '/web/canonical-url-builder',
    name: 'Canonical URL builder',
    terms: 'absolute escaped generate link normalize tag',
    op: 'web text text',
  },
  {
    href: '/web/css-animation-generator',
    name: 'CSS keyframe animation & physics generator',
    terms:
      'acceleration bounce curve custom easing fade fadeslide float gpu optimized pulse pure shake shimmer slide spin',
    op: 'web none text',
  },
  {
    href: '/web/css-border-radius-generator',
    name: 'CSS border-radius generator',
    terms:
      'back borderradiu bottom bottomleft bottomright copy corner declaration each four left negative order pixel preview refused right set shorthand straight stylesheet top topleft topright watch',
    op: 'web none text',
  },
  {
    href: '/web/css-clamp-calculator',
    name: 'CSS clamp calculator',
    terms: 'between expression fluid generate linear two viewport width',
    op: 'web none text',
  },
  {
    href: '/web/css-clip-path-generator',
    name: 'CSS clip-path generator',
    terms: 'clippath coordinate declaration pair percentage polygon validated',
    op: 'web text text',
  },
  {
    href: '/web/css-flexbox-generator',
    name: 'CSS flexbox generator',
    terms:
      'align alignitem alignment block common container content copy declaration direction flex gap item justification justify justifycontent matching name pick pixel preview produce property recalling set value watch wrapping',
    op: 'web none text',
  },
  {
    href: '/web/css-glassmorphism-generator',
    name: 'CSS glassmorphism & backdrop-filter generator',
    terms:
      'backdropfilter blur border effect frosted glas highlight modern opacity specular surface',
    op: 'web text text',
  },
  {
    href: '/web/css-gradient-generator',
    name: 'CSS gradient generator',
    terms: 'angle color linear lineargradient stop validated',
    op: 'web text text',
  },
  {
    href: '/web/css-gradient-studio',
    name: 'CSS Gradient Studio & SVG generator',
    terms:
      'angle classe color conic control def linear modern multi multicolor radial stop tailwind',
    op: 'web text text',
  },
  {
    href: '/web/css-grid-generator',
    name: 'CSS grid generator',
    terms: 'column declaration gap minimum responsive width',
    op: 'web none text',
  },
  {
    href: '/web/css-neumorphism-generator',
    name: 'CSS neumorphism & soft-shadow generator',
    terms:
      'based box button calculate card dark dual inset light physic physicsbased softshadow surface ui',
    op: 'web text text',
  },
  {
    href: '/web/css-shadow-generator',
    name: 'CSS shadow generator',
    terms: 'box boxshadow control declaration numeric',
    op: 'web text text',
  },
  {
    href: '/web/domain-name-generator',
    name: 'Domain name generator',
    terms:
      'availability candidate checked comma commaseparated deterministic separated word',
    op: 'web text text',
  },
  {
    href: '/web/domain-typo-generator',
    name: 'Domain typo generator',
    terms:
      'adjacent adjacentkey bounded candidate defensive key omission review transposition',
    op: 'web text text',
  },
  {
    href: '/web/favicon-html-generator',
    name: 'Favicon & app icon HTML snippet generator',
    terms:
      'configuration device link manifest mobile modern production productionready ready tag web',
    op: 'web text text',
  },
  {
    href: '/web/favicon-inspector',
    name: 'Favicon inspector',
    terms: 'declaration extract fetched html icon link no page remote supplied',
    op: 'web text text',
  },
  {
    href: '/web/file-to-html',
    name: 'File to HTML converter',
    terms:
      'alongside banner build campaign designed email emailready generate image jpg one package packaged page png psd ready send slice standalone template web',
  },
  {
    href: '/web/heading-structure-checker',
    name: 'Heading structure checker',
    terms: 'flag html level list skip source supplied',
    op: 'web text text',
  },
  {
    href: '/web/hreflang-generator',
    name: 'Hreflang generator',
    terms: 'alternate alternatelanguage language link locale pair tag url',
    op: 'web text text',
  },
  {
    href: '/web/html-head-inspector',
    name: 'HTML head inspector',
    terms: 'element inventory link meta render supplied title',
    op: 'web text text',
  },
  {
    href: '/web/html-table-generator',
    name: 'HTML table generator',
    terms: 'become convert escaped first header row separated tab tabseparated',
    op: 'web text text',
  },
  {
    href: '/web/keyword-density-analyzer',
    name: 'Keyword density analyzer',
    terms:
      'case caseinsensitive count exact insensitive occurrence percentage phrase start word',
    op: 'web text text',
  },
  {
    href: '/web/link-extractor',
    name: 'Link extractor',
    terms: 'against attribute base href html quoted resolve supplied url',
    op: 'web text text',
  },
  {
    href: '/web/meta-tag-generator',
    name: 'Meta tag generator',
    terms: 'block canonical description escaped head robot title',
    op: 'web text text',
  },
  {
    href: '/web/open-graph-generator',
    name: 'Open Graph generator',
    terms: 'escaped preview share tag',
    op: 'web text text',
  },
  {
    href: '/web/query-string-builder',
    name: 'Query string builder',
    terms: 'encoded key line value',
    op: 'web text text',
  },
  {
    href: '/web/query-string-parser',
    name: 'Query string parser',
    terms: 'array key preserve repeated',
    op: 'web text text',
  },
  {
    href: '/web/redirect-chain-planner',
    name: 'Redirect chain planner',
    terms: 'destination duplicate inspect loop pair source',
    op: 'web text text',
  },
  {
    href: '/web/responsive-breakpoint-tester',
    name: 'Responsive breakpoint tester',
    terms: 'against ascending classify editable supplied viewport width',
    op: 'web text text',
  },
  {
    href: '/web/robots-txt-generator',
    name: 'Robots.txt generator',
    terms: 'agent create path policy rule small user useragent',
    op: 'web text text',
  },
  {
    href: '/web/robots-txt-tester',
    name: 'Robots.txt tester',
    terms:
      'allow disallow evaluate interpreted longest matching path rule wildcard',
    op: 'web text text',
  },
  {
    href: '/web/schema-markup-generator',
    name: 'Schema markup generator',
    terms: 'json jsonld ld minimal object organization webpage website',
    op: 'web text text',
  },
  {
    href: '/web/schema-markup-validator',
    name: 'Schema markup validator',
    terms: 'context field json jsonld ld required syntax type',
    op: 'web text text',
  },
  {
    href: '/web/serp-snippet-preview',
    name: 'SERP snippet preview',
    terms: 'character count create description text title transparent',
    op: 'web text text',
  },
  {
    href: '/web/sitemap-generator',
    name: 'Sitemap generator',
    terms: 'absolute document escaped http s url xml',
    op: 'web text text',
  },
  {
    href: '/web/sitemap-viewer',
    name: 'Sitemap viewer',
    terms: 'decode extract loc request value xml',
    op: 'web text text',
  },
  {
    href: '/web/svg-optimizer',
    name: 'SVG optimizer & cleaner',
    terms:
      'attribute code comment coordinate edit metadata redundant rounding stripping',
    op: 'web text text',
  },
  {
    href: '/web/text-to-html-link',
    name: 'Text to HTML link',
    terms: 'absolute anchor create element escaped label preference target url',
    op: 'web text text',
  },
  {
    href: '/web/twitter-card-generator',
    name: 'Twitter card generator',
    terms: 'fetching page tag x',
    op: 'web text text',
  },
  {
    href: '/web/url-normalizer',
    name: 'URL normalizer',
    terms:
      'default fragment host lowercase normalize parameter path port remove sort',
    op: 'web text text',
  },
  {
    href: '/web/utm-builder',
    name: 'UTM builder',
    terms: 'absolute add campaign content medium parameter source term url',
    op: 'web text text',
  },
  {
    href: '/web/utm-parser',
    name: 'UTM parser',
    terms:
      'absolute addres addresse back broken campaign content http link medium parameter paste read source table tagged term url value web',
    op: 'web text text',
  },
  {
    href: '/web/viewport-size-calculator',
    name: 'Viewport size calculator',
    terms: 'convert percentage pixel specified vh vw',
    op: 'web none text',
  },
  {
    href: '/web/web-app-manifest-generator',
    name: 'Web app manifest generator',
    terms: 'file json minimal shaped standard standardsshaped',
    op: 'web text text',
  },
  {
    href: '/web/workbench',
    name: 'Web & SEO workbench',
    terms: 'asset css generate html inspect metadata url',
  },
];
