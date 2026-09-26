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
]);

const SAFE_SCHEMES = /^https?:\/\//i;
const DATA_IMAGE_SCHEME =
  /^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);base64,/i;

/**
 * Every attribute that makes the browser fetch a URL on its own.
 *
 * WHY THIS IS A LIST AND NOT AN `img` CHECK. The first version of this file
 * sanitised `src` on elements whose `tagName` was `img`, which is the obvious
 * reading of "block remote images" and is not what the browser does. Four
 * vectors fetched straight through it, each one a working read receipt:
 *
 *   <svg><image href>        tagName is `image`, not `img`
 *   <svg><image xlink:href>  the SVG 1.1 spelling of the same thing
 *   <svg><use href>          not an image element at all
 *   <td background>          a legacy attribute nobody thought to check
 *
 * A tracking pixel does not care which element carries it. So the rule is
 * stated as "these attributes cause a fetch" rather than "these tags are
 * images", and anything not explicitly allowed (a cid: reference we resolve
 * ourselves, or an inline data: image) has the attribute removed.
 *
 * `e2e/email-tracker.spec.ts` holds this from the other side: it renders a
 * message carrying 18 vectors and asserts the browser makes no request to the
 * tracker host. Adding a vector there without adding it here fails the build.
 */
const URL_BEARING_ATTRIBUTES = [
  'background',
  'href',
  'xlink:href',
  'poster',
  'srcset',
  'lowsrc',
  'dynsrc',
  'data',
  'formaction',
  'ping',
] as const;

/** Elements whose `href` is a fetch rather than a link the reader may click. */
const FETCHING_HREF_TAGS = new Set(['image', 'use', 'feimage', 'filter']);

/**
 * True when this value would send the reader's browser to somebody's server.
 *
 * Allow-list rather than block-list, deliberately. A block-list of known
 * tracker shapes is a list somebody has to keep adding to, and the whole defect
 * this replaces was a check that did not know about four spellings. Three
 * things fetch nothing; everything else is treated as a request, including a
 * relative path (which would resolve against this origin) and any scheme not
 * named here.
 */
function isRemoteReference(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // A same-document reference, e.g. <use href="#icon">. Fetches nothing.
  if (trimmed.startsWith('#')) return false;
  // Resolved locally from the message's own attachments.
  if (trimmed.toLowerCase().startsWith('cid:')) return false;
  // An inline image that carries its own bytes.
  if (DATA_IMAGE_SCHEME.test(trimmed)) return false;
  return true;
}

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

    /*
      The general fetch sweep, before any tag-specific handling.

      An <a href> is a link the reader chooses to follow, so it is left to the
      anchor branch below. Every other URL-bearing attribute is a fetch the
      browser performs unasked, and is removed unless it points at something we
      resolve locally.
    */
    for (const attribute of URL_BEARING_ATTRIBUTES) {
      if (attribute === 'href' && tagName === 'a') continue;
      if (attribute === 'href' && !FETCHING_HREF_TAGS.has(tagName)) continue;
      const value = el.getAttribute(attribute);
      if (value && isRemoteReference(value)) el.removeAttribute(attribute);
    }

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

  /*
    The same vectors, in the fallback. This path runs wherever DOMParser is
    absent -- which includes the unit suite, since vitest.config sets
    `environment: 'node'`. That is precisely why the original bug went unseen
    by six passing tests: they never executed the DOM path that ships.
  */
  result = result
    .replace(/\s+background=["'][^"']*["']/gi, '')
    .replace(
      /\s+(?:xlink:href|poster|srcset|lowsrc|dynsrc|ping)=["'][^"']*["']/gi,
      '',
    )
    .replace(
      /<(image|use|feimage)\b[^>]*>(?:<\/\1>)?/gi,
      '<span>[Remote image blocked]</span>',
    );

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
