import { describe, expect, it, vi } from 'vitest';

import {
  CHAINABLE_OUTPUT_MAX_BYTES,
  announceCompletion,
  type CompletionDetail,
  type CompletionOutput,
} from '@/lib/completion';

/**
 * The produced file a finished job may announce, and what the boundary does to
 * it before the receipt is allowed to hand it to `lib/file-handoff.ts`.
 *
 * Kept out of `lib/completion.test.ts` deliberately: that file is also edited by
 * the open product-telemetry branch, and two lanes rewriting one test file is
 * how a merge silently drops assertions.
 */
function announced(output: CompletionOutput | undefined) {
  const dispatchEvent = vi.fn();
  vi.stubGlobal('window', { dispatchEvent });
  announceCompletion({
    operation: 'Compress PDF',
    durationMs: 12,
    ...(output ? { output } : {}),
  });
  vi.unstubAllGlobals();
  const event = dispatchEvent.mock.calls[0]?.[0] as
    | CustomEvent<CompletionDetail>
    | undefined;
  return event?.detail.output;
}

function bytes(length: number, fill = 7) {
  return new Uint8Array(length).fill(fill);
}

describe('the produced file a receipt may offer the next operation on', () => {
  it('carries a real output through to the receipt unchanged', () => {
    const output = announced({
      name: 'compressed.pdf',
      type: 'application/pdf',
      bytes: bytes(4),
    });
    expect(output).toEqual({
      name: 'compressed.pdf',
      type: 'application/pdf',
      bytes: bytes(4),
    });
  });

  it('announces nothing when the tool announced nothing, which is most tools', () => {
    expect(announced(undefined)).toBeUndefined();
  });

  /**
   * A job that produced no bytes has no next operation. Letting it through
   * would put buttons on the receipt that hand an empty file to a tool.
   */
  it('drops an empty output rather than offering an empty file', () => {
    expect(
      announced({ name: 'out.pdf', type: 'application/pdf', bytes: bytes(0) }),
    ).toBeUndefined();
  });

  it('drops anything that is not actually a byte array', () => {
    expect(
      announced({
        name: 'out.pdf',
        type: 'application/pdf',
        // The mistake this catches: handing over the worker's `ArrayBuffer`
        // straight from the protocol, which has a `byteLength` and would
        // otherwise reach `new File([...])` as an opaque object.
        bytes: new ArrayBuffer(8) as unknown as Uint8Array,
      }),
    ).toBeUndefined();
  });

  it('reduces the name to a basename, so a tool cannot choose a path', () => {
    expect(
      announced({
        name: '../../etc/invoice.pdf',
        type: 'application/pdf',
        bytes: bytes(2),
      })?.name,
    ).toBe('invoice.pdf');
    expect(
      announced({
        name: 'C:\\Users\\me\\scan.pdf',
        type: 'application/pdf',
        bytes: bytes(2),
      })?.name,
    ).toBe('scan.pdf');
  });

  it('strips control characters from the name and bounds its length', () => {
    const output = announced({
      name: `re\u0007port${'x'.repeat(400)}.pdf`,
      type: 'application/pdf',
      bytes: bytes(2),
    });
    expect(output?.name).not.toContain('\u0007');
    expect(output?.name.length).toBe(120);
  });

  it('drops an output whose name is nothing but separators', () => {
    expect(
      announced({ name: '///', type: 'application/pdf', bytes: bytes(2) }),
    ).toBeUndefined();
  });

  /**
   * The ceiling exists because the bytes are held three times at once — by the
   * tool for its download, by this event while the card is open, and by the
   * handoff transaction. See `CHAINABLE_OUTPUT_MAX_BYTES`.
   *
   * `byteLength` is redefined rather than allocating 64 MiB inside a unit test:
   * the assertion is about the boundary's arithmetic, and the allocation would
   * add nothing but time and memory to every run of the suite.
   */
  it('refuses an output too large to hold three copies of', () => {
    const oversize = bytes(8);
    Object.defineProperty(oversize, 'byteLength', {
      value: CHAINABLE_OUTPUT_MAX_BYTES + 1,
    });
    expect(
      announced({ name: 'huge.pdf', type: 'application/pdf', bytes: oversize }),
    ).toBeUndefined();

    const atLimit = bytes(8);
    Object.defineProperty(atLimit, 'byteLength', {
      value: CHAINABLE_OUTPUT_MAX_BYTES,
    });
    expect(
      announced({ name: 'big.pdf', type: 'application/pdf', bytes: atLimit }),
    ).toBeDefined();
  });

  it('keeps an empty MIME type rather than inventing one', () => {
    // The receipt substitutes `application/octet-stream` when it builds the
    // `File`; guessing here would put a wrong type in the handoff store, where
    // `inputAccepts` reads it to decide which input will take the file.
    expect(
      announced({ name: 'thing.bin', type: '', bytes: bytes(2) })?.type,
    ).toBe('');
  });
});
