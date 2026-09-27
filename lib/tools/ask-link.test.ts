import { describe, expect, it, vi } from 'vitest';

import { isLiveToolUrl } from '@/lib/seo/live-tools';

import {
  ASK_LINK_PREFIX,
  ASK_LINK_VERSION,
  ASK_REQUESTS,
  ASK_REQUEST_IDS,
  ASK_VERSION_PARAM,
  askDefaults,
  askDestination,
  askField,
  askRequestedFormat,
  formatLabel,
  formatWasSubstituted,
  probeEncodedFormat,
  askParamNames,
  askRequestPath,
  askSettingLines,
  buildAskCreatorUrl,
  buildAskLinkUrl,
  describeAskRequest,
  findAskRequest,
  readAskCreatorState,
  readAskLink,
  sanitiseAskValues,
  type AskRequest,
} from './ask-link';
import { ALL_RECIPES, recipeParamNames } from './recipe-link';

/**
 * Ask links, at the level a browser test cannot reach.
 *
 * `e2e/ask-link.spec.ts` proves the loop in two real engines and reads the
 * bytes that come out of it. This file proves the part that has no visible
 * symptom: that nothing except a declared parameter can enter one of these
 * URLs, however a caller is holding its data. A leak here would look like a
 * working feature right up to the moment somebody's filename appeared in a
 * group chat, so the gate is a sweep of the whole registry and not a sample.
 */

/** Every field of one request, set to a value its own declaration allows. */
function validValuesFor(request: AskRequest) {
  const values: Record<string, string | number | boolean> = {};
  for (const field of request.recipe.fields) {
    if (field.kind === 'choice') values[field.param] = field.choices[0].value;
    else if (field.kind === 'flag') values[field.param] = true;
    else values[field.param] = field.min;
  }
  return values;
}

/**
 * The shapes a leak would actually arrive in.
 *
 * Every key here is one a real call site might be holding when it passes a
 * whole state object by mistake. `__proto__` is deliberately absent: in an
 * object literal it sets the prototype rather than creating a key, so it cannot
 * be smuggled this way at all — and the place it really arrives from is a parsed
 * query string, which has its own test below.
 */
const HOSTILE = {
  filename: 'Priya-Sharma-passport-scan.pdf',
  file: 'binary-goes-here',
  content: 'Dear Sir, my account number is 40012345',
  data: 'data:image/png;base64,iVBORw0KGgo=',
  text: 'confidential board minutes',
  token: 'sk-live-9f1c0a',
  secret: 'hunter2',
  email: 'someone@example.com',
  user: 'u-88213',
  account: 'acct-99120',
  hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4',
  path: '/Users/priya/Documents/passport.pdf',
  label: 'Photo for the Class of 2027 application',
  message: 'Send this by Friday, case 2026/AB/114',
  phone: '+919812345678',
  redirect: 'https://evil.test/collect',
  next: '//evil.test',
  tool: 'something-else',
  constructor: 'nope',
} as const;

