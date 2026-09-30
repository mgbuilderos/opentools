import { describe, expect, it } from 'vitest';
import {
  ceilingBytes,
  ceilingSentence,
  oversizeMessage,
  toolCapability,
  type ToolFileLimit,
} from './file-limit';

const MIB = 1024 * 1024;

const buffered: ToolFileLimit = {
  inputLimitBytes: 50 * MIB,
  because: 'the whole workbook is read in this tab',
};

const streaming: ToolFileLimit = {
  inputLimitBytes: 2 * 1024 * MIB,
  streams: true,
  because: 'that is as far as browser file handling reaches',
};

describe('tool page file limits', () => {
  it('enforces the stated ceiling when nothing narrows it', () => {
    const report = toolCapability(buffered, {});
    expect(ceilingBytes(report, buffered)).toBe(50 * MIB);
    expect(report.limitingFactor).toBe('operation');
    expect(ceilingSentence(report, buffered)).toBe(
      'Up to 50 MB per file, because the whole workbook is read in this tab.',
    );
  });

  /**
   * The point of routing a page through the report rather than a constant: a
   * device that cannot hold what the page states gets the smaller number, and
   * the sentence says which one it is.
   */
  it('narrows a buffered ceiling to what the device can hold', () => {
    const limit: ToolFileLimit = { ...buffered, workingSetMultiplier: 4 };
    const report = toolCapability(limit, { heapLimitBytes: 80 * MIB });
    expect(ceilingBytes(report, limit)).toBe(20 * MIB);
    expect(ceilingSentence(report, limit)).toContain(
      'Up to 20 MB per file on this device',
    );
  });

  it('never widens past what the page declared', () => {
    const limit: ToolFileLimit = { ...buffered, workingSetMultiplier: 1 };
    const report = toolCapability(limit, { heapLimitBytes: 8 * 1024 * MIB });
    expect(ceilingBytes(report, limit)).toBe(50 * MIB);
  });

  /**
   * A streaming page's ceiling is about file handling, not memory, so no heap
   * figure may narrow it and the sentence must not imply the file is held.
   */
  it('leaves a streaming ceiling alone and says the file is not held', () => {
    const report = toolCapability(streaming, { heapLimitBytes: 64 * MIB });
    expect(report.streamable).toBe(true);
    expect(ceilingBytes(report, streaming)).toBe(2 * 1024 * MIB);
    expect(ceilingSentence(report, streaming)).toBe(
      'Up to 2.0 GB per file, because that is as far as browser file handling reaches. The file is read in slices, never held in memory whole.',
    );
  });

  it('refuses only what is over the ceiling', () => {
    const report = toolCapability(buffered, {});
    expect(oversizeMessage(report, 50 * MIB, buffered)).toBeNull();
    expect(oversizeMessage(report, 50 * MIB + 1, buffered)).toContain(
      'That file is 50 MB.',
    );
  });

  it('names the file when a page handles more than one', () => {
    const report = toolCapability(buffered, {});
    expect(oversizeMessage(report, 90 * MIB, buffered, 'ledger.xlsx')).toBe(
      'ledger.xlsx is 90 MB. Up to 50 MB per file, because the whole workbook is read in this tab.',
    );
  });
});
