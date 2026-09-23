import type { ToolPageDepth } from './tool-page-depth-types';

/*
  Depth content for the 13 live image tool pages. See tool-page-depth.ts for
  why this file exists and what may be written in it.

  SEVEN OF THESE ROUTES ARE ONE COMPONENT. `/image/editor` and the six edit
  operations with pages of their own -- cropper, flipper, rotator, brightness,
  contrast, greyscale -- plus `/image/solid-background-remover` are all
  `components/image-editor-tool.tsx` with a different heading. Every control is
  on every one of those pages. Each entry says so, because a page that names
  one job and shows eight controls owes the reader an explanation.

  Sources are named above each entry. Nothing here states a format, a limit or
  a refusal the component does not enforce.
*/

const SEALED_PAGE =
  'Every response from this site is served with a Content Security Policy whose connect-src directive is set to none. That is an instruction to your browser rather than a promise in marketing copy, and the browser is what enforces it: while this page is open it cannot open a connection to anywhere, so there is no route by which your image could be uploaded. e2e/egress-proof.spec.ts asserts the served header and then attempts to send data out by every path a page has — including a real image through a real tool — and requires every attempt to be refused. It runs on every build.';

const NO_NETWORK_CODE =
  'The other half of it is that the code has nowhere to send anything from. lib/tools/local-source-policy.test.ts reads every source file under lib/tools, workers, components and app on every test run and fails if any of them contains fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon or a peer connection, or even a remote address written in a comment. An upload cannot be added here by accident, because the file that would contain one cannot be committed.';

/** The paragraph the seven editor faces share, phrased for each in context. */
const EDITOR_LIMITS =
  'One JPEG, PNG or WebP of up to 25 MB goes in; WebP, JPEG or PNG comes out, with a quality slider from 10 to 100 that applies to the lossy formats and is disabled for PNG. The finished image may be no larger than 64 megapixels, counted after the crop and any quarter turn. Because the result is drawn onto a canvas and re-encoded by the browser, no EXIF is carried across — no camera settings and no GPS location — so keep your original if you need that information. Some browsers answer a request for WebP with a different format; when that happens the tool reports the format the browser really produced rather than naming the file for a format it is not.';

