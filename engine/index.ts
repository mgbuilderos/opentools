/**
 * Framework-free engine entry (owner decision 13).
 *
 * Re-exports tool logic that runs without React, Next/Vinext, `app/`,
 * `components/` or any network API. Unstable and unpublished: names follow the
 * source modules and may change with them. `engine/boundary.test.ts` proves
 * the import closure; `engine/README.md` lists what is not yet separable.
 */

// Manifest contract.
export type {
  ExecutionMode,
  ToolManifest,
  ToolStatus,
} from '../lib/tools/types';

// PDF engine (pdf-lib). Runs in Node and workers alike.
export {
  compressPdf,
  extractPdfPages,
  fillPdfForm,
  hasPdfSignature,
  imagesToPdf,
  inspectPdfForm,
  inspectPdfInputs,
  mergePdfInputs,
  PdfEngineError,
  transformPdfPages,
} from '../lib/tools/pdf/engine';
export type {
  PdfCompressResult,
  PdfEngineErrorCode,
} from '../lib/tools/pdf/engine';
export { parsePageSelection } from '../lib/tools/pdf/page-selection';
export type {
  ImagesToPdfOptions,
  ImagesToPdfRequest,
  PdfCompressOptions,
  PdfCompressRequest,
  PdfExtractRequest,
  PdfFillOptions,
  PdfFillRequest,
  PdfFormField,
  PdfFormInspectRequest,
  PdfImageInput,
  PdfInspectRequest,
  PdfMergeRequest,
  PdfPageTransformOptions,
  PdfSignaturePlacement,
  PdfTransformRequest,
  PdfWorkerInput,
  PdfWorkerRequest,
  PdfWorkerResponse,
} from '../lib/tools/pdf/protocol';
// Browser-only when called: needs OffscreenCanvas and createImageBitmap.
export {
  canReencodeImages,
  reencodeJpegWithCanvas,
} from '../lib/tools/pdf/jpeg-reencode';
export type {
  JpegReencoder,
  ReencodedJpeg,
} from '../lib/tools/pdf/jpeg-reencode';

// U²-Net background removal: pre- and post-processing only, no inference.
export {
  MIN_FOREGROUND_RATIO,
  rgbaToTensor,
  saliencyToMatte,
  U2NETP,
} from '../lib/tools/background-removal/u2netp';
export type {
  BackgroundRemovalRequest,
  BackgroundRemovalResponse,
} from '../lib/tools/background-removal/protocol';

// Image helpers (pixel and geometry maths; canvas drawing stays in the site).
export { encodeIco } from '../lib/tools/favicon-pack';
export type { IcoFrame } from '../lib/tools/favicon-pack';
export {
  calculateContainDimensions,
  canvasFilter,
  extensionForRasterType,
  makeSolidBackgroundTransparent,
  parseHexColor,
  supportedRasterTypes,
  transformedDimensions,
  validateCrop,
} from '../lib/tools/image';
export type { ImageCrop, QuarterTurn, RasterFormat } from '../lib/tools/image';

// Structured data.
export {
  csvToJson,
  csvToRecords,
  StructuredDataError,
  transformJson,
} from '../lib/tools/structured';
export type { CsvResult, JsonTransformMode } from '../lib/tools/structured';

// Text case.
export {
  countWords,
  textCaseOptions,
  transformText,
} from '../lib/tools/text-case';
export type { TextCaseMode } from '../lib/tools/text-case';

// Utilities.
export {
  calculatePercentage,
  calendarAge,
  convertTimestamp,
  dateDifference,
  decodeBase64Text,
  encodeBase64Text,
  formatNumber,
  generateUuids,
  hashBytes,
} from '../lib/tools/utility';
export type {
  CalendarAge,
  HashAlgorithm,
  PercentageMode,
  TimestampResult,
} from '../lib/tools/utility';

