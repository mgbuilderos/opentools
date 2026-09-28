import { describe, expect, it } from 'vitest';
import { parseRequest } from './parse';
import { AGENT_NOUNS, contentTokens, joinedForms, tokenize } from './tokens';

describe('reading a typed request', () => {
  it('splits a sentence into one clause per job', () => {
    const clauses = parseRequest(
      'make this under 2MB and strip my name out of it',
    );
    expect(clauses.map((clause) => clause.text)).toEqual([
      'make this under 2MB',
      'strip my name out of it',
    ]);
  });

  it('splits on every conjunction people use', () => {
    for (const query of [
      'compress it and rotate it',
      'compress it, rotate it',
      'compress it then rotate it',
      'compress it; rotate it',
      'compress it plus rotate it',
      'compress it + rotate it',
    ]) {
      expect(parseRequest(query).length, query).toBe(2);
    }
  });

  /**
   * The PDF signer's own page calls it "fill and sign". Splitting there asks the
   * catalogue for a tool called "fill" and another called "sign", and each entry
   * in `PROTECTED` is a phrase somebody really types.
   */
  it('keeps a phrase that contains a conjunction whole', () => {
    for (const query of [
      'fill and sign this pdf',
      'make it black and white',
      'find and replace in this file',
    ]) {
      expect(
        parseRequest(query).map((clause) => clause.text),
        query,
      ).toEqual([query]);
    }
  });

  it('reads an ampersand as the conjunction it is', () => {
    expect(parseRequest('fill & sign this pdf').map((c) => c.text)).toEqual([
      'fill and sign this pdf',
    ]);
  });

  /**
   * No slash: "L/100km" and "km/h" are unit names on 631 `/convert` pages, and a
   * split there would ask for a tool called "100km to mpg".
   */
  it('does not split a unit that contains a slash', () => {
    expect(parseRequest('convert l/100km to mpg').length).toBe(1);
  });

  it('reads a size ceiling in the words it was written in', () => {
    const cases: ReadonlyArray<[string, number, string]> = [
      ['under 2MB', 2, 'MB'],
      ['less than 500kb', 500, 'KB'],
      ['no bigger than 1 mb', 1, 'MB'],
      ['max 200 KB', 200, 'KB'],
      ['compress to 100kb', 100, 'KB'],
      ['<= 5mb', 5, 'MB'],
    ];
    for (const [query, value, unit] of cases) {
      const [clause] = parseRequest(query);
      expect(clause?.size, query).toMatchObject({ value, unit });
    }
  });

  it('counts a KB as 1,024 bytes, like the exact-size tool', () => {
    expect(parseRequest('under 2MB')[0]?.size?.bytes).toBe(2 * 1024 * 1024);
  });

  it('does not read a unit conversion as a size ceiling', () => {
    expect(parseRequest('convert 2 mb to kb')[0]?.size).toBeUndefined();
  });

  it('reads dimensions', () => {
    for (const query of ['800x600', '800 by 600', '800 × 600']) {
      expect(parseRequest(`resize to ${query}`)[0]?.dimensions, query).toEqual({
        width: 800,
        height: 600,
      });
    }
  });

  /**
   * A quantity the parser understood is not also a word to search for. Left in,
   * "2mb" was reported back to the reader as a word nothing recognised -- the one
   * part of the sentence it had understood best.
   */
  it('does not search for a quantity it has already understood', () => {
    const [clause] = parseRequest('make this under 2MB');
    expect(clause?.tokens).not.toContain('2mb');
    expect(clause?.size?.value).toBe(2);
  });

  /** A clause can be nothing but a ceiling, and it is still a request. */
  it('keeps a clause whose only content is a ceiling', () => {
    const clauses = parseRequest('make this under 2MB');
    expect(clauses).toHaveLength(1);
    expect(clauses[0]?.tokens).toEqual([]);
  });

  it('reads the direction of a conversion before "to" is dropped', () => {
    expect(parseRequest('png to webp')[0]?.direction).toEqual({
      from: 'png',
      to: 'webp',
    });
    expect(parseRequest('webp to png')[0]?.direction).toEqual({
      from: 'webp',
      to: 'png',
    });
  });

  it('reads what the sentence is about', () => {
    const cases: ReadonlyArray<[string, string]> = [
      ['compress this pdf', 'pdf'],
      ['shrink my photo', 'image'],
      ['trim this mp3', 'audio'],
      ['cut this video', 'video'],
      ['sort this csv', 'table'],
      ['unzip this archive', 'archive'],
    ];
    for (const [query, subject] of cases) {
      expect(parseRequest(query)[0]?.subject, query).toBe(subject);
    }
  });

  /** "Write me a X" is addressed to the site; the object is the request. */
  it('drops the verb of a request frame', () => {
    expect(parseRequest('write me a readme')[0]?.tokens).toEqual(['readme']);
    expect(parseRequest('generate my invoice')[0]?.tokens).toEqual(['invoice']);
  });

  it('has nothing to say about an empty box', () => {
    for (const query of ['', '   ', '\n\t'])
      expect(parseRequest(query)).toEqual([]);
  });
});

describe('tokens', () => {
  it('treats a plural as the same word', () => {
    expect(tokenize('pages')).toEqual(['page']);
    expect(tokenize('its')).toEqual(['its']);
  });

  it('treats the tool and the doing of it as one word', () => {
    expect(tokenize('JSON formatter')).toEqual(['json', 'format']);
    expect(tokenize('format this json')).toEqual(['format', 'thi', 'json']);
  });

  /**
   * Every pair in that list has to be a word this catalogue really uses, or it is
   * a rule with nothing behind it.
   */
  it('lists only agent nouns this site names tools with', async () => {
    const { COMMAND_CATALOGUE } = await import('./catalogue.generated');
    const written = new Set(
      COMMAND_CATALOGUE.flatMap((entry) =>
        entry.name
          .toLocaleLowerCase('en-US')
          .split(/[^a-z]+/u)
          .filter(Boolean),
      ),
    );
    expect(AGENT_NOUNS.filter((noun) => !written.has(noun))).toEqual([]);
  });

  it('joins a hyphenated word so "wifi" finds "Wi-Fi"', () => {
    expect(joinedForms('Wi-Fi QR code')).toEqual(['wifi']);
    expect(joinedForms('nothing hyphenated here')).toEqual([]);
  });

  it('drops the words that carry no intent', () => {
    expect(contentTokens('please make this smaller for me')).toEqual([
      'smaller',
    ]);
  });
});
