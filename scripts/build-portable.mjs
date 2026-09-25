#!/usr/bin/env node
/**
 * Package the built site as a folder somebody can carry on a USB stick.
 *
 * WHY THIS EXISTS. The product's whole claim is that the work happens on the
 * machine in front of you. A copy you can hold is the strongest possible form
 * of that claim: it needs no internet, no account and no permission, it cannot
 * be withdrawn, rate-limited or acquired, and it keeps working when this
 * domain does not. Sysadmins and privacy people pass artifacts like this
 * around by hand, and that is distribution that never touches a search engine.
 *
 * WHY IT SHIPS A SERVER AND NOT JUST FILES. `dist/client` is already fully
 * static — `scripts/prerender-to-assets.mjs` guarantees every public URL
 * answers from a file — but the files are `about.html`, not `about/index.html`,
 * so opening them over `file://` gives you a folder listing and broken links.
 * Worse, `file://` is an opaque origin in every current browser: no service
 * worker, no `caches`, and the offline machinery the site depends on is simply
 * absent. So the bundle carries a ~60-line static server with no dependencies
 * beyond Node itself, binding loopback only.
 *
 * It is deliberately NOT a single executable. That would mean shipping a
 * bundled runtime per platform, which is three large binaries this project
 * cannot sign, cannot reproducibly build and cannot audit — for a product
 * whose entire argument is that you can check what it does.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'dist', 'client');
const OUT = path.join(ROOT, 'release', 'opentools-portable');

/** Total bytes of a directory tree. Used only to report, never to gate. */
export function treeSize(directory) {
  let total = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    total += entry.isDirectory() ? treeSize(absolute) : statSync(absolute).size;
  }
  return total;
}

export function humanBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
}

const SERVER = `#!/usr/bin/env node
/*
  A static file server for the OpenTools portable bundle. No dependencies.

  It binds 127.0.0.1 on purpose: this bundle ships no TLS and no
  authentication, so anyone who can reach the port gets the whole site. Serving
  it to a network is a decision for whoever does it, not a default.

  It makes no outbound request of any kind. You can prove that rather than
  believe it: unplug the machine from the network and use the site.
*/
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'site');
const PORT = Number(process.env.PORT || 8796);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.zip': 'application/zip',
  '.onnx': 'application/octet-stream',
  '.traineddata': 'application/octet-stream',
};

/*
  The site is prerendered as \`about.html\`, not \`about/index.html\`, so a
  request for /about has to try the .html spelling. Resolved paths are checked
  to stay inside the bundle: a request carrying ../ must not escape it.
*/
function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const candidates =
    clean === '/'
      ? ['index.html']
      : [clean.slice(1), \`\${clean.slice(1)}.html\`, path.join(clean.slice(1), 'index.html')];
  for (const candidate of candidates) {
    const absolute = path.resolve(ROOT, candidate);
    if (!absolute.startsWith(ROOT + path.sep) && absolute !== ROOT) continue;
    if (existsSync(absolute) && statSync(absolute).isFile()) return absolute;
  }
  return null;
}

createServer((request, response) => {
  const file = resolve(request.url || '/');
  if (!file) {
    const notFound = path.join(ROOT, '404.html');
    if (existsSync(notFound)) {
      response.writeHead(404, { 'content-type': TYPES['.html'] });
      createReadStream(notFound).pipe(response);
      return;
    }
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
    // Same policy the hosted site serves. The offline bundle must not be the
    // one copy of this site that is unsealed.
    'content-security-policy':
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  });
  createReadStream(file).pipe(response);
}).listen(PORT, '127.0.0.1', () => {
  process.stdout.write(\`OpenTools is running. Open http://127.0.0.1:\${PORT}\\n\`);
});
`;

const README = `# OpenTools, portable

A complete copy of OpenTools that runs from this folder. No internet, no
account, no licence key, nothing to install but Node.

    node serve.mjs

Then open http://127.0.0.1:8796 in any browser.

## Prove it needs nothing

Unplug the network, or turn off your wifi, and use it. Every tool keeps
working, because the work was always happening on your machine.

## What is here

- \`site/\` — the whole site as static files
- \`serve.mjs\` — a dependency-free static server, bound to 127.0.0.1

## Notes

Opening the files directly with file:// will not work properly: browsers treat
file:// as an opaque origin, which disables the service worker and local
storage the site uses. That is why the server is included.

The server listens on loopback only. It ships no TLS and no authentication, so
put a reverse proxy in front of it before serving it to anyone else.

MIT licensed. The source is at github.com/mgbuilderos/opentools — if this is
useful to you, the project takes voluntary support and nothing else.
`;

function main() {
  if (!existsSync(SOURCE)) {
    process.stderr.write(
      'dist/client is missing. Run `npm run build` first.\n',
    );
    process.exit(1);
  }
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(SOURCE, path.join(OUT, 'site'), { recursive: true });
  writeFileSync(path.join(OUT, 'serve.mjs'), SERVER);
  writeFileSync(path.join(OUT, 'README.md'), README);
  process.stdout.write(
    `[PORTABLE] ${path.relative(ROOT, OUT)} — ${humanBytes(treeSize(OUT))}\n`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
