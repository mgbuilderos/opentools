/**
 * Pages written for one profession instead of for everyone.
 *
 * WHY THIS FILE EXISTS. Every tool page on this site was written to be
 * understood by anybody, which means it was written to be recognised by
 * nobody. "Compress a PDF" is true and useless: the person who needs it this
 * morning is a chartered accountant whose reply to a scrutiny notice was
 * bounced by the e-filing portal, and nothing on that page said so. A brief
 * below replaces the page's own heading, standfirst and eyebrow with the job
 * as a practice states it, and adds the two lists a professional reads before
 * trusting a tool with a client's file: what it will do, and what it will not.
 *
 * WHO THEY ARE FOR. Indian chartered accountants, tax consultants, bookkeepers
 * and the small businesses they serve. They handle documents that genuinely
 * cannot be uploaded — client bank statements, GST returns, PAN, Aadhaar,
 * salary slips — they handle them every working day, and they tell each other
 * what they use. Everything here is therefore written in Indian professional
 * register: rupees group in lakh and crore, dates are DD/MM/YYYY, and a year
 * means the financial year that runs 01/04 to 31/03 unless it says otherwise.
 *
 * WHY IT IS DATA AND NOT COPY IN THE COMPONENTS. Three of these five briefs
 * are attached to tool components that already serve a general audience on the
 * same URL, so the audience wording has to be separable from the tool. Holding
 * them here also lets `practice-briefs.test.ts` check every one of them
 * against `LIVE_TOOL_ROUTES` — a brief pointing at a route that is not
 * registered is a page nobody can reach, which is the exact failure
 * `tool-page-registration.test.ts` exists to stop, arriving from the other
 * direction.
 *
 * WHY IT IS NOT UNDER `lib/tools/`. Same reason as `lib/portal-presets.ts`:
 * `lib/tools/local-source-policy.test.ts` guards `lib/tools`, `components`,
 * `app` and `workers` against anything that looks like a network target, and
 * keeping prose with citations out of the engine path lets both rules hold.
 *
 * NO STATUTORY FIGURE APPEARS HERE. Upload ceilings, thresholds and rates move
 * without announcement, and a page's cached title or meta description outlives
 * the change by months. Numbers of that kind live in `lib/portal-presets.ts`
 * with the portal page they were read from and the date they were read, are
 * rendered beside that citation, and never reach metadata (constraint C3).
 */

export interface PracticeBrief {
  /** Stable key, used by the test and by the page that renders it. */
  id: string;
  /**
   * The route this brief is written for. Checked against `LIVE_TOOL_ROUTES`,
   * so a brief cannot describe a page that is in no sitemap and behind no
   * link.
   */
  route: string;
  /** Breadcrumb line above the heading: where this sits in a practice's week. */
  eyebrow: string;
  /**
   * The page's `<h1>`, and the page's `<title>` should say the same thing.
   * A heading and a title that disagree tell a reader and a crawler two
   * different things about what the page is.
   */
  heading: string;
  /** One paragraph under the heading, naming the job and who has it. */
  lede: string;
  /** What the tool does on this job, in the order it happens. */
  steps: readonly string[];
  /**
   * What it will not do. These are not disclaimers. Each one is a thing a
   * practice would otherwise discover after sending the file, and every line
   * was written from the tool's own code and tests rather than from its
   * marketing.
   */
  limits: readonly string[];
}

