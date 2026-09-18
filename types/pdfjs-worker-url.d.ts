/**
 * Vite's `?url` suffix resolves an asset to its built URL. TypeScript has no
 * knowledge of it, so the PDF worker import needs a declaration.
 *
 * Scoped to this one specifier rather than a blanket `*?url` so an accidental
 * asset import somewhere else still fails type checking.
 */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs?url' {
  const workerUrl: string;
  export default workerUrl;
}
