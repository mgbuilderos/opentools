/*
  Every string the five localised tools show in their own controls.

  WHY THIS EXISTS. Until now a Spanish reader got Spanish prose and then
  operated the tool in English: "Drop PDFs here", "Choose PDFs", "Add at least
  2 PDFs". The words that explain the tool were translated; the words you have
  to read to *use* it were not, which is the half that decides whether somebody
  finishes the job or leaves.

  HOW IT STAYS SAFE FOR THE ENGLISH SITE. `EN_TOOL_UI` below is the exact text
  those components shipped before this change, so an English page renders
  byte-for-byte what it rendered before -- asserted by diffing the built HTML of
  all five English tool pages, not by inspection. A component reads its strings
  through `useToolUi()`, which returns the locale's bundle when it is inside
  `LocaleEditionProvider` and `EN_TOOL_UI` everywhere else.

  KEYS ARE GROUPED BY TOOL, with the shared ones first. Format names (PDF, JPEG,
  PNG, WebP) are deliberately absent: they are the same word in every language
  this site publishes, and keying them would invite a translation that breaks a
  file-type label.
*/

export interface ToolUiMessages {
  // ---- shared across the five tools
  dismissError: string;
  clear: string;
  clearAll: string;
  cancel: string;
  processing: string;
  outputCheck: string;
  before: string;
  after: string;
  saved: string;
  output: string;
  input: string;
  files: string;
  chooseAnother: string;
  onDevicePrototype: string;
  savePdf: string;
  // ---- status text, receipt labels and interpolated sentences
  browserWorker: string;
  inThisBrowserTab: string;
  upTo150Mb: string;

  // ---- /pdf/merge
  mergeTitle: string;
  mergePageManagement: string;
  mergePdfsToMerge: string;
  mergeChoosePdfs: string;
  mergeSignatureNote: string;
  mergeOriginalsNote: string;
  mergeDownloadAria: string;
  mergeDownloadLabel: string;
  mergeOrderAria: string;
  mergePhaseTiming: string;
  mergeCouldntUse: string;
  mergeCancelled: string;
  mergeStatusAria: string;
  mergeStandfirst: string;
  mergeOperation: string;
  mergeCounts: string;
  mergeSummary: string;

  // ---- /pdf/compress
  compressChooseSource: string;
  compressChoosePdf: string;
  compressPages: string;
  compressPhotos: string;
  compressPhotoQuality: string;
  compressLargestEdge: string;
  compressKeepFullSize: string;
  compressEdgeEmail: string;
  compressEdgeScreen: string;
  compressEdgePrint: string;
  compressReEncode: string;
  compressReEncoding: string;
  compressClearMetadata: string;
  compressCeiling: string;
  compressFitCeiling: string;
  compressWhereItRan: string;
  compressSave: string;
  compressCouldnt: string;
  compressOperation: string;
  compressInspecting: string;
  compressSummaryOne: string;
  compressSummaryMany: string;
  compressNoneReEncoded: string;
  compressReEncodedCount: string;
  compressPhotoQualityValue: string;
  compressCeilingLine: string;
  compressRewriteOne: string;
  compressRewriteMany: string;
  compressFitAlreadyUnder: string;
  compressFitMet: string;
  compressFitMissed: string;
  compressNothingSaved: string;

  // ---- /pdf/images-to-pdf
  imagesTitle: string;
  imagesAdd: string;
  imagesChoose: string;
  imagesChooseAria: string;
  imagesChooseHint: string;
  imagesSourceImages: string;
  imagesLabel: string;
  imagesPageSize: string;
  imagesFitEach: string;
  imagesUsLetter: string;
  imagesOrientation: string;
  imagesMatchEach: string;
  imagesPortrait: string;
  imagesLandscape: string;
  imagesMargin: string;
  imagesMarginNone: string;
  imagesMarginSmall: string;
  imagesMarginMedium: string;
  imagesMarginLarge: string;
  imagesOnePerImage: string;
  imagesCreate: string;
  imagesEmbedding: string;
  imagesSave: string;
  imagesCouldnt: string;
  imagesPrivacyBoundary: string;
  imagesNoNetwork: string;
  imagesUnsupported: string;
  imagesSummaryOne: string;
  imagesSummaryMany: string;
  imagesBuilding: string;
  imagesCreatePdf: string;
  imagesFitImage: string;

  // ---- /pdf/to-word
  toWordTitle: string;
  toWordShort: string;
  chooseAPdf: string;
  toWordChooseAria: string;
  toWordChooseHint: string;
  toWordRemoveAria: string;
  toWordSave: string;
  toWordSaveShort: string;
  toWordWordFile: string;
  toWordParagraphs: string;
  toWordCharacters: string;
  toWordTook: string;
  toWordConvertAnother: string;
  toWordOcrLink: string;
  toWordScope: string;
  toWordCouldnt: string;
  toWordSummaryOne: string;
  toWordSummaryMany: string;
  toWordNoTextNote: string;
  toWordTextOnlyNote: string;

