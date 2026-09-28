import { describe, expect, it } from 'vitest';
import {
  FILE_PROMPT_KEYS,
  FILE_PROMPT_PATH,
  FILE_PROMPT_VERSION,
  filePromptPath,
  readFragment,
  toFragment,
} from './prompt-link';
import type { ImageRequirement } from './requirement';

const FULL: ImageRequirement = {
  format: 'image/jpeg',
  maxBytes: 2 * 1024 * 1024,
  maxWidth: 1200,
  maxHeight: 900,
  quality: 82,
  removeMetadata: true,
  background: '#ff8800',
};

describe('a File Prompt round-trips its requirement', () => {
  it('survives a full requirement unchanged', () => {
    expect(readFragment(toFragment(FULL)).requirement).toEqual(FULL);
  });

  it('survives every field, one at a time', () => {
    const singles: ImageRequirement[] = [
      { format: 'image/png' },
      { format: 'image/webp' },
      { maxBytes: 64 },
      { maxWidth: 1 },
      { maxHeight: 12000 },
      { exactWidth: 600, exactHeight: 600 },
      { quality: 10 },
      { quality: 100 },
      { removeMetadata: true },
      { keepTransparency: true },
      { background: '#000000' },
      { exactWidth: 10, exactHeight: 10, fit: 'pad' },
    ];
    for (const requirement of singles) {
      expect(readFragment(toFragment(requirement)).requirement).toEqual(
        requirement,
      );
    }
  });

  it('is stable: the same requirement always makes the same link', () => {
    const a = toFragment(FULL);
    // Key order must not depend on the order the object was built in.
    const reordered: ImageRequirement = {
      removeMetadata: true,
      background: '#ff8800',
      quality: 82,
      maxHeight: 900,
      maxWidth: 1200,
      maxBytes: 2 * 1024 * 1024,
      format: 'image/jpeg',
    };
    expect(toFragment(reordered)).toBe(a);
  });

  it('round-trips an empty requirement as an empty requirement', () => {
    expect(readFragment(toFragment({})).requirement).toEqual({});
    expect(readFragment('').requirement).toEqual({});
    expect(readFragment('#').requirement).toEqual({});
  });

  it('encodes the hash of a colour so it cannot end the fragment', () => {
    const fragment = toFragment({ background: '#ff8800' });
    expect(fragment).not.toContain('#ff8800');
    expect(fragment).toContain('%23ff8800');
    expect(readFragment(fragment).requirement.background).toBe('#ff8800');
  });

  it('builds a relative path carrying the requirement after a hash', () => {
    const path = filePromptPath({ format: 'image/png' });
    expect(path.startsWith(`${FILE_PROMPT_PATH}#`)).toBe(true);
    // Relative by construction: no scheme and no host can appear.
    expect(path).not.toContain('://');
    expect(path.split('#')[1]).toContain(`v=${FILE_PROMPT_VERSION}`);
  });
});