describe('the registry is a finite, honest list', () => {
  it('declares at least two requests, each with a unique id', () => {
    expect(ASK_REQUESTS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ASK_REQUEST_IDS).size).toBe(ASK_REQUESTS.length);
  });

  it('gives every id a URL-safe shape, so the path needs no escaping', () => {
    for (const id of ASK_REQUEST_IDS) {
      expect(id, id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(encodeURIComponent(id)).toBe(id);
    }
  });

  it('points every request at a route that really runs a tool', () => {
    // The destination is never assembled from the URL — it comes from the
    // recipe definition, and this is the same gate recipe-link.test.ts applies
    // to those. A request whose tool is not live would send the recipient to a
    // page that cannot do the job they were asked for.
    for (const request of ASK_REQUESTS) {
      expect(isLiveToolUrl(request.recipe.path), request.id).toBe(true);
    }
  });

  it('builds on a declared recipe rather than a schema of its own', () => {
    // One allowlist per destination tool, shared with the share-a-setup links.
    // A request carrying its own parameter list would be a second place for a
    // field to be widened carelessly.
    for (const request of ASK_REQUESTS) {
      expect(ALL_RECIPES, request.id).toContain(request.recipe);
    }
  });

  it('starts every request on settings its own definition accepts', () => {
    // A default that drifts out of its field's bounds would be silently
    // dropped, and the creator would open on something other than what is
    // written down here.
    for (const request of ASK_REQUESTS) {
      expect(askDefaults(request), request.id).toEqual(request.defaults);
    }
  });

  it('knows the output signature of every format it offers', () => {
    // The browser test reads the saved file's first bytes against this map, so
    // a format offered with no signature would ship unverified.
    for (const request of ASK_REQUESTS) {
      const formatField = request.recipe.fields.find(
        (field) => field.param === 'format',
      );
      if (formatField?.kind !== 'choice') continue;
      for (const choice of formatField.choices) {
        expect(
          request.verify.signatures[choice.value],
          `${request.id} offers ${choice.value} with no signature to check`,
        ).toBeDefined();
      }
    }
  });

  /*
   * The creator renders one control per declared parameter and the recipient
   * lists the same labels back. Both would be wrong in a way nobody notices if
   * these two lists drifted: a control for a parameter that does not exist is a
   * dead input, and a parameter with no control is a setting the sender cannot
   * see and the recipient's tool still applies.
   */
  it('gives every allowlisted parameter exactly one labelled control', () => {
    for (const request of ASK_REQUESTS) {
      const controls = request.controls.map((control) => control.param);
      expect(new Set(controls).size, `${request.id} labels one twice`).toBe(
        controls.length,
      );
      expect([...controls].sort(), request.id).toEqual(
        recipeParamNames(request.recipe).sort(),
      );
      for (const control of request.controls) {
        expect(askField(request, control.param), control.param).not.toBeNull();
        expect(control.label.length, control.param).toBeGreaterThan(2);
      }
    }
  });

  it('names no rival and quotes no price in any copy it ships', () => {
    // A standing repository rule that has already failed CI once and had to be
    // corrected on four live pages. Every string a visitor reads on these two
    // surfaces comes from this registry, so this is where to hold it.
    const copy = ASK_REQUESTS.flatMap((request) => [
      request.menuLabel,
      request.menuHint,
      request.headline,
      request.subjectNoun,
      request.requirementVerb,
      ...request.controls.flatMap((control) => [
        control.label,
        control.help ?? '',
      ]),
    ]).join(' ');
    for (const rival of [
      'ilovepdf',
      'smallpdf',
      'tinypng',
      'adobe',
      'canva',
      'iloveimg',
      'remove.bg',
      'cloudconvert',
    ]) {
      expect(copy.toLowerCase(), rival).not.toContain(rival);
    }
    expect(copy).not.toMatch(/[$₹€£]\s?\d/u);
  });

  it('resolves only ids that are actually declared', () => {
    for (const request of ASK_REQUESTS) {
      expect(findAskRequest(request.id)).toBe(request);
    }
    expect(findAskRequest('not-a-request')).toBeNull();
    expect(findAskRequest('')).toBeNull();
    expect(findAskRequest(undefined)).toBeNull();
    expect(findAskRequest(null)).toBeNull();
    // A record lookup would hand back Object.prototype's own members here.
    expect(findAskRequest('__proto__')).toBeNull();
    expect(findAskRequest('constructor')).toBeNull();
    expect(findAskRequest('toString')).toBeNull();
    expect(findAskRequest('hasOwnProperty')).toBeNull();
  });
});

