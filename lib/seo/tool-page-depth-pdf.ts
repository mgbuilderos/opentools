import type { ToolPageDepth } from './tool-page-depth-types';

/*
  Depth content for the 19 live PDF tool pages.

  PROVENANCE. Where an entry's `directAnswer` or `lead` reads like the guide,
  that is because it is the guide: `GUIDE_DETAILS` in `guide-content.ts` already
  held hand-verified paragraphs for eight of these routes, written from the
  engine and its tests, and guide consolidation had stopped rendering most of
  them. Moving the text to the tool page is the point of this file — the tool
  page is the URL that should rank for "merge pdf", and until now it carried 281
  words against the guide's 1,348.

  The steps, sections and extra questions around that text were written against
  the same sources, named in the comment above each entry. Nothing here states a
  limit, a format or a refusal that the code does not enforce.

  `offlineReady` appears on `/pdf/merge`, `/pdf/compress` and `/pdf/page-tools`
  only, because those three are in the service worker's precache list in
  `scripts/build-service-worker-precache.mjs` and nothing else under `/pdf` is.
  `lib/seo/tool-page-depth.test.ts` reads that list and fails if the two drift.
*/

/** The paragraph every page needs about `connect-src 'none'`, once. */
const SEALED_PAGE =
  'Every response from this site is served with a Content Security Policy whose connect-src directive is set to none. That is not a promise in marketing copy; it is an instruction to your browser, and the browser is the one enforcing it. While this page is open it cannot open a connection to anywhere — not to this site, not to anyone else — so there is no path by which your document could be uploaded, not by a bug, not by a future change, not by a script that should not be here. e2e/egress-proof.spec.ts asserts the served header and then tries to send data out by every route a page has and requires each attempt to be refused, and it runs on every build.';

const NO_NETWORK_CODE =
  'The second half of the guarantee is that the code has nowhere to send anything from. lib/tools/local-source-policy.test.ts reads every source file under lib/tools, workers, components and app on every test run and fails the build if any of them contains fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon or a peer connection, or even a remote address written down in a comment. A tool here cannot acquire an upload by accident, because the file that would have to contain one cannot be committed.';

