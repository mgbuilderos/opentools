export type PdfWorkerInput = {
  id: string;
  name: string;
  bytes: ArrayBuffer;
};

export type PdfImageInput = PdfWorkerInput & {
  mimeType: 'image/jpeg' | 'image/png';
};

export type ImagesToPdfOptions = {
  pageSize: 'image' | 'a4' | 'letter';
  orientation: 'auto' | 'portrait' | 'landscape';
  margin: 0 | 12 | 24 | 36;
};

export type PdfInspectRequest = {
  type: 'inspect';
  inputs: PdfWorkerInput[];
};

export type PdfMergeRequest = {
  type: 'merge';
  inputs: PdfWorkerInput[];
};

export type PdfExtractRequest = {
  type: 'extract';
  input: PdfWorkerInput;
  pages: number[];
};

export type PdfPageTransformOptions = {
  pageOrder: number[];
  rotation: 0 | 90 | 180 | 270;
  pageNumbers: boolean;
  watermark: string;
  metadata: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
  };
  flatten?: boolean;
};

export type PdfTransformRequest = {
  type: 'transform';
  input: PdfWorkerInput;
  options: PdfPageTransformOptions;
};

export type ImagesToPdfRequest = {
  type: 'images-to-pdf';
  inputs: PdfImageInput[];
  options: ImagesToPdfOptions;
};

export type PdfCompressOptions = {
  /** Re-encode embedded JPEGs. Off means the lossless rewrite only. */
  recompressImages: boolean;
  /** JPEG quality, 1-100. Ignored when recompressImages is false. */
  imageQuality: number;
  /** Longest edge an embedded image may keep, in pixels. */
  maxImageDimension: number;
  removeMetadata: boolean;
};

export type PdfCompressRequest = {
  type: 'compress';
  input: PdfWorkerInput;
  options: PdfCompressOptions;
};

export type PdfFormFieldKind =
  | 'text'
  | 'checkbox'
  /** Same-name check boxes whose widgets have different on-values. */
  | 'checkboxGroup'
  | 'radio'
  | 'dropdown'
  | 'optionList';

/**
 * A field's value in the shape its kind needs: `boolean` for a checkbox,
 * `string[]` for an option list (at most one entry unless `multiSelect`), and
 * `string` for everything else. For choices the string is the export value,
 * never the display text. An empty string means nothing is selected.
 */
export type PdfFormFieldValue = string | string[] | boolean;

/** One choice: `value` is written to the file, `display` is shown. */
export type PdfFormOption = { value: string; display: string };

/**
 * Why a field is offered read-only.
 * - `locked`: the PDF itself marks the field read-only.
 * - `richText`: rich text cannot be edited without breaking its formatting.
 * - `duplicateName`: another field has the same name, so a value typed into
 *   one could not be told apart from the other.
 * - `unreadable`: the field could not be read.
 */
export type PdfFormFieldReadOnlyReason =
  | 'locked'
  | 'richText'
  | 'duplicateName'
  | 'unreadable';

/** One fillable field, described for the UI without exposing pdf-lib types. */
export type PdfFormField = {
  /** Unique within one file. Use it to key state and to send values back. */
  id: string;
  name: string;
  kind: PdfFormFieldKind;
  /**
   * Choices for radio, dropdown, option-list and checkbox-group fields. A
   * checkbox group's options are its on-values.
   */
  options: PdfFormOption[];
  value: PdfFormFieldValue;
  readOnly: boolean;
  readOnlyReason: PdfFormFieldReadOnlyReason | null;
  required: boolean;
  /**
   * Hidden or NoView, or not placed on any page. Do not offer it for editing;
   * "Make it final" removes it without printing it.
   */
  hidden: boolean;
  multiline: boolean;
  /** Option lists only: more than one choice may be kept. */
  multiSelect: boolean;
  /** Dropdowns only: a value outside the options may be typed. */
  editable: boolean;
  /** Text fields only: the most characters the field accepts. */
  maxLength: number | null;
  /** Zero-based page of the field's first visible widget. */
  pageIndex: number | null;
  /**
   * The form computes this field with its own script (/CO or a calculate
   * action). Scripts are not run here, so the value is not recalculated.
   */
  calculated: boolean;
};

