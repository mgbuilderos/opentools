/**
 * Every image job that has its own address, and the words that address ranks
 * for.
 *
 * WHY THIS IS A SEPARATE FILE FROM `image-studio.ts`. That one holds the
 * pixel loops. This one holds only data, and imports nothing but types — so
 * `lib/seo/live-tools.ts` can read the list of addresses at build time without
 * dragging a median filter into the module graph behind it.
 *
 * HOW TO ADD ONE. Append an entry. The route
 * (`app/image/[tool]/page.tsx`), the registry (`LIVE_TOOL_ROUTES`), the
 * sitemap, the internal link graph and the browse cards all read this array,
 * so a new entry becomes a real, linked, crawlable page with no second place
 * to remember. What an entry must carry:
 *
 *   `title` and `metaDescription` are the ones a search engine shows, and
 *   `image-studio-operations.test.ts` fails if two operations share either —
 *   the failure this whole file exists to fix was thirteen image jobs behind
 *   two titles.
 *
 *   `name` and `description` are what a visitor reads on the page and in
 *   every link to it, so they are written as a person would say them.
 *
 *   `fields` are the controls, and `action` is the one thing the engine in
 *   `components/image-studio-tool.tsx` switches on. An action the engine does
 *   not implement fails a test rather than rendering a page with a dead
 *   button.
 *
 * WHAT IS NOT HERE, AND WHY. HEIC and RAW conversion (no browser decodes
 * them without shipping a decoder), GIF-to-video (needs an encoder this site
 * does not carry) and raster-to-SVG tracing (a real tracer, not a PNG in an
 * `<svg>` wrapper, is its own project). A page that half-does one of those is
 * worse than no page, so none of them is listed.
 */
import type { ImageStudioOperation, StudioField } from './image-studio';
import { OVERLAY_POSITIONS, SOCIAL_PRESETS } from './image-studio';

const RASTER_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/bmp';
const ANY_IMAGE_ACCEPT = `${RASTER_ACCEPT},image/avif,image/svg+xml`;

const quality = (defaultValue = '90'): StudioField => ({
  id: 'quality',
  label: 'Quality',
  type: 'range',
  defaultValue,
  min: 10,
  max: 100,
  step: 1,
  help: 'Lower numbers make a smaller file.',
});

const flatten: StudioField = {
  id: 'background',
  label: 'Background behind transparency',
  type: 'colour',
  defaultValue: '#ffffff',
  help: 'This format has no transparency, so see-through areas take this colour.',
};

const outputFormat = (defaultValue = 'keep'): StudioField => ({
  id: 'format',
  label: 'Save as',
  type: 'select',
  defaultValue,
  options: [
    { value: 'keep', label: 'Same format as the original' },
    { value: 'image/png', label: 'PNG' },
    { value: 'image/jpeg', label: 'JPEG' },
    { value: 'image/webp', label: 'WebP' },
  ],
});

/** A converter page: one source format, one destination, one query. */
function converter(config: {
  id: string;
  outputType: 'image/png' | 'image/jpeg' | 'image/webp';
  accept: string;
  name: string;
  description: string;
  title: string;
  metaDescription: string;
  fields?: readonly StudioField[];
}): ImageStudioOperation {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    title: config.title,
    metaDescription: config.metaDescription,
    section: 'convert',
    accept: config.accept,
    multiple: true,
    outputs: 'many',
    outputType: config.outputType,
    action: { kind: 'convert' },
    fields: config.fields ?? [],
  };
}

