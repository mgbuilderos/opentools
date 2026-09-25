import { describe, expect, it } from 'vitest';

import { IMAGE_PAIRS_ANSWERED_ELSEWHERE } from '../tools/image-convert/formats';
import { IMAGE_PAIRS, imagePairFacts, imageSeoPairById } from './image-pairs';
import { LIVE_TOOL_ROUTES } from './live-tools';

describe('image conversion pair pages', () => {
  it('generates the sixteen pairs the formats actually support', () => {
    // Seven formats in, three that `canvas.toBlob` can write out: 7 x 3, less
    // the three that would convert a format to itself, less the two HEIC pairs
    // a hand-written page answers. If this number moves, a format was added or
    // `canEncode` changed, and both are decisions rather than accidents.
    expect(IMAGE_PAIRS.length).toBe(16);
  });

  it('gives each pair a unique id, title and description', () => {
    const ids = IMAGE_PAIRS.map((pair) => pair.id);
    expect(new Set(ids).size).toBe(ids.length);

    const titles = IMAGE_PAIRS.map((pair) => pair.title);
    expect(new Set(titles).size).toBe(titles.length);

    const descriptions = IMAGE_PAIRS.map(
      (pair) => imagePairFacts(pair).description,
    );
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('keeps every description inside what a search result will print', () => {
    for (const pair of IMAGE_PAIRS) {
      const { description } = imagePairFacts(pair);
      expect(description.length, description).toBeLessThanOrEqual(160);
      expect(description.length, description).toBeGreaterThanOrEqual(70);
    }
  });

  it('says something different about each destination format', () => {
    // The failure this guards against is sixteen pages that differ only in
    // their nouns. What actually differs between them is the loss, the
    // transparency and the size, and that is decided by the destination.
    const png = IMAGE_PAIRS.find((pair) => pair.to.id === 'png')!;
    const jpg = IMAGE_PAIRS.find((pair) => pair.to.id === 'jpg')!;
    const webp = IMAGE_PAIRS.find((pair) => pair.to.id === 'webp')!;

    expect(imagePairFacts(png).measured).toMatch(/lossless|exactly/iu);
    expect(imagePairFacts(jpg).measured).toMatch(/transparency/iu);
    expect(imagePairFacts(webp).measured).toMatch(/webp/iu);
    expect(
      new Set([
        imagePairFacts(png).measured,
        imagePairFacts(jpg).measured,
        imagePairFacts(webp).measured,
      ]).size,
    ).toBe(3);
  });

  it('flags the decoder download on exactly the HEIC-sourced pairs', () => {
    // `heic-to-webp` is generated -- only the JPG and PNG destinations have
    // hand-written pages -- so one generated page does owe the disclosure.
    const needing = IMAGE_PAIRS.filter(
      (pair) => imagePairFacts(pair).needsDecoder,
    ).map((pair) => pair.id);
    expect(needing).toEqual(['heic-to-webp']);
  });

  it('points every hand-written pair at a route that is actually live', () => {
    // The rule the file-format pairs already follow: a pair is not generated
    // when a real page answers it, and deleting that page has to surface here
    // rather than as a dead link in the sibling list.
    const facts = imagePairFacts(IMAGE_PAIRS[0]!);
    for (const [id, href] of Object.entries(IMAGE_PAIRS_ANSWERED_ELSEWHERE)) {
      const [from = '', to = ''] = id.split('-to-');
      expect(facts.routes[`${from}|${to}`], id).toBe(href);
      expect(LIVE_TOOL_ROUTES, `${href} is not live`).toContain(href);
    }
  });

  it('resolves a pair by id, and refuses one it does not generate', () => {
    for (const pair of IMAGE_PAIRS) {
      expect(imageSeoPairById(pair.id)?.id).toBe(pair.id);
    }
    // Hand-written, so not resolvable here; the route must not render a second
    // address for it.
    expect(imageSeoPairById('heic-to-jpg')).toBeUndefined();
    // Not writable by any canvas.
    expect(imageSeoPairById('png-to-avif')).toBeUndefined();
  });

  it('offers siblings that are all real pages', () => {
    const known = new Set([
      ...IMAGE_PAIRS.map((pair) => `/convert/${pair.id}`),
      ...Object.values(IMAGE_PAIRS_ANSWERED_ELSEWHERE),
    ]);
    for (const pair of IMAGE_PAIRS) {
      for (const href of Object.values(imagePairFacts(pair).routes)) {
        expect(known.has(href), `${pair.id} links ${href}`).toBe(true);
      }
    }
  });
});
