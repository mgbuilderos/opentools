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
      'Trim, mute and extract audio from MP4 and MOV without re-encoding.',
    destinations: [
      {
        id: 'video-trim',
        name: 'Video trimmer',
        description:
          'Cut, mute or extract the audio from an MP4 or MOV without re-encoding it.',
        href: '/video/trim',
        workspaceId: 'video-trim',
      },
    ],
  },
];
