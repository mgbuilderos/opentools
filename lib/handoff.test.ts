import { describe, expect, it } from 'vitest';

import {
  HANDOFF_PARAM,
  handoffIdFromSearch,
  withHandoffParam,
} from './handoff';

describe('withHandoffParam', () => {
  it('adds the first query parameter', () => {
    expect(withHandoffParam('/pdf/merge', 'abc')).toBe(
      `/pdf/merge?${HANDOFF_PARAM}=abc`,
    );
  });

  it('keeps a query string the href already carries', () => {
    expect(withHandoffParam('/pdf/page-tools?tool=rotate-pdf', 'abc')).toBe(
      `/pdf/page-tools?tool=rotate-pdf&${HANDOFF_PARAM}=abc`,
    );
  });

  it('keeps a fragment at the end', () => {
    expect(withHandoffParam('/file/workbench#tool', 'abc')).toBe(
      `/file/workbench?${HANDOFF_PARAM}=abc#tool`,
    );
  });

  it('escapes the id', () => {
    expect(withHandoffParam('/pdf/merge', 'a b&c')).toBe(
      `/pdf/merge?${HANDOFF_PARAM}=a%20b%26c`,
    );
  });

  it('returns the href unchanged when there is no id', () => {
    expect(withHandoffParam('/pdf/merge', '')).toBe('/pdf/merge');
  });
});

describe('handoffIdFromSearch', () => {
  it('reads the id', () => {
    expect(handoffIdFromSearch(`?${HANDOFF_PARAM}=abc`)).toBe('abc');
  });

  it('reads the id alongside another parameter', () => {
    expect(handoffIdFromSearch(`?tool=rotate-pdf&${HANDOFF_PARAM}=abc`)).toBe(
      'abc',
    );
  });

  it('returns null when absent', () => {
    expect(handoffIdFromSearch('?tool=rotate-pdf')).toBeNull();
  });

  it('refuses an oversized value rather than querying with it', () => {
    expect(
      handoffIdFromSearch(`?${HANDOFF_PARAM}=${'x'.repeat(65)}`),
    ).toBeNull();
  });
});
