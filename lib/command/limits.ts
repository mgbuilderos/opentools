/**
 * WHAT THIS SITE CANNOT DO, SAID PLAINLY.
 *
 * A box you type a sentence into has to be able to answer "no". The failure it
 * would otherwise make is worse than not understanding: a catalogue of 1,367
 * tools contains a Pig Latin translator, a Morse translator and a Braille
 * translator, so "translate this to Spanish" has four confident matches and not
 * one of them translates anything into Spanish. Ranking cannot fix that. Only
 * knowing what is absent can.
 *
 * So the rules below name the things people reasonably ask for and this site
 * genuinely does not have, in three groups:
 *
 *   `no-network` -- it would need a server. Every page here is served with
 *     `Content-Security-Policy: connect-src 'none'` (`public/_headers`), and
 *     `e2e/egress-proof.spec.ts` fails if a page opens a connection. This is the
 *     one class of "no" that will not change while that header is the point of
 *     the site.
 *   `no-model` -- it would need a language model. There is none in the tab and
 *     nothing here could reach one.
 *   `not-a-tool` -- a plain gap. These are the ones worth reporting, and
 *     `plan.ts` offers to report them.
 *
 * A `decisive` rule answers even when the catalogue matched something, because
 * the match is known to be wrong. Every other rule only speaks when nothing
 * matched, so a rule can never hide a tool that does exist -- and
 * `limits.test.ts` checks that too, by running every phrase here through the
 * matcher and failing if a non-decisive one had a confident answer.
 */
import type { SubjectKind } from './types';

export type LimitKind = 'no-network' | 'no-model' | 'not-a-tool';

export interface LimitRule {
  id: string;
  kind: LimitKind;
  /** Lower-case phrases. A single space matches any run of whitespace. */
  phrases: readonly string[];
  /**
   * Words that mean the rule does not apply, because a tool here really does
   * this. "Translate" is out of scope; "translate to morse" is `/text/morse-code-translator`.
   */
  unless?: readonly string[];
  /** Fires even when the catalogue matched. Reserved for known-wrong matches. */
  decisive?: true;
  /** What cannot be done, and why, in the plan's own voice. */
  because: string;
  /** The nearest thing this site does do. */
  instead?: { label: string; href: string; note?: string };
  /** Narrows the rule to one kind of subject, when the words alone are ambiguous. */
  subject?: SubjectKind;
}

