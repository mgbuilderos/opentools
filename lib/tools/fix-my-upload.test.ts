import { describe, expect, it } from 'vitest';

import {
  FIX_PROTOCOL,
  FIX_PROTOCOL_VERSION,
  INTEGRATOR_HELLO,
  OPENTOOLS_CANCELLED,
  OPENTOOLS_READY,
  OPENTOOLS_RESULT,
  cancelledMessage,
  describeReturnTarget,
  isReturnableOrigin,
  readIntegratorHello,
  readOpenToolsMessage,
  readyMessage,
  resultMessage,
} from './fix-my-upload';
import { ASK_REQUESTS } from './ask-link';

/**
 * Fix My Upload's transport, at the level that matters.
 *
 * This module carries a requirement and a finished file across a window
 * boundary, which makes it the one place in this feature where a mistake hands
 * somebody's document to a site they did not choose. So these tests are mostly
 * about refusal: what a hostile or malformed message must NOT be able to do.
 *
 * The single most important property, and the one the whole design rests on:
 * **the destination origin comes from the `MessageEvent`, never from the
 * payload.** `readIntegratorHello` takes it as a separate argument for exactly
 * that reason, and the first test below is what stops a future refactor from
 * quietly reading it out of `data`.
 */

const ORIGIN = 'https://recruiter.test';

function hello(overrides: Record<string, unknown> = {}) {
  return {
    channel: FIX_PROTOCOL,
    version: FIX_PROTOCOL_VERSION,
    type: INTEGRATOR_HELLO,
    request: 'image',
    values: { format: 'jpeg', width: 1200 },
    ...overrides,
  };
}

describe('the destination origin', () => {
  /*
   * THE GATE. A `?return=` parameter or an origin read out of the payload would
   * mean an attacker picks where the file goes: send someone a link naming your
   * own origin and the corrected document arrives at your server. The browser
   * supplies `MessageEvent.origin` and a page cannot forge it, so that is the
   * only thing this module will use.
   */
  it('is never taken from the message body', () => {
    const smuggled = readIntegratorHello(
      hello({
        origin: 'https://evil.test',
        returnTo: 'https://evil.test',
        targetOrigin: 'https://evil.test',
        return: 'https://evil.test',
      }),
      ORIGIN,
    );
    expect(smuggled?.origin).toBe(ORIGIN);
    expect(JSON.stringify(smuggled)).not.toContain('evil.test');
  });

  it('refuses anything that is not a bare, secure origin', () => {
    for (const bad of [
      'http://recruiter.test', // plaintext: readable in transit
      'https://recruiter.test/', // a trailing slash is a path, not an origin
      'https://recruiter.test/upload', // a path
      'https://recruiter.test?a=1',
      'https://recruiter.test#x',
      'https://user:pw@recruiter.test',
      'ftp://recruiter.test',
      'javascript:alert(1)',
      'data:text/html,x',
      'null', // a sandboxed or file:// document
      '*', // the wildcard this module must never accept
      '',
      '   ',
      'recruiter.test',
      `https://${'a'.repeat(3000)}.test`,
    ]) {
      expect(isReturnableOrigin(bad), bad).toBe(false);
      expect(readIntegratorHello(hello(), bad), bad).toBeNull();
    }
  });

  it('accepts a real https origin, with or without a port', () => {
    for (const good of [
      'https://recruiter.test',
      'https://recruiter.test:8443',
      'https://sub.domain.recruiter.test',
    ]) {
      expect(isReturnableOrigin(good), good).toBe(true);
    }
  });

  /*
   * The one plaintext exception, and it is narrow: a local development host
   * cannot be reached from another machine, so an integrator building against
   * this on their laptop is not exposing anybody.
   */
  it('allows http only for local development hosts', () => {
    for (const local of [
      'http://localhost',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://app.localhost:3000',
    ]) {
      expect(isReturnableOrigin(local), local).toBe(true);
    }
    expect(isReturnableOrigin('http://localhost.evil.test')).toBe(false);
    expect(isReturnableOrigin('http://notlocalhost')).toBe(false);
  });

  it('is shown to the person as the host they can judge', () => {
    expect(describeReturnTarget('https://recruiter.test')).toBe(
      'recruiter.test',
    );
    expect(describeReturnTarget('https://recruiter.test:8443')).toBe(
      'recruiter.test:8443',
    );
  });
});