export const PAGE_DEPTH_PDF: Readonly<Record<string, ToolPageDepth>> = {
  // components/pdf-merge-tool.tsx, lib/tools/pdf/engine.ts (mergePdfs),
  // lib/tools/pdf/protocol.ts, workers/pdf.worker.ts,
  // e2e/share-target.spec.ts ('serves the app with the network switched off').
  '/pdf/merge': {
    title: 'Merge PDF Online — Free, No Upload, No Sign-Up',
    description:
      'Combine up to 20 PDFs into one in your own browser tab. Set the order, merge, and the page count is checked before you download. No upload, no account.',
    heading: 'About this PDF merger',
    offlineReady: true,
    directAnswer:
      'To combine several PDFs into one: choose the files, set their order with the up and down arrows, and merge. Every page of every file is copied into a new document in that order, and the saved bytes are opened again and their page count checked against the total of the inputs before a download is offered.',
    lead: 'This page joins whole PDFs in the order you set — up to 20 files at a time and 150 MB across all of them — using pdf-lib inside the browser tab. Each row of the list shows a file’s page count and size, so you can check what you are about to join before you join it. What the current scope covers is page content and page order: bookmarks, digital signatures, form fields, attachments and document-level metadata are not yet guaranteed to survive, and the page says so above the button. An encrypted PDF is refused with a message to remove its password locally first, rather than being half-read.',
    steps: [
      {
        name: 'Add the PDFs',
        text: 'Choose the files, or drop them onto the page. Each one is checked on its first five bytes before anything is parsed, so a file that is not a PDF is refused straight away. The row for each file shows its page count and its size.',
      },
      {
        name: 'Put them in order',
        text: 'The files are joined top to bottom in the list. Every row has an arrow to move that file earlier, an arrow to move it later, and a button to take it out again. Pages inside a file keep their own order — nothing is resequenced within a document.',
      },
      {
        name: 'Merge',
        text: 'The merge runs in a Web Worker so the tab stays responsive, copying every page of every file into one new document. No file is sent anywhere; the bytes never leave the page.',
      },
      {
        name: 'Let the check run, then download',
        text: 'The saved bytes are loaded again as a PDF and the page count compared with the total that went in. Only when those agree is a download offered, and the result panel reports the page count and how long the work took.',
      },
    ],
    sections: [
      {
        heading: 'How the merge actually works',
        body: [
          'A PDF is a container of objects, not a stream of pages, so joining two of them is a copy of page objects and everything they reference — fonts, images, colour spaces — into a new document, with the cross-reference table rebuilt around the result. That is what pdf-lib does here, inside a Web Worker in this tab, and it is why merging is lossless for page content: nothing is rasterised, no text is redrawn, and a vector drawing that was sharp in the source is the same drawing in the output.',
          'It is also why the check at the end is worth having. A merge that silently drops a page produces a perfectly valid PDF, and you would not know until someone else opened it. So the saved bytes are reopened and counted, and a mismatch fails the run rather than handing you a file. That check runs every time, not on request.',
        ],
      },
      {
        heading: 'What it will not do',
        body: [
          'Bookmarks, digital signatures, form fields, attachments and document-level metadata are outside today’s scope and are not guaranteed to survive the merge. If your files carry any of those, open the result and check before you rely on it — that sentence is printed above the merge button as well, not buried here.',
          'It also will not split, reorder or drop pages inside a file. That is a different job and it has its own page: use Extract PDF pages to keep only the pages you want, or Organise PDF pages to reorder and delete, and merge the results afterwards.',
          'An encrypted PDF is refused rather than half-read, with a message asking you to remove its password locally and try again. The error names only the file you chose; nothing read from inside it appears in any message, because a message is the one place file content could plausibly leak into a log.',
        ],
      },
      {
        heading: 'Limits, and why they are what they are',
        body: [
          'Up to 20 files, and 150 MB across all of them. Both are checked as you choose the files and the message names which limit you reached. The file count is a running total, so you can add documents in batches until you reach twenty.',
          'The limits exist because the work happens in your own device’s memory. A server-side merger can quietly stream a two-gigabyte job through a machine with more RAM than your laptop; a browser tab cannot, and a tab that runs out of memory takes your work with it. A stated ceiling that holds is better than an unstated one that fails halfway.',
        ],
      },
      {
        heading: 'Why your files stay on your device',
        body: [
          SEALED_PAGE,
          NO_NETWORK_CODE,
          'This is one of the few pages kept in the service worker’s precache list, so once you have visited it the page and its code are held on your device and it opens with the network switched off. e2e/share-target.spec.ts proves exactly that on this route: it fills the cache, disconnects the browser, loads /pdf/merge, and requires a 200, a visible heading, a working file input, and the same connect-src none header on the response the worker synthesised.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How many PDFs can I combine at once, and how large?',
        answer:
          'Up to 20 files, and 150 MB in total across them. Both limits are checked when you choose the files, and the message names which one you reached. The 20-file limit counts files already in the list, so you can add them in batches up to that total.',
      },
      {
        question: 'How do I control the order the pages end up in?',
        answer:
          'Files are joined top to bottom in the list shown on the page. Every row has an arrow to move that file earlier, an arrow to move it later, and a button to remove it. Pages within a file keep their own order; this tool does not reorder or drop pages inside a file.',
      },
      {
        question: 'What is not carried across?',
        answer:
          'Bookmarks, digital signatures, form fields, attachments and document-level metadata. The scope today is page content and page order. If your files carry any of those, open the result and check before you rely on it.',
      },
      {
        question: 'What happens with an encrypted or damaged file?',
        answer:
          'An encrypted PDF is refused with advice to remove its password locally and try again. A file that is not a PDF is refused on its first five bytes, before any parsing. In both cases the error identifies only the file you chose — nothing read from inside it appears in the message.',
      },
      {
        question: 'How do I know the result is complete?',
        answer:
          'The saved bytes are loaded again as a PDF and the page count is compared with the number of pages that went in. If the two disagree the run fails instead of handing you a file, and that check runs every time rather than on request. The result panel reports the page count and how long the work took.',
      },
      {
        question: 'Is there a watermark, a sign-up, or a daily limit?',
        answer:
          'None of the three. There is no account, no email box, no queue and no watermark on the output, and no cap on how many times you can run it. There is nothing to meter, because the work happens on your computer rather than on one of ours — the merge costs us nothing per run, so there is nothing to charge for per run.',
      },
      {
        question: 'Does it work offline?',
        answer:
          'On this page, yes, once you have opened it once with a connection. It is one of a small number of routes held in the service worker cache, so the page and its code are already on your device and it opens with the network off. Most pages on this site are not in that list and will not open offline; this one is covered by a test that disconnects the browser and requires the page to load and its file input to work.',
      },
    ],
  },

  // components/pdf-compress-tool.tsx, lib/tools/pdf/engine.ts (compressPdf,
  // isRecompressibleJpeg), lib/tools/pdf/jpeg-reencode.ts, lib/portal-presets.ts,
  // lib/practice-briefs.ts ('filing-bundle-under-portal-ceiling').
  '/pdf/compress': {
    title: 'Compress PDF Online — Free, No Upload, Real Sizes',
    description:
      'Make a PDF smaller in your own browser, or fit it under a filing portal ceiling. Real before and after sizes, and your original back if it cannot be shrunk.',
    heading: 'About this PDF compressor',
    offlineReady: true,
    directAnswer:
      'To make a PDF smaller in the browser: choose the file, decide whether to re-encode the photos inside it, and run it. The document is rewritten with object streams, eligible JPEGs are optionally re-encoded at the quality and maximum edge you choose, and the real before and after sizes are reported.',
    lead: 'There are two passes here and both are measured rather than estimated. The first is lossless — the file is rewritten using object streams, and the title, author, subject, keywords, producer and creator can be cleared — and it changes nothing visible on the page. The second is optional, and is where the size usually is: embedded JPEGs are decoded and re-encoded through the browser’s own canvas at a quality between 40 and 95 per cent, and scaled down first if their longest edge is over the limit you picked. A PDF that is mostly text has very little to give up, and if the rewritten file is not smaller than the original you are handed your original back, byte for byte, with the page saying exactly that.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'One file of up to 150 MB. Its real size is read and shown, so the before figure you are compared against is the file itself rather than a number you typed.',
      },
      {
        name: 'Decide about the photos',
        text: 'Leave photo re-encoding off for a lossless rewrite that changes nothing visible. Turn it on when the file is large because of scans or photographs, and set the JPEG quality between 40 and 95 per cent and a cap on the longest edge of 4000, 2400, 1600 or 1000 pixels.',
      },
      {
        name: 'Or give it a ceiling to land under',
        text: 'Type a target in KB, or press one of the published portal ceilings, and use Fit under ceiling. It performs up to fourteen real rewrites, bisecting the JPEG quality and then stepping the largest photo edge down, and judges every attempt on the bytes it actually produced.',
      },
      {
        name: 'Run it and read the real numbers',
        text: 'The rewrite happens in this tab. The panel reports the true before and after sizes and how many embedded images were re-encoded — not a predicted saving, and not a percentage the tool cannot substantiate.',
      },
      {
        name: 'Download, or take your original back',
        text: 'If the rewritten file is not actually smaller you are handed your original unchanged, and the page says why. A tool that returned a larger file under a heading about size would be lying about the one thing you came for.',
      },
    ],
    sections: [
      {
        heading: 'Where the bytes in a PDF actually are',
        body: [
          'Most PDFs are one of two things. A text document — a contract, a report, an invoice generated from a template — is mostly glyph positions and font subsets, and there is very little in it to squeeze; a lossless rewrite might take a few per cent off and that is all that is honestly available. A scanned or photo-heavy document is almost entirely embedded images, and it will often halve, because the photographs inside it were embedded at a quality and resolution nobody chose deliberately.',
          'Knowing which of the two you have is the whole game, and it is why this page reports how many images it re-encoded. Nought images re-encoded and a small saving means you have a text document and there is nothing more to get. Forty images re-encoded and a large saving means the photographs were the file.',
        ],
      },
      {
        heading: 'Which images are touched, and which are left alone',
        body: [
          'Only an image stream that can be rewritten without changing how the page renders: a single DCTDecode (JPEG) filter, 8 bits per component, a DeviceRGB or DeviceGray colour space, and no custom decode array or decode parameters. A CMYK photograph, an indexed or separation colour space, or a Flate-encoded image is counted as left alone rather than risk shifting the document’s colour — a print job whose colours moved in compression is a more expensive mistake than a file that stayed large.',
          'A re-encoded image is kept only when its new bytes are genuinely smaller than the old ones. Where they are not, the original image stays in the file. Text and vector content are never touched at all, so the words stay as sharp as they were at any quality setting.',
        ],
      },
      {
        heading: 'Fitting under a filing portal ceiling',
        body: [
          'The common reason to compress a PDF is not tidiness, it is a portal that refuses a file over a stated size. Type that size into the ceiling box and press Fit under ceiling, and the tool performs up to fourteen complete rewrites: it bisects the JPEG quality between 30 and 92 per cent, and where quality alone cannot get there it steps the largest photo edge down through 4000, 2000, 1400, 1000 and 700 pixels. Every attempt is judged on the bytes it actually produced. Nothing here estimates.',
          'Published ceilings are offered as presets — USCIS online filing, Gmail attachments, Income Tax e-filing e-Proceedings attachments, GST appeal supporting documents and GST registration proof documents — and each one is shown next to the page it was read from and the date it was read. Each figure is a stated decimal-MB limit rounded down to whole kibibytes, so the result is under the ceiling whether the portal means megabytes or mebibytes.',
          'That citation is deliberate, and so is the absence of any number in this page’s title or description. A portal can change its limit without announcing it, and a meta description cached by a search engine outlives the change by months — so the figures live beside their source where they can be checked, and a build-time test fails once any of them is more than ninety days old.',
        ],
      },
      {
        heading: 'Why nothing is uploaded',
        body: [
          SEALED_PAGE,
          'That matters more here than on most tools, because the documents people compress are the documents they are about to file: a return, a bundle of bank statements, a set of scanned identity papers.',
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'Which images get re-encoded, and which are left alone?',
        answer:
          'Only an image stream that can be rewritten without changing how the page renders: a single DCTDecode (JPEG) filter, 8 bits per component, a DeviceRGB or DeviceGray colour space, and no custom decode array or decode parameters. A CMYK photo, an indexed or separation colour space, or a Flate-encoded image is counted as left alone rather than risk shifting the document’s colour. The result panel reports how many images were re-encoded.',
      },
      {
        question: 'What do the two photo controls do?',
        answer:
          'Photo quality is a JPEG quality between 40 and 95 per cent, 70 by default. Largest photo edge caps the longest side of an embedded image at 4000, 2400, 1600 or 1000 pixels, and anything bigger is scaled down before re-encoding. A re-encoded image is only kept when its new bytes are genuinely smaller than the old ones; otherwise the original image stays in the file.',
      },
      {
        question: 'What happens if the file cannot be made smaller?',
        answer:
          'You get your original file back unchanged, and the page says the PDF was already as small as it can make it, with a note that a text-heavy PDF has little to squeeze and that the gains come from photos. Returning a larger file under a heading about size would be untrue, so the output is compared with the input before anything is offered.',
      },
      {
        question: 'Can it change the pages or the text?',
        answer:
          'No. Text and vector content are never touched — only image streams are rewritten, and only those that qualify. After the rewrite the file is opened again and its page count compared with the original; a mismatch fails the run rather than producing a file.',
      },
      {
        question: 'What are the limits, and does clearing metadata help?',
        answer:
          'One PDF of up to 150 MB. Clearing the title, author, subject, keywords, producer and creator is switched on by default: it saves very little in bytes, but that metadata often names the person and the software that made the file. Where the browser cannot re-encode images at all, the run falls back to the lossless rewrite and reports that no images were touched.',
      },
      {
        question: 'Can I compress a PDF to a specific size in KB?',
        answer:
          'Yes. Type the size into the ceiling box, or press one of the published portal presets, and use Fit under ceiling. It runs up to fourteen complete rewrites, bisecting JPEG quality between 30 and 92 per cent and stepping the largest photo edge down through 4000, 2000, 1400, 1000 and 700 pixels, and it judges each attempt on the bytes that attempt actually produced rather than on a prediction. It reports one of three outcomes: already under the ceiling and unchanged, reached after so many rewrites at a named quality and edge, or still over — in which case you are given the smallest file it produced and told to split the document or send only the pages that were asked for.',
      },
      {
        question: 'Whose upload limits are offered as presets?',
        answer:
          'USCIS online filing, Gmail attachments on a personal account, Income Tax e-filing e-Proceedings attachments, GST appeal supporting documents and GST registration proof documents. Each is shown with the portal page it was read from and the date it was read, and each stated decimal-MB figure is rounded down to whole kibibytes so the result is under the ceiling on either reading of "MB". Portals change limits without announcing it, so check yours before you rely on any of them.',
      },
    ],
  },

  // components/pdf-to-word-tool.tsx, the text-layer extraction and .docx writer
  // it calls, and e2e/pdf-to-word.spec.ts.
  '/pdf/to-word': {
    title: 'PDF to Word Online — Free, No Upload, No Email',
    description:
      'Pull the text out of a PDF into an editable .docx in your own browser. Reading order, paragraphs, page breaks and headings survive; layout and tables do not.',
    heading: 'About this PDF to Word converter',
    directAnswer:
      'Choose a PDF of up to 150 MB and convert it. The text layer is read in the page, regrouped into lines and paragraphs by the coordinates of the characters, and written to a .docx named after your PDF. This recovers the words, not the page: it is a text extraction, and the page says so above the button.',
    lead: 'A PDF stores glyphs at coordinates, not paragraphs, so reading order, line grouping and paragraph boundaries all have to be reconstructed from geometry — and that reconstruction is what you get. Reading order, paragraphs, page breaks and headings set in larger type do come across. Layout, columns, tables as tables, images and fonts do not, and calling the result a conversion rather than an extraction would be overstating it. A PDF with no text at all — a scan, or a photograph of paper — is refused by name rather than handed back as an empty document, with a button that passes the same file to the character-recognition tool on this site. A file over 150 MB is refused, and in a multi-file run it is skipped with a message naming the limit.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'Up to 150 MB. The file is read into the page; it is not sent anywhere and the copy on your disk is not modified.',
      },
      {
        name: 'The text layer is counted first',
        text: 'Before any conversion runs, the visible characters in the text layer are counted. A total of zero means every page is an image — a scan or a phone photograph — and the run stops there rather than producing an empty Word file.',
      },
      {
        name: 'Lines and paragraphs are rebuilt from coordinates',
        text: 'Characters are grouped into lines by their baselines and lines into paragraphs, a page break is written between every page, and any line set at least 1.18 times the document’s median character size is treated as a heading and written bold at its measured size.',
      },
      {
        name: 'Download the .docx and read the counts',
        text: 'The file takes your PDF’s name. The result panel reports the page count, the paragraph count, the character count and how many pages carried no text, so a part-scanned document cannot be silently half-converted.',
      },
    ],
    sections: [
      {
        heading: 'Why nothing can convert a PDF to Word perfectly',
        body: [
          'It is worth being plain about this, because every tool that claims otherwise is selling something. A Word file describes a document as structure: paragraphs, styles, tables, sections, a flow that reflows when you change the margins. A PDF describes a document as marks on a fixed page: this glyph at this coordinate in this font at this size. Going from Word to PDF throws the structure away deliberately, because fixing the appearance is the whole purpose of the format. Going back means guessing the structure from the marks.',
          'Some of those guesses are safe. Two characters sharing a baseline are on the same line; a gap larger than the leading is a paragraph break; a run of text well above the document’s median size is a heading. Some are not safe at all, which is why this tool does not attempt them: reconstructing a table from the positions of its numbers, or deciding which of two columns a line belongs to, is where a converter starts producing plausible, wrong documents.',
        ],
      },
      {
        heading: 'What is kept, and what is lost',
        body: [
          'Kept: the words, the order they are read in, paragraph breaks, a real page break between every page, bold where the font name says bold, and headings detected by size. Lost: columns, tables as real tables, images, page furniture, colours, margins and the original fonts.',
          'A two-column page is the case to watch. Lines are grouped by baseline, so two characters at the same height on a two-column page are read as one line whichever column they sit in — the text comes out reading across the page rather than down each column. There is no column detection here. If your source is in columns, expect to reorder paragraphs afterwards, or split the pages first.',
          'A table comes through as its text in reading order, which is usually not the shape you want. The PDF to Excel tool on this site is the one that reconstructs a table as a grid, and it shows you the column boundaries it found so you can correct them.',
        ],
      },
      {
        heading: 'What the Word file itself contains',
        body: [
          'A minimal three-part .docx: paragraphs, runs carrying bold and a size, and page breaks. Headings are written as direct formatting rather than as named Word styles, because the file carries no styles part, so they will not show up in Word’s navigation pane.',
          'The page size written into it is fixed at A4 — 11906 by 16838 twips — whatever size the PDF pages were, so a US Letter original will reflow when you open it. Control characters that XML forbids are dropped during the write, because leaving one in makes the whole document refuse to open, which is a worse loss than one glyph.',
        ],
      },
      {
        heading: 'Why the document is not uploaded',
        body: [
          SEALED_PAGE,
          'The documents people convert to Word are drafts, contracts, reports and letters — material that is usually confidential for exactly as long as it is useful. A conventional online converter has your file on its disk for as long as its retention policy says, and you have no way to check the policy is kept.',
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'What happens to a scanned PDF?',
        answer:
          'It is refused, deliberately. The conversion counts the visible characters in the text layer first, and when that total is zero the run stops with a message saying every page is an image, which is what a scan or a phone photograph produces, and that there is nothing to copy into a Word file. The refusal carries a machine-readable reason, which is what lets the page offer you a button to open the same file in the character-recognition tool instead. A file that is not a PDF at all is refused separately, as unreadable.',
      },
      {
        question: 'What is kept, and what is lost?',
        answer:
          'Kept: the words, the order they are read in, paragraph breaks, a real page break between every page, bold where the font name says bold, and headings. Lost: columns, tables as real tables, images, page furniture, colours, margins and the original fonts. A table will come through as its text in reading order, which is usually not the shape you want — the PDF to Excel tool on this site is the one that reconstructs a table as a grid.',
      },
      {
        question: 'How does it decide what a heading is?',
        answer:
          'By size, against the whole document. The median character size across every page is taken as the body size, and any line set at least 1.18 times that is treated as a heading: it is written bold and at its own measured size. A document whose body text is already large and whose headings are only slightly larger will therefore have none detected, and a document with a lot of large display text will have several. Headings are written as direct formatting rather than as named Word styles, because the file carries no styles part, so they will not appear in a navigation pane.',
      },
      {
        question: 'Why is my two-column page mixed up?',
        answer:
          'Because lines are grouped by their baseline. Two characters at the same height on a two-column page are treated as belonging to the same line whichever column they sit in, so a two-column layout reads across the page rather than down each column. There is no column detection in this tool. If the source is in columns, expect to reorder the paragraphs after the conversion, or to split the pages first.',
      },
      {
        question: 'What does the Word file itself look like?',
        answer:
          'A minimal three-part .docx: paragraphs, runs carrying bold and a size, and page breaks. The page size written into it is fixed at A4, 11906 by 16838 twips, whatever size the PDF pages were, so a Letter-size original will reflow when you open it. Control characters that XML forbids are dropped during the write, because leaving one in makes the whole document refuse to open, which is a worse loss than one glyph. The result panel reports the page count, the paragraph count, the character count and how many pages carried no text, so a part-scanned document is not silently half-converted.',
      },
      {
        question: 'Do I have to give an email address to get the file?',
        answer:
          'No. The .docx is written by this page and saved straight to your disk by your own browser. There is no account, no email step, no queue and no watermark, and nothing about the file is metered — the conversion happens on your computer, so there is no per-run cost to recover.',
      },
    ],
  },

  // components/pdf-to-excel-tool.tsx, lib/tools/pdf/{tables,rulings,lattice,
  // cell-flags,statement-values}.ts, components/pdf-grid-overlay.tsx,
  // lib/tools/spreadsheet/xlsx-writer.ts, docs/PDF_TO_EXCEL.md.
  '/pdf/to-excel': {
    title: 'PDF to Excel Online — Free Bank Statement Converter',
    description:
      'Turn a statement or table PDF into .xlsx or CSV in your browser. The column dividers it found are drawn over the page, so you can drag any that landed wrong.',
    heading: 'About this PDF to Excel converter',
    directAnswer:
      'Choose a statement or table PDF of up to 100 MB. The page finds the columns, rebuilds the rows, and shows you the table over an image of the page with the column dividers drawn on it so you can drag any that landed in the wrong place; then you label each column and export .xlsx or .csv. It extracts the one table it finds, not the whole document.',
    lead: 'This is built for the kind of PDF that holds a grid of transactions — a bank or card statement, a ledger, a priced list — and it reconstructs that grid rather than dumping the text. Where the PDF draws its own table borders, the column positions are read from those lines and the panel says so; where it does not, they are worked out from the spacing and the panel says that instead, because an estimate presented as a fact is how a plausible, wrong table gets trusted. Descriptions that wrap onto a second line are merged back into their row, repeated headers on later pages are dropped, and footers such as "Page 1 of 5" or "continued on next page" are stripped. A PDF with no readable text is refused outright rather than guessed at with character recognition, which misreads digits and can corrupt a ledger without saying it has. Nothing outside the table — logos, addresses, covering text, images — is exported.',
    steps: [
      {
        name: 'Choose the statement',
        text: 'One PDF of up to 100 MB, with a real text layer. A scan is refused rather than run through character recognition, because a misread digit in a ledger is worse than no ledger.',
      },
      {
        name: 'Check the column dividers on the page image',
        text: 'The page is drawn with each column boundary on top of it as a real button. Drag one with the mouse, or focus it and move it with the arrow keys, and add or remove dividers as needed. A divider running through the middle of a description is visible at a glance.',
      },
      {
        name: 'Label the columns',
        text: 'Set each column to Date, Description, Debit, Credit, Amount, Running Balance or Ignore. The labels are what turn text into real dates and real numbers in the .xlsx, and columns set to Ignore are left out of both exports.',
      },
      {
        name: 'Work through the flagged cells',
        text: 'Cells with something checkably wrong — two figures in one cell, a non-number in a money column, a missing date, a running balance that does not follow from the row above — are named with their reasons. Most share one cause: a divider in the wrong place.',
      },
      {
        name: 'Export .xlsx or CSV',
        text: 'Both files take your PDF’s name. Editing any cell clears the prepared download, so you cannot save a file that no longer matches what is on screen.',
      },
    ],
    sections: [
      {
        heading: 'Why it shows you the page instead of just the table',
        body: [
          'A table extracted from a PDF is a reconstruction, and the only question that matters is whether the reconstruction is right. A tool that shows you a neat grid and nothing else has hidden the one thing you need in order to check it: where it decided the columns were.',
          'So the page image is drawn with the column boundaries on top of it. A boundary sitting in the middle of a narration field, or one column short on a statement with separate debit and credit columns, is obvious in a second and takes a drag to fix. This is also why the panel distinguishes boundaries read from lines the PDF actually draws from boundaries inferred from the spacing of the text: the first is a fact about the document and the second is a guess, and you are entitled to know which one you are looking at.',
        ],
      },
      {
        heading: 'What it does with numbers, dates and wrapped rows',
        body: [
          'In the .xlsx, a labelled date column becomes real dates and a labelled money column becomes real numbers, when they can be read. The number convention is detected per column, so a European 1.234,56 and an Indian 1,23,456.78 are both read correctly, and separate debit and credit columns, DR and CR markers and lakh grouping are all handled. Anything that cannot be read is written as the original text rather than as a wrong number.',
          'The CSV is deliberately more conservative: dates are written in ISO form and every other value exactly as it appeared, because a CSV has no way to say what a cell is meant to be and the next program to open it will guess.',
          'A narration that wraps onto a second line is rejoined to its row rather than becoming a row of its own, repeated column headers on later pages are dropped, and page furniture such as "Page 1 of 5" is stripped out.',
        ],
      },
      {
        heading: 'Why there is no accuracy percentage anywhere',
        body: [
          'Because the tool cannot measure your document. An accuracy figure would have to be compared against a correct answer, and the correct answer is the thing you came here to produce. Any number in that position is decoration, and a reassuring one is worse than none.',
          'What it does instead is name the cells with something checkably wrong with them: two separate figures sitting in one cell, a money column holding something that is not a number, a date column holding something that is not a date, a missing date, or a running balance that does not continue from the row before. Up to twelve are spelled out with their reasons and the rest stay outlined in the table. That last check is the strongest one available — a balance column that reconciles row by row is arithmetic, not an estimate.',
        ],
      },
      {
        heading: 'Why a bank statement should not be uploaded',
        body: [
          'A statement names your employer, your landlord, your insurer, everyone you pay and everyone who pays you, with dates and amounts. It is one of the most revealing documents most people own, and the usual way to convert one is to post it to a stranger’s server.',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'What happens with a scanned statement?',
        answer:
          'It is refused, with a panel headed "Scanned / Image-Only PDF Refused" naming your file and explaining why. Reading a scan means character recognition, and in a financial table that turns an 8 into a 3 or drops a decimal point without telling you, so the tool declines to produce numbers it cannot stand behind. The panel points you at the three things that do work: download the digital PDF from your banking portal, use the portal’s own export, or scan with your scanner’s searchable-PDF setting so real text is embedded before you come back. A PDF that does have text but no table in it stops separately, with "No tabular statement data could be extracted" and your file’s name, rather than handing you an empty spreadsheet.',
      },
      {
        question: 'How do I fix a column that landed in the wrong place?',
        answer:
          'Drag the divider. The page is drawn with each column boundary on top of it as a real button, so you can drag one with the mouse or focus it and move it with the arrow keys, and you can add or remove a divider as well. A divider running through the middle of a description is visible at a glance, which is the whole reason the page is shown rather than only the table. You can also edit any cell, delete a row and add a row before exporting; changing anything clears the prepared download so you cannot save a stale file.',
      },
      {
        question: 'Do the amounts and dates come out as real numbers?',
        answer:
          'In the .xlsx, yes, when they can be read: you label each column as Date, Description, Debit, Credit, Amount, Running Balance or Ignore, and a labelled date becomes a real date and a labelled money column becomes a real number. The number convention is detected per column, so a European 1.234,56 and an Indian 1,23,456.78 are both read correctly. Anything that cannot be read is written as the original text rather than as a wrong number. The .csv is more conservative: dates are written in ISO form and every other value is written exactly as it appeared, because a CSV has no way to say what a cell is meant to be. Columns you set to Ignore are left out of both files, both downloads take your PDF’s name with a .xlsx or .csv ending, and the sheet inside the workbook is named after the file with the .pdf removed and cut to thirty characters.',
      },
      {
        question: 'How do I know which cells to check?',
        answer:
          'The page names them instead of scoring them. There is no accuracy percentage anywhere, because the tool cannot measure your document. What it does is flag each cell with something checkable wrong with it: two separate figures sitting in one cell, a money column holding something that is not a number, a date column holding something that is not a date, a missing date, or a running balance that does not continue from the row before. Up to twelve are spelled out with their reasons and the rest stay outlined in the table. Most of them share one cause, a column boundary in the wrong place, which is the thing the dividers fix.',
      },
      {
        question:
          'Why is it asking me whether my dates are day or month first?',
        answer:
          'Because your date column is genuinely ambiguous — every value in it works read either way, so 03/04 could be the third of April or the fourth of March. Guessing is how a year of transactions ends up silently shifted, so the page asks and uses your answer for both exports. When the column settles the question by itself, for example because some day is above twelve, no question is asked and the format it settled on is shown to you.',
      },
      {
        question: 'Can it extract more than one table from a document?',
        answer:
          'No. It finds the one table in the document and exports that, which is the right shape for a statement, a ledger or a priced list — the documents it is built for. A report with several unrelated tables on different pages is outside what it does; split the pages first with the extract-pages tool and run each part separately.',
      },
    ],
  },

  // components/pdf-extract-tool.tsx, lib/tools/pdf/engine.ts (extractPdfPages),
  // lib/tools/pdf/page-selection.ts.
  '/pdf/extract-pages': {
    title: 'Extract PDF Pages Online — Free, No Upload',
    description:
      'Pull chosen pages out of a PDF into a new file, in your own browser. Type numbers and ranges, get them in your order, and keep your original untouched.',
    heading: 'About this PDF page extractor',
    directAnswer:
      'To pull selected pages out of a PDF into a file of their own: choose the PDF, type the pages as numbers and ranges — 1-3, 5, 8-10 — and extract. The pages are copied whole into a new document in the order you listed them, and the file on your disk is not modified.',
    lead: 'This is the keep-only-these half of page editing: whatever you list is what the new PDF contains, in your order. The document’s page count is read as soon as you choose it, so a number your file does not have is rejected before any work starts, with the valid range quoted. Duplicates are removed, and one range can cover at most 2,000 pages. Pages come across as pages — content, size and rotation unchanged — because they are copied rather than redrawn; it takes one PDF of up to 150 MB, and an encrypted file is refused with advice to remove its password locally first.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'One file of up to 150 MB. Its page count is read straight away and shown on the page, so you can write your selection against the real number of pages instead of guessing.',
      },
      {
        name: 'Type the pages you want to keep',
        text: 'Numbers and ranges separated by commas — 1-3, 5, 8-10. Spaces around a hyphen are fine. Anything that is not a number or a range is refused with the offending part quoted back, so a typo stops the run rather than quietly extracting the wrong pages.',
      },
      {
        name: 'Extract',
        text: 'The listed pages are copied whole into a new document in the order you wrote them. Nothing is redrawn, so page content, page size and rotation are exactly as they were.',
      },
      {
        name: 'Download the new file',
        text: 'The saved bytes are reopened and the page count compared with how many pages you asked for. A mismatch fails the run rather than offering a download; the panel shows the page count and the input and output sizes.',
      },
    ],
    sections: [
      {
        heading: 'Splitting a PDF without a split button',
        body: [
          'There is no separate split control here, and that is a deliberate simplification rather than a missing feature. Every split anyone actually performs is a description of which pages to keep: the first chapter is 1-12, the appendix is 40-56, the one page you need to send someone is 7. Run the tool once per part and you have your split, with the exact page ranges written down in front of you rather than inferred from a number of parts.',
          'The order you type is the order you get, so 5, 1 gives a two-page file that begins with page five. That makes this the quickest way to pull a small set of pages out in a specific sequence — an exhibit, a quote, a signature page and its annex — without opening a page editor.',
        ],
      },
      {
        heading: 'What is preserved, and what is not',
        body: [
          'The pages themselves are copied, so their content, size and rotation are as they were and nothing is rasterised. Text stays selectable, vectors stay sharp, and an A3 page in the middle of an A4 document is still A3 in the output.',
          'What does not follow is the material around the pages. The output is a newly created document rather than a trimmed copy of the original, so document-level metadata does not come across. Listing a page twice does not produce it twice either — repeats are removed — so the output page count is the number of distinct pages you named.',
        ],
      },
      {
        heading: 'Limits and refusals',
        body: [
          'One PDF of up to 150 MB; larger files are refused when you choose them. A single range may cover at most 2,000 pages. A page number your document does not have is refused with the valid range quoted back at you, which is the useful form of that error — you learn the document is 46 pages long at the same moment you learn page 50 does not exist.',
          'An encrypted PDF is refused with advice to remove its password locally and try again, rather than being partly read. Nothing read from inside a file ever appears in an error message.',
        ],
      },
      {
        heading: 'Why the file stays with you',
        body: [
          SEALED_PAGE,
          'Extraction is often the step before sending something on — one page of a contract, the relevant month of a statement, a single certificate out of a bundle. It would be a strange privacy trade to upload the whole document in order to take one page out of it.',
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'How do I write the page selection?',
        answer:
          'Numbers and ranges separated by commas, such as 1-3, 5, 8-10, with spaces around a hyphen allowed. Anything that is not a number or a range is refused and the offending part is quoted back, so a typo stops the run rather than quietly extracting the wrong pages.',
      },
      {
        question: 'Does the order I type change the order of the output?',
        answer:
          'Yes. Pages appear in the order you list them, so 5, 1 gives a two-page file that starts with page five. Listing a page twice does not produce it twice — repeats are removed — so the output page count is the number of distinct pages you named.',
      },
      {
        question: 'Are the extracted pages altered in any way?',
        answer:
          'The pages themselves are copied, so page content, page size and rotation are as they were, and the file is saved with object streams. What does not follow is the material around the pages: the output is a newly created document rather than a trimmed copy of the original, so document-level metadata does not come across.',
      },
      {
        question: 'How large a PDF can I work with?',
        answer:
          'One file of up to 150 MB. Larger files are refused when you choose them. The page count is read first and shown on the page, so you can write the selection against the real number of pages rather than guessing.',
      },
      {
        question: 'Is the extracted file verified?',
        answer:
          'Yes. After saving it is opened again and its page count compared with how many pages you asked for. If the two do not match the run fails rather than offering a download, and the result panel shows the page count along with the input and output sizes.',
      },
      {
        question: 'How is this different from deleting pages?',
        answer:
          'They are the same operation described from opposite ends. Here you list what to keep; on the organise-pages tool you list the pages you want in the order you want them, and anything left out is dropped. Use this one when the pages you want are the short list, and that one when the pages you want to lose are the short list.',
      },
    ],
  },

  // components/images-to-pdf-tool.tsx, lib/tools/pdf/engine.ts (imagesToPdf,
  // hasImageSignature, FIXED_PAGE_SIZES).
  '/pdf/images-to-pdf': {
    title: 'JPG to PDF Online — Free Image to PDF, No Upload',
    description:
      'Turn JPEG and PNG images into one PDF in your browser. Up to 40 images, A4, Letter or fit-to-image pages, and four margin sizes to choose between.',
    heading: 'About this image to PDF converter',
    directAnswer:
      'To turn JPEG or PNG images into a single PDF: choose the images, set their order with the arrows, pick a page size and a margin, and generate. Each image becomes one page, centred and scaled to fit inside the margins with its proportions kept.',
    lead: 'JPEG and PNG only, up to 40 images and 100 MB in total, one page per image in the order shown on the page. The fixed sizes are A4 (595.28 × 841.89 points) and US Letter (612 × 792), with orientation matched to each image or forced to portrait or landscape; choosing "Fit each image" instead makes every page exactly the size of its image plus the margin and never enlarges the image. Margins are none, small, medium or large — 0, 12, 24 or 36 points. Every file is verified against its declared type by its own signature bytes, so something renamed to .png that is not a PNG is refused rather than embedded.',
    steps: [
      {
        name: 'Add the images',
        text: 'Up to 40 JPEG or PNG files, 100 MB in total. Each file’s bytes are checked against its declared type — a JPEG must begin FF D8 FF, a PNG with the eight-byte PNG signature — so a mislabelled or truncated file is refused before it can become a blank page.',
      },
      {
        name: 'Put them in order',
        text: 'One image becomes one page, top to bottom in the list. Each row has arrows to move it earlier or later. This is the step worth doing carefully: a scanned document out of order is the most common way this job goes wrong.',
      },
      {
        name: 'Choose a page size and margin',
        text: 'A4 or US Letter, with orientation matched to each image or forced to portrait or landscape; or "Fit each image", which builds every page around its own image and never enlarges it. Margins are 0, 12, 24 or 36 points.',
      },
      {
        name: 'Generate and download',
        text: 'The PDF is built in this tab, reopened, and its page count compared with the number of images you supplied before a download is offered.',
      },
    ],
    sections: [
      {
        heading: 'Two ways to lay the pages out, and when to use each',
        body: [
          'A4 and US Letter give you a document that prints and files like any other: every page the same size, each image centred and scaled to fill the printable area with its proportions kept. That is what you want for a receipt bundle, a set of scanned forms, or anything that will be printed, stapled or filed alongside other paper.',
          '"Fit each image" instead makes every page exactly the size of its image plus the margin, and never enlarges the image. That is what you want when the images are screenshots, artwork or photographs of different shapes and you care more about them being shown at their own size than about a uniform page. It is also the setting that avoids a small screenshot being blown up to fill an A4 sheet and looking soft.',
        ],
      },
      {
        heading: 'What happens to your photographs',
        body: [
          'Nothing is resized or re-encoded by this tool. The bytes you chose are handed to the PDF library’s JPEG or PNG embedder exactly as they are. The page size and margin change how the image is scaled when the page is displayed or printed; they do not change the image data written into the file.',
          'That means the output can be large if the inputs are large — forty twelve-megapixel photographs make a large PDF, because all forty photographs are inside it. If the size matters more than the resolution, run the result through the PDF compressor on this site, which will re-encode the embedded JPEGs at a quality you choose and report the real before and after sizes.',
        ],
      },
      {
        heading: 'Formats it does not accept, and why it checks',
        body: [
          'JPEG and PNG only. HEIC, WebP, TIFF, GIF and SVG are not accepted here. HEIC in particular catches people out, because it is what a modern iPhone produces by default — export or convert those to JPEG first.',
          'The signature check exists because a file extension is a claim, not a fact. Renaming a HEIC file to .png does not make it a PNG, and a converter that trusts the name embeds bytes the reader cannot draw, producing a PDF with a blank or broken page that you will only notice after sending it. Checking the first bytes turns that into an error you see immediately.',
        ],
      },
      {
        heading: 'Why the images never leave the tab',
        body: [
          SEALED_PAGE,
          'Photographs are among the most revealing files people convert — they carry faces, documents, whiteboards, and often an embedded GPS location from the phone that took them. If the location is the concern, the photo metadata tool on this site strips EXIF from the images before you bring them here.',
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'Which image formats are accepted?',
        answer:
          'JPEG and PNG. The bytes are checked against the type before embedding — a JPEG must begin FF D8 FF and a PNG with the eight-byte PNG signature — so a mislabelled or truncated file is refused and the page it would have become is never written. HEIC, WebP, TIFF, GIF and SVG are not accepted here.',
      },
      {
        question: 'How many images can go into one PDF?',
        answer:
          'Up to 40, and 100 MB across all of them. Both are checked as you add files, and adding more than 40 is refused with that number named. Files are placed one per page, top to bottom in the list, and each row has arrows to move it before you generate.',
      },
      {
        question: 'How is each image placed on its page?',
        answer:
          'Centred, with its aspect ratio kept, scaled to fit the page minus the margin on all four sides. On A4 or US Letter an image smaller than the printable area is scaled up to fill it; with "Fit each image" the page is built around the image, so the image is used at its own pixel size and never enlarged. A margin that would leave no printable area is refused.',
      },
      {
        question: 'Does it re-compress my photos?',
        answer:
          'The tool itself does not resize or re-encode them: the bytes you chose are passed to the PDF library’s JPEG or PNG embedder as they are. The page size and margin change how the image is scaled when the page is displayed or printed, not the image data that goes into the file.',
      },
      {
        question: 'Is the generated PDF checked?',
        answer:
          'Yes. It is loaded again after saving and its page count compared with the number of images you supplied; a mismatch fails the run. The producer is set to "Browser Tools" and the creation date to the moment the file was made.',
      },
      {
        question: 'Can I convert a HEIC photo from my iPhone?',
        answer:
          'Not directly — HEIC is not accepted, and renaming it will not help because the file is checked on its own signature bytes rather than its extension. Export the photos as JPEG from the Photos app, or set the camera to Most Compatible, and bring the JPEGs here.',
      },
    ],
  },

  // components/pdf-bates-tool.tsx, lib/tools/pdf/bates.ts,
  // lib/tools/pdf/signature-placement.ts, lib/tools/pdf/bates.test.ts.
  '/pdf/bates': {
    title: 'Bates Numbering PDF Online — Free, No Upload',
    description:
      'Stamp one unbroken Bates sequence across a whole bundle of PDFs in your browser. Prefix, start number, padding, six positions and matching page labels.',
    heading: 'About this Bates numbering tool',
    directAnswer:
      'Add the PDFs of a bundle, put them in the order you want with the up and down arrows, set a prefix, a starting number and a padding width, and stamp. Every page of every file is numbered, and the count carries on from one file into the next, so a two-page exhibit followed by a three-page exhibit runs 000001 to 000005 across both. Your originals are never touched: each file is stamped in the page and offered as a new download.',
    lead: 'Bates numbering is the practice of putting one unbroken sequence across a whole production so any page can be cited by number, and that is what this does: prefix, a zero-padded number, optional suffix, on every page, continuing across the files in the list. The stamp is drawn into the page content in Helvetica at the size and margin you choose, and it is placed by the page as a reader shows it, so it sits upright and in the right corner on pages that carry a rotation of 90, 180 or 270 degrees and on pages with a crop box that does not start at the origin. There is no page-range box: the range is the whole bundle, and leaving pages out means leaving files out or splitting them first. Up to 100 MB of PDFs in total, checked as you add them, and an encrypted file is named and refused rather than half-read.',
    steps: [
      {
        name: 'Add the bundle in order',
        text: 'Add every PDF in the production and move them with the arrows until the list is in exhibit order. The order of this list is the order of the sequence, so it is worth getting right before stamping rather than after.',
      },
      {
        name: 'Set the format',
        text: 'A prefix, a starting number from zero upwards, padding of 4, 5, 6, 7 or 8 digits or none, and an optional suffix. The page shows the range your current settings would produce before you run anything.',
      },
      {
        name: 'Choose where the stamp sits',
        text: 'Six positions — top or bottom, left, centre or right — with bottom right as the default, a margin of 18, 24, 36, 48 or 72 points, and Helvetica at 8, 9, 10, 11, 12 or 14 point.',
      },
      {
        name: 'Stamp, and collect the files',
        text: 'Each file comes back separately with -bates added to its name, and when there is more than one you also get the whole bundle merged into a single exhibit-bundle-bates.pdf carrying the same numbers.',
      },
    ],
    sections: [
      {
        heading: 'Why the placement code is the hard part',
        body: [
          'Stamping text into the bottom right corner of a PDF page sounds trivial and is not, because "the bottom right corner" is a property of how a reader shows the page, not of the coordinate system the page is drawn in. A page can carry a rotation of 90, 180 or 270 degrees, which turns the drawing without moving the origin, and it can carry a crop box that starts somewhere other than the origin, so the visible page is a window onto a larger canvas.',
          'A tool that ignores either produces numbers sideways, upside down, or off the edge of the visible page — which in a production is worse than no numbers, because the defect is discovered by the other side. This one computes the placement against the page as a reader shows it, so the stamp is upright and in the corner you chose on rotated and cropped pages alike, and that behaviour is covered by tests in lib/tools/pdf/bates.test.ts.',
        ],
      },
      {
        heading: 'Page labels, so the reader agrees with the stamp',
        body: [
          'By default the tool also writes page labels into the document. Page labels are the part of a PDF a reader uses for its own page-number box, so a page stamped EXHIBIT-000042 is shown by the reader as EXHIBIT-000042 rather than as page 42 of 60. The merged bundle gets the same labels across all of its pages.',
          'That matters when someone is reading on screen and citing as they go: with labels written, the number they can see in the reader is the number they should cite. Turning the option off leaves the visible stamp in place and puts the reader back on ordinary counting.',
        ],
      },
      {
        heading: 'What it refuses, and what it will not do',
        body: [
          'It refuses a password-protected or encrypted PDF, named as such — remove the password locally and try again. It refuses a file that will not parse, reporting the failure by file name. It refuses a PDF with no pages in it. And it refuses a prefix or suffix containing a character the standard PDF fonts cannot write: the offending character is named back to you, which is what happens with a rupee sign or an emoji, and ordinary letters, numbers or punctuation are asked for instead.',
          'There is no page-range box and no per-file restart. The whole point of a Bates sequence is that it is unbroken across the production, so the range is the bundle. To leave pages out, leave the file out or split it first with the extract-pages tool.',
          'The stamp is ordinary page content rather than an annotation, so it cannot be switched off in a reader afterwards — which is the behaviour a production requires. There is no white box behind it, so it is drawn over whatever is already in that corner; if it lands on existing content, move it to another corner or increase the margin and run it again.',
        ],
      },
      {
        heading: 'Why a legal bundle should not be uploaded',
        body: [
          'A production is privileged or confidential material, usually under an obligation you have personally given. Posting it to a third-party server to have numbers put on it is a disclosure, whatever the service’s policy says, and the policy is not something you can verify.',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'What does the number look like, and can I change it?',
        answer:
          'It is a prefix, then the number padded with leading zeros, then an optional suffix — EXHIBIT-000001 by default. The prefix and suffix are free text, the starting number is yours from zero upwards, and the padding is 4, 5, 6, 7 or 8 digits or none at all, so PLTF-0005-CONF and DOC-7 are both available. A number longer than the padding is not cut: with six-digit padding, page one million stamps as 1000000. The page shows you the range the current settings would produce before you run it.',
      },
      {
        question: 'Does the numbering continue across several files?',
        answer:
          'Yes, and that is the reason to use it on a bundle rather than a file at a time. The files are stamped top to bottom in the list, and the count carries straight on, so three exhibits of two, three and one pages run 000001 to 000002, then 000003 to 000005, then 000006. Each file comes back separately with -bates added to its name, and when there is more than one file you also get the whole bundle merged into a single exhibit-bundle-bates.pdf carrying the same numbers. Your originals are not written to: every file is read into the page, stamped on a copy held in memory, and offered to you as a new download.',
      },
      {
        question: 'Where does the stamp go on the page?',
        answer:
          'Any of six positions — top left, top centre, top right, bottom left, bottom centre, bottom right — with bottom right as the default. The margin is 18, 24, 36, 48 or 72 points from the edge and the type is Helvetica in black at 8, 9, 10, 11, 12 or 14 point. There is no white box behind it, so the number is drawn over whatever is already in that corner; if a stamp lands on existing content, move it to another corner or increase the margin and run it again. It is ordinary page content rather than an annotation, so it cannot be switched off in a reader afterwards.',
      },
      {
        question: 'Will the page numbers in my reader match the stamps?',
        answer:
          'Yes, unless you switch it off. By default the tool also writes page labels into the document, which is the part of the file a reader uses for its own page-number box, so a page stamped EXHIBIT-000042 is shown as EXHIBIT-000042 rather than as page 42 of 60. The merged bundle gets the same labels across all its pages. Turning the option off leaves the visible stamp in place and the reader back on ordinary counting.',
      },
      {
        question: 'What will it refuse?',
        answer:
          'A password-protected or encrypted PDF, named as such — remove the password locally and try again. A file that will not parse, reported as a failure to parse that file by name. A PDF with no pages in it. And a prefix or suffix holding a character the standard PDF fonts cannot write: the tool names the offending character back to you, which is what happens to a rupee sign or an emoji, and asks for ordinary letters, numbers or punctuation instead.',
      },
      {
        question: 'Does it work on rotated or cropped pages?',
        answer:
          'Yes, and that is one of the things it is careful about. The stamp is placed against the page as a reader displays it, so on a page carrying a rotation of 90, 180 or 270 degrees, or a crop box that does not start at the origin, the number still sits upright and in the corner you chose rather than sideways or outside the visible area.',
      },
    ],
  },

  // components/pdf-ocr-tool.tsx, lib/tools/ocr/{assets,runtime,layout}.ts,
  // lib/tools/pdf/{ocr-render,ocr-pdf}.ts, docs/OCR.md, e2e/pdf-ocr.spec.ts.
  '/pdf/ocr': {
    title: 'OCR PDF Online — Free Searchable PDF, No Upload',
    description:
      'Add an invisible English text layer to a scanned PDF in your own browser, keeping the visible pages exactly as they are. The download size is stated first.',
    heading: 'About this PDF OCR tool',
    directAnswer:
      'Choose an image-only PDF of up to 50 pages. The page first checks whether the document already has selectable text, and only if it does not does it load the English recogniser — at most 9,832,213 bytes, stated on the button before you press it. Each page is rendered, recognised, and given an invisible text layer over the original page, so the document looks identical and is now searchable. The plain text is offered as a separate download.',
    lead: 'This adds a text layer; it does not redraw your pages. The recognised words are written in PDF text rendering mode 3 — the mode that draws nothing — positioned over the page image that was already there, so search, selection and copy start working while the visible document is byte-for-byte the one you scanned. Recognition uses Tesseract in its own dedicated Web Worker, served from this site with no content delivery network in the path, and it is English only. A PDF that already contains selectable text is refused before a single OCR asset is requested, because re-recognising digital text can only introduce mistakes.',
    steps: [
      {
        name: 'Choose the scanned PDF',
        text: 'Up to 150 MB and up to 50 pages. The page count is read first, so a document that is too long is refused before any work or any download begins.',
      },
      {
        name: 'The text-layer check runs first',
        text: 'If the PDF already has selectable text, the run stops with a note saying so and a link to the PDF-to-Word tool. Nothing from the recogniser is downloaded in that case — an end-to-end test records every request under /ocr/ and requires the list to be empty.',
      },
      {
        name: 'Press the button, which names its own cost',
        text: 'The button reads "Check scan, then download 9,832,213 bytes (9.38 MiB) and run OCR". That is the worker, the English model and one compatible WebAssembly core; your browser then caches them, so later runs cost nothing extra to download.',
      },
      {
        name: 'Save the searchable PDF, or just the text',
        text: 'Pages are rendered at twice their natural size, capped at 16 megapixels, and recognised one after another with a progress readout. You get the searchable PDF and, separately, a plain .txt of everything recognised.',
      },
    ],
    sections: [
      {
        heading: 'Why an invisible layer rather than a rebuilt page',
        body: [
          'There are two ways to make a scan searchable. One is to recognise the text and then typeset a new document from it, which is what a converter does — and it means every mistake the recogniser made is now the document. The other is to leave the scanned page exactly as it is and place the recognised words invisibly on top of it, so the picture you trust is what people read, and the text is only there for searching, selecting and copying.',
          'This tool does the second. The words are drawn in text rendering mode 3, which renders nothing at all, in the standard Helvetica font, at positions taken from where the recogniser found them. An independent check proves the layer is real: the end-to-end test runs the system pdftotext binary — a completely separate implementation — over the saved file and requires it to return the words that were on the page.',
        ],
      },
      {
        heading: 'What the confidence numbers mean, and what they do not',
        body: [
          'Every page in the result table carries the confidence the recogniser itself reported, to one decimal place. That is a measurement, not a promise: it tells you how sure the engine was, not whether it was right. The page says so in as many words — check names, numbers and punctuation.',
          'OCR is probabilistic in a way that matters most exactly where accuracy matters most. A digit misread in a reference number, a decimal point lost in an amount, a name with an unusual spelling — these are the failures that survive a casual read. Skewed pages, handwriting, low contrast and heavy JPEG artefacts are where they cluster.',
        ],
      },
      {
        heading: 'Limits, and what it will not do',
        body: [
          'English only. The engine is created with the single language code eng and no other model is served, so text in another script will either be misread as English or produce nothing useful.',
          'Up to 50 pages per run, so the tab stays responsive, and up to 150 MB. The invisible layer uses a standard font, so characters outside basic Latin are normalised or dropped from that layer — the plain-text download keeps what the recogniser actually returned. Rotated or unusually transformed source pages can have less exact selection geometry even when search and extraction work.',
          'A PDF that already has selectable text is refused rather than processed, with a link to the PDF-to-Word tool, which is the one you actually want in that case.',
        ],
      },
      {
        heading: 'Why the scan never leaves your device',
        body: [
          'The recogniser and its English model are static files served from this site, and the worker that reads them is created directly from a same-origin script rather than from a blob, specifically so it inherits the narrow policy scoped to those asset paths rather than a broader one. No third-party origin is reachable at any point, and your document is never one of the things fetched — it is read into the page from your own disk.',
          'The scale of the download is disclosed on the button rather than in the small print, and the number is tied to the exact bytes checked into this repository by a test that fails the build if a dependency update makes it stale.',
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'How much does it download, and when?',
        answer:
          'At most 9,832,213 bytes — about 9.38 MiB — made up of a 111,307-byte worker, a 2,952,873-byte English model and one WebAssembly core of roughly 6.7 MB, whichever of the three cores your browser’s SIMD support calls for. Nothing is downloaded when you open the page, and nothing is downloaded when you choose a file: the download begins only when you press the button, which names the figure. Your browser caches all three afterwards.',
      },
      {
        question: 'Does the OCR change how my pages look?',
        answer:
          'No. The original page content is kept and the recognised words are added in PDF text rendering mode 3, which draws nothing. The document looks exactly as it did; what changes is that search, selection and copy now work. The receipt reports how many pages were preserved and how many words were placed.',
      },
      {
        question: 'Which languages does it recognise?',
        answer:
          'English only. The engine is created with the single language code eng and no other model file is served, so another script will be misread as English or return nothing useful.',
      },
      {
        question: 'Why did it refuse my PDF?',
        answer:
          'Most often because the PDF already contains selectable text, in which case re-recognising it could only introduce mistakes; the page says so and offers the PDF-to-Word tool instead, and it refuses before requesting any OCR asset at all. Otherwise: a file over 150 MB, a document over the 50-page limit, a page that could not be rasterised, or a browser without canvas rendering.',
      },
      {
        question: 'How accurate is it?',
        answer:
          'There is no single number, and anyone quoting one for your document is guessing. What you get instead is the confidence the recogniser reported for each page, to one decimal place, in a table. Treat it as a signal about which pages to check rather than as a guarantee, and read names, numbers and punctuation yourself before relying on the result.',
      },
      {
        question: 'Can I get just the text without the PDF?',
        answer:
          'Yes. Both downloads are offered side by side after a run: the searchable PDF, named after your file with -searchable added, and a plain UTF-8 .txt with -ocr added. Take whichever you need; neither requires an account.',
      },
    ],
  },

  // components/pdf-sign-tool.tsx, lib/tools/pdf/{sign-form-state,
  // signature-placement,signature-ink}.ts, e2e/pdf-sign.spec.ts.
  '/pdf/sign': {
    title: 'Sign PDF Online Free — Fill and Sign, No Upload',
    description:
      'Fill a PDF form and draw or type a signature onto it in your own browser. Place it by clicking the page, then flatten it so nobody can edit your entries.',
    heading: 'About this fill and sign tool',
    directAnswer:
      'Choose a PDF of up to 150 MB. Every fillable field is listed with a control matching its kind — text, tick box, dropdown, multi-select — and you complete them, then draw a signature on the pad or type your name, place it by clicking the page outline, and finish. "Make it final" is on by default: it prints your values into the page and removes the form so the next person cannot edit them.',
    lead: 'This draws or types a signature; it does not certify one. The result is an image on the page, the same as signing a printout and scanning it — it includes neither digital certificate nor cryptographic audit log, so it proves nothing about who signed or when. Where a document demands a qualified or digital signature, this is not that, and the page says so before you choose a file. It also refuses outright to touch a PDF that already carries a digital signature, because any change would break it. Form fields accept basic Latin text for now, and when a character cannot be written the page names the character and the field rather than failing vaguely.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'Up to 150 MB. The form is inspected in a Web Worker and you get a summary: how many pages, and how many fillable fields.',
      },
      {
        name: 'Fill the fields',
        text: 'Each field gets the control its type calls for, required fields are badged, and fields that cannot be edited are listed separately with the reason — locked by the document, rich text kept so its formatting survives, a duplicated name, unreadable, or calculated by the form itself.',
      },
      {
        name: 'Draw or type the signature',
        text: 'Draw on the pad, or type your name. The pad draws in the theme’s foreground colour so it is visible in dark mode, and the copy stamped onto the page is always dark ink.',
      },
      {
        name: 'Place it',
        text: 'Click the page outline to centre the signature at that point, or press Enter to centre it on the page, or type the page, width, distance from the left and distance from the top. It is always pulled back inside the page before it is drawn.',
      },
      {
        name: 'Finish, and decide about flattening',
        text: 'Leave "Make it final" on to bake the values into the page and remove the form; turn it off while the document is still going round. The receipt says whether the fields are final or still editable.',
      },
    ],
    sections: [
      {
        heading: 'What "make it final" actually does',
        body: [
          'A filled PDF form is not the same thing as a completed document. The values sit in form fields, which means the next person to open it can change them, and some readers show a different value from the one you typed. Flattening prints the values into the page as ordinary content and removes the form, so what you see is what everyone sees and nothing can be edited afterwards.',
          'It also removes hidden fields. A form can carry fields that are never displayed — internal scores, routing codes, notes — and a filled but unflattened PDF carries them onward to whoever you send it to. An end-to-end test on this tool fills such a form, flattens it, and requires that the hidden values are absent from the page content of the result.',
          'Where a form calculates a field itself, that calculation does not run here, and the page warns you by name before flattening: a calculated total may not match what you changed, and once flattened it cannot be recalculated.',
        ],
      },
      {
        heading: 'Where the signature lands, on any page',
        body: [
          'Placing an image on a PDF page is only simple when the page is unrotated and starts at the origin. A page can carry a rotation of 90, 180 or 270 degrees, and a crop box offset from the origin, and either one turns naive coordinates into a signature that is sideways, upside down or off the visible page.',
          'The placement here is computed against the page as a reader shows it, and an end-to-end test checks the result on a rotated page and on a page with an offset crop box, reading the transformation matrix out of the saved file to confirm the stamp landed upright at the chosen corner. A placement past the page edge is pulled back inside before it is drawn rather than refused.',
        ],
      },
      {
        heading: 'What it refuses, and why',
        body: [
          'A PDF that already carries a digital signature is blocked entirely — fields, the finish button and the flatten option are all disabled. Any modification, even adding a drawn signature, would invalidate that signature, and a tool that quietly broke it would be worse than one that declines. Ask the sender for an unsigned copy.',
          'A dynamic XFA form is blocked too: it draws its own pages from form data, so it cannot be filled, signed or flattened here. A static XFA form is allowed, with a warning that every save removes the XFA part, so readers will show the ordinary form from then on.',
          'A character the standard PDF fonts cannot write stops the run with that character named — a rupee sign, an accented letter outside Western European, Devanagari, Vietnamese or Chinese. A typed or drawn signature is an image, so any script works there; it is only the form fields that are limited.',
        ],
      },
      {
        heading: 'Why a document you are signing should not be uploaded',
        body: [
          'The documents people sign are leases, offers, consents, agreements and forms full of identifiers. Signing one on a conventional web service means handing the counterparty’s document, your details and your signature image to a third party, and taking their retention policy on trust.',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'Is this a legally binding digital signature?',
        answer:
          'No, and the page says so before you choose a file. What it produces is an image on the page — the same thing as signing a printout and scanning it. It carries no certificate, no timestamp authority and no audit trail, so it proves nothing about who signed or when. Where a document demands a qualified electronic or digital signature, use software built for that.',
      },
      {
        question: 'What happens if my PDF is already digitally signed?',
        answer:
          'Nothing is changed. The tool detects it, explains that any modification would break the existing signature, and disables the fields, the finish button and the flatten option. There is no override, because the alternative is silently invalidating a signature someone is relying on. Ask the sender for an unsigned copy, or use the software the document was prepared with.',
      },
      {
        question: 'Should I leave "Make it final" switched on?',
        answer:
          'Leave it on when you are the last person to touch the document. It prints the values into the page, removes the form so nobody can edit your entries, and drops hidden fields that would otherwise travel on. Turn it off while the document is still going round and others still need to fill their parts. Required fields must be filled before flattening; the page names the ones still empty.',
      },
      {
        question: 'Why will it not accept a rupee sign or an accented name?',
        answer:
          'Form fields are written with the standard PDF fonts, which cover basic Latin and most Western European letters and no more. When a character falls outside that, the run stops and names both the field and the exact character, including its code point, rather than dropping it silently. A typed or drawn signature is an image rather than text, so any script works there.',
      },
      {
        question: 'Can I sign a PDF that has no form fields?',
        answer:
          'Yes. The page says the PDF has no fillable form fields and lets you place a signature anyway; the receipt then reports that no form was present alongside where the signature went. Page count and existing content are unchanged.',
      },
      {
        question: 'Can I do it entirely with the keyboard?',
        answer:
          'Yes, and that is covered by a test. You can tab through the fields, type a signature rather than drawing it, type the page, width and offsets digit by digit, and press Enter on the page outline to centre the signature. A width typed one digit at a time is not clamped after the first digit, which is the usual way a numeric placement control becomes unusable without a mouse.',
      },
    ],
  },

  // components/pdf-redact-tool.tsx, lib/tools/pdf/apply-redaction.ts,
  // lib/tools/redaction/detectors.ts, lib/tools/pdf/redaction-proof.test.ts,
  // e2e/pdf-redact.spec.ts, docs/PDF_REDACT.md.
  '/pdf/redact': {
    title: 'Redact PDF Online — Free, Text Truly Removed',
    description:
      'Black out text in a PDF so the words are gone, not hidden. Redacted pages are rasterised, and metadata, bookmarks, attachments and annotations are purged.',
    heading: 'About this PDF redaction tool',
    directAnswer:
      'Load a PDF, then mark what has to go: search for a name or phrase, scan for secrets such as email addresses, card numbers, IP addresses and API keys, or draw a box on the page. Applying the redaction rasterises every page that carries a mark, burns the black boxes into the image, and purges the document’s metadata, bookmarks, attachments and annotations. Pages with nothing to redact are copied through untouched and stay selectable.',
    lead: 'The reason redaction fails in the wild is that a black rectangle drawn over text is a drawing over text: the words are still in the file, and anyone can select them, copy them, or read them out of the raw bytes. This tool does not do that. A page with a redaction on it is rendered to an image at the resolution you choose, the black boxes are painted into that image, and the image becomes the page — so the characters are not hidden, they are absent. The cost is honest and stated: a redacted page is no longer selectable, searchable or vector, and the file grows. Pages without redactions keep all of that, because they are never rasterised.',
    steps: [
      {
        name: 'Load the PDF and pick a resolution',
        text: 'Redacted pages are rasterised at 150, 200 or 300 DPI — 200 by default. Higher keeps more detail and makes a larger file; the receipt reports the output size and the DPI used.',
      },
      {
        name: 'Mark by search',
        text: 'Type a name, a phrase or an amount and mark every occurrence, with optional case sensitivity and whole-word matching. This needs a text layer; a scan has none, and the page says so and leaves you the drawing tool.',
      },
      {
        name: 'Or scan for secrets',
        text: 'Five detector groups: email addresses, credit card numbers, IP addresses, API keys and private keys. Card numbers must carry a published issuer prefix and pass the Luhn check, so a random sixteen-digit order number is not mistaken for one.',
      },
      {
        name: 'Or draw a box',
        text: 'Drag on the page to place a box, or add one and move it. Arrow keys nudge a box by one point, or ten with Shift; Delete removes it. Everything staged is listed by page so you can see what you have marked before committing.',
      },
      {
        name: 'Apply, then read the audit',
        text: 'The panel reports how many pages were rasterised, how many were preserved as vector text, how many redactions were burned in, and the time taken, followed by a list of what was purged document-wide.',
      },
    ],
    sections: [
      {
        heading: 'How the removal is proved, not asserted',
        body: [
          'A test in this repository redacts a contract and then attacks the result. It asks PDF.js for the text content of the redacted page and requires zero text items. It inflates every compressed stream in the file and searches the decompressed bytes for each secret, case-insensitively, because a string that survives compression survives a search. It checks the document title, author and subject are empty and that the catalogue carries no metadata, outlines or names tree. And it compares against a frozen extraction made with Poppler’s pdftotext — a completely independent implementation — requiring every secret to be absent and every public string still present.',
          'A second test renders the redacted page back to pixels and measures the darkness of each redacted rectangle, requiring more than half of it to be dark. The comment records the measurement: the shipped code covers between 77.6 and 84.7 per cent of each target, and with the black rectangle removed the same regions read 5.6 to 10.5 per cent. That is what distinguishes covering the pixels from covering only the text layer.',
        ],
      },
      {
        heading: 'What is purged beyond the pages',
        body: [
          'Redaction that only deals with the visible page leaves the rest of the document talking. Every output from this tool has its document information dictionary cleared — title, author, subject, keywords, producer and creator — its XMP metadata packet removed, its outlines and bookmarks dropped, its names tree removed along with embedded files, attachments and JavaScript, its open action and additional actions removed, and its annotations stripped from every page.',
          'That list matters because those are the places a name survives a careful visual redaction: a bookmark that still reads the client’s name, an attached spreadsheet nobody remembered, a comment in an annotation layer, or the author field naming the person who prepared it.',
        ],
      },
      {
        heading: 'The honest cost, and what it will not do',
        body: [
          'A redacted page becomes an image. It is no longer selectable or searchable, its text is no longer vector, and the file is larger than it was. Pages you did not mark are copied verbatim and keep everything. This is a deliberate trade: the only way to be certain a character is gone is for the page not to contain characters.',
          'Searching and secret detection both need an embedded text layer. A scanned PDF has none, and the page says so plainly and offers the drawing tool instead — it will not silently find nothing and let you believe the document is clean.',
          'It does not bypass passwords. An encrypted PDF is refused with a message asking you to decrypt it first. And a sub-word box is an approximation: the rectangle around part of a word is computed from an average character width, so on a proportional font a partial redaction can sit slightly loose or slightly tight. Redact the whole word where that matters.',
        ],
      },
      {
        heading: 'Why redaction in particular must not be uploaded',
        body: [
          'The documents people redact are the documents they are under an obligation to protect: a contract before disclosure, a medical record, a police file, a bank statement going to a landlord. Uploading one to a third-party service in order to remove the confidential part of it is a contradiction, and it is the moment the information is most concentrated and least protected.',
          SEALED_PAGE,
          'The detectors are careful about this too: a detection carries the offsets of the match and never the matched text, and the label shown in the staged list is masked, so a card number appears as four asterisk groups and its last four digits rather than in full.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is the text really removed, or just covered?',
        answer:
          'Really removed, on any page carrying a redaction. That page is rendered to an image, the black boxes are painted into the image, and the image replaces the page — so there are no characters left to select, copy or recover from the raw bytes. A test in this repository asks PDF.js for the page’s text and requires zero items, inflates every compressed stream and searches the decompressed bytes for each secret, and compares against a frozen Poppler extraction. A second test measures the pixels and requires the rectangles to be genuinely dark.',
      },
      {
        question: 'What happens to pages I did not redact?',
        answer:
          'They are copied through untouched and stay exactly as they were: selectable, searchable, vector, at their original quality. Only pages carrying at least one mark are rasterised. The receipt reports both counts — pages redacted and rasterised, and pages preserved as vector text — so you can see which trade you actually made.',
      },
      {
        question: 'Can it find sensitive data for me?',
        answer:
          'It can find five kinds: email addresses, credit card numbers, IP addresses, API keys and private keys. Card matching requires 13 to 19 digits, a published issuer prefix and a passing Luhn check together, so a long order number is not flagged as a card. Around twenty named key formats are recognised, including PEM private keys and the token formats used by several major providers. Detection needs a text layer, so it does nothing on a scan.',
      },
      {
        question: 'What else is removed besides the marked text?',
        answer:
          'Document-wide, and from every page: the document information dictionary (title, author, subject, keywords, producer, creator), the XMP metadata packet, outlines and bookmarks, the names tree with its embedded files and JavaScript, the open action and additional actions, and all annotations. Those are the places a name survives a careful visual redaction.',
      },
      {
        question: 'Does redacting reduce the quality of my document?',
        answer:
          'On the pages it touches, yes, and the page does not pretend otherwise. A rasterised page is an image at the DPI you chose — 150, 200 or 300 — so it is no longer selectable or searchable and the file is larger. Choose 300 DPI when the page will be printed or read closely. Pages with no redactions are unaffected.',
      },
      {
        question: 'Will it open a password-protected PDF?',
        answer:
          'No. An encrypted or password-protected PDF is refused with a message asking you to decrypt or unlock it first. This tool does not bypass passwords or encryption, and it will not half-read a file it cannot fully parse.',
      },
    ],
  },

  // components/pdf-metadata-tool.tsx, lib/tools/pdf/metadata.ts,
  // e2e/pdf-metadata.spec.ts.
  '/pdf/metadata': {
    title: 'PDF Metadata Remover — See It, Then Strip It Free',
    description:
      'See every piece of identity a PDF carries — properties, the XMP packet most tools miss, dates and the file identifier — then remove all of it in your browser.',
    heading: 'About this PDF metadata viewer and remover',
    directAnswer:
      'Choose a PDF of up to 100 MB. The page reads everything the file says about itself and groups it in four panels — document properties, the XMP packet, dates, and the file identifier — and then removes all of it in one action, saving a copy with -no-metadata added to the name. The pages themselves are untouched; this changes only what describes the file.',
    lead: 'A PDF usually names the person who made it, the software that made it, when it was made and when it was last changed, and it carries a pair of hashes that link every copy of the document to one another. Most of that is in two places at once — a document information dictionary and an XMP packet — and a tool that clears only the first leaves the author’s name sitting in the second, which is exactly the bug this tool was written to fix. There is deliberately no partial mode: an interface offering to clear the author while keeping the packet that also holds the author would be offering a choice that does not do what it says.',
    steps: [
      {
        name: 'Choose or drop the PDF',
        text: 'Up to 100 MB. The whole document is read into the page, which is why there is a limit; nothing is sent anywhere.',
      },
      {
        name: 'Read what it found',
        text: 'Four panels: document properties (title, author, subject, keywords, creator, producer), the XMP packet with its own title, author, description, authoring tool, producer, dates and document lineage identifier, the creation and modification dates, and whether a file identifier is present.',
      },
      {
        name: 'Remove all of it',
        text: 'One button. The information dictionary and the XMP packet are unlinked and deleted from the document’s object table, and the file identifier is cleared. Unlinking alone was not enough — the earlier version left a name in the output bytes because every registered object is still written.',
      },
      {
        name: 'Download the cleaned copy',
        text: 'The file is saved with -no-metadata added to its name, and the page reports how many entries were removed. Your original is not modified.',
      },
    ],
    sections: [
      {
        heading: 'The two places a PDF keeps your name',
        body: [
          'The document information dictionary is the old mechanism and the one every reader shows in its properties box. The XMP packet is the newer one, an XML block carried inside the file, and most applications write both. They do not always agree, and clearing one does not clear the other.',
          'This is the usual way a "cleaned" PDF still names its author. The panels here show the two separately, with the XMP entries labelled as such, so you can see when a document is saying the same thing twice — and after the run, a test in this repository reads the saved bytes and requires both to be gone, along with the lineage identifier.',
        ],
      },
      {
        heading: 'The file identifier, and why it matters',
        body: [
          'A PDF carries a pair of hashes in its trailer, intended to identify the document and its revisions. They are not secret and they say nothing about you directly — but they are the same across copies of the same document, which makes them a reliable way to tell that two files sent by two different people came from one original.',
          'That is occasionally exactly what you want, and occasionally exactly what you do not. The page reports whether an identifier is present and removes it with everything else, because there is no honest way to describe a document as anonymised while leaving a value in it that links it back to its source.',
        ],
      },
      {
        heading: 'What it will not do',
        body: [
          'It removes what describes the file, not what is printed on the pages. A name in the text of the document is still in the text of the document; that is a job for the redaction tool on this site, which removes the characters rather than the description.',
          'When a PDF carries no metadata at all, the button is switched off and the page says so, rather than handing you back an identical file under the word "cleaned". There is no partial mode, and encrypted PDFs cannot be inspected without their password.',
          'Nothing on the page is changed: no rasterising, no re-saving of content, no page count change. A test asserts the page count is identical after a clean, and another asserts the tool does not stamp itself as the new producer or write a fresh modification date — which is what a naive rewrite does, replacing one piece of identifying metadata with another.',
        ],
      },
      {
        heading: 'Why a metadata tool in particular should run locally',
        body: [
          'There is a particular absurdity in uploading a document to a stranger’s server in order to remove the parts of it that identify you. The upload itself is the disclosure, and it happens before any cleaning takes place.',
          SEALED_PAGE,
          'An end-to-end test on this page records every network request the browser makes while a file with a full metadata set is read and cleaned, and requires that none of them went off-origin.',
        ],
      },
    ],
    faqs: [
      {
        question: 'What exactly does it show me?',
        answer:
          'Four groups. Document properties: title, author, subject, keywords, creator and producer. The XMP packet, listed separately: title, author, description, authoring tool, producer, created and modified dates, and the document lineage identifier. Dates: created and modified. And whether a file identifier is present — the pair of hashes that link copies of a document to each other.',
      },
      {
        question: 'Why clear everything rather than let me choose?',
        answer:
          'Because the same fact is usually stored twice. An interface offering to clear the author while keeping the XMP packet — which also holds the author — would be offering a choice that does not do what it says. One action removes the information dictionary, the XMP packet and the file identifier together, which is the only version of this that can be described honestly.',
      },
      {
        question: 'Does it change the pages or the text?',
        answer:
          'No. It removes what describes the file, not what is printed on it, and a test asserts the page count is identical afterwards. If a name appears in the text of the document, use the redaction tool on this site instead — that one removes the characters rather than the description of the file.',
      },
      {
        question: 'Will the cleaned file say it was made by this tool?',
        answer:
          'No, and that took some care. The obvious way to write a PDF back out stamps the writing library as the new producer and a fresh modification date, which replaces one piece of identifying metadata with another. A test requires the cleaned file to carry neither.',
      },
      {
        question: 'What happens if my PDF has no metadata?',
        answer:
          'The page says so and the button is switched off. You are not handed back an identical file under the word "cleaned", and nothing is rewritten — the original bytes are left exactly as they are.',
      },
      {
        question: 'What are the limits?',
        answer:
          'One PDF of up to 100 MB, because the whole document is read into the page’s memory. There is no page limit. An encrypted PDF cannot be inspected without its password; remove the password locally and try again.',
      },
    ],
  },

  // components/pdf-compare-tool.tsx, lib/tools/diff/pdf/*,
  // e2e/pdf-compare.spec.ts, lib/tools/diff/pdf/reflow.test.ts.
  '/pdf/compare': {
    title: 'Compare Two PDFs Online — Free Redline, No Upload',
    description:
      'Find what changed between two PDF drafts in your browser. Survives reflow, reports moved clauses as moves, and exports a redline, an annotated PDF and a CSV.',
    heading: 'About this PDF comparison tool',
    directAnswer:
      'Load the original and the revised PDF and compare. The text of both is read out with each word’s position, the two streams are aligned, and the result is a list of insertions, deletions, moved clauses and formatting-only changes, each shown on the page it occurs on. Export an annotated PDF, a Word redline with real tracked changes, or a CSV change list.',
    lead: 'The hard problem in comparing contract drafts is reflow. Adding one sentence to page one pushes every later line along, and a comparison that works line by line reports the whole document as changed — which is the same as reporting nothing. This aligns word by word instead: common text at the start and end is trimmed, the middle is aligned with a longest-common-subsequence pass, and only genuine differences survive. A test builds two ten-page documents differing by a single added sentence on page one and requires pages two to ten to come back clean.',
    steps: [
      {
        name: 'Load both documents',
        text: 'The original goes in Document A, the revised in Document B. There is also a Load Sample Contracts button that generates a pair in memory, if you want to see what the output looks like before using your own.',
      },
      {
        name: 'Compare',
        text: 'Both documents are read in parallel, every word recorded with its page, position, size and whether it is bold, and the two streams aligned.',
      },
      {
        name: 'Read the five counts',
        text: 'Substantive changes (insertions, deletions and moves together), insertions, deletions, moved clauses and formatting-only changes. Formatting is counted separately so a restyled heading does not inflate the number that matters.',
      },
      {
        name: 'Work through the changes',
        text: 'Both documents are drawn side by side with each change as a focusable box — green added, red deleted, orange moved, indigo formatting. The inspector below filters by type and searches the text of the changes.',
      },
      {
        name: 'Export what you need',
        text: 'An annotated PDF with the changes drawn on the revised document, a .docx redline carrying real tracked-change markup, or a CSV change list with the change id, type, both page numbers, the description and both texts.',
      },
    ],
    sections: [
      {
        heading: 'Why a moved clause is reported as a move',
        body: [
          'When a clause is relocated, a naive comparison reports it twice: once as a deletion where it used to be and once as an insertion where it now is. On a contract that has been reordered, that turns a tidy edit into pages of apparent rewriting, and the reviewer has to work out for themselves that nothing was actually changed.',
          'Here, a deleted block and an inserted block whose normalised text is exactly equal, and which are each at least three words long, are recognised as one move. The change reads "Clause moved from Page 4 to Page 2", both page numbers are given, and it is counted in its own column rather than as two substantive changes.',
        ],
      },
      {
        heading: 'Formatting changes, kept out of the way',
        body: [
          'A word whose weight changed, or whose size moved by more than 1.5 points, is a formatting change and nothing else. These are real and sometimes matter — a defined term that stopped being bold, a heading demoted — but they are not amendments, and mixing them into the same count as inserted text makes the count useless.',
          'They are detected only among text that is otherwise identical, counted separately, drawn in their own colour, and filterable on their own tab. The "substantive changes" figure at the top deliberately excludes them.',
        ],
      },
      {
        heading: 'What it exports, and what each one is for',
        body: [
          'The annotated PDF draws a translucent box over each change on the revised document, with deletions also struck through, in the same four colours as the viewer. It is the version to send to somebody who needs to see the changes in place.',
          'The Word redline is a real tracked-changes document: insertions, deletions and moves are written with the OpenXML markup Word uses for them, authored as "OpenTools Redline", so it opens in Word with the changes reviewable and acceptable one by one. It is the version for a negotiation.',
          'The CSV lists every change with its id, type, the page in each document, the description and both the prior and the revised text. It is the version for a schedule of amendments, or for anyone who wants to sort and filter.',
        ],
      },
      {
        heading: 'What it cannot do, and the number it refuses to print',
        body: [
          'It compares text. Changes to images, tables as tables, vector drawings and page furniture are not detected, and a document whose meaning changed because a figure was replaced will show nothing.',
          'It cannot read a scan. A document with no text layer is refused by name, with a link that hands the file to the OCR tool on this site so real text can be added first.',
          'And there is no similarity percentage anywhere on this page. A "94% match" is a number with no defensible definition — percentage of what, weighted how — and it is exactly the sort of figure a reviewer stops reading after. An end-to-end test checks the rendered page does not contain one.',
          SEALED_PAGE,
        ],
      },
    ],
    faqs: [
      {
        question:
          'Does it cope when one added sentence pushes everything down?',
        answer:
          'Yes — that is the case it was built for. Comparison is word by word rather than line by line: the common text at the beginning and end is trimmed away and the middle aligned with a longest-common-subsequence pass, so reflow does not register as change. A test builds two ten-page documents that differ by a single sentence added to page one and requires pages two to ten to be reported as unchanged.',
      },
      {
        question:
          'How does it handle a clause that was moved rather than edited?',
        answer:
          'A deleted block and an inserted block whose normalised text matches exactly, each at least three words long, are recognised as one move rather than as a deletion plus an insertion. The change reads "Clause moved from Page 4 to Page 2" with both page numbers, and moves are counted in a column of their own.',
      },
      {
        question: 'What can I export?',
        answer:
          'Three things. An annotated PDF, with a translucent coloured box over each change on the revised document and a strikethrough on deletions. A Word redline (.docx) carrying real tracked-change markup — insertions, deletions and moves — so Word shows them as reviewable changes. And a CSV change list with the change id, type, the page in each document, the description and both the prior and revised text.',
      },
      {
        question: 'Why is there no accuracy or similarity percentage?',
        answer:
          'Because there is no honest definition of one. A percentage would have to say what it is a percentage of and how each change is weighted, and any answer to that is arbitrary — while the number itself is the thing a reader remembers and stops checking after. The page gives you counts you can verify and a list you can walk, and a test asserts no percentage-match figure appears on the page.',
      },
      {
        question: 'Can it compare scanned documents?',
        answer:
          'Not directly. A document with no text layer is refused by name, and the page links to the OCR tool on this site so you can add a real text layer to the scan first and then come back. Comparing scans by pixel would report every difference in scanning as a change to the contract.',
      },
      {
        question: 'Are formatting changes counted as changes?',
        answer:
          'Counted, but separately. A word whose weight changed or whose size moved by more than 1.5 points is a formatting-only change: it gets its own count, its own colour and its own filter tab, and it is deliberately excluded from the substantive-changes figure at the top.',
      },
    ],
  },

  /*
    The page-tools family: `/pdf/page-tools` and the six operations that have a
    page of their own. They are ONE component and ONE pass over the document --
    reorder, delete, rotate, number, watermark and write metadata all happen in
    the same run, and every control is on every one of these seven URLs. Each
    entry below says so, because a page whose heading promises one thing and
    whose form offers six is only honest if it explains why.

    Sources: components/pdf-page-tools.tsx, lib/tools/pdf/engine.ts
    (transformPdfPages), lib/tools/pdf/page-selection.ts,
    lib/tools/catalog.ts (PDF_PAGE_OPERATIONS),
    e2e/canvas-and-pdf-tools.spec.ts ('PDF page tools').
  */

  '/pdf/page-tools': {
    title: 'Organise PDF Pages Online — Free, No Upload',
    description:
      'Reorder, delete, rotate, number, watermark and label a PDF in one local pass. Type the pages in the order you want, and the result is checked before download.',
    heading: 'About this PDF page organiser',
    offlineReady: true,
    directAnswer:
      'Choose a PDF, type the page numbers in the order you want them — 3, 1-2 — set a rotation, a watermark, page numbers and document metadata as needed, and apply. Everything happens in a single pass: the listed pages are copied into a new document in your order, anything you leave out is dropped, and the saved file is reopened and checked before a download is offered.',
    lead: 'This is one pass over one document, which is why all six jobs share a screen: reordering and deleting are the same box, and rotating, numbering, watermarking and writing metadata all happen while the pages are being copied. Doing them separately would mean four rewrites of the same file. It takes one unencrypted PDF of up to 150 MB, copies pages whole so nothing is rasterised and no quality is lost, and verifies the result twice — the page count against what you asked for, and every page’s rotation against a whole quarter turn.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'One file of up to 150 MB, checked on its first five bytes. Its page count is read straight away and the order box is filled in with the whole document, so you edit down from a correct starting point.',
      },
      {
        name: 'Say which pages, in which order',
        text: 'Commas separate entries and a hyphen makes a range. The order you type is the order you get, and any page you leave out is left out of the file — which is how deleting works here.',
      },
      {
        name: 'Add anything else that belongs in the same pass',
        text: 'A rotation applied to every page, a watermark of up to 80 characters, centred page numbers, and a title, author, subject and keywords for the document.',
      },
      {
        name: 'Apply and download',
        text: 'The work runs in a Web Worker. The saved bytes are reopened, the page count compared with what you asked for and every rotation checked to be a multiple of 90, before the file is offered as edited-pages.pdf.',
      },
    ],
    sections: [
      {
        heading: 'Why one screen rather than six',
        body: [
          'Every job on this page is a decision made while pages are being copied from one document into another. Reordering is the order of the copy; deleting is a page not copied; rotating sets a property on the copy; numbering and watermarking draw onto it; metadata is written on the document that receives it. Splitting them into six tools would mean rewriting the same file up to six times, and each rewrite is another chance to lose something.',
          'Each of the six also has an address of its own, because "rotate PDF" and "add a watermark to a PDF" are different things to search for and a single page with one title cannot answer both. What those addresses change is the heading and the explanation; the form is the same form, and it says so.',
        ],
      },
      {
        heading: 'The page order box, in detail',
        body: [
          'Commas separate entries, a hyphen makes a range, and spaces around a hyphen are fine. Any number outside your document is refused with the valid range quoted back, and a single range may cover at most 2,000 pages.',
          'Two refusals are deliberate. A page listed twice appears once — repeats are dropped — so if you need a page twice, extract it separately and merge it back in at the position you want. And a backwards range such as 10-1 is refused with the right way round suggested, rather than silently reversing itself: a range that quietly means the opposite of what it says is a worse outcome than an error message.',
        ],
      },
      {
        heading: 'What the pass preserves, and what it does not',
        body: [
          'Pages are copied, not redrawn. Page content, page size and orientation are untouched, text stays selectable, and vector drawings stay sharp at any zoom.',
          'What does not follow is the material around the pages. The output is a newly created document, so document-level metadata from the source does not come across: what gets written is whatever you type into the title, author, subject and keywords boxes, plus a producer of "Browser Tools". Bookmarks, form behaviour, attachments and certification state are not guaranteed either — the scope is visible page content and order, and the page states that at the bottom rather than in a footnote.',
        ],
      },
      {
        heading: 'Where it runs',
        body: [
          SEALED_PAGE,
          'This is one of the pages held in the service worker cache, so after a first visit its code is already on your device.',
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'Why does every page-tool URL show the same form?',
        answer:
          'Because it is one pass over the document. Reordering, deleting, rotating, numbering, watermarking and writing metadata are all decisions taken while the pages are copied into a new file, and doing them in six separate runs would rewrite the same document six times. Each job has its own address because each is a different thing to search for, and each page names its job in the heading — but the controls beneath are, honestly, the same controls.',
      },
      {
        question: 'How do I delete pages here?',
        answer:
          'Leave them out of the order box. There is no separate delete control: on a ten-page document, typing 2-9 keeps eight pages and drops the first and the last. Reordering and removing are the same pass, so you can do both at once.',
      },
      {
        question: 'Can I repeat a page, or reverse the document?',
        answer:
          'Neither. Repeated numbers are dropped, so 1, 1, 2 produces a two-page file; extract the page separately and merge it back in if you need it twice. And a backwards range such as 10-1 is refused with 1-10 suggested, because a range that silently reversed itself would be a different operation from the one you typed. To reverse a document, write the numbers out in the order you want.',
      },
      {
        question: 'Is the result checked before I download it?',
        answer:
          'Yes, twice. The saved file is loaded again and its page count compared with the number of pages you asked for, and every page’s rotation is checked to be a whole quarter turn. A mismatch fails the run instead of producing a file.',
      },
      {
        question: 'What are the limits?',
        answer:
          'One unencrypted PDF of up to 150 MB, and at most 2,000 pages in any single range you type. An encrypted file is refused with advice to remove its password locally first. A watermark is capped at 80 characters and accepts basic Latin only.',
      },
      {
        question: 'Does it change the quality of my pages?',
        answer:
          'No. Pages are copied whole rather than redrawn, so nothing is rasterised: text stays selectable, vectors stay sharp, images are the same images, and a page of a different size in the middle of the document keeps its size.',
      },
    ],
  },

  '/pdf/rotate-pdf': {
    title: 'Rotate PDF Online — Free, Saves the Rotation',
    description:
      'Turn every page of a PDF by a quarter turn and save it that way, in your own browser. Nothing is rasterised, and every page is checked before you download.',
    heading: 'About this PDF rotation tool',
    directAnswer:
      'To turn the pages of a PDF: choose the file, leave the page list as it is, pick 90°, 180° or 270° clockwise, and apply. The angle you choose is added to each page’s existing rotation, and after saving the file is opened again and every page checked to be sitting on a whole quarter turn.',
    lead: 'Rotation here is a page property, not a redraw: the page content is copied unchanged and only the rotation value moves, so nothing is rasterised and no quality is lost. One angle applies to every page in the output, so turning only some pages means listing just those pages, running it, and putting the file back together afterwards — there is no per-page angle on this screen. The same pass also reorders and removes pages, adds page numbers and a watermark, and writes document metadata, because all of those are decisions taken while the pages are copied. It takes one PDF of up to 150 MB, and an encrypted file is refused with advice to remove its password locally first.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'One file of up to 150 MB. The page order box fills itself in with the whole document, so leaving it alone rotates everything.',
      },
      {
        name: 'Pick the angle',
        text: 'No rotation, 90° clockwise, 180° or 270° clockwise. For an anticlockwise quarter turn, choose 270°.',
      },
      {
        name: 'Apply',
        text: 'The angle is added to whatever rotation each page already carries and reduced modulo 360, and the pages are copied into a new document in a Web Worker.',
      },
      {
        name: 'Download',
        text: 'Before the file is offered, it is reopened and every page’s rotation checked to be a multiple of 90. A page that is not fails the run rather than producing a file.',
      },
    ],
    sections: [
      {
        heading: 'Why a saved rotation is different from a viewer rotation',
        body: [
          'Most PDF readers have a rotate button, and it does not change the file. Turn the page, close the reader, send the document, and the recipient sees it exactly as sideways as you first did. That is the problem people are usually trying to solve when they look for a rotation tool: the scan came out of the feeder the wrong way round and the file itself needs fixing.',
          'This writes the rotation into the document. A PDF page carries a rotation attribute — a number of degrees a reader is instructed to turn the page before showing it — and this sets that attribute. Everyone who opens the file afterwards sees it the right way up, including print drivers and anything that extracts the pages later.',
        ],
      },
      {
        heading: 'Why nothing is redrawn',
        body: [
          'The alternative implementation is to render each page to an image, turn the image, and write that back as the page. It works, and it destroys the document: the text stops being text, the vectors stop being vectors, the file multiplies in size and the page stops being searchable.',
          'Rotating the attribute instead is lossless by construction. The page content is copied byte for byte and only the rotation value moves, so a rotated contract is still selectable, still searchable, still sharp at any zoom, and the same size it was.',
          'The angle is added to the rotation already on the page rather than replacing it. A page already turned 90° that you rotate 90° again ends up at 180° — which is what you would expect from pressing a rotate button twice, and not what a tool that overwrote the value would give you.',
        ],
      },
      {
        heading: 'The limitation worth knowing before you start',
        body: [
          'One angle applies to every page in the output. There is no per-page angle on this screen, so a document where pages three and seven came out sideways and the rest are fine cannot be fixed in a single run.',
          'What works is two passes: put just the pages that need turning into the page list, rotate them, and merge that file back with the rest using the PDF merger on this site. It is more steps than a per-page control would be, and it is stated here rather than discovered halfway through.',
          'Everything else on this screen runs in the same pass, so if the document also needs reordering, a watermark or page numbers, do it all at once rather than saving between each one.',
        ],
      },
      {
        heading: 'Where the file goes',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'Which angles are available?',
        answer:
          'No rotation, 90° clockwise, 180°, or 270° clockwise. The angle is added to whatever rotation the page already carries and reduced modulo 360, so a page already turned 90° that you rotate 90° again ends up at 180°. To turn a page anticlockwise, choose 270°.',
      },
      {
        question: 'Can I rotate one page and leave the others alone?',
        answer:
          'Not in a single pass — the angle applies to every page in the output. What works is to put only the pages that need turning into the page list, rotate them, and merge that file back with the rest afterwards.',
      },
      {
        question: 'Does rotating redraw or degrade the pages?',
        answer:
          'No. The rotation is stored as a page attribute and the page content is copied as it is, so there is no rasterising and no loss of text or vectors. After saving, the file is reopened and every page’s rotation is checked to be a multiple of 90 before the download is offered; if any page is not, the run fails.',
      },
      {
        question:
          'Will the rotation stick when I send the file to someone else?',
        answer:
          'Yes. This writes the rotation into the document rather than turning it in a viewer, so everyone who opens the file sees it the right way up, and so does anything that prints or extracts the pages later. A reader’s own rotate button does not change the file at all, which is why a document keeps coming back sideways.',
      },
      {
        question: 'What else changes when I apply?',
        answer:
          'The pages are copied into a newly created document, so document-level metadata from the source does not come across: what gets written is whatever you type into the title, author, subject and keywords boxes, plus a producer of "Browser Tools". A watermark of up to 80 characters is drawn across the middle of each page at 20 per cent opacity when you enter one, and page numbers, when switched on, are set in 10 pt Helvetica centred near the foot of the page.',
      },
      {
        question:
          'Why does this page also show a watermark box and a page order field?',
        answer:
          'Because it is one pass over the document and those are decisions taken during the same copy. Rotating, reordering, deleting, numbering, watermarking and writing metadata all happen in one run; separating them would rewrite the same file several times over. The heading names the job you came for, and the other controls are there if you want them.',
      },
    ],
  },

  '/pdf/reorder-pdf-pages': {
    title: 'Reorder PDF Pages Online — Free, No Upload',
    description:
      'Put the pages of a PDF into any order by typing the numbers. Pages are copied whole, and the page count is verified against what you asked for.',
    heading: 'About this PDF page reorderer',
    directAnswer:
      'To put a PDF’s pages into a different order: choose the file and type the page numbers in the order you want them, such as 3, 1-2. The pages are copied into a new document in exactly that order, and any page you leave out of the list is left out of the file.',
    lead: 'The page list is the whole interface: commas separate entries, a hyphen makes a range, and the order you type is the order you get. Leaving a page out removes it, which is why the same box is also how pages are deleted. Two things it will not do: a page listed twice still appears once, because repeats are dropped, and a range that runs backwards is refused with the right way round suggested — so a document cannot be reversed by typing 10-1. It takes one unencrypted PDF of up to 150 MB, and the pages themselves are copied whole, so their content, size and orientation are untouched.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'One file of up to 150 MB. The page count is read immediately, so you write your order against the real number of pages.',
      },
      {
        name: 'Write the order you want',
        text: 'Numbers and ranges, separated by commas. On a three-page document, 3, 1-2 moves the last page to the front. On a fifty-page one, 1, 12-20, 2-11, 21-50 moves a whole section.',
      },
      {
        name: 'Apply',
        text: 'The pages are copied into a new document in exactly the order you wrote, in a Web Worker so the tab stays responsive.',
      },
      {
        name: 'Download',
        text: 'The saved bytes are reopened and the page count compared with the number of pages you asked for, and every rotation checked. A mismatch fails the run rather than handing you a file.',
      },
    ],
    sections: [
      {
        heading: 'Typing an order beats dragging thumbnails',
        body: [
          'Dragging page thumbnails is the familiar interface and it is fine for moving one page. It is miserable for anything else: moving a twelve-page section to the front of a fifty-page document means twelve drags, each of which can land one slot out, and there is no record afterwards of what you did.',
          'A list of numbers is exact, repeatable and reviewable. You can read it back before you commit, paste the same order into a second document, or write it down in a note for the next time the same bundle arrives. On a long document it is also very much faster.',
          'The starting point is filled in for you — the whole document in its current order — so you are editing a correct list rather than writing one from nothing.',
        ],
      },
      {
        heading: 'Reordering and deleting are one operation',
        body: [
          'There is no separate delete box here, and none is needed: the output is exactly the pages you listed, so a page you do not list is a page that is gone. On a ten-page document, typing 2-9 keeps eight pages and drops the first and the last.',
          'That also means you can do both at once. Removing a cover sheet and moving an appendix to the front is one run and one list, not two passes over the same file.',
        ],
      },
      {
        heading: 'What it refuses, and why each refusal is deliberate',
        body: [
          'A page number your document does not have is refused with the valid range quoted back — so you learn how long the document actually is at the same moment you learn page 60 does not exist. A single range may cover at most 2,000 pages.',
          'A page listed twice appears once. Repeats are dropped rather than duplicated, because a page order is a description of a sequence and the tool that quietly doubles a page is harder to trust than the one that tells you it will not. If you need a page twice, extract it into its own file and merge that in at the position you want.',
          'A backwards range is refused, with the right way round suggested. It would be easy to make 10-1 mean "pages ten down to one", and it would mean that a typo in a long list silently reverses a section of the document. Reversing means writing the numbers out.',
        ],
      },
      {
        heading: 'Nothing is uploaded, and nothing is redrawn',
        body: [
          'Pages are copied rather than rendered, so content, size and orientation come across untouched: text stays selectable and vectors stay sharp. The output is a new document, so document-level metadata from the source does not follow — what is written is whatever you type into the metadata boxes, plus a producer of "Browser Tools".',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'How do I write the page order?',
        answer:
          'Page numbers and ranges separated by commas — 3, 1-2 moves page three to the front of a three-page file. Spaces around a hyphen are accepted. Any number outside your document is refused with the valid range quoted back, and a single range may cover at most 2,000 pages.',
      },
      {
        question: 'Can I repeat a page so it appears twice?',
        answer:
          'No. Repeated numbers are dropped, so 1, 1, 2 produces a two-page file. If you need a page twice, extract it into its own file and merge that file in at the position you want.',
      },
      {
        question: 'Can I reverse a document by typing 10-1?',
        answer:
          'No. A backwards range is refused and the message suggests 1-10 instead, because a range that silently reversed itself would be a different operation from the one you typed. Reversing means writing the numbers out in the order you want them.',
      },
      {
        question: 'How do I delete pages rather than reorder them?',
        answer:
          'Leave them out of the list. There is no separate delete box: on a ten-page document, typing 2-9 keeps eight pages and drops the first and the last. Reordering and removing are the same pass, so you can do both at once.',
      },
      {
        question: 'Is the result checked before I download it?',
        answer:
          'Yes. The saved file is loaded again and its page count compared with the number of pages you asked for, and every page’s rotation is checked to be a whole quarter turn. A mismatch fails the run instead of producing a file.',
      },
      {
        question:
          'Why are there rotation, watermark and metadata controls on this page?',
        answer:
          'Because reordering is one decision inside a single pass over the document, and those are others. The pages are copied once, and the rotation, the watermark, the page numbers and the metadata are applied during that copy. Use them if you need them; ignore them and the reorder happens on its own.',
      },
    ],
  },

  '/pdf/delete-pdf-pages': {
    title: 'Delete Pages from PDF Online — Free, No Upload',
    description:
      'Remove pages from a PDF by listing the ones you want to keep. Pages are copied whole, and the result is verified against your selection before download.',
    heading: 'About this PDF page remover',
    directAnswer:
      'To remove pages from a PDF: choose the file and type the pages you want to keep, such as 2-9 on a ten-page document. Anything you leave out of the list is left out of the new file, which is copied page by page and then checked against your selection before a download is offered. Your original is not modified.',
    lead: 'Deleting is expressed as keeping, and that is not a quirk of the interface — it is the safer way round. A list of pages to remove is easy to write and hard to check: you cannot tell by reading it whether the result is the document you wanted. A list of pages to keep is the document, in order, and you can read it back before you commit. The box is pre-filled with your whole document, so removing the first and last pages of a ten-page file means editing 1-10 down to 2-9. One unencrypted PDF of up to 150 MB, pages copied whole so nothing is rasterised, and the same pass also reorders, rotates, numbers, watermarks and writes metadata.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'One file of up to 150 MB. Its page count is read and the box is filled with the whole document — 1 to however many pages there are.',
      },
      {
        name: 'Edit the list down to what you want to keep',
        text: 'Remove the numbers you do not want. Dropping page 4 from a ten-page document means typing 1-3, 5-10. Commas separate entries, a hyphen makes a range.',
      },
      {
        name: 'Apply',
        text: 'Only the listed pages are copied into the new document, in the order you listed them. The work runs in a Web Worker and the file on your disk is not touched.',
      },
      {
        name: 'Download',
        text: 'The saved file is reopened and its page count compared with the number you asked for before it is offered as edited-pages.pdf.',
      },
    ],
    sections: [
      {
        heading: 'Why you list what to keep, not what to remove',
        body: [
          'Both descriptions produce the same file, but only one of them can be checked. "Remove 4, 9 and 17" tells you nothing about what you are left with; "keep 1-3, 5-8, 10-16, 18-24" is the document. Read it back and you know exactly how long the result will be and what order it is in, before anything is written.',
          'It also collapses two jobs into one. Since the output is exactly the list, the same box that removes the blank page after the cover also moves the appendix to the front, if you write it that way. There is no separate reorder step and no second save.',
          'The box starting out as your whole document is what makes this practical. You are never writing a page list from scratch; you are editing one that is already correct.',
        ],
      },
      {
        heading: 'Removing blank pages, cover sheets and duplicates',
        body: [
          'The common reasons to remove pages are the same three: a scanner that fed a blank sheet, a cover or fax header nobody needs, or a duplicate page from a double feed. The page count is read and shown as soon as you choose the file, so you can check the arithmetic — a twenty-four page document that should be twenty-three tells you one page got in twice.',
          'A number outside your document is refused with the valid range quoted back, which is the useful form of that error: you find out the document is 46 pages long at the same moment you find out page 50 does not exist.',
        ],
      },
      {
        heading: 'What survives, and what does not',
        body: [
          'The pages you keep are copied whole. Content, page size and orientation are untouched, text stays selectable, vector drawings stay sharp, and a landscape page in the middle of a portrait document stays landscape.',
          'What does not follow is the material around the pages. The output is a newly created document, so document-level metadata does not come across; what gets written is whatever you type into the title, author, subject and keywords boxes, plus a producer of "Browser Tools". Bookmarks, form behaviour, attachments and certification state are outside the stated scope, which is visible page content and order.',
          'Deleting a page removes it from this new file. It does not remove it from the file on your disk, which is not written to at all — so a mistake costs you a download, not a document.',
        ],
      },
      {
        heading: 'Why it never leaves the tab',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'How do I delete a single page from the middle?',
        answer:
          'List everything except that page. On a ten-page document, dropping page four means typing 1-3, 5-10. The box starts out filled with your whole document, so you are editing a correct list rather than writing one.',
      },
      {
        question: 'Why is there no "pages to delete" box?',
        answer:
          'Because a list of removals cannot be checked by reading it, and a list of what to keep is the document itself. You can read the result back before anything is written, and the same box also lets you reorder while you are there. Both forms produce the same file; only one of them shows you what you are about to get.',
      },
      {
        question: 'Does deleting pages change my original file?',
        answer:
          'No. The file on your disk is read but never written to. The pages you keep are copied into a brand new document that is offered to you as a download, so a mistake costs you a download rather than a document.',
      },
      {
        question: 'Is the result verified?',
        answer:
          'Yes. The saved file is opened again and its page count compared with the number of pages you asked to keep, and every page’s rotation checked to be a whole quarter turn. A mismatch fails the run instead of producing a file.',
      },
      {
        question: 'What are the limits?',
        answer:
          'One unencrypted PDF of up to 150 MB, and at most 2,000 pages in any single range you type. A page number your document does not have is refused with the valid range quoted back. An encrypted file is refused with advice to remove its password locally first.',
      },
      {
        question:
          'Can I delete pages and rotate or watermark at the same time?',
        answer:
          'Yes, and that is why those controls are on this screen. It is one pass over the document: the pages are copied once, and the rotation, page numbers, watermark and metadata are applied during that copy. Doing them as separate jobs would rewrite the same file several times.',
      },
    ],
  },

  '/pdf/pdf-page-numbers': {
    title: 'Add Page Numbers to PDF Online — Free, No Upload',
    description:
      'Number every page of a PDF before you send it, in your own browser. Centred at the foot of the page in 10 pt Helvetica, numbered by position in the output.',
    heading: 'About this PDF page numbering tool',
    directAnswer:
      'To number the pages of a PDF: choose the file, tick "Add page numbers", and apply. Every page in the output gets its number set in 10 pt Helvetica, centred and 18 points up from the bottom edge. The numbering follows the output, so if you also reorder or remove pages in the same run the numbers come out consecutive in the new order.',
    lead: 'This adds a printed number to each page, which is not the same thing as a page label — it is ink on the page, so it survives printing, flattening and extraction, and it cannot be switched off in a reader. The style is fixed: 10 pt Helvetica in near-black, horizontally centred, 18 points from the foot of the page. There is no prefix, no "Page 1 of 20" format, no position choice and no starting number, and saying so plainly is better than letting you search for controls that are not there. What there is instead is that the numbering happens in the same pass as reordering and deleting, so the numbers always match the document you actually produced.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'One unencrypted file of up to 150 MB. The page order box is filled with the whole document, so leaving it alone numbers everything.',
      },
      {
        name: 'Decide the final page order first',
        text: 'If pages are also being removed or moved, do it in this same run. The number printed on a page is its position in the output, so getting the order right first is what makes the numbers correct.',
      },
      {
        name: 'Tick "Add page numbers"',
        text: 'One checkbox. Every page in the output is numbered from 1 upwards, centred near the foot of the page.',
      },
      {
        name: 'Apply and download',
        text: 'The saved file is reopened and its page count checked against your selection before it is offered as edited-pages.pdf.',
      },
    ],
    sections: [
      {
        heading: 'Numbered by position in the output, not in the source',
        body: [
          'This is the detail that decides whether the numbers are right. The number drawn on a page is its position in the document you are producing, not the page it used to be in the file you started from. Remove the cover sheet and number in the same run, and page one of the result is numbered 1.',
          'Do it in two passes — number first, then remove a page — and you get a document that jumps from 3 to 5. Because reordering, removing and numbering all happen in one pass here, the correct approach is also the convenient one: set the final page order and tick the box in the same run.',
        ],
      },
      {
        heading: 'A printed number, not a page label',
        body: [
          'There are two ways to number a PDF and they solve different problems. A page label is metadata: it changes the number a reader shows in its own page box, and it does not appear when the document is printed. A printed number is content drawn onto the page: it appears in print, it survives extraction and flattening, and no reader setting can hide it.',
          'This draws the number onto the page. It is what you want when the document is going to be printed, filed, or cited by page in a meeting — the number a person reads out loud is on the paper in front of them. If what you need is a reader-facing label with a prefix, the Bates numbering tool on this site writes page labels as well as stamps.',
        ],
      },
      {
        heading: 'What it does not offer, stated plainly',
        body: [
          'The style is fixed: 10 pt Helvetica in near-black, horizontally centred, 18 points up from the bottom edge, on every page of the output. There is no choice of position, no font or size control, and no colour.',
          'There is also no format and no starting number. You cannot produce "Page 3 of 20", you cannot start at 100, and you cannot leave the first page unnumbered — the numbering runs from 1 across every page in the output.',
          'Where a prefix, a starting number, zero padding, a corner and a font size all matter — which is to say, a legal production — the Bates numbering tool on this site is the one built for it, and it carries the numbering across several documents in one unbroken sequence.',
        ],
      },
      {
        heading: 'Where the document is while this happens',
        body: [
          'On your device. Pages are copied whole and the numbers are drawn onto the copies, so nothing is rasterised and the text of your document stays selectable.',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'Where do the numbers appear, and what do they look like?',
        answer:
          'Centred horizontally and 18 points up from the bottom edge of each page, set in 10 pt Helvetica in near-black. The style is fixed — there is no position, font, size or colour control on this page.',
      },
      {
        question: 'Can I start the numbering at a number other than 1?',
        answer:
          'No. Numbering runs from 1 across every page in the output, with no starting number, no prefix and no "Page 1 of 20" format. For a prefix, a starting number, zero padding and a chosen corner — the things a legal production needs — use the Bates numbering tool on this site, which also carries one sequence across several documents.',
      },
      {
        question:
          'If I remove pages too, will the numbers still be consecutive?',
        answer:
          'Yes, and that is the reason to do both in the same run. The number printed on a page is its position in the output, not in the source, so removing a cover sheet and numbering in one pass gives you a document whose first page is numbered 1. Numbering first and removing afterwards is what produces a document that jumps from 3 to 5.',
      },
      {
        question: 'Will the numbers print, or only show on screen?',
        answer:
          'They print. These are drawn into the page content rather than written as page labels, so they appear on paper, survive extraction into another document, and cannot be switched off by a reader setting.',
      },
      {
        question: 'Does numbering change anything else about the pages?',
        answer:
          'Only the number drawn on them. Pages are copied whole rather than redrawn, so content, size, orientation and selectable text are untouched. The output is a new document, so document-level metadata does not follow from the source; what is written is whatever you type into the metadata boxes, plus a producer of "Browser Tools".',
      },
      {
        question: 'What are the limits?',
        answer:
          'One unencrypted PDF of up to 150 MB. An encrypted file is refused with advice to remove its password locally first, and the saved result is reopened and its page count checked before a download is offered.',
      },
    ],
  },

  '/pdf/pdf-watermark': {
    title: 'Add Watermark to PDF Online — Free, No Upload',
    description:
      'Stamp text diagonally across every page of a PDF in your own browser. Up to 80 characters, drawn into the page content so no reader setting can hide it.',
    heading: 'About this PDF watermarking tool',
    directAnswer:
      'To watermark a PDF: choose the file, type up to 80 characters into the watermark box, and apply. The text is drawn across the middle of every page in the output, rotated 35 degrees anticlockwise, in grey at 20 per cent opacity, sized to fit the page width. It becomes part of the page content rather than an annotation, so no reader setting can hide it.',
    lead: 'A watermark is a statement about a document’s status — DRAFT, CONFIDENTIAL, NOT FOR CIRCULATION, a matter reference — and it is only useful if it cannot be quietly removed by the person you sent it to. This draws the text into the page content itself, not as an annotation layer that a reader can toggle off, so it travels with the document and appears when it is printed. The appearance is fixed and deliberately unobtrusive: grey, 20 per cent opacity, rotated 35 degrees, and sized against the page width and the length of your text so that a long phrase is set smaller rather than running off the page. Basic Latin characters only, up to 80 of them, on one unencrypted PDF of up to 150 MB.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'One unencrypted file of up to 150 MB. Leaving the page order box as it is watermarks every page.',
      },
      {
        name: 'Type the watermark text',
        text: 'Up to 80 characters, basic Latin. Short is better: the type is sized against the page width divided by the length of your text, so DRAFT is set large and a full sentence is set small.',
      },
      {
        name: 'Apply',
        text: 'The text is drawn across the middle of every output page at 35 degrees anticlockwise, in grey at 20 per cent opacity, while the pages are copied into the new document.',
      },
      {
        name: 'Download',
        text: 'The result is reopened and its page count verified before it is offered as edited-pages.pdf. Your original file is not modified.',
      },
    ],
    sections: [
      {
        heading: 'Page content, not an annotation',
        body: [
          'PDF offers two places to put a watermark. One is the annotation layer, which is where comments and stamps live — easy to add, and equally easy for the recipient to select and delete, or simply to switch off in their reader’s view menu. The other is the page content stream, alongside the text and the drawings that make up the page.',
          'This writes into the page content. There is no annotation to delete and no layer to turn off; removing the watermark means editing the page itself. It also means the watermark prints, which an annotation may not, depending on the reader and its settings.',
        ],
      },
      {
        heading: 'Why the appearance is fixed',
        body: [
          'Grey at 20 per cent opacity, rotated 35 degrees anticlockwise, drawn across the middle of the page. There is no colour, opacity, angle or position control, and no image watermark.',
          'The size is the one thing that adapts: it is computed from the page width and the length of your text, between 18 and 54 points, so a short word is set large and a long phrase is set small enough to fit. This is why short watermarks read better — DRAFT at 54 points across a page says what it needs to; a twelve-word disclaimer at 18 points is a smudge.',
          'The trade is honest: you get a watermark that is legible without obscuring the document, on every page, in one action, and you do not get to design it. Where a document needs a designed mark, that belongs in the tool the document was written in.',
        ],
      },
      {
        heading: 'What it will refuse',
        body: [
          'Characters outside basic printable Latin. The watermark is drawn in Helvetica, a standard PDF font whose encoding does not cover a rupee sign, an emoji, or most non-Latin scripts, and the page refuses those rather than dropping them silently.',
          'More than 80 characters — both the input and the engine cap the text at that length. An encrypted PDF, which is refused with advice to remove its password locally first. And a file over 150 MB.',
          'It also does not watermark selected pages: the text goes on every page in the output. To watermark part of a document, list just those pages in the page order box, run it, and merge the result back with the rest using the PDF merger on this site.',
        ],
      },
      {
        heading:
          'Why a document you are marking as confidential should stay local',
        body: [
          'There is an obvious tension in uploading a document to a third-party server in order to stamp the word CONFIDENTIAL across it. The upload happens first, and it is the disclosure.',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'What does the watermark look like?',
        answer:
          'Your text drawn across the middle of every page, rotated 35 degrees anticlockwise, in grey at 20 per cent opacity. The size is computed from the page width and the length of the text, between 18 and 54 points, so a short word is set large and a long phrase small enough to fit. There is no colour, opacity, angle or position control.',
      },
      {
        question: 'Can the recipient remove the watermark?',
        answer:
          'Not with a reader setting. It is drawn into the page content rather than added as an annotation, so there is no layer to switch off and no object to select and delete — removing it would mean editing the page itself. It also prints, which an annotation does not always do.',
      },
      {
        question: 'How long can the text be?',
        answer:
          'Up to 80 characters, capped in both the input field and the engine. Shorter reads better: the type is sized against the page width divided by the length of your text, so DRAFT is set large and a long sentence is set small.',
      },
      {
        question: 'Can I use a logo or an image as the watermark?',
        answer:
          'No — text only, in the standard Helvetica font. Characters that font cannot write, such as a rupee sign, an emoji or a non-Latin script, are refused rather than dropped silently.',
      },
      {
        question: 'Can I watermark only some pages?',
        answer:
          'Not in one run: the text goes on every page of the output. List just the pages you want marked in the page order box, run it, and merge that file back with the rest using the PDF merger on this site.',
      },
      {
        question: 'Does watermarking change the rest of the document?',
        answer:
          'Only by what is drawn on it. Pages are copied whole rather than redrawn, so text stays selectable and vectors stay sharp. The output is a newly created document, so document-level metadata does not follow from the source; what is written is whatever you type into the metadata boxes, plus a producer of "Browser Tools".',
      },
    ],
  },

  '/pdf/pdf-metadata-editor': {
    title: 'Edit PDF Metadata Online — Title and Author, Free',
    description:
      'Set the title, author, subject and keywords stored inside a PDF, in your own browser. Written while the pages are copied, with no upload and no account.',
    heading: 'About this PDF metadata editor',
    directAnswer:
      'To change what a PDF says about itself: choose the file, open the document metadata section, and type a title, author, subject or comma-separated keywords. Applying writes those values into a new copy of the document. Fields you leave empty are simply not written — this sets metadata, it does not clear it.',
    lead: 'The title, author, subject and keywords inside a PDF are what a reader shows in its properties box, what a document management system indexes, and what a file manager displays in a column instead of the file name. They are often wrong: a document generated from a template inherits the template author, a scan is titled after the scanner model, and an export from a word processor carries the name of whoever first opened the original. This writes them properly. It is a set operation rather than a clear operation — an empty box leaves that field alone — and it always writes a producer of "Browser Tools", because the tool that wrote a file should say so.',
    steps: [
      {
        name: 'Choose the PDF',
        text: 'One unencrypted file of up to 150 MB. Leaving the page order box as it is keeps the whole document.',
      },
      {
        name: 'Open the document metadata section',
        text: 'Four boxes: title, author, subject and keywords. Keywords are comma-separated; empty entries are dropped.',
      },
      {
        name: 'Type the values you want',
        text: 'Anything you leave empty is not written, and the corresponding value is left as it was. This sets fields; it does not empty them.',
      },
      {
        name: 'Apply and download',
        text: 'The values are written while the pages are copied into the new document, which is verified and offered as edited-pages.pdf.',
      },
    ],
    sections: [
      {
        heading: 'What these four fields actually do',
        body: [
          'Title is what a reader puts in its window bar and what many systems show instead of the file name — a document called "scan_0043.pdf" with a title of "Lease, 14 Bridge Street, executed" is findable and one called "scan_0043.pdf" with no title is not. Author is the name attached to the document in properties and in most indexes. Subject is a one-line description. Keywords are the terms a document management system will search.',
          'They travel with the file. Rename the PDF, email it, put it in a shared drive, and the metadata is still there — which is what makes it worth setting, and also what makes it worth checking before you send a document to someone outside your organisation.',
        ],
      },
      {
        heading: 'Setting is not the same as clearing',
        body: [
          'This tool writes the values you type. An empty box is not an instruction to blank the field; it is an instruction to leave it alone. That is the right behaviour for an editor — you should be able to fix the title without wondering what happened to the keywords.',
          'It is the wrong behaviour when your goal is anonymity. Removing a name from a PDF means removing it from both places it is stored: the document information dictionary and the XMP packet, which usually hold the same fact and which most tools clear only one of. The PDF metadata remover on this site does exactly that, in one action, and also clears the file identifier that links copies of a document to one another. Use that one when the point is to take information out.',
        ],
      },
      {
        heading: 'What else this pass does, and what it does not preserve',
        body: [
          'Metadata is written while the pages are copied into a new document, in the same run that can reorder, delete, rotate, number and watermark. Doing them together means one rewrite of the file instead of several.',
          'Because the output is a newly created document, metadata from the source does not carry over on its own: what ends up in the file is what you typed, plus a producer of "Browser Tools". If the original title was right and you want to keep it, type it in.',
          'Bookmarks, form behaviour, attachments and certification state are outside the stated scope of this pass, which is visible page content and order. Pages themselves are copied whole, so nothing is rasterised and text stays selectable.',
        ],
      },
      {
        heading: 'Where it runs',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'Which fields can I set?',
        answer:
          'Title, author, subject and keywords. Keywords are typed comma-separated and empty entries are dropped. The producer is always written as "Browser Tools", because the tool that wrote a file should say so.',
      },
      {
        question: 'How do I clear a field rather than change it?',
        answer:
          'Not here — an empty box means "leave this alone", which is what you want from an editor. To take information out of a PDF, use the metadata remover on this site: it clears the document information dictionary and the XMP packet together, along with the file identifier, which is the only way to do it that can be described honestly, because the same fact is usually stored in both places.',
      },
      {
        question:
          'Will the original title and author survive if I only change one field?',
        answer:
          'No, and this is worth knowing. The output is a newly created document rather than an edited copy, so metadata from the source does not carry over on its own. Whatever you want in the finished file, type it in — including values that were already correct.',
      },
      {
        question: 'Where does this metadata show up?',
        answer:
          'In a reader’s document properties box, in the window title of many readers, in the columns a file manager or document management system displays, and in whatever indexes the document. It travels with the file through renaming, emailing and copying.',
      },
      {
        question: 'Does editing metadata change the pages?',
        answer:
          'No. Pages are copied whole rather than redrawn, so content, size, orientation and selectable text are untouched, and the result is reopened and its page count verified before a download is offered.',
      },
      {
        question:
          'Why does this page show rotation and watermark controls too?',
        answer:
          'Because it is one pass over the document. Writing metadata, reordering, deleting, rotating, numbering and watermarking all happen while the pages are copied once into a new file. Ignore the controls you do not need; the metadata boxes work on their own.',
      },
    ],
  },
  '/pdf/drawing-register': {
    title: 'PDF Drawing Register from Title Blocks — Free, Local',
    description:
      'Extract drawing numbers, titles, revisions, dates, and authors from architectural drawing set title blocks into CSV spreadsheets without Bluebeam subscriptions.',
    heading: 'About this architectural drawing register extractor',
    offlineReady: false,
    directAnswer:
      'To build a drawing register from an architectural PDF set: drop the combined PDF into the upload area. The parser inspects the bottom-right and right-edge title block zone on every sheet, parses vector text streams into coordinate-sorted text lines, runs heuristic pattern matching for drawing numbers, revisions, sheet titles, dates, and authors, and displays the structured register in an interactive table ready for instant CSV export.',
    lead: 'Architects, structural engineers, general contractors, and BIM coordinators spend hours manually transcribing drawing numbers, titles, and revision dates from drawing sets into Excel document registers. Dedicated construction software like Bluebeam Revu charges hundreds of dollars per seat for drawing set management. This tool extracts drawing schedules and registers locally in your browser tab using pdf-lib and client-side vector text stream parsing. It reads multi-sheet architectural sets, locates title block regions across ISO A-series and ANSI drawing sheet sizes, extracts key metadata fields, highlights scanned pages that lack vector text, and provides one-click CSV export and batch bursting into cleanly named individual drawing files.',
    steps: [
      {
        name: 'Upload the architectural drawing set',
        text: 'Select or drag and drop a multi-page PDF drawing set. The parser accepts combined sets containing dozens or hundreds of sheets. Files are processed entirely in browser memory without sending blueprints across the internet.',
      },
      {
        name: 'Automatic title block zone inspection',
        text: 'For each page in the document, the parser checks page dimensions (MediaBox) and inspects the primary title block zones—specifically the lower-right quadrant and right-hand title margins where architectural drawing numbers and revision blocks standardly reside according to ISO 5457 and BS 1192 standards.',
      },
      {
        name: 'Heuristic metadata extraction',
        text: 'The engine parses font operators, text matrix transformations, and literal strings, reconstructing text blocks with precise coordinates. It identifies drawing numbers matching standard patterns (such as A-101, S-202, MEP-01, or 001-Rev-B), revision letters or integers, drawing sheet titles, sheet scales, dates, and authors.',
      },
      {
        name: 'Review register and export CSV',
        text: 'Examine the populated drawing register in the interactive preview table. Search and filter rows, identify any scanned pages flagged for optical character recognition, and click Export Register CSV to download a clean spreadsheet ready for immediate import into Excel, Procore, or Autodesk Construction Cloud.',
      },
      {
        name: 'Optional drawing sheet burst',
        text: 'If your project requires individual drawing files rather than a bound book, click Burst Sheets by Drawing No to automatically split the PDF into separate single-sheet files named according to each sheet’s extracted drawing number and title.',
      },
    ],
    sections: [
      {
        heading: 'How architectural title block parsing works',
        body: [
          'Architectural, structural, and civil engineering drawings almost universally position title blocks in the lower-right quadrant or along the right-hand border of the sheet. National and international standards—including ISO 5457, BS EN ISO 7200, and the US National CAD Standard—dictate specific layouts for title block content, requiring drawing identification numbers, project names, sheet titles, revisions, and approval dates to occupy predictable relative locations.',
          'When you load a PDF drawing set, this tool opens the PDF context using pdf-lib and parses the content stream of every page. Rather than treating the page as a flat bitmap or running heavy neural network models, it directly interprets PDF graphics state operators and text rendering commands, specifically text positioning operators (such as Td, TD, Tm, and T*), text show operators (Tj, TJ, \', and "), and font dictionary resources. Text fragments are transformed into absolute page coordinates and grouped into lines based on horizontal proximity and vertical baseline alignment.',
          'The parser then evaluates text located in the title block bounding box. It applies regular expression heuristics designed to distinguish project numbers from drawing numbers, revisions (e.g., Rev A, Rev 01, P1, C2), scale indications (1:100, 1/4" = 1\'-0"), drawing titles (such as First Floor Plan, North Elevation, Structural Details), and creation or issue dates. Extracted fields are normalised, deduplicated, and mapped to structured register records.',
        ],
      },
      {
        heading: 'Handling vector PDFs versus scanned blueprints',
        body: [
          'This tool is engineered for native vector PDFs generated from BIM and CAD software such as Revit, AutoCAD, ArchiCAD, Vectorworks, and MicroStation. Vector PDFs embed true text objects with searchable character strings and coordinate positions, so the characters are read exactly rather than guessed at the way OCR does with a scan. Which of those strings is the drawing number, the revision or the date is still decided by where they sit in the title block, and title blocks differ between practices — so check the register against a sheet or two before trusting it.',
          'In contrast, scanned blueprints, photocopied plans, and drawings printed to raster images contain only image streams (XObject /Image dictionaries) without underlying text operators. When the parser detects that a page contains no text operators or fewer than 5 characters, it flags the sheet in the register table as "Scanned / No Text" and increments the scanned page counter. For scanned drawing sets, users can process the document through our client-side PDF OCR tool first, which synthesizes a searchable text layer that this drawing register tool can then extract.',
        ],
      },
      {
        heading: 'One-click sheet bursting and automated renaming',
        body: [
          'A persistent frustration in construction document administration is receiving a 300-page combined drawing book from an architect or engineer and having to manually extract and rename each sheet before uploading to document management platforms. Bluebeam and Adobe charge premium enterprise licensing fees for batch slip-sheeting and document splitting features.',
          'This tool includes a built-in Burst Sheets function. Once the drawing register is extracted, clicking Burst Sheets instructs the client-side pdf-lib engine to isolate each sheet into an individual single-page PDF document. Each generated file is automatically named using the extracted drawing number and sheet title (for example, "A-101 - Ground Floor Plan.pdf"). The burst files are generated entirely within browser memory and downloaded directly to your local file system without intermediary server storage.',
        ],
      },
      {
        heading:
          'Complete document privacy for proprietary architectural plans',
        body: [
          'Architectural sets, structural calculations, and building schematics often represent confidential intellectual property, subject to non-disclosure agreements, bidding embargoes, and commercial secrecy. Uploading construction drawings to cloud-based conversion utilities exposes sensitive building floor plans, security designs, and proprietary specifications to third-party server logging and retention risks.',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'Which CAD and BIM software produces compatible PDFs?',
        answer:
          'Any software that exports standard vector PDFs with text layers is compatible, including Autodesk Revit, AutoCAD, Civil 3D, Graphisoft ArchiCAD, Nemetschek Vectorworks, Bentley MicroStation, Bluebeam Revu, and Rhino.',
      },
      {
        question: 'Does this tool work on scanned drawings?',
        answer:
          'If a drawing set consists of raster scans without a text layer, the parser will flag the sheets as scanned. To extract data from scanned plans, first run the file through our browser-based PDF OCR tool to generate a searchable text layer, then upload the resulting file here.',
      },
      {
        question:
          'Can I export the register to Microsoft Excel or Google Sheets?',
        answer:
          'Yes. Clicking Export Register CSV produces a comma-separated values (.csv) file containing Sheet Number, Drawing Number, Sheet Title, Revision, Date, and Author columns that opens seamlessly in Microsoft Excel, Google Sheets, LibreOffice Calc, or Procore.',
      },
      {
        question: 'What drawing number formats are supported?',
        answer:
          'The parser recognizes standard discipline-based CAD numbering formats such as A-101, S-201, M-301, E-401, P-501, ISO-style numbering (e.g., 1024-DRG-ARC-001), UK Uniclass numbering, and numeric sheet sequences (001, 002, 003) alongside revision indicators.',
      },
      {
        question: 'Is there a limit on the number of pages or file size?',
        answer:
          'Because processing occurs in browser memory via WebAssembly and JavaScript, drawing sets with hundreds of pages and files up to several hundred megabytes process reliably on modern desktop browsers without arbitrary server timeouts.',
      },
      {
        question: 'Are my architectural drawings uploaded or stored anywhere?',
        answer:
          'No. All text parsing, title block analysis, CSV generation, and file bursting happen entirely inside your local browser tab. No document data is ever transmitted across the internet.',
      },
    ],
  },
  '/pdf/preflight': {
    title: 'PDF Print Preflight Checker — Bleed, Trim & Fonts',
    description:
      'Inspect TrimBox alignment, 3mm bleed margins, font embedding, and image resolution (PPI) before sending to commercial press without expensive desktop subscriptions.',
    heading: 'About this commercial print preflight checker',
    offlineReady: false,
    directAnswer:
      'To preflight a PDF for commercial print: upload your print-ready document. The analyzer parses page boundary boxes (MediaBox, CropBox, BleedBox, TrimBox), verifies whether bleed margins meet the commercial standard of at least 8.5 pt (3mm), inspects embedded font descriptor dictionaries to catch non-embedded fonts, checks image XObjects for RGB color space usage, and calculates effective image PPI against placed page dimensions.',
    lead: 'Commercial offset and digital printers reject customer files every day due to missing bleed margins, un-embedded fonts, low-resolution raster imagery, and RGB color space mismatches. Commercial desktop preflight software charges steep monthly subscriptions or hundreds of dollars for prepress profiles. This client-side preflight inspector provides graphic designers, print production managers, and self-publishing authors with an instant, objective technical inspection of PDF files directly in the browser. It uncovers missing bleed allowances, identifies un-embedded PostScript and TrueType fonts, highlights RGB images that need CMYK conversion, and calculates image pixel density to ensure crisp 300 PPI print reproduction.',
    steps: [
      {
        name: 'Upload the print-ready PDF',
        text: 'Select or drag your PDF artwork file into the dropzone. The preflight engine inspects file header structures and opens the document dictionary entirely in local browser memory.',
      },
      {
        name: 'Analyze page geometry and box boundaries',
        text: 'The inspector extracts the MediaBox (physical sheet dimension), TrimBox (finished cut dimension), and BleedBox (artwork extension boundary) for every page, calculating margin differences to determine whether standard 3mm (8.5 pt) or 5mm bleed exists.',
      },
      {
        name: 'Inspect font embedding status',
        text: 'The analyzer traverses page resource dictionaries and font descriptors. It checks whether each font is fully embedded or subset-embedded (indicated by standard 6-character tag prefixes), flagging any un-embedded system fonts that would risk text reflow at the print shop.',
      },
      {
        name: 'Examine image color spaces and PPI',
        text: 'Image XObjects embedded within page streams are evaluated for color spaces (DeviceCMYK, DeviceGray, or DeviceRGB) and bit depth. The engine calculates estimated placed PPI against page dimensions, highlighting raster assets under 300 PPI.',
      },
      {
        name: 'Review preflight report and export JSON',
        text: 'Inspect page-by-page findings and the overall executive summary. Export the technical findings as a structured JSON report to share with print bureaus, clients, or prepress operators.',
      },
    ],
    sections: [
      {
        heading: 'Why print preflight inspection is critical',
        body: [
          'In commercial printing, submitting a PDF with technical flaws leads to costly reprints, production delays, and ruined print runs. Unlike screen display where RGB colors shine and missing fonts can fallback to system defaults, commercial offset lithography and high-speed digital presses require strict adherence to mechanical and physical constraints.',
          'Three issues account for the vast majority of commercial print rejections: missing bleed margins, un-embedded fonts, and low image resolution. Bleed is required because guillotine paper cutters have physical tolerances; without artwork extending beyond the trim line, paper shifts during cutting cause unsightly white paper borders along finished edges. Un-embedded fonts force RIP (Raster Image Processor) software to substitute generic typefaces, ruining typographic layout. Low-resolution images appear pixelated and blurry when screened onto paper.',
        ],
      },
      {
        heading: 'Understanding PDF geometry: MediaBox, TrimBox, and BleedBox',
        body: [
          'A professional PDF contains up to five distinct rectangular boundaries defined in points (1/72 inch): MediaBox, CropBox, BleedBox, TrimBox, and ArtBox.',
          'The MediaBox defines the total physical page medium upon which the printer prints. The TrimBox specifies the exact dimensions of the finished printed product after cutting and binding (for example, 210 × 297 mm for A4). The BleedBox specifies the boundary to which the artwork content should be clipped when output in a production environment. For commercial printing, the BleedBox must extend at least 3 mm (8.504 points), and ideally 5 mm (14.17 points), beyond the TrimBox on all four sides. This tool verifies the presence of both boxes and mathematically verifies that the bleed margin satisfies minimum industry tolerances.',
        ],
      },
      {
        heading: 'Font embedding rules and subsetting verification',
        body: [
          'PDF documents can reference fonts in three distinct manners: fully embedded, subset-embedded, or un-embedded. Fully embedded fonts include the entire font file in the PDF stream. Subset fonts include only the glyphs actually utilized in the document, designated by a standard six-letter tag followed by a plus sign (e.g., "ABCDEF+Helvetica").',
          'Un-embedded fonts include only font metadata (name, metrics, encoding) and rely on the host operating system or RIP to supply the actual glyph outlines. If a commercial RIP does not possess that specific typeface, it substitutes Courier or Arial, shifting baseline alignments and breaking text flow. This preflight checker inspects font dictionaries and FontDescriptor streams (FontFile, FontFile2, FontFile3) to guarantee that 100% of fonts are properly embedded before submission.',
        ],
      },
      {
        heading: 'Image resolution (PPI) and color space verification',
        body: [
          'For commercial printing, raster images must maintain an effective resolution of at least 300 pixels per inch (PPI) at 100% reproduction scale. While web graphics display sharply at 72–150 PPI, half-tone printing screens require high pixel density to avoid visible pixelation and jagged stair-stepping artifacts.',
          'Furthermore, commercial printing presses operate using cyan, magenta, yellow, and black (CMYK) ink separations rather than red, green, and blue (RGB) light primaries. Images saved in DeviceRGB must be converted via ICC color profiles to CMYK; un-managed RGB conversions at the RIP often result in muted, muddy, or unexpected color shifts. This tool scans all image streams, identifies color models, and flags RGB assets and sub-300 PPI images.',
        ],
      },
      {
        heading: 'Engineering scope boundaries and local privacy guarantee',
        body: [
          'This tool provides comprehensive geometric, font descriptor, and image stream preflight analysis in client-side JavaScript. It does not perform full PostScript RIP rendering, ICC device-link color profiling, or overprint/trapping simulation. For spot color separations (Pantone PMS matching) or specialized ink coverage (Total Area Coverage / TAC) measurements, specialized prepress workflow software may still be required.',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question:
          'What is the standard bleed margin required for commercial printing?',
        answer:
          'The standard minimum bleed margin across North America and Europe is 3 mm (approximately 8.5 points) beyond the trim line. Some large-format packaging and book cover printers require 5 mm. This tool checks that your BleedBox extends at least 8.5 points beyond your TrimBox.',
      },
      {
        question: 'What happens if a font is not embedded in my PDF?',
        answer:
          'If a font is not embedded, the print shop’s raster image processor must substitute a local font. This frequently alters kerning, line heights, and character widths, causing text overlap, missing characters, or dropped lines on the printed page.',
      },
      {
        question: 'Why are RGB images flagged in the preflight report?',
        answer:
          'Commercial presses use CMYK inks (cyan, magenta, yellow, black). RGB images must be converted to CMYK, which often shifts bright saturated blues, greens, and oranges to duller shades. Converting images to CMYK in your design program before exporting ensures you see accurate color proofs.',
      },
      {
        question: 'What does the PPI check measure?',
        answer:
          'The preflight tool calculates the effective pixel density by dividing image pixel dimensions by the rendered point dimensions on the page. Images with effective resolution below 300 PPI are flagged because they risk appearing pixelated or blurry in print.',
      },
      {
        question:
          'Does this preflight tool upload my artwork to a cloud server?',
        answer:
          'No. All page box calculations, font dictionary inspections, image header analysis, and report generation execute 100% locally in your web browser. No document pages or artwork assets ever leave your device.',
      },
    ],
  },
  '/pdf/burst': {
    title: 'Burst PDF by Rule and Dynamic Naming — Free, Local',
    description:
      'Split bulk PDF statements, drawings, and invoices by bookmark, blank page, or regex pattern match with dynamic output file naming in browser memory.',
    heading: 'About this rule-based PDF splitter and burster',
    offlineReady: false,
    directAnswer:
      'To burst a combined PDF into separate documents by rule: upload the document, select a splitting rule (blank page separation, regular expression text match, text value change, or fixed page intervals), configure the dynamic naming template with placeholders like {index}, {match}, {startPage}, and {endPage}, preview the generated split plan, and click Burst & Download to receive individual, cleanly named PDF documents.',
    lead: 'Organizations regularly generate massive combined PDF files—monthly billing statements containing thousands of invoices, employee payroll runs, scanned batches separated by barcode slips, or architectural sets. Manually splitting these documents into individual files and naming each one by customer number or invoice ID is an excruciating, error-prone manual task. Desktop utility software charges recurring subscription fees for rule-based PDF bursting. This browser-based burster enables administrators, billing clerks, and document managers to split multi-page documents locally using configurable splitting rules and dynamic template naming patterns without sending sensitive customer records to cloud processing services.',
    steps: [
      {
        name: 'Upload the combined PDF document',
        text: 'Select or drag your batch PDF file into the dropzone. The file is opened securely in browser memory without server transmission.',
      },
      {
        name: 'Select a burst rule type',
        text: 'Choose your preferred separation logic: Blank Page separation (common in scanner batch jobs), Regular Expression pattern matching (e.g., splitting wherever "Invoice # [0-9]+" occurs), Value Change detection (splitting when a customer ID changes), or Fixed Interval page counts.',
      },
      {
        name: 'Configure dynamic naming templates',
        text: 'Define your desired output filename syntax using dynamic variables such as {index} for sequential numbering, {match} for extracted text values, {startPage}, and {endPage} (e.g., "Invoice_{match}_{index}.pdf").',
      },
      {
        name: 'Preview and verify the burst plan',
        text: 'Review the generated splitting plan table. Inspect document start pages, end pages, page counts, extracted pattern values, and projected output filenames before executing the split.',
      },
      {
        name: 'Execute the burst and download files',
        text: 'Click Burst & Download to split the source PDF into individual documents in browser memory and save each output file directly to your local file system.',
      },
    ],
    sections: [
      {
        heading: 'Versatile bursting rules for batch document workflows',
        body: [
          'Different document processing pipelines require different separation strategies. This tool provides four distinct bursting algorithms to accommodate diverse enterprise and administrative workflows:',
          '1. Blank Page Separation: High-speed office scanners often use blank separator sheets between invoices, medical records, or legal discovery documents. The blank page rule detects pages containing no text operators or white-space-only content, using them as boundary markers and automatically discarding the blank pages from the final output.',
          '2. Regular Expression Pattern Matching: Batch ERP and accounting exports frequently consolidate hundreds of multi-page invoices into a single print spool file. The regex rule inspects page text streams for specific patterns (such as "(?i)Invoice\\\\s+(?:No|#)\\\\s*([A-Z0-9-]+)" or "Account\\\\s+Number:\\\\s*(\\\\d+)"), initiating a new document segment each time the pattern matches.',
          '3. Value Change Detection: When documents have varying lengths but maintain a consistent identifier on every page (such as a customer account number in the page header), the value change rule tracks the extracted string and splits the PDF only when the identified value transitions from one unique string to another.',
          '4. Fixed Interval Splitting: For standardized multi-page packets, such as 2-page tax forms or 5-page employment agreements, the fixed interval rule splits the document precisely every N pages.',
        ],
      },
      {
        heading: 'Dynamic file naming with regex extraction tokens',
        body: [
          'A split document is only useful if it can be identified and filed without manual renaming. Standard PDF splitters produce generic output filenames such as "document_part_1.pdf", forcing users to open every file to determine which customer or invoice it belongs to.',
          'This tool features an advanced template engine that dynamically substitutes metadata tokens into output filenames. Available tokens include {index} (zero-padded sequential numbering), {match} (the exact text captured by your regex search pattern or capture group), {startPage} (the starting page number in the original document), and {endPage} (the concluding page number). For example, a template configured as "{match}_Pages_{startPage}-{endPage}.pdf" automatically outputs "INV-9821_Pages_1-3.pdf" and "INV-9822_Pages_4-5.pdf".',
        ],
      },
      {
        heading: 'High-performance in-memory PDF extraction',
        body: [
          'Splitting a large document into hundreds of constituent files can place significant demand on system resources. This tool executes PDF page extraction using an optimized pdf-lib context pipeline in WebAssembly and JavaScript.',
          'Rather than decompressing and re-encoding raster imagery, the burster copies raw page dictionaries, content streams, and resource references directly from the source document to target output documents. This ensures lightning-fast execution, zero image re-compression degradation, and perfectly intact vector text typography and layout fidelity.',
        ],
      },
      {
        heading:
          'Total privacy for financial statements and confidential records',
        body: [
          'Batch PDF files frequently contain highly confidential records: payroll reports detailing employee compensation, patient medical billing summaries, banking statements, and legal depositions. Submitting bulk PDF records to third-party cloud conversion services introduces severe data compliance and confidentiality risks.',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'How does blank page detection work?',
        answer:
          'The parser inspects text operators and stream contents on each page. A page containing zero characters or only whitespace is identified as a blank separator sheet. The burster splits the document at that boundary and excludes the blank separator sheet from the exported files.',
      },
      {
        question:
          'Can I extract the invoice number from the document into the filename?',
        answer:
          'Yes. Configure the Regular Expression rule with a capture group matching your invoice number (e.g., "Invoice # ([0-9]+)") and include the {match} token in your naming template (e.g., "Invoice_{match}.pdf"). The burster will name each file with its specific invoice number.',
      },
      {
        question: 'Are split PDF pages re-compressed or degraded in quality?',
        answer:
          'No. The burster performs lossless dictionary copying of page streams and font resources without re-compressing images or re-rendering text, preserving 100% of the original document fidelity.',
      },
      {
        question: 'How many files can I download at once?',
        answer:
          'When bursting multiple files, the browser triggers direct downloads for the generated documents. For large batches, modern browsers will prompt you to permit multi-file downloads from the site.',
      },
      {
        question: 'Is my data stored or sent across the internet?',
        answer:
          'No. The entire bursting pipeline—including text inspection, regex parsing, document splitting, and file creation—operates strictly within your local browser memory.',
      },
    ],
  },
};
