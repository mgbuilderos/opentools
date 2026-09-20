// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'audio',
    title: 'Audio',
    description:
      'Cut, join and tag MP3s without re-encoding, and convert other audio to WAV.',
    destinations: [
      {
        id: 'mp3-toolkit:mp3-cut',
        name: 'MP3 cutter',
        description:
          'Trim a clip out of an MP3 on frame boundaries, with no re-encoding.',
        href: '/audio/mp3-toolkit?tool=mp3-cut',
        workspaceId: 'mp3-toolkit',
      },
      {
        id: 'mp3-toolkit:mp3-join',
        name: 'MP3 joiner',
        description:
          'Join MP3s that share a sample rate and channel count, end to end.',
        href: '/audio/mp3-toolkit?tool=mp3-join',
        workspaceId: 'mp3-toolkit',
      },
      {
        id: 'mp3-toolkit:mp3-tags',
        name: 'MP3 tag editor',
        description:
          'Read, replace or remove ID3 tags without touching the audio.',
        href: '/audio/mp3-toolkit?tool=mp3-tags',
        workspaceId: 'mp3-toolkit',
      },
      {
        id: 'mp3-toolkit:mp3-inspect',
        name: 'MP3 inspector',
        description:
          'Measure bitrate, sample rate, frame count and tags in an MP3.',
        href: '/audio/mp3-toolkit?tool=mp3-inspect',
        workspaceId: 'mp3-toolkit',
      },
      {
        id: 'audio-convert',
        name: 'Audio to WAV converter',
        description:
          'Convert M4A, FLAC, OGG, AIFF or MP3 to WAV, with trimming, fades and levelling.',
        href: '/audio/convert',
        workspaceId: 'audio-convert',
      },
    ],
  },
];
