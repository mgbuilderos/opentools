// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'creator',
    title: 'Creator & social',
    description: 'Captions, subtitles, thumbnails, and social formats.',
    destinations: [
      {
        id: 'subtitle-workbench:subtitle-to-srt',
        name: 'Convert subtitles to SubRip (.srt)',
        description:
          'Turn a WebVTT, SBV, LRC or SubStation file into the .srt format almost every player accepts.',
        href: '/subtitles/workbench?tool=subtitle-to-srt',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-to-vtt',
        name: 'Convert subtitles to WebVTT (.vtt)',
        description:
          'Turn an .srt or other subtitle file into the WebVTT format the HTML video element needs.',
        href: '/subtitles/workbench?tool=subtitle-to-vtt',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-to-sbv',
        name: 'Convert subtitles to YouTube SBV (.sbv)',
        description:
          'Produce the .sbv format YouTube Studio accepts for uploads.',
        href: '/subtitles/workbench?tool=subtitle-to-sbv',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-to-lrc',
        name: 'Convert subtitles to LRC lyrics (.lrc)',
        description:
          'Produce a timed lyrics file for music players from any subtitle file.',
        href: '/subtitles/workbench?tool=subtitle-to-lrc',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-to-text',
        name: 'Subtitles to a plain transcript',
        description:
          'Strip the numbering and timings and keep only what is said, as readable text.',
        href: '/subtitles/workbench?tool=subtitle-to-text',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-shift',
        name: 'Shift subtitle timing',
        description:
          'Move every subtitle earlier or later by the same amount, when they run consistently ahead or behind.',
        href: '/subtitles/workbench?tool=subtitle-shift',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-sync',
        name: 'Sync subtitles to two known moments',
        description:
          'Fix subtitles that start about right but drift further out as the video goes on, by giving the true time of the first and last line.',
        href: '/subtitles/workbench?tool=subtitle-sync',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-framerate',
        name: 'Convert subtitle frame rate',
        description:
          'Retime a file made for one frame rate so it matches a video at another — the usual cause of subtitles that slip by seconds over an hour.',
        href: '/subtitles/workbench?tool=subtitle-framerate',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-speed',
        name: 'Retime subtitles for a speed change',
        description:
          'Match subtitles to a video that was sped up or slowed down, such as a 1.25× re-export.',
        href: '/subtitles/workbench?tool=subtitle-speed',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-merge',
        name: 'Join two subtitle files',
        description:
          'Put a second subtitle file after the first, for a video assembled from two parts.',
        href: '/subtitles/workbench?tool=subtitle-merge',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-split',
        name: 'Split a subtitle file in two',
        description:
          'Take the part before or after a moment, for a video that was cut into two files.',
        href: '/subtitles/workbench?tool=subtitle-split',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-trim',
        name: 'Keep only part of a subtitle file',
        description:
          'Keep the subtitles inside a time range and drop the rest, for a clip taken out of a longer video.',
        href: '/subtitles/workbench?tool=subtitle-trim',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-clean',
        name: 'Clean up a subtitle file',
        description:
          'Remove formatting tags, drop empty cues, pull apart overlapping lines and renumber — the usual repair for auto-generated captions.',
        href: '/subtitles/workbench?tool=subtitle-clean',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'subtitle-workbench:subtitle-check',
        name: 'Check subtitles for problems',
        description:
          'Report overlaps, out-of-order cues, lines that are too long and text that goes past too fast to read.',
        href: '/subtitles/workbench?tool=subtitle-check',
        workspaceId: 'subtitle-workbench',
      },
      {
        id: 'creator-workbench:youtube-chapter-generator',
        name: 'YouTube chapter generator',
        description:
          'Validate ascending chapter timestamps and normalize a paste-ready chapter list.',
        href: '/creator/workbench?tool=youtube-chapter-generator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:youtube-timestamp-formatter',
        name: 'YouTube timestamp formatter',
        description:
          'Convert second counts to H:MM:SS timestamps with optional labels.',
        href: '/creator/workbench?tool=youtube-timestamp-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:youtube-tag-workspace',
        name: 'YouTube tag workspace',
        description:
          'Trim, deduplicate, and count comma/newline-separated tags.',
        href: '/creator/workbench?tool=youtube-tag-workspace',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:youtube-description-template',
        name: 'YouTube description template',
        description:
          'Build a structured description from summary, links, and chapters.',
        href: '/creator/workbench?tool=youtube-description-template',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:youtube-title-length-checker',
        name: 'YouTube title-length checker',
        description:
          'Count Unicode characters against a user-selected title limit.',
        href: '/creator/workbench?tool=youtube-title-length-checker',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:instagram-caption-formatter',
        name: 'Instagram caption formatter',
        description:
          'Normalize caption spacing and report characters, words, and hashtags.',
        href: '/creator/workbench?tool=instagram-caption-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:instagram-bio-formatter',
        name: 'Instagram bio formatter',
        description:
          'Normalize a compact multi-line bio and report its character count.',
        href: '/creator/workbench?tool=instagram-bio-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:instagram-hashtag-workspace',
        name: 'Instagram hashtag workspace',
        description:
          'Normalize, deduplicate, and count hashtags without recommending trends.',
        href: '/creator/workbench?tool=instagram-hashtag-workspace',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:linkedin-post-formatter',
        name: 'LinkedIn post formatter',
        description:
          'Normalize paragraph spacing and report post length against your chosen limit.',
        href: '/creator/workbench?tool=linkedin-post-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:x-post-character-counter',
        name: 'X post character counter',
        description:
          'Count Unicode characters against a user-provided post limit; URL weighting is not simulated.',
        href: '/creator/workbench?tool=x-post-character-counter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:x-thread-formatter',
        name: 'X thread formatter',
        description:
          'Pack paragraphs into numbered posts under a user-provided simple character limit.',
        href: '/creator/workbench?tool=x-thread-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:facebook-post-formatter',
        name: 'Facebook post formatter',
        description:
          'Normalize whitespace and report transparent character and word counts.',
        href: '/creator/workbench?tool=facebook-post-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:tiktok-caption-formatter',
        name: 'TikTok caption formatter',
        description:
          'Normalize caption spacing and report length against your chosen limit.',
        href: '/creator/workbench?tool=tiktok-caption-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:podcast-show-notes-template',
        name: 'Podcast show-notes template',
        description:
          'Build Markdown show notes from episode, summary, takeaways, and links.',
        href: '/creator/workbench?tool=podcast-show-notes-template',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:podcast-chapter-generator',
        name: 'Podcast chapter generator',
        description:
          'Validate and normalize timestamped podcast chapter lines.',
        href: '/creator/workbench?tool=podcast-chapter-generator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:newsletter-template-builder',
        name: 'Newsletter template builder',
        description:
          'Build a focused Markdown newsletter skeleton from supplied sections.',
        href: '/creator/workbench?tool=newsletter-template-builder',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:substack-draft-formatter',
        name: 'Substack draft formatter',
        description: 'Add clean Markdown title/subtitle structure to a draft.',
        href: '/creator/workbench?tool=substack-draft-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:medium-draft-formatter',
        name: 'Medium draft formatter',
        description: 'Normalize a title, subtitle, and Markdown article body.',
        href: '/creator/workbench?tool=medium-draft-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:dev-to-front-matter-generator',
        name: 'DEV.to front-matter generator',
        description:
          'Generate escaped YAML front matter for a DEV Community draft.',
        href: '/creator/workbench?tool=dev-to-front-matter-generator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:hashnode-front-matter-generator',
        name: 'Hashnode front-matter generator',
        description:
          'Generate portable escaped YAML-style front matter for a Hashnode draft.',
        href: '/creator/workbench?tool=hashnode-front-matter-generator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:rss-feed-builder',
        name: 'RSS feed builder',
        description:
          'Build a minimal escaped RSS 2.0 document from channel and item lines.',
        href: '/creator/workbench?tool=rss-feed-builder',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:rss-feed-validator',
        name: 'RSS feed validator',
        description:
          'Check XML-shaped RSS source for required channel and item fields; no remote schema is fetched.',
        href: '/creator/workbench?tool=rss-feed-validator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:social-share-preview',
        name: 'Social share preview',
        description:
          'Create a platform-neutral text preview and transparent length report.',
        href: '/creator/workbench?tool=social-share-preview',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:link-in-bio-page-exporter',
        name: 'Link-in-bio page exporter',
        description:
          'Export a small escaped, responsive HTML page from label and URL pairs.',
        href: '/creator/workbench?tool=link-in-bio-page-exporter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:creator-media-kit-generator',
        name: 'Creator media-kit generator',
        description:
          'Build a concise Markdown media kit from supplied facts and metrics.',
        href: '/creator/workbench?tool=creator-media-kit-generator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:rate-card-generator',
        name: 'Rate-card generator',
        description:
          'Build an explicit Markdown rate card without inventing market prices.',
        href: '/creator/workbench?tool=rate-card-generator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:sponsorship-cpm-calculator',
        name: 'Sponsorship CPM calculator',
        description:
          'Calculate sponsorship cost per thousand delivered views or impressions.',
        href: '/creator/workbench?tool=sponsorship-cpm-calculator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:engagement-rate-calculator',
        name: 'Engagement-rate calculator',
        description:
          'Calculate supplied engagements divided by reach or followers.',
        href: '/creator/workbench?tool=engagement-rate-calculator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:follower-growth-calculator',
        name: 'Follower-growth calculator',
        description:
          'Calculate net and percentage growth between two audience counts.',
        href: '/creator/workbench?tool=follower-growth-calculator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:content-calendar-maker',
        name: 'Content-calendar maker',
        description: 'Validate and sort dated platform/topic entries.',
        href: '/creator/workbench?tool=content-calendar-maker',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:content-idea-matrix',
        name: 'Content-idea matrix',
        description:
          'Cross supplied audience needs with content pillars to create an idea grid.',
        href: '/creator/workbench?tool=content-idea-matrix',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:hook-generator-workspace',
        name: 'Hook generator workspace',
        description:
          'Generate transparent fill-in-the-topic hook patterns without an AI model.',
        href: '/creator/workbench?tool=hook-generator-workspace',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:caption-line-breaker',
        name: 'Caption line breaker',
        description:
          'Wrap text near a chosen width while preserving paragraph boundaries.',
        href: '/creator/workbench?tool=caption-line-breaker',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:hashtag-deduplicator',
        name: 'Hashtag deduplicator',
        description: 'Normalize and deduplicate hashtags case-insensitively.',
        href: '/creator/workbench?tool=hashtag-deduplicator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:brand-name-shortlister',
        name: 'Brand-name shortlister',
        description:
          'Score supplied names using explicit length, word-count, and character rules.',
        href: '/creator/workbench?tool=brand-name-shortlister',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:brand-palette-generator',
        name: 'Brand-palette generator',
        description:
          'Generate a deterministic five-color HSL palette from a name.',
        href: '/creator/workbench?tool=brand-palette-generator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:brand-font-pairing-notes',
        name: 'Brand font-pairing notes',
        description:
          'Create a decision note from user-selected generic font roles; no fonts are downloaded.',
        href: '/creator/workbench?tool=brand-font-pairing-notes',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:creator-file-naming-tool',
        name: 'Creator file-naming tool',
        description:
          'Generate portable, sortable filenames from date, project, asset, and version.',
        href: '/creator/workbench?tool=creator-file-naming-tool',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:audio-trimmer',
        name: 'Audio trimmer & cutter',
        description:
          'Trim start/end timestamps, adjust gain, and apply anti-pop crossfades.',
        href: '/creator/workbench?tool=audio-trimmer',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:subtitle-converter',
        name: 'Subtitle converter (SRT ⇄ VTT)',
        description:
          'Convert between SubRip (.srt) and WebVTT (.vtt) with timestamp offset shifting.',
        href: '/creator/workbench?tool=subtitle-converter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:svg-to-react',
        name: 'SVG to React (JSX/TSX) converter',
        description:
          'Transform raw SVG markup into clean, production-ready React JSX or TypeScript TSX components.',
        href: '/creator/workbench?tool=svg-to-react',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:css-glassmorphism',
        name: 'CSS Glassmorphism & Neumorphism generator',
        description:
          'Generate modern frosted glass and soft UI styling with live CSS and Tailwind CSS classes.',
        href: '/creator/workbench?tool=css-glassmorphism',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:css-box-shadow',
        name: 'CSS box-shadow builder',
        description:
          'Create layered, modern box-shadow effects with ready-to-use CSS declarations and Tailwind presets.',
        href: '/creator/workbench?tool=css-box-shadow',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:px-to-rem',
        name: 'Pixel to REM / EM converter',
        description:
          'Convert pixel values to REM, EM, points, and Tailwind spacing units with customizable base font size.',
        href: '/creator/workbench?tool=px-to-rem',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:favicon-generator',
        name: 'Favicon & web icon snippet generator',
        description:
          'Generate complete HTML head tags, PWA Web App Manifest, and SVG data URI favicons.',
        href: '/creator/workbench?tool=favicon-generator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:css-flexbox-grid',
        name: 'CSS Flexbox & Grid visual reference',
        description:
          'Interactive visual layout helper outputting CSS rules, Tailwind classes, and ASCII diagrams.',
        href: '/creator/workbench?tool=css-flexbox-grid',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:app-store-mockup-generator',
        name: 'App Store & Play Store screenshot mockup generator',
        description:
          'Generate clean marketing screenshot frames with smartphone hardware bezels, gradient backgrounds, and high-impact marketing header taglines in SVG format.',
        href: '/creator/workbench?tool=app-store-mockup-generator',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:social-media-post-formatter',
        name: 'Social media Unicode text formatter (LinkedIn, X, Instagram)',
        description:
          'Transform plain text into Unicode bold, italic, monospace, script, circled, and bulleted lists for social posts without formatting tools.',
        href: '/creator/workbench?tool=social-media-post-formatter',
        workspaceId: 'creator-workbench',
      },
      {
        id: 'creator-workbench:word-cloud-generator',
        name: 'Word cloud generator',
        description:
          'Turn any text into a downloadable SVG word cloud, sized by how often each word appears, with stop words removed.',
        href: '/creator/workbench?tool=word-cloud-generator',
        workspaceId: 'creator-workbench',
      },
    ],
  },
];
