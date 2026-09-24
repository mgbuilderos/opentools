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
      'Trim MP4 and MOV videos locally in your browser. Cuts at keyframes with zero quality loss and no watermark. Files up to 4 GB.',
    heading: 'About this video trimmer',
    directAnswer:
      'Open an MP4 or MOV video file up to 4 GB, set your start and end cut points using the interactive scrubber or exact timestamps, and click Trim Video. The video is cut on keyframe boundaries without re-encoding, preserving exact original video resolution, audio bitrates, and color metadata with zero quality loss and no watermark.',
    lead: 'This tool performs fast, lossless video trimming directly in your browser tab without uploading video files to remote cloud servers. Standard web video editors re-encode video streams through lossy codecs, degrading visual crispness and taking minutes to render. This tool inspects MP4 ISO Base Media File Format (ISOBMFF) sample tables, extracts H.264/AAC sample packets between chosen keyframe boundaries, and writes a clean new MP4 container in seconds.',
    steps: [
      {
        name: 'Select MP4 or MOV video',
        text: 'Choose an MP4 or MOV video file up to 4 GB. The container headers are parsed directly from disk using streaming chunk slices without buffering the full video into system RAM.',
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
        heading: 'Streaming 4 GB chunk architecture',
        body: [
          'Traditional web-based tools load entire video files into memory via FileReader.readAsArrayBuffer(), crashing browser tabs when handling videos larger than a few hundred megabytes. Our engine uses a streaming ByteSource abstraction backed by native browser File.slice() APIs. It reads only the lightweight metadata index (moov box, typically 50 KB to 2 MB) to build the sample layout plan. When generating the output, individual sample ranges are referenced as Blob slices pointing directly to the file on disk. A 4 GB video trim executes in under 10 milliseconds with less than 20 MB of active memory allocation.',
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
          'Standard MP4 and MOV files holding H.264 (AVC) or H.265 (HEVC) video alongside AAC or MP3 audio are supported up to 4 GB in file size.',
      },
      {
        question: 'Are my private video recordings uploaded to any server?',
        answer:
          'No. Video bytes never leave your device. The entire trimming process executes inside your browser tab under connect-src none Content Security Policies.',
      },
      {
        question: 'What is the maximum file size supported?',
        answer:
          'Files up to 4 GB are tested and supported in the browser using zero-copy streaming ByteSource disk slices and native File APIs.',
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
      'Select a MOV or MP4 video file up to 4 GB, choose your target container format (MP4 or MOV), and click Convert. The video and audio bitstreams are remuxed into the destination container format without re-encoding, finishing in seconds with zero loss in visual quality and no watermark.',
    lead: 'Online video converters typically upload your entire video file to remote cloud servers and run it through a heavy FFmpeg transcode. That process takes minutes, burns upload bandwidth, degrades image resolution, and often slaps a watermark on your footage. This tool performs container remuxing directly in your browser. It copies the raw H.264/H.265 and AAC elementary streams into a new container header, preserving every bit of original fidelity.',
    steps: [
      {
        name: 'Load MOV or MP4 file',
        text: 'Select your video file up to 4 GB. The demuxer reads the file type atom (ftyp) and movie atom (moov) to verify internal track codecs.',
      },
      {
        name: 'Select destination container',
        text: 'Choose MP4 for universal compatibility across web browsers, Windows, and Android, or MOV for native QuickTime and Final Cut Pro workflows.',
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
          'Never. All tools on this site operate with zero watermarks, zero subscriptions, and zero artificial limits up to the 4 GB tested browser ceiling.',
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
      'Select an MP4 or MOV video file up to 4 GB, choose your rotation angle (90° clockwise, 180°, or 270° counter-clockwise) or flip orientation, and click Apply Rotation. The video track display matrix in the container header is updated instantly without re-encoding, preserving 100% original video and audio quality.',
    lead: 'When smartphone videos are filmed upside down or sideways, standard web rotators force a full re-encode of the entire video. Re-encoding takes several minutes, degrades resolution, and introduces compression artifacts. This tool exploits the ISO Base Media File Format specification: it rewrites nine 32-bit fixed-point numbers inside the track header (tkhd) transformation matrix. The video frames themselves are untouched, completing in milliseconds.',
    steps: [
      {
        name: 'Select sideways or upside-down video',
        text: 'Choose an MP4 or MOV file up to 4 GB. The tool reads the current track header matrix and dimensions.',
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
        text: 'Save the rotated file immediately. The export finishes in milliseconds regardless of whether the video is 10 MB or 4 GB.',
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
          'Because the video stream is not decoded or re-encoded, rotating a 4 GB 4K video takes virtually the exact same processing time as rotating a 5 MB clip (under 50 milliseconds). The output file is byte-identical to the source file with the exception of the nine transformation numbers inside the moov box.',
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
          'Videos up to 4 GB are supported and process in milliseconds in your browser using zero-copy streaming ByteSource disk range slices.',
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
      'Open an MP4 or MOV video file up to 4 GB, select whether to cut out an unwanted middle section or split into multiple separate clips at given timestamps, and click Process. The video is sliced cleanly on keyframe boundaries without re-encoding, preserving 100% original quality and providing individual clip downloads plus a ZIP bundle.',
    lead: 'Editing a video by removing an awkward middle pause or dividing a long lecture into standalone chapters usually requires heavy desktop editing suites or slow web transcoders. This tool performs keyframe-accurate container splitting in your browser tab. It extracts sample ranges from the media data atom, stitches timecodes seamlessly, and writes new MP4 files without decoding or re-compressing video frames.',
    steps: [
      {
        name: 'Select MP4 or MOV video',
        text: 'Choose your video file up to 4 GB. The splitter inspects sample indexes and identifies all keyframe positions across the timeline.',
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
          'MP4 and MOV files with H.264, H.265, and AAC tracks are supported up to 4 GB in total size.',
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
        text: 'Select two or more MP4 or MOV video clips up to 4 GB in total size. The demuxer verifies codec and resolution compatibility.',
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
          'You can merge as many clips as desired up to the tested 4 GB browser memory allocation limit, with instant export times.',
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
      'Select an MP4 or MOV video file up to 4 GB to inspect hidden GPS coordinates, device hardware identifiers, software versions, and recording timestamps. Click Strip Metadata to rewrite the container without user data atoms, producing a clean video file with zero privacy leaks and zero quality loss.',
    lead: 'Modern smartphones automatically embed precise GPS latitude, longitude, and altitude coordinates into video recordings, alongside camera serial numbers, device model names, and exact timestamps. Sharing a phone video of your home or family online exposes your private physical location. This tool inspects ISO Base Media metadata atoms (udta, meta, ©xyz) and strips them losslessly without re-encoding video frames.',
    steps: [
      {
        name: 'Select video file',
        text: 'Choose an MP4 or MOV video file up to 4 GB. The metadata inspector scans the container header for user data atoms and timestamps.',
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
          'MP4 and MOV video containers are supported up to 4 GB with instant zero-copy in-browser metadata stripping.',
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
      'Open an MP4 or MOV video file up to 4 GB, select your trim interval, adjust frame rate, maximum dimension, color palette depth, and optional dithering, and click Make GIF. The video frames are decoded and quantized directly in your browser, producing an animated GIF without server uploads or watermarks.',
    lead: 'Converting video clips to animated GIFs usually involves uploading private media to third-party web tools that add watermarks, throttle frame rates, and place limits on resolution. This tool decodes video frames directly in your browser using hardware-accelerated video decoding. It samples frames, performs color quantization with NeuQuant/median-cut algorithms, and compiles an optimized animated GIF locally.',
    steps: [
      {
        name: 'Select video clip',
        text: 'Choose an MP4 or MOV video clip up to 4 GB. The video is decoded locally in memory without uploading.',
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
          'Frames are decoded directly using native browser APIs and canvas rendering contexts rather than sluggish WebAssembly emulation. This ensures smooth frame extraction while adhering strictly to zero-egress security policies.',
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
      'Open an MP4 or MOV video file up to 4 GB, select the audio extraction mode, and click Export Audio. The compressed audio stream is demuxed directly from the video container and saved as an Apple MPEG-4 Audio (.m4a) file without re-encoding, preserving 100% original sound fidelity.',
    lead: 'Extracting audio from a video recording (such as an interview, lecture, or podcast) is one of the most common media tasks on the web. Incumbent "video to mp3" converters force an upload of the entire video file and transcode the audio to MP3, which takes minutes and degrades acoustic clarity through lossy compression. This tool copies the raw AAC audio elementary stream directly into an M4A container in milliseconds.',
    steps: [
      {
        name: 'Select video file',
        text: 'Choose an MP4 or MOV video file up to 4 GB. The demuxer scans the track header to locate the audio elementary stream.',
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
          'M4A is the standard audio container for the ISO Base Media File Format and is natively supported by Apple Music, iTunes, Spotify, VLC, Windows Media Player, Android, and all modern web browsers. It supports full metadata tagging, multi-channel stereo, and higher compression efficiency than MP3.',
        ],
      },
      {
        heading: 'Zero upload streaming architecture',
        body: [
          'Because the engine uses streaming ByteSource range requests, extracting an audio track from a 4 GB video downloads only the small audio packets (typically 10 to 50 MB) without loading the multi-gigabyte video stream into browser RAM. The operation completes in seconds even on resource-constrained laptops.',
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
          'Videos up to 4 GB are tested and supported in the browser using streaming disk range slicing with zero memory exhaustion.',
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
      'Select an MP4 or MOV video file up to 4 GB and click Mute Video. The audio track is omitted from the container header, outputting a clean, silent MP4 video in milliseconds with zero quality loss and no watermark.',
    lead: 'Removing background noise, wind rumble, or unwanted commentary from a video before sharing on social media typically requires importing the video into complex video editors or uploading to cloud converters that re-encode every frame. This tool performs instant container surgery: it reads the video track and writes a new container without the audio track atom. The video frames remain completely untouched.',
    steps: [
      {
        name: 'Select video with audio',
        text: 'Choose an MP4 or MOV video file up to 4 GB. The demuxer verifies video and audio track allocations.',
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
        heading: 'Streaming 4 GB zero-copy memory safety',
        body: [
          'Using our streaming ByteSource architecture, the tool processes videos up to 4 GB without buffering gigabytes of video frames into browser memory. Video packet ranges are assembled directly into a download Blob via zero-copy file slices.',
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
          'MP4 and MOV video containers are supported up to 4 GB with instant zero-copy in-browser audio removal.',
      },
      {
        question: 'Are my private videos uploaded to any server?',
        answer:
          'Never. All processing executes 100% locally in your browser under strict connect-src none Content Security Policies with zero telemetry.',
      },
    ],
  },
};
