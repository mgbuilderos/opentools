import {
  type DetectedAction,
  SMART_DROPZONE_ACTIONS,
} from '@/components/smart-dropzone-actions';
import { isLiveToolUrl } from '@/lib/seo/live-tool-routes';

export interface NextOperationQuery {
  /** The MIME type of the produced output file, e.g. 'application/pdf', 'image/png' */
  mimeType?: string;
  /** The filename of the produced output file, e.g. 'document.pdf', 'photo.webp' */
  fileName?: string;
  /** The current route/URL pathname to exclude from recommendations, e.g. '/pdf/compress' */
  currentRoute?: string;
}

export interface NextOperationOption {
  label: string;
  href: string;
}

export type SupportedOutputType = 'pdf' | 'image' | 'csv' | 'json' | 'video';

/**
 * Detects the category of the output file based on MIME type and extension.
 */
export function detectOutputType(
  mimeType?: string,
  fileName?: string,
): SupportedOutputType | null {
  const mime = (mimeType || '').toLowerCase();
  const ext = fileName ? fileName.split('.').pop()?.toLowerCase() || '' : '';

  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg', 'gif', 'heic'].includes(ext)
  ) {
    return 'image';
  }
  if (mime === 'text/csv' || ext === 'csv' || ext === 'tsv') {
    return 'csv';
  }
  if (mime === 'application/json' || ext === 'json') {
    return 'json';
  }
  if (
    mime.startsWith('video/') ||
    ['mp4', 'mov', 'm4v', 'webm'].includes(ext)
  ) {
    return 'video';
  }
  return null;
}

/**
 * Resolves up to three valid, capability-matched next operations for a finished file.
 * Excludes the current tool to prevent circular recommendations.
 * Ensures every returned tool is a live tool route.
 */
export function getNextOperations(
  query: NextOperationQuery,
): NextOperationOption[] {
  const type = detectOutputType(query.mimeType, query.fileName);
  if (!type) return [];

  const rawActions: readonly DetectedAction[] = (() => {
    switch (type) {
      case 'pdf': {
        const list: DetectedAction[] = [...SMART_DROPZONE_ACTIONS.pdf];
        if (isLiveToolUrl('/pdf/compress')) {
          list.push({ label: 'Compress PDF', href: '/pdf/compress' });
        }
        if (isLiveToolUrl('/pdf/sign')) {
          list.push({ label: 'Sign PDF', href: '/pdf/sign' });
        }
        return list;
      }
      case 'image':
        return SMART_DROPZONE_ACTIONS.image;
      case 'csv':
        return SMART_DROPZONE_ACTIONS.csv;
      case 'json':
        return SMART_DROPZONE_ACTIONS.json;
      case 'video':
        return [
          { label: 'Trim or Mute Video', href: '/video/trim' },
          { label: 'Convert Video', href: '/video/convert' },
          { label: 'Video to GIF', href: '/video/to-gif' },
        ];
      default:
        return [];
    }
  })();

  const current = (query.currentRoute || '').toLowerCase().trim();

  return rawActions
    .filter((action) => {
      // Must be a live tool URL
      if (!isLiveToolUrl(action.href)) return false;

      // Filter out current route
      if (!current) return true;
      const target = action.href.toLowerCase().trim();
      if (target === current) return false;

      const [targetPath, targetQuery] = target.split('?');
      const [currentPath, currentQuery] = current.split('?');
      if (targetPath === currentPath) {
        if (!targetQuery && !currentQuery) return false;
        if (targetQuery && currentQuery && targetQuery === currentQuery) {
          return false;
        }
      }
      return true;
    })
    .slice(0, 3)
    .map((action) => ({
      label: action.label,
      href: action.href,
    }));
}