describe('an ask link carries settings and nothing else', () => {
  /*
   * THE GATE. Everything else here is correctness; this is why the module is
   * shaped the way it is. `buildRecipeSearch` iterates the definition's
   * declared fields and never the caller's keys, so this holds by construction
   * — and this is what would fail if that ever stopped being true.
   */
  it('refuses to encode any value the definition does not declare', () => {
    for (const request of ASK_REQUESTS) {
      const url = buildAskLinkUrl(
        request,
        { ...validValuesFor(request), ...HOSTILE },
        'https://getopentools.com',
      );
      const params = new URL(url).searchParams;
      const allowed = new Set(askParamNames(request));

      for (const key of params.keys()) {
        expect(allowed.has(key), `${request.id} leaked param ${key}`).toBe(
          true,
        );
      }
      for (const value of Object.values(HOSTILE)) {
        if (typeof value !== 'string') continue;
        expect(url, `${request.id} leaked a value`).not.toContain(
          value.slice(0, 12),
        );
      }
    }
  });

  it('never writes a filename, a person or a destination into the URL', () => {
    // Said again as flat substrings, because the assertion above is about keys
    // and this one is about the words a reader would recognise in a link.
    for (const request of ASK_REQUESTS) {
      const url = buildAskLinkUrl(
        request,
        { ...validValuesFor(request), ...HOSTILE },
        'https://getopentools.com',
      );
      for (const forbidden of [
        'passport',
        'Priya',
        'sk-live',
        '@example.com',
        'base64',
        'evil.test',
        'Class of 2027',
        '+9198',
        'acct-',
        'e3b0c442',
        '/Users/',
      ]) {
        expect(url, `${request.id} · ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('cannot be given a custom label or message, even locally', () => {
    // A free-text field is the obvious nicety and the obvious leak: one typed
    // line carries a name, a case number or a phone number. It is refused at
    // the encoder, so no surface can add one later without this failing.
    for (const request of ASK_REQUESTS) {
      const url = buildAskLinkUrl(
        request,
        { label: 'For Priya', note: 'case 2026/AB/114', title: 'Photo' },
        'https://x.test',
      );
      expect(new URL(url).searchParams.size, request.id).toBe(1);
      expect(new URL(url).searchParams.get(ASK_VERSION_PARAM)).toBe(
        String(ASK_LINK_VERSION),
      );
    }
  });

  it('round-trips a full valid set of settings without drift', () => {
    for (const request of ASK_REQUESTS) {
      const values = validValuesFor(request);
      const url = new URL(buildAskLinkUrl(request, values, 'https://x.test'));
      const arrival = readAskLink(request.id, url.search);
      expect(arrival?.request, request.id).toBe(request);
      expect(arrival?.values, request.id).toEqual(values);
    }
  });

  it('puts the version on every link and requires it on the way back', () => {
    for (const request of ASK_REQUESTS) {
      const url = new URL(
        buildAskLinkUrl(request, askDefaults(request), 'https://x.test'),
      );
      expect(url.pathname).toBe(askRequestPath(request));
      expect(url.searchParams.get(ASK_VERSION_PARAM)).toBe(
        String(ASK_LINK_VERSION),
      );

      // A link with no version, or a version this build does not know, is not
      // read as a guess — it is not read at all.
      const withoutVersion = new URLSearchParams(url.search);
      withoutVersion.delete(ASK_VERSION_PARAM);
      expect(readAskLink(request.id, `?${withoutVersion}`)).toBeNull();
      expect(readAskLink(request.id, '?v=2')).toBeNull();
      expect(readAskLink(request.id, '?v=0')).toBeNull();
      expect(readAskLink(request.id, '?v=1.0')).toBeNull();
      expect(readAskLink(request.id, '?v=01')).toBeNull();
      expect(readAskLink(request.id, '')).toBeNull();
    }
  });

  it('refuses an unknown request id however it is spelled', () => {
    for (const id of [
      'not-a-request',
      '',
      '__proto__',
      'constructor',
      'image ',
      'IMAGE',
      '../image',
      'https://evil.test',
    ]) {
      expect(readAskLink(id, `?${ASK_VERSION_PARAM}=1`), id).toBeNull();
    }
  });

  it('drops an unknown parameter rather than carrying it through', () => {
    const request = ASK_REQUESTS[0]!;
    const arrival = readAskLink(
      request.id,
      `?${ASK_VERSION_PARAM}=1&format=jpeg&callback=https://evil.test&filename=passport.pdf&label=Priya`,
    );
    expect(Object.keys(arrival?.values ?? {})).toEqual(['format']);
  });

  it('never lets a parsed link reach Object.prototype', () => {
    const request = ASK_REQUESTS[0]!;
    const arrival = readAskLink(
      request.id,
      `?${ASK_VERSION_PARAM}=1&__proto__[polluted]=1&constructor[prototype][polluted]=1&format=jpeg`,
    );
    expect(arrival).not.toBeNull();
    expect(Object.keys(arrival!.values)).toEqual(['format']);
    expect(
      ({} as Record<string, unknown>).polluted,
      'a query parameter reached Object.prototype',
    ).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});

describe('a value that could not have been chosen is dropped, not honoured', () => {
  const ask = (search: string) =>
    readAskLink('image', `?${ASK_VERSION_PARAM}=1&${search}`)?.values ?? null;

  it('bounds every number to the field that declares it', () => {
    expect(ask('quality=5000')).toEqual({});
    expect(ask('quality=0')).toEqual({});
    expect(ask('quality=-80')).toEqual({});
    expect(ask('width=0')).toEqual({});
    expect(ask('width=12001')).toEqual({});
    expect(ask('width=999999999999')).toEqual({});
  });

  it('rejects NaN, Infinity and the spellings Number() would have taken', () => {
    for (const raw of [
      'NaN',
      'Infinity',
      '-Infinity',
      '1e3',
      '0x10',
      '1.5',
      '+50',
      '',
      ' ',
      '80 ',
      '8_0',
    ]) {
      expect(ask(`quality=${encodeURIComponent(raw)}`), raw).toEqual({});
    }
  });

  it('refuses an enum value the tool does not offer', () => {
    expect(ask('format=gif')).toEqual({});
    expect(ask('format=JPEG')).toEqual({});
    expect(ask('format=image%2Fjpeg')).toEqual({});
    expect(ask('format=')).toEqual({});
  });

  it('refuses an excessively long value outright', () => {
    // 8 KB of digits is not a quality setting; it is someone testing what the
    // parser will take. The bound rejects it because the number is out of
    // range, so there is no length check to tune and no partial parse.
    expect(ask(`quality=${'9'.repeat(8192)}`)).toEqual({});
    expect(ask(`format=${'a'.repeat(8192)}`)).toEqual({});
  });

  it('takes the first value when a parameter is repeated', () => {
    // `URLSearchParams.get` is first-wins. Stated as a test because a link
    // with `?format=jpeg&format=png` is either mangled or an attempt, and
    // which one wins must not be a surprise.
    expect(ask('format=jpeg&format=png')).toEqual({ format: 'jpeg' });
  });

  it('keeps a partly valid link, applying only what checks out', () => {
    expect(ask('format=jpeg&quality=5000&width=800&height=abc')).toEqual({
      format: 'jpeg',
      width: 800,
    });
  });
});

describe('the requirement the recipient reads', () => {
  it('states the format, the bound and nothing else, in words', () => {
    const image = findAskRequest('image')!;
    expect(
      describeAskRequest(image, {
        format: 'jpeg',
        quality: 80,
        width: 1200,
        height: 1200,
      }),
    ).toBe(
      'Please provide a JPEG image no wider than 1200 px and no taller than 1200 px.',
    );
    expect(describeAskRequest(image, { format: 'webp', width: 1600 })).toBe(
      'Please provide a WebP image no wider than 1600 px.',
    );
  });

  it('says exact pixels for the tool that produces exact pixels', () => {
    const photo = findAskRequest('photo-size')!;
    expect(
      describeAskRequest(photo, {
        format: 'jpeg',
        width: 200,
        height: 230,
        maxkb: 50,
        fit: 'crop',
      }),
    ).toBe(
      'Please provide a JPEG photo 200 × 230 px and no larger than 50 KB.',
    );
  });

  it('promises no size for the tool that cannot promise one', () => {
    // The PDF compressor's result depends entirely on what is in the file, so
    // its request describes the treatment and stops. A KB figure here would be
    // a number nothing in the repository can stand behind.
    const pdf = findAskRequest('pdf')!;
    const sentence = describeAskRequest(pdf, askDefaults(pdf));
    expect(sentence).toBe('Please provide a PDF.');
    expect(sentence).not.toMatch(/KB|MB|smaller than|under/i);
  });

  it('describes only what the link actually carries', () => {
    const image = findAskRequest('image')!;
    // An empty link asks for the kind of file and claims no settings.
    expect(describeAskRequest(image, {})).toBe('Please provide an image.');
    // And a value the definition drops is not described either.
    expect(describeAskRequest(image, { format: 'gif', width: 99999 })).toBe(
      'Please provide an image.',
    );
  });

  it('is built only from the definition, never from a caller string', () => {
    for (const request of ASK_REQUESTS) {
      const sentence = describeAskRequest(request, {
        ...validValuesFor(request),
        ...HOSTILE,
      });
      for (const value of Object.values(HOSTILE)) {
        if (typeof value !== 'string') continue;
        expect(sentence, `${request.id}`).not.toContain(value.slice(0, 12));
      }
    }
  });

  it('lists each setting under the label the creator showed it under', () => {
    // Same labels on both sides of the link, in the same order, so a sender can
    // check what they are about to send against what the recipient will read.
    const photo = findAskRequest('photo-size')!;
    expect(askSettingLines(photo, askDefaults(photo))).toEqual([
      { label: 'File format', value: 'JPEG' },
      { label: 'Exact width', value: '200 px' },
      { label: 'Exact height', value: '230 px' },
      { label: 'Maximum size', value: '50 KB' },
      { label: 'If the shape does not match', value: 'cropped to fill' },
    ]);
    expect(
      askSettingLines(photo, askDefaults(photo)).map((l) => l.label),
    ).toEqual(photo.controls.map((control) => control.label));
  });

  it('renders a flag as yes or no rather than as a raw value', () => {
    const pdf = findAskRequest('pdf')!;
    const lines = askSettingLines(pdf, { recompress: true, metadata: false });
    expect(lines).toEqual([
      { label: 'Recompress photographs inside the PDF', value: 'Yes' },
      { label: 'Remove metadata', value: 'No' },
    ]);
  });

  it('lists nothing a caller smuggled in', () => {
    for (const request of ASK_REQUESTS) {
      const labels = askSettingLines(request, HOSTILE).map(
        (line) => line.label,
      );
      expect(labels, request.id).toEqual([]);
    }
  });
});

describe('where an ask link sends the recipient', () => {
  it('is always the declared tool, never anything from the URL', () => {
    // There is no way to supply a destination: the path comes from the recipe
    // definition and the query from the definition's own fields. This is what
    // makes an open redirect structurally impossible rather than guarded
    // against.
    for (const request of ASK_REQUESTS) {
      const destination = askDestination(request, {
        ...validValuesFor(request),
        ...HOSTILE,
      });
      expect(
        destination.startsWith(`${request.recipe.path}?`),
        request.id,
      ).toBe(true);
      expect(destination).not.toContain('evil.test');
      expect(destination).not.toContain('//');
    }
  });

  it('carries the settings the tool already knows how to read', () => {
    const image = findAskRequest('image')!;
    expect(
      askDestination(image, { format: 'jpeg', quality: 80, width: 1200 }),
    ).toBe('/image/optimize?format=jpeg&quality=80&width=1200');
  });

  it('is the bare tool path when the link carried no settings', () => {
    const image = findAskRequest('image')!;
    expect(askDestination(image, {})).toBe('/image/optimize');
  });

  it('accepts only parameters the destination tool would apply', () => {
    // The strongest statement of the previous two: for every request, the
    // params the destination receives are exactly the params its own tool
    // reads off the address bar.
    for (const request of ASK_REQUESTS) {
      const destination = askDestination(request, validValuesFor(request));
      const params = new URL(destination, 'https://x.test').searchParams;
      expect([...params.keys()].sort(), request.id).toEqual(
        recipeParamNames(request.recipe).sort(),
      );
    }
  });
});

describe('the creator link that closes the loop', () => {
  it('reopens the creator on the request and settings that just ran', () => {
    const image = findAskRequest('image')!;
    const url = buildAskCreatorUrl(
      image,
      { format: 'jpeg', width: 900 },
      'https://getopentools.com',
    );
    expect(url).toBe(
      'https://getopentools.com/ask?request=image&format=jpeg&width=900',
    );
    const state = readAskCreatorState(new URL(url).search);
    expect(state?.request).toBe(image);
    expect(state?.values).toEqual({ format: 'jpeg', width: 900 });
  });

  it('starts blank when the request is unknown or absent', () => {
    expect(readAskCreatorState('')).toBeNull();
    expect(readAskCreatorState('?request=nope&format=jpeg')).toBeNull();
    expect(readAskCreatorState('?request=__proto__')).toBeNull();
    expect(readAskCreatorState('?format=jpeg')).toBeNull();
  });

  it('carries nothing a caller smuggled in, here either', () => {
    for (const request of ASK_REQUESTS) {
      const url = buildAskCreatorUrl(request, HOSTILE, 'https://x.test');
      const keys = [...new URL(url).searchParams.keys()];
      expect(keys, request.id).toEqual(['request']);
    }
  });
});

describe('the existing shared links keep working', () => {
  /*
   * Ask links are a new route family, not a change to the old one. These two
   * are here because `/shared/*` URLs are in group chats already and a link
   * that stops working is a person who tries this product once.
   */
  it('leaves /shared as the prefix for a shared setup', () => {
    // Asserted here as well as in recipe-link.test.ts, because this is the
    // file whose change would break it: ALL_RECIPES gained an entry for the
    // ask link's exact-size request.
    expect(ASK_LINK_PREFIX).toBe('/ask');
    for (const request of ASK_REQUESTS) {
      expect(askRequestPath(request).startsWith('/ask/')).toBe(true);
    }
  });

  it('does not take a parameter name the tools already use', () => {
    for (const request of ASK_REQUESTS) {
      const names = askParamNames(request);
      expect(new Set(names).size, request.id).toBe(names.length);
      // `tool` is the existing deep-link parameter and `shared` is the file
      // handoff marker; a request claiming either would change a page's
      // behaviour behind its own back.
      expect(names).not.toContain('tool');
      expect(names).not.toContain('shared');
    }
  });

  it('sanitises on the way out as well as on the way in', () => {
    // The creator holds a values object and hands it to three places: the
    // preview, the copied link, and the settings list. All three go through
    // the same sanitiser, so none of them can show or send something the
    // others would not.
    for (const request of ASK_REQUESTS) {
      expect(sanitiseAskValues(request, HOSTILE), request.id).toEqual({});
      expect(
        sanitiseAskValues(request, validValuesFor(request)),
        request.id,
      ).toEqual(validValuesFor(request));
    }
  });
});

/**
 * The browser told us it would make one format and made another.
 *
 * Measured in WebKit on 2026-09-27: `canvas.toBlob(cb, 'image/webp')` returns a
 * blob whose type is `image/png`. It does not refuse and it does not return
 * null — it substitutes. An ask link saying "Please provide a WebP image" would
 * therefore have sent a Safari or iOS recipient away with a PNG while the page
 * they read promised otherwise, and nothing in the first version of this feature
 * would have noticed.
 */
describe('a format the browser cannot actually produce', () => {
  /** A canvas stub whose `toBlob` answers with whatever type is given here. */
  const canvasProducing =
    (type: string | null, mode: 'ok' | 'throw' | 'silent' = 'ok') =>
    () =>
      ({
        width: 0,
        height: 0,
        toBlob: (callback: (blob: Blob | null) => void) => {
          if (mode === 'throw') throw new Error('no encoder');
          if (mode === 'silent') return;
          callback(type === null ? null : ({ type } as Blob));
        },
      }) as unknown as HTMLCanvasElement;

  it('reports the type the browser really produced', async () => {
    await expect(
      probeEncodedFormat('webp', canvasProducing('image/webp')),
    ).resolves.toBe('image/webp');
    await expect(
      probeEncodedFormat('webp', canvasProducing('image/png')),
    ).resolves.toBe('image/png');
  });

  it('calls the WebKit substitution a substitution', () => {
    expect(formatWasSubstituted('webp', 'image/png')).toBe(true);
    expect(formatWasSubstituted('webp', 'image/webp')).toBe(false);
    // Case and spelling must not create a false alarm.
    expect(formatWasSubstituted('webp', 'IMAGE/WEBP')).toBe(false);
    expect(formatWasSubstituted('JPEG', 'image/jpeg')).toBe(false);
  });

  /*
   * THE ONE THAT MATTERS MOST, and it is the conservative direction. Turning
   * "I could not check" into "this browser cannot do it" would invent a
   * limitation and send the recipient away for no reason — the same class of
   * untruth as the defect this guard exists to prevent, pointing the other way.
   */
  it('treats an unanswerable probe as unknown, never as a failure', async () => {
    expect(formatWasSubstituted('webp', null)).toBe(false);
    expect(formatWasSubstituted('webp', '')).toBe(false);

    await expect(probeEncodedFormat('webp', () => null)).resolves.toBeNull();
    await expect(
      probeEncodedFormat('webp', canvasProducing(null)),
    ).resolves.toBeNull();
    await expect(
      probeEncodedFormat('webp', canvasProducing('', 'ok')),
    ).resolves.toBeNull();
    await expect(
      probeEncodedFormat('webp', canvasProducing('image/webp', 'throw')),
    ).resolves.toBeNull();
    await expect(
      probeEncodedFormat('webp', () => ({}) as HTMLCanvasElement),
    ).resolves.toBeNull();
  });

  it('gives up rather than hanging when the callback never comes', async () => {
    // A browser that accepts the call and never answers would otherwise leave
    // the notice in limbo for the life of the page.
    vi.useFakeTimers();
    try {
      const pending = probeEncodedFormat(
        'webp',
        canvasProducing('image/webp', 'silent'),
      );
      await vi.advanceTimersByTimeAsync(2500);
      await expect(pending).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('names the format the way a sentence needs it', () => {
    expect(formatLabel('image/png')).toBe('PNG');
    expect(formatLabel('image/jpeg')).toBe('JPEG');
    // Lower-case `b`. "WEBP" is how a machine writes it, and this string goes
    // into a sentence a stranger reads. Flagged by the File Compiler lane.
    expect(formatLabel('image/webp')).toBe('WebP');
    expect(formatLabel('IMAGE/WEBP')).toBe('WebP');
    // An acronym nobody has told us about still reads as one.
    expect(formatLabel('image/heif')).toBe('HEIF');
    expect(formatLabel('nonsense')).toBe('nonsense');
  });

  it('reads the requested format only through the sanitiser', () => {
    const image = findAskRequest('image')!;
    expect(askRequestedFormat(image, { format: 'webp' })).toBe('webp');
    // A format the definition does not offer is not a format we report.
    expect(askRequestedFormat(image, { format: 'gif' })).toBeNull();
    expect(askRequestedFormat(image, {})).toBeNull();
    // And a request with no format field at all has nothing to probe.
    expect(
      askRequestedFormat(findAskRequest('pdf')!, { format: 'webp' }),
    ).toBeNull();
  });
});