export const IMAGE_STUDIO_OPERATIONS: readonly ImageStudioOperation[] = [
  /* ------------------------------------------------------------- convert */
  converter({
    id: 'png-to-jpg',
    outputType: 'image/jpeg',
    accept: 'image/png',
    name: 'PNG to JPG converter',
    description:
      'Turn PNG files into JPGs and choose what happens to transparent areas.',
    title: 'PNG to JPG Converter — Free, In Your Browser, No Upload',
    metaDescription:
      'Convert PNG images to JPG in this tab. Pick the JPEG quality and the colour that replaces transparency. Works on several files at once.',
    fields: [quality(), flatten],
  }),
  converter({
    id: 'jpg-to-png',
    outputType: 'image/png',
    accept: 'image/jpeg',
    name: 'JPG to PNG converter',
    description: 'Turn JPG photographs into lossless PNG files.',
    title: 'JPG to PNG Converter — Free, In Your Browser, No Upload',
    metaDescription:
      'Convert JPG photos to PNG without leaving the page. PNG stores exactly what the JPEG decoded to, with no further loss.',
  }),
  converter({
    id: 'webp-to-png',
    outputType: 'image/png',
    accept: 'image/webp',
    name: 'WebP to PNG converter',
    description:
      'Turn WebP images into PNGs that older software will open, keeping transparency.',
    title: 'WebP to PNG Converter — Free, Keeps Transparency, No Upload',
    metaDescription:
      'Convert WebP images to PNG in your browser. Transparency is carried across, and several files can be converted in one go.',
  }),
  converter({
    id: 'png-to-webp',
    outputType: 'image/webp',
    accept: 'image/png',
    name: 'PNG to WebP converter',
    description:
      'Turn PNGs into WebP files, usually much smaller at the same size.',
    title: 'PNG to WebP Converter — Free, In Your Browser, No Upload',
    metaDescription:
      'Convert PNG images to WebP in this tab and set the quality yourself. The before and after file sizes are shown for each one.',
    fields: [quality()],
  }),
  converter({
    id: 'jpg-to-webp',
    outputType: 'image/webp',
    accept: 'image/jpeg',
    name: 'JPG to WebP converter',
    description: 'Turn JPG photographs into WebP files for the web.',
    title: 'JPG to WebP Converter — Free, In Your Browser, No Upload',
    metaDescription:
      'Convert JPG photos to WebP with the quality you choose. The page shows what each file weighed before and after.',
    fields: [quality('82')],
  }),
  converter({
    id: 'webp-to-jpg',
    outputType: 'image/jpeg',
    accept: 'image/webp',
    name: 'WebP to JPG converter',
    description:
      'Turn WebP images into JPGs for software that will not open WebP.',
    title: 'WebP to JPG Converter — Free, In Your Browser, No Upload',
    metaDescription:
      'Convert WebP images to JPG in your browser. Choose the JPEG quality and the colour that fills any transparent area.',
    fields: [quality(), flatten],
  }),
  converter({
    id: 'svg-to-png',
    outputType: 'image/png',
    accept: 'image/svg+xml',
    name: 'SVG to PNG converter',
    description:
      'Rasterise an SVG at whatever width you need, with the background left transparent.',
    title: 'SVG to PNG Converter — Set Any Width, Free, No Upload',
    metaDescription:
      'Turn an SVG into a PNG at the exact width you ask for. The browser draws the vector at that size, so the result is sharp rather than scaled up.',
    fields: [
      {
        id: 'width',
        label: 'Output width in pixels',
        type: 'number',
        defaultValue: '1024',
        min: 1,
        max: 8192,
        help: 'The height follows the drawing’s own proportions.',
      },
    ],
  }),
  converter({
    id: 'gif-to-png',
    outputType: 'image/png',
    accept: 'image/gif',
    name: 'GIF to PNG converter',
    description:
      'Save the first frame of a GIF as a PNG. An animation becomes one still picture.',
    title: 'GIF to PNG Converter — First Frame as a Still, No Upload',
    metaDescription:
      'Convert a GIF to PNG in your browser. An animated GIF gives you its first frame as a single still image.',
  }),
  converter({
    id: 'bmp-to-png',
    outputType: 'image/png',
    accept: 'image/bmp',
    name: 'BMP to PNG converter',
    description:
      'Turn old uncompressed BMP files into PNGs a fraction of the size.',
    title: 'BMP to PNG Converter — Free, In Your Browser, No Upload',
    metaDescription:
      'Convert BMP bitmaps to PNG without uploading them. PNG stores the same pixels in far less space.',
  }),
  converter({
    id: 'avif-to-jpg',
    outputType: 'image/jpeg',
    accept: 'image/avif',
    name: 'AVIF to JPG converter',
    description:
      'Turn AVIF images into JPGs for software that cannot open AVIF yet.',
    title: 'AVIF to JPG Converter — Free, In Your Browser, No Upload',
    metaDescription:
      'Convert AVIF images to JPG in this tab. Your browser has to be able to decode AVIF; the page says so plainly if it cannot.',
    fields: [quality(), flatten],
  }),

  /* -------------------------------------------------------------- resize */
  {
    id: 'resize-image',
    name: 'Resize an image',
    description:
      'Set an exact width and height, fit inside a box, or scale by a percentage.',
    title: 'Resize Image Online — Exact Pixels, Free, No Upload',
    metaDescription:
      'Resize a photo to exact pixel dimensions, fit it inside a box without distorting it, or scale it by percentage. Runs in this browser tab.',
    section: 'resize',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'resize' },
    fields: [
      {
        id: 'mode',
        label: 'How to size it',
        type: 'select',
        defaultValue: 'fit',
        options: [
          {
            value: 'fit',
            label: 'Fit inside width × height, keep proportions',
          },
          { value: 'exact', label: 'Exactly this width × height' },
          { value: 'percent', label: 'Scale by percentage' },
        ],
      },
      {
        id: 'width',
        label: 'Width in pixels',
        type: 'number',
        defaultValue: '1280',
        min: 0,
        max: 16384,
        help: 'Leave at 0 when fitting to a height only.',
      },
      {
        id: 'height',
        label: 'Height in pixels',
        type: 'number',
        defaultValue: '0',
        min: 0,
        max: 16384,
        help: 'Leave at 0 when fitting to a width only.',
      },
      {
        id: 'percent',
        label: 'Scale',
        type: 'number',
        defaultValue: '50',
        min: 1,
        max: 1000,
        help: 'Used only by the percentage option.',
      },
      outputFormat(),
      quality(),
    ],
  },
  {
    id: 'upscale-image',
    name: 'Enlarge an image',
    description:
      'Make a picture bigger by resampling it. Nothing that was not in the original is added.',
    title: 'Enlarge an Image Online — Resample to a Bigger Size, No Upload',
    metaDescription:
      'Scale a small image up to the size you need using the browser’s high-quality resampling. Detail that is not in the file cannot be recovered.',
    section: 'resize',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'resize' },
    fields: [
      {
        id: 'mode',
        label: 'How to size it',
        type: 'select',
        defaultValue: 'percent',
        options: [
          { value: 'percent', label: 'Scale by percentage' },
          {
            value: 'fit',
            label: 'Fit inside width × height, keep proportions',
          },
          { value: 'exact', label: 'Exactly this width × height' },
        ],
      },
      {
        id: 'percent',
        label: 'Scale',
        type: 'number',
        defaultValue: '200',
        min: 100,
        max: 1000,
      },
      {
        id: 'width',
        label: 'Width in pixels',
        type: 'number',
        defaultValue: '0',
        min: 0,
        max: 16384,
      },
      {
        id: 'height',
        label: 'Height in pixels',
        type: 'number',
        defaultValue: '0',
        min: 0,
        max: 16384,
      },
      outputFormat('image/png'),
      quality('95'),
    ],
  },
  {
    id: 'crop-for-social',
    name: 'Crop for social media',
    description:
      'Take the centre of a picture at the exact size a platform displays.',
    title: 'Social Media Image Cropper — Instagram, X, LinkedIn Sizes',
    metaDescription:
      'Crop and resize a picture to the exact pixel size Instagram, X, LinkedIn, Facebook, YouTube or an Open Graph card expects. The centre of the frame is kept.',
    section: 'resize',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'social-crop' },
    fields: [
      {
        id: 'preset',
        label: 'Size',
        type: 'select',
        defaultValue: SOCIAL_PRESETS[0]!.value,
        options: SOCIAL_PRESETS.map((preset) => ({
          value: preset.value,
          label: `${preset.label} — ${preset.width} × ${preset.height}`,
        })),
      },
      outputFormat('image/jpeg'),
      quality(),
    ],
  },
  {
    id: 'split-image',
    name: 'Split an image into a grid',
    description:
      'Cut one picture into rows and columns and save every tile separately.',
    title: 'Split an Image into a Grid — Rows and Columns, No Upload',
    metaDescription:
      'Cut a picture into equal tiles — a 3 × 3 Instagram grid, a two-page spread, or any rows and columns you choose — and save each tile as its own file.',
    section: 'resize',
    accept: RASTER_ACCEPT,
    multiple: false,
    outputs: 'many',
    action: { kind: 'split' },
    fields: [
      {
        id: 'rows',
        label: 'Rows',
        type: 'number',
        defaultValue: '3',
        min: 1,
        max: 20,
      },
      {
        id: 'columns',
        label: 'Columns',
        type: 'number',
        defaultValue: '3',
        min: 1,
        max: 20,
      },
      outputFormat('image/png'),
      quality(),
    ],
  },
  {
    id: 'round-corners',
    name: 'Round the corners of an image',
    description:
      'Give a picture rounded corners, saved as a PNG so the corners are see-through.',
    title: 'Round Image Corners Online — Transparent PNG, No Upload',
    metaDescription:
      'Round off the corners of a picture by a pixel radius or a percentage of its shorter side. The result is a PNG, so the cut corners are transparent.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    outputType: 'image/png',
    action: { kind: 'round-corners' },
    fields: [
      {
        id: 'radius',
        label: 'Corner radius',
        type: 'number',
        defaultValue: '12',
        min: 0,
        max: 4096,
      },
      {
        id: 'unit',
        label: 'Measured in',
        type: 'select',
        defaultValue: 'percent',
        options: [
          { value: 'percent', label: 'Per cent of the shorter side' },
          { value: 'px', label: 'Pixels' },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------- effects */
  {
    id: 'invert-image-colours',
    name: 'Invert the colours of an image',
    description:
      'Swap every colour for its opposite, the way a photographic negative does.',
    title: 'Invert Image Colours Online — Negative Effect, No Upload',
    metaDescription:
      'Turn a picture into its own negative: every red, green and blue value is replaced by 255 minus itself. Transparency is left alone.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'filter', filter: 'invert' },
    fields: [outputFormat('image/png'), quality()],
  },
  {
    id: 'sharpen-image',
    name: 'Sharpen an image',
    description:
      'Bring back edge definition with an unsharp mask you can dial up or down.',
    title: 'Sharpen an Image Online — Unsharp Mask, Free, No Upload',
    metaDescription:
      'Sharpen a soft photo in your browser. An unsharp mask pushes each pixel away from its blurred neighbourhood, and the strength and radius are yours to set.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'filter', filter: 'sharpen' },
    fields: [
      {
        id: 'amount',
        label: 'Strength',
        type: 'range',
        defaultValue: '80',
        min: 0,
        max: 300,
        step: 5,
      },
      {
        id: 'radius',
        label: 'Radius in pixels',
        type: 'number',
        defaultValue: '1',
        min: 1,
        max: 12,
        help: 'How far around each pixel counts as its neighbourhood.',
      },
      outputFormat('image/png'),
      quality('95'),
    ],
  },
  {
    id: 'blur-image',
    name: 'Blur an image',
    description: 'Soften a whole picture by as much or as little as you want.',
    title: 'Blur an Image Online — Adjustable Radius, Free, No Upload',
    metaDescription:
      'Blur a picture in your browser with a radius you control, for a background, a placeholder or a soft-focus effect.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'filter', filter: 'blur' },
    fields: [
      {
        id: 'radius',
        label: 'Blur radius in pixels',
        type: 'range',
        defaultValue: '8',
        min: 1,
        max: 100,
        step: 1,
      },
      outputFormat('image/png'),
      quality('90'),
    ],
  },
  {
    id: 'blur-face',
    name: 'Blur a face or an area',
    description:
      'Drag a box over the part you want hidden and blur only that rectangle.',
    title: 'Blur a Face in a Photo — Drag a Box, Free, No Upload',
    metaDescription:
      'Hide a face, a number plate or an address in a photo by dragging a box over it and blurring only that area. The picture is never sent anywhere.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: false,
    outputs: 'one',
    action: { kind: 'region', effect: 'blur' },
    fields: [
      {
        id: 'radius',
        label: 'Blur radius in pixels',
        type: 'range',
        defaultValue: '20',
        min: 2,
        max: 120,
        step: 1,
      },
      outputFormat('image/png'),
      quality('92'),
    ],
  },
  {
    id: 'pixelate-image',
    name: 'Pixelate an image',
    description: 'Replace every block of pixels with its average colour.',
    title: 'Pixelate an Image Online — Choose the Block Size, No Upload',
    metaDescription:
      'Turn a picture into blocks of flat colour at whatever block size you choose, for a mosaic look or a low-resolution effect.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'filter', filter: 'pixelate' },
    fields: [
      {
        id: 'block',
        label: 'Block size in pixels',
        type: 'range',
        defaultValue: '12',
        min: 2,
        max: 120,
        step: 1,
      },
      outputFormat('image/png'),
      quality('92'),
    ],
  },
  {
    id: 'pixelate-region',
    name: 'Pixelate part of an image',
    description:
      'Drag a box over a name, a number or a face and pixelate only that rectangle.',
    title: 'Pixelate Part of an Image — Censor a Screenshot, No Upload',
    metaDescription:
      'Censor one area of a screenshot or photo by dragging a box over it and turning just that rectangle into blocks. Everything outside the box is untouched.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: false,
    outputs: 'one',
    action: { kind: 'region', effect: 'pixelate' },
    fields: [
      {
        id: 'block',
        label: 'Block size in pixels',
        type: 'range',
        defaultValue: '16',
        min: 2,
        max: 120,
        step: 1,
      },
      outputFormat('image/png'),
      quality('92'),
    ],
  },
  {
    id: 'reduce-image-noise',
    name: 'Reduce noise in an image',
    description:
      'A median filter that removes speckle while leaving edges where they are.',
    title: 'Reduce Image Noise Online — Median Filter, Free, No Upload',
    metaDescription:
      'Clean speckle and sensor noise out of a photo with a median filter, which discards outlying pixels instead of averaging them into their neighbours.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: false,
    outputs: 'one',
    action: { kind: 'filter', filter: 'denoise' },
    fields: [
      {
        id: 'radius',
        label: 'Neighbourhood radius',
        type: 'number',
        defaultValue: '1',
        min: 1,
        max: 4,
        help: 'Larger radiuses clean more and take longer.',
      },
      outputFormat('image/png'),
      quality('95'),
    ],
  },
  {
    id: 'sepia-image',
    name: 'Apply a sepia tone',
    description: 'Give a picture the warm brown cast of an old photograph.',
    title: 'Sepia Photo Filter Online — Adjustable Strength, No Upload',
    metaDescription:
      'Add a sepia tone to a picture and choose how strong it is, from a faint warmth to a full antique brown.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'filter', filter: 'sepia' },
    fields: [
      {
        id: 'amount',
        label: 'Strength',
        type: 'range',
        defaultValue: '100',
        min: 0,
        max: 100,
        step: 1,
      },
      outputFormat('image/jpeg'),
      quality(),
    ],
  },
  {
    id: 'add-border',
    name: 'Add a border to an image',
    description:
      'Put an even frame of any colour and thickness around a picture.',
    title: 'Add a Border to an Image — Any Colour and Width, No Upload',
    metaDescription:
      'Add a solid border around a photo. Choose the thickness in pixels and the colour; the picture itself is not cropped or scaled.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'border' },
    fields: [
      {
        id: 'thickness',
        label: 'Border thickness in pixels',
        type: 'number',
        defaultValue: '24',
        min: 0,
        max: 2000,
      },
      {
        id: 'colour',
        label: 'Border colour',
        type: 'colour',
        defaultValue: '#ffffff',
      },
      outputFormat('image/png'),
      quality(),
    ],
  },
  {
    id: 'add-watermark',
    name: 'Add a text watermark',
    description:
      'Stamp your own words across a picture, at the corner, size and opacity you choose.',
    title: 'Add a Watermark to an Image — Your Text, Free, No Upload',
    metaDescription:
      'Put a text watermark on a photo: your wording, your colour, your position and your opacity. Several pictures can be stamped in one run.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'watermark' },
    fields: [
      {
        id: 'text',
        label: 'Watermark text',
        type: 'text',
        defaultValue: '© Your name',
      },
      {
        id: 'size',
        label: 'Text size',
        type: 'range',
        defaultValue: '5',
        min: 1,
        max: 20,
        step: 1,
        help: 'As a percentage of the image’s shorter side, so it scales with the picture.',
      },
      {
        id: 'colour',
        label: 'Text colour',
        type: 'colour',
        defaultValue: '#ffffff',
      },
      {
        id: 'opacity',
        label: 'Opacity',
        type: 'range',
        defaultValue: '60',
        min: 5,
        max: 100,
        step: 5,
      },
      {
        id: 'position',
        label: 'Position',
        type: 'select',
        defaultValue: 'bottom-right',
        options: OVERLAY_POSITIONS.map((entry) => ({
          value: entry.value,
          label: entry.label,
        })),
      },
      {
        id: 'margin',
        label: 'Margin in pixels',
        type: 'number',
        defaultValue: '24',
        min: 0,
        max: 500,
      },
      outputFormat('image/jpeg'),
      quality(),
    ],
  },
  {
    id: 'meme-generator',
    name: 'Make a meme',
    description:
      'Put white outlined capitals across the top and bottom of a picture.',
    title: 'Meme Generator — Top and Bottom Text, Free, No Upload',
    metaDescription:
      'Add the classic outlined top and bottom caption to any picture and save it. The caption you type is the only thing added — no watermark of ours goes on it.',
    section: 'effects',
    accept: RASTER_ACCEPT,
    multiple: false,
    outputs: 'one',
    action: { kind: 'meme' },
    fields: [
      {
        id: 'top',
        label: 'Top text',
        type: 'text',
        defaultValue: '',
      },
      {
        id: 'bottom',
        label: 'Bottom text',
        type: 'text',
        defaultValue: '',
      },
      {
        id: 'size',
        label: 'Text size',
        type: 'range',
        defaultValue: '10',
        min: 3,
        max: 25,
        step: 1,
        help: 'As a percentage of the picture’s height.',
      },
      {
        id: 'uppercase',
        label: 'Force capitals',
        type: 'checkbox',
        defaultValue: 'on',
      },
      outputFormat('image/jpeg'),
      quality('92'),
    ],
  },

  /* -------------------------------------------------------------- colour */
  {
    id: 'image-colour-palette',
    name: 'Extract a colour palette',
    description:
      'Find the colours a picture is actually made of, with the share each one covers.',
    title: 'Extract a Colour Palette from an Image — Hex Codes, No Upload',
    metaDescription:
      'Pull the dominant colours out of a photo as hex and RGB values, with the share each one covers. Median cut, so photographs work as well as flat graphics.',
    section: 'colour',
    accept: ANY_IMAGE_ACCEPT,
    multiple: false,
    outputs: 'text',
    action: { kind: 'palette' },
    fields: [
      {
        id: 'count',
        label: 'How many colours',
        type: 'number',
        defaultValue: '8',
        min: 2,
        max: 24,
      },
    ],
  },
  {
    id: 'image-colour-picker',
    name: 'Pick a colour from an image',
    description:
      'Click anywhere on the picture to read that pixel’s hex and RGB value.',
    title: 'Colour Picker from Image — Get the Hex Code, Free, No Upload',
    metaDescription:
      'Open a picture and click any pixel to read its exact hex and RGB value. Every colour you pick is kept in a list you can copy.',
    section: 'colour',
    accept: ANY_IMAGE_ACCEPT,
    multiple: false,
    outputs: 'text',
    action: { kind: 'colour-picker' },
    fields: [],
  },

  /* -------------------------------------------------------------- encode */
  {
    id: 'image-to-base64',
    name: 'Convert an image to Base64',
    description:
      'Turn a picture into a data URL you can paste straight into CSS or HTML.',
    title: 'Image to Base64 Converter — Data URL for CSS and HTML',
    metaDescription:
      'Encode a picture as a Base64 data URL and copy it as plain text, a CSS background rule or an HTML img tag. The file is read in this tab.',
    section: 'encode',
    accept: ANY_IMAGE_ACCEPT,
    multiple: false,
    outputs: 'text',
    action: { kind: 'to-base64' },
    fields: [
      {
        id: 'wrap',
        label: 'Give it to me as',
        type: 'select',
        defaultValue: 'data-url',
        options: [
          { value: 'data-url', label: 'A data URL' },
          { value: 'raw', label: 'Base64 only, no header' },
          { value: 'css', label: 'A CSS background-image rule' },
          { value: 'html', label: 'An HTML img tag' },
        ],
      },
    ],
  },
  {
    id: 'base64-to-image',
    name: 'Convert Base64 back to an image',
    description:
      'Paste a data URL or a bare Base64 string and get the picture back as a file.',
    title: 'Base64 to Image Converter — Decode and Download, No Upload',
    metaDescription:
      'Paste a Base64 string or data URL and get the image back. The format is read from the bytes themselves, so the file is never named for something it is not.',
    section: 'encode',
    accept: '',
    multiple: false,
    outputs: 'one',
    action: { kind: 'from-base64' },
    fields: [
      {
        id: 'base64',
        label: 'Base64 or data URL',
        type: 'text',
        defaultValue: '',
        help: 'Paste the whole string, with or without the data: header.',
      },
    ],
  },

  /* ------------------------------------------------------------- compose */
  {
    id: 'collage-maker',
    name: 'Make a photo collage',
    description:
      'Lay several pictures out in a grid with an even gap and one background colour.',
    title: 'Photo Collage Maker — Grid Layout, Free, No Upload',
    metaDescription:
      'Combine pictures into one grid collage. Choose the columns, cell size, gap and background; each photo is fitted inside its cell without distortion.',
    section: 'compose',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'one',
    action: { kind: 'collage' },
    fields: [
      {
        id: 'columns',
        label: 'Columns',
        type: 'number',
        defaultValue: '3',
        min: 1,
        max: 12,
      },
      {
        id: 'cell',
        label: 'Cell size in pixels',
        type: 'number',
        defaultValue: '600',
        min: 32,
        max: 4096,
      },
      {
        id: 'gap',
        label: 'Gap in pixels',
        type: 'number',
        defaultValue: '16',
        min: 0,
        max: 400,
      },
      {
        id: 'colour',
        label: 'Background colour',
        type: 'colour',
        defaultValue: '#ffffff',
      },
      outputFormat('image/jpeg'),
      quality('92'),
    ],
  },
  {
    id: 'sprite-sheet',
    name: 'Build a CSS sprite sheet',
    description:
      'Pack several images into one file and get the CSS that addresses each frame.',
    title: 'CSS Sprite Sheet Generator — Image Plus the CSS, No Upload',
    metaDescription:
      'Combine icons into a single sprite sheet and copy the generated CSS, one rule per frame with the right background-position. Built in your browser.',
    section: 'compose',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'one',
    outputType: 'image/png',
    action: { kind: 'sprite-sheet' },
    fields: [
      {
        id: 'columns',
        label: 'Columns',
        type: 'number',
        defaultValue: '4',
        min: 1,
        max: 20,
      },
      {
        id: 'cell',
        label: 'Frame size in pixels',
        type: 'number',
        defaultValue: '64',
        min: 8,
        max: 1024,
      },
      {
        id: 'gap',
        label: 'Gap in pixels',
        type: 'number',
        defaultValue: '0',
        min: 0,
        max: 100,
      },
      {
        id: 'className',
        label: 'CSS class name',
        type: 'text',
        defaultValue: 'sprite',
      },
    ],
  },
  {
    /*
      Not `favicon-generator`: `/creator/favicon-generator` already owns that
      id, and `live-tools.test.ts` fails when one tool answers at two URLs.
      They are also different tools — that one writes head tags around an
      emoji, this one starts from a picture — and `favicon-from-image` is what
      someone with a logo actually types.
    */
    id: 'favicon-from-image',
    name: 'Make a favicon from an image',
    description:
      'Turn one square picture into every favicon size, plus a real .ico file.',
    title: 'Favicon Generator from an Image — PNG Sizes and a Real .ico',
    metaDescription:
      'Make a complete favicon set from one image: 16 to 512 pixel PNGs, a multi-size favicon.ico, and the HTML head tags that reference them.',
    section: 'compose',
    accept: ANY_IMAGE_ACCEPT,
    multiple: false,
    outputs: 'many',
    outputType: 'image/png',
    action: { kind: 'favicon' },
    fields: [
      {
        id: 'colour',
        label: 'Background behind transparency',
        type: 'colour',
        defaultValue: '#ffffff',
      },
      {
        id: 'keepTransparent',
        label: 'Keep transparency instead',
        type: 'checkbox',
        defaultValue: 'on',
      },
    ],
  },

  /* ------------------------------------------------------------ metadata */
  {
    id: 'strip-exif',
    name: 'Remove EXIF data from a photo',
    description:
      'Re-draw a photo from its pixels alone, so the camera and location tags are not carried over.',
    title: 'Remove EXIF Data from a Photo — Strip GPS and Camera Tags',
    metaDescription:
      'Strip EXIF metadata — GPS coordinates, camera model, timestamps — out of a photo by re-encoding it from its pixels. The picture itself is unchanged.',
    section: 'encode',
    accept: RASTER_ACCEPT,
    multiple: true,
    outputs: 'many',
    action: { kind: 'strip-metadata' },
    fields: [outputFormat('image/jpeg'), quality('95')],
  },
];

/** Lookup by URL segment, for the route and the engine. */
export const IMAGE_STUDIO_BY_ID: ReadonlyMap<string, ImageStudioOperation> =
  new Map(
    IMAGE_STUDIO_OPERATIONS.map((operation) => [operation.id, operation]),
  );

/**
 * The shape `lib/seo/live-tools.ts` publishes: id, name and description only.
 *
 * Handed over as a plain projection rather than the operations themselves, so
 * the registry cannot start depending on a field that only the engine should
 * read.
 */
export const IMAGE_STUDIO_ROUTED_OPERATIONS: readonly {
  id: string;
  name: string;
  description: string;
}[] = IMAGE_STUDIO_OPERATIONS.map((operation) => ({
  id: operation.id,
  name: operation.name,
  description: operation.description,
}));
