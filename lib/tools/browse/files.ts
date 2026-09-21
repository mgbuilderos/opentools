// Generated from `toolSubsectionsForGroup` -- see lib/tools/browse.ts for why,
// and browse.test.ts, which fails if this file drifts from the catalogue.
//
// Regenerate with `npx tsx scripts/generate-browse-data.mjs`.
import type { BrowseSection } from '../browse';

export const SECTIONS: readonly BrowseSection[] = [
  {
    id: 'files',
    title: 'Files & archives',
    description: 'ZIP archives, checksums, renaming, and file inspection.',
    destinations: [
      {
        id: 'file-hash',
        name: 'File hash calculator',
        description: 'Calculate SHA-256, SHA-384, or SHA-512 locally.',
        href: '/file/hash-calculator',
        workspaceId: 'file-hash',
      },
      {
        id: 'archive-toolkit',
        name: 'ZIP opener and packer',
        description:
          'Open a ZIP, see what is inside, take files out, and pack new archives.',
        href: '/file/archive',
        workspaceId: 'archive-toolkit',
      },
      {
        id: 'file-workbench:file-compressor',
        name: 'Gzip file compressor',
        description:
          'Compress one file into the standard gzip format with the browser Compression Streams API.',
        href: '/file/workbench?tool=file-compressor',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-chunk-splitter',
        name: 'File chunk splitter',
        description: 'Split one file into numbered byte-exact chunks.',
        href: '/file/workbench?tool=file-chunk-splitter',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-chunk-joiner',
        name: 'File chunk joiner',
        description: 'Join selected chunks byte-for-byte in picker order.',
        href: '/file/workbench?tool=file-chunk-joiner',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-checksum-verifier',
        name: 'File checksum verifier',
        description:
          'Calculate a cryptographic digest and compare it with an expected hexadecimal value.',
        href: '/file/workbench?tool=file-checksum-verifier',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:duplicate-file-finder',
        name: 'Duplicate-file finder',
        description:
          'Group selected files by exact byte length and SHA-256 digest.',
        href: '/file/workbench?tool=duplicate-file-finder',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-signature-inspector',
        name: 'File-signature inspector',
        description:
          'Inspect leading bytes against a disclosed set of common signatures.',
        href: '/file/workbench?tool=file-signature-inspector',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:mime-type-detector',
        name: 'MIME-type detector',
        description:
          'Compare browser-reported MIME type, filename extension, and common leading-byte signatures.',
        href: '/file/workbench?tool=mime-type-detector',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:magic-byte-inspector',
        name: 'Magic-byte inspector',
        description: 'Show the first 32 bytes and a common-signature match.',
        href: '/file/workbench?tool=magic-byte-inspector',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-metadata-viewer',
        name: 'File metadata viewer',
        description:
          'List File API name, relative path, byte size, MIME hint, and modification time.',
        href: '/file/workbench?tool=file-metadata-viewer',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:filename-cleaner',
        name: 'Filename cleaner',
        description:
          'Create safe, compact download names while preserving extensions.',
        href: '/file/workbench?tool=filename-cleaner',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:bulk-file-renamer',
        name: 'Bulk file renamer',
        description:
          'Replace literal text in selected filenames and download copied bytes.',
        href: '/file/workbench?tool=bulk-file-renamer',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:sequential-file-renamer',
        name: 'Sequential file renamer',
        description:
          'Create numbered download names while preserving extensions.',
        href: '/file/workbench?tool=sequential-file-renamer',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:filename-case-converter',
        name: 'Filename case converter',
        description:
          'Convert filename stems to lower, upper, kebab, snake, or title case.',
        href: '/file/workbench?tool=filename-case-converter',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-extension-changer',
        name: 'File extension changer',
        description: 'Change only the extension on downloaded copies.',
        href: '/file/workbench?tool=file-extension-changer',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:directory-tree-generator',
        name: 'Directory-tree generator',
        description:
          'Build a sorted text tree from folder-picker relative paths.',
        href: '/file/workbench?tool=directory-tree-generator',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:folder-manifest-generator',
        name: 'Folder-manifest generator',
        description:
          'Create a JSON manifest with relative paths, metadata, and SHA-256 digests.',
        href: '/file/workbench?tool=folder-manifest-generator',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-list-to-csv',
        name: 'File list to CSV',
        description:
          'Export selected file paths and File API metadata as strict CSV.',
        href: '/file/workbench?tool=file-list-to-csv',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-size-analyzer',
        name: 'File-size analyzer',
        description: 'Rank selected files by byte size and calculate totals.',
        href: '/file/workbench?tool=file-size-analyzer',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:empty-file-finder',
        name: 'Empty-file finder',
        description: 'List selected files whose byte length is exactly zero.',
        href: '/file/workbench?tool=empty-file-finder',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:large-file-finder',
        name: 'Large-file finder',
        description:
          'List selected files at or above an explicit byte threshold.',
        href: '/file/workbench?tool=large-file-finder',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:binary-file-viewer',
        name: 'Binary-file viewer',
        description:
          'Display a bounded byte window as eight-bit binary groups.',
        href: '/file/workbench?tool=binary-file-viewer',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:hex-viewer',
        name: 'Hex viewer',
        description:
          'Display a bounded file window with offsets, hexadecimal bytes, and ASCII.',
        href: '/file/workbench?tool=hex-viewer',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:hex-patch-generator',
        name: 'Hex-patch generator',
        description:
          'Compare two equal-length files and list byte replacement instructions.',
        href: '/file/workbench?tool=hex-patch-generator',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:base64-file-encoder',
        name: 'Base64 file encoder',
        description: 'Encode one selected file as standard padded Base64.',
        href: '/file/workbench?tool=base64-file-encoder',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:base64-file-decoder',
        name: 'Base64 file decoder',
        description: 'Decode strict standard Base64 into a downloadable file.',
        href: '/file/workbench?tool=base64-file-decoder',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:data-uri-file-maker',
        name: 'Data-URI file maker',
        description: 'Encode one selected file as a Base64 data URI.',
        href: '/file/workbench?tool=data-uri-file-maker',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:data-uri-file-extractor',
        name: 'Data-URI file extractor',
        description:
          'Decode a strict Base64 data URI into a downloadable file.',
        href: '/file/workbench?tool=data-uri-file-extractor',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-encrypt',
        name: 'AES-GCM file encryptor',
        description:
          'Encrypt any file locally with authenticated 256-bit AES-GCM and PBKDF2 password derivation.',
        href: '/file/workbench?tool=file-encrypt',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:file-decrypt',
        name: 'AES-GCM file decryptor',
        description:
          'Decrypt an .enc file back to its original bytes using your password.',
        href: '/file/workbench?tool=file-decrypt',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:exif-metadata-inspector',
        name: 'Image EXIF & GPS metadata inspector',
        description:
          'Inspect camera model, exposure settings, software tags, and GPS coordinates embedded inside image files.',
        href: '/file/workbench?tool=exif-metadata-inspector',
        workspaceId: 'file-workbench',
      },
      {
        id: 'file-workbench:exif-metadata-stripper',
        name: 'Image EXIF & metadata scrubber',
        description:
          'Remove EXIF, XMP, IPTC and comment blocks — GPS coordinates, camera serials, timestamps and thumbnails — from JPEG and PNG files before sharing.',
        href: '/file/workbench?tool=exif-metadata-stripper',
        workspaceId: 'file-workbench',
      },
    ],
  },
];
