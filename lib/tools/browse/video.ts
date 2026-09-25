// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
//
// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'video',
    title: 'Video',
    description:
      'Trim, convert, rotate, split, merge, and clean MP4 and MOV videos without re-encoding.',
    destinations: [
      {
        id: 'video-trim',
        name: 'Video trimmer',
        description:
          'Cut, mute or extract the audio from an MP4 or MOV without re-encoding it.',
        href: '/video/trim',
        workspaceId: 'video-trim',
      },
      {
        id: 'video-convert',
        name: 'Video converter',
        description:
          'Convert MOV to MP4 and MP4 to MOV without re-encoding video or audio frames.',
        href: '/video/convert',
        workspaceId: 'video-convert',
      },
      {
        id: 'video-rotate',
        name: 'Video rotator',
        description:
          'Rotate (90°, 180°, 270°) and flip MP4/MOV videos instantly without quality loss.',
        href: '/video/rotate',
        workspaceId: 'video-rotate',
      },
      {
        id: 'video-split',
        name: 'Video splitter',
        description:
          'Cut out middle sections or split videos into multiple downloadable clips.',
        href: '/video/split',
        workspaceId: 'video-split',
      },
      {
        id: 'video-merge',
        name: 'Video joiner',
        description:
          'Join matching MP4 and MOV video clips end-to-end without quality loss.',
        href: '/video/merge',
        workspaceId: 'video-merge',
      },
      {
        id: 'video-metadata',
        name: 'Video metadata scrubber',
        description:
          'Inspect and strip GPS coordinates, device models, and timestamps from MP4/MOV.',
        href: '/video/metadata',
        workspaceId: 'video-metadata',
      },
      {
        id: 'video-to-gif',
        name: 'Video to GIF converter',
        description:
          'Convert MP4 or MOV clips into animated GIFs with custom speed and resolution.',
        href: '/video/to-gif',
        workspaceId: 'video-to-gif',
      },
      {
        id: 'video-extract-audio',
        name: 'Extract audio from video',
        description:
          'Extract lossless AAC audio (.m4a) from MP4 or MOV videos without re-encoding.',
        href: '/video/extract-audio',
        workspaceId: 'video-extract-audio',
      },
      {
        id: 'video-mute',
        name: 'Mute video',
        description:
          'Remove audio track from MP4 or MOV videos instantly without re-encoding.',
        href: '/video/mute',
        workspaceId: 'video-mute',
      },
      {
        id: 'video-compress',
        name: 'Compress video',
        description:
          'Compress MP4 videos with custom bitrates and quality presets via hardware WebCodecs.',
        href: '/video/compress',
        workspaceId: 'video-compress',
      },
      {
        id: 'video-resize',
        name: 'Resize video',
        description:
          'Resize and downscale MP4 video resolution with aspect ratio preservation and untouched audio.',
        href: '/video/resize',
        workspaceId: 'video-resize',
      },
      {
        id: 'video-crop',
        name: 'Crop video',
        description:
          'Crop MP4 videos to 1:1, 9:16, 4:5, or 16:9 aspect ratios using GPU canvas slicing.',
        href: '/video/crop',
        workspaceId: 'video-crop',
      },
    ],
  },
];
