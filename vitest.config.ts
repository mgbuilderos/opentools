import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // The app imports `next/server`; vinext supplies it at build time and
      // there is no `next` package installed. Tests that exercise `proxy.ts`
      // need the same shim the build uses.
      'next/server': 'vinext/shims/server',
      '@': projectRoot,
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
});
