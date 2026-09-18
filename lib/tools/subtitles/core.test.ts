import { describe, expect, it } from 'vitest';
import {
  decodeSubtitleBytes,
  detectFormat,
  formatSubtitles,
  formatTimecode,
  parseOffset,
  parseSubtitles,
  parseTimecode,
  readSubtitleInput,
} from './core';

const SRT = [
  '1',
  '00:00:01,000 --> 00:00:03,400',
  'First line.',
  '',
  '2',
  '00:00:03,600 --> 00:00:07,000',
  'Second line,',
  'over two rows.',
].join('\n');

const VTT = [
  'WEBVTT',
  '',
  'NOTE this is a comment and must not become a cue',
  '',
  'intro',
  '00:00:01.000 --> 00:00:03.400 line:90% align:center',
  'First line.',
  '',
  '00:00:03.600 --> 00:00:07.000',
  'Second line.',
].join('\n');

const SBV = [
  '0:00:01.000,0:00:03.400',
  'First line.',
  '',
  '0:00:03.600,0:00:07.000',
  'Second line.',
].join('\n');

const LRC = [
  '[ar:Someone]',
  '[00:01.00]First line.',
  '[00:03.60]Second line.',
].join('\n');

const ASS = [
  '[Script Info]',
  'Title: Example',
  '',
  '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  'Dialogue: 0,0:00:01.00,0:00:03.40,Default,,0,0,0,,{\\an8}First line.',
  'Dialogue: 0,0:00:03.60,0:00:07.00,Default,,0,0,0,,Second line, with a comma.',
].join('\n');

function bytesOfUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

describe('timecodes', () => {
  it('writes each format the way its specification does', () => {
    expect(formatTimecode(3_723_456, 'srt')).toBe('01:02:03,456');
    expect(formatTimecode(3_723_456, 'vtt')).toBe('01:02:03.456');
    expect(formatTimecode(3_723_456, 'sbv')).toBe('1:02:03.456');
    expect(formatTimecode(3_723_456, 'ass')).toBe('1:02:03.45');
    // LRC has no hours field: an hour becomes 60 minutes.
    expect(formatTimecode(3_723_456, 'lrc')).toBe('62:03.45');
    expect(formatTimecode(0, 'srt')).toBe('00:00:00,000');
    expect(formatTimecode(-500, 'srt')).toBe('00:00:00,000');
  });

  it('reads the shapes subtitle files and people actually use', () => {
    expect(parseTimecode('01:02:03,456')).toBe(3_723_456);
    expect(parseTimecode('1:02:03.456')).toBe(3_723_456);
    expect(parseTimecode('00:00:02,5')).toBe(2500);
    expect(parseTimecode('02:03.45')).toBe(123_450);
    expect(parseTimecode('83.5')).toBe(83_500);
    expect(parseTimecode('0')).toBe(0);
    expect(parseTimecode('  12  ')).toBe(12_000);
  });

  it('returns null for what it cannot read, instead of guessing', () => {
    for (const bad of ['', 'abc', '1:2:3:4', 'now', '--:--']) {
      expect(parseTimecode(bad)).toBeNull();
    }
  });

  it('reads a signed offset and names the field when it cannot', () => {
    expect(parseOffset('2.5', 'the shift')).toBe(2500);
    expect(parseOffset('-1.25', 'the shift')).toBe(-1250);
    expect(parseOffset('00:00:02,500', 'the shift')).toBe(2500);
    expect(parseOffset('-00:00:02,500', 'the shift')).toBe(-2500);
    expect(() => parseOffset('soon', 'the shift')).toThrow('the shift must be');
    expect(() => parseOffset('  ', 'the shift')).toThrow('Enter the shift.');
  });
});

describe('recognising a format', () => {
  it.each([
    ['SubRip', SRT, 'srt'],
    ['WebVTT', VTT, 'vtt'],
    ['SBV', SBV, 'sbv'],
    ['LRC', LRC, 'lrc'],
    ['SubStation', ASS, 'ass'],
  ])('recognises %s', (_name, text, expected) => {
    expect(detectFormat(text)).toBe(expected);
  });

  it('tells SubRip from WebVTT by the comma in the timestamp', () => {
    expect(detectFormat('1\n00:00:01,000 --> 00:00:02,000\nHi')).toBe('srt');
    expect(detectFormat('00:00:01.000 --> 00:00:02.000\nHi')).toBe('vtt');
  });
});

