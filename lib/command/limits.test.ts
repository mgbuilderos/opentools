import { describe, expect, it } from 'vitest';
import { COMMAND_CATALOGUE } from './catalogue.generated';
import { LIMITS, limitsFor } from './limits';
import { findTools, prepare } from './match';
import { parseRequest } from './parse';
import { plan } from '.';

const prepared = prepare(COMMAND_CATALOGUE);

/** A phrase with nothing left to search for cannot shadow a tool. */
function matchesFor(phrase: string) {
  const [clause] = parseRequest(phrase);
  return clause ? findTools(clause, prepared).matches : [];
}

describe('what this site cannot do', () => {
  /**
   * THE GUARD THAT KEEPS A REFUSAL HONEST.
   *
   * A rule that is not `decisive` speaks only when the catalogue found nothing,
   * so it can never hide a tool. This checks that the ones written that way
   * really are in that position: if somebody adds a proofreader, "proofread" stops
   * reaching its refusal on its own, and nothing here has to be remembered.
   */
  it('lets the catalogue answer first, wherever a rule is not decisive', () => {
    const shadowed = LIMITS.filter((rule) => !rule.decisive).flatMap((rule) =>
      rule.phrases.flatMap((phrase) => {
        const matches = matchesFor(phrase);
        return matches.length
          ? [`${rule.id}: "${phrase}" -> ${matches[0]!.entry.name}`]
          : [];
      }),
    );
    /*
      A phrase that already has an answer is not a refusal, it is a tool -- so
      either the phrase should go or the rule should be decisive. This is the
      assertion that found eight of them: "explain this" was being answered with
      the cron expression parser, and "what does this mean" with the average
      calculator, both of which mention the word and neither of which explains
      anything.
    */
    expect(shadowed).toEqual([]);
  });

  /**
   * A decisive rule overrules the catalogue, which is the right thing for
   * "translate this to Spanish" -- there are four translators here and none of
   * them is a language -- and the wrong thing the day somebody adds one.
   *
   * So no decisive phrase may appear inside what a tool here is CALLED. A name is
   * the strongest claim a tool makes about itself: the day a page is named
   * "Paraphrase text" or "Translate text", this fails and the rule has to be
   * reconsidered rather than silently hiding it.
   *
   * It is the phrase in the name, not its words scattered through one. "Email it"
   * shares a word with the HTML email template generator, which is not called
   * that and does not send anything.
   */
  it('never overrules a phrase that a tool here is named after', () => {
    const names = COMMAND_CATALOGUE.map((entry) =>
      entry.name.toLocaleLowerCase('en-US').replace(/\s+/gu, ' '),
    );
    const collisions = LIMITS.filter((rule) => rule.decisive).flatMap((rule) =>
      rule.phrases
        .filter((phrase) => names.some((name) => name.includes(phrase)))
        .map((phrase) => `${rule.id}: ${phrase}`),
    );
    expect(collisions).toEqual([]);
  });

  it('points only at pages that exist', () => {
    const live = new Set(COMMAND_CATALOGUE.map((entry) => entry.href));
    const broken = LIMITS.flatMap((rule) =>
      rule.instead && !live.has(rule.instead.href)
        ? [`${rule.id} -> ${rule.instead.href}`]
        : [],
    );
    expect(broken).toEqual([]);
  });

  it('says why, every time, in a sentence', () => {
    for (const rule of LIMITS) {
      expect(rule.because.length, rule.id).toBeGreaterThan(60);
      expect(rule.because.trimEnd().endsWith('.'), rule.id).toBe(true);
    }
  });

  it('refuses to reach a network, and says that is why', () => {
    for (const query of [
      'email this to my accountant',
      'upload it to google drive',
      'download this youtube video',
      'what is my ip address',
      'convert 100 usd to inr',
    ]) {
      const [gap] = plan(query).gaps;
      expect(gap?.kind, query).toBe('no-network');
      expect(gap?.because, query).toContain('connect-src');
    }
  });

  /**
   * The Pig Latin translator, the Morse translator, the Braille translator and the
   * NATO one are all real tools here, and not one of them is a language. This is
   * the case the whole module exists for.
   */
  it('will not offer a novelty translator for a language', () => {
    const [gap] = plan('translate this to spanish').gaps;
    expect(gap?.kind).toBe('no-model');
    expect(plan('translate this to spanish').steps).toEqual([]);
  });

  it('still answers for the translators it does have', () => {
    for (const query of [
      'translate this to morse code',
      'translate to braille',
    ]) {
      expect(plan(query).steps.length, query).toBeGreaterThan(0);
    }
  });

  /** A ratio fixed by definition is not a rate somebody has to publish. */
  it('separates a currency from a unit', () => {
    expect(plan('convert 100 usd to inr').gaps[0]?.kind).toBe('no-network');
    expect(plan('convert 5 kg to pounds').steps[0]?.href).toContain(
      '/convert/',
    );
  });

  it('offers to file a gap that is only a gap', () => {
    const [gap] = plan('tell me a joke').gaps;
    expect(gap?.kind).toBe('not-a-tool');
    expect(gap?.requestUrl).toContain('/issues/new?');
    expect(gap?.requestUrl).toContain('tool_request.yml');
  });

  /**
   * A rule of the place is not a missing tool, so there is nothing to file. Asking
   * somebody to open an issue for "email this to my accountant" would be asking
   * them to file the point of the site as a bug.
   */
  it('does not offer to file what it will never do', () => {
    expect(
      plan('email this to my accountant').gaps[0]?.requestUrl,
    ).toBeUndefined();
  });

  it('matches a phrase however it was punctuated', () => {
    expect(limitsFor("what's my ip").length).toBeGreaterThan(0);
    expect(limitsFor('WHAT IS MY IP').length).toBeGreaterThan(0);
  });
});
