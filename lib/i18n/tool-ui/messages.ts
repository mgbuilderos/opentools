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
  runsInThisTab: string;
  freeNoAccount: string;
  batchLocalPromise: string;
  recipeCopyLink: string;
  recipeLinkCopied: string;
  recipeSettingsOnly: string;
  recipeCopyByHand: string;
  subjectFile: string;
  subjectImage: string;
  subjectText: string;
  subjectPdf: string;
  noClientAnalytics: string;
  browserCanvasNote: string;
  briefStepsHeading: string;
  briefLimitsHeading: string;

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
  mergeCapacity: string;
  mergeInspecting: string;
  mergeDropHere: string;
  mergeCanaryScope: string;
  mergeAddAtLeastTwo: string;
  mergeReady: string;
  mergeTryingSettings: string;
  mergeTooLarge: string;
  mergeTooMany: string;
  mergeMoveEarlier: string;
  mergeMoveLater: string;
  mergeRemoveFile: string;
  mergeInspectorNoStart: string;
  mergeInspectorStopped: string;
  mergeReadFailed: string;
  mergeNoStart: string;
  mergeStopped: string;

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
  compressStandfirst: string;
  compressFitUnderCeiling: string;
  compressLimitNote: string;
  compressCeilingHelp: string;
  compressPresetReadFrom: string;
  compressPresetOn: string;
  compressPresetWarning: string;
  compressReadFailed: string;
  compressNoStart: string;
  compressStopped: string;
  compressInspectorStopped: string;
  compressDoneSmaller: string;
  compressDoneAlready: string;
  compressAlreadyUnder: string;
  compressUnderCeiling: string;
  compressStillOver: string;

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
  imagesStandfirst: string;
  imagesAcceptHint: string;
  imagesTooLarge: string;
  imagesTooMany: string;
  imagesMoveUp: string;
  imagesMoveDown: string;
  imagesRemove: string;
  imagesNoStart: string;
  imagesStopped: string;

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
  toWordStandfirstLead: string;
  toWordStandfirstTail: string;
  toWordScopeProse: string;
  toWordFailed: string;
  toWordTooLarge: string;

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
  optimizeStandfirst: string;
  optimizeAcceptHint: string;
  optimizeLimitNote: string;
  optimizeWrongType: string;
  optimizeTooLarge: string;
  optimizeCanvasUnavailable: string;
  optimizeDecodeFailed: string;
  optimizeEncodeFailed: string;
  optimizeFailed: string;
  optimizeDimensionCheckFailed: string;
  optimizeNoFormat: string;
  optimizeBadDimensions: string;
  optimizeLarger: string;
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
  runsInThisTab: 'Runs in this tab — no upload',
  freeNoAccount: 'Free, no account, no watermark',
  batchLocalPromise:
    'No file-count limit, no daily limit, no queue — the work happens on this machine. Choose one file for the usual single-file flow, or select many for batch results and one ZIP.',
  recipeCopyLink: 'Copy setup link',
  recipeLinkCopied: 'Setup link copied',
  recipeSettingsOnly:
    'Sends these settings only. Your {subject} stays on this device and is never part of the link.',
  recipeCopyByHand:
    'Copy this link by hand — the browser blocked the clipboard',
  subjectFile: 'file',
  subjectImage: 'image',
  subjectText: 'text',
  subjectPdf: 'PDF',
  noClientAnalytics: 'No client-side analytics in this preview',
  browserCanvasNote: 'Browser Canvas · Static raster output',
  briefStepsHeading: 'What happens on this job',
  briefLimitsHeading: 'What it will not do',

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
  mergeCapacity: 'Up to {max} files · 150 MB total in this canary',
  mergeInspecting: 'Inspecting PDFs locally…',
  mergeDropHere: 'Drop PDFs here',
  mergeCanaryScope:
    'Canary scope: combines page content and order. Bookmarks, signatures, forms, attachments, and document-level metadata are not yet guaranteed.',
  mergeAddAtLeastTwo: 'Add at least 2 PDFs',
  mergeReady: 'Ready to merge',
  mergeTryingSettings: 'Trying compression settings',
  mergeTooLarge: 'These files exceed the current 150 MB total safety limit.',
  mergeTooMany: 'You can merge up to {max} PDFs at a time in this canary.',
  mergeMoveEarlier: 'Move {name} earlier',
  mergeMoveLater: 'Move {name} later',
  mergeRemoveFile: 'Remove {name}',
  mergeInspectorNoStart:
    'The PDF inspector could not start. Your files are unchanged.',
  mergeInspectorStopped:
    'The PDF inspector stopped unexpectedly. Your files are unchanged.',
  mergeReadFailed:
    'The browser could not read one of these files. Your originals are unchanged.',
  mergeNoStart: 'The merge could not start. Your original PDFs are unchanged.',
  mergeStopped:
    'The merge stopped unexpectedly. Your original PDFs are unchanged.',

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
  compressStandfirst:
    'Rewrite a PDF more compactly and re-encode the photos inside it. The file is read by this page and never sent to a server.',
  compressFitUnderCeiling: 'Fit under ceiling',
  compressLimitNote: 'This candidate limits a source PDF to 150 MB.',
  compressCeilingHelp:
    'Pick the form you are filing into, or type your own ceiling. The page then re-encodes at descending quality until a measured result really is under it — no estimate, and no silent loop: every attempt is a real rewrite and the count is reported.',
  compressPresetReadFrom: 'Read from',
  compressPresetOn: 'on',
  compressPresetWarning:
    'Portals change limits without announcing it — check yours before you rely on this.',
  compressReadFailed: 'The browser could not read that file.',
  compressNoStart:
    'PDF compression could not start. Your original is unchanged.',
  compressStopped:
    'PDF compression stopped unexpectedly. Your original is unchanged.',
  compressInspectorStopped: 'The PDF inspector stopped unexpectedly.',
  compressDoneSmaller: 'Done — {percent}% smaller',
  compressDoneAlready: 'Done — this PDF was already as small as we can make it',
  compressAlreadyUnder: 'Already under the ceiling — your file is unchanged',
  compressUnderCeiling: 'Under the ceiling — {size}',
  compressStillOver: 'Still over the ceiling — smallest reached was {size}',

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
  imagesStandfirst:
    'Arrange JPEG and PNG images, choose a paper layout, and create one PDF in a dedicated browser worker.',
  imagesAcceptHint: 'JPEG or PNG · 40 files · 100 MB total',
  imagesTooLarge: 'These images exceed the current 100 MB total safety limit.',
  imagesTooMany: 'Choose no more than {max} images per PDF.',
  imagesMoveUp: 'Move {name} up',
  imagesMoveDown: 'Move {name} down',
  imagesRemove: 'Remove {name}',
  imagesNoStart:
    'The browser could not start PDF creation. Your images are unchanged.',
  imagesStopped:
    'PDF creation stopped unexpectedly. Your images are unchanged.',

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
  toWordStandfirstLead: 'Pull the text out of a PDF into an editable',
  toWordStandfirstTail:
    'file. The PDF is read by this page and never sent to a server.',
  /*
    The localised form of the scope paragraph. The English page keeps its own
    markup, with "text" and "not" in bold; a translation cannot reuse that
    structure because the emphasised words land in different places in
    different languages, so each locale gets one plain paragraph instead. The
    component renders this only when a locale bundle is active.
  */
  toWordScopeProse:
    'It recovers the text: reading order, paragraphs, page breaks, and headings where the PDF sets them in larger type. It does not rebuild the page layout — columns, tables as real tables, images, and fonts are not carried across. If your PDF is a scan or a photo of paper it holds no text at all, and this page will tell you so rather than hand you an empty document.',
  toWordFailed: 'This PDF could not be converted.',
  toWordTooLarge: '{name} is {size}. This page works on files up to {max}.',

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
  optimizeStandfirst:
    'Resize, compress, and convert one static JPEG, PNG, or WebP without uploading it.',
  optimizeAcceptHint: 'JPEG, PNG, or WebP · 25 MB maximum',
  optimizeLimitNote: 'This candidate limits source images to 25 MB.',
  optimizeWrongType:
    'Choose a JPEG, PNG, or WebP image. Animated output is not supported.',
  optimizeTooLarge: 'The 25 MB file limit was exceeded.',
  optimizeCanvasUnavailable:
    'Canvas processing is unavailable in this browser.',
  optimizeDecodeFailed: 'The browser could not decode this image.',
  optimizeEncodeFailed: 'The browser could not encode this image.',
  optimizeFailed: 'The image could not be optimized.',
  optimizeDimensionCheckFailed:
    'The optimized image failed its dimension check.',
  optimizeNoFormat: 'This browser did not produce a usable image format.',
  optimizeBadDimensions:
    'Width and height must be whole numbers from 1 to 12,000.',
  optimizeLarger: '{percent}% larger',
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
/** The localised word for a noun the recipe sentence interpolates. */
export function subjectNoun(t: ToolUiMessages, english: string): string {
  if (english === 'image') return t.subjectImage;
  if (english === 'text') return t.subjectText;
  if (english === 'PDF') return t.subjectPdf;
  return english === 'file' ? t.subjectFile : english;
}

export function fillMessage(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}
