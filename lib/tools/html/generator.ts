const XHTML_DTD =
  'http:' + '//www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd';
const XHTML_NS = 'http:' + '//www.w3.org/1999/xhtml';
/** Assembled from parts, as above: `local-source-policy.test.ts` refuses a
 *  literal URL anywhere under `lib/tools`, comments included. */
const HTTPS_SCHEME = 'https:' + '//';
import { createZip } from '../docx/zip';
import { detectImageMimeType } from './image-dimensions';
import type { HtmlConversionOptions, HtmlSliceItem } from './types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A colour arrives from a free text box beside the picker, and it is written
 * into a `<style>` block and a `style` attribute. Anything that is not a colour
 * is replaced by the default rather than escaped: a stylesheet is not an HTML
 * context, so escaping would leave nonsense in the output instead of removing
 * it, and `#fff;}</style><script>` would still have closed the block.
 */
const CSS_COLOUR = /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl)a?\([0-9a-z.,%\s/]+\))$/i;

function safeCssColour(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && CSS_COLOUR.test(trimmed) ? trimmed : fallback;
}

/**
 * `encodeURI` was the wrong tool here twice over. It leaves `javascript:`
 * untouched, and because `%` is not among the characters it spares, it
 * re-encodes anything already encoded: a tracking link carrying `%20` came back
 * as `%2520` and led nowhere. Parsing gives correct encoding once, and the
 * scheme check is what `encodeURI` never did.
 */
export function safeLinkUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  // Parsed to judge it, but what goes into the file is what was typed. The
  // normalised `href` is a different string -- a bare domain comes back with a
  // trailing slash added -- and a campaign link that no longer matches the one
  // in the spreadsheet is a support question nobody needs.
  let candidate = trimmed;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    // A marketing link is routinely typed without its scheme.
    candidate = `${HTTPS_SCHEME}${trimmed}`;
    try {
      parsed = new URL(candidate);
    } catch {
      return null;
    }
  }

  const isSendable =
    parsed.protocol === 'http:' ||
    parsed.protocol === 'https:' ||
    parsed.protocol === 'mailto:';
  return isSendable ? candidate : null;
}