describe('reading a file', () => {
  it('reads SubRip', () => {
    const document = parseSubtitles(SRT);
    expect(document.format).toBe('srt');
    expect(document.cues).toHaveLength(2);
    expect(document.cues[0]).toMatchObject({
      startMs: 1000,
      endMs: 3400,
      text: 'First line.',
    });
    expect(document.cues[1].text).toBe('Second line,\nover two rows.');
    expect(document.warnings).toEqual([]);
  });

  it('reads WebVTT, keeping cue ids and settings and skipping NOTE blocks', () => {
    const document = parseSubtitles(VTT);
    expect(document.cues).toHaveLength(2);
    expect(document.cues[0].id).toBe('intro');
    expect(document.cues[0].settings).toBe('line:90% align:center');
    expect(document.cues[1].id).toBeUndefined();
    expect(document.warnings).toEqual([]);
  });

  it('reads SBV', () => {
    const document = parseSubtitles(SBV);
    expect(document.format).toBe('sbv');
    expect(document.cues.map((cue) => cue.startMs)).toEqual([1000, 3600]);
  });

  it('reads LRC, giving each line the next line’s start as its end', () => {
    const document = parseSubtitles(LRC);
    expect(document.cues).toHaveLength(2);
    expect(document.cues[0]).toMatchObject({ startMs: 1000, endMs: 3600 });
    // The last line has no follower, so it gets a fixed three seconds.
    expect(document.cues[1]).toMatchObject({ startMs: 3600, endMs: 6600 });
  });

  it('reads SubStation dialogue and says that styling is not carried', () => {
    const document = parseSubtitles(ASS);
    expect(document.cues).toHaveLength(2);
    expect(document.cues[0].startMs).toBe(1000);
    // Text is the last field and may contain commas of its own.
    expect(document.cues[1].text).toBe('Second line, with a comma.');
    expect(document.warnings.join(' ')).toContain(
      'positioning, fonts and colours are not',
    );
  });

  it('reports a block it could not read instead of dropping it in silence', () => {
    const broken = `${SRT}\n\n3\n00:00:09,000 -> 00:00:10,000\nBad arrow.`;
    const document = parseSubtitles(broken);
    expect(document.cues).toHaveLength(2);
    expect(document.warnings).toHaveLength(1);
    expect(document.warnings[0]).toContain('no timing line');
  });

  it('reports a timing line it cannot read', () => {
    const document = parseSubtitles(
      '1\n00:00:01,000 --> 00:00:02,000\nGood.\n\n2\nlater --> soon\nBad.',
    );
    expect(document.cues).toHaveLength(1);
    expect(document.warnings[0]).toContain('unreadable timing line');
  });

  it('refuses empty input and input with no cues in it', () => {
    expect(() => parseSubtitles('   ')).toThrow('Paste subtitles');
    expect(() => parseSubtitles('just some prose\nwith no timings')).toThrow(
      'No subtitle cues were found',
    );
  });

  it('accepts Windows line endings and a byte order mark', () => {
    const document = parseSubtitles(`﻿${SRT.replace(/\n/gu, '\r\n')}`);
    expect(document.cues).toHaveLength(2);
    expect(document.cues[0].text).toBe('First line.');
  });
});