describe('a hello from an integrating page', () => {
  it('is read only when the whole envelope matches', () => {
    expect(readIntegratorHello(hello(), ORIGIN)).not.toBeNull();

    expect(readIntegratorHello(hello({ channel: 'other' }), ORIGIN)).toBeNull();
    expect(readIntegratorHello(hello({ version: 2 }), ORIGIN)).toBeNull();
    expect(readIntegratorHello(hello({ version: '1' }), ORIGIN)).toBeNull();
    expect(readIntegratorHello(hello({ type: 'result' }), ORIGIN)).toBeNull();
    // Unrelated postMessage traffic — a framework's own handshake, an
    // extension — must never be mistaken for ours.
    expect(readIntegratorHello({ type: 'webpackOk' }, ORIGIN)).toBeNull();
    expect(readIntegratorHello('a string', ORIGIN)).toBeNull();
    expect(readIntegratorHello(null, ORIGIN)).toBeNull();
    expect(readIntegratorHello(undefined, ORIGIN)).toBeNull();
    expect(readIntegratorHello(42, ORIGIN)).toBeNull();
  });

  it('resolves only request types this build declares', () => {
    for (const request of ASK_REQUESTS) {
      expect(
        readIntegratorHello(hello({ request: request.id }), ORIGIN)?.request,
      ).toBe(request);
    }
    for (const unknown of [
      'not-a-request',
      '',
      '__proto__',
      'constructor',
      'toString',
      42,
      null,
      { id: 'image' },
    ]) {
      expect(
        readIntegratorHello(hello({ request: unknown }), ORIGIN),
        String(unknown),
      ).toBeNull();
    }
  });

  /*
   * An integrator cannot widen what its own request may ask for. The values go
   * through the request's own sanitiser, which filters against the declaration
   * rather than against this module's idea of what is reasonable.
   */
  it('drops every setting the request does not declare', () => {
    const read = readIntegratorHello(
      hello({
        values: {
          format: 'jpeg',
          width: 1200,
          quality: 99999, // out of bounds
          height: 'abc', // wrong type
          filename: 'passport-scan.pdf',
          content: 'secret',
          callback: 'https://evil.test',
          token: 'sk-live-1',
        },
      }),
      ORIGIN,
    );
    expect(read?.values).toEqual({ format: 'jpeg', width: 1200 });
  });

  it('survives values that are not an object at all', () => {
    for (const junk of ['x', 42, null, undefined, []]) {
      const read = readIntegratorHello(hello({ values: junk }), ORIGIN);
      expect(read, String(junk)).not.toBeNull();
      expect(read?.values).toEqual({});
    }
  });

  it('cannot be used to reach Object.prototype', () => {
    const read = readIntegratorHello(
      hello({ values: JSON.parse('{"__proto__":{"polluted":1}}') }),
      ORIGIN,
    );
    expect(read?.values).toEqual({});
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
  });
});

describe('what this window sends back', () => {
  it('stamps every message with the channel and version', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'fixed.jpg', {
      type: 'image/jpeg',
    });
    for (const message of [
      readyMessage(),
      resultMessage(file),
      cancelledMessage('declined'),
    ]) {
      expect(message.channel).toBe(FIX_PROTOCOL);
      expect(message.version).toBe(FIX_PROTOCOL_VERSION);
    }
  });

  it('carries the File itself, not a copy of its text', () => {
    // A structured clone moves the bytes between windows in one process. The
    // moment this became base64 or a data URL it would be a different, worse
    // product — and a much larger message.
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'fixed.jpg', {
      type: 'image/jpeg',
    });
    const message = resultMessage(file);
    expect(message.file).toBe(file);
    expect(JSON.stringify(Object.keys(message)).includes('base64')).toBe(false);
  });

  it('never contains a wildcard target', () => {
    // `postMessage(data, '*')` would hand the file to whatever window is
    // listening. This module produces no target at all — the caller uses the
    // origin from the event — and nothing it emits may contain one.
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const serialised = JSON.stringify([
      readyMessage(),
      cancelledMessage('dismissed'),
      { ...resultMessage(file), file: undefined },
    ]);
    expect(serialised).not.toContain('"*"');
  });
});

describe('what the integrating page reads back', () => {
  it('accepts the three messages this window sends', () => {
    expect(readOpenToolsMessage(readyMessage())).toEqual({
      type: OPENTOOLS_READY,
    });
    expect(readOpenToolsMessage(cancelledMessage('declined'))).toEqual({
      type: OPENTOOLS_CANCELLED,
      reason: 'declined',
    });
    const file = new File(['x'], 'fixed.jpg', { type: 'image/jpeg' });
    expect(readOpenToolsMessage(resultMessage(file))).toEqual({
      type: OPENTOOLS_RESULT,
      file,
    });
  });

  it('refuses a result that is not really a File', () => {
    // A page that could talk an SDK into treating an arbitrary object as a File
    // would be a way to inject whatever it liked into the integrator's form.
    for (const fake of [
      { name: 'fixed.jpg', size: 3, type: 'image/jpeg' },
      'fixed.jpg',
      new Blob(['x']),
      null,
    ]) {
      expect(
        readOpenToolsMessage({
          channel: FIX_PROTOCOL,
          version: FIX_PROTOCOL_VERSION,
          type: OPENTOOLS_RESULT,
          file: fake,
        }),
        String(fake),
      ).toBeNull();
    }
  });

  it('ignores traffic from another channel or version', () => {
    expect(readOpenToolsMessage({ type: OPENTOOLS_READY })).toBeNull();
    expect(
      readOpenToolsMessage({
        channel: 'other',
        version: FIX_PROTOCOL_VERSION,
        type: OPENTOOLS_READY,
      }),
    ).toBeNull();
    expect(
      readOpenToolsMessage({
        channel: FIX_PROTOCOL,
        version: 99,
        type: OPENTOOLS_READY,
      }),
    ).toBeNull();
    expect(readOpenToolsMessage({ channel: FIX_PROTOCOL, version: 1 })).toBeNull();
  });

  it('normalises an unrecognised cancellation reason rather than trusting it', () => {
    expect(
      readOpenToolsMessage({
        channel: FIX_PROTOCOL,
        version: FIX_PROTOCOL_VERSION,
        type: OPENTOOLS_CANCELLED,
        reason: '<img src=x onerror=1>',
      }),
    ).toEqual({ type: OPENTOOLS_CANCELLED, reason: 'dismissed' });
  });
});
