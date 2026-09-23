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
  {
    id: 'image-convert',
    title: 'Format Conversion',
    description:
      'One page per pair — PNG to JPG, WebP to PNG, SVG to PNG and the rest.',
    destinations: [
      {
        id: 'image-studio:png-to-jpg',
        name: 'PNG to JPG converter',
        description:
          'Turn PNG files into JPGs and choose what happens to transparent areas.',
        href: '/image/png-to-jpg',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:jpg-to-png',
        name: 'JPG to PNG converter',
        description: 'Turn JPG photographs into lossless PNG files.',
        href: '/image/jpg-to-png',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:webp-to-png',
        name: 'WebP to PNG converter',
        description:
          'Turn WebP images into PNGs that older software will open, keeping transparency.',
        href: '/image/webp-to-png',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:png-to-webp',
        name: 'PNG to WebP converter',
        description:
          'Turn PNGs into WebP files, usually much smaller at the same size.',
        href: '/image/png-to-webp',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:jpg-to-webp',
        name: 'JPG to WebP converter',
        description: 'Turn JPG photographs into WebP files for the web.',
        href: '/image/jpg-to-webp',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:webp-to-jpg',
        name: 'WebP to JPG converter',
        description:
          'Turn WebP images into JPGs for software that will not open WebP.',
        href: '/image/webp-to-jpg',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:svg-to-png',
        name: 'SVG to PNG converter',
        description:
          'Rasterise an SVG at whatever width you need, with the background left transparent.',
        href: '/image/svg-to-png',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:gif-to-png',
        name: 'GIF to PNG converter',
        description:
          'Save the first frame of a GIF as a PNG. An animation becomes one still picture.',
        href: '/image/gif-to-png',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:bmp-to-png',
        name: 'BMP to PNG converter',
        description:
          'Turn old uncompressed BMP files into PNGs a fraction of the size.',
        href: '/image/bmp-to-png',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:avif-to-jpg',
        name: 'AVIF to JPG converter',
        description:
          'Turn AVIF images into JPGs for software that cannot open AVIF yet.',
        href: '/image/avif-to-jpg',
        workspaceId: 'image-studio',
      },
    ],
  },
  {
    id: 'image-resize',
    title: 'Size & Crop',
    description:
      'Resize to exact pixels, enlarge, crop to a platform size, or cut into a grid.',
    destinations: [
      {
        id: 'image-studio:resize-image',
        name: 'Resize an image',
        description:
          'Set an exact width and height, fit inside a box, or scale by a percentage.',
        href: '/image/resize-image',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:upscale-image',
        name: 'Enlarge an image',
        description:
          'Make a picture bigger by resampling it. Nothing that was not in the original is added.',
        href: '/image/upscale-image',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:crop-for-social',
        name: 'Crop for social media',
        description:
          'Take the centre of a picture at the exact size a platform displays.',
        href: '/image/crop-for-social',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:split-image',
        name: 'Split an image into a grid',
        description:
          'Cut one picture into rows and columns and save every tile separately.',
        href: '/image/split-image',
        workspaceId: 'image-studio',
      },
    ],
  },
  {
    id: 'image-effects',
    title: 'Retouch & Effects',
    description:
      'Sharpen, blur, pixelate, denoise, border, round, watermark and caption.',
    destinations: [
      {
        id: 'image-studio:round-corners',
        name: 'Round the corners of an image',
        description:
          'Give a picture rounded corners, saved as a PNG so the corners are see-through.',
        href: '/image/round-corners',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:invert-image-colours',
        name: 'Invert the colours of an image',
        description:
          'Swap every colour for its opposite, the way a photographic negative does.',
        href: '/image/invert-image-colours',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:sharpen-image',
        name: 'Sharpen an image',
        description:
          'Bring back edge definition with an unsharp mask you can dial up or down.',
        href: '/image/sharpen-image',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:blur-image',
        name: 'Blur an image',
        description:
          'Soften a whole picture by as much or as little as you want.',
        href: '/image/blur-image',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:blur-face',
        name: 'Blur a face or an area',
        description:
          'Drag a box over the part you want hidden and blur only that rectangle.',
        href: '/image/blur-face',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:pixelate-image',
        name: 'Pixelate an image',
        description: 'Replace every block of pixels with its average colour.',
        href: '/image/pixelate-image',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:pixelate-region',
        name: 'Pixelate part of an image',
        description:
          'Drag a box over a name, a number or a face and pixelate only that rectangle.',
        href: '/image/pixelate-region',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:reduce-image-noise',
        name: 'Reduce noise in an image',
        description:
          'A median filter that removes speckle while leaving edges where they are.',
        href: '/image/reduce-image-noise',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:sepia-image',
        name: 'Apply a sepia tone',
        description: 'Give a picture the warm brown cast of an old photograph.',
        href: '/image/sepia-image',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:add-border',
        name: 'Add a border to an image',
        description:
          'Put an even frame of any colour and thickness around a picture.',
        href: '/image/add-border',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:add-watermark',
        name: 'Add a text watermark',
        description:
          'Stamp your own words across a picture, at the corner, size and opacity you choose.',
        href: '/image/add-watermark',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:meme-generator',
        name: 'Make a meme',
        description:
          'Put white outlined capitals across the top and bottom of a picture.',
        href: '/image/meme-generator',
        workspaceId: 'image-studio',
      },
    ],
  },
  {
    id: 'image-colour',
    title: 'Colour',
    description:
      'Read a palette out of a picture, or pick the hex value of any pixel.',
    destinations: [
      {
        id: 'image-studio:image-colour-palette',
        name: 'Extract a colour palette',
        description:
          'Find the colours a picture is actually made of, with the share each one covers.',
        href: '/image/image-colour-palette',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:image-colour-picker',
        name: 'Pick a colour from an image',
        description:
          'Click anywhere on the picture to read that pixel’s hex and RGB value.',
        href: '/image/image-colour-picker',
        workspaceId: 'image-studio',
      },
    ],
  },
  {
    id: 'image-compose',
    title: 'Combine & Package',
    description: 'Collages, CSS sprite sheets and a complete favicon set.',
    destinations: [
      {
        id: 'image-studio:collage-maker',
        name: 'Make a photo collage',
        description:
          'Lay several pictures out in a grid with an even gap and one background colour.',
        href: '/image/collage-maker',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:sprite-sheet',
        name: 'Build a CSS sprite sheet',
        description:
          'Pack several images into one file and get the CSS that addresses each frame.',
        href: '/image/sprite-sheet',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:favicon-from-image',
        name: 'Make a favicon from an image',
        description:
          'Turn one square picture into every favicon size, plus a real .ico file.',
        href: '/image/favicon-from-image',
        workspaceId: 'image-studio',
      },
    ],
  },
  {
    id: 'image-encode',
    title: 'Encode & Metadata',
    description:
      'Base64 in both directions, and stripping EXIF out of a photo.',
    destinations: [
      {
        id: 'image-studio:image-to-base64',
        name: 'Convert an image to Base64',
        description:
          'Turn a picture into a data URL you can paste straight into CSS or HTML.',
        href: '/image/image-to-base64',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:base64-to-image',
        name: 'Convert Base64 back to an image',
        description:
          'Paste a data URL or a bare Base64 string and get the picture back as a file.',
        href: '/image/base64-to-image',
        workspaceId: 'image-studio',
      },
      {
        id: 'image-studio:strip-exif',
        name: 'Remove EXIF data from a photo',
        description:
          'Re-draw a photo from its pixels alone, so the camera and location tags are not carried over.',
        href: '/image/strip-exif',
        workspaceId: 'image-studio',
      },
    ],
  },
];
