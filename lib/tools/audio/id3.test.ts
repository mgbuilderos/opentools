import { describe, expect, it } from 'vitest';
import {
  buildId3v2,
  findApeTag,
  findId3v1,
  findId3v2,
  type Id3Tags,
  parseId3v1,
  parseId3v2,
  readSyncsafe,
  readTags,
  writeSyncsafe,
} from './id3';

function bytesOf(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    out[index] = text.charCodeAt(index) & 0xff;
  }
  return out;
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

describe('syncsafe integers', () => {
  it('round-trips values and never sets the high bit of a byte', () => {
    const target = new Uint8Array(4);
    for (const value of [0, 1, 127, 128, 255, 4096, 1_000_000, 268_435_455]) {
      writeSyncsafe(target, 0, value);
      expect(readSyncsafe(target, 0)).toBe(value);
      for (const byte of target) expect(byte & 0x80).toBe(0);
    }
  });
});

describe('writing and reading ID3v2 tags', () => {
  const tags: Id3Tags = {
    title: 'Morning Raga',
    artist: 'OpenTools',
    album: 'Local First',
    year: '2026',
    track: '3',
    genre: 'Ambient',
    comment: 'Cut in the browser',
  };

  it('round-trips every field', () => {
    const tag = buildId3v2(tags);
    expect(parseId3v2(tag)).toEqual(tags);
  });

  it('round-trips rupee signs, Devanagari and emoji', () => {
    // ID3v2.3 text can only carry these as UTF-16, which is why the writer
    // always uses it. A Latin-1 writer would turn each of these into "?".
    const unicode: Id3Tags = {
      title: '₹500 तरंग 🎧',
      artist: 'ओपनटूल्स',
      comment: 'सब कुछ इसी टैब में',
    };
    expect(parseId3v2(buildId3v2(unicode))).toEqual(unicode);
  });

  it('writes nothing at all when there are no tags', () => {
    expect(buildId3v2({}).length).toBe(0);
    expect(buildId3v2({ title: '   ' }).length).toBe(0);
    expect(parseId3v2(new Uint8Array(0))).toEqual({});
  });

  it('declares a size that matches the bytes it wrote', () => {
    const tag = buildId3v2(tags);
    const block = findId3v2(tag);
    expect(block?.offset).toBe(0);
    expect(block?.size).toBe(tag.length);
    expect(block?.majorVersion).toBe(3);
    expect(block?.unsynchronised).toBe(false);
  });

  it('finds no tag in bytes that do not start with ID3', () => {
    expect(findId3v2(new Uint8Array([0xff, 0xfb, 0x90, 0x00]))).toBeNull();
    expect(findId3v2(new Uint8Array(4))).toBeNull();
  });

  it('refuses a tag whose declared size runs past the file', () => {
    const tag = buildId3v2(tags);
    writeSyncsafe(tag, 6, 10_000_000);
    expect(findId3v2(tag)).toBeNull();
  });

  it('stops at the padding instead of reading it as frames', () => {
    const tag = buildId3v2(tags);
    const padded = concat(tag, new Uint8Array(64));
    writeSyncsafe(padded, 6, padded.length - 10);
    expect(parseId3v2(padded)).toEqual(tags);
  });

  it('reads a hand-built ID3v2.3 frame with Latin-1 text', () => {
    const body = concat(
      new Uint8Array([0x00]),
      bytesOf(`Plain Title${String.fromCharCode(0)}`),
    );
    const frame = concat(bytesOf('TIT2'), new Uint8Array(6), body);
    new DataView(frame.buffer).setUint32(4, body.length);
    const tag = concat(
      bytesOf('ID3'),
      new Uint8Array([3, 0, 0, 0, 0, 0, 0]),
      frame,
    );
    writeSyncsafe(tag, 6, frame.length);
    expect(parseId3v2(tag).title).toBe('Plain Title');
  });

  it('reports nothing for an unsynchronised tag rather than guessing', () => {
    const tag = buildId3v2(tags);
    tag[5] = 0x80;
    expect(findId3v2(tag)?.unsynchronised).toBe(true);
    expect(parseId3v2(tag)).toEqual({});
  });
});

describe('ID3v1', () => {
  function id3v1(options: {
    title: string;
    artist: string;
    album: string;
    year: string;
    comment: string;
    track?: number;
    genre?: number;
  }): Uint8Array {
    const tag = new Uint8Array(128);
    tag.set(bytesOf('TAG'), 0);
    tag.set(bytesOf(options.title.slice(0, 30)), 3);
    tag.set(bytesOf(options.artist.slice(0, 30)), 33);
    tag.set(bytesOf(options.album.slice(0, 30)), 63);
    tag.set(bytesOf(options.year.slice(0, 4)), 93);
    tag.set(bytesOf(options.comment.slice(0, 28)), 97);
    if (options.track) {
      tag[125] = 0;
      tag[126] = options.track;
    }
    tag[127] = options.genre ?? 255;
    return tag;
  }

  it('reads the fields and the v1.1 track number', () => {
    const bytes = concat(
      new Uint8Array(1000),
      id3v1({
        title: 'Side Two',
        artist: 'A Band',
        album: 'An Album',
        year: '1998',
        comment: 'ripped',
        track: 7,
        genre: 17,
      }),
    );
    const tags = parseId3v1(bytes);
    expect(tags).toEqual({
      title: 'Side Two',
      artist: 'A Band',
      album: 'An Album',
      year: '1998',
      comment: 'ripped',
      track: '7',
      genre: 'Rock',
    });
    expect(findId3v1(bytes)?.offset).toBe(1000);
  });

  it('finds nothing when the last 128 bytes are audio', () => {
    expect(findId3v1(new Uint8Array(1000))).toBeNull();
    expect(parseId3v1(new Uint8Array(10))).toEqual({});
  });
});

describe('merging the two tag versions', () => {
  it('prefers ID3v2 and fills the gaps from ID3v1', () => {
    const v2 = buildId3v2({ title: 'Real Title' });
    const v1 = new Uint8Array(128);
    v1.set(bytesOf('TAG'), 0);
    v1.set(bytesOf('Old Title'), 3);
    v1.set(bytesOf('Only In v1'), 33);
    v1[127] = 255;
    expect(readTags(concat(v2, new Uint8Array(400), v1))).toEqual({
      title: 'Real Title',
      artist: 'Only In v1',
    });
  });
});

describe('APEv2 tags appended after the audio', () => {
  it('finds a footer-only tag and reports where it starts', () => {
    const footer = new Uint8Array(32);
    footer.set(bytesOf('APETAGEX'), 0);
    const view = new DataView(footer.buffer);
    view.setUint32(8, 2000, true); // version
    view.setUint32(12, 132, true); // body plus this footer
    view.setUint32(20, 0, true); // no header present
    const bytes = concat(new Uint8Array(500), new Uint8Array(100), footer);
    const found = findApeTag(bytes, bytes.length);
    expect(found?.size).toBe(132);
    expect(found?.offset).toBe(bytes.length - 132);
  });

  it('finds nothing when no APE footer is there', () => {
    expect(findApeTag(new Uint8Array(500), 500)).toBeNull();
    expect(findApeTag(new Uint8Array(10), 10)).toBeNull();
  });
});
