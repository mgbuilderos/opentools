import { describe, expect, it } from 'vitest';

import {
  DETECTION_CATEGORIES,
  DETECTORS,
  findDetections,
  passesLuhn,
  verifyRedacted,
  type DetectionCategory,
} from './detectors';

// Synthetic values only. Token-shaped strings are assembled from parts so the
// source file itself never contains something that looks like a live key.
const AWS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE'; // AWS documentation example
const AWS_SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'; // AWS documentation example
const ANTHROPIC = 'sk-ant-api03-' + 'Example0'.repeat(4);
const OPENAI = 'sk-proj-' + 'Example0'.repeat(4);
const STRIPE = 'sk_' + 'test_' + '0'.repeat(24);
const GITHUB = 'ghp_' + 'A1'.repeat(18);
const GITHUB_PAT = 'github_pat_' + 'B2'.repeat(11) + '_' + 'C3'.repeat(29);
const SLACK = 'xoxb-' + '1234567890-1234567890-' + 'abcd'.repeat(6);
const SLACK_HOOK = 'hooks.slack.com/services/' + 'T00000000/B00000000/XXXXXXXX';
const GOOGLE = 'AIza' + 'Sy' + 'A'.repeat(33);
const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJzdWIiOiIxMjM0NTY3ODkwIn0.' +
  'signature_Example-123';
const ALL = DETECTION_CATEGORIES;

function spans(text: string, categories: readonly DetectionCategory[] = ALL) {
  return findDetections(text, categories).map((detection) => ({
    id: detection.detectorId,
    text: text.slice(detection.start, detection.end),
  }));
}

describe('secret detectors', () => {
  const cases: ReadonlyArray<{
    id: string;
    positive: string;
    secret: string;
    negative: string;
  }> = [
    {
      id: 'pem-private-key',
      positive: `-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----`,
      secret: `-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----`,
      negative: '-----BEGIN PUBLIC KEY-----\nMIIBIj\n-----END PUBLIC KEY-----',
    },
    {
      id: 'aws-access-key-id',
      positive: `key=${AWS_KEY_ID};`,
      secret: AWS_KEY_ID,
      negative: 'key=AKIAIOSFODNN7EXAMPL;',
    },
    {
      id: 'aws-secret-access-key',
      positive: `aws_secret_access_key = ${AWS_SECRET}`,
      secret: AWS_SECRET,
      negative: `aws_secret_access_key = ${AWS_SECRET.slice(1)}`,
    },
    {
      id: 'anthropic-api-key',
      positive: `ANTHROPIC="${ANTHROPIC}"`,
      secret: ANTHROPIC,
      negative: 'sk-ant-short',
    },
    {
      id: 'openai-api-key',
      positive: `OPENAI="${OPENAI}"`,
      secret: OPENAI,
      negative: 'sk-proj-short',
    },
    {
      id: 'stripe-key',
      positive: `stripe(${STRIPE})`,
      secret: STRIPE,
      negative: 'sk_' + 'test_' + '0'.repeat(23),
    },
    {
      id: 'github-token',
      positive: `token: ${GITHUB}`,
      secret: GITHUB,
      negative: 'ghp_' + 'A1'.repeat(17),
    },
    {
      id: 'github-fine-grained-token',
      positive: `token: ${GITHUB_PAT}`,
      secret: GITHUB_PAT,
      negative: 'github_pat_tooShort',
    },
    {
      id: 'slack-token',
      positive: `SLACK ${SLACK}`,
      secret: SLACK,
      negative: 'xoxb-no-numeric-segment-here',
    },
    {
      id: 'slack-webhook',
      positive: `url: ${SLACK_HOOK}`,
      secret: SLACK_HOOK,
      negative: 'hooks.slack.com/apps',
    },
    {
      id: 'google-api-key',
      positive: `key=${GOOGLE}&`,
      secret: GOOGLE,
      negative: `key=${GOOGLE.slice(0, -1)}&`,
    },
    {
      id: 'json-web-token',
      positive: `token ${JWT} end`,
      secret: JWT,
      negative: 'eyJhbGciOiJIUzI1NiJ9 only a header',
    },
    {
      id: 'database-connection-string',
      positive: 'DB="postgres://admin:example@db.internal:5432/main"',
      secret: 'postgres://admin:example@db.internal:5432/main',
      negative: 'Use a postgres database on port 5432.',
    },
    {
      id: 'url-password',
      positive: 'amqp://guest:examplePass@queue.internal:5672',
      secret: 'examplePass',
      negative: 'amqp://queue.internal:5672/vhost',
    },
    {
      id: 'bearer-token',
      positive: 'Authorization: Bearer abc123.def456',
      secret: 'Bearer abc123.def456',
      negative: 'Authorization: Basic abc123',
    },
    {
      id: 'quoted-secret-assignment',
      positive: `password: "example-pass"`,
      secret: 'example-pass',
      negative: `password: "abc"`,
    },
    {
      id: 'env-secret-assignment',
      positive: 'DB_PASSWORD=examplepass # local only',
      secret: 'examplepass',
      negative: 'API_KEY = os.environ["API_KEY"]',
    },
    {
      id: 'email-address',
      positive: 'Contact dev.team+ci@example.co.uk today',
      secret: 'dev.team+ci@example.co.uk',
      negative: 'Contact dev.team at example dot com',
    },
    {
      id: 'ipv4-address',
      positive: 'host 192.168.10.255 up',
      secret: '192.168.10.255',
      negative: 'host 192.168.10.256 up',
    },
    {
      id: 'payment-card-number',
      positive: 'card 4111 1111 1111 1111 exp',
      secret: '4111 1111 1111 1111',
      negative: 'card 4111 1111 1111 1112 exp',
    },
  ];

  it('covers every detector with a positive and a near-miss case', () => {
    expect(cases.map(({ id }) => id).toSorted()).toEqual(
      DETECTORS.map(({ id }) => id).toSorted(),
    );
  });

  for (const { id, positive, secret, negative } of cases) {
    it(`${id}: finds the exact span and ignores a near miss`, () => {
      expect(spans(positive)).toContainEqual({ id, text: secret });
      expect(spans(negative).map((span) => span.id)).not.toContain(id);
    });
  }

  it('labels Anthropic keys as Anthropic, not OpenAI', () => {
    expect(spans(ANTHROPIC).map((span) => span.id)).toEqual([
      'anthropic-api-key',
    ]);
  });

  it('accepts temporary AWS access key IDs', () => {
    expect(spans('ASIAIOSFODNN7EXAMPLE')[0]?.id).toBe('aws-access-key-id');
  });

  it('redacts a private key whose END line is missing to the end of the text', () => {
    const text = 'before\n-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaA';
    expect(spans(text)).toEqual([
      { id: 'pem-private-key', text: text.slice('before\n'.length) },
    ]);
  });

  it('only runs detectors for enabled categories', () => {
    const text = `${AWS_KEY_ID} dev@example.com 10.0.0.1 4111111111111111`;
    expect(spans(text, ['email']).map((span) => span.id)).toEqual([
      'email-address',
    ]);
    expect(findDetections(text, [])).toEqual([]);
  });

  it('never includes matched text in a detection', () => {
    for (const detection of findDetections(`${AWS_KEY_ID} ${JWT}`, ALL)) {
      expect(Object.keys(detection).toSorted()).toEqual([
        'category',
        'detectorId',
        'end',
        'start',
      ]);
    }
  });
});

