/*
  WHAT A TOOL PAGE SAYS IN A SEARCH RESULT.

  Every `/[prefix]/[tool]` route takes its `<title>` and `<meta name=
  "description">` from the workbench operation that drives the tool. That
  entry is written for the person already looking at the tool -- "Solve
  a:b = c:x." is sixteen characters, exactly right above the three input
  boxes and useless as the only sentence Google has to decide whether the
  page answers a question. A sweep of all 1,392 live URLs on 2026-09-23
  found 115 descriptions under 50 characters and three pages sharing one.

  So the operation keeps its short line for the interface, and this file
  carries the longer one for the result snippet. Nothing here may say
  anything the operation does not already do: each entry opens with the
  operation's own sentence and adds what you give the tool and what it hands
  back. Length is not the goal -- being the answer to the query is -- but
  a description Google truncates, and one it replaces because it is too
  thin, both lose the click.

  RULES.

  1. Between 50 and 165 characters, and unique across the site. Both are
     enforced by `lib/seo/meta-lengths.test.ts` against every sitemap URL,
     so an entry cannot quietly drift out of range.
  2. No claim about privacy, speed or accuracy beyond what the tool's own
     description and the site-wide egress proof (`e2e/egress-proof.spec.ts`)
     already substantiate. "In your browser tab" is as far as that goes;
     "works offline" is true of four routes only and belongs nowhere here.
  3. A route absent from this map keeps the operation's own name and
     description. Absence is the default, not an oversight.
*/

export interface ToolSearchCopy {
  /** Replaces `operation.name` as the page title. */
  title?: string;
  /** Replaces `operation.description` as the meta description. */
  description?: string;
}

