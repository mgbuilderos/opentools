import path from 'node:path';
import { defineConfig } from 'vite';

/**
 * Bundles `operations-browser-harness.ts` into one browser script so the
 * Playwright audit can run every workbench operation inside Chromium and
 * WebKit. Output is build output, not source: see `tmp/` in .gitignore.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: path.resolve(import.meta.dirname, '../tmp/e2e-harness'),
    emptyOutDir: true,
    minify: false,
    target: 'es2022',
    lib: {
      entry: path.resolve(import.meta.dirname, 'operations-browser-harness.ts'),
      name: 'OperationsHarness',
      formats: ['iife'],
      fileName: () => 'harness.js',
    },
  },
});
