import type { EmailAttachment } from '@/lib/formats/email';

const FORBIDDEN_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'video',
  'audio',
  'source',
  'portal',
  /*
   * SVG is not decoration in an email. `<image href>`, `<image xlink:href>`
   * and `<use href>` all fetch a remote URL, and all three were measured
   * fetching on 2026-09-26 while this page told the reader images were not
   * loaded. The element list below only matched `img`, so none of them was
   * ever inspected.
   *
   * The whole subtree goes. An email that needs SVG to be readable does not
   * exist, and the alternative -- walking every SVG descendant for href,
   * xlink:href, and whatever the next spec adds -- is a list we would have to
   * keep correct forever.
   */
  'svg',
]);

/**
 * Attributes that fetch a URL on any element, whatever its tag.
 *
 * `background` is legacy HTML that browsers still honour on table cells.
 * `srcset` is a second source list beside `src`. `ping` fires a POST when a
 * link is clicked -- a delayed read receipt. `href`/`xlink:href` fetch on SVG
 * elements and are kept only on `<a>`, which is handled separately below.
 */
const REMOTE_FETCH_ATTRIBUTES = [
  'background',
  'srcset',
  'imagesrcset',
  'ping',
  'lowsrc',
  'dynsrc',
  'poster',
  'formaction',
  'xlink:href',
];

const SAFE_SCHEMES = /^https?:\/\//i;
const DATA_IMAGE_SCHEME =
  /^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);base64,/i;

/**
 * Sanitizes email HTML for safe in-browser rendering.
 *
 * 1. Blocks all active code (scripts, styles, forms, iframes).
 * 2. Blocks remote image URLs and tracking pixels to prevent privacy tracking.
 * 3. Resolves inline CID attachments to safe object URLs when provided.
 * 4. Sanitizes link schemes (blocks javascript:, data: URLs for links).
 * 5. Strips remote background url() calls in style attributes.
 */
export function sanitizeEmailHtml(
  rawHtml: string,
  attachments: readonly EmailAttachment[] = [],
  createAttachmentUrl?: (attachment: EmailAttachment) => string,
): string {
  if (!rawHtml.trim()) return '';

  // Use DOMParser which runs natively in browser without executing code
  // or fetching external assets
  if (typeof DOMParser === 'undefined') {
    // Robust fallback for server/test environments without DOMParser
    return fallbackSanitize(rawHtml, attachments, createAttachmentUrl);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // 1. Remove forbidden tags
  for (const tag of FORBIDDEN_TAGS) {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el) => el.remove());
  }

  // Map attachments by contentId and filename
  const attachmentMap = new Map<string, EmailAttachment>();
  for (const att of attachments) {
    if (att.contentId) {
      const cleanCid = att.contentId.replace(/^<|>$/g, '').trim().toLowerCase();
      attachmentMap.set(cleanCid, att);
    }
    if (att.filename) {
      attachmentMap.set(att.filename.trim().toLowerCase(), att);
    }
  }

  // 2. Sanitize all elements
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    // Strip all event handlers
    const attrNames = Array.from(el.attributes).map((attr) => attr.name);
    for (const attrName of attrNames) {
      if (attrName.toLowerCase().startsWith('on')) {
        el.removeAttribute(attrName);
      }
    }

    // Attributes that fetch regardless of tag. `href` is deliberately not in
    // the shared list: an anchor needs it, and the anchor branch below decides.
    for (const attribute of REMOTE_FETCH_ATTRIBUTES) {
      if (el.hasAttribute(attribute)) el.removeAttribute(attribute);
    }
    if (el.tagName.toLowerCase() !== 'a' && el.hasAttribute('href')) {
      el.removeAttribute('href');
    }

    // Sanitize style attribute: strip url(...) references
    const styleAttr = el.getAttribute('style');
    if (styleAttr) {
      const cleanedStyle = styleAttr
        .replace(/url\s*\([^)]*\)/gi, 'none')
        .replace(/expression\s*\([^)]*\)/gi, '')
        .replace(/behavior\s*:[^;]*/gi, '');
      el.setAttribute('style', cleanedStyle);
    }

    // Specific tag sanitation
    const tagName = el.tagName.toLowerCase();

    if (tagName === 'a') {
      const href = el.getAttribute('href');
      if (href) {
        const trimmed = href.trim();
        if (
          trimmed.toLowerCase().startsWith('javascript:') ||
          trimmed.toLowerCase().startsWith('vbscript:') ||
          trimmed.toLowerCase().startsWith('data:')
        ) {
          el.setAttribute('href', '#');
        } else {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }
    } else if (tagName === 'img') {
      const src = el.getAttribute('src');
      if (src) {
        const trimmed = src.trim();
        if (trimmed.toLowerCase().startsWith('cid:')) {
          const cid = trimmed
            .slice(4)
            .replace(/^<|>$/g, '')
            .trim()
            .toLowerCase();
          const matched = attachmentMap.get(cid);
          if (matched && createAttachmentUrl) {
            el.setAttribute('src', createAttachmentUrl(matched));
            el.setAttribute('loading', 'lazy');
          } else {
            // Unresolved CID placeholder
            const placeholder = doc.createElement('span');
            placeholder.className =
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground border border-border';
            placeholder.textContent = `[Embedded image: ${matched?.filename || cid}]`;
            el.replaceWith(placeholder);
          }
        } else if (DATA_IMAGE_SCHEME.test(trimmed)) {
          // Safe inline base64 image
          el.setAttribute('loading', 'lazy');
        } else if (SAFE_SCHEMES.test(trimmed) || trimmed.startsWith('//')) {
          // REMOTE IMAGE BLOCKED
          const placeholder = doc.createElement('span');
          placeholder.className =
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground border border-border';
          placeholder.title = 'Remote tracking image blocked for privacy';
          placeholder.textContent = '[Remote image blocked]';
          el.replaceWith(placeholder);
        } else {
          el.remove();
        }
      } else {
        el.remove();
      }
    }
  });

  return doc.body.innerHTML;
}