/** Route -> the copy that route serves instead of its operation's own. */
export const TOOL_SEARCH_COPY: Readonly<Record<string, ToolSearchCopy>> = {
  '/creator/content-calendar-maker': {
    description:
      'Validate and sort dated platform/topic entries. Paste one line per post with its date, platform and topic, and read back a calendar in date order.',
  },
  '/creator/social-media-post-formatter': {
    title: 'Unicode Text Formatter for LinkedIn, X & Instagram',
  },
  '/data/csv-merger': {
    description:
      'Append two CSV datasets with the same headers. Paste both, and the rows of the second are added under the first with the header row kept once.',
  },
  '/data/outlier-detector': {
    description:
      'Flag numeric values outside the 1.5x IQR fences. Paste a column of numbers and see the quartiles, the fences, and every value that falls outside them.',
  },
  '/data/random-row-selector': {
    description:
      'Select one complete row using browser randomness. Paste the rows, draw one, and the whole record comes back rather than a row number.',
  },
  '/data/spreadsheet-cell-inspector': {
    description:
      'Inspect one 1-based data row and named column. Give the row number and the column name and read the exact cell value the sheet holds there.',
  },
  '/date/day-of-year-calculator': {
    description:
      'Calculate the one-based ordinal day in the year. Give a date and read which day of 365 or 366 it is, leap years counted correctly.',
  },
  '/date/leap-year-checker': {
    description:
      'Apply the proleptic Gregorian leap-year rules. Give a year and read whether it is a leap year, including the century rule that makes 1900 ordinary.',
  },
  '/date/week-number-calculator': {
    description:
      'Calculate the ISO-8601 week year and week number. Give a date and read the week it falls in, with the week year that can differ from the calendar year.',
  },
  '/developer/base64-decode-text': {
    description:
      'Decode padded standard Base64 and validate UTF-8. Paste the encoded string, read the text back, and get an error rather than mojibake when the bytes are not UTF-8.',
  },
  '/developer/base64-encode-text': {
    description:
      'Encode UTF-8 text as padded standard Base64. Paste the text and copy the encoded string, with the alphabet and padding the standard specifies.',
  },
  '/developer/base64url-decode-text': {
    description:
      'Decode URL-safe Base64 text and validate UTF-8. Handles the dash and underscore alphabet that JWTs and query strings use, and reports invalid bytes.',
  },
  '/developer/binary-encode-text': {
    description:
      'Encode UTF-8 bytes as eight-bit binary groups. Paste the text and read each byte as eight ones and zeros, separated by spaces so the bytes stay legible.',
  },
  '/developer/checksum-calculator': {
    description:
      'Calculate a SHA checksum for pasted UTF-8 text. Pick the digest, paste the text, and copy the hexadecimal result. Runs on the Web Crypto API in your browser.',
  },
  '/developer/hex-encode-text': {
    description:
      'Encode UTF-8 bytes as lowercase hexadecimal. Paste the text and copy the hex, two digits per byte, with multi-byte characters encoded as the bytes they really are.',
  },
  '/developer/regex-extractor': {
    description:
      'Extract one capture group from up to 200 matches. Paste the text and the pattern, choose the group, and read every match as its own line.',
  },
  '/developer/sql-to-er-diagram': {
    title: 'ER Diagram from SQL — Mermaid, DBML & SVG',
  },
  '/developer/sha-256-text': {
    description:
      'Hash UTF-8 text with the browser Web Crypto implementation. Paste the text and copy the 64-character SHA-256 digest, the one Git objects and JWTs use.',
  },
  '/developer/sha-384-text': {
    description:
      'Hash UTF-8 text with the browser Web Crypto implementation. Paste the text and copy the 96-character SHA-384 digest, the truncated SHA-512 variant.',
  },
  '/developer/sha-512-text': {
    description:
      'Hash UTF-8 text with the browser Web Crypto implementation. Paste the text and copy the 128-character SHA-512 digest, the widest of the SHA-2 family.',
  },
  '/developer/url-decode': {
    description:
      'Decode percent escapes in a complete URL string. Paste the encoded address and read it back with every %XX sequence resolved to the character it stands for.',
  },
  '/developer/url-encode-component': {
    description:
      'Percent-encode one query value or path segment. Paste the value and copy the encoded form, with the characters a URL component must escape all escaped.',
  },
  '/developer/url-path-segments': {
    description:
      'Decode and list each non-empty pathname segment. Paste a URL and read its path split into parts, each one percent-decoded, empty segments dropped.',
  },
  '/documents/latex-table-generator': {
    title: 'LaTeX Table Generator — CSV & Markdown to LaTeX',
  },
  '/file/data-uri-file-maker': {
    description:
      'Encode one selected file as a Base64 data URI. Copy the result straight into CSS, HTML or a test fixture, with the media type filled in for you.',
  },
  '/file/file-chunk-splitter': {
    description:
      'Split one file into numbered byte-exact chunks. Pick the chunk size and download the parts; joined back in order they are byte-for-byte the original.',
  },
  '/file/file-extension-changer': {
    description:
      'Change only the extension on downloaded copies. The bytes are untouched, so this renames a file whose extension is wrong and never re-encodes it.',
  },
  '/finance/discount-calculator': {
    description:
      'Calculate discount amount and final price. Enter the list price and the percentage off, and read both what comes off and what is left to pay.',
  },
  '/finance/net-worth-calculator': {
    description:
      'Subtract listed liabilities from listed assets. List what you own and what you owe, and read the difference, with no account and nothing sent anywhere.',
  },
  '/finance/profit-calculator': {
    description:
      'Subtract fixed and variable costs from revenue. Enter the revenue and both cost lines, and read the profit and the margin it leaves you.',
  },
  '/finance/roi-calculator': {
    description:
      'Calculate simple return relative to stated cost. Enter what you put in and what came back, and read the gain and the return as a percentage of cost.',
  },
  '/finance/simple-interest-calculator': {
    description:
      'Calculate I = Prt and final amount. Enter the principal, the rate and the time, and read both the interest and the total, worked out in your browser.',
  },
  '/finance/split-bill-calculator': {
    description:
      "Add a supplied tip and split total equally. Enter the bill, the tip percentage and how many people are paying, and read each person's share.",
  },
  '/finance/tip-calculator': {
    description:
      'Calculate a user-supplied tip and total bill. Enter the bill and the percentage you want to leave, and read the tip and the total to hand over.',
  },
  '/life-admin/cheque-amount-writer': {
    description:
      'Create an English “Rupees … Only” amount line. Enter the figure and copy the words for a cheque, grouped in lakh and crore rather than in millions.',
  },
  '/life-admin/emi-due-date-planner': {
    description:
      'List monthly due dates from a first due date. Give the first instalment date and the number of instalments, and read every due date in one list.',
  },
  '/life-admin/indian-phone-number-formatter': {
    description:
      'Normalize a mobile number to +91 XXXXX XXXXX. Paste a number written any way at all and get the spaced international form back, ready to paste into a contact.',
  },
  '/life-admin/notice-period-calculator': {
    description:
      'Add calendar days to a supplied notice date. Give the date notice was served and the length of the period, and read the last working day it ends on.',
  },
  '/life-admin/pin-code-format-checker': {
    description:
      'Check for a six-digit Indian postal-code shape. Paste a PIN code and see whether it has the six digits the format needs before a form rejects it.',
  },
  '/math/angle-converter': {
    description:
      'Convert degrees, radians, gradians, and turns. Pick the two units, enter the angle, and read the converted figure with the exact factor shown.',
  },
  '/math/area-converter': {
    description:
      'Convert common metric and imperial areas. Square millimetres through square kilometres, plus hectares, acres, square feet and square miles, in one tool.',
  },
  '/math/average-calculator': {
    description:
      'Calculate the arithmetic mean of a number list. Paste the numbers separated by commas, spaces or new lines and read the mean and the count they came from.',
  },
  '/math/coin-flipper': {
    description:
      'Flip one to 100 fair virtual coins. Set how many to toss and read every result along with the count of heads and tails it came to.',
  },
  '/math/combination-calculator': {
    description:
      'Calculate nCr for whole numbers. Enter how many things there are and how many you choose, and read how many selections that allows when order does not matter.',
  },
  '/math/data-size-converter': {
    description:
      'Convert decimal and binary byte units. Kilobytes against kibibytes, megabytes against mebibytes and up, so a 1,000 and a 1,024 unit are never confused.',
  },
  '/math/dice-roller': {
    description:
      'Roll one to 100 dice with two to 1,000 sides. Set how many dice and how many sides, and read every face rolled along with the total.',
  },
  '/math/distance-converter': {
    description:
      'Convert metric, imperial, and nautical distances. Millimetres, centimetres, metres, kilometres, inches, feet, yards, miles and nautical miles, in one tool.',
  },
  '/math/energy-converter': {
    description:
      'Convert joules, watt-hours, calories, and BTU. Pick the two units, enter the figure, and read the answer with the exact factor between them shown.',
  },
  '/math/exponent-calculator': {
    description:
      'Calculate base raised to an exponent. Enter the base and the power, and read the result, negative and fractional exponents included.',
  },
  '/math/force-converter': {
    description:
      'Convert newtons and common force units. Newtons, kilonewtons, pounds-force, kilograms-force and dynes, converted with the exact factor between them.',
  },
  '/math/fraction-calculator': {
    description:
      'Add, subtract, multiply, or divide two fractions. Enter the numerators and denominators and read the answer reduced to its lowest terms.',
  },
  '/math/frequency-converter': {
    description:
      'Convert hertz and common frequency scales. Hertz, kilohertz, megahertz and gigahertz, plus revolutions per minute, converted with exact factors.',
  },
  '/math/fuel-economy-converter': {
    description:
      'Convert L/100 km, US MPG, and imperial MPG. Pick the two units, enter the figure, and read the answer, with the reciprocal relationship handled for you.',
  },
  '/math/gcd-calculator': {
    description:
      'Find the greatest common divisor of two integers. Enter both numbers and read the largest whole number that divides each of them exactly.',
  },
  '/math/lcm-calculator': {
    description:
      'Find the least common multiple of two integers. Enter both numbers and read the smallest whole number that each of them divides exactly.',
  },
  '/math/linear-equation-solver': {
    description:
      'Solve ax + b = 0. Enter the two coefficients and read the single value of x that satisfies the equation, worked out in this browser tab.',
  },
  '/math/logarithm-calculator': {
    description:
      'Calculate log base b of x. Enter the base and the number, and read the exponent the base must be raised to in order to reach it.',
  },
  '/math/mass-converter': {
    description:
      'Convert metric and imperial mass units. Milligrams, grams, kilograms and tonnes against ounces, pounds and stones, with exact factors, in this browser tab.',
  },
  '/math/median-calculator': {
    description:
      'Calculate the middle value of a number list. Paste the numbers in any order; they are sorted for you, and an even-length list gives the mean of the middle two.',
  },
  '/math/mode-calculator': {
    description:
      'Find every most-frequent value in a number list. Paste the numbers and read every value tied for the highest count, not just the first one found.',
  },
  '/math/permutation-calculator': {
    description:
      'Calculate nPr for whole numbers. Enter how many things there are and how many you arrange, and read how many ordered arrangements that allows.',
  },
  '/math/power-converter': {
    description:
      'Convert watts and common power units. Watts, kilowatts, horsepower and BTU per hour, converted against each other with the exact factor shown.',
  },
  '/math/prime-number-checker': {
    description:
      'Check a safe positive integer for primality. Enter the number and read whether it is prime, and the smallest divisor found when it is not.',
  },
  '/math/proportion-calculator': {
    description:
      'Solve a:b = c:x. Enter the three numbers you know and read the fourth, the missing term of the proportion, worked out in this browser tab.',
  },
  '/math/quadratic-equation-solver': {
    description:
      'Solve ax² + bx + c = 0, including complex roots. Enter the three coefficients and read both roots, with the discriminant that decides whether they are real.',
  },
  '/math/random-number-generator': {
    description:
      'Generate random integers in an inclusive range. Set the low and high bounds and draw a number, using the randomness your browser provides.',
  },
  '/math/ratio-calculator': {
    description:
      'Reduce an integer ratio to lowest terms. Enter the two whole numbers and read the simplest ratio that means the same thing, worked out in your browser.',
  },
  '/math/rectangle-calculator': {
    description:
      'Calculate area, perimeter, and diagonal. Enter the width and the height, and read all three results at once, worked out in this browser tab.',
  },
  '/math/sequence-generator': {
    description:
      'Generate an arithmetic sequence. Set the first term, the step between terms and how many you want, and read the whole run as a list you can copy.',
  },
  '/math/speed-converter': {
    description:
      'Convert speed units using exact standard factors. Metres per second, kilometres per hour, miles per hour, knots and feet per second, all in one tool.',
  },
  '/math/standard-deviation-calculator': {
    description:
      'Calculate population standard deviation. Paste the numbers and read the spread in the same units as the data, divided by n rather than n minus one.',
  },
  '/math/temperature-converter': {
    description:
      'Convert Celsius, Fahrenheit, and Kelvin. Pick the two scales, enter the reading, and get the converted figure, with the offset each scale needs applied.',
  },
  '/math/time-unit-converter': {
    description:
      'Convert elapsed-time units. Milliseconds, seconds, minutes, hours, days and weeks, converted against each other in this browser tab with exact factors.',
  },
  '/math/torque-converter': {
    description:
      'Convert newton-metres and common torque units. Newton-metres, pound-feet, pound-inches and kilogram-force metres, with the exact factor between them.',
  },
  '/math/variance-calculator': {
    description:
      'Calculate population variance. Paste the numbers and read the variance over the whole set, divided by n rather than by n minus one.',
  },
  '/math/volume-converter': {
    description:
      'Convert metric and common liquid volumes. Millilitres, litres, cubic metres, US and imperial pints, quarts, gallons and fluid ounces, in this browser tab.',
  },
  '/productivity/weekly-planner': {
    description:
      'Group and order items by weekday. Paste one task per line with the day it belongs to, and read the week back sorted Monday first, ready to copy.',
  },
  '/qr/app-store-qr-code': {
    description:
      'Encode a supplied official app-listing URL. Paste the store link you want scanned and download an SVG for a poster, a slide or a packaging insert.',
  },
  '/qr/bitcoin-qr-code': {
    description:
      'Create a BIP21-shaped bitcoin payment URI. Enter the address and an optional amount and label, and download the symbol a wallet app can read.',
  },
  '/qr/location-qr-code': {
    description:
      'Encode latitude and longitude as a geo URI. Enter the coordinates and download a symbol that opens the point in whichever map app the phone uses.',
  },
  '/qr/phone-qr-code': {
    description:
      'Create a tel URI QR symbol. Enter the number and download the symbol; scanning it puts the number into the dialler instead of asking anyone to type it.',
  },
  '/qr/qr-code-batch-generator': {
    description:
      'Generate up to 12 QR symbols in one SVG sheet. Paste one destination per line and download a single sheet, laid out ready to print and cut.',
  },
  '/qr/sms-qr-code': {
    description:
      'Encode a phone number and draft SMS body. Scanning opens the messaging app with the recipient and the message already filled in, ready to send.',
  },
  '/qr/url-qr-code': {
    description:
      'Encode a validated HTTP or HTTPS destination. Paste the link, check the preview and download the SVG; the address is checked before the symbol is drawn.',
  },
  '/qr/vcard-qr-code': {
    description:
      'Create a compact vCard 3.0 contact payload. Fill in the name, phone, email and organisation, and download a symbol a phone camera adds as a contact.',
  },
  '/science/buoyancy-calculator': {
    description:
      'Calculate ideal Archimedean buoyant force ρVg. Enter the fluid density, the displaced volume and gravity, and read the upward force in newtons.',
  },
  '/science/density-calculator': {
    description:
      'Calculate density from mass and volume. Enter the mass in kilograms and the volume in cubic metres, and read the density in kilograms per cubic metre.',
  },
  '/science/kinetic-energy-calculator': {
    description:
      'Calculate ½mv² in joules. Enter the mass in kilograms and the speed in metres per second, and read the kinetic energy that combination carries.',
  },
  '/science/momentum-calculator': {
    description:
      'Calculate linear momentum p = mv. Enter the mass in kilograms and the velocity in metres per second, and read the momentum in kilogram-metres per second.',
  },
  '/science/resistor-color-code': {
    description:
      'Decode a four-band resistor value and tolerance. Pick the band colours and read the resistance in ohms with the tolerance the fourth band states.',
  },
  '/science/reynolds-number-calculator': {
    description:
      'Calculate Re = ρvL/μ from SI inputs. Enter density, velocity, length and dynamic viscosity, and read the dimensionless number that predicts turbulence.',
  },
  '/science/wave-speed-calculator': {
    description:
      'Calculate wave speed v = fλ. Enter the frequency in hertz and the wavelength in metres, and read the speed in metres per second.',
  },
  '/text/anagram-finder': {
    description:
      'Find exact anagrams in a list you provide. Paste the candidate words and the word to match, and read every entry using exactly the same letters.',
  },
  '/text/blank-line-remover': {
    description:
      'Remove empty or whitespace-only lines. Paste a list that double-spaced itself on the way out of a document and get it back closed up, in the same order.',
  },
  '/text/duplicate-line-remover': {
    description:
      'Keep the first occurrence of every exact line. Paste a list and get it back deduplicated in its original order, with the first of each repeat kept.',
  },
  '/text/emoji-remover': {
    description:
      'Remove extended pictographic characters. Paste the text and get it back without emoji, for a filename, a CSV import or a system that rejects them.',
  },
  '/text/line-number-adder': {
    description:
      'Prefix every line with a stable line number. Paste the text and copy it back numbered, for quoting a passage or pointing a reviewer at an exact line.',
  },
  '/text/line-shuffler': {
    description:
      'Randomize line order with browser randomness. Paste the list and get it back in a new order, for drawing names or reordering a set of prompts.',
  },
  '/text/line-sorter': {
    description:
      'Sort lines with locale-aware comparison. Paste the list and get it back in order, with accented letters filed where a reader expects rather than by code point.',
  },
  '/text/lorem-ipsum-generator': {
    description:
      'Generate local placeholder paragraphs. Set how many paragraphs you need and copy the filler, generated in this browser tab rather than fetched from anywhere.',
  },
  '/text/paragraph-counter': {
    description:
      'Count non-empty blocks separated by blank lines. Paste the text and read how many paragraphs it really has, with runs of blank lines counted once.',
  },
  '/text/pig-latin-translator': {
    description:
      'Convert simple English words to Pig Latin. Paste the sentence and read the translation, with punctuation and capitalisation left where you put them.',
  },
  '/text/random-word-generator': {
    description:
      'Pick words from a small built-in neutral list. Set how many you want and draw them, for passphrase drafts, prompts and naming exercises.',
  },
  '/text/reading-time': {
    description:
      'Estimate reading time at 225 words per minute. Paste the draft and read the minutes it takes, the figure to put at the top of a post or a newsletter.',
  },
  '/text/regex-replace': {
    description:
      'Replace JavaScript regular-expression matches. Paste the text, the pattern and the replacement, and read the rewritten text without leaving the page.',
  },
  '/text/slug-generator': {
    description:
      'Create a lowercase, ASCII-friendly URL slug. Paste a headline and copy the slug, with accents folded, punctuation dropped and spaces turned into hyphens.',
  },
  '/text/text-deduplicator': {
    description:
      'Remove duplicate whitespace-delimited tokens. Paste a run of words, tags or ids and get each one back once, in the order it first appeared.',
  },
  '/text/text-repeater': {
    description:
      'Repeat text up to 100 times. Paste a line, set how many copies you want, and copy the block out, for test fixtures and placeholder content.',
  },
  '/text/text-reverser': {
    description:
      'Reverse user-perceived Unicode characters. Paste the text and read it backwards, with emoji and accented letters kept whole instead of split into pieces.',
  },
  '/text/unicode-normalizer': {
    description:
      'Normalize text to NFC, NFD, NFKC, or NFKD. Paste the text, pick the form, and get consistent bytes, so accented characters compare equal as they should.',
  },
  '/text/whitespace-remover': {
    description:
      'Collapse whitespace runs to a single space. Paste text carrying stray tabs, double spaces and line breaks from a PDF or an email and get one clean line back.',
  },
  '/text/word-counter': {
    description:
      'Count words using Unicode-aware word boundaries. Paste the text and read the word count, so scripts without spaces between words are still counted properly.',
  },
  '/web/css-border-radius-generator': {
    description:
      'Generate four-corner CSS border-radius shorthand. Set each corner, watch the preview, and copy the shorthand declaration straight into your stylesheet.',
  },
  '/web/css-flexbox-generator': {
    description:
      'Generate common flex container declarations. Set direction, wrapping, justification and alignment, watch the preview, and copy the CSS it produces.',
  },
  '/web/utm-parser': {
    description:
      'Read UTM parameters from an absolute URL. Paste a tagged campaign link and see the source, medium, campaign, term and content broken out as a table.',
  },
};

/** The search copy for a route, or undefined when it uses its own. */
export function toolSearchCopy(route: string): ToolSearchCopy | undefined {
  return TOOL_SEARCH_COPY[route];
}
