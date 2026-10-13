import { describe, expect, it } from 'vitest';

import { packagePathOf } from './shipped-packages';

const root = '/work/app';

describe('attributing a bundled file to the package that holds it', () => {
  it.each([
    [
      '/work/app/node_modules/pdfjs-dist/build/pdf.mjs',
      'node_modules/pdfjs-dist',
    ],
    [
      '/work/app/node_modules/@base-ui/react/esm/index.js',
      'node_modules/@base-ui/react',
    ],
    // The nested copy is the one that was bundled, and the lockfile keys it so.
    [
      '/work/app/node_modules/pdf-lib/node_modules/pako/lib/zlib/deflate.js',
      'node_modules/pdf-lib/node_modules/pako',
    ],
    [
      '/work/app/node_modules/vinext/node_modules/ipaddr.js/lib/ipaddr.js',
      'node_modules/vinext/node_modules/ipaddr.js',
    ],
    // Virtual-module prefix and import queries are not part of the path.
    [
      '\0/work/app/node_modules/react/index.js?commonjs-proxy',
      'node_modules/react',
    ],
    [
      '/work/app/node_modules/pdfjs-dist/build/pdf.worker.mjs?url',
      'node_modules/pdfjs-dist',
    ],
    // vinext vendors a few helpers inside its own dist; they are vinext's code.
    [
      '/work/app/node_modules/vinext/dist/deps/.pnpm/pathslash@0.1.0/deps/pathslash/dist/index.js',
      'node_modules/vinext',
    ],
  ])('%s -> %s', (id, expected) => {
    expect(packagePathOf(id, root)).toBe(expected);
  });

  it.each([
    ['project source', '/work/app/components/pdf-redact-tool.tsx'],
    ['a virtual module', '\0vite/preload-helper.js'],
    ['another checkout', '/elsewhere/node_modules/react/index.js'],
    ['a bare node_modules directory', '/work/app/node_modules/'],
  ])('ignores %s', (_label, id) => {
    expect(packagePathOf(id, root)).toBeNull();
  });

  it('reads Windows paths the same way', () => {
    expect(
      packagePathOf(
        'C:\\work\\app\\node_modules\\clsx\\dist\\clsx.mjs',
        'C:\\work\\app',
      ),
    ).toBe('node_modules/clsx');
  });
});
