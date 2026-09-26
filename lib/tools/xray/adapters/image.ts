/**
 * Turning `ImageMetadataResult` into ranked findings.
 *
 * `lib/tools/metadata` does the byte work: EXIF in JPEG, `tEXt`/`iTXt` in PNG,
 * `EXIF`/`XMP` chunks in WebP. Nothing here re-reads a file. This decides, for
 * each field that parser already found, how much it matters and what a reader
 * learns from it -- which is the part the photo metadata page currently states
 * in prose next to a table, and which a general "what is in this file" report
 * has to carry on every row.
 */

import type { ImageMetadataResult } from '../../metadata';
import type { XrayFinding } from '../types';

/**
 * How a PNG or WebP text chunk is classified.
 *
 * These chunks are free-form: the format says a keyword and a value, not what
 * the keyword means. So the key is matched against what writers actually use.
 * A key that matches nothing lands in `technical` at `low`, which is the safe
 * direction -- a real name shown as harmless is a worse mistake than a camera
 * setting shown as a name, so only keys that genuinely carry identity are
 * allowed to claim it.
 *
 * Order matters: the first pattern that matches wins.
 */
const TEXT_KEY_RULES: readonly {
  pattern: RegExp;
  category: XrayFinding['category'];
  severity: XrayFinding['severity'];
  consequence: string;
}[] = [
  {
    pattern: /author|artist|owner|copyright|credit|byline/iu,
    category: 'identity',
    severity: 'high',
    consequence:
      'This names a person or rights holder, and travels with the image into every place it is posted.',
  },
  {
    pattern: /software|program|source|tool|generator|device/iu,
    category: 'device',
    severity: 'medium',
    consequence:
      'This names the program or device that wrote the file, which narrows down what you use.',
  },
  {
    pattern: /comment|description|title|keyword|caption|subject/iu,
    category: 'hidden-content',
    severity: 'medium',
    consequence:
      'No image viewer shows this text, so it is easy to forget it is there and that it is sent with the file.',
  },
];

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '') || 'entry'
  );
}

export function imageFindings(
  metadata: ImageMetadataResult,
): readonly XrayFinding[] {
  const findings: XrayFinding[] = [];
  const { camera, shot, gps, rawTextEntries } = metadata;

  if (gps) {
    const altitude = gps.formattedAltitude ? `, ${gps.formattedAltitude}` : '';
    findings.push({
      id: 'image-gps',
      category: 'location',
      severity: 'high',
      label: 'GPS location',
      value: `${gps.formattedLat}, ${gps.formattedLon}${altitude}`,
      /*
        No address. Resolving one is a network request, which tool code in this
        repo does not make -- see the module comment in `../types.ts`. What is
        claimed here is what a coordinate pair actually gives a recipient: a
        point precise enough to identify a building, which is the part people
        are surprised by.
      */
      consequence:
        'This pins where the photo was taken to within a few metres — precise enough to identify a home, a school or an office. Anyone you send the file to can open it on a map.',
      source: 'EXIF GPS tags',
      mapUrl: gps.mapUrl,
    });

    if (gps.dateStamp || gps.timestamp) {
      findings.push({
        id: 'image-gps-time',
        category: 'timeline',
        severity: 'medium',
        label: 'GPS timestamp (UTC)',
        value: [gps.dateStamp, gps.timestamp].filter(Boolean).join(' '),
        consequence:
          'Together with the coordinates this says you were at that spot at that moment, which is a movement record rather than a photo.',
        source: 'EXIF GPS tags',
      });
    }
  }

  if (camera.ownerName) {
    findings.push({
      id: 'image-owner',
      category: 'identity',
      severity: 'high',
      label: 'Camera owner',
      value: camera.ownerName,
      consequence:
        'Your name is written into the file by the camera. It is in every photo you have exported from it.',
      source: 'EXIF camera tags',
    });
  }

  if (camera.serialNumber) {
    findings.push({
      id: 'image-serial',
      category: 'device',
      severity: 'high',
      label: 'Camera serial number',
      value: camera.serialNumber,
      consequence:
        'A unique number for one physical camera. It links every photo you have ever published from this body to the same owner — including anonymous ones.',
      source: 'EXIF camera tags',
    });
  }

  const cameraName = [camera.make, camera.model].filter(Boolean).join(' ');
  if (cameraName) {
    findings.push({
      id: 'image-camera',
      category: 'device',
      severity: 'medium',
      label: 'Camera make and model',
      value: cameraName,
      consequence:
        'Says which phone or camera you own, which helps narrow a set of anonymous photos down to one person.',
      source: 'EXIF camera tags',
    });
  }

  const lens = [camera.lensMake, camera.lensModel].filter(Boolean).join(' ');
  if (lens) {
    findings.push({
      id: 'image-lens',
      category: 'device',
      severity: 'low',
      label: 'Lens',
      value: lens,
      consequence:
        'Part of your kit list. Harmless alone, and one more thing that makes a set of photos match.',
      source: 'EXIF camera tags',
    });
  }

  if (camera.software) {
    findings.push({
      id: 'image-software',
      category: 'device',
      severity: 'medium',
      label: 'Software',
      value: camera.software,
      consequence:
        'Names the app or firmware that last wrote the file, down to the version — which also says whether the photo was edited.',
      source: 'EXIF software tag',
    });
  }

  if (shot.dateTimeOriginal) {
    findings.push({
      id: 'image-taken',
      category: 'timeline',
      severity: 'medium',
      label: 'Date taken',
      value: shot.dateTimeOriginal,
      consequence:
        'The moment the shutter fired, which can contradict whatever the photo is being presented as.',
      source: 'EXIF date tags',
    });
  }

  for (const [id, label, value] of [
    ['image-digitized', 'Date digitised', shot.dateTimeDigitized],
    ['image-modified', 'Date modified', shot.dateTime],
  ] as const) {
    if (value) {
      findings.push({
        id,
        category: 'timeline',
        severity: 'low',
        label,
        value,
        consequence:
          'Another timestamp in the file, useful for placing when it was handled.',
        source: 'EXIF date tags',
      });
    }
  }

  const dimensions =
    shot.width && shot.height ? `${shot.width} × ${shot.height}` : undefined;
  for (const [id, label, value] of [
    ['image-dimensions', 'Dimensions', dimensions],
    ['image-exposure', 'Exposure time', shot.exposureTime],
    ['image-aperture', 'Aperture', shot.fNumber],
    ['image-iso', 'ISO', shot.iso ? String(shot.iso) : undefined],
    ['image-focal', 'Focal length', shot.focalLength],
  ] as const) {
    if (value) {
      findings.push({
        id,
        category: 'technical',
        severity: 'low',
        label,
        value,
        consequence:
          'A camera setting. It says nothing about you and is kept when the file is cleaned.',
        source: 'EXIF shot tags',
      });
    }
  }

  for (const entry of rawTextEntries) {
    const rule = TEXT_KEY_RULES.find((candidate) =>
      candidate.pattern.test(entry.key),
    );
    findings.push({
      id: `image-text-${slug(entry.key)}`,
      category: rule?.category ?? 'technical',
      severity: rule?.severity ?? 'low',
      label: entry.key,
      value: entry.value,
      consequence:
        rule?.consequence ??
        'Text stored in the file itself rather than shown in the picture.',
      source: 'Embedded text chunk',
    });
  }

  return findings;
}