export const LIMITS: readonly LimitRule[] = [
  {
    id: 'send-it-somewhere',
    kind: 'no-network',
    phrases: [
      'email it',
      'email this',
      'email me',
      'send it to',
      'send this to',
      'send me',
      'mail it to',
      'text it to',
      'message it to',
    ],
    decisive: true,
    because:
      'Nothing in this tab can send anything anywhere. Every page here is served with connect-src ’none’, so there is no server for it to reach — which is also why your file is still only on your machine. Run the step, download the result, and send it yourself.',
  },
  {
    id: 'put-it-in-a-service',
    kind: 'no-network',
    phrases: [
      'upload to',
      'upload it',
      'save to google',
      'google drive',
      'save to drive',
      'dropbox',
      'onedrive',
      'icloud',
      'save to the cloud',
      'sync to',
      'post to',
      'publish to',
      'push to',
      'save to my account',
    ],
    decisive: true,
    because:
      'There is no account here and nowhere for a file to go. These pages ship connect-src ’none’, so the tab cannot open a connection to a service even if you wanted it to. Everything ends as a download.',
  },
  {
    id: 'fetch-something',
    kind: 'no-network',
    phrases: [
      'download from',
      'download a youtube',
      'youtube video',
      'from youtube',
      'from instagram',
      'from tiktok',
      'from a url',
      'from this url',
      'from this link',
      'from a website',
      'scrape',
      'crawl',
      'search the web',
      'look up',
      'check if the site',
      'is this site up',
      'whois',
      'dns lookup',
      'ip lookup',
      'my ip',
      'what is my ip',
      'exchange rate today',
      'stock price',
      'the weather',
    ],
    decisive: true,
    because:
      'Fetching something means reaching a server, and this tab cannot: connect-src ’none’ blocks every connection a page could open. Anything you already have on your machine, you can drop in.',
  },
  {
    /*
      A rate is a fact about today, and the only place to get one is a server.
      "Convert 100 usd to inr" is one of the most plausible things anybody would
      type into a box on a site with 632 converters on it, and every one of those
      632 converts between units whose ratio is fixed by definition. This is the
      line between the two, and it is worth saying out loud rather than answering
      with a length converter.
    */
    id: 'live-rates',
    kind: 'no-network',
    phrases: [
      'exchange rate',
      'usd to',
      'to usd',
      'eur to',
      'to eur',
      'gbp to',
      'to gbp',
      'inr to',
      'to inr',
      'jpy to',
      'to jpy',
      'dollar to',
      'to dollar',
      'euro to',
      'to euro',
      'rupee to',
      'to rupee',
      'btc to',
      'to btc',
      'bitcoin price',
      'crypto price',
      'currency convert',
      'convert currency',
    ],
    /*
      "Pound" was in this list until `limits.test.ts` pointed out what this site
      calls `/convert/grams-to-pounds`. A pound is a unit of mass, and pounds per
      square inch is a unit of pressure, and both of those are ratios fixed by
      definition. So the word is not here, and neither is a bare "bitcoin" -- the
      Bitcoin QR code generator is a real tool and it needs no rate at all.
    */
    unless: ['qr', 'address', 'wallet', 'barcode'],
    decisive: true,
    because:
      'A conversion rate between currencies is a fact about today, and the only way to know it is to ask a server. This tab cannot: connect-src \u2019none\u2019. The converters here all convert between units whose ratio is fixed by definition, which is why they can run with the network off.',
  },
  {
    id: 'ask-an-ai',
    kind: 'no-model',
    phrases: [
      'ask ai',
      'ask an ai',
      'use ai to',
      'with ai',
      'chat with',
      'generate an image of',
      'draw me',
      'make me a picture of',
      'make an image of',
    ],
    decisive: true,
    because:
      'There is no language model and no image generator here. Every tool on this site is a function that runs on your own machine, and with connect-src ’none’ the page could not call one elsewhere.',
  },
  {
    /*
      DECISIVE, AND THE LIST IS THE ARGUMENT.

      Every phrase here had a confident answer in the catalogue and every one of
      those answers was wrong: "rewrite this" came back with the PDF compressor
      (whose description mentions rewriting a file), "explain this" with the cron
      expression parser, "what does this mean" with the average calculator, and
      "make it sound" with the sound-intensity calculator. Ranking cannot fix any
      of that, because each match is real -- the word is genuinely in the tool.
      What is missing is the thing being asked for.

      `limits.test.ts` fails if a tool is ever named after one of these phrases, so
      the day this site grows a paraphraser, this rule has to be reconsidered
      rather than quietly shadowing it.
    */
    id: 'no-prose-of-its-own',
    kind: 'no-model',
    phrases: [
      'rewrite this',
      'reword',
      'paraphrase',
      'make it sound',
      'improve my writing',
      'proofread',
      'fix my grammar',
      'check my grammar',
      'correct my spelling',
      'explain this',
      'what does this mean',
      'answer this',
    ],
    decisive: true,
    because:
      'There is no language model here. Every tool on this site is a function that runs on your own machine \u2014 none of them writes or judges prose, and with connect-src \u2019none\u2019 the page could not call one elsewhere.',
  },
  {
    /*
      NOT decisive, and the difference from the rule above is worth keeping. "Write
      me a readme" and "write me a changelog" are real tools here, under
      `/documents`, so these three phrases have to let the catalogue answer first.
      When it cannot -- "write me a poem" -- the sentence falls through to this.
    */
    id: 'write-it-for-me',
    kind: 'no-model',
    phrases: ['write me', 'write my', 'draft me'],
    because:
      'There is no language model here, so there is nothing that could write it. The generators on this site fill a structure you give them \u2014 a readme, a changelog, an invoice \u2014 rather than composing prose.',
  },
  {
    id: 'translate-a-language',
    kind: 'no-model',
    phrases: [
      'translate',
      'translation of',
      'in spanish',
      'in french',
      'in german',
      'in hindi',
      'in chinese',
      'in japanese',
      'in arabic',
      'to spanish',
      'to french',
      'to german',
      'to hindi',
      'to chinese',
      'to japanese',
      'to arabic',
      'to english',
    ],
    // The translators this site does have. Each is a fixed substitution table,
    // which is why they can exist here at all.
    unless: [
      'morse',
      'braille',
      'nato',
      'pig latin',
      'sql',
      'dialect',
      'cron',
      'binary',
      'hex',
      'base64',
      'unicode',
      'roman',
      'emoji',
    ],
    decisive: true,
    because:
      'Translating between human languages needs a model this site does not carry and cannot fetch. The translators here are fixed substitution tables — Morse, Braille, NATO, Pig Latin — and none of them is a language.',
    instead: {
      label: 'Morse-code translator',
      href: '/text/morse-code-translator',
      note: 'A table, not a language.',
    },
  },
  {
    id: 'install-something',
    kind: 'not-a-tool',
    // Trimmed to the phrasings nothing here answers: "download the app" was
    // reaching the App Store QR code generator and "command line" the cURL
    // converter, and in both cases the tool was a better answer than this rule.
    phrases: ['install', 'desktop version', 'desktop app', 'native app'],
    because:
      'There is nothing to install. This is a web page that keeps working with the network off once it has loaded, and the whole site can be saved as a folder you own.',
    instead: {
      label: 'Run it over a whole folder instead',
      href: '/batch',
      note: 'The one thing a desktop app is usually wanted for.',
    },
  },
];

/** A phrase matches a run of whitespace wherever it was written with a space. */
function phrasePattern(phrase: string) {
  return new RegExp(`\\b${phrase.replace(/ /gu, '\\s+')}`, 'iu');
}

/** The rules a clause triggers, decisive ones first. */
export function limitsFor(
  clause: string,
  subject?: SubjectKind,
): readonly LimitRule[] {
  const text = clause.toLocaleLowerCase('en-US');
  return LIMITS.filter((rule) => {
    if (rule.subject && rule.subject !== subject) return false;
    if (rule.unless?.some((word) => text.includes(word))) return false;
    return rule.phrases.some((phrase) => phrasePattern(phrase).test(text));
  }).sort(
    (left, right) =>
      Number(right.decisive ?? false) - Number(left.decisive ?? false),
  );
}