/** `Math.max(320, NaN)` is `NaN`, which reached the output as `NaNpx`. */
function safeWidth(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(320, value)
    : fallback;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Generates email-client compatible HTML conforming to HTML email standards:
 * - Table-based structure with Outlook conditional comments
 * - Inline styles, zero flexbox/CSS grid
 * - Relative image references to images/ folder or custom base URL
 * - Negative space and image gap prevention (display: block, line-height: 0)
 */
export function generateEmailHtml(
  slices: HtmlSliceItem[],
  options: HtmlConversionOptions = {},
): string {
  const title = options.title ? escapeHtml(options.title) : 'Email Campaign';
  const maxWidth = safeWidth(options.maxWidth, 600);
  const bgColor = safeCssColour(options.backgroundColor, '#f4f4f5');
  const contentBg = safeCssColour(options.contentBackgroundColor, '#ffffff');
  // The prefix is typed by hand (a CDN base, usually) and lands inside a
  // `src="..."` attribute, so it is escaped like any other untrusted text.
  const imagePrefix = escapeHtml(options.imagePrefix ?? 'images/');
  const preheader = options.preheader ? escapeHtml(options.preheader) : '';

  const rowsHtml = slices
    .map((slice) => {
      const src = `${imagePrefix}${slice.filename}`;
      const alt = slice.altText
        ? escapeHtml(slice.altText)
        : escapeHtml(slice.filename);
      const imgTag = `<img src="${src}" width="${slice.width}" height="${slice.height}" alt="${alt}" border="0" style="display: block; width: 100%; max-width: ${slice.width}px; height: auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;" />`;

      const href = safeLinkUrl(slice.linkUrl);
      const content = href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display: block; outline: none; border: 0; text-decoration: none;">${imgTag}</a>`
        : imgTag;

      return `              <tr>
                <td align="center" valign="top" style="padding: 0; margin: 0; line-height: 0; font-size: 0; background-color: ${contentBg};">
                  ${content}
                </td>
              </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "${XHTML_DTD}">
<html xmlns="${XHTML_NS}" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${bgColor}; }
    @media screen and (max-width: ${maxWidth}px) {
      .responsive-table { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
${
  preheader
    ? `  <!-- Preheader text for email inbox preview -->
  <div style="display: none; font-size: 1px; color: ${bgColor}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>`
    : ''
}
  <!-- Main Email Wrapper -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: ${bgColor};">
    <tr>
      <td align="center" valign="top" style="padding: 24px 0;">
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="${maxWidth}">
          <tr>
            <td align="center" valign="top" width="${maxWidth}">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="responsive-table" role="presentation" style="border-collapse: collapse; max-width: ${maxWidth}px; width: 100%; background-color: ${contentBg};">
${rowsHtml}
        </table>
        <!--[if (gte mso 9)|(IE)]>
            </td>
          </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates a self-contained, standalone modern HTML file.
 * Images are embedded directly as base64 data: URIs so the file can be opened
 * locally in any browser or hosted as a single file without external dependencies.
 */
export function generateWebHtml(
  slices: HtmlSliceItem[],
  options: HtmlConversionOptions = {},
): string {
  const title = options.title ? escapeHtml(options.title) : 'Web Document';
  const maxWidth = safeWidth(options.maxWidth, 800);
  const bgColor = safeCssColour(options.backgroundColor, '#f4f4f5');
  const contentBg = safeCssColour(options.contentBackgroundColor, '#ffffff');

  const sectionsHtml = slices
    .map((slice) => {
      const mime = detectImageMimeType(slice.bytes);
      const base64 = bytesToBase64(slice.bytes);
      const dataUri = `data:${mime};base64,${base64}`;
      const alt = slice.altText
        ? escapeHtml(slice.altText)
        : escapeHtml(slice.filename);
      const imgTag = `<img src="${dataUri}" width="${slice.width}" height="${slice.height}" alt="${alt}" loading="lazy" class="slice-image" />`;

      const href = safeLinkUrl(slice.linkUrl);
      if (href) {
        return `      <div class="slice-container">
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="slice-link">
          ${imgTag}
        </a>
      </div>`;
      }
      return `      <div class="slice-container">
        ${imgTag}
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: ${bgColor};
      color: #18181b;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
    }
    .wrapper {
      width: 100%;
      max-width: ${maxWidth}px;
      background-color: ${contentBg};
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    .slice-container {
      width: 100%;
      display: block;
      line-height: 0;
      font-size: 0;
    }
    .slice-link {
      display: block;
      outline: none;
      text-decoration: none;
    }
    .slice-image {
      display: block;
      width: 100%;
      height: auto;
      border: 0;
    }
  </style>
</head>
<body>
  <main class="wrapper">
${sectionsHtml}
  </main>
</body>
</html>`;
}

/**
 * Creates a complete ZIP package containing index.html and separate image assets
 * ready for email marketing deployment.
 */
export async function createEmailPackageZip(
  emailHtml: string,
  slices: HtmlSliceItem[],
  options: HtmlConversionOptions = {},
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const imagePrefix = options.imagePrefix ?? 'images/';
  // The prefix may be a CDN base ("//cdn.site.com/"), but it also becomes a
  // real folder inside the ZIP, so `..` has to go: a path that climbs out of
  // the extraction directory is how a ZIP writes files nobody asked for.
  const cleanFolder =
    imagePrefix
      .split('/')
      .filter((segment) => segment && segment !== '.' && segment !== '..')
      .map((segment) => segment.replace(/[^\w.-]/g, '_'))
      .join('/') || 'images';

  const readmeContent = `================================================================================
EMAIL MARKETING HTML & ASSET PACKAGE
Generated by OpenTools File to HTML Converter (getopentools.com)
================================================================================

WHY SEPARATE IMAGES ARE PACKAGED FOR EMAIL:
Major email clients (including Gmail, Microsoft Outlook, Apple Mail, and Yahoo)
strip or block embedded base64 data: URIs to prevent spam and large email weights.
For reliable inbox delivery and rendering across all devices, email marketing
requires images referenced via standard URLs (e.g. src="${cleanFolder}/image.jpg").

INSTRUCTIONS:
1. Upload the files in the "${cleanFolder}/" folder to your web server, CDN,
   Amazon S3, Cloudflare R2, Shopify, or your email marketing asset manager.
2. If your hosted assets URL differs from "${cleanFolder}/", find and replace
   "${cleanFolder}/" in index.html with your full CDN URL.
3. Paste the contents of index.html directly into your email platform
   (Mailchimp, Klaviyo, SendGrid, Brevo, HubSpot, ActiveCampaign, etc.).
4. Send a test email to Outlook and Gmail to verify rendering before sending.
`;

  const files = [
    {
      path: 'index.html',
      data: encoder.encode(emailHtml),
    },
    {
      path: 'README.txt',
      data: encoder.encode(readmeContent),
    },
    ...slices.map((slice) => ({
      path: `${cleanFolder}/${slice.filename}`,
      data: slice.bytes,
    })),
  ];

  return createZip(files);
}