describe('a link carries nothing but the requirement', () => {
  /**
   * Every key that could carry something private, whether about the file, the
   * person, or the session. A link must never contain any of them. The check is
   * on the produced link rather than on intent, so adding a private field to the
   * requirement later fails here rather than shipping.
   */
  const LEAK_KEYS = [
    'filename',
    'file',
    'content',
    'bytes',
    'data',
    'text',
    'message',
    'email',
    'phone',
    'account',
    'person',
    'user',
    'token',
    'secret',
    'hash',
    'path',
    'redirect',
    'callback',
    'webhook',
  ];

  it('produces only allowlisted keys, for every requirement', () => {
    const fragment = toFragment(FULL);
    for (const pair of fragment.split('&')) {
      const key = pair.split('=')[0]!;
      expect(FILE_PROMPT_KEYS).toContain(key);
    }
  });

  it('contains none of the keys that could carry private data', () => {
    const fragment = toFragment({
      ...FULL,
      exactWidth: 600,
      exactHeight: 600,
      fit: 'crop',
      keepTransparency: true,
    });
    for (const key of LEAK_KEYS) {
      expect(FILE_PROMPT_KEYS).not.toContain(key);
      expect(fragment).not.toContain(`${key}=`);
    }
  });

  it('ignores a leak key someone adds to a link by hand', () => {
    const crafted = `v=${FILE_PROMPT_VERSION}&f=png&${LEAK_KEYS.map(
      (key) => `${key}=secretvalue`,
    ).join('&')}`;
    const arrival = readFragment(crafted);
    expect(arrival.requirement).toEqual({ format: 'image/png' });
    expect(JSON.stringify(arrival.requirement)).not.toContain('secretvalue');
  });

  it('never carries a blob, object or data URL even if one is injected', () => {
    for (const hostile of [
      'blob:abcd-1234',
      'data:image/png;base64,iVBORw0KGgo=',
      '/Users/someone/photo.jpg',
      'C:\\Users\\someone\\photo.jpg',
    ]) {
      const arrival = readFragment(
        `v=1&f=png&bg=${encodeURIComponent(hostile)}`,
      );
      expect(arrival.requirement.background).toBeUndefined();
      expect(JSON.stringify(arrival.requirement)).not.toContain('blob:');
      expect(JSON.stringify(arrival.requirement)).not.toContain('data:');
    }
  });
});

describe('a hostile or stale fragment is refused, never guessed at', () => {
  it('refuses a version this build does not read', () => {
    const arrival = readFragment(`v=99&f=png`);
    expect(arrival.wrongVersion).toBe(true);
    expect(arrival.requirement).toEqual({});
  });

  it('accepts a fragment with no version at all as the current version', () => {
    // Being lenient here costs nothing: every value is still sanitised.
    expect(readFragment('f=png').requirement).toEqual({ format: 'image/png' });
  });

  it('drops out-of-range numbers rather than clamping them', () => {
    expect(readFragment('v=1&mw=99999').requirement.maxWidth).toBeUndefined();
    expect(readFragment('v=1&q=500').requirement.quality).toBeUndefined();
    expect(readFragment('v=1&b=1').requirement.maxBytes).toBeUndefined();
    expect(readFragment('v=1&mw=-10').requirement.maxWidth).toBeUndefined();
    expect(readFragment('v=1&mw=abc').requirement.maxWidth).toBeUndefined();
    expect(
      readFragment('v=1&mw=Infinity').requirement.maxWidth,
    ).toBeUndefined();
    expect(readFragment('v=1&mw=1e400').requirement.maxWidth).toBeUndefined();
  });

  it('says what it dropped', () => {
    expect(readFragment('v=1&q=500').dropped.length).toBeGreaterThan(0);
  });

  it('cannot be made to pollute a prototype', () => {
    const arrival = readFragment('v=1&__proto__=polluted&constructor=x&f=png');
    expect(arrival.requirement).toEqual({ format: 'image/png' });
    expect(Object.getPrototypeOf(arrival.requirement)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('refuses an unsupported format written into the link', () => {
    expect(readFragment('v=1&f=gif').requirement.format).toBeUndefined();
    expect(readFragment('v=1&f=image/gif').requirement.format).toBeUndefined();
    expect(readFragment('v=1&f=heic').requirement.format).toBeUndefined();
  });

  it('refuses a fit value the compiler does not implement', () => {
    expect(
      readFragment('v=1&ew=10&eh=10&fit=cover').requirement.fit,
    ).toBeUndefined();
  });

  it('does not throw on nonsense', () => {
    for (const fragment of [
      '&&&&',
      '=',
      'v',
      'v=1&',
      '%%%%',
      'a'.repeat(5000),
      'v=1&f=png&f=jpeg',
    ]) {
      expect(() => readFragment(fragment)).not.toThrow();
    }
  });

  it('takes the first value when a key is repeated', () => {
    expect(readFragment('v=1&f=png&f=jpeg').requirement.format).toBe(
      'image/png',
    );
  });
});
