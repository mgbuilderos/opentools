import { describe, expect, it } from 'vitest';
import { COMMAND_CATALOGUE } from './catalogue.generated';
import { LEXICON, lexiconFor } from './lexicon';
import { prepare } from './match';
import { contentTokens } from './tokens';

const prepared = prepare(COMMAND_CATALOGUE);

describe('the lexicon', () => {
  /** Rule 1 in the file: a phrase may not point at a page that is not there. */
  it('sends every phrase to a live tool', () => {
    const live = new Set(COMMAND_CATALOGUE.map((entry) => entry.href));
    const broken = LEXICON.flatMap((entry) =>
      (entry.prefer ?? [])
        .filter((candidate) => !live.has(candidate.href))
        .map((candidate) => `${entry.id} -> ${candidate.href}`),
    );
    expect(broken).toEqual([]);
  });

  /**
   * Rule 2: a bridge adds words to the search, so a word no tool uses is a word
   * that finds nothing -- a bridge to nowhere, and invisible without this.
   */
  it('adds only words the catalogue really uses', () => {
    const missing = LEXICON.flatMap((entry) =>
      entry.terms.flatMap((term) => {
        const normalised = contentTokens(term);
        // A term that normalises to nothing is a stop word, and a term that
        // normalises to something no tool has is a bridge to nowhere. Both were
        // in the first draft of this file: `over`, and `recognise`.
        if (!normalised.length) return [`${entry.id}: ${term} (a stop word)`];
        return normalised
          .filter((token) => prepared.unknown(token))
          .map((token) => `${entry.id}: ${term} -> ${token}`);
      }),
    );
    expect(missing).toEqual([]);
  });

  /**
   * A phrase in two entries is two answers to one sentence, decided by whichever
   * is declared first -- which is how "add page numbers" came back with the
   * watermarker.
   */
  it('gives each phrase to exactly one entry', () => {
    const owners = new Map<string, string[]>();
    for (const entry of LEXICON) {
      for (const phrase of entry.phrases) {
        owners.set(phrase, [...(owners.get(phrase) ?? []), entry.id]);
      }
    }
    expect(
      [...owners]
        .filter(([, ids]) => ids.length > 1)
        .map(([phrase, ids]) => `${phrase}: ${ids.join(', ')}`),
    ).toEqual([]);
  });

  it('is triggered by every phrase it declares', () => {
    const silent = LEXICON.flatMap((entry) =>
      entry.phrases
        .filter(
          (phrase) =>
            !lexiconFor(phrase).some((hit) => hit.entry.id === entry.id),
        )
        .map((phrase) => `${entry.id}: ${phrase}`),
    );
    expect(silent).toEqual([]);
  });

  it('reads a phrase however it was punctuated', () => {
    for (const written of [
      'i cant select the text',
      "i can't select the text",
      'i can t select the text',
    ]) {
      expect(
        lexiconFor(written).map((hit) => hit.entry.id),
        written,
      ).toContain('read-the-text');
    }
  });

  it('answers a ceiling even when the words say nothing', () => {
    expect(
      lexiconFor('make this smaller', { hasSize: true }).map(
        (hit) => hit.entry.id,
      ),
    ).toContain('make-it-smaller');
    expect(
      lexiconFor('under 2mb', { hasSize: true }).map((hit) => hit.entry.id),
    ).toContain('make-it-smaller');
  });

  /** The most conditions met wins, not the first one declared. */
  it('picks the destination that fits what the sentence is about', () => {
    const [hit] = lexiconFor('find duplicates', { subject: 'table' });
    expect(hit?.href).toBe('/data/csv-deduplicator');
    const [other] = lexiconFor('find duplicates');
    expect(other?.href).toBe('/file/duplicate-file-finder');
  });

  it('withdraws where the words say it does not apply', () => {
    expect(
      lexiconFor('split it into one file per page').map((hit) => hit.entry.id),
    ).not.toContain('put-them-together');
  });

  /**
   * The extractive summariser answers the words and not the expectation, and
   * saying so is the difference between a tool and a disappointment.
   */
  it('says what a tool will not do, where that is the point', () => {
    const caveats = LEXICON.filter((entry) => entry.caveat);
    expect(caveats.length).toBeGreaterThan(0);
    for (const entry of caveats)
      expect(entry.caveat!.length).toBeGreaterThan(40);
  });
});
