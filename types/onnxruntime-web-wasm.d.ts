// onnxruntime-web ships declarations for this entry point in `types.d.ts`, but
// its package `exports` map omits them, so bundler resolution cannot find them.
declare module 'onnxruntime-web/wasm' {
  export * from 'onnxruntime-common';
}
