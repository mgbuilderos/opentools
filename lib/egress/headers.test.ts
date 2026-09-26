import { describe, expect, it } from 'vitest';

import { normaliseTarget, parsePastedHeaders } from './headers';
import { verdictFor } from './verdict';

describe('parsePastedHeaders', () => {
  it('reads a curl -I dump', () => {
    const parsed = parsePastedHeaders(
      [
        'HTTP/2 200',
        'content-type: text/html; charset=utf-8',
        "content-security-policy: default-src 'self'; connect-src 'none'",
        'x-content-type-options: nosniff',
      ].join('\n'),
    );
    expect(parsed.source).toBe('headers');
    expect(verdictFor(parsed.policies).verdict).toBe('BLOCKED');
  });

  it('distinguishes a report-only header', () => {
    const parsed = parsePastedHeaders(
      "Content-Security-Policy-Report-Only: connect-src 'none'",
    );
    expect(parsed.policies[0]?.reportOnly).toBe(true);
    expect(verdictFor(parsed.policies).verdict).toBe('CAPABLE');
  });

  it('keeps both headers when a response sends two', () => {
    const parsed = parsePastedHeaders(
      [
        'content-security-policy: connect-src https://a.example',
        "content-security-policy: connect-src 'none'",
      ].join('\n'),
    );
    expect(parsed.policies).toHaveLength(2);
    expect(verdictFor(parsed.policies).verdict).toBe('BLOCKED');
  });

  /*
   * Terminal output wraps. A pasted header folded across lines is the normal
   * case for a long policy, and dropping the continuation would silently judge
   * a page on half its policy -- the failure mode where the tool is confidently
   * wrong rather than unhelpfully blank.
   */
  it('rejoins a folded header value', () => {
    const parsed = parsePastedHeaders(
      "content-security-policy: default-src 'self';\n    connect-src 'none'",
    );
    expect(verdictFor(parsed.policies).verdict).toBe('BLOCKED');
  });

  it('accepts a bare policy, because people copy one header value', () => {
    const parsed = parsePastedHeaders("default-src 'self'; connect-src 'none'");
    expect(parsed.source).toBe('bare-policy');
    expect(verdictFor(parsed.policies).verdict).toBe('BLOCKED');
  });

  it('reports an unrecognisable paste as empty rather than guessing', () => {
    expect(parsePastedHeaders('hello there').empty).toBe(true);
    expect(parsePastedHeaders('<html><body>nope</body></html>').empty).toBe(
      true,
    );
    expect(parsePastedHeaders('   ').empty).toBe(true);
  });

  it('does not treat a following header as part of the policy', () => {
    const parsed = parsePastedHeaders(
      ["content-security-policy: connect-src 'none'", 'server: example'].join(
        '\n',
      ),
    );
    expect(parsed.policies[0]?.policy).toBe("connect-src 'none'");
  });
});

describe('normaliseTarget', () => {
  it('adds a scheme to a bare hostname', () => {
    expect(normaliseTarget('example.com/upload')?.href).toBe(
      'https://example.com/upload',
    );
  });

  it('keeps an explicit scheme', () => {
    expect(normaliseTarget('http://example.com')?.protocol).toBe('http:');
  });

  /*
   * A `javascript:` or `data:` URL in the box is either a mistake or an attempt
   * to have this page echo something executable back into itself. Neither has a
   * useful answer, so neither is accepted.
   */
  it('refuses a non-http scheme', () => {
    expect(normaliseTarget('javascript:alert(1)')).toBeNull();
    expect(normaliseTarget('data:text/html,<script>')).toBeNull();
    expect(normaliseTarget('file:///etc/passwd')).toBeNull();
  });

  it('refuses something that is not a host', () => {
    expect(normaliseTarget('not a url')).toBeNull();
    expect(normaliseTarget('')).toBeNull();
  });
});
