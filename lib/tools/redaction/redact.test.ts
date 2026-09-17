import { describe, expect, it } from 'vitest';

import {
  DETECTION_CATEGORIES,
  DETECTORS,
  findDetections,
  verifyRedacted,
} from './detectors';
import { assertNothingRemains, redactSecrets } from './redact';

const ALL = DETECTION_CATEGORIES;
const AWS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const AWS_KEY_ID_2 = 'AKIAI44QH8DHBEXAMPLE';
const ANTHROPIC = 'sk-ant-api03-' + 'Example0'.repeat(4);
const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjM0NTY3ODkwIn0.' +
  'signature_Example-123';

function scrub(text: string, style: 'numbered' | 'generic' = 'numbered') {
  const result = redactSecrets(text, ALL, style);
  expect(verifyRedacted(result.text, ALL)).toEqual([]);
  return result;
}

describe('redactSecrets', () => {
  it('numbers placeholders in text order and counts per label', () => {
    const { text, counts } = scrub(
      `a ${ANTHROPIC} b ${AWS_KEY_ID} c ${AWS_KEY_ID_2}`,
    );
    expect(text).toBe(
      'a [REDACTED_AWS_ACCESS_KEY_1]'.replace(
        'AWS_ACCESS_KEY_1',
        'ANTHROPIC_API_KEY_1',
      ) + ' b [REDACTED_AWS_ACCESS_KEY_2] c [REDACTED_AWS_ACCESS_KEY_3]',
    );
    expect(counts).toEqual([
      ['AWS_ACCESS_KEY', 2],
      ['ANTHROPIC_API_KEY', 1],
    ]);
  });

  it('uses unnumbered placeholders in generic style', () => {
    expect(scrub(`${AWS_KEY_ID} ${AWS_KEY_ID_2}`, 'generic').text).toBe(
      '[REDACTED_AWS_ACCESS_KEY] [REDACTED_AWS_ACCESS_KEY]',
    );
  });

  it('keeps the variable name and quotes around assigned secrets', () => {
    expect(scrub(`const password = "example-pass";`).text).toBe(
      'const password = "[REDACTED_AUTH_SECRET_1]";',
    );
    expect(scrub('amqp://guest:examplePass@queue:5672').text).toBe(
      'amqp://guest:[REDACTED_URL_PASSWORD_1]@queue:5672',
    );
  });

  it('merges overlapping detections into one placeholder', () => {
    // The connection string contains an email-shaped `user:pass@host` part.
    expect(
      scrub('db = "postgres://admin:pass@db.example.com:5432/x"').text,
    ).toBe('db = "[REDACTED_DB_CONNECTION_STRING_1]"');
    // A JWT inside a Bearer header.
    expect(scrub(`Authorization: Bearer ${JWT}`).text).toBe(
      'Authorization: [REDACTED_BEARER_TOKEN_1]',
    );
    // An email that starts inside a webhook URL and ends after it.
    const webhook =
      'hooks.slack.com/services/T00000000/B00000000/XXXXuser.name@example.com';
    expect(scrub(webhook).text).toBe('[REDACTED_SLACK_WEBHOOK_1]');
  });

  it('redacts adjacent secrets separately', () => {
    expect(scrub(`${AWS_KEY_ID},${AWS_KEY_ID_2}`).text).toBe(
      '[REDACTED_AWS_ACCESS_KEY_1],[REDACTED_AWS_ACCESS_KEY_2]',
    );
    expect(scrub(`"${ANTHROPIC}""${AWS_KEY_ID}"`).text).toBe(
      '"[REDACTED_ANTHROPIC_API_KEY_1]""[REDACTED_AWS_ACCESS_KEY_2]"',
    );
  });

  it('handles secrets at the start and end of the text', () => {
    expect(scrub(`${AWS_KEY_ID} middle ${JWT}`).text).toBe(
      '[REDACTED_AWS_ACCESS_KEY_1] middle [REDACTED_JWT_2]',
    );
  });

  it('handles secrets across CRLF and LF lines', () => {
    const text = [
      'DB_PASSWORD=examplepass',
      '-----BEGIN PRIVATE KEY-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC',
      '-----END PRIVATE KEY-----',
      `export API_KEY=${AWS_KEY_ID}`,
      'ops@example.com',
    ].join('\r\n');
    expect(scrub(text).text).toBe(
      [
        'DB_PASSWORD=[REDACTED_AUTH_SECRET_1]',
        '[REDACTED_PRIVATE_KEY_2]',
        'export API_KEY=[REDACTED_AWS_ACCESS_KEY_3]',
        '[REDACTED_EMAIL_4]',
      ].join('\r\n'),
    );
  });

  it('keeps offsets correct around non-ASCII text and emoji', () => {
    const text = `Schlüssel 🔑 ${AWS_KEY_ID} für José — ops@example.com ✅`;
    expect(scrub(text).text).toBe(
      'Schlüssel 🔑 [REDACTED_AWS_ACCESS_KEY_1] für José — [REDACTED_EMAIL_2] ✅',
    );
  });

  it('returns empty input unchanged', () => {
    expect(scrub('')).toEqual({ text: '', counts: [] });
  });

  it('leaves text without secrets unchanged', () => {
    const prose =
      'Pass a Bearer-style header, read process.env.API_KEY, and call ' +
      'client.login(password) on version 1.2.3 at 1726531200000 ms.';
    expect(redactSecrets(prose, ALL, 'numbered').text).toBe(prose);
  });

  it('scrubs 1 MB of mixed log text within 3 seconds', () => {
    const line =
      `2026-09-17T10:00:00Z INFO user=ops@example.com ip=10.0.0.1 ` +
      `key=${AWS_KEY_ID} card=4111111111111111 msg="päyload ok"\n`;
    const input = line.repeat(Math.ceil(1_000_000 / line.length));
    const started = performance.now();
    const { text } = redactSecrets(input, ALL, 'numbered');
    assertNothingRemains(text, ALL);
    expect(performance.now() - started).toBeLessThan(3000);
    expect(text).not.toContain(AWS_KEY_ID);
  });

  it('scans 1 MB of unbroken text within 3 seconds', () => {
    for (const input of [
      'a'.repeat(1_000_000),
      'A1'.repeat(500_000),
      '9'.repeat(1_000_000),
    ]) {
      const started = performance.now();
      expect(findDetections(input, ALL)).toEqual([]);
      expect(performance.now() - started).toBeLessThan(3000);
    }
  });
});

