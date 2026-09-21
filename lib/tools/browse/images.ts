// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
//
// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'background-removal',
    title: 'Background Removal',
    description: 'Make a plain-color image background transparent.',
    destinations: [
      {
        id: 'image-editor:solid-background-remover',
        name: 'Solid background remover',
        description:
          'Make a selected plain-color image background transparent.',
        href: '/image/background-remover?tool=solid-background-remover',
        workspaceId: 'image-editor',
      },
    ],
  },
  {
    id: 'optimization-conversion',
    title: 'Optimization & Compression',
    description: 'Resize, compress, and convert images in your browser.',
    destinations: [
      {
        id: 'image-optimize',
        name: 'Optimize image',
        description: 'Resize, compress, and convert a static image locally.',
        href: '/image/optimize',
        workspaceId: 'image-optimize',
      },
      {
        id: 'image-exact-size',
        name: 'Resize image to exact KB',
        description:
          'Fit an image under a KB limit at exact pixels with a real DPI value.',
        href: '/image/exact-size',
        workspaceId: 'image-exact-size',
      },
      {
        id: 'svg-optimizer',
        name: 'SVG optimizer and PNG converter',
        description:
          'Strip editor leftovers and excess precision from an SVG, then export it as a PNG or WebP at up to 4x.',
        href: '/image/svg',
        workspaceId: 'svg-optimizer',
      },
      {
        id: 'color-converter',
        name: 'Colour converter and palette extractor',
        description:
          'Convert a colour between HEX, RGB, HSL and CMYK, and pull the dominant palette out of an image.',
        href: '/image/colour',
        workspaceId: 'color-converter',
      },
      {
        id: 'photo-metadata',
        name: 'Photo metadata viewer and stripper',
        description:
          'See the camera, date and GPS location hidden in a photo, then remove them.',
        href: '/image/metadata',
        workspaceId: 'photo-metadata',
      },
      {
        id: 'image-to-text',
        name: 'Image to text',
        description:
          'Read selectable English text from screenshots, photos and scanned images.',
        href: '/image/to-text',
        workspaceId: 'image-to-text',
      },
    ],
  },
  {
    id: 'canvas-studio',
    title: 'Canvas Studio & Adjustments',
    description: 'Crop, flip, rotate, and fine-tune image color channels.',
    destinations: [
      {
        id: 'image-editor:image-cropper',
        name: 'Image cropper',
        description: 'Crop an image to exact pixel coordinates.',
        href: '/image/editor?tool=image-cropper',
        workspaceId: 'image-editor',
      },
      {
        id: 'image-editor:image-flipper',
        name: 'Image flipper',
        description: 'Flip an image horizontally in the browser.',
        href: '/image/editor?tool=image-flipper',
        workspaceId: 'image-editor',
      },
      {
        id: 'image-editor:image-rotator',
        name: 'Rotate image',
        description: 'Rotate an image in 90 degree steps.',
        href: '/image/editor?tool=image-rotator',
        workspaceId: 'image-editor',
      },
      {
        id: 'image-editor:image-brightness',
        name: 'Image brightness',
        description: 'Adjust image brightness before saving.',
        href: '/image/editor?tool=image-brightness',
        workspaceId: 'image-editor',
      },
      {
        id: 'image-editor:image-contrast',
        name: 'Image contrast',
        description: 'Adjust image contrast before saving.',
        href: '/image/editor?tool=image-contrast',
        workspaceId: 'image-editor',
      },
      {
        id: 'image-editor:image-grayscale',
        name: 'Image grayscale',
        description: 'Convert image colors toward grayscale.',
        href: '/image/editor?tool=image-grayscale',
        workspaceId: 'image-editor',
      },
    ],
  },
];