export const PRACTICE_BRIEFS: readonly PracticeBrief[] = [
  {
    id: 'bank-statement-to-books',
    route: '/pdf/to-excel',
    eyebrow: 'Client books / Bank statement',
    heading: 'Bank statement PDF to Excel for client books',
    lede: 'The client sends the statement the bank emailed them, as a PDF, and the ledger needs it as rows. This page reads the columns off the statement in this tab, carries the narration, the debit, the credit and the running balance across, and writes .xlsx or .csv you can bring into your accounting package. The file is read by the page; you are not uploading a client bank statement to anybody.',
    steps: [
      'Open the statement PDF. Column edges are read from the page itself, so a statement that prints one signed amount column and one that prints separate debit and credit columns both come across as debit and credit.',
      'DR and CR markers are read as the sign, whether the bank prints them before or after the figure, so a credit does not arrive in the books as a payment out.',
      'Amounts written in lakh grouping (12,34,567.89) are read as one number, and so are statements that use the comma as the decimal mark.',
      'A narration that wraps onto a second or third line is joined back onto its own row rather than becoming a row with no amount.',
      'The running balance is recomputed row by row and compared with the balance the bank printed. Rows where the two disagree are listed before you export, so you find a dropped or doubled line here rather than at the closing balance.',
      'Repeated column headers on every page are dropped, so a twelve-page statement does not arrive with twelve header rows in the middle of the data.',
    ],
    limits: [
      'A scanned or photographed statement is refused by name rather than converted into empty rows. Run it through text recognition first, then bring the result back here.',
      'A statement still protected by the password the bank sets is not opened. Remove the password in your PDF reader first.',
      'Dates are carried across exactly as the bank printed them, in whatever form that was. Nothing reinterprets 01/04/2026, so a DD/MM/YYYY statement stays DD/MM/YYYY — set the column format in your spreadsheet before you sort or filter on it.',
      'The balance check tells you which rows disagree; it does not repair them, and it does not stop you exporting. A run with mismatches listed is a run to read before posting.',
      'This is a conversion, not a classification. Nothing here decides a head of account, a TDS section or a GST treatment.',
    ],
  },
  {
    id: 'filing-bundle-under-portal-ceiling',
    route: '/pdf/compress',
    eyebrow: 'Filing / Portal upload',
    heading: 'Get a filing PDF under the portal upload limit',
    lede: 'A reply to a notice, an appeal annexure or a registration document that the portal refuses because the file is too large. This page rewrites the PDF more compactly and re-encodes the photographs inside it, in this tab, and then tells you plainly whether the result is under the ceiling you picked. The published ceilings for the Income Tax e-filing portal and the GST portal are on the button row, each shown with the portal page it was read from and the date it was read.',
    steps: [
      'Choose the portal and the form you are filing into. The ceiling fills the target box and stays editable, because your form may not be the one listed.',
      'Open the PDF. Photographs and scans inside it are re-encoded, which is where almost all of the size in a scanned annexure actually sits.',
      'Lower the photo quality or the maximum photo width if the first pass is not enough. A scan of a typed page survives a long way down; a photograph of a signature does not.',
      'The result states the size before, the size after, and whether it is under the ceiling you set — so you know before you go back to the portal, not after it rejects you again.',
    ],
    limits: [
      'A portal can change its limit without announcing it, and the dates beside each figure are there so you can see how old the number is. Check yours before you rely on it.',
      'There is no automatic "squeeze until it fits" pass. You choose the settings and read the result; nothing loops behind your back and quietly destroys a scan to hit a number.',
      'A PDF that is mostly text and already compact may not get much smaller, and the result says so instead of pretending otherwise.',
      'Compression is not redaction. Anything visible in the file is still visible afterwards. Mask what should not travel before you compress.',
      'Several portals also cap the number of attachments and the total across all of them. Getting one file under the per-file ceiling does not answer those.',
    ],
  },
  {
    id: 'mask-before-it-leaves-the-firm',
    route: '/life-admin/aadhaar-pan-masker',
    eyebrow: 'Client data / Sharing outside the firm',
    heading: 'Mask Aadhaar and PAN before a client file leaves the firm',
    lede: 'A working paper, a client list or an extracted statement is about to go to a bank, a lender, an auditor or an article assistant, and it still has full Aadhaar and PAN numbers in it. This page finds them in the text and masks them on your device, the way a masked Aadhaar is masked: the first eight digits hidden, the last four left so the client can still tell you which record it is.',
    steps: [
      'Paste the text, or open the .txt, .csv, .tsv, .json, .md or .log file you are about to send.',
      'Aadhaar numbers are found and masked to their last four digits; the checksum is used to tell a real Aadhaar shape from any twelve digits that happen to sit together.',
      'PAN numbers keep their last four characters by default, so a party is still identifiable in your own working papers. You can hide all ten instead when the file is going outside.',
      'Read the count before you send. It tells you how many were found, which is how you notice the one the file did not have and the column you forgot about.',
    ],
    limits: [
      'Text only. A photograph of a PAN card, a scanned Aadhaar or a PDF is not read, so it is not masked, and it will not warn you that it skipped one.',
      'Masking the text does not mask the file name, the sheet name or a covering email.',
      'Twelve digits with a valid checksum are treated as an Aadhaar. A long account or reference number can match that shape, so read what changed before you send.',
      'This is a masking aid, not a compliance opinion. What you are permitted to hold, share and retain is your call and your client engagement letter’s.',
    ],
  },
  {
    id: 'amount-in-words',
    route: '/life-admin/indian-currency-number-to-words',
    eyebrow: 'Vouchers / Cheques and invoices',
    heading: 'Rupee amount in words for cheques, vouchers and invoices',
    lede: 'Every cheque, every payment voucher and every invoice needs the figure written out, and it has to be written the Indian way: thousand, then lakh, then crore. This page writes the line for you from the figure, in this tab, so an amount typed once is not transcribed by hand a second time into the place where a transposition costs the most.',
    steps: [
      'Type the figure the way it appears on the voucher, including paise.',
      'It is written out in Indian groups — thousand, lakh, crore — not in the millions and billions a spreadsheet in a foreign locale would give you.',
      'Paise are written as paise rather than dropped or rounded silently.',
      'The cheque writer alongside gives the same amount as a "Rupees … Only" line, which is the form a bank wants on the instrument itself.',
    ],
    limits: [
      'English wording only. If the instrument or the state requires the amount in another language, this does not give it to you.',
      'There is an upper bound, and an amount past it is refused rather than written out wrongly.',
      'Negative amounts are not written out. A refund or a reversal is worded by the document it sits in, not by the sign on a number.',
      'Banks, and some large payers, have house rules about spelling, hyphenation and where "Only" sits. Check the payee’s before you commit it to a signed instrument.',
    ],
  },
  {
    id: 'bill-the-client',
    route: '/finance/invoice-generator',
    eyebrow: 'Practice billing / Raising a bill',
    heading: 'Raise a client bill with rupee amounts grouped correctly',
    lede: 'The professional fee bill that goes out at the end of the month or the end of an engagement. Fill in the parties and the line items and this page lays out a print-ready bill in this tab. When the currency is the rupee, the figures group in lakh and crore, which is the thing most generic invoice makers get wrong and which makes a bill look as though it was not written for an Indian client.',
    steps: [
      'Enter your firm and the client as they should appear on the bill, one detail per line.',
      'Enter the line items as description, quantity, rate — one engagement or one head of work per line.',
      'Set the tax rate that applies to the bill. The rate you type is the rate that is applied; nothing here assumes one for you.',
      'Choose the rupee and the amounts group as 12,34,567.89 rather than 1,234,567.89, on the line items, the subtotal, the tax line and the total alike.',
      'Print it or save it as a PDF from the print dialogue. The layout is built for A4 and drops its on-screen controls when printed.',
    ],
    limits: [
      'This produces a bill, not a tax invoice under the GST law. There is no field for a GSTIN, an HSN or SAC code, a place of supply or a reverse-charge declaration, and it does not split a rate into CGST and SGST or state it as IGST. Do not issue this where those particulars are required.',
      'The tax line is a single rate applied to the net of the line items. It is arithmetic on what you typed, not a determination of what is chargeable.',
      'Dates are printed as you type them. Type them the way the client should read them.',
      'Numbering is yours. Nothing here keeps a series, checks it is unbroken, or remembers what you issued last month.',
    ],
  },
];

const BRIEFS_BY_ID: ReadonlyMap<string, PracticeBrief> = new Map(
  PRACTICE_BRIEFS.map((brief) => [brief.id, brief]),
);

/** The brief with this id. Throws, because a missing brief is a build bug. */
export function practiceBrief(id: string): PracticeBrief {
  const brief = BRIEFS_BY_ID.get(id);
  if (!brief) {
    throw new Error(
      `No practice brief with id "${id}". Add it to PRACTICE_BRIEFS in ` +
        `lib/practice-briefs.ts, or correct the id at the call site.`,
    );
  }
  return brief;
}