export const PAGE_DEPTH_IMAGE: Readonly<Record<string, ToolPageDepth>> = {
  // components/image-optimize-tool.tsx, lib/tools/image.ts,
  // e2e/image-optimize.spec.ts, e2e/egress-proof.spec.ts.
  '/image/optimize': {
    title: 'Compress Image Online — Free JPG, PNG and WebP',
    description:
      'Resize, compress and convert JPEG, PNG and WebP in your own browser. Real before and after sizes, batch mode with a ZIP download, and the saved file is decoded again to check its dimensions.',
    heading: 'About this image optimiser',
    offlineReady: true,
    directAnswer:
      'Choose one image or several, set a maximum width and height, pick an output format and a quality, and optimise. The image is drawn onto a canvas at the new size and re-encoded by your browser, the saved bytes are decoded again to confirm the dimensions came out as planned, and the panel reports the real before and after sizes. Several images at once are processed one after another and offered as a single ZIP.',
    lead: 'This does three things in one pass — resize, re-encode and convert — on JPEG, PNG and WebP up to 25 MB each. Resizing is contain-only and never upscales: the width and height you give are a box the image is fitted inside, so a 4000 by 3000 photograph capped at 1200 by 1200 comes out 1200 by 900, and a 640 by 480 image capped at 1200 stays 640 by 480. WebP is the default output because it is usually the smallest of the three at the same visual quality. The tool does not copy the original file’s metadata into the result, and it says so on the receipt rather than leaving you to discover it: animation, embedded profiles and edit history are not preserved.',
    steps: [
      {
        name: 'Choose one image, or many',
        text: 'JPEG, PNG or WebP, up to 25 MB each. One file opens the single editor; two or more switches to batch mode, which runs them in sequence and names any file it could not read without stopping the rest.',
      },
      {
        name: 'Set the box to fit inside',
        text: 'Maximum width and height, from 1 to 12,000 pixels. They are filled in for you from the image’s own size, capped at 2400. The image is scaled to fit inside the box with its proportions kept, and never enlarged.',
      },
      {
        name: 'Pick a format and a quality',
        text: 'WebP, JPEG or PNG. Quality runs from 10 to 100 and starts at 82; it is disabled for PNG, which has no quality setting. JPEG output is drawn onto a white background first, because JPEG cannot carry transparency.',
      },
      {
        name: 'Optimise, then read the real numbers',
        text: 'The panel shows the true before and after sizes, the finished dimensions, how long it took and the percentage saved — or the percentage larger, when re-encoding made the file bigger, which it honestly reports rather than hiding.',
      },
    ],
    sections: [
      {
        heading: 'Why the size you ask for is a box, not a target',
        body: [
          'Every resize has to decide what happens when the shape you ask for does not match the shape of the image. Stretching distorts it; cropping throws part of it away; fitting inside keeps everything and leaves the result smaller than the box on one axis. This tool fits inside, always, and it never enlarges.',
          'That is the right default for the job people actually have — an image that is too large for a page, an email or an upload, and needs to be smaller without being mangled. It also means you can set the same box for a folder of images of different shapes and get a consistent maximum dimension out of all of them, which is what a batch is usually for.',
          'If you need exact pixels rather than a maximum, the exact-size tool on this site takes a width and a height and will crop, pad or stretch to hit them precisely — and will also hit a file-size ceiling in KB at the same time.',
        ],
      },
      {
        heading: 'Choosing between WebP, JPEG and PNG',
        body: [
          'WebP is usually the smallest at the same visual quality and is supported by every current browser; it is the default here. Its drawback is that some older software still will not open it, so it is the wrong choice for a file someone will open in a desktop application you cannot predict.',
          'JPEG is the safe universal choice for photographs, and the one to pick when the file is going into something old or unknown. It cannot carry transparency, so this tool fills the canvas with white before drawing when you choose it — that is why a transparent PNG converted to JPEG comes out with a white background rather than a black one.',
          'PNG is lossless, which is why the quality slider is disabled for it. Use it for screenshots, diagrams, line art and anything with sharp edges or flat colour, where JPEG artefacts are visible and the file is often smaller in PNG anyway. Use it for photographs only when you genuinely cannot lose anything, because a photographic PNG is very large.',
        ],
      },
      {
        heading: 'What the dimension check is for',
        body: [
          'After the browser encodes the result, the saved bytes are decoded again and the width and height read back out and compared with what was planned. A mismatch fails the run rather than offering the file.',
          'This catches a real class of browser failure. Canvas encoding is the browser’s own code, and it can silently produce something other than what was asked for — a different format, or a size that hit an internal limit. The receipt therefore reports "dimensions match" as a measured fact, and where the browser substituted a format it names the format you actually got instead of labelling the file with the one you asked for.',
        ],
      },
      {
        heading: 'Why the images never leave the tab',
        body: [
          SEALED_PAGE,
          'This page is the one the egress proof is run against, so the assertion is not a general claim about the site but a measurement taken here: a real PNG handed to this tool produces no request carrying a body, the file name never appears in a request URL, and every off-origin resource transfers zero bytes.',
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'Will it make my image bigger than it was?',
        answer:
          'It never enlarges the pixels — the width and height you set are a box to fit inside, so a small image stays its own size. The file can occasionally come out larger in bytes, usually when a heavily compressed JPEG is re-encoded at a high quality, and the receipt says so in as many words rather than reporting a negative saving as a positive one. Lower the quality or keep the original in that case.',
      },
      {
        question: 'Which formats can I use, and what are the limits?',
        answer:
          'JPEG, PNG and WebP going in and coming out, up to 25 MB per file, with width and height from 1 to 12,000 pixels and quality from 10 to 100 for the lossy formats. HEIC, AVIF, TIFF, GIF and SVG are not accepted. There is no limit on how many images you can run.',
      },
      {
        question: 'Does it keep my EXIF data and colour profile?',
        answer:
          'No. A new image is encoded by the browser from the pixels, so the original metadata is not copied — no camera settings, no GPS, no embedded profile and no edit history. Keep your original if you need any of it. If stripping metadata is the point rather than a side effect, the photo metadata tool on this site removes it without re-encoding the picture at all.',
      },
      {
        question: 'Can I do a whole folder at once?',
        answer:
          'Yes. Choose two or more files and the page switches to batch mode, running them in sequence with the same settings and offering every result in a single ZIP. A file it cannot read is named and marked failed, and the rest of the batch carries on — a test in this repository puts a deliberately corrupt file in the middle of three and requires the third to still be processed.',
      },
      {
        question: 'Why did my WebP come out as a PNG?',
        answer:
          'Because your browser answered the request for WebP with something else — WebKit does this in some versions. Rather than name the file .webp when it is not, the tool reports the format the browser actually produced and saves it with the matching extension. The picture is intact; only the format differs from the one you asked for.',
      },
      {
        question: 'Is there a watermark, a sign-up or a queue?',
        answer:
          'None of them. There is no account, no email step and no cap on runs, and nothing is added to the output. The work happens on your computer, so there is no per-image cost for anyone to recover.',
      },
    ],
  },

  // components/image-exact-size-tool.tsx, lib/tools/exact-size.ts,
  // lib/portal-presets.ts, e2e/image-exact-size.spec.ts.
  '/image/exact-size': {
    title: 'Resize Image to Exact KB — Pixels and DPI, Free',
    description:
      'Fit a photo or signature under a KB limit at exact pixels with a real DPI, in your browser. Every requirement is checked against the saved bytes and shown as a pass or fail table.',
    heading: 'About this exact-size image tool',
    directAnswer:
      'To resize an image to an exact KB size without uploading it: enter the maximum KB, the pixels and the DPI your form asks for, and choose Fit to size. The browser re-encodes the image with Canvas, binary-searches the JPEG quality until the file fits, writes the DPI into the file itself, and then reads the saved bytes back and shows you a pass or fail for every requirement you set.',
    lead: 'Exam, job and government portal uploads — photograph and signature — often ask for a file under a set number of KB, at set pixels, and sometimes at a set DPI. Meeting all three at once is the actual problem, because each affects the others, and most tools only do one. This does them together in your browser tab with the Canvas API, and then checks its own work against the file it produced rather than against what it intended to produce. Portal limits change; check the current notice for the exact size, pixels and format before you rely on any figure.',
    steps: [
      {
        name: 'Choose the images',
        text: 'Up to 20 files, 25 MB each, in any format this browser can open. Output is JPEG or PNG.',
      },
      {
        name: 'Set the size ceiling',
        text: 'A maximum in KB, and optionally a minimum. Say which KB you mean — 1,024 bytes or 1,000 — because portals differ and the difference matters at the boundary. The exact byte limit used is shown back to you.',
      },
      {
        name: 'Set pixels and DPI',
        text: 'Width, height and DPI, each optional. Give both edges and you get exactly those; give one and the other follows the source proportions; give neither and the source pixels are kept. Where the target shape differs from the image, choose crop to fill, fit inside with white padding, or stretch.',
      },
      {
        name: 'Fit to size',
        text: 'For JPEG, the quality is binary-searched between 10 and 100 and every attempt judged on its measured byte length. PNG has no quality setting, so only the pixels affect its size.',
      },
      {
        name: 'Read the check table',
        text: 'One row per requirement — maximum size, minimum size, pixels, DPI, format — each showing what was required, what the saved file actually is, and pass or fail. A file over the maximum is never offered for saving.',
      },
    ],
    sections: [
      {
        heading: 'The DPI is written into the file, not just reported',
        body: [
          'DPI in an image file is a number in a header saying how many dots per inch the image is meant to be printed at. It changes nothing about the pixels, and a great many tools that claim to set it simply tell you a number without writing anything — which is why a form keeps rejecting a photograph that "is" 300 DPI.',
          'This writes it. For a JPEG it rewrites or inserts the JFIF header segment with the density units set to dots per inch; for a PNG it replaces or inserts the physical-dimensions chunk immediately after the header, with a correct checksum, storing the value in pixels per metre as the format requires. Then it reads the number back out of the saved bytes and shows you what it found.',
          'The DPI bytes are added before the size is checked, so they count against your KB ceiling rather than pushing the file over it after the fact.',
        ],
      },
      {
        heading: 'Why "1 KB" is a question worth asking',
        body: [
          'A kilobyte is 1,000 bytes to a disk manufacturer and 1,024 bytes to most software, and portals are inconsistent about which they mean. At a 20 KB limit the difference is 480 bytes, which is exactly the margin a photograph lands in when it has been squeezed as far as it will go.',
          'So the tool asks, and shows you the exact byte limit it used. The maximum is rounded down and the minimum rounded up, always inward, so a rounding error can never be the reason a file is rejected.',
        ],
      },
      {
        heading: 'What it will not do',
        body: [
          'It never pads a file with filler bytes to reach a minimum size. If the image is still under the minimum at full quality, it says so. Padding would produce a file that passes a check and is not an image anyone should be sending.',
          'It never changes your pixels on its own. If the ceiling cannot be reached at the pixels you asked for, it says so and stops, quoting the size it reached at the lowest quality it tried. Tick "Allow smaller pixels" and it will then search for the largest scale that fits, keeping the proportions and never taking the shorter edge below 16 pixels, and it reports the pixels it ended up with.',
          'It keeps no metadata except the DPI. The image is re-encoded by the browser, so EXIF does not survive. Output is JPEG or PNG only — no WebP, no AVIF.',
        ],
      },
      {
        heading: 'Published limits, cited and dated',
        body: [
          'Known ceilings are offered as buttons: USCIS online filing, Gmail attachments on a personal account, Income Tax e-filing e-Proceedings attachments, GST appeal supporting documents and GST registration proof documents. Pressing one fills in the number.',
          'Each is shown with the portal page it was read from and the date it was read, and each stated decimal-megabyte figure is rounded down to whole kibibytes so the result is under the ceiling however the portal counts. A test fails the build once any citation is more than ninety days old. Portals change limits without announcing it, so check yours before you rely on it — typing over the number clears the citation, because at that point the figure is yours and not theirs.',
          SEALED_PAGE,
        ],
      },
    ],
    faqs: [
      {
        question: 'What does KB mean in this tool?',
        answer:
          'By default 1 KB is 1,024 bytes. Some portals use 1,000 instead, so you can choose, and the result shows the exact byte limit that was used. The maximum is rounded down and the minimum rounded up, always inward, so rounding can never be the reason a file is refused. Check which one your portal means.',
      },
      {
        question: 'What happens if the image cannot get under the limit?',
        answer:
          'The tool says so and does not change your pixels on its own. The lowest JPEG quality it tries is 10%. If you turn on "Allow smaller pixels", it keeps the shape, reduces the dimensions until the file fits and reports the final pixels. PNG has no quality setting, so only pixels change its size.',
      },
      {
        question: 'Can it make a small file bigger to reach a minimum size?',
        answer:
          'Only by using a higher quality. If the file is still under the minimum at full quality, the tool reports that. It does not pad the file with filler bytes.',
      },
      {
        question: 'Does it really change the DPI?',
        answer:
          'Yes. It writes the density into the file itself — the JFIF header for JPEG and the pHYs chunk for PNG — and reads it back from the saved bytes. The image is re-encoded by the browser, so metadata other than DPI, such as EXIF, is not kept.',
      },
      {
        question:
          'What happens when my photo is the wrong shape for the pixels I need?',
        answer:
          'You choose. Crop to fill keeps the centre and trims the rest, which is the default and usually right for a passport-style photograph. Fit inside with white padding keeps the whole image and adds white to make up the shape. Stretch distorts to hit the numbers exactly. The choice only appears when the target shape genuinely differs from your image.',
      },
      {
        question:
          'How do I know the saved file actually meets the requirements?',
        answer:
          'Because every check is made against the saved bytes, not against the tool’s intentions. The table reads the byte length, decodes the file to read its real pixel dimensions, reads the DPI back out of the header, and identifies the format from its signature bytes. Each row shows the requirement, what the file actually is, and pass or fail — and a file over the maximum is never offered for saving at all.',
      },
    ],
  },

  // components/image-editor-tool.tsx, workers/background-removal.worker.ts,
  // lib/tools/background-removal/u2netp.ts, lib/security/content-security-policy.ts,
  // e2e/test-ai-bg.spec.ts, e2e/test-bg-remover-pixel.spec.ts.
  '/image/background-remover': {
    title: 'Remove Image Background — Free, Runs in Your Tab',
    description:
      'Cut a subject out of a photo with a U²-Net model that runs in your own browser, or clear one plain colour. The model is served from this site; the picture is never uploaded.',
    heading: 'About this background remover',
    directAnswer:
      'Choose a JPEG, PNG or WebP and the cut-out starts on its own. AI Subject mode runs the U²-Net small model in a Web Worker inside your tab; Solid Color mode instead clears every pixel within a distance you set of one colour you pick. Save the result as PNG or WebP, the two formats that can hold transparency.',
    lead: 'The subject cut-out runs the u2netp model through ONNX Runtime Web on a single WebAssembly thread. The weights are about 4.4 MB and the runtime binary about 12 MB, and both are served from this site, which is why this page allows same-origin requests instead of blocking every connection — it is the one exception on the site and it reaches no third party. The model sees your image squashed into a fixed 320 by 320 square, so the mask it returns is 320 by 320 and is stretched back over the full-resolution photograph; fine edges are limited by that. Source images must be JPEG, PNG or WebP and no larger than 25 MB, and the result is capped at 64 megapixels.',
    steps: [
      {
        name: 'Choose the photo',
        text: 'JPEG, PNG or WebP up to 25 MB. Background removal is already switched on, and choosing a file starts the run — there is nothing else to press.',
      },
      {
        name: 'Let the model load once',
        text: 'The first run fetches about 4.4 MB of model weights and a 12 MB WebAssembly runtime from this site, and your browser caches them. Later images cost nothing extra to download.',
      },
      {
        name: 'Or switch to Solid Color',
        text: 'For a photograph taken against a plain backdrop, pick the colour, set a tolerance from 0 to 180 and an edge softness from 0 to 96, and no model is loaded at all. This mode is limited to 16 megapixels.',
      },
      {
        name: 'Save as PNG or WebP',
        text: 'JPEG is disabled while background removal is on, because JPEG has no alpha channel and cannot hold a transparent background. PNG is the default here.',
      },
    ],
    sections: [
      {
        heading: 'A model that runs on your machine, not ours',
        body: [
          'Background removal is the one tool on this site that needs a machine-learning model, and the usual way to ship one is to send the photograph to a server that has it. That is a real disclosure — photographs of people, products, documents and premises — made for the sake of a few seconds of compute.',
          'Instead, the model comes to you. The weights are a static file on this site, the runtime is a static WebAssembly binary on this site, and both are fetched by a Web Worker running in your own tab. This page’s Content Security Policy is relaxed exactly two notches to allow that: same-origin connections, and permission to compile WebAssembly. No third-party origin is reachable, peer connections stay blocked, and the worker is terminated as soon as the cut-out finishes or you leave the page rather than sitting there holding the model.',
          'The identity of what is served is pinned: a test hashes the model file on disk and compares it against a checked-in SHA-256, and hashes the WebAssembly runtime against the copy in the installed dependency. A silently swapped model would fail the build.',
        ],
      },
      {
        heading: 'Why the edges look the way they do',
        body: [
          'The model works at a fixed 320 by 320 pixels. Your photograph is squashed into that square, a mask is produced at that size, and the mask is then stretched back up over the full-resolution image with smoothing. The subject keeps every pixel it had; only the mask is upscaled.',
          'That is why the outline cannot resolve detail finer than a 320-wide grid. Hair, fur, fine mesh, thin branches and glass edges are where it shows first, and no amount of source resolution changes it, because the model never sees the source resolution.',
          'For a photograph taken against a plain backdrop, Solid Color mode with a raised edge softness often gives a cleaner edge than the model does, because it is working on your actual pixels rather than on an upscaled mask.',
        ],
      },
      {
        heading: 'The two modes, and when each is right',
        body: [
          'AI Subject scores every part of the image for how much it looks like the subject and keeps what scores highly, so it works on a photograph with a busy or textured background — a person on a street, a product on a desk. If fewer than one pixel in five hundred comes back as foreground, it stops with a message suggesting Solid Color rather than handing you a blank picture.',
          'Solid Color does no inference at all. It clears every pixel within a straight-line colour distance of the one you pick, with a default tolerance of 36 and an edge softness of 24, and it reports how many pixels it cleared. It is the right choice for a product shot on white, a scanned signature, or a logo on a flat background — and it is exact, repeatable and instant, because there is no model involved.',
        ],
      },
      {
        heading: 'What it refuses',
        body: [
          'Anything that is not a static JPEG, PNG or WebP — HEIC, AVIF, TIFF, GIF and raw camera files are not accepted — and any file over 25 MB. JPEG output is refused while background removal is on, with a message explaining that JPEG cannot carry a transparent background; turn background removal off and the editor fills the canvas with white instead, which is what JPEG needs.',
          'After encoding, the saved image is decoded again and its dimensions compared with what was drawn, and a mismatch fails the run rather than handing you a file.',
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question:
          'What is the difference between AI Subject and Solid Color mode?',
        answer:
          'AI Subject runs the U²-Net small model on your image and keeps whatever it scores as the subject, so it can work on a photograph with a busy background. Solid Color does no inference at all: it clears every pixel within a chosen distance of one colour you pick, with a default tolerance of 36 and an edge softness of 24 measured as straight-line RGB distance. Solid Color is limited to 16 megapixels per image; AI Subject is bounded by the 64 megapixel canvas cap that applies to every edit here.',
      },
      {
        question: 'Why can I not save the result as a JPEG?',
        answer:
          'JPEG has no alpha channel, so it cannot carry a transparent background. With background removal switched on the tool refuses JPEG and defaults the output to PNG. If you want a flat background instead, turn background removal off: the editor then fills the canvas with white before drawing, which is what JPEG output needs.',
      },
      {
        question: 'Does the model run on a server?',
        answer:
          'No. The model weights and the ONNX Runtime WebAssembly binary are static files on this site, fetched by a Web Worker in your own tab, and this page’s Content Security Policy allows connections to this site only, so no third-party origin is reachable. The worker is terminated as soon as the cut-out finishes or you leave the page, so it does not sit holding the model afterwards.',
      },
      {
        question: 'Why are the edges of my cut-out rough?',
        answer:
          'The mask is produced at 320 by 320 pixels and then scaled up to your image’s own size with smoothing, so it cannot resolve detail finer than that grid. Hair, fur, fine mesh and thin branches are where this shows first. For a photo taken against a plain backdrop, Solid Color mode with a raised edge softness often gives a cleaner edge than the model does.',
      },
      {
        question: 'Which files does it refuse?',
        answer:
          'Anything that is not a static JPEG, PNG or WebP, and any file over 25 MB. HEIC, AVIF, TIFF, GIF and raw camera files are not accepted. It also refuses to hand you a file whose dimensions do not match what it drew, re-reading the saved image to check.',
      },
      {
        question: 'How much does it download, and how often?',
        answer:
          'About 4.4 MB of model weights and about 12 MB of WebAssembly runtime, both from this site, on the first run only — your browser caches them afterwards. Solid Color mode downloads neither, because it does no inference. Your image is never among the things fetched; it is read from your own disk into the page.',
      },
    ],
  },

  // components/image-editor-tool.tsx, lib/tools/image.ts,
  // e2e/canvas-and-pdf-tools.spec.ts ('Image editor').
  '/image/editor': {
    title: 'Photo Editor Online — Free Crop, Rotate, No Upload',
    description:
      'Crop to exact pixels, rotate in quarter turns, flip, adjust brightness, contrast, greyscale and sepia, then save as WebP, JPEG or PNG. One pass over one picture, entirely in your browser.',
    heading: 'About this local photo editor',
    directAnswer:
      'Choose a JPEG, PNG or WebP of up to 25 MB, then set a crop by typing X, Y, width and height in the image’s own pixels, turn it in quarter turns, flip it horizontally or vertically, adjust brightness, contrast, greyscale and sepia, and save as WebP, JPEG or PNG. Everything is applied in a single canvas pass and the saved file is decoded again to confirm its dimensions.',
    lead: 'This is a precise editor rather than a creative one. The crop is four numbers, not a dragged box; the rotation is quarter turns, not an arbitrary angle; the adjustments are percentages you can write down and repeat. That makes it the right tool when you already know what you want — a crop from a specification, the same treatment across a set of images, a screenshot trimmed to exact coordinates — and the wrong tool when you want to work by eye. There are no layers, no brushes, no healing and no text. What there is, is an operation that does exactly the same thing every time you give it the same numbers.',
    steps: [
      {
        name: 'Choose the image',
        text: 'One JPEG, PNG or WebP up to 25 MB. The crop boxes fill in at the image’s full size, so you narrow down from there.',
      },
      {
        name: 'Set the crop',
        text: 'X and Y are the top-left corner of the crop in the image’s own pixels, measured from the top-left of the picture; width and height are its size. All four are whole numbers and the rectangle must stay inside the image.',
      },
      {
        name: 'Turn, flip and adjust',
        text: 'Rotate steps in quarter turns; Flip H and Flip V mirror the image and can both be on at once. Brightness and contrast run from 0 to 200 per cent, greyscale and sepia from 0 to 100 per cent, and all four are applied in one pass.',
      },
      {
        name: 'Save',
        text: 'WebP, JPEG or PNG, with a quality slider from 10 to 100 for the lossy formats. The saved bytes are decoded again and the dimensions compared with what was drawn before the download is offered.',
      },
    ],
    sections: [
      {
        heading: 'The order the edits are applied in',
        body: [
          'It matters, because the same settings in a different order give a different picture. Here the crop is taken from the source first, then the rotation, then the flips, then the colour adjustments, then the encode. A quarter turn of 90 or 270 degrees swaps the output width and height, so a 400 by 300 crop rotated once comes out 300 by 400.',
          'The adjustments themselves are applied as a single filter in a fixed order — brightness, then contrast, then greyscale, then sepia — in one drawing operation rather than four passes over the pixels. A value outside its range is clamped rather than refused, so a brightness of 240 is treated as 200.',
        ],
      },
      {
        heading: 'A typed crop, and what you give up for it',
        body: [
          'There is no drag handle and no aspect-ratio preset. A fixed-ratio crop means working the numbers out yourself, and a crop chosen by eye means reading coordinates off something else first.',
          'In exchange, the same numbers give the same crop every time. That is what you want when a specification says a 1200 by 628 region starting 40 pixels down, when you are cropping a set of screenshots identically, or when you need to redo the same crop next month and get a pixel-identical result. The four boxes start at the image’s full size, so you are always narrowing an already-valid rectangle rather than writing one from nothing, and a rectangle that would fall outside the image is refused with the image’s real dimensions quoted back.',
        ],
      },
      {
        heading: 'Limits, formats and what is not carried across',
        body: [
          EDITOR_LIMITS,
          'Background removal is also on this screen — a checkbox with an AI subject mode and a solid-colour mode. This page is one of the two on the site served a slightly relaxed policy so that the model can be loaded from this site; everything else here needs no network at all.',
        ],
      },
      {
        heading: 'Why the photograph stays on your device',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'How do I set the crop area?',
        answer:
          'X and Y are the top-left corner of the crop in the image’s own pixels, and width and height are its size. All four must be whole numbers, width and height at least 1, and the rectangle has to stay inside the image; if it does not, the run is refused and the message quotes the image’s real dimensions in pixels.',
      },
      {
        question: 'Is there a drag handle or a square or 16:9 preset?',
        answer:
          'No. Crops are typed as numbers and there are no ratio presets, so a fixed-ratio crop means working the numbers out yourself. In exchange, the same numbers give the same crop every time, which a dragged box cannot promise.',
      },
      {
        question:
          'Which formats can I save as, and what does the quality slider do?',
        answer:
          'WebP, JPEG or PNG, with a quality slider from 10 to 100 per cent that applies to the lossy formats. Because JPEG has no transparency, the canvas is filled white before the image is drawn when you save as JPEG. Some browsers answer a WebP request with a different format; when that happens the tool reports the format the browser really produced rather than naming the file for a format it is not.',
      },
      {
        question: 'What are the size limits?',
        answer:
          'A source image of up to 25 MB in JPEG, PNG or WebP, and a result of no more than 64 megapixels — that is width times height after the crop and any quarter turn. Anything larger is refused with the limit named rather than failing silently in the canvas.',
      },
      {
        question: 'Is EXIF metadata kept in the edited file?',
        answer:
          'No. The image is drawn onto a canvas and re-encoded by the browser, and nothing here writes metadata back, so the saved file carries no EXIF from the original — no camera settings and no GPS location. If you need that information, keep the original file as well.',
      },
      {
        question:
          'Can I rotate by an arbitrary angle, or straighten a horizon?',
        answer:
          'No. Rotation is quarter turns only — 0, 90, 180 or 270 degrees — which is lossless in the sense that no interpolation is needed and no new pixel values are invented. Straightening by a degree or two means resampling every pixel, and that is not offered here.',
      },
    ],
  },

  // components/image-to-text-tool.tsx, lib/tools/ocr/{assets,runtime,layout}.ts,
  // e2e/image-to-text.spec.ts.
  '/image/to-text': {
    title: 'Image to Text Online — Free OCR, Nothing Uploaded',
    description:
      'Read printed English text out of a screenshot, photo or scan in your own browser. Nothing downloads until you press the button, and the button states its exact size in bytes.',
    heading: 'About this image to text tool',
    directAnswer:
      'Choose one or more pictures containing printed text and press the button, which names the exact number of bytes it is about to download. Recognition runs in a Tesseract worker inside your browser, the text appears in a box you can copy or save as a .txt, and every word the engine was unsure about is highlighted so you can check it rather than trust it.',
    lead: 'This reads printed text out of a photograph, screenshot or scan and gives you characters you can copy. It is English only, and the model recognises printed type rather than handwriting. Nothing is downloaded when you open the page and nothing is downloaded when you choose a file: the first run fetches at most 9,832,213 bytes — the worker, the English model and one WebAssembly core — which your browser then caches, so it is a one-off rather than a per-image cost. Accuracy depends on the picture: straight, well-lit, reasonably large text reads well, and a skewed phone photograph of a curved page does not.',
    steps: [
      {
        name: 'Choose the images',
        text: 'PNG, JPEG, WebP or BMP, up to 40 MB each. There is no limit on how many; several are run one after another through the same engine session.',
      },
      {
        name: 'Press the button that names its own cost',
        text: 'The label states the exact byte count it will download before it downloads anything. A test in this repository loads the page, chooses a file, and requires that no OCR asset has been requested at either point.',
      },
      {
        name: 'Read the result',
        text: 'The recognised text appears in a box, with the page confidence, the word count and the image dimensions above it. Copy it, or download it as a UTF-8 .txt named after the image.',
      },
      {
        name: 'Check the highlighted words',
        text: 'Every word carries a confidence score from the engine, and anything below 75 is marked so you can look at it. Hovering a highlighted word shows the score.',
      },
    ],
    sections: [
      {
        heading: 'Why the button tells you the download size',
        body: [
          'Optical character recognition needs an engine and a language model, and together they are close to ten megabytes. Most tools handle this by starting the download silently the moment the page loads, so the cost lands on everyone who visits, including the people who came to read what the page does and then left.',
          'Here nothing is fetched until you ask for it, and the ask states its price. The figure is not a guess: it is computed from the exact bytes checked into this repository — 111,307 for the worker, 2,952,873 for the English model, and one WebAssembly core of roughly 6.7 MB — and a test fails the build if a dependency update makes the number stale.',
          'The evidence that nothing loads early is a test that records every request to the OCR asset paths, loads the page, waits for the network to go quiet, chooses a file, and requires the recorded list to be empty at both points.',
        ],
      },
      {
        heading: 'What the confidence highlighting is for',
        body: [
          'A recogniser returns a confidence for every word, and this page shows it rather than hiding it. Words scoring below 75 are highlighted, and the score appears when you hover one.',
          'Low scores cluster where you would expect: small text, low contrast, unusual or decorative fonts, and JPEG compression artefacts. They are a guide to where to look, not a verdict — a high-confidence misreading is entirely possible, particularly between characters that genuinely look alike. Read numbers, names and punctuation yourself before relying on them.',
        ],
      },
      {
        heading: 'What it cannot do',
        body: [
          'English only. The engine is created with the single language code eng and no other model file is served, so text in another script will be misread as English or produce nothing useful.',
          'Printed type, not handwriting. The model is trained on printed characters, and lines are grouped by comparing each word’s vertical centre against the median word height — an assumption that holds for flat, straight text and breaks down on curved, skewed or heavily rotated pages.',
          'It does not rebuild layout. You get lines of text in reading order, not columns, tables or a page. And it does not produce a searchable PDF: for a scanned PDF that should stay a PDF and gain a text layer, use the PDF OCR tool on this site.',
        ],
      },
      {
        heading: 'Why the picture is not uploaded',
        body: [
          'Recognition runs in your own browser using a Tesseract worker loaded from this site, and the picture is read into the page rather than posted anywhere. The worker is created from a same-origin script rather than from a blob URL specifically so that it inherits the narrow policy scoped to those asset paths instead of a broader one.',
          'The page itself keeps the site-wide policy that forbids every network connection. An end-to-end test recognises a known image and then asserts that not one off-origin request was made during the whole run.',
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'Is my image uploaded when I convert it to text?',
        answer:
          'No. Recognition runs in your own browser using a Tesseract worker loaded from this site, and the picture is read into the page rather than posted anywhere. The worker is created from a same-origin script rather than a blob URL specifically so it inherits this site’s narrow asset policy instead of a broader one, and an end-to-end test asserts that a complete run makes no off-origin request at all.',
      },
      {
        question: 'How much does the first run download, and when?',
        answer:
          'At most 9,832,213 bytes: a 111,307-byte worker, a 2,952,873-byte English model, and a WebAssembly core of roughly 6.7 MB, whichever of the available cores matches the SIMD support your browser reports. Nothing downloads when the page opens and nothing downloads when you choose a file — only when you press the button, which names the figure. Your browser caches all three afterwards.',
      },
      {
        question: 'Which languages does it recognise?',
        answer:
          'English only. The engine is created with the single language code eng, and no other traineddata file is served, so text in other scripts will either be misread as English or produce nothing useful.',
      },
      {
        question:
          'Why is some of the recognised text marked as low confidence?',
        answer:
          'Every word carries a confidence score from the engine, and anything below 75 is flagged so you can check it rather than trust it silently. Low scores cluster around small text, low contrast, unusual fonts and compression artefacts. A high score is not a guarantee either — read numbers and names yourself.',
      },
      {
        question: 'Can it read handwriting or a photograph of a curved page?',
        answer:
          'Not reliably. The model is trained on printed type, and lines are grouped by comparing each word’s vertical centre against the median word height — an assumption that holds for flat, straight text and breaks down on curved, skewed or heavily rotated pages.',
      },
      {
        question: 'What formats and sizes does it take?',
        answer:
          'PNG, JPEG, WebP and BMP, up to 40 MB each, with no limit on the number of images. Several are processed one after another through a single engine session and each result can be copied or saved as its own .txt; a whole batch can be downloaded as one ZIP.',
      },
    ],
  },

  // components/metadata-tool.tsx, lib/tools/metadata/*, e2e/metadata.spec.ts,
  // lib/tools/metadata/golden.test.ts.
  '/image/metadata': {
    title: 'EXIF Viewer and Remover — Free, No Re-encoding',
    description:
      'See the camera, GPS location and shot settings inside a JPEG, PNG or WebP, then strip them. The picture is never re-encoded: the compressed image data is copied byte for byte.',
    heading: 'About this photo metadata tool',
    directAnswer:
      'To strip EXIF from a photo without uploading it: choose a JPEG, PNG or WebP file up to 50 MB, read what it found, then save the cleaned copy. The tool rewrites the container only: it deletes the metadata blocks and copies the compressed image data through untouched, so the picture is never re-encoded and loses no quality.',
    lead: 'A photo from a phone or camera usually carries an EXIF block holding GPS coordinates, the camera make, model and serial number, an owner name and the exact moment of the shot; PNG and WebP files carry similar information in their own chunks. This tool parses those blocks, shows you every field it can read, and writes a copy with them removed. It handles JPEG, PNG and WebP only, and refuses anything else rather than guessing. It cannot remove anything that is part of the picture itself, such as a date the camera burned into the corner.',
    steps: [
      {
        name: 'Choose or drop the photo',
        text: 'JPEG, PNG or WebP up to 50 MB. The format is decided by the file’s own signature bytes rather than its name, so a renamed file is read correctly or refused honestly.',
      },
      {
        name: 'Read what it found',
        text: 'Four cards: camera and lens, the moment and shot settings, GPS location, and embedded text entries and comments. Empty cards say so rather than disappearing.',
      },
      {
        name: 'Strip and download',
        text: 'One action removes the metadata blocks and writes a copy named with _clean added. The status panel reports the original size, the cleaned size, the bytes saved, and what was deliberately preserved.',
      },
      {
        name: 'Or do a whole folder',
        text: 'Choose several photos and they are stripped in sequence and offered as a single ZIP.',
      },
    ],
    sections: [
      {
        heading: 'What a photograph tells people about you',
        body: [
          'GPS coordinates to several decimal places, which is a street address. The camera make, model and often its serial number, which links every photograph that camera ever took. An owner name, if the camera was ever registered. The exact second the shutter opened. The lens, the exposure, the ISO. And, on a phone, sometimes a second file hiding after the end of the image — the short video half of a motion photo.',
          'This page shows all of it before it removes any of it, including latitude and longitude in both decimal and degrees-minutes-seconds, the altitude, the UTC timestamp, and a map link assembled from those numbers. Nothing is looked up on your behalf; the link is only built, and following it is your choice.',
        ],
      },
      {
        heading: 'Why the picture does not lose quality',
        body: [
          'Every other way of stripping metadata decodes the picture and encodes it again, which is a generational loss on a JPEG even at high quality. This one does not decode anything. It reads the container structure, drops the segments that hold metadata, and copies the compressed image data across byte for byte.',
          'That is a claim worth checking, and it is checked. Frozen tests in this repository compare the JPEG scan data, the PNG image data chunks and the WebP image chunk before and after stripping and require them to be identical, plus a non-vacuity test proving different inputs really do produce different outputs — so the comparison cannot pass by accident.',
        ],
      },
      {
        heading: 'What is kept on purpose',
        body: [
          'Orientation. It is an EXIF tag, so deleting the whole EXIF block would silently rotate phone photographs on download. When the source declares a rotation, the tool writes a fresh minimal EXIF segment whose only tag is orientation — no GPS, no serial number, no timestamp and no thumbnail travel with it.',
          'Colour. The ICC profile in a JPEG, the sRGB and embedded-profile chunks in a PNG, and the profile chunk in a WebP are all kept, because dropping them changes how the picture is displayed. So are the JFIF header and the colour-transform segment.',
          'That distinction — remove what identifies, keep what renders — is the whole design. A tool that strips everything produces sideways, colour-shifted photographs, and a tool that strips only the obvious block leaves the location in a second copy.',
        ],
      },
      {
        heading: 'What it will not do',
        body: [
          'JPEG, PNG and WebP only. HEIC, TIFF, AVIF, GIF and raw camera formats are refused by name rather than half-processed.',
          'It reports the presence of XMP and IPTC records and removes them whole, but it does not parse their individual fields. Compressed and international text entries in a PNG are listed by keyword rather than decoded.',
          'And it cannot remove anything that is part of the picture. A date the camera burned into the corner, a name on a document in shot, a reflection in a window — those are pixels, and no metadata tool touches them.',
          SEALED_PAGE,
        ],
      },
    ],
    faqs: [
      {
        question: 'Does stripping metadata reduce the image quality?',
        answer:
          'No. The compressed image data is copied across byte for byte and only the metadata segments around it are dropped; the pixels are never decoded and re-encoded. Frozen tests in this repository compare the JPEG scan data, the PNG image data chunks and the WebP image chunk before and after stripping and require them to be identical.',
      },
      {
        question: 'What exactly is removed from a JPEG?',
        answer:
          'The EXIF block, any XMP metadata packet, JPEG comment blocks, the IPTC metadata record, other application segments, and any bytes sitting after the end-of-image marker, which is where a phone hides the video half of a motion photo. The JFIF header, the ICC colour profile and the colour-transform segment are kept, because dropping those changes how the picture is displayed.',
      },
      {
        question: 'Will my photo come out rotated?',
        answer:
          'No. Orientation is an EXIF tag, so deleting the whole EXIF block would silently rotate phone photos on download. When the source declares a rotation the tool writes a fresh minimal segment whose only tag is orientation: no GPS, no serial number, no timestamp and no thumbnail travel with it.',
      },
      {
        question: 'What is removed from PNG and WebP files?',
        answer:
          'From a PNG it removes the EXIF chunk, the plain, compressed and international text chunks, the modification timestamp and any bytes after the end marker, while keeping the image, palette and colour chunks including the embedded profile and sRGB chunks. From a WebP it removes the EXIF and XMP chunks, clears the two header flag bits that claim those chunks exist, and rewrites the container size; the colour profile is kept.',
      },
      {
        question: 'Can it read the GPS location before I strip it?',
        answer:
          'Yes. When a photo carries GPS tags the tool shows latitude and longitude as signed decimal degrees and in degrees, minutes and seconds, the altitude if present, the UTC time and date stamp, and a map link built from those numbers. Nothing is looked up for you; the link is only assembled, and following it is your choice.',
      },
      {
        question: 'Which formats can it clean?',
        answer:
          'JPEG, PNG and WebP, up to 50 MB each, and as many as you like in one batch with a ZIP download. HEIC, TIFF, AVIF, GIF and raw camera files are refused by name — the format is decided by the file’s own signature bytes rather than its extension, so renaming one will not get it past.',
      },
    ],
  },

  // The six edit operations with pages of their own, plus the solid background
  // remover. All components/image-editor-tool.tsx; see the file header.
  '/image/image-cropper': {
    title: 'Crop Image Online — Free, Exact Pixels, No Upload',
    description:
      'Crop a JPEG, PNG or WebP to exact pixel coordinates in your own browser. Four numbers rather than a dragged box, so the same crop is repeatable, and the saved size is verified.',
    heading: 'About this image cropper',
    directAnswer:
      'To crop an image to exact pixel coordinates: choose a JPEG, PNG or WebP of up to 25 MB, type the crop’s X, Y, width and height into the four boxes, and export. The rectangle is taken from the source pixels with the browser’s canvas, and the saved file’s dimensions are read back and compared with what was asked for before the download is offered.',
    lead: 'The crop is numeric rather than drawn: four whole-number boxes in the image’s own pixels, with X and Y measured from the top-left corner. That is exactly right when you already know the rectangle — from a specification, a screenshot grid, or a crop you made before — and it is the wrong tool when you want to drag a box by eye, because there is no drag handle and no aspect-ratio preset. When an image is loaded the four boxes start at its full size, so you narrow down from there. The same screen also turns the image in quarter turns, flips it, adjusts brightness, contrast, greyscale and sepia, and saves as WebP, JPEG or PNG.',
    steps: [
      {
        name: 'Choose the image',
        text: 'One JPEG, PNG or WebP up to 25 MB. The four crop boxes are filled in at the image’s full size, so you are always narrowing a valid rectangle.',
      },
      {
        name: 'Type the rectangle',
        text: 'X and Y are the top-left corner of the crop, measured in pixels from the top-left of the picture. Width and height are its size. All four are whole numbers, and the rectangle must stay inside the image.',
      },
      {
        name: 'Export',
        text: 'The rectangle is taken from the source pixels onto a canvas and encoded as WebP, JPEG or PNG at the quality you chose.',
      },
      {
        name: 'The size is checked',
        text: 'The saved file is decoded again and its width and height compared with the crop you asked for. A mismatch fails the run rather than handing you a file.',
      },
    ],
    sections: [
      {
        heading: 'When numbers beat a dragged box',
        body: [
          'A dragged crop is faster once and impossible to repeat. If you crop twelve screenshots to the same region by eye, you get twelve slightly different regions; if you need the same crop again next month, you start over.',
          'Typed coordinates are exact, repeatable and reviewable. A design specification that says a 1200 by 628 region starting 40 pixels down is a thing you can enter directly. A crop you worked out once can be written down and used again. And a set of images shot on the same rig can be cropped identically without a single drag.',
          'The cost is that you have to know the numbers. If you do not, open the image in anything that shows a cursor position, read the corner and the size off it, and come back.',
        ],
      },
      {
        heading: 'How the coordinates work',
        body: [
          'X and Y are the top-left corner of the crop in the image’s own pixels, counted from the top-left of the picture — so X grows to the right and Y grows downwards, which is the convention screenshots and design tools use. Width and height are the size of the rectangle, not the position of its far corner.',
          'All four must be whole numbers, width and height at least 1, and the whole rectangle must stay inside the image. A rectangle that would fall outside is refused, and the message quotes the image’s real dimensions back to you — which is usually the fact you were missing.',
          'A quarter turn applied in the same pass swaps the output width and height, so a 400 by 300 crop rotated once comes out 300 by 400.',
        ],
      },
      {
        heading: 'Formats, limits and metadata',
        body: [EDITOR_LIMITS],
      },
      {
        heading: 'Nothing is uploaded',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'How do I set the crop area?',
        answer:
          'X and Y are the top-left corner of the crop in the image’s own pixels, and width and height are its size. All four must be whole numbers, width and height at least 1, and the rectangle has to stay inside the image; if it does not, the run is refused and the message quotes the image’s real dimensions in pixels.',
      },
      {
        question: 'Is there a drag handle or a square or 16:9 preset?',
        answer:
          'No. Crops are typed as numbers and there are no ratio presets, so a fixed-ratio crop means working the numbers out yourself. In exchange, the same numbers give the same crop every time, which a dragged box cannot promise.',
      },
      {
        question:
          'Which formats can I save as, and what does the quality slider do?',
        answer:
          'WebP, JPEG or PNG, with a quality slider from 10 to 100 per cent that applies to the lossy formats. Because JPEG has no transparency, the canvas is filled white before the crop is drawn when you save as JPEG. Some browsers answer a WebP request with a different format; when that happens the tool reports the format the browser really produced rather than naming the file for a format it is not.',
      },
      {
        question: 'What are the size limits?',
        answer:
          'A source image of up to 25 MB in JPEG, PNG or WebP, and a result of no more than 64 megapixels — that is width times height after the crop and any quarter turn. Anything larger is refused with the limit named rather than failing silently in the canvas.',
      },
      {
        question: 'Is EXIF metadata kept in the cropped file?',
        answer:
          'No. The crop is drawn onto a canvas and re-encoded by the browser, and nothing in this tool writes metadata back, so the saved file carries no EXIF from the original — no camera settings and no GPS location. If you need that information, keep the original file as well.',
      },
      {
        question:
          'Why does this page also show rotate, flip and colour controls?',
        answer:
          'Because it is one editor doing one pass over one picture, and cropping is one of the things that pass can do. Each job has its own address because each is a different thing to search for, and the heading names the one you came for; the other controls are there if you want to crop and turn in the same run rather than saving twice.',
      },
    ],
  },

  '/image/image-rotator': {
    title: 'Rotate Image Online — Free 90° Steps, No Upload',
    description:
      'Turn a JPEG, PNG or WebP in quarter turns and save it that way, in your own browser. No interpolation, no invented pixels, and the saved dimensions are verified before you download.',
    heading: 'About this image rotator',
    directAnswer:
      'Choose a JPEG, PNG or WebP of up to 25 MB and press Rotate to step the image a quarter turn clockwise each time — 90, 180, 270 and back to none. Saving draws the turned image onto a canvas and encodes it as WebP, JPEG or PNG, and the saved file is decoded again to confirm the dimensions came out as expected.',
    lead: 'Quarter turns are the rotation worth doing in a browser, because they need no interpolation: every pixel moves to a new position and none of its values are invented. A 90 or 270 degree turn swaps the width and height of the output, so a 4000 by 3000 photograph comes out 3000 by 4000. What this does not offer is an arbitrary angle or a straightening control, because a one-degree correction means resampling every pixel in the image and that is a different operation with a different cost. The same screen also crops to exact pixels, flips, adjusts brightness, contrast, greyscale and sepia, and converts between the three formats.',
    steps: [
      {
        name: 'Choose the image',
        text: 'One JPEG, PNG or WebP up to 25 MB. The file is read into the page from your own disk; the copy on disk is not modified whatever you do here.',
      },
      {
        name: 'Press Rotate until it is right',
        text: 'Each press steps a quarter turn clockwise. Three presses is the same as one anticlockwise turn; a fourth returns you to where you started.',
      },
      {
        name: 'Pick a format and save',
        text: 'WebP, JPEG or PNG, with quality from 10 to 100 for the lossy formats.',
      },
      {
        name: 'The dimensions are checked',
        text: 'The saved bytes are decoded again and the width and height compared with what the rotation should have produced, before the download is offered.',
      },
    ],
    sections: [
      {
        heading: 'Why the file, not the viewer',
        body: [
          'Most photo viewers have a rotate button, and on many of them it changes nothing about the file — or it changes only an orientation tag, which some other program will ignore. That is why a photograph keeps arriving sideways however many times somebody turns it.',
          'This writes the turned pixels. The image is drawn onto a canvas at its new orientation and encoded from there, so the file itself is rotated and every program that opens it afterwards sees it the right way up, including ones that ignore orientation tags entirely.',
        ],
      },
      {
        heading: 'Why only quarter turns',
        body: [
          'A rotation by 90, 180 or 270 degrees maps every source pixel exactly onto a destination pixel. Nothing is averaged, nothing is blurred and no new colour values are created — the result is the same picture, turned.',
          'Any other angle is different in kind. The source grid no longer lines up with the destination grid, so every output pixel has to be interpolated from several input pixels, the image softens slightly, and the corners need filling in. That is a reasonable thing for an editor to offer and it is not offered here, so this page says so rather than letting you look for a control that does not exist.',
          'If what you need is to straighten a horizon by a degree or two, that is the operation you are looking for, and it is not this one.',
        ],
      },
      {
        heading: 'Formats, limits and metadata',
        body: [EDITOR_LIMITS],
      },
      {
        heading: 'Where it runs',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'Can I rotate by an arbitrary angle?',
        answer:
          'No — quarter turns only: 90, 180 or 270 degrees. That is the rotation that needs no interpolation, so no pixel value is invented and the picture does not soften. Any other angle requires resampling every pixel and filling in the corners, and that is not offered here.',
      },
      {
        question: 'How do I rotate anticlockwise?',
        answer:
          'Press Rotate three times. Each press is a quarter turn clockwise, so three of them is one quarter turn the other way; a fourth press returns the image to its original orientation.',
      },
      {
        question: 'Does rotating reduce the quality?',
        answer:
          'The turn itself does not — a quarter turn maps every pixel exactly onto another pixel. What can cost a little quality is the re-encoding, since the browser writes a new file: save as PNG for a lossless result, or raise the quality slider for WebP and JPEG.',
      },
      {
        question: 'Will the rotation stick when I send the file to someone?',
        answer:
          'Yes. This writes the turned pixels into the file rather than setting an orientation tag that some software honours and some ignores, so every program that opens the result sees it the right way up.',
      },
      {
        question: 'What are the size limits?',
        answer:
          'A source image of up to 25 MB in JPEG, PNG or WebP, and a result of no more than 64 megapixels after the crop and the turn. A 90 or 270 degree turn swaps the output width and height.',
      },
      {
        question: 'Is EXIF metadata kept?',
        answer:
          'No. The image is drawn onto a canvas and re-encoded by the browser, so the saved file carries no EXIF from the original — no camera settings and no GPS location. Keep your original if you need that information.',
      },
    ],
  },

  '/image/image-flipper': {
    title: 'Flip Image Online — Free Mirror Tool, No Upload',
    description:
      'Mirror a JPEG, PNG or WebP horizontally, vertically or both, in your own browser. The flip is written into the pixels, so it survives being sent on, and nothing is uploaded.',
    heading: 'About this image flipper',
    directAnswer:
      'Choose a JPEG, PNG or WebP of up to 25 MB and press Flip H to mirror it left to right, Flip V to mirror it top to bottom, or both to turn it through 180 degrees. Saving draws the mirrored image onto a canvas and encodes it as WebP, JPEG or PNG, and the saved dimensions are checked before the download is offered.',
    lead: 'Flipping is a mirror, not a rotation, and the difference matters: a mirrored photograph is not the same picture turned, it is the picture reversed, so any text in it reads backwards. That is exactly what you want when a front camera has already reversed a selfie, when a scan came through a transparency the wrong way round, or when a design needs a mirrored version of an asset — and exactly what you do not want on a photograph of a sign. Both flips can be on at once, which gives a 180 degree turn. The same screen also crops to exact pixels, turns in quarter turns, adjusts brightness, contrast, greyscale and sepia, and converts between the three formats.',
    steps: [
      {
        name: 'Choose the image',
        text: 'One JPEG, PNG or WebP up to 25 MB. Nothing is sent anywhere — the picture is decoded in the page and drawn onto a canvas in this tab.',
      },
      {
        name: 'Press Flip H, Flip V, or both',
        text: 'Flip H mirrors left to right; Flip V mirrors top to bottom. Both together is a 180 degree turn — the same result as rotating twice, arrived at differently.',
      },
      {
        name: 'Pick a format and save',
        text: 'WebP, JPEG or PNG, with quality from 10 to 100 for the lossy formats.',
      },
      {
        name: 'The dimensions are checked',
        text: 'The saved file is decoded again and its dimensions compared with what was drawn. A flip does not change the width or height, so a mismatch here means something went wrong and the run fails rather than offering a file.',
      },
    ],
    sections: [
      {
        heading: 'Mirror or turn? They are not the same',
        body: [
          'A rotation moves the picture around a point and keeps it the right way round; a mirror reverses it. A photograph of a shopfront, rotated, still reads as the shopfront. Mirrored, the sign reads backwards and the whole image is subtly wrong to anyone who knows the place.',
          'Both flips at once is the one case where they meet: mirroring left-to-right and then top-to-bottom gives exactly the same picture as a 180 degree rotation. For every other combination they are different operations, and this page offers both because both are things people need.',
        ],
      },
      {
        heading: 'When you actually want a flip',
        body: [
          'Undoing a front camera. Most phones show you a mirrored preview and some save the mirrored version, which is why a selfie can look subtly wrong and any writing in it is reversed. Flipping horizontally puts it back.',
          'Scans and transparencies fed the wrong way round, where the whole image is reversed rather than turned.',
          'Design work: a mirrored version of an arrow, an icon or a photographic element so that a pair faces inwards rather than both the same way.',
          'What a flip cannot fix is a rotation. If the picture is sideways rather than reversed, use the rotate control on the same screen.',
        ],
      },
      {
        heading: 'Formats, limits and metadata',
        body: [EDITOR_LIMITS],
      },
      {
        heading: 'Nothing is uploaded',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'What is the difference between flipping and rotating?',
        answer:
          'A flip mirrors the picture, so text in it reads backwards; a rotation turns it and keeps it the right way round. The one place they meet is a horizontal flip plus a vertical flip, which gives exactly the same result as a 180 degree rotation. Both controls are on this screen.',
      },
      {
        question: 'Can I flip both ways at once?',
        answer:
          'Yes. Flip H and Flip V are independent toggles and both can be on, which mirrors the image left to right and top to bottom — a 180 degree turn.',
      },
      {
        question: 'Does flipping change the image dimensions?',
        answer:
          'No. A mirror keeps the width and height exactly as they were; only a quarter turn of 90 or 270 degrees swaps them. The saved file is decoded again and its dimensions checked against what was drawn, so a discrepancy fails the run rather than producing a file.',
      },
      {
        question: 'Will it fix a selfie that came out mirrored?',
        answer:
          'Yes — that is one of the common reasons to use it. Most phones show a mirrored preview and some save the mirrored image, which is why writing in a selfie reads backwards. A horizontal flip puts it back the way the scene actually was.',
      },
      {
        question: 'Does flipping lose any quality?',
        answer:
          'The mirror itself does not — every pixel keeps its value and only its position changes. The re-encode can cost a little, because the browser writes a new file: save as PNG for a lossless result, or raise the quality slider for WebP and JPEG.',
      },
      {
        question: 'What are the limits?',
        answer:
          'One JPEG, PNG or WebP of up to 25 MB, and a result of no more than 64 megapixels. EXIF is not carried across, because the image is re-encoded by the browser from the pixels.',
      },
    ],
  },

  '/image/image-brightness': {
    title: 'Brighten or Darken an Image Online — Free Tool',
    description:
      'Lighten or darken a JPEG, PNG or WebP in your own browser with a percentage you can write down and repeat. No upload, no account, and the saved dimensions are verified.',
    heading: 'About this image brightness tool',
    directAnswer:
      'Choose a JPEG, PNG or WebP of up to 25 MB and move the brightness slider, which runs from 0 to 200 per cent with 100 meaning unchanged. Below 100 darkens, above 100 lightens. The adjustment is applied in the same canvas pass as any crop, turn, flip and other colour change, and the result is saved as WebP, JPEG or PNG.',
    lead: 'Brightness here is a multiplier on every channel, expressed as a percentage: 50 per cent halves the values and 150 per cent multiplies them by one and a half. That is a simple, predictable operation, and its predictability is the point — the same number gives the same result every time, so a set of photographs shot under the same bad light can all be corrected identically. It is not a tone curve and not an exposure control: it does not protect highlights, so pushing a bright photograph well past 100 will flatten the brightest areas to white and nothing brings them back. The same screen also crops, turns, flips, adjusts contrast, greyscale and sepia, and converts between the three formats.',
    steps: [
      {
        name: 'Choose the image',
        text: 'One JPEG, PNG or WebP up to 25 MB. The original on your disk is never written to, so you can try a value, look at it, and try another.',
      },
      {
        name: 'Move the brightness slider',
        text: 'From 0 to 200 per cent, starting at 100, which leaves the image alone. Below 100 darkens and above 100 lightens; the number is shown so you can note it and reuse it.',
      },
      {
        name: 'Combine with contrast if it needs it',
        text: 'Brightening often flattens a picture. The contrast slider on the same screen is applied straight after brightness in the same pass, so the two can be balanced in one run.',
      },
      {
        name: 'Save',
        text: 'WebP, JPEG or PNG with a quality slider for the lossy formats. The saved file is decoded again and its dimensions checked before the download is offered.',
      },
    ],
    sections: [
      {
        heading: 'What the percentage actually does',
        body: [
          'It multiplies. At 150 per cent every channel value is multiplied by 1.5, at 50 per cent by 0.5, and at 100 per cent nothing changes. That is why the effect is stronger in the bright parts of a picture than in the dark ones: half of 200 is a fall of 100, and half of 20 is a fall of 10.',
          'It also means the operation clips. A channel that would go above its maximum is held at the maximum, so detail in the brightest areas of an over-brightened image is genuinely gone rather than merely compressed. Brighten in smaller steps and stop when the highlights start to flatten.',
          'Where a picture is dark in the shadows and correct in the highlights, brightness alone will not fix it — that needs a curve, which this is not. Try a smaller brightness increase together with a small contrast reduction.',
        ],
      },
      {
        heading: 'The order the adjustments are applied in',
        body: [
          'Brightness first, then contrast, then greyscale, then sepia, all in a single drawing operation rather than four passes over the pixels. The order is fixed, and knowing it explains results that otherwise look odd: raising contrast after brightening amplifies a picture that is already bright, which is not the same as doing it the other way round.',
          'A value outside its range is clamped rather than refused, so a brightness of 240 is treated as 200 and the run continues.',
        ],
      },
      {
        heading: 'Formats, limits and metadata',
        body: [EDITOR_LIMITS],
      },
      {
        heading: 'Nothing is uploaded',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'What range does the brightness slider cover?',
        answer:
          'From 0 to 200 per cent, starting at 100, which means unchanged. Below 100 darkens the image and above 100 lightens it, and the value is a multiplier on every channel — 150 per cent multiplies the values by one and a half.',
      },
      {
        question: 'Why do the bright areas go flat when I brighten a lot?',
        answer:
          'Because the operation multiplies and then clips. A channel that would exceed its maximum is held there, so detail in the brightest parts of an over-brightened picture is genuinely lost rather than compressed. Brighten in smaller steps and stop when the highlights start to flatten.',
      },
      {
        question: 'Can I fix a dark photo without blowing out the sky?',
        answer:
          'Not with brightness alone — that needs a tone curve, which this tool does not have. What often helps is a smaller brightness increase combined with a small reduction in contrast, both of which are on this screen and are applied in the same pass.',
      },
      {
        question:
          'In what order are brightness, contrast, greyscale and sepia applied?',
        answer:
          'Always brightness, then contrast, then greyscale, then sepia, in one drawing operation. The order is fixed, which is why raising contrast after brightening behaves differently from doing it the other way round.',
      },
      {
        question: 'Does it re-encode my photo?',
        answer:
          'Yes — the adjusted image is drawn onto a canvas and encoded by your browser as WebP, JPEG or PNG. That means no EXIF from the original is carried across, and a lossy format costs a little quality; choose PNG for a lossless result.',
      },
      {
        question: 'What are the limits?',
        answer:
          'One JPEG, PNG or WebP of up to 25 MB, and a result of no more than 64 megapixels after any crop and quarter turn.',
      },
    ],
  },

  '/image/image-contrast': {
    title: 'Adjust Image Contrast Online — Free, No Upload',
    description:
      'Strengthen or soften the contrast of a JPEG, PNG or WebP in your browser with a repeatable percentage. Applied in one pass with brightness, greyscale and sepia. Nothing is uploaded.',
    heading: 'About this image contrast tool',
    directAnswer:
      'Choose a JPEG, PNG or WebP of up to 25 MB and move the contrast slider, which runs from 0 to 200 per cent with 100 meaning unchanged. Below 100 flattens the image towards a uniform grey, above 100 pushes light and dark further apart. The adjustment is applied in the same canvas pass as any crop, turn, flip, brightness, greyscale and sepia change.',
    lead: 'Contrast pivots the values around the mid-point: raising it pushes anything above the middle higher and anything below it lower, and lowering it pulls everything towards the middle. Expressed as a percentage it is exact and repeatable, which is what makes it useful across a set rather than on one picture — the same number gives the same result on every image from the same camera under the same light. What it will not do is recover anything: pushing contrast up past the point where the darkest areas reach black or the brightest reach white destroys the detail there permanently, and lowering it again will not bring it back.',
    steps: [
      {
        name: 'Choose the image',
        text: 'One JPEG, PNG or WebP up to 25 MB. It is decoded in the page itself, so nothing is uploaded and the file on your disk is left alone.',
      },
      {
        name: 'Move the contrast slider',
        text: 'From 0 to 200 per cent, starting at 100. At 0 the picture collapses to a uniform mid grey; at 200 the separation between light and dark is doubled.',
      },
      {
        name: 'Balance it against brightness',
        text: 'Contrast is applied immediately after brightness in the same pass, so the two interact. Raising contrast on a picture you have already brightened pushes the highlights harder than doing it the other way round.',
      },
      {
        name: 'Save',
        text: 'WebP, JPEG or PNG with a quality slider for the lossy formats, and a dimension check on the saved bytes before the download is offered.',
      },
    ],
    sections: [
      {
        heading: 'What raising contrast costs',
        body: [
          'Contrast does not add information; it redistributes it. Pushing light and dark further apart means some values reach the top or the bottom of the range and stop there, and everything that was distinct beyond that point becomes a single flat value. A sky that was subtly graded becomes one white; a shadow with detail in it becomes one black.',
          'That is irreversible in the saved file. Lowering the contrast afterwards spreads the remaining values back out but cannot separate what has already merged. So the useful discipline is to raise it in small steps and stop at the point where the extremes start to flatten, rather than going past and coming back.',
        ],
      },
      {
        heading: 'Where a contrast adjustment genuinely helps',
        body: [
          'A photograph of a document or a whiteboard taken in flat light, where the text is grey rather than black: raising contrast separates the ink from the paper and makes it far more readable — and, if the next step is character recognition, more accurately readable.',
          'A picture shot through haze or glass, or a scan of a faded original, where the whole range is compressed into the middle.',
          'A set of images from the same source that need to look consistent. Because the control is a number rather than a drag, the same value applied to each one produces a genuinely consistent set.',
        ],
      },
      {
        heading: 'Formats, limits and metadata',
        body: [EDITOR_LIMITS],
      },
      {
        heading: 'Nothing is uploaded',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'What range does the contrast slider cover?',
        answer:
          'From 0 to 200 per cent, starting at 100, which means unchanged. At 0 the image collapses towards a uniform mid grey; at 200 the separation between light and dark is doubled. The value is shown, so you can note it and apply the same one to other images.',
      },
      {
        question: 'Can I undo contrast I pushed too far?',
        answer:
          'Not in the saved file. Raising contrast merges values that reach the top or the bottom of the range, and lowering it afterwards spreads the remaining values out but cannot separate what has already merged. Keep your original, and raise it in small steps.',
      },
      {
        question:
          'Will raising contrast make a photo of a document easier to read?',
        answer:
          'Usually, yes — a document shot in flat light has grey text on grey paper, and more contrast separates the two. It is also the adjustment that most often improves character recognition afterwards. Raise it until the text is clearly darker than the page and stop before the paper turns pure white.',
      },
      {
        question: 'Does the order of brightness and contrast matter?',
        answer:
          'Yes. They are applied in a fixed order — brightness first, then contrast, then greyscale, then sepia — in one drawing operation. Raising contrast on a picture you have already brightened pushes the highlights harder than doing the two the other way round.',
      },
      {
        question: 'Is my photo re-encoded?',
        answer:
          'Yes. The adjusted image is drawn onto a canvas and encoded by your browser as WebP, JPEG or PNG, so no EXIF from the original is carried across and a lossy format costs a little quality. Choose PNG for a lossless result.',
      },
      {
        question: 'What are the limits?',
        answer:
          'One JPEG, PNG or WebP of up to 25 MB, and a result of no more than 64 megapixels after any crop and quarter turn.',
      },
    ],
  },

  '/image/image-grayscale': {
    title: 'Image to Black and White Online — Free Greyscale',
    description:
      'Convert a JPEG, PNG or WebP towards greyscale in your own browser, at any strength from 0 to 100 per cent. No upload, no account, and the saved file is verified before download.',
    heading: 'About this greyscale converter',
    directAnswer:
      'Choose a JPEG, PNG or WebP of up to 25 MB and move the greyscale slider, which runs from 0 to 100 per cent. At 100 the image is fully greyscale; anything in between is a partial desaturation that keeps some of the original colour. The conversion is applied in the same canvas pass as any crop, turn, flip, brightness and contrast change, and saved as WebP, JPEG or PNG.',
    lead: 'This is a continuous amount rather than an on-off switch, which is the difference between "black and white" and "less colourful". At 100 per cent the picture is fully desaturated; at 60 per cent it keeps a muted trace of its original colour, which is often what a design actually wants — a photograph that recedes behind text without going flat. Greyscale is applied after brightness and contrast and before sepia, so a picture can be desaturated and then warmed in the same run. The same screen also crops to exact pixels, turns in quarter turns, flips and converts between the three formats.',
    steps: [
      {
        name: 'Choose the image',
        text: 'One JPEG, PNG or WebP up to 25 MB. The picture is read into this tab and drawn onto a canvas; your original file is not modified.',
      },
      {
        name: 'Move the greyscale slider',
        text: 'From 0 to 100 per cent, starting at 0. 100 is fully greyscale; values in between keep a proportion of the original colour.',
      },
      {
        name: 'Adjust contrast if it needs it',
        text: 'A desaturated picture often looks flatter than the colour original, because colour was doing some of the work of separating things. The contrast slider is applied before greyscale in the same pass.',
      },
      {
        name: 'Save',
        text: 'WebP, JPEG or PNG with a quality slider for the lossy formats, and a dimension check on the saved bytes before the download is offered.',
      },
    ],
    sections: [
      {
        heading: 'Why a partial amount is useful',
        body: [
          'A full conversion to greyscale is a strong choice and often too strong. A photograph behind a block of text, a background image on a card, a set of portraits that need to look uniform — in all of these the aim is usually to reduce the colour rather than remove it, so the picture supports what is on top of it instead of competing.',
          'Sixty or seventy per cent is frequently the right answer, and having it as a number means you can apply exactly the same treatment to every image in a set. That consistency is much harder to achieve with a checkbox.',
        ],
      },
      {
        heading: 'What to do when the result looks flat',
        body: [
          'Colour carries information, and removing it removes a way the eye separates one thing from another. Two objects of very different colours but similar lightness become nearly identical in greyscale, which is why a converted photograph can look muddier than the original even though nothing else changed.',
          'The fix is usually contrast. Because contrast is applied before greyscale in the same pass, raising it a little gives the desaturated result more separation. Brightness is applied before both, so a picture that goes dark on conversion can be lifted at the same time.',
          'If the aim is a warm monochrome rather than a neutral one, the sepia slider on the same screen is applied after greyscale, so full greyscale plus a little sepia gives a toned black and white.',
        ],
      },
      {
        heading: 'Formats, limits and metadata',
        body: [EDITOR_LIMITS],
      },
      {
        heading: 'Nothing is uploaded',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
    ],
    faqs: [
      {
        question: 'Is it a switch or a slider?',
        answer:
          'A slider, from 0 to 100 per cent. 100 is fully greyscale and anything in between keeps a proportion of the original colour — which is often what a design wants, a photograph that recedes behind text without going completely flat.',
      },
      {
        question:
          'Why does my black and white version look flatter than the colour one?',
        answer:
          'Because colour was doing some of the work of separating things. Two objects with very different colours but similar lightness become nearly identical once desaturated. Raising the contrast slider, which is applied before greyscale in the same pass, usually restores the separation.',
      },
      {
        question: 'Can I get a warm or toned black and white?',
        answer:
          'Yes. The sepia slider on the same screen is applied after greyscale, so full greyscale with a small amount of sepia gives a toned monochrome rather than a neutral one.',
      },
      {
        question: 'Does converting to greyscale make the file smaller?',
        answer:
          'Sometimes, but not reliably, and not because of the colour: the file is re-encoded as a normal colour image whose pixels happen to be grey. If size is the goal, set the format and quality deliberately — or use the image optimiser on this site, which reports the real before and after sizes.',
      },
      {
        question: 'Is EXIF kept?',
        answer:
          'No. The image is drawn onto a canvas and re-encoded by the browser, so the saved file carries no EXIF from the original — no camera settings and no GPS location. Keep your original if you need that information.',
      },
      {
        question: 'What are the limits?',
        answer:
          'One JPEG, PNG or WebP of up to 25 MB, and a result of no more than 64 megapixels after any crop and quarter turn.',
      },
    ],
  },

  '/image/solid-background-remover': {
    title: 'Remove White Background Online — Free, No Upload',
    description:
      'Make a plain white or single-colour background transparent in your browser. Pick the colour, set the tolerance and edge softness, and save as PNG or WebP. Nothing is uploaded.',
    heading: 'About this solid background remover',
    directAnswer:
      'Choose a JPEG, PNG or WebP of up to 25 MB, switch to Solid Color mode, pick the background colour, and every pixel within the tolerance you set of that colour is made transparent. A softness setting fades the pixels just outside the tolerance instead of cutting them off. Save as PNG or WebP, the two formats that can hold transparency, and the panel reports how many pixels were cleared.',
    lead: 'This is a colour keyer, not a subject detector: it does no inference, it simply clears everything close enough to one colour you choose. That makes it exact, instant and repeatable, and it makes it the right tool for a product shot on white, a scanned signature, a logo on a flat background, or a chart exported with a background you did not want. It is the wrong tool for a photograph with a busy background, where there is no single colour to key — for that, the AI subject cut-out on the background remover page is the one that will work. Solid Color mode is limited to 16 megapixels per image.',
    steps: [
      {
        name: 'Choose the image',
        text: 'One JPEG, PNG or WebP up to 25 MB. Background removal is already switched on when you arrive on this page.',
      },
      {
        name: 'Switch to Solid Color and pick the colour',
        text: 'Choose the background colour with the colour picker or type a six-digit hex value. White is the default, because it is what most product shots and scans have.',
      },
      {
        name: 'Set the tolerance and the softness',
        text: 'Tolerance runs from 0 to 180 and decides how far from your colour still counts as background — 36 by default. Softness runs from 0 to 96 and fades the pixels just beyond the tolerance rather than cutting them off, which is what stops the edge looking jagged.',
      },
      {
        name: 'Save as PNG or WebP',
        text: 'JPEG is refused while background removal is on, because JPEG has no alpha channel and cannot hold transparency. The panel reports how many pixels were cleared.',
      },
    ],
    sections: [
      {
        heading: 'How the keying decision is made',
        body: [
          'Each pixel’s colour is compared with the one you picked as a straight-line distance in red, green and blue. Inside the tolerance, the pixel becomes fully transparent. Outside the tolerance but within the softness band beyond it, the pixel is made partly transparent in proportion to how far out it is. Beyond that, it is left completely alone.',
          'That softness band is what makes the difference between a usable cut-out and one with a hard, aliased edge. An anti-aliased outline in the source is a gradient between the subject and the background, and a keyer with no softness cuts through the middle of that gradient, leaving a fringe of background colour behind. Raising the softness fades the fringe out instead.',
          'The panel reports the number of pixels it cleared, which is a useful sanity check: a number close to zero means the tolerance is too tight or the colour is wrong, and a number close to the whole image means it is far too loose.',
        ],
      },
      {
        heading: 'When a keyer is better than a model',
        body: [
          'On a flat background it is simply better. It is exact — the same settings give byte-identical results — it is instant, it downloads nothing, and it works at the full resolution of your image rather than through an upscaled mask, so the edge is as precise as the source allows.',
          'It fails where there is no single background colour: a person photographed on a street, a product on a patterned surface, anything with a gradient or a shadow falling across the backdrop. It also struggles when the subject contains the background colour — white shirt cuffs on a white background will be cut away along with the backdrop, and no tolerance setting fixes that.',
          'In those cases the AI subject cut-out is the tool to use, and it lives on the background remover page on this site, where the model is served.',
        ],
      },
      {
        heading: 'Limits and formats',
        body: [
          'Solid Color mode is limited to 16 megapixels per image, a tighter ceiling than the 64 megapixels that applies to the rest of the editor, because every pixel is examined individually.',
          'Output is PNG or WebP only. JPEG has no alpha channel, so it cannot carry a transparent background, and it is refused with a message saying so rather than silently producing a picture with the background back. PNG is the default here. If a flat colour background is what you actually want, turn background removal off and the editor fills the canvas with white before drawing, which is what JPEG output needs.',
          'The colour must be a full six-digit hex value; a three-digit shorthand is refused. Tolerance and softness are bounded by the engine as well as the sliders, so a value outside the range stops the run rather than producing something unpredictable.',
        ],
      },
      {
        heading: 'Nothing is uploaded, and nothing is downloaded either',
        body: [
          'Solid Color mode loads no model and no runtime. It is arithmetic over the pixels already in your tab, so there is nothing to fetch and nothing to wait for.',
          SEALED_PAGE,
          NO_NETWORK_CODE,
        ],
      },
    ],
    faqs: [
      {
        question: 'How do I remove a white background?',
        answer:
          'Leave the colour as white, which is the default, and adjust the tolerance until the background clears without eating into the subject. Tolerance runs from 0 to 180 and starts at 36; raise it when a slightly off-white background is left behind, lower it when pale parts of the subject start disappearing.',
      },
      {
        question: 'What does edge softness do?',
        answer:
          'It fades the pixels just outside the tolerance instead of cutting them off. An anti-aliased outline in the source is a gradient between the subject and the background, and a keyer with no softness cuts through the middle of it and leaves a coloured fringe. Softness runs from 0 to 96 and starts at 24.',
      },
      {
        question: 'Why can I not save as JPEG?',
        answer:
          'JPEG has no alpha channel, so it cannot hold a transparent background — saving as JPEG would silently put the background back. PNG and WebP both support transparency, and PNG is the default here. If you want a flat white background instead, turn background removal off: the editor then fills the canvas with white before drawing.',
      },
      {
        question: 'It is not working on my photo. Why?',
        answer:
          'Almost certainly because there is no single background colour to key — a street, a patterned surface, a gradient or a shadow across the backdrop all defeat a colour keyer. It also cannot help when the subject contains the background colour, such as white cuffs on white. For those, use the AI subject cut-out on the background remover page, which detects the subject rather than the colour.',
      },
      {
        question: 'How do I know it did anything?',
        answer:
          'The panel reports the number of pixels it cleared. A number close to zero means the tolerance is too tight or the colour is wrong; a number close to the size of the whole image means it is far too loose. It is the quickest way to tell a failed key from a successful one before you look closely at the edge.',
      },
      {
        question: 'What are the limits?',
        answer:
          'One JPEG, PNG or WebP of up to 25 MB, and 16 megapixels per image in this mode — a tighter ceiling than the rest of the editor, because every pixel is examined individually. The background colour must be a full six-digit hex value.',
      },
    ],
  },
};