describe('payment card validation', () => {
  it('implements Luhn', () => {
    expect(passesLuhn('4111111111111111')).toBe(true);
    expect(passesLuhn('5555555555554444')).toBe(true);
    expect(passesLuhn('378282246310005')).toBe(true);
    expect(passesLuhn('4111111111111112')).toBe(false);
    expect(passesLuhn('')).toBe(false);
    expect(passesLuhn('4111-1111')).toBe(false);
  });

  it('detects network test numbers in the supported layouts', () => {
    for (const number of [
      '4111111111111111',
      '5555-5555-5555-4444',
      '3782 822463 10005',
      '6011111111111117',
    ]) {
      expect(spans(`pay ${number}.`, ['card'])).toEqual([
        { id: 'payment-card-number', text: number },
      ]);
    }
  });

  it('ignores Luhn-valid numbers outside card network ranges and mixed separators', () => {
    // 1726531200000 is a millisecond timestamp; 1000000000009 passes Luhn.
    expect(passesLuhn('1000000000009')).toBe(true);
    expect(spans('at 1000000000009 and 1726531200000', ['card'])).toEqual([]);
    expect(spans('4111 1111-1111 1111', ['card'])).toEqual([]);
    expect(spans('41111111111111111111', ['card'])).toEqual([]);
  });
});

describe('verifyRedacted', () => {
  it('returns remaining detections for unredacted text', () => {
    const remaining = verifyRedacted(`id ${AWS_KEY_ID}`, ['key']);
    expect(remaining).toEqual([
      {
        detectorId: 'aws-access-key-id',
        category: 'key',
        start: 3,
        end: 3 + AWS_KEY_ID.length,
      },
    ]);
  });

  it('returns nothing for empty input', () => {
    expect(verifyRedacted('', ALL)).toEqual([]);
  });
});
