import { describe, expect, it } from 'vitest';

import {
  ADVANCED_DEVELOPER_OPERATIONS,
  runAdvancedDeveloperOperation,
} from './developer-advanced-workbench';

function defaults(id: string) {
  const operation = ADVANCED_DEVELOPER_OPERATIONS.find(
    (item) => item.id === id,
  );
  if (!operation) throw new Error(`Missing operation ${id}`);
  return Object.fromEntries(
    operation.fields.map((field) => [field.id, field.defaultValue]),
  );
}

describe('advanced developer workbench', () => {
  it('publishes 40 unique operations whose defaults all run', async () => {
    expect(ADVANCED_DEVELOPER_OPERATIONS).toHaveLength(40);
    expect(
      new Set(ADVANCED_DEVELOPER_OPERATIONS.map((item) => item.id)).size,
    ).toBe(40);
    for (const operation of ADVANCED_DEVELOPER_OPERATIONS) {
      await expect(
        runAdvancedDeveloperOperation(operation.id, defaults(operation.id)),
      ).resolves.not.toBe('');
    }
  });

  it('diffs JSON and resolves bounded JSON paths', async () => {
    await expect(
      runAdvancedDeveloperOperation('json-diff', {
        left: '{"user":{"active":true}}',
        right: '{"user":{"active":false}}',
      }),
    ).resolves.toBe('$.user.active: true → false');
    await expect(
      runAdvancedDeveloperOperation('json-path-tester', {
        input: '{"users":[{"display name":"Ada"}]}',
        path: '$.users[0]["display name"]',
      }),
    ).resolves.toBe('"Ada"');
  });

  it('decodes but explicitly does not verify JWTs', async () => {
    const output = await runAdvancedDeveloperOperation(
      'jwt-decoder',
      defaults('jwt-decoder'),
    );
    expect(output).toContain('"verified": false');
    expect(output).toContain('"name": "Ada"');
  });

  it('explains valid regex structure without executing it', async () => {
    await expect(
      runAdvancedDeveloperOperation('regex-explainer', {
        pattern: '^user-(\\d{2,4})$',
        flags: 'iu',
      }),
    ).resolves.toContain('\\d — decimal digit');
    await expect(
      runAdvancedDeveloperOperation('regex-explainer', {
        pattern: '[',
        flags: 'g',
      }),
    ).rejects.toThrow('Invalid JavaScript regular expression');
  });

  it('generates correctly shaped random identifiers and tokens', async () => {
    const ulids = await runAdvancedDeveloperOperation('ulid-generator', {
      count: '3',
    });
    expect(ulids.split('\n')).toHaveLength(3);
    expect(ulids).toMatch(
      /^[0-9A-HJKMNP-TV-Z]{26}(?:\n[0-9A-HJKMNP-TV-Z]{26}){2}$/u,
    );
    await expect(
      runAdvancedDeveloperOperation('random-token-generator', {
        bytes: '16',
        format: 'hex',
      }),
    ).resolves.toMatch(/^[0-9a-f]{32}$/u);
  });

  it('uses Web Crypto for HMAC and checksum output', async () => {
    await expect(
      runAdvancedDeveloperOperation('hmac-generator', {
        message: 'message',
        key: 'secret',
        algorithm: 'SHA-256',
        format: 'hex',
      }),
    ).resolves.toBe(
      '8b5f48702995c1598c573db1e21866a9b825d4a794d169d7060a03605796360b',
    );
    await expect(
      runAdvancedDeveloperOperation('checksum-calculator', {
        input: 'hello',
        algorithm: 'SHA-256',
      }),
    ).resolves.toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('validates cron fields and converts epoch values', async () => {
    await expect(
      runAdvancedDeveloperOperation('cron-expression-builder', {
        minute: '*/15',
        hour: '9-17',
        day: '*',
        month: '*',
        weekday: '1-5',
      }),
    ).resolves.toBe('*/15 9-17 * * 1-5');
    await expect(
      runAdvancedDeveloperOperation('epoch-calculator', {
        mode: 'seconds-to-iso',
        input: '0',
      }),
    ).resolves.toBe('1970-01-01T00:00:00.000Z');
  });

  it('calculates bases, binary arithmetic, and bitwise values exactly', async () => {
    await expect(
      runAdvancedDeveloperOperation('number-base-converter', {
        input: 'FFFFFFFFFFFFFFFF',
        fromBase: '16',
        toBase: '10',
      }),
    ).resolves.toBe('18446744073709551615');
    await expect(
      runAdvancedDeveloperOperation('binary-calculator', {
        left: '1010',
        operator: 'multiply',
        right: '11',
      }),
    ).resolves.toContain('11110');
    await expect(
      runAdvancedDeveloperOperation('bitwise-calculator', {
        left: '42',
        operator: 'and',
        right: '15',
      }),
    ).resolves.toContain('Decimal: 10');
  });

  it('calculates IPv4 and CIDR boundaries', async () => {
    const subnet = await runAdvancedDeveloperOperation(
      'ipv4-subnet-calculator',
      { address: '192.168.1.10', prefix: '24' },
    );
    expect(subnet).toContain('"network": "192.168.1.0"');
    expect(subnet).toContain('"broadcast": "192.168.1.255"');
    await expect(
      runAdvancedDeveloperOperation('cidr-calculator', {
        input: '10.20.30.40/20',
      }),
    ).resolves.toContain('"network": "10.20.16.0"');
  });

  it('normalizes IPv6 subnets and calculates exact bounds', async () => {
    const output = await runAdvancedDeveloperOperation(
      'ipv6-subnet-calculator',
      { address: '2001:0db8:abcd:0012::1234', prefix: '64' },
    );
    expect(output).toContain('"address": "2001:db8:abcd:12::1234"');
    expect(output).toContain('"network": "2001:db8:abcd:12::"');
    expect(output).toContain(
      '"lastAddress": "2001:db8:abcd:12:ffff:ffff:ffff:ffff"',
    );
  });

  it('parses headers and cookies without making a request', async () => {
    await expect(
      runAdvancedDeveloperOperation('http-header-parser', {
        input: 'X-Test: one\nX-Test: two',
      }),
    ).resolves.toContain('[\n    "one",\n    "two"\n  ]');
    await expect(
      runAdvancedDeveloperOperation('cookie-parser', {
        input: 'name=Ada%20Example; theme=dark',
      }),
    ).resolves.toContain('"name": "Ada Example"');
  });

  it('parses a bounded INI subset without coercing values', async () => {
    const output = await runAdvancedDeveloperOperation('ini-viewer', {
      input: 'name=Tools\n[server]\nport=3010\nenabled=true',
    });
    expect(output).toContain('"port": "3010"');
    expect(output).toContain('"enabled": "true"');
    await expect(
      runAdvancedDeveloperOperation('ini-viewer', {
        input: '[server]\nport=1\nport=2',
      }),
    ).rejects.toThrow('repeats key port');
  });

  it('quotes SQL preview literals and rejects parameter-count mismatch', async () => {
    await expect(
      runAdvancedDeveloperOperation('sql-parameter-binder', {
        sql: 'SELECT ? AS name, ? AS active',
        parameters: '["O\'Brien",true]',
      }),
    ).resolves.toBe("SELECT 'O''Brien' AS name, TRUE AS active");
    await expect(
      runAdvancedDeveloperOperation('sql-parameter-binder', {
        sql: 'SELECT ?',
        parameters: '[1,2]',
      }),
    ).rejects.toThrow('unused');
  });

  it('formats and minifies SQL and formats GraphQL lexically', async () => {
    const formatted = await runAdvancedDeveloperOperation('sql-formatter', {
      input: "select id,name from users where role='editor' and active=true;",
    });
    expect(formatted).toContain('SELECT id,');
    expect(formatted).toContain('\nFROM users');
    expect(formatted).toContain('\nWHERE role');
    expect(formatted).toContain('\nAND active');

    await expect(
      runAdvancedDeveloperOperation('sql-minifier', {
        input: "SELECT 'a -- value' AS value -- remove\nFROM items;",
      }),
    ).resolves.toBe("SELECT 'a -- value' AS value FROM items;");

    const graphql = await runAdvancedDeveloperOperation('graphql-formatter', {
      input: 'query User($id:ID!){user(id:$id){id name}}',
    });
    expect(graphql).toContain('query User ($id:ID!) {');
    expect(graphql).toContain('\n  user (id:$id) {');
  });

  it('inspects package and OpenAPI structures and builds schema examples', async () => {
    await expect(
      runAdvancedDeveloperOperation(
        'package-json-inspector',
        defaults('package-json-inspector'),
      ),
    ).resolves.toContain('"scripts": [\n    "test"\n  ]');
    await expect(
      runAdvancedDeveloperOperation(
        'openapi-viewer',
        defaults('openapi-viewer'),
      ),
    ).resolves.toContain('GET /users — List users');
    await expect(
      runAdvancedDeveloperOperation(
        'openapi-example-generator',
        defaults('openapi-example-generator'),
      ),
    ).resolves.toContain('"name": "Ada"');
  });

  it('rejects malformed and unsafe boundary inputs', async () => {
    await expect(
      runAdvancedDeveloperOperation('ipv4-subnet-calculator', {
        address: '192.168.1.999',
        prefix: '24',
      }),
    ).rejects.toThrow('exceeds 255');
    await expect(
      runAdvancedDeveloperOperation('cron-expression-parser', {
        input: '0 25 * * *',
      }),
    ).rejects.toThrow('Hour must stay within');
    await expect(
      runAdvancedDeveloperOperation('jwt-decoder', { input: 'two.parts' }),
    ).rejects.toThrow('three segments');
  });
});