function fallbackSanitize(
  html: string,
  attachments: readonly EmailAttachment[] = [],
  createAttachmentUrl?: (attachment: EmailAttachment) => string,
): string {
  const map = new Map<string, string>();
  if (createAttachmentUrl) {
    for (const att of attachments) {
      const url = createAttachmentUrl(att);
      if (att.contentId) {
        map.set(att.contentId.replace(/^<|>$/g, '').trim().toLowerCase(), url);
      }
      if (att.filename) {
        map.set(att.filename.trim().toLowerCase(), url);
      }
    }
  }

  let result = html
    /*
     * The same holes the DOMParser path had, closed the same way. This branch
     * is not dead code in tests -- `vitest.config` sets `environment: 'node'`,
     * where `DOMParser` is undefined, so every unit test in this repository
     * runs THIS function and not the one that ships. Six of the eighteen
     * vectors survived it when measured directly on 2026-09-26.
     */
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<svg\b[^>]*\/?>/gi, '')
    .replace(
      /\s+(?:background|srcset|imagesrcset|ping|lowsrc|dynsrc|poster|formaction)=["'][^"']*["']/gi,
      '',
    )
    .replace(/\s+xlink:href=["'][^"']*["']/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/\s+on\w+=\w+/gi, '')
    .replace(/href=["']\s*javascript:[^"']*["']/gi, 'href="#"')
    .replace(/href=["']\s*data:[^"']*["']/gi, 'href="#"')
    .replace(/style=["']([^"']*)["']/gi, (_, styleContent: string) => {
      const clean = styleContent.replace(/url\s*\([^)]*\)/gi, 'none');
      return `style="${clean}"`;
    });

  result = result.replace(/<img\b([^>]*)>/gi, (_, attrs: string) => {
    const srcMatch = /src=["']([^"']*)["']/i.exec(attrs);
    if (!srcMatch) return '';
    const src = srcMatch[1]!.trim();
    if (src.toLowerCase().startsWith('cid:')) {
      const cid = src.slice(4).replace(/^<|>$/g, '').trim().toLowerCase();
      const mappedUrl = map.get(cid);
      if (mappedUrl) {
        return `<img src="${mappedUrl}" loading="lazy" />`;
      }
      return `<span>[Embedded image: ${cid}]</span>`;
    }
    if (src.startsWith('data:image/')) {
      return `<img src="${src}" loading="lazy" />`;
    }
    return '<span>[Remote image blocked]</span>';
  });

  return result;
}
