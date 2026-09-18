import { describe, expect, it } from 'vitest';

import {
  publishableFacts,
  sanitiseFact,
  sanitiseOperation,
  type ProofFact,
} from './proof-card';

/**
 * The proof card is the one thing this product publishes on a user's behalf,
 * so the only interesting question about it is what it refuses to publish.
 *
 * Learning 35 permits sharing the task and forbids sharing the artifact:
 * "not a user artifact, filename, QR payload, secret, or private parameter".
 * Metrics reach the card from a dozen different tool components, and any one
 * of them could begin passing a filename without anyone noticing — which
 * would quietly put user data on social media. These fix the fail-closed
 * behaviour so that cannot happen silently.
 */
describe('proof card refuses to publish user data', () => {
  const leaks: Array<[string, ProofFact]> = [
    ['a filename', { label: 'File', value: 'Q3-payroll.pdf' }],
    ['a filename in the label', { label: 'invoice.docx', value: '2 pages' }],
    ['a unix path', { label: 'Source', value: '/Users/maulik/tax' }],
    ['a windows path', { label: 'Source', value: 'C:\\Users\\m\\id' }],
    ['an email', { label: 'Owner', value: 'someone@example.org' }],
    ['a UPI handle', { label: 'Paid', value: 'name@oksbi' }],
    ['an IP address', { label: 'Host', value: '192.168.1.14' }],
    ['a token', { label: 'Key', value: 'sk_live_51H8xKqAbCdEf' }],
    ['a URL', { label: 'From', value: 'https' }],
    ['a long value', { label: 'Note', value: 'x'.repeat(40) }],
    ['a long label', { label: 'y'.repeat(30), value: '12' }],
    ['an empty value', { label: 'Pages', value: '  ' }],
  ];

  it.each(leaks)('drops %s', (_name, fact) => {
    expect(sanitiseFact(fact)).toBeNull();
  });

  const safe: ProofFact[] = [
    { label: 'Size', value: '2.4 MB → 380 KB' },
    { label: 'Smaller by', value: '84%' },
    { label: 'Pages', value: '12' },
    { label: 'Took', value: '0.82 s' },
  ];

  it.each(safe)('keeps the harmless fact $label', (fact) => {
    expect(sanitiseFact(fact)).toEqual(fact);
  });

  it('keeps at most three facts, in order', () => {
    const kept = publishableFacts([
      { label: 'Size', value: '2.4 MB → 380 KB' },
      { label: 'File', value: 'secret.pdf' }, // dropped
      { label: 'Pages', value: '12' },
      { label: 'Smaller by', value: '84%' },
      { label: 'Extra', value: '9' },
    ]);
    expect(kept.map((f) => f.label)).toEqual(['Size', 'Pages', 'Smaller by']);
  });

  it('falls back when an operation name carries a filename', () => {
    // A tool naming its operation after the file is the subtle version of the
    // same leak, and the heading is the largest text on the card.
    expect(sanitiseOperation('Compressed Q3-payroll.pdf')).toBe('A task');
    expect(sanitiseOperation('  ')).toBe('A task');
    expect(sanitiseOperation('Compress PDF')).toBe('Compress PDF');
  });

  it('never lets a dropped fact become a placeholder', () => {
    // Substituting "(hidden)" would invite someone to relax the rule later,
    // and tells the viewer something was withheld. Omission says nothing.
    const kept = publishableFacts([{ label: 'File', value: 'secret.pdf' }]);
    expect(kept).toEqual([]);
  });
});