describe('placeholders', () => {
  const labels = [...new Set(DETECTORS.map((detector) => detector.label))];
  const contexts = [
    (token: string) => token,
    (token: string) => `password = "${token}"`,
    (token: string) => `DB_PASSWORD=${token}`,
    (token: string) => `aws_secret_access_key = ${token}`,
    (token: string) => `amqp://guest:${token}@queue`,
    (token: string) => `Bearer ${token}`,
    (token: string) => `${token}@example`,
    (token: string) => `${token}${token}\n${token}`,
  ];

  it('never match a detector in the contexts the scrubber leaves them in', () => {
    for (const label of labels) {
      for (const token of [
        `[REDACTED_${label}]`,
        `[REDACTED_${label}_1]`,
        `[REDACTED_${label}_1234567890123456]`,
      ]) {
        for (const context of contexts) {
          expect(verifyRedacted(context(token), ALL), context(token)).toEqual(
            [],
          );
        }
      }
    }
  });
});

describe('assertNothingRemains', () => {
  it('passes scrubbed output', () => {
    const { text } = redactSecrets(
      `${AWS_KEY_ID} dev@example.com`,
      ALL,
      'numbered',
    );
    expect(() => assertNothingRemains(text, ALL)).not.toThrow();
  });

  it('throws with categories and counts, never the secret', () => {
    const leaked = `${AWS_KEY_ID} ${ANTHROPIC} dev@example.com`;
    let message = '';
    try {
      assertNothingRemains(leaked, ALL);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toBe(
      'Scrub stopped: 2 API keys or credentials and 1 email address could not be removed. No output is shown.',
    );
    expect(message).not.toContain(AWS_KEY_ID);
    expect(message).not.toContain(ANTHROPIC);
    expect(message).not.toContain('dev@example.com');
  });

  it('checks only the categories the user enabled', () => {
    expect(() =>
      assertNothingRemains('dev@example.com 10.0.0.1', ['key']),
    ).not.toThrow();
    expect(() => assertNothingRemains('10.0.0.1', ['ip'])).toThrow(
      'Scrub stopped: 1 IPv4 address could not be removed. No output is shown.',
    );
  });
});
