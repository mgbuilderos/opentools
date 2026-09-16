import fs from 'node:fs';
import { PNG } from 'pngjs';
import { encodeIco } from '../lib/tools/favicon-pack.ts';

function renderIcon(size) {
  const png = new PNG({ width: size, height: size });
  const samples = 4;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bgCoverage = 0;
      let letterCoverage = 0;

      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const u = (px + (sx + 0.5) / samples) / size;
          const v = (py + (sy + 0.5) / samples) / size;

          const rBg = 0.21;
          const qx = Math.abs(u - 0.5) - (0.5 - rBg);
          const qy = Math.abs(v - 0.5) - (0.5 - rBg);
          const dx = Math.max(qx, 0);
          const dy = Math.max(qy, 0);
          const distBg = Math.sqrt(dx * dx + dy * dy);
          const isInsideBg = distBg <= rBg;

          if (isInsideBg) {
            bgCoverage++;

            const oOx = Math.abs(u - 0.33) - 0.05;
            const oOy = Math.abs(v - 0.5) - 0.1;
            const distOOut = Math.sqrt(
              Math.max(oOx, 0) ** 2 + Math.max(oOy, 0) ** 2,
            );
            const insideOOut = distOOut <= 0.09;

            const oIx = Math.abs(u - 0.33) - 0.005;
            const oIy = Math.abs(v - 0.5) - 0.055;
            const distOIn = Math.sqrt(
              Math.max(oIx, 0) ** 2 + Math.max(oIy, 0) ** 2,
            );
            const insideOIn = distOIn <= 0.045;

            const isLetterO = insideOOut && !insideOIn;

            const tBarX = Math.abs(u - 0.7) - 0.11;
            const tBarY = Math.abs(v - 0.355) - 0.005;
            const distTBar = Math.sqrt(
              Math.max(tBarX, 0) ** 2 + Math.max(tBarY, 0) ** 2,
            );
            const isTBar = distTBar <= 0.035;

            const tStemX = Math.abs(u - 0.7) - 0.005;
            const tStemY = Math.abs(v - 0.525) - 0.125;
            const distTStem = Math.sqrt(
              Math.max(tStemX, 0) ** 2 + Math.max(tStemY, 0) ** 2,
            );
            const isTStem = distTStem <= 0.035;

            const isLetterT = isTBar || isTStem;

            if (isLetterO || isLetterT) {
              letterCoverage++;
            }
          }
        }
      }

      const totalSamples = samples * samples;
      const alphaBg = bgCoverage / totalSamples;
      const alphaLetter = letterCoverage / totalSamples;

      const idx = (py * size + px) * 4;

      if (alphaBg === 0) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
      } else {
        const r = Math.round(9 + (255 - 9) * alphaLetter);
        const g = Math.round(9 + (255 - 9) * alphaLetter);
        const b = Math.round(11 + (255 - 11) * alphaLetter);
        const a = Math.round(255 * alphaBg);

        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = a;
      }
    }
  }

  return PNG.sync.write(png);
}

const sizes = [16, 32, 48, 180, 192, 512];
const pngFrames = [];

for (const size of sizes) {
  const pngBytes = renderIcon(size);
  if (size === 16 || size === 32 || size === 48) {
    pngFrames.push({ width: size, height: size, pngBytes });
  }
  if (size === 32) {
    fs.writeFileSync('public/icon-32.png', pngBytes);
  }
  if (size === 180) {
    fs.writeFileSync('public/apple-touch-icon.png', pngBytes);
  }
  if (size === 192) {
    fs.writeFileSync('public/icon-192.png', pngBytes);
  }
  if (size === 512) {
    fs.writeFileSync('public/icon-512.png', pngBytes);
  }
  console.log(`Generated ${size}x${size} PNG`);
}

const icoBytes = encodeIco(pngFrames);
fs.writeFileSync('public/favicon.ico', icoBytes);
console.log('Generated public/favicon.ico');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="108" fill="#09090b"/>
  <text x="256" y="340" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="250" font-weight="900" letter-spacing="-8" text-anchor="middle">OT</text>
</svg>
`;
fs.writeFileSync('public/favicon.svg', svg, 'utf8');
console.log('Generated public/favicon.svg');

const manifest = {
  name: 'OpenTools — Private Browser Utilities',
  short_name: 'OpenTools',
  description:
    '100% in-browser, zero-upload private utilities for PDF, images, video, text, developer, and structured data.',
  start_url: '/',
  display: 'standalone',
  background_color: '#09090b',
  theme_color: '#09090b',
  icons: [
    {
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: '/favicon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
    },
  ],
};
fs.writeFileSync(
  'public/site.webmanifest',
  JSON.stringify(manifest, null, 2),
  'utf8',
);
console.log('Generated public/site.webmanifest');
