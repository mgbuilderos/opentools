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
      // Same reason, for the four `[slug]` pages that call `notFound()`.
      // `description-coverage.test.ts` imports page modules to call their real
      // `generateMetadata`, so they have to resolve.
      'next/navigation': path.join(projectRoot, 'lib/testing/next-navigation'),
      'next/image': path.join(projectRoot, 'lib/testing/next-image'),
      '@': projectRoot,
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
});