// Workbenches: operation catalogues and their run functions.
export {
  CREATOR_OPERATIONS,
  runCreatorOperation,
} from '../lib/tools/creator-workbench';
export type {
  CreatorField,
  CreatorOperation,
} from '../lib/tools/creator-workbench';
export { DATE_OPERATIONS, runDateOperation } from '../lib/tools/date-workbench';
export {
  ADVANCED_DEVELOPER_OPERATIONS,
  convertJsonToTypeScript,
  convertJsonToZodSchema,
  generateSqlErDiagramSvg,
  runAdvancedDeveloperOperation,
} from '../lib/tools/developer-advanced-workbench';
export type {
  AdvancedDeveloperField,
  AdvancedDeveloperOperation,
} from '../lib/tools/developer-advanced-workbench';
export {
  DEVELOPER_DATA_OPERATIONS,
  runDeveloperDataOperation,
} from '../lib/tools/developer-data-workbench';
export type {
  DeveloperField,
  DeveloperFieldOption,
  DeveloperOperation,
} from '../lib/tools/developer-data-workbench';
export {
  DOCUMENT_OPERATIONS,
  runDocumentOperation,
} from '../lib/tools/document-workbench';
export type {
  DocumentField,
  DocumentOperation,
} from '../lib/tools/document-workbench';
export {
  FILE_WORKBENCH_OPERATIONS,
  runFileWorkbenchOperation,
} from '../lib/tools/file-workbench';
export type {
  FileWorkbenchField,
  FileWorkbenchOperation,
  FileWorkbenchResult,
  GeneratedFile,
  LocalFileInput,
} from '../lib/tools/file-workbench';
export {
  FINANCE_OPERATIONS,
  runFinanceOperation,
} from '../lib/tools/finance-business-workbench';
export type {
  FinanceField,
  FinanceOperation,
} from '../lib/tools/finance-business-workbench';
export {
  LIFE_ADMIN_OPERATIONS,
  runLifeAdminOperation,
} from '../lib/tools/life-admin-workbench';
export type {
  LifeAdminField,
  LifeAdminOperation,
} from '../lib/tools/life-admin-workbench';
export { MATH_OPERATIONS, runMathOperation } from '../lib/tools/math-workbench';
export type {
  MathField,
  MathFieldOption,
  MathOperation,
} from '../lib/tools/math-workbench';
export {
  PRODUCTIVITY_OPERATIONS,
  runProductivityOperation,
} from '../lib/tools/productivity-workbench';
export type {
  ProductivityField,
  ProductivityOperation,
} from '../lib/tools/productivity-workbench';
export {
  buildQrPayload,
  gs1CheckDigit,
  QR_BARCODE_OPERATIONS,
  runQrBarcodeOperation,
} from '../lib/tools/qr-barcode-workbench';
export type {
  QrBarcodeField,
  QrBarcodeOperation,
} from '../lib/tools/qr-barcode-workbench';
export {
  runScienceOperation,
  SCIENCE_OPERATIONS,
} from '../lib/tools/science-education-workbench';
export type {
  ScienceField,
  ScienceOperation,
} from '../lib/tools/science-education-workbench';
export {
  runSpreadsheetOperation,
  SPREADSHEET_OPERATIONS,
} from '../lib/tools/spreadsheet-workbench';
export type {
  SpreadsheetField,
  SpreadsheetOperation,
} from '../lib/tools/spreadsheet-workbench';
export { runTextOperation, TEXT_OPERATIONS } from '../lib/tools/text-workbench';
export type {
  TextOperation,
  TextOperationId,
  TextOperationOptions,
  TextOperationResult,
} from '../lib/tools/text-workbench';
export { runWebOperation, WEB_OPERATIONS } from '../lib/tools/web-workbench';
export type {
  WebField,
  WebFieldOption,
  WebOperation,
} from '../lib/tools/web-workbench';
export {
  runWritingOperation,
  WRITING_OPERATIONS,
} from '../lib/tools/writing-workbench';
export type {
  WritingField,
  WritingOperation,
} from '../lib/tools/writing-workbench';
