import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Which installed packages actually put code into the deployed bytes.
 *
 * `npm audit --omit=dev` decides "runtime" from the section of `package.json`
 * a package is reached through, and that is a proxy for what ships, not a
 * measurement of it. Measured on 2026-10-13 the proxy was wrong in both
 * directions at once:
 *
 *   - `vinext` is a runtime dependency and carries its Vite plugin's own
 *     dependencies with it (`vite-plugin-commonjs -> ... -> braces`), so a
 *     glob library that never reaches `dist/` was blocking every release;
 *   - `pdfjs-dist` was a devDependency, while the client ships pdf.js 6.3.289
 *     to every visitor who opens a PDF tool, so no blocking audit ever looked
 *     at the library that parses visitor-supplied PDFs.
 *
 * The bundler is the only thing that knows which files it put into an output,
 * so this asks it. Every chunk lists the modules it was built from and every
 * emitted asset lists the files it came from; anything under `node_modules/`
 * is attributed to the package directory that holds it. The result is written
 * once per Vite environment (`client`, `rsc`, `ssr`) and once for the Web
 * Worker bundles to `dist/shipped-packages/<name>.json`, keyed by the same
 * `node_modules/...` paths `package-lock.json` uses, and
 * `scripts/audit-runtime.mjs` reads it.
 *
 * The Web Worker label is not optional. Vite builds every
 * `new Worker(new URL(...))` target in a separate pass that runs
 * `worker.plugins`, not the main plugin list, so without it the background
 * remover's `onnxruntime-web`, the HEIC decoder's `libheif-js` and the PDF
 * engine's worker copy of `pdf-lib` were all missing from the record when it
 * was first measured.
 *
 * The Worker is covered by the same record: `dist/server/wrangler.json` sets
 * `no_bundle: true`, so Wrangler uploads the files Vite wrote and resolves
 * nothing from `node_modules` itself.
 *
 * Files copied verbatim from `public/` (the OCR, ONNX and HEIC binaries) never
 * pass through the bundler and are not in this record. That is why the gate
 * uses it only to tell npm's runtime graph where it is wrong, never as a
 * replacement for it -- see `scripts/audit-runtime.mjs`.
 */

export const SHIPPED_PACKAGES_DIR = 'dist/shipped-packages';

export type ShippedPackage = {
  /** The `package-lock.json` key, e.g. `node_modules/@scope/name`. */
  path: string;
  name: string;
  version: string;
  /** How many bundled modules or emitted assets came from it. */
  files: number;
};

export type ShippedInventory = {
  environment: string;
  packages: ShippedPackage[];
};

/**
 * The installed package directory a module id or asset path belongs to,
 * relative to `root` and spelled the way `package-lock.json` spells it, or
 * `null` for anything that is not inside `node_modules` (project source,
 * virtual modules, generated code).
 *
 * The LAST `node_modules/` segment decides, so a nested copy
 * (`node_modules/a/node_modules/b/x.js`) is attributed to `b` at that nested
 * path, which is the copy that was actually bundled.
 */
export function packagePathOf(id: string, root: string): string | null {
  // Virtual-module prefix and any `?url` / `?worker` query.
  const file = (id.startsWith('\0') ? id.slice(1) : id)
    .split('?')[0]
    .replaceAll('\\', '/');
  const marker = '/node_modules/';
  const at = file.lastIndexOf(marker);
  if (at < 0) return null;
  const segments = file.slice(at + marker.length).split('/');
  const nameLength = segments[0]?.startsWith('@') ? 2 : 1;
  if (segments.length <= nameLength || !segments[0]) return null;
  const dir =
    file.slice(0, at + marker.length) + segments.slice(0, nameLength).join('/');
  const normalisedRoot = root.replaceAll('\\', '/').replace(/\/+$/, '');
  if (!dir.startsWith(`${normalisedRoot}/`)) return null;
  return dir.slice(normalisedRoot.length + 1);
}

/**
 * Record the packages each environment's output was built from.
 *
 * @param label Names the record instead of the Vite environment. Used for the
 *   Web Worker pass, which reports the environment that spawned it.
 */
export function shippedPackagesPlugin(label?: string): Plugin {
  let root = process.cwd();
  return {
    name: 'opentools:shipped-packages',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_options, bundle) {
      const counts = new Map<string, number>();
      const count = (id: string) => {
        // Asset sources can be root-relative; module ids are absolute, and may
        // carry a `\0` prefix that has to go before anything resolves them.
        const file = (id.startsWith('\0') ? id.slice(1) : id).split('?')[0];
        const dir = packagePathOf(
          path.isAbsolute(file) ? file : path.resolve(root, file),
          root,
        );
        if (dir) counts.set(dir, (counts.get(dir) ?? 0) + 1);
      };
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') output.moduleIds.forEach(count);
        else output.originalFileNames.forEach(count);
      }

      const environment = label ?? this.environment?.name ?? 'default';
      const target = path.join(
        root,
        SHIPPED_PACKAGES_DIR,
        `${environment}.json`,
      );
      // One environment can be built more than once in a run; keep the union.
      if (existsSync(target)) {
        const earlier = JSON.parse(
          readFileSync(target, 'utf8'),
        ) as ShippedInventory;
        for (const pkg of earlier.packages)
          counts.set(pkg.path, (counts.get(pkg.path) ?? 0) + pkg.files);
      }

      const packages = [...counts.entries()]
        .map(([dir, files]) => {
          const manifest = JSON.parse(
            readFileSync(path.join(root, dir, 'package.json'), 'utf8'),
          ) as { name: string; version: string };
          return {
            path: dir,
            name: manifest.name,
            version: manifest.version,
            files,
          };
        })
        .sort((a, b) => a.path.localeCompare(b.path));

      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(
        target,
        `${JSON.stringify({ environment, packages } satisfies ShippedInventory, null, 2)}\n`,
      );
    },
  };
}