  // ---- /image/optimize
  optimizeTitle: string;
  optimizeAction: string;
  optimizeImage: string;
  optimizeSourceImage: string;
  optimizeChoose: string;
  optimizeChooseAria: string;
  optimizeMaxWidth: string;
  optimizeMaxHeight: string;
  optimizeOutputFormat: string;
  optimizeSave: string;
  optimizeOriginalUnchanged: string;
  optimizeDecodedMatch: string;
  optimizeInThisTab: string;
  optimizeReleaseAssurance: string;
  optimizeEgressPending: string;
  optimizeCouldnt: string;
  optimizeOperation: string;
  optimizeSummary: string;
  optimizeChooseMany: string;
  optimizeBusy: string;
  optimizeAll: string;
  optimizePreviewAlt: string;
  optimizeNextMerge: string;
}

/** The text the components shipped before this module existed. */
export const EN_TOOL_UI: ToolUiMessages = {
  dismissError: 'Dismiss error',
  clear: 'Clear',
  clearAll: 'Clear all',
  cancel: 'Cancel',
  processing: 'Processing',
  outputCheck: 'Output check',
  before: 'Before',
  after: 'After',
  saved: 'Saved',
  output: 'Output',
  input: 'Input',
  files: 'Files',
  chooseAnother: 'Choose another',
  onDevicePrototype: 'On-device prototype',
  savePdf: 'Save PDF',
  browserWorker: 'Browser worker',
  inThisBrowserTab: 'In this browser tab',
  upTo150Mb: 'Up to 150 MB',

  mergeTitle: 'Merge PDF',
  mergePageManagement: 'Page management',
  mergePdfsToMerge: 'PDFs to merge',
  mergeChoosePdfs: 'Choose PDFs',
  mergeSignatureNote:
    'File signatures and page counts are checked in your browser.',
  mergeOriginalsNote: 'The originals will not be modified.',
  mergeDownloadAria: 'Download merged PDF',
  mergeDownloadLabel: 'Download merged.pdf',
  mergeOrderAria: 'PDF merge order',
  mergePhaseTiming: 'Phase timing',
  mergeCouldntUse: 'Couldn’t use that PDF',
  mergeCancelled:
    'Merge cancelled. Your selected PDFs are still here and unchanged.',
  mergeStatusAria: 'Local processing status. Release proof is pending.',
  mergeStandfirst:
    'Combine PDFs in your chosen order. Processing happens in a dedicated browser worker.',
  mergeOperation: 'PDF merge',
  mergeCounts: '{files} files · {pages} pages',
  mergeSummary: '{files} PDF files merged into {pages} pages.',

  compressChooseSource: 'Choose source PDF',
  compressChoosePdf: 'Choose a PDF to compress',
  compressPages: 'Pages',
  compressPhotos: 'Photos',
  compressPhotoQuality: 'Photo quality',
  compressLargestEdge: 'Largest photo edge',
  compressKeepFullSize: 'Keep full size',
  compressEdgeEmail: '1000 px — email',
  compressEdgeScreen: '1600 px — screen',
  compressEdgePrint: '2400 px — print',
  compressReEncode: 'Re-encode photos inside the PDF',
  compressReEncoding: 'Re-encoding photos',
  compressClearMetadata: 'Clear title, author and producer',
  compressCeiling: 'Ceiling (KB)',
  compressFitCeiling: 'Fit under a portal ceiling',
  compressWhereItRan: 'Where it ran',
  compressSave: 'Save compressed PDF',
  compressCouldnt: 'Couldn’t compress this PDF',
  compressOperation: 'PDF compressor',
  compressInspecting: 'Inspecting PDF locally…',
  compressSummaryOne: '{pages} page rewritten and checked in this browser.',
  compressSummaryMany: '{pages} pages rewritten and checked in this browser.',
  compressNoneReEncoded: 'None re-encoded',
  compressReEncodedCount: '{count} re-encoded',
  compressPhotoQualityValue: 'Photo quality {quality}%',
  compressCeilingLine: 'Ceiling {bytes}.',
  compressRewriteOne: 'rewrite',
  compressRewriteMany: 'rewrites',
  compressFitAlreadyUnder:
    'The file you opened was already under it, so nothing was re-encoded and nothing was lost.',
  compressFitMet:
    'Reached after {attempts} measured {rewrites}, at photo quality {quality}% and a largest photo edge of {edge} px. Every attempt was weighed on the bytes it actually produced, not on an estimate.',
  compressFitMissed:
    '{attempts} measured {rewrites} were tried, down to photo quality {quality}% at {edge} px, and none landed under it. Saving this gives you the smallest one produced. Split the document, or take the pages the portal actually asked for.',
  compressNothingSaved:
    'The rewritten file came out no smaller, so this is your original, byte for byte. A PDF that is mostly text has little left to squeeze; the gains here come from photos.',

  imagesTitle: 'Images to PDF',
  imagesAdd: 'Add images',
  imagesChoose: 'Choose images',
  imagesChooseAria: 'Choose JPEG or PNG images',
  imagesChooseHint: 'Choose JPEG or PNG images to convert to PDF',
  imagesSourceImages: 'Source images',
  imagesLabel: 'Images',
  imagesPageSize: 'Page size',
  imagesFitEach: 'Fit each image',
  imagesUsLetter: 'US Letter',
  imagesOrientation: 'Orientation',
  imagesMatchEach: 'Match each image',
  imagesPortrait: 'Portrait',
  imagesLandscape: 'Landscape',
  imagesMargin: 'Margin',
  imagesMarginNone: 'None',
  imagesMarginSmall: 'Small',
  imagesMarginMedium: 'Medium',
  imagesMarginLarge: 'Large',
  imagesOnePerImage: 'One PDF page is created for each image.',
  imagesCreate: 'Create',
  imagesEmbedding: 'Embedding images',
  imagesSave: 'Save generated PDF',
  imagesCouldnt: 'Couldn’t create this PDF',
  imagesPrivacyBoundary: 'Privacy boundary',
  imagesNoNetwork: 'No file network primitive',
  imagesUnsupported:
    'Choose JPEG or PNG images. Animated and vector images are not supported here.',
  imagesSummaryOne: '{count} image arranged into one checked PDF.',
  imagesSummaryMany: '{count} images arranged into one checked PDF.',
  imagesBuilding: 'Building locally…',
  imagesCreatePdf: 'Create PDF',
  imagesFitImage: 'Fit image',

  toWordTitle: 'PDF to Word',
  toWordShort: 'To Word',
  chooseAPdf: 'Choose a PDF',
  toWordChooseAria: 'Choose PDF file(s)',
  toWordChooseHint: 'Choose a PDF from this device to convert.',
  toWordRemoveAria: 'Remove the chosen PDF',
  toWordSave: 'Save Word document',
  toWordSaveShort: 'Save Word file',
  toWordWordFile: 'Word file',
  toWordParagraphs: 'Paragraphs',
  toWordCharacters: 'Characters',
  toWordTook: 'Took',
  toWordConvertAnother: 'Convert another',
  toWordOcrLink: 'Read this scan with OCR',
  toWordScope: 'What this does, and what it does not',
  toWordCouldnt: 'Couldn’t convert this PDF',
  toWordSummaryOne: '{pages} page read in this browser; text only.',
  toWordSummaryMany: '{pages} pages read in this browser; text only.',
  toWordNoTextNote:
    '{without} of {total} pages held no text and contributed nothing to the Word file. Those pages are images — a scan or a photo — so there was nothing to copy.',
  toWordTextOnlyNote:
    'Text only. Layout, columns, tables and images from the PDF are not in this file.',

  optimizeTitle: 'Optimize image',
  optimizeAction: 'Optimize',
  optimizeImage: 'Image',
  optimizeSourceImage: 'Source image',
  optimizeChoose: 'Choose an image',
  optimizeChooseAria: 'Choose image to optimize',
  optimizeMaxWidth: 'Max width',
  optimizeMaxHeight: 'Max height',
  optimizeOutputFormat: 'Output format',
  optimizeSave: 'Save image',
  optimizeOriginalUnchanged: 'The original stays unchanged.',
  optimizeDecodedMatch: 'Decoded dimensions match',
  optimizeInThisTab: 'In this tab',
  optimizeReleaseAssurance: 'Release assurance',
  optimizeEgressPending: 'Formal egress proof pending',
  optimizeCouldnt: 'Couldn’t optimize this image',
  optimizeOperation: 'Image optimizer',
  optimizeSummary: 'Image converted to {format} at {width} × {height}px.',
  optimizeChooseMany: 'Choose image(s)',
  optimizeBusy: 'Optimizing…',
  optimizeAll: 'Optimize all',
  optimizePreviewAlt: 'Optimized preview',
  optimizeNextMerge: 'Next: Merge PDF →',
};

/**
 * Fills `{name}` placeholders in a message.
 *
 * The alternative was one string per number, which is how a UI ends up saying
 * "1 pages". Where English switches between a singular and a plural word the
 * catalogue carries both forms -- `compressSummaryOne` beside
 * `compressSummaryMany` -- and the component picks, exactly as it did before.
 * A locale whose grammar needs more than two forms words its "many" string so
 * that no form is needed: Russian says "Перезаписано и проверено страниц: 5",
 * which is right for every number, rather than guessing a case from a count.
 */
export function fillMessage(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}