describe('writing a file', () => {
  it('writes SubRip that reads back identically', () => {
    const once = formatSubtitles(parseSubtitles(SRT), 'srt');
    expect(once.trimEnd()).toBe(SRT);
    expect(formatSubtitles(parseSubtitles(once), 'srt')).toBe(once);
  });

  it('writes WebVTT with the header, and reads it back', () => {
    const vtt = formatSubtitles(parseSubtitles(SRT), 'vtt');
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('00:00:01.000 --> 00:00:03.400');
    const back = parseSubtitles(vtt);
    expect(back.cues).toHaveLength(2);
    expect(back.cues[1].text).toBe('Second line,\nover two rows.');
  });

  it('keeps the exact times through SubRip → WebVTT → SubRip', () => {
    const original = parseSubtitles(SRT);
    const round = parseSubtitles(
      formatSubtitles(parseSubtitles(formatSubtitles(original, 'vtt')), 'srt'),
    );
    expect(round.cues.map((cue) => [cue.startMs, cue.endMs])).toEqual(
      original.cues.map((cue) => [cue.startMs, cue.endMs]),
    );
  });

  it('writes SBV and LRC the way each defines them', () => {
    expect(formatSubtitles(parseSubtitles(SRT), 'sbv')).toContain(
      '0:00:01.000,0:00:03.400',
    );
    const lrc = formatSubtitles(parseSubtitles(SRT), 'lrc');
    expect(lrc).toContain('[00:01.00]First line.');
    // LRC is one line per cue, so an internal break becomes a space.
    expect(lrc).toContain('[00:03.60]Second line, over two rows.');
  });

  it('writes plain text with no numbering or times', () => {
    const txt = formatSubtitles(parseSubtitles(SRT), 'txt');
    expect(txt).not.toContain('-->');
    expect(txt).not.toMatch(/^\d+$/mu);
    expect(txt).toContain('First line.');
  });
});

describe('turning bytes into text', () => {
  it('reads UTF-8, with and without a byte order mark', () => {
    const plain = decodeSubtitleBytes(bytesOfUtf8('नमस्ते ₹500'));
    expect(plain).toEqual({ text: 'नमस्ते ₹500', encoding: 'utf-8' });

    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...bytesOfUtf8('Héllo')]);
    expect(decodeSubtitleBytes(withBom)).toEqual({
      text: 'Héllo',
      encoding: 'utf-8 (BOM)',
    });
  });

  it('reads UTF-16 in both byte orders', () => {
    const le = new Uint8Array([0xff, 0xfe, 0x48, 0x00, 0xe9, 0x00]);
    expect(decodeSubtitleBytes(le)).toEqual({
      text: 'Hé',
      encoding: 'utf-16le (BOM)',
    });
    const be = new Uint8Array([0xfe, 0xff, 0x00, 0x48, 0x00, 0xe9]);
    expect(decodeSubtitleBytes(be)).toEqual({
      text: 'Hé',
      encoding: 'utf-16be (BOM)',
    });
  });

  it('falls back to Windows-1252 rather than producing mojibake', () => {
    // "Café — naïve" as a Windows-1252 file. These bytes are not valid UTF-8,
    // which is exactly why reading them as UTF-8 would mangle the words.
    const bytes = new Uint8Array([
      0x43, 0x61, 0x66, 0xe9, 0x20, 0x97, 0x20, 0x6e, 0x61, 0xef, 0x76, 0x65,
    ]);
    expect(decodeSubtitleBytes(bytes)).toEqual({
      text: 'Café — naïve',
      encoding: 'windows-1252',
    });
  });

  it('prefers UTF-8 when the bytes are valid UTF-8', () => {
    // The same words as real UTF-8 must not be read as Windows-1252.
    expect(decodeSubtitleBytes(bytesOfUtf8('Café — naïve')).encoding).toBe(
      'utf-8',
    );
  });
});

describe('reading whatever the workbench passes in', () => {
  it('returns typed text unchanged', () => {
    expect(readSubtitleInput(SRT)).toEqual({ text: SRT, encoding: 'text' });
  });

  it('decodes a chosen file, which arrives as a base64 data URL', () => {
    const base64 = Buffer.from('Café', 'utf8').toString('base64');
    expect(readSubtitleInput(`data:text/plain;base64,${base64}`)).toEqual({
      text: 'Café',
      encoding: 'utf-8',
    });
  });

  it('decodes a Windows-1252 file chosen from disk', () => {
    const base64 = Buffer.from([0x43, 0x61, 0x66, 0xe9]).toString('base64');
    expect(readSubtitleInput(`data:text/plain;base64,${base64}`)).toEqual({
      text: 'Café',
      encoding: 'windows-1252',
    });
  });

  it('decodes a percent-encoded data URL', () => {
    expect(readSubtitleInput('data:text/plain,Caf%C3%A9')).toEqual({
      text: 'Café',
      encoding: 'text',
    });
  });
});
