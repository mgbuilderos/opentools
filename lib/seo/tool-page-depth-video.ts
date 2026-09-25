import type { ToolPageDepth } from './tool-page-depth-types';

const SEALED_PAGE =
  'Every response from this site is served with a Content Security Policy whose connect-src directive is set to none. That is not a promise in marketing copy; it is an instruction to your browser, and the browser is the one enforcing it. While this page is open it cannot open a connection to anywhere — not to this site, not to anyone else — so there is no path by which your document could be uploaded, not by a bug, not by a future change, not by a script that should not be here. e2e/egress-proof.spec.ts asserts the served header and then tries to send data out by every route a page has and requires each attempt to be refused, and it runs on every build.';

const NO_NETWORK_CODE =
  'The second half of the guarantee is that the code has nowhere to send anything from. lib/tools/local-source-policy.test.ts reads every source file under lib/tools, workers, components and app on every test run and fails the build if any of them contains fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon or a peer connection, or even a remote address written down in a comment. A tool here cannot acquire an upload by accident, because the file that would have to contain one cannot be committed.';

const LOCAL_EXECUTION_ENGINE =
  'Computations run directly on your own device using WebAssembly, Web Workers, and modern browser APIs including Web Crypto and TextDecoder. There are no server queues, no background telemetry, and no temporary cloud files created. Large operations remain responsive by offloading heavy parsing and conversion tasks to dedicated worker threads, ensuring the browser UI never freezes during intensive document and data processing tasks.';