/** One page's geometry. The UI places signatures in `width` × `height`. */
export type PdfPageGeometry = {
  /** Visible area in PDF user space: the CropBox clipped to the MediaBox. */
  box: { x: number; y: number; width: number; height: number };
  rotation: 0 | 90 | 180 | 270;
  /** Size as a viewer displays the page, after rotation. */
  width: number;
  height: number;
};

export type PdfFormDocumentInfo = {
  /**
   * The file already carries a digital signature (or usage rights), which
   * any change would break. Filling and signing are refused.
   */
  hasDigitalSignature: boolean;
  /**
   * `dynamic` XFA cannot be filled here and is refused. `static` XFA also has
   * ordinary form fields; every save removes the XFA part, and the ordinary
   * fields stay unless the form is made final.
   */
  xfa: 'none' | 'static' | 'dynamic';
  /**
   * The file has a form that could not be read. It can still be signed, but
   * not filled or made final.
   */
  formUnreadable: boolean;
};

/**
 * A signature or initial stamped onto one page. `x` and `y` are the top-left
 * corner in PDF points, measured on the page as displayed (after rotation);
 * the height follows from the image's aspect ratio. The whole stamp must lie
 * inside the page.
 */
export type PdfSignaturePlacement = {
  /** PNG bytes of the drawn or typed signature. */
  image: ArrayBuffer;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
};

export type PdfFillOptions = {
  /**
   * Field id to new value, for the fields the user changed. Unknown ids,
   * read-only and hidden fields, and values equal to the current value are
   * skipped. Fields not listed are never rewritten.
   */
  values: Record<string, PdfFormFieldValue>;
  signature: PdfSignaturePlacement | null;
  /**
   * Bake the values into the page so they can no longer be edited. This also
   * removes the form, which is what most people mean by "signed and final".
   * Refused while a required field is empty.
   */
  flatten: boolean;
};

export type PdfFormInspectRequest = {
  type: 'inspect-form';
  input: PdfWorkerInput;
};

export type PdfFillRequest = {
  type: 'fill';
  input: PdfWorkerInput;
  options: PdfFillOptions;
};

export type PdfWorkerRequest =
  | PdfInspectRequest
  | PdfMergeRequest
  | PdfExtractRequest
  | PdfTransformRequest
  | ImagesToPdfRequest
  | PdfCompressRequest
  | PdfFormInspectRequest
  | PdfFillRequest;

export type PdfWorkerResponse =
  | {
      type: 'inspected';
      files: Array<{ id: string; pages: number }>;
    }
  | {
      type: 'form';
      pages: number;
      pageSizes: PdfPageGeometry[];
      fields: PdfFormField[];
      document: PdfFormDocumentInfo;
    }
  | {
      type: 'progress';
      completed: number;
      total: number;
      phase: 'reading' | 'copying' | 'validating';
    }
  | {
      type: 'result';
      bytes: ArrayBuffer;
      pageCount: number;
      computeDurationMs: number;
      validationDurationMs: number;
      /** Set by compression only; every other task leaves these undefined. */
      originalByteLength?: number;
      compressedByteLength?: number;
      imagesRecompressed?: number;
      imagesLeftAlone?: number;
      /** Set by form filling only: fields whose value actually changed. */
      fieldsChanged?: number;
      signaturePlaced?: boolean;
      flattened?: boolean;
    }
  | {
      type: 'error';
      code:
        | 'INVALID_PDF'
        | 'ENCRYPTED_PDF'
        | 'RESTRICTED_PDF'
        | 'SIGNED_PDF'
        | 'XFA_PDF'
        | 'REQUIRED_FIELDS'
        | 'EMPTY_PDF'
        | 'MERGE_FAILED'
        | 'EXTRACT_FAILED'
        | 'TRANSFORM_FAILED'
        | 'COMPRESS_FAILED'
        | 'FILL_FAILED'
        | 'IMAGE_TO_PDF_FAILED';
      message: string;
      inputId?: string;
      /** Fields the error is about, by id (required fields, unsupported text). */
      fieldIds?: string[];
    };