export const PAGE_DEPTH_VIDEO: Readonly<Record<string, ToolPageDepth>> = {
  // /video/trim
  '/video/trim': {
    title: 'Trim Video Online — Lossless MP4 Cutter',
    description:
      'Trim MP4 and MOV videos locally in your browser. Cuts at keyframes with zero quality loss and no watermark. Zero-copy streaming container slicing.',
    heading: 'About this video trimmer',
    directAnswer:
      'Open an MP4 or MOV video file, set your start and end cut points using the interactive scrubber or exact timestamps, and click Trim Video. The video is cut on keyframe boundaries without re-encoding, preserving exact original video resolution, audio bitrates, and color metadata with zero quality loss and no watermark.',
    lead: 'This tool performs fast, lossless video trimming directly in your browser tab without uploading video files to remote cloud servers. Standard web video editors re-encode video streams through lossy codecs, degrading visual crispness and taking minutes to render. This tool inspects MP4 ISO Base Media File Format (ISOBMFF) sample tables, extracts H.264/AAC sample packets between chosen keyframe boundaries, and writes a clean new MP4 container in seconds.',
    steps: [
      {
        name: 'Select MP4 or MOV video',
        text: 'Choose an MP4 or MOV video file. The container headers are parsed directly from disk using streaming chunk slices without buffering the full video into system RAM.',
      },
      {
        name: 'Set cut interval',
        text: 'Type exact start and end timestamps in seconds or clock format (M:SS.s) to define your trim range. The engine identifies the nearest preceding keyframe to avoid visual corruption.',
      },
      {
        name: 'Execute keyframe-aligned cut',
        text: 'Click Make the clip. The container surgery engine extracts compressed sample packets directly, adjusts sample timing tables, and packages them into a fresh container.',
      },
      {
        name: 'Download finished clip',
        text: 'Download the trimmed MP4 directly to your local drive. The export finishes in milliseconds because no frames are decoded or re-compressed.',
      },
    ],
    sections: [
      {
        heading: 'Why lossless keyframe trimming beats re-encoding',
        body: [
          'Video compression algorithms (such as H.264 and HEVC) group pictures into Groups of Pictures (GOPs). Each group begins with an independent Intra-frame (I-frame or IDR keyframe) that contains a complete image, followed by Predicted (P-frames) and Bidirectionally predicted (B-frames) that store only differences between frames. Standard web editors decode every frame to uncompressed pixels and re-compress them, which introduces generational compression artifacts, degrades color fidelity, and drains CPU resources. By slicing compressed bitstream packets directly and aligning the cut to an I-frame, this tool produces a mathematically identical video stream in a fraction of a second.',
        ],
      },
      {
        heading: 'Streaming zero-copy chunk architecture',
        body: [
          'Traditional web-based tools load entire video files into memory via FileReader.readAsArrayBuffer(), crashing browser tabs when handling videos larger than a few hundred megabytes. Our engine uses a streaming ByteSource abstraction backed by native browser File.slice() APIs. It reads only the lightweight metadata index (moov box, typically 50 KB to 2 MB) to build the sample layout plan. When generating the output, individual sample ranges are referenced as Blob slices pointing directly to the file on disk. A large video trim executes in milliseconds with minimal active memory allocation by referencing sample byte ranges directly.',
        ],
      },
      {
        heading: 'Preserving orientation display matrices and timing tables',
        body: [
          'Smartphones frequently record video in portrait orientation while keeping the sensor physically mounted in landscape, encoding a 3x3 transformation matrix inside the track header (tkhd) box. Naive container surgery tools drop this matrix and write an identity matrix, turning vertical phone videos sideways. This trimmer reads the exact 36-byte display matrix from the source file and carries it through to the exported file, preserving portrait playback across iOS, Android, macOS, and Windows media players.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Does trimming degrade video quality?',
        answer:
          'No. Because trimming copies the compressed video and audio packets directly without re-encoding, output quality is 100% identical to the source file.',
      },
      {
        question:
          'Why does the cut start slightly earlier than the requested time?',
        answer:
          'In compressed video, predicted frames rely on preceding keyframes to render. Cutting between keyframes without re-encoding causes visual corruption; aligning cuts to the nearest keyframe guarantees clean playback without re-encoding.',
      },
      {
        question: 'Which video formats are supported?',
        answer:
          'Standard MP4 and MOV files holding H.264 (AVC) or H.265 (HEVC) video alongside AAC or MP3 audio are supported using streaming zero-copy container slices.',
      },
      {
        question: 'Are my private video recordings uploaded to any server?',
        answer:
          'No. Video bytes never leave your device. The entire trimming process executes inside your browser tab under connect-src none Content Security Policies.',
      },
      {
        question: 'What is the maximum file size supported?',
        answer:
          'Large files are supported in the browser using zero-copy streaming ByteSource disk slices and native File APIs without buffering full files into RAM.',
      },
    ],
  },

  // /video/convert
  '/video/convert': {
    title: 'Convert MOV to MP4 — Fast Lossless Remux',
    description:
      'Convert MOV to MP4 and MP4 to MOV without re-encoding. Lossless container remuxing with zero quality loss and no watermark.',
    heading: 'About this video container converter',
    directAnswer:
      'Select a MOV or MP4 video file, choose your target container format (MP4 or MOV), and click Convert. The video and audio bitstreams are remuxed into the destination container format without re-encoding, finishing in seconds with zero loss in visual quality and no watermark.',
    lead: 'Online video converters typically upload your entire video file to remote cloud servers and run it through a heavy FFmpeg transcode. That process takes minutes, burns upload bandwidth, degrades image resolution, and often slaps a watermark on your footage. This tool performs container remuxing directly in your browser. It copies the raw H.264/H.265 and AAC elementary streams into a new container header, preserving every bit of original fidelity.',
    steps: [
      {
        name: 'Load MOV or MP4 file',
        text: 'Select your video file. The demuxer reads the file type atom (ftyp) and movie atom (moov) to verify internal track codecs.',
      },
      {
        name: 'Select destination container',
        text: 'Choose MP4 for universal compatibility across web browsers, Windows, and Android, or MOV where a QuickTime-native container is wanted.',
      },
      {
        name: 'Verify codec compatibility',
        text: 'The engine confirms that the internal codecs (such as H.264 video and AAC audio) are supported by the target container without transcoding.',
      },
      {
        name: 'Export remuxed video',
        text: 'Click Convert to assemble the new container. The output file is generated in milliseconds and ready for instant download.',
      },
    ],
    sections: [
      {
        heading: 'Container remuxing vs lossy re-encoding',
        body: [
          'A video file consists of a container format (like .mov or .mp4) wrapping elementary compressed streams (like H.264 video and AAC audio). In many cases, an iPhone or camera records standard H.264 video inside an Apple QuickTime .mov container. To make this file play on Windows or Android, you do not need to compress the video again — you only need to repackage the packets into an ISO Base Media .mp4 container. This process, known as remuxing, operates at disk copy speeds and avoids generational quality degradation.',
        ],
      },
      {
        heading: 'Honest limits and unsupported codecs',
        body: [
          'Remuxing only succeeds when the elementary streams inside are supported by the destination container specification. Professional QuickTime MOV files containing Apple ProRes video or uncompressed Linear PCM audio cannot be carried inside standard MP4 containers without re-encoding. If this tool encounters ProRes, PCM audio, or unsupported codecs, it immediately refuses the operation and explains the exact technical limitation rather than producing an unplayable file.',
        ],
      },
      {
        heading: 'File size and bitrate preservation',
        body: [
          'Because the video and audio frames are copied byte-for-byte, the output file size will be virtually identical to the input file (differing only by a few kilobytes of container header metadata). Users expecting a video converter to dramatically compress file size should note that file size reduction requires re-encoding with lower bitrates, whereas this tool is engineered specifically for lossless format interchange.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Will converting MOV to MP4 reduce video quality?',
        answer:
          'No. The video and audio packets are transferred directly into the MP4 container without re-encoding or compression, ensuring bit-for-bit identical picture quality.',
      },
      {
        question: 'Why did the conversion fail on my MOV file?',
        answer:
          'If your MOV file was recorded with Apple ProRes video or uncompressed PCM audio, it cannot be packaged into a standard MP4 file without a lossy transcoding pass. The tool reports incompatible codecs by name.',
      },
      {
        question: 'How fast is the conversion process?',
        answer:
          'Because frames are copied rather than re-encoded, multi-gigabyte files convert in seconds rather than minutes, running at local disk copy speeds.',
      },
      {
        question: 'Does this tool add watermarks or limits?',
        answer:
          'Never. All tools on this site operate with zero watermarks, zero subscriptions, and zero artificial limits using zero-copy streaming file slices.',
      },
      {
        question: 'Are my video files uploaded to your servers?',
        answer:
          'No. All operations run locally inside your browser under strict connect-src none security policies, with zero data leaving your machine.',
      },
    ],
  },

  // /video/rotate
  '/video/rotate': {
    title: 'Rotate Video Online — Lossless MP4 Rotator',
    description:
      'Rotate MP4 and MOV videos 90, 180, or 270 degrees and flip without re-encoding. Instant lossless header matrix update.',
    heading: 'About this video rotator',
    directAnswer:
      'Select an MP4 or MOV video file, choose your rotation angle (90° clockwise, 180°, or 270° counter-clockwise) or flip orientation, and click Apply Rotation. The video track display matrix in the container header is updated instantly without re-encoding, preserving 100% original video and audio quality.',
    lead: 'When smartphone videos are filmed upside down or sideways, standard web rotators force a full re-encode of the entire video. Re-encoding takes several minutes, degrades resolution, and introduces compression artifacts. This tool exploits the ISO Base Media File Format specification: it rewrites nine 32-bit fixed-point numbers inside the track header (tkhd) transformation matrix. The video frames themselves are untouched, completing in milliseconds.',
    steps: [
      {
        name: 'Select sideways or upside-down video',
        text: 'Choose an MP4 or MOV file up to 2 GB. The tool reads the current track header matrix and dimensions.',
      },
      {
        name: 'Choose rotation angle or flip',
        text: 'Select 90° clockwise, 180° upside-down, 270° counter-clockwise, or toggle horizontal and vertical flip mirrors.',
      },
      {
        name: 'Apply matrix transformation',
        text: 'Click Apply Rotation. The engine computes the new 3x3 affine transformation matrix and updates the container header.',
      },
      {
        name: 'Download rotated video',
        text: 'Save the rotated file immediately. The export finishes in milliseconds regardless of video file size.',
      },
    ],
    sections: [
      {
        heading: 'How QuickTime and MP4 display matrices work',
        body: [
          'In ISO/IEC 14496-12 (ISOBMFF) and Apple QuickTime specifications, the track header box (tkhd) defines a 3x3 affine transformation matrix: [a, b, u, c, d, v, x, y, w]. Values a and d represent coordinate scaling, while b and c represent shearing and rotation in 16.16 fixed-point arithmetic. By changing these coefficients, media players are instructed to rotate or mirror the rendering viewport during playback without modifying the underlying compressed frame bitstream.',
        ],
      },
      {
        heading: 'Instant processing on large video files',
        body: [
          'Because the video stream is not decoded or re-encoded, rotating a large 4K video takes virtually the exact same processing time as rotating a 5 MB clip (under 50 milliseconds). The output file is byte-identical to the source file with the exception of the nine transformation numbers inside the moov box.',
        ],
      },
      {
        heading: 'Player compatibility considerations',
        body: [
          'All modern operating systems, mobile devices (iOS and Android), web browsers (Chrome, Safari, Edge, Firefox), and modern media players (VLC, QuickTime Player, mpv, Windows 11 Media Player) fully support matrix-based rotation. However, some legacy players (such as Windows Media Player 11) or certain custom web upload pipelines ignore container transformation matrices and display the raw camera sensor orientation.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Does rotating a video reduce quality or resolution?',
        answer:
          'No. Not a single pixel is re-encoded. The rotation is achieved entirely by updating display metadata in the container header, preserving exact bitstream fidelity.',
      },
      {
        question: 'Can I flip or mirror a video?',
        answer:
          'Yes. You can mirror videos horizontally or vertically alongside 90, 180, or 270-degree rotation options with instant preview updates.',
      },
      {
        question:
          'Why does my rotated video still look sideways in an old player?',
        answer:
          'Some older desktop media players or web upload forms ignore container matrix metadata and render the raw camera sensor orientation. Modern players like VLC, QuickTime, and mobile browsers render the matrix correctly.',
      },
      {
        question: 'What is the maximum file size for rotation?',
        answer:
          'Videos process in milliseconds in your browser using zero-copy streaming ByteSource disk range slices without buffering whole files into RAM.',
      },
      {
        question: 'Is my video uploaded to the internet?',
        answer:
          'No. All processing happens 100% locally on your machine with zero server network access under strict connect-src none Content Security Policies.',
      },
    ],
  },

  // /video/split
  '/video/split': {
    title: 'Split Video Online — Lossless Clip Cutter',
    description:
      'Cut out middle sections or split MP4/MOV videos into multiple clips. Slices on keyframe boundaries without re-encoding.',
    heading: 'About this video splitter',
    directAnswer:
      'Open an MP4 or MOV video file, select whether to cut out an unwanted middle section or split into multiple separate clips at given timestamps, and click Process. The video is sliced cleanly on keyframe boundaries without re-encoding, preserving 100% original quality and providing individual clip downloads plus a ZIP bundle.',
    lead: 'Editing a video by removing an awkward middle pause or dividing a long lecture into standalone chapters usually requires heavy desktop editing suites or slow web transcoders. This tool performs keyframe-accurate container splitting in your browser tab. It extracts sample ranges from the media data atom, stitches timecodes seamlessly, and writes new MP4 files without decoding or re-compressing video frames.',
    steps: [
      {
        name: 'Select MP4 or MOV video',
        text: 'Choose your video file. The splitter inspects sample indexes and identifies all keyframe positions across the timeline.',
      },
      {
        name: 'Choose split mode',
        text: 'Select Cut Out Middle Section to remove an unwanted interval and join the ends, or Split into Multiple Clips at specified timestamps.',
      },
      {
        name: 'Configure cut points',
        text: 'Enter cut timestamps in seconds. The engine snaps resume points to the nearest preceding keyframe to prevent visual decoding artifacts.',
      },
      {
        name: 'Download clips or ZIP archive',
        text: 'Download individual cut clips directly, or click Download All (ZIP) to receive all split segments in a single compressed archive.',
      },
    ],
    sections: [
      {
        heading: 'Removing middle sections without re-encoding',
        body: [
          'When you cut out a middle section of a video, the engine builds two sample sequences: part one (from start to cut start) and part two (from resume point to video end). Because video frames reference earlier keyframes, part two must resume on an I-frame. If the chosen cut point falls on a predicted P-frame or B-frame, the engine moves the resume point back to the preceding keyframe, explicitly reporting the exact adjustment to the user. Sample timestamps in part two are mathematically offset to seamlessly follow part one.',
        ],
      },
      {
        heading: 'Splitting into multiple clips with ZIP packaging',
        body: [
          'When dividing a video at multiple timestamps (for example: 10.0, 25.5, 60.0), each segment is extracted as a standalone, self-contained MP4 file with its own valid ftyp, moov, and mdat atoms. To save time when splitting long files into dozens of chapters, all generated clips are automatically bundled into an uncompressed ZIP archive using our streaming browser ZIP writer.',
        ],
      },
      {
        heading: 'Zero quality degradation guarantee',
        body: [
          'Because the video and audio bitstreams are sliced directly at container level without undergoing lossy compression, the exported clips retain the exact bitrate, chroma subsampling, dynamic range, and audio fidelity of the source recording.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Does splitting a video reduce picture quality?',
        answer:
          'No. Frames are copied byte-for-byte without transcoding, ensuring 100% original visual and auditory quality across every exported clip.',
      },
      {
        question:
          'Why did the cut start a fraction of a second earlier than I set?',
        answer:
          'To avoid visual corruption and decoding smears, container-level cuts must resume on a keyframe (I-frame). The tool automatically snaps to the nearest preceding keyframe and informs you of the exact offset.',
      },
      {
        question: 'Can I split a video into more than two clips at once?',
        answer:
          'Yes. Enter multiple comma-separated timestamps (e.g. 15, 30, 45) to create multiple clips and download them individually or as a single ZIP archive.',
      },
      {
        question: 'What video file formats can be split?',
        answer:
          'MP4 and MOV files with H.264, H.265, and AAC tracks are supported using zero-copy streaming container surgery.',
      },
      {
        question: 'Are my video files private?',
        answer:
          'Completely. No data is ever transmitted over the network; everything executes within your browser sandbox under connect-src none policies.',
      },
    ],
  },

  // /video/merge
  '/video/merge': {
    title: 'Merge Video Clips — Lossless MP4 Joiner',
    description:
      'Join matching MP4 and MOV video clips end-to-end without quality loss. Instant container concatenation in your browser.',
    heading: 'About this video joiner',
    directAnswer:
      'Select two or more matching MP4 or MOV video clips, arrange them in your desired playback sequence, and click Merge Clips. The tool concatenates video and audio streams end-to-end without re-encoding, producing a single seamless video in seconds with zero loss in visual quality.',
    lead: 'Merging video clips online typically involves uploading gigabytes of footage to third-party cloud servers and waiting through a slow transcode. That process degrades video sharpness and drains bandwidth. This tool performs lossless container concatenation directly in your browser. When clips share matching codecs and resolutions, their compressed packets are stitched end-to-end with recalibrated timecodes at local disk speeds.',
    steps: [
      {
        name: 'Add video clips',
        text: 'Select two or more MP4 or MOV video clips. The demuxer verifies codec and resolution compatibility.',
      },
      {
        name: 'Arrange playback order',
        text: 'Use the move up and move down buttons to organize the clips into your preferred sequence.',
      },
      {
        name: 'Validate container compatibility',
        text: 'The engine validates that all clips share identical video codecs, frame dimensions, timescales, and sample descriptions (SPS/PPS).',
      },
      {
        name: 'Export merged video',
        text: 'Click Merge Clips to join the timelines. The resulting video is packaged into a new MP4 container in seconds.',
      },
    ],
    sections: [
      {
        heading: 'Strict compatibility validation for lossless merging',
        body: [
          'Lossless video merging without re-encoding is only possible when all clips share identical encoding parameters. Specifically, clips must have matching video codecs (e.g. H.264), identical pixel dimensions (e.g. 1920x1080), compatible timescales, and matching Sequence Parameter Sets (SPS) and Picture Parameter Sets (PPS) inside the sample description (stsd) atom. If you attempt to join clips with differing resolutions or profiles, the tool immediately halts and explains what differs rather than producing a corrupted file.',
        ],
      },
      {
        heading: 'Timeline concatenation and timestamp recalibration',
        body: [
          'During merging, samples from the first clip are written with their original decode timestamps. For each subsequent clip, sample timestamps are offset by the cumulative duration of all preceding clips. Audio and video streams are synchronized independently, ensuring audio remains in perfect alignment with video throughout multi-clip playback.',
        ],
      },
      {
        heading: 'Keyframe alignment at clip boundaries',
        body: [
          'To ensure seamless transition between clips, every subsequent clip must begin with a keyframe (I-frame / IDR frame). Because standalone video recordings naturally begin with an IDR keyframe, camera recordings and exported clips join cleanly without visual artifacts or frame stutter.',
        ],
      },
      {
        heading: 'Audio track synchronization and channel mapping',
        body: [
          'Soundtracks require identical acoustic parameters across clips, including audio codec fourcc (typically mp4a for AAC), sample rate (such as 44,100 Hz or 48,000 Hz), and channel configurations (stereo vs mono). The engine validates each audio sample description before concatenation, aligning audio timestamps with the video track to prevent audio-video drift across long compilations.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Does merging videos degrade quality?',
        answer:
          'No. The video and audio packets from each clip are copied directly into the unified timeline without re-encoding, preserving 100% original visual quality.',
      },
      {
        question:
          'Can I merge videos with different resolutions or aspect ratios?',
        answer:
          'Not without re-encoding. Lossless container concatenation requires all clips to share identical dimensions and codec parameters. Differing resolutions require a full transcode.',
      },
      {
        question: 'How many clips can I join together?',
        answer:
          'You can merge as many clips as desired with instant export times using zero-copy sample concatenation.',
      },
      {
        question: 'Can I reorder clips before merging?',
        answer:
          'Yes. Use the up and down arrows in the clip list to adjust the playback sequence before initiating the merge operation.',
      },
      {
        question: 'Are my video clips uploaded anywhere?',
        answer:
          'No. All files remain strictly on your local device, processed under connect-src none Content Security Policies with zero telemetry.',
      },
    ],
  },

  // /video/metadata
  '/video/metadata': {
    title: 'Remove Video Metadata — Strip GPS & Tags',
    description:
      'Inspect and strip GPS location coordinates, device models, and timestamps from MP4 and MOV videos without re-encoding.',
    heading: 'About this video metadata scrubber',
    directAnswer:
      'Select an MP4 or MOV video file to inspect hidden GPS coordinates, device hardware identifiers, software versions, and recording timestamps. Click Strip Metadata to rewrite the container without user data atoms, producing a clean video file with zero privacy leaks and zero quality loss.',
    lead: 'Modern smartphones automatically embed precise GPS latitude, longitude, and altitude coordinates into video recordings, alongside camera serial numbers, device model names, and exact timestamps. Sharing a phone video of your home or family online exposes your private physical location. This tool inspects ISO Base Media metadata atoms (udta, meta, ©xyz) and strips them losslessly without re-encoding video frames.',
    steps: [
      {
        name: 'Select video file',
        text: 'Choose an MP4 or MOV video file. The metadata inspector scans the container header for user data atoms and timestamps.',
      },
      {
        name: 'Review privacy findings',
        text: 'Inspect identified GPS location coordinates, device make and model strings, software version tags, and creation dates.',
      },
      {
        name: 'Strip tracking metadata',
        text: 'Click Strip Metadata. The container surgery engine rebuilds the MP4 container, omitting all identifying user data boxes.',
      },
      {
        name: 'Download sanitized video',
        text: 'Save the cleaned video file. The video and audio tracks are preserved byte-for-byte with zero quality loss and no location traces.',
      },
    ],
    sections: [
      {
        heading: 'The privacy danger of smartphone GPS video tags',
        body: [
          'When you record a video on an iPhone or Android phone, the operating system writes an ISO 6709 coordinate string into the user data atom (udta) under the ©xyz tag (for example, +37.7749-122.4194+015.000/). Anyone who downloads the raw video can extract your exact street address, apartment location, and elevation. Conventional advice suggests uploading the video to a web stripper — but uploading a private video to an unknown server defeats the entire purpose of privacy. Our tool runs 100% locally in your browser tab, ensuring your video never leaves your device.',
        ],
      },
      {
        heading: 'What metadata gets inspected and removed',
        body: [
          'The scrubber removes five distinct categories of identifying data: (1) GPS location coordinates (udta/©xyz), (2) Hardware device manufacturer and model strings (©mak, ©mod), (3) Operating system and software version numbers (©swr), (4) Original creation and modification timestamps in the movie header (mvhd) and track header (tkhd), and (5) User annotations, titles, artists, and comments (©nam, ©art, ©cmt).',
        ],
      },
      {
        heading: 'Lossless stripping without video re-compression',
        body: [
          'Standard video editing software strips metadata by re-encoding the entire video file, which takes minutes and degrades visual crispness. Our tool performs pure container surgery: it reads the compressed H.264/AAC sample packets and writes a fresh container structure containing only the necessary media streams and timing tables. The export finishes in milliseconds with zero loss in visual quality.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Does stripping metadata affect video or audio quality?',
        answer:
          'No. Only container header metadata and user data atoms are removed. The video and audio streams are copied byte-for-byte with zero compression or quality loss.',
      },
      {
        question: 'What GPS format do smartphones use in videos?',
        answer:
          'Smartphones record coordinates according to ISO 6709 standards in the udta/©xyz atom, including latitude, longitude, and elevation coordinates.',
      },
      {
        question: 'Are creation and modification dates reset?',
        answer:
          'Yes. Timestamps in the mvhd and tkhd atoms are normalized to zero to prevent temporal tracking and metadata forensics.',
      },
      {
        question: 'What video file formats are supported?',
        answer:
          'MP4 and MOV video containers are supported with instant zero-copy in-browser metadata stripping.',
      },
      {
        question: 'Is my video uploaded to your servers to inspect metadata?',
        answer:
          'Never. All metadata parsing and stripping executes entirely within your browser tab under connect-src none security policies.',
      },
    ],
  },

  // /video/to-gif
  '/video/to-gif': {
    title: 'Video to GIF Converter — High Quality GIF',
    description:
      'Turn MP4 and MOV video clips into animated GIFs. Customize frame rates, resolution, color palettes, and dithering locally.',
    heading: 'About this video to GIF converter',
    directAnswer:
      'Open an MP4 or MOV video file, select your trim interval, adjust frame rate, maximum dimension, color palette depth, and optional dithering, and click Make GIF. The video frames are decoded and quantized directly in your browser, producing an animated GIF without server uploads or watermarks.',
    lead: 'Converting video clips to animated GIFs usually involves uploading private media to third-party web tools that add watermarks, throttle frame rates, and place limits on resolution. This tool decodes video frames directly in your browser using hardware-accelerated video decoding. It samples frames, performs color quantization with NeuQuant/median-cut algorithms, and compiles an optimized animated GIF locally.',
    steps: [
      {
        name: 'Select video clip',
        text: 'Choose an MP4 or MOV video clip. The video is decoded locally in memory without uploading.',
      },
      {
        name: 'Set duration and frame rate',
        text: 'Select the clip range and choose your target frame rate (e.g. 10 to 15 fps) to balance animation smoothness against GIF file size.',
      },
      {
        name: 'Configure color depth and dithering',
        text: 'Choose palette size (up to 256 colors) and toggle Floyd-Steinberg dithering to reduce banding on gradients.',
      },
      {
        name: 'Generate and download GIF',
        text: 'Click Make GIF. The local encoder quantizes frames and compiles the animated GIF for immediate download.',
      },
    ],
    sections: [
      {
        heading: 'Why GIF files are large and how to optimize them',
        body: [
          'The GIF format (Graphics Interchange Format) was specified in 1989 and uses LZW compression with a strict maximum of 256 colors per frame. Unlike modern video codecs (which store differences between blocks of pixels), every GIF frame is an uncompressed indexed bitmap. As a result, long GIFs can become tens of megabytes in size. To create fast-loading GIFs, keep durations under 5 seconds, use 10 to 15 frames per second, and cap resolution to 480 pixels on the longest edge.',
        ],
      },
      {
        heading: 'Color quantization and dithering algorithms',
        body: [
          'Because 24-bit RGB video frames contain millions of distinct colors, converting to GIF requires color quantization. Our browser engine analyzes frame pixel distributions to build an optimal 128 or 256-color palette. Optional Floyd-Steinberg error diffusion dithering disperses quantization error across neighboring pixels, smoothing harsh gradients in skies and backgrounds.',
        ],
      },
      {
        heading: 'Hardware-accelerated browser frame decoding',
        body: [
          'Frames are decoded directly using native browser APIs and canvas rendering contexts rather than sluggish WebAssembly emulation. VideoDecoder and CanvasRenderingContext2D extract RGBA pixel buffers directly into the hand-written LZW encoder, producing clean animations with zero quality loss, instant local export, and no third-party server telemetry.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question:
          'Why is my converted GIF larger in size than the source video?',
        answer:
          'GIF is a 35-year-old format without modern video inter-frame compression. High frame rates or large dimensions produce large files; lowering fps or capping resolution to 480px keeps file sizes compact.',
      },
      {
        question: 'What is the maximum number of frames allowed?',
        answer:
          'The converter caps output at 150 frames to prevent browser memory exhaustion and ensure shareable, high-performance animated GIF files.',
      },
      {
        question: 'Does dithering improve GIF appearance?',
        answer:
          'Dithering smooths color banding on photo gradients, but slightly increases GIF file size because random dither patterns compress less efficiently with LZW encoding.',
      },
      {
        question: 'Does the tool add a watermark to my GIF?',
        answer:
          'No. All tools on this site are 100% free, open, and watermark-free, ensuring your creative media remains clean and professional.',
      },
      {
        question: 'Are my videos uploaded to convert to GIF?',
        answer:
          'No. Decoding and quantization run entirely on your local CPU and GPU inside your browser tab without transmitting any data over the network.',
      },
    ],
  },

  // /video/extract-audio
  '/video/extract-audio': {
    title: 'Extract Audio from Video — Lossless M4A',
    description:
      'Extract lossless AAC audio (.m4a) from MP4 and MOV videos without re-encoding. 100% original sound quality, no watermark.',
    heading: 'About this video audio extractor',
    directAnswer:
      'Open an MP4 or MOV video file, select the audio extraction mode, and click Export Audio. The compressed audio stream is demuxed directly from the video container and saved as an Apple MPEG-4 Audio (.m4a) file without re-encoding, preserving 100% original sound fidelity.',
    lead: 'Extracting audio from a video recording (such as an interview, lecture, or podcast) is one of the most common media tasks on the web. Incumbent "video to mp3" converters force an upload of the entire video file and transcode the audio to MP3, which takes minutes and degrades acoustic clarity through lossy compression. This tool copies the raw AAC audio elementary stream directly into an M4A container in milliseconds.',
    steps: [
      {
        name: 'Select video file',
        text: 'Choose an MP4 or MOV video file. The demuxer scans the track header to locate the audio elementary stream.',
      },
      {
        name: 'Choose extraction range',
        text: 'Optionally set start and end timestamps to extract audio from a specific segment, or leave blank to extract the full track.',
      },
      {
        name: 'Execute lossless extraction',
        text: 'Click Export Audio. The container surgery engine slices the raw AAC compressed packets and builds an M4A file structure.',
      },
      {
        name: 'Download M4A audio file',
        text: 'Download the standalone audio file immediately. The export finishes in milliseconds with zero quality loss.',
      },
    ],
    sections: [
      {
        heading: 'Why lossless M4A (AAC) beats lossy MP3 conversion',
        body: [
          'Virtually all modern digital video recordings (from smartphones, cameras, and web downloads) encode audio using Advanced Audio Coding (AAC) inside an MP4 container. Converting AAC to MP3 requires decoding the audio and compressing it again with an MP3 encoder, introducing generational compression loss, high-frequency cutoff, and phase smearing. By demuxing AAC directly into an .m4a container, our tool retains bit-for-bit identical audio quality while completing in milliseconds.',
        ],
      },
      {
        heading: 'Universal M4A audio playback compatibility',
        body: [
          'M4A is the standard audio container for the ISO Base Media File Format and is natively supported by Apple Music, iTunes, Spotify, VLC, Windows Media Player, Android, and all modern web browsers. It supports full metadata tagging, multi-channel stereo, and higher compression efficiency than MP3. Standalone M4A files import seamlessly into digital audio workstations, audio players, transcription engines, and smartphone voice memo libraries.',
        ],
      },
      {
        heading: 'Zero upload streaming architecture',
        body: [
          'Because the engine uses streaming ByteSource range requests, extracting an audio track downloads only the small audio packets without loading the multi-hundred-megabyte or gigabyte video stream into browser RAM. The operation completes in seconds even on resource-constrained laptops.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Why does this tool export .m4a instead of .mp3?',
        answer:
          'MP4 and MOV videos store audio as AAC. Saving as .m4a copies the AAC stream without re-encoding, preserving 100% original quality. Converting to MP3 would require a lossy re-compression pass.',
      },
      {
        question: 'Will M4A files play on my device?',
        answer:
          'Yes. M4A (AAC) is universally supported across iOS, Android, macOS, Windows, and all modern media players including VLC and Windows Media Player.',
      },
      {
        question: 'Can I extract audio from just a portion of the video?',
        answer:
          'Yes. Set start and end cut timestamps to extract audio from a specific clip interval without exporting the entire audio track.',
      },
      {
        question: 'Is there a file size limit?',
        answer:
          'Large videos are supported in the browser using streaming disk range slicing with zero memory exhaustion.',
      },
      {
        question: 'Is any audio or video uploaded to remote servers?',
        answer:
          'No. The extraction happens 100% client-side inside your browser tab under connect-src none Content Security Policies.',
      },
    ],
  },

  // /video/mute
  '/video/mute': {
    title: 'Mute Video Online — Remove Audio Track',
    description:
      'Remove sound from MP4 and MOV videos instantly without re-encoding. Produces clean, silent video clips with zero quality loss.',
    heading: 'About this video muting tool',
    directAnswer:
      'Select an MP4 or MOV video file up to 2 GB and click Mute Video. The audio track is omitted from the container header, outputting a clean, silent MP4 video in milliseconds with zero quality loss and no watermark.',
    lead: 'Removing background noise, wind rumble, or unwanted commentary from a video before sharing on social media typically requires importing the video into complex video editors or uploading to cloud converters that re-encode every frame. This tool performs instant container surgery: it reads the video track and writes a new container without the audio track atom. The video frames remain completely untouched.',
    steps: [
      {
        name: 'Select video with audio',
        text: 'Choose an MP4 or MOV video file. The demuxer verifies video and audio track allocations.',
      },
      {
        name: 'Optionally set clip range',
        text: 'Specify start and end cut points if you want to trim the silent clip simultaneously, or leave blank to mute the entire video.',
      },
      {
        name: 'Remove audio track',
        text: 'Click Mute Video. The engine packages the video stream into a new MP4 container while excluding the audio track.',
      },
      {
        name: 'Download muted video',
        text: 'Save the silent video file immediately. Export finishes in milliseconds with 100% original video resolution and bitrate.',
      },
    ],
    sections: [
      {
        heading: 'Why container surgery muting beats video re-encoding',
        body: [
          'Standard video editors mute video by decoding both picture and audio, stripping the audio waveform, and running the picture through an encoder again. Re-encoding 1080p or 4K video takes minutes, heats up your computer, and noticeably softens fine image textures. In contrast, our container muting engine simply omits the audio track box (trak) and handler (hdlr) from the movie header (moov). The compressed video frames in the media data box (mdat) are preserved byte-for-byte.',
        ],
      },
      {
        heading: 'Instant turnaround on social media clips',
        body: [
          'Whether you are preparing B-roll footage, silent product demos, or background website video headers, muting via container surgery takes under 100 milliseconds even on 4K clips. Because audio data is stripped, the output file size is slightly smaller than the original.',
        ],
      },
      {
        heading: 'Streaming zero-copy memory safety',
        body: [
          'Using our streaming ByteSource architecture, the tool processes large videos without buffering gigabytes of video frames into browser memory. Video packet ranges are assembled directly into a download Blob via zero-copy file slices.',
        ],
      },
      {
        heading: 'Container structure and media data decoupling',
        body: [
          'In the ISO Base Media File Format, audio and video samples reside inside the media data box (mdat), while track indexing tables reside in the movie box (moov). Muting a video does not require modifying or rewriting media data samples on disk; the engine simply builds a new movie atom that registers only the video track, allowing players to play the video track cleanly while ignoring audio bytes.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Does muting a video reduce its picture quality?',
        answer:
          'No. The video stream is copied byte-for-byte without re-encoding, so the picture quality is 100% identical to the source recording with zero degradation.',
      },
      {
        question: 'Can I trim the video while muting it?',
        answer:
          'Yes. Set start and end cut points to trim and mute the video in a single instant step, saving time and storage space.',
      },
      {
        question: 'Does the output file have a smaller file size?',
        answer:
          'Yes. Removing the audio track reduces the total file size by the exact size of the stripped audio bitstream, making downloads slightly smaller.',
      },
      {
        question: 'What video file formats are supported?',
        answer:
          'MP4 and MOV video containers are supported with instant zero-copy in-browser audio removal.',
      },
      {
        question: 'Are my private videos uploaded to any server?',
        answer:
          'Never. All processing executes 100% locally in your browser under strict connect-src none Content Security Policies with zero telemetry.',
      },
    ],
  },

  // /video/compress
  '/video/compress': {
    title: 'Compress Video Online — Reduce MP4 File Size',
    description:
      'Compress MP4 videos locally in your browser using hardware WebCodecs. Reduce file sizes with custom bitrates while preserving source audio tracks untouched.',
    heading: 'About this video compression tool',
    directAnswer:
      'Select an MP4 or MOV video file, choose a target size or quality preset (High, Medium, or Low), and click Compress Video. The video stream is re-encoded on your device using hardware-accelerated WebCodecs, while the source audio track is passed through untouched to preserve original sound fidelity without any cloud uploads or watermarks.',
    lead: 'Reducing video file sizes for email attachments, messaging apps, and web hosting traditionally forced a compromise between slow cloud upload queues and lossy audio degradation. This tool uses native WebCodecs VideoDecoder and VideoEncoder APIs directly within your browser tab to re-encode H.264 video at your chosen bitrate. Because processing runs on your local GPU or hardware media engine, compression finishes rapidly without sending a single byte across the internet.',
    steps: [
      {
        name: 'Select source video',
        text: 'Choose an MP4 or MOV file up to 2 GB. The demuxer reads the movie headers, calculates current video and audio bitrates, and verifies that the video track is encoded in H.264/AVC.',
      },
      {
        name: 'Choose compression mode',
        text: 'Select a quality preset or enter an explicit target file size in megabytes. The calculator estimates the required video bitrate while reserving bandwidth for the untouched audio track.',
      },
      {
        name: 'Hardware-accelerated re-encoding',
        text: 'Click Compress Video. WebCodecs decodes frames into GPU textures and re-encodes them through hardware H.264 pipelines with strict backpressure to prevent browser memory exhaustion.',
      },
      {
        name: 'Download optimized MP4',
        text: 'Save the compressed video file immediately. The tool packages the re-encoded video packets and untouched audio packets into a compliant MP4 container with updated duration headers.',
      },
    ],
    sections: [
      {
        heading: 'How WebCodecs hardware re-encoding works',
        body: [
          'Unlike older web video tools that rely on slow software WebAssembly builds of FFmpeg, this tool leverages modern browser WebCodecs APIs (VideoDecoder and VideoEncoder). WebCodecs interfaces directly with your system graphics hardware (Apple Silicon Media Engine, Intel Quick Sync, Nvidia NVENC, or AMD VCE) through the operating system. Raw video samples are decoded directly into VideoFrame objects and passed to the hardware encoder at precise bitrates. This delivers encoding speeds comparable to desktop editing software while executing entirely inside a standard browser sandbox.',
        ],
      },
      {
        heading: 'Untouched audio passthrough for flawless sound',
        body: [
          'Most online video compressors transcode both video and audio streams simultaneously, which wastes processing cycles and often introduces noticeable audio compression artifacts or synchronization drift. This tool isolates the audio track during demuxing and passes the original compressed audio packets (such as AAC or MP3) directly through into the output container without touching or re-encoding them. You get substantial video size reduction without sacrificing any acoustic fidelity or altering sound dynamics.',
        ],
      },
      {
        heading: 'Dynamic AVC profile and level selection',
        body: [
          'H.264 (AVC) encoders require a valid profile and level configuration string (for example, avc1.42001e for Baseline 3.0 up to avc1.640033 for High 5.1). Specifying an invalid or mismatched level causes hardware encoders to reject the configuration. Our encoding engine inspects the source video resolution and frame rate to automatically assign the appropriate AVC profile and level, ensuring maximum hardware compatibility and flawless playback across mobile devices, smart TVs, and legacy desktop media players.',
        ],
      },
      {
        heading: 'Bounded queue backpressure and memory safety',
        body: [
          'High-speed video decoding can rapidly flood browser memory if decoded frames accumulate faster than the hardware encoder can compress them. An unconstrained decode loop decoding 1080p frames at 60 fps would allocate gigabytes of uncompressed RGBA pixel buffers in seconds, crashing the browser tab. This engine implements backpressure monitoring via encoder.encodeQueueSize and the ondequeue callback. Decoding pauses whenever the queue exceeds 4 frames and resumes only when the hardware encoder has drained the backlog, keeping RAM usage strictly bounded.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Does compressing a video reduce its visual quality?',
        answer:
          'Compression works by lowering the video bitrate and discarding imperceptible high-frequency visual data. High preset preserves nearly all visual sharpness, while Low preset produces the smallest file size suitable for messaging and quick previews.',
      },
      {
        question: 'Why is audio quality completely preserved?',
        answer:
          'The tool extracts the original compressed audio bitstream (such as AAC) and packages it directly into the output MP4 container without re-encoding. This ensures 100% original audio fidelity, eliminates transcoding artifacts, and avoids audio drift.',
      },
      {
        question: 'Why are HEVC and AV1 videos not supported for compression?',
        answer:
          'Browsers provide mature hardware WebCodecs encoding support for H.264 (AVC). HEVC and AV1 encoding requires specialized licensing and hardware capabilities that are not universally exposed to browser sandboxes. We explicitly refuse HEVC and AV1 up front.',
      },
      {
        question: 'Will the compressed video have a watermark?',
        answer:
          'No. This tool never applies watermarks, brand logos, or visual overlays. The output is a clean, compliant MP4 file containing solely your own compressed video and original audio streams.',
      },
      {
        question: 'Are my video files uploaded to any external server?',
        answer:
          'No. All video decoding and encoding happens locally on your computer using hardware acceleration under strict Content Security Policies that prohibit external network requests.',
      },
    ],
  },

  // /video/resize
  '/video/resize': {
    title: 'Resize Video Online — Scale MP4 Resolution',
    description:
      'Resize and scale MP4 videos to 4K, 1080p, 720p, or 480p in your browser using WebCodecs hardware acceleration. Keeps audio untouched with zero cloud uploads.',
    heading: 'About this video resizing tool',
    directAnswer:
      'Select an MP4 or MOV video file, choose a target resolution preset (such as 1080p Full HD, 720p HD, 480p SD, or 50% scale), and click Resize Video. The video frames are decoded, scaled on a hardware canvas with aspect ratio preservation, and re-encoded via WebCodecs while the audio stream passes through untouched.',
    lead: 'Downscaling high-resolution video recordings for social media distribution, web embedding, or bandwidth-constrained playback typically requires heavy video editing software or privacy-compromising cloud converters. This tool scales your video frames directly on your local GPU using HTML Canvas and browser WebCodecs hardware acceleration. It ensures macroblock-compliant even pixel dimensions, preserves audio tracks byte-for-byte, and exports clean MP4 files without watermarks.',
    steps: [
      {
        name: 'Load original video',
        text: 'Select an MP4 or MOV video file up to 2 GB. The engine inspects container track headers to read the source display width, height, aspect ratio, and frame rate.',
      },
      {
        name: 'Select target resolution',
        text: 'Pick a resolution preset like 1080p, 720p, 480p, or 50% scale. The scaler computes proportional target dimensions, automatically rounding to even pixel counts required by H.264 macroblocks.',
      },
      {
        name: 'Hardware canvas scaling and encoding',
        text: 'Click Resize Video. Decoded frames are rendered onto an OffscreenCanvas with high-quality bicubic interpolation and fed directly into the hardware VideoEncoder with backpressure regulation.',
      },
      {
        name: 'Download resized MP4',
        text: 'Save the resized MP4 video. The newly generated visual sample entries (avc1 and avcC) and untouched audio packets are packaged into an updated MP4 container.',
      },
    ],
    sections: [
      {
        heading: 'Aspect ratio preservation and macroblock alignment',
        body: [
          'Video compression standards like H.264 divide pictures into 16x16 pixel macroblocks. If a video is resized to an odd pixel dimension (such as 721 pixels wide), hardware encoders will either fail immediately with configuration errors or introduce green distortion bars along the edges. Our scaling engine calculates proportional dimensions that strictly preserve your source aspect ratio while snapping both width and height to the nearest even integer, guaranteeing clean hardware encoding and universal player compatibility.',
        ],
      },
      {
        heading: 'GPU-accelerated canvas interpolation',
        body: [
          'Resizing video frames without blurring or aliasing requires high-quality image filtering. The engine renders decoded video frames onto an internal canvas context configured for smooth image smoothing. Downscaling 4K drone or camera footage to 1080p or 720p preserves sharp edges and fine image details without the jagged artifacts common in nearest-neighbor scaling algorithms, all while computing on your device graphics hardware.',
        ],
      },
      {
        heading: 'Untouched audio passthrough without re-encoding',
        body: [
          'Changing the visual resolution of a video should never impact its audio clarity. Rather than decoding and re-compressing the soundtrack, this tool leaves the source audio stream completely untouched. AAC or MP3 audio packets are extracted directly from the input container and multiplexed into the output MP4 alongside the resized video frames. This prevents any audio generation loss, eliminates audio-video desynchronization, and cuts processing time significantly.',
        ],
      },
      {
        heading: 'Dynamic AVC level management for standard and HD video',
        body: [
          'Different video resolutions require different H.264 profile and level constraints to ensure hardware decoders can allocate sufficient buffer memory. Scaling a 4K video down to 720p or 480p allows the encoder to use more efficient AVC levels (such as Baseline 3.1 or 3.0), drastically improving playback compatibility on older mobile hardware and low-power devices. The engine handles this parameter mapping dynamically based on target frame geometry.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question: 'Does resizing a video change its aspect ratio?',
        answer:
          'No. The tool automatically computes proportional dimensions to match your original aspect ratio so subjects are never stretched, squished, or distorted.',
      },
      {
        question: 'Why does the output video use even pixel dimensions?',
        answer:
          'H.264 compression processes pixels in 16x16 macroblock grids. Specifying odd dimensions causes encoder errors or visual glitches; snapping to even numbers ensures universal compatibility.',
      },
      {
        question: 'Can I upscale low-resolution video to 4K?',
        answer:
          'Yes, you can select higher resolution presets. However, upscaling increases file size without inventing new visual detail; resizing is most effective for downscaling large videos.',
      },
      {
        question: 'Is there any watermark on the exported video?',
        answer:
          'No. We believe your video belongs entirely to you. Output files contain no watermarks, timestamps, or promotional overlays of any kind.',
      },
      {
        question: 'Are my video files uploaded to any servers during resizing?',
        answer:
          'Never. All processing runs entirely inside your browser using client-side WebCodecs and canvas APIs under strict connect-src none Content Security Policies.',
      },
    ],
  },

  // /video/crop
  '/video/crop': {
    title: 'Crop Video Online — Change MP4 Aspect Ratio',
    description:
      'Crop MP4 videos to 1:1, 9:16, 4:5, or 16:9 aspect ratios right in your browser. Hardware-accelerated canvas cropping with zero cloud uploads and no watermarks.',
    heading: 'About this video cropping tool',
    directAnswer:
      'Select an MP4 or MOV video file, pick an aspect ratio preset (1:1 Square, 9:16 Vertical Story/Reel, 4:5 Portrait, or 16:9 Landscape) or enter custom crop dimensions, and click Crop Video. The video is cropped and re-encoded using browser WebCodecs hardware acceleration, with original audio passed through untouched.',
    lead: 'Adapting horizontal video recordings for vertical social platforms like Instagram Reels, TikTok, and YouTube Shorts often forces creators to upload private videos to third-party web services that add watermarks or re-compress audio. This tool performs precision video cropping inside your browser using GPU-backed canvas viewport slicing and WebCodecs hardware encoding. The picture is cropped to your exact framing while preserving the original audio track without any loss.',
    steps: [
      {
        name: 'Select input video',
        text: 'Choose an MP4 or MOV video file up to 2 GB. The demuxer reads track geometry, display matrix flags, and audio configurations from the movie atom.',
      },
      {
        name: 'Choose target aspect ratio',
        text: 'Select a social media preset (such as 1:1, 9:16, 4:5, or 16:9) or adjust width, height, and offset coordinates. The tool centers the crop box or lets you position it precisely.',
      },
      {
        name: 'Hardware canvas cropping and re-encoding',
        text: 'Click Crop Video. Each video frame is drawn to a canvas at the specified sub-rectangle offset and piped directly to the hardware VideoEncoder with backpressure control.',
      },
      {
        name: 'Export cropped MP4',
        text: 'Save the cropped MP4 video to your drive. The tool constructs fresh visual sample descriptions (stsd/avc1/avcC) and multiplexes the re-encoded frames with the original audio.',
      },
    ],
    sections: [
      {
        heading: 'Canvas viewport clipping and spatial offsets',
        body: [
          'Cropping video requires redefining the spatial boundaries of each frame. Rather than masking pixels with black letterboxing bars, our engine extracts the exact sub-region you specify. By drawing the source frame to an internal canvas using source coordinates (sx, sy, sw, sh) mapped to destination coordinates (0, 0, dw, dh), unwanted edges are completely discarded. The resulting video file contains only the cropped visual area, reducing unnecessary data overhead.',
        ],
      },
      {
        heading: 'Optimized for vertical and square social formats',
        body: [
          'Converting standard 16:9 landscape video into 9:16 vertical video for mobile stories or 1:1 square for feed posts is seamless. Presets automatically compute the maximum centered crop area that fits within your source video bounds while ensuring even pixel dimensions for H.264 macroblock compliance. You can also fine-tune the horizontal and vertical offsets to keep key subjects centered in frame.',
        ],
      },
      {
        heading: 'Preserving original audio fidelity',
        body: [
          'Cropping modifies only visual pixel geometry, so re-encoding the audio track would be completely counterproductive. Our engine demuxes the original compressed audio packets (such as AAC) and passes them directly through into the output container without decoding or transcoding. Your dialogue, soundtrack, and ambient audio retain their full original clarity without generational loss or sync drift.',
        ],
      },
      {
        heading: 'Hardware-accelerated encoding with backpressure regulation',
        body: [
          'Processing thousands of high-definition video frames requires careful resource management. By pairing native WebCodecs VideoDecoder with hardware-accelerated VideoEncoder and throttling frame delivery via encoder.encodeQueueSize, this tool prevents browser memory spikes. You get smooth, responsive video processing that runs directly on your local GPU without heating up your computer or crashing the browser tab.',
        ],
      },
      {
        heading: 'Zero upload security guarantee',
        body: [SEALED_PAGE, NO_NETWORK_CODE],
      },
      {
        heading: 'Client-side processing limits',
        body: [LOCAL_EXECUTION_ENGINE],
      },
    ],
    faqs: [
      {
        question:
          'Can I convert horizontal 16:9 video to vertical 9:16 for Reels or TikTok?',
        answer:
          'Yes. Selecting the 9:16 vertical preset automatically frames the center of your landscape video into portrait format, perfect for Instagram Reels, YouTube Shorts, and TikTok.',
      },
      {
        question: 'Does cropping video re-encode the audio?',
        answer:
          'No. The audio stream is extracted and multiplexed directly into the new MP4 container without re-encoding, preserving 100% original audio fidelity with zero sync drift.',
      },
      {
        question: 'Can I adjust the crop position so subjects stay centered?',
        answer:
          'Yes. In addition to preset aspect ratios, you can adjust the X and Y offset coordinates to reposition the crop window over the most important part of your frame.',
      },
      {
        question: 'Will there be any watermark on the cropped video?',
        answer:
          'No. Output video files are completely clean with zero watermarks, logos, or restrictions. The content remains entirely yours.',
      },
      {
        question: 'Are video frames uploaded to a server during cropping?',
        answer:
          'No. The entire cropping and re-encoding process runs locally on your device within your browser tab under strict Content Security Policies.',
      },
    ],
  },
};
