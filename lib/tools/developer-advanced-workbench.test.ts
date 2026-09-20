import { describe, expect, it } from 'vitest';

import {
  ADVANCED_DEVELOPER_OPERATIONS,
  generateSqlErDiagramSvg,
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
  it('publishes 54 unique operations whose defaults all run', async () => {
    expect(ADVANCED_DEVELOPER_OPERATIONS).toHaveLength(54);
    expect(
      new Set(ADVANCED_DEVELOPER_OPERATIONS.map((item) => item.id)).size,
    ).toBe(54);
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
    await expect(
      runAdvancedDeveloperOperation('ipv6-subnet-calculator', {
        address: '2001:db8::1',
        prefix: '',
      }),
    ).rejects.toThrow('prefix must be a whole number');
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
    const prototypeBefore = ({} as Record<string, unknown>).polluted;
    const hostile = await runAdvancedDeveloperOperation('ini-viewer', {
      input: '[__proto__]\npolluted=yes',
    });
    expect(({} as Record<string, unknown>).polluted).toBe(prototypeBefore);
    expect(hostile).toContain('"__proto__"');
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

    await expect(
      runAdvancedDeveloperOperation('sql-formatter', {
        input: "-- keep this\nSELECT X'AB' AS payload;",
      }),
    ).resolves.toContain("-- keep this\nSELECT X'AB'");
    await expect(
      runAdvancedDeveloperOperation('sql-minifier', {
        input: "SELECT X'AB' AS payload;",
      }),
    ).resolves.toContain("X'AB'");
    await expect(
      runAdvancedDeveloperOperation('sql-minifier', {
        input: "SELECT x 'alias' FROM items;",
      }),
    ).resolves.toContain("x 'alias'");
    await expect(
      runAdvancedDeveloperOperation('graphql-formatter', { input: '}' }),
    ).rejects.toThrow('braces are not balanced');
    await expect(
      runAdvancedDeveloperOperation('graphql-formatter', {
        input: 'query { note(text: """hello \\""" world""") }',
      }),
    ).resolves.toContain('hello \\""" world');
  });

  it('preserves meaningful whitespace in regular-expression sources', async () => {
    await expect(
      runAdvancedDeveloperOperation('regex-explainer', {
        pattern: ' a ',
        flags: '',
      }),
    ).resolves.toContain('/ a /');
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

  it('converts cURL to multi-language code and sanitizes SVG markup', async () => {
    const code = await runAdvancedDeveloperOperation(
      'curl-to-code',
      defaults('curl-to-code'),
    );
    expect(code).toContain('// JavaScript / TypeScript (fetch)');
    expect(code).toContain('requests.post');
    expect(code).toContain('http.NewRequest');

    const cleanSvg = await runAdvancedDeveloperOperation('svg-cleaner', {
      svg: '<?xml version="1.0"?><!-- comment --><svg><rect fill="red"/></svg>',
      removeComments: 'yes',
    });
    expect(cleanSvg).not.toContain('<?xml');
    expect(cleanSvg).not.toContain('<!-- comment -->');
    expect(cleanSvg).toContain('<svg><rect fill="red"/></svg>');
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

  it('translates cron expressions and tests regular expressions', async () => {
    const cron = await runAdvancedDeveloperOperation('cron-generator', {
      expression: '0 12 * * 1-5',
      preset: 'custom',
    });
    expect(cron).toContain('Cron Expression Analysis');
    expect(cron).toContain('at hour 12');

    const regex = await runAdvancedDeveloperOperation('regex-tester', {
      pattern: '\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b',
      flags: 'i',
      testText: 'Email: test@example.com, other: admin@corp.org',
    });
    expect(regex).toContain('Total Matches Found: 2');
    expect(regex).toContain('test@example.com');
  });

  it('generates mock data, git flight rules, docker templates, and HTTP status references', async () => {
    const mockJson = await runAdvancedDeveloperOperation(
      'dummy-data-generator',
      {
        count: '3',
        format: 'json',
        tableName: 'users',
        schemaType: 'users',
      },
    );
    const parsed = JSON.parse(mockJson);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toHaveProperty('email');

    const git = await runAdvancedDeveloperOperation('git-flight-rules', {
      scenario: 'undo-commit-keep',
      branchName: 'main',
      commitHash: 'abc',
      commitCount: '1',
    });
    expect(git).toContain('git reset --soft HEAD~1');

    const docker = await runAdvancedDeveloperOperation('docker-cheatsheet', {
      template: 'node-postgres-redis',
    });
    expect(docker).toContain('postgres:16-alpine');
    expect(docker).toContain('redis:7-alpine');

    const http = await runAdvancedDeveloperOperation('http-status-codes', {
      code: '404',
    });
    expect(http).toContain('404 Not Found');
  });

  it('scrubs sensitive API keys, tokens, and PII from prompts and logs', async () => {
    const raw = `const apiKey = "sk-proj-1234567890abcdef12345678";
const aws = "AKIA1234567890ABCDEF";
const email = "dev@company.internal";
const db = "postgres://root:pass123@prod-db.internal:5432/core";`;

    const scrubbed = await runAdvancedDeveloperOperation(
      'llm-secret-scrubber',
      {
        input: raw,
        scrubKeys: 'yes',
        scrubEmails: 'yes',
        scrubIps: 'no',
        placeholderStyle: 'numbered',
      },
    );

    expect(scrubbed).not.toContain('sk-proj-1234567890abcdef12345678');
    expect(scrubbed).not.toContain('AKIA1234567890ABCDEF');
    expect(scrubbed).not.toContain('dev@company.internal');
    expect(scrubbed).toContain('[REDACTED_OPENAI_API_KEY_');
    expect(scrubbed).toContain('[REDACTED_AWS_ACCESS_KEY_');
    expect(scrubbed).toContain('Total Redacted Secrets:');
  });

  it('sanitizes HAR files by stripping auth headers and cookies', async () => {
    const rawHar = JSON.stringify({
      log: {
        version: '1.2',
        entries: [
          {
            request: {
              url: 'https' + '://api.internal/login',
              headers: [
                { name: 'Authorization', value: 'Bearer token-123' },
                { name: 'Cookie', value: 'session_id=abc' },
              ],
              cookies: [{ name: 'session_id', value: 'abc' }],
            },
            response: {
              status: 200,
              headers: [{ name: 'Set-Cookie', value: 'session_id=new-abc' }],
            },
          },
        ],
      },
    });

    const sanitized = await runAdvancedDeveloperOperation('har-sanitizer', {
      input: rawHar,
      stripCookies: 'yes',
      maskAuthHeaders: 'yes',
      maskQueryParams: 'yes',
    });

    const parsed = JSON.parse(sanitized);
    expect(parsed.log.entries[0].request.cookies).toHaveLength(0);
    expect(parsed.log.entries[0].request.headers[0].value).toBe('[REDACTED]');
  });

  it('obfuscates SQL PII fields for safe reproduction', async () => {
    const rawSql = `INSERT INTO users (email, phone, card) VALUES ('user@corp.com', '+1-555-456-7890', '4111-2222-3333-4444');`;
    const obfuscated = await runAdvancedDeveloperOperation(
      'sql-pii-obfuscator',
      {
        input: rawSql,
        maskEmails: 'yes',
        maskCards: 'yes',
        maskPhones: 'yes',
      },
    );

    expect(obfuscated).not.toContain('user@corp.com');
    expect(obfuscated).not.toContain('4111-2222-3333-4444');
    expect(obfuscated).toContain('4111-XXXX-XXXX-1111');
    expect(obfuscated).toContain('@synthetic-test.local');
  });

  it('calculates POSIX chmod permissions and symbolic representation', async () => {
    const result755 = await runAdvancedDeveloperOperation('chmod-calculator', {
      preset: '755',
      targetPath: 'deploy.sh',
    });
    expect(result755).toContain('Octal Mode:     755');
    expect(result755).toContain('Symbolic Mode:  -rwxr-xr-x');
    expect(result755).toContain('chmod 755 deploy.sh');

    const result600 = await runAdvancedDeveloperOperation('chmod-calculator', {
      preset: '600',
      targetPath: 'id_rsa',
    });
    expect(result600).toContain('Symbolic Mode:  -rw-------');
    expect(result600).toContain('🔒 SECURE');

    const result777 = await runAdvancedDeveloperOperation('chmod-calculator', {
      preset: '777',
    });
    expect(result777).toContain(
      '⚠️ WARNING: Mode 777 grants full write access',
    );
  });

  it('converts cURL commands into multiple idiomatic languages', async () => {
    const sampleCurl = `curl -X POST "https://api.example.com/v1/users" -H "Content-Type: application/json" -H "Authorization: Bearer secret-token" -d '{"name":"Alice"}'`;

    const fetchCode = await runAdvancedDeveloperOperation('curl-to-code', {
      curl: sampleCurl,
      targetLang: 'javascript-fetch',
    });
    expect(fetchCode).toContain('fetch("https://api.example.com/v1/users"');
    expect(fetchCode).toContain('"Authorization": "Bearer secret-token"');
    expect(fetchCode).toContain('body: JSON.stringify(');

    const pyCode = await runAdvancedDeveloperOperation('curl-to-code', {
      curl: sampleCurl,
      targetLang: 'python-requests',
    });
    expect(pyCode).toContain('requests.post');
    expect(pyCode).toContain('json=payload');

    const goCode = await runAdvancedDeveloperOperation('curl-to-code', {
      curl: sampleCurl,
      targetLang: 'go-http',
    });
    expect(goCode).toContain('http.NewRequest("POST"');
    expect(goCode).toContain('req.Header.Set("Authorization"');
  });

  it('converts JSON payloads to TypeScript interfaces, types, and JSON Schema', async () => {
    const payload = JSON.stringify({
      id: 'usr_101',
      name: 'Ada Lovelace',
      active: true,
      score: 98.5,
      tags: ['admin', 'engineer'],
      profile: {
        city: 'London',
        zipCode: 10001,
      },
    });

    const interfaces = await runAdvancedDeveloperOperation(
      'json-to-typescript',
      {
        input: payload,
        rootName: 'UserProfile',
        format: 'interfaces',
        exportPrefix: 'export',
      },
    );
    expect(interfaces).toContain('export interface UserProfile');
    expect(interfaces).toContain('export interface Profile');
    expect(interfaces).toContain('tags: string[];');
    expect(interfaces).toContain('profile: Profile;');

    const types = await runAdvancedDeveloperOperation('json-to-typescript', {
      input: payload,
      rootName: 'UserProfile',
      format: 'types',
      exportPrefix: 'declare',
    });
    expect(types).toContain('declare type UserProfile =');
    expect(types).toContain('declare type Profile =');

    const jsonSchema = await runAdvancedDeveloperOperation(
      'json-to-typescript',
      {
        input: payload,
        rootName: 'UserProfile',
        format: 'json-schema',
      },
    );
    expect(jsonSchema).toContain('http://json-schema.org/draft-07/schema#');
    expect(jsonSchema).toContain('"title": "UserProfile"');
    expect(jsonSchema).toContain('"type": "object"');
  });

  it('generates interactive SVG ER diagrams from SQL schemas', async () => {
    const sql = `CREATE TABLE users (
  id INT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT REFERENCES users(id),
  total_cents INT NOT NULL
);`;

    const svg = await runAdvancedDeveloperOperation('sql-to-er-diagram', {
      sql,
      theme: 'zinc-dark',
      curveStyle: 'bezier',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('users');
    expect(svg).toContain('orders');
    expect(svg).toContain('PK');
    expect(svg).toContain('FK');
    expect(svg).toContain('stroke-dasharray="4,4"');
  });

  it('converts JSON structures to type-safe Zod validation schemas', async () => {
    const jsonInput = JSON.stringify({
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      age: 36,
      isActive: true,
      tags: ['math', 'code'],
      meta: {
        lastLogin: '2026-09-16T10:00:00Z',
      },
    });

    const zodOutput = await runAdvancedDeveloperOperation(
      'json-to-zod-schema',
      {
        input: jsonInput,
        schemaName: 'UserAccountSchema',
        exportPrefix: 'export',
        inferType: 'yes',
      },
    );

    expect(zodOutput).toContain("import { z } from 'zod';");
    expect(zodOutput).toContain('export const UserAccountSchema = z.object({');
    expect(zodOutput).toContain('id: z.string().uuid(),');
    expect(zodOutput).toContain('name: z.string(),');
    expect(zodOutput).toContain('email: z.string().email(),');
    expect(zodOutput).toContain('age: z.number().int(),');
    expect(zodOutput).toContain('isActive: z.boolean(),');
    expect(zodOutput).toContain('tags: z.array(z.string()),');
    expect(zodOutput).toContain('lastLogin: z.string().datetime(),');
    expect(zodOutput).toContain(
      'export type UserAccount = z.infer<typeof UserAccountSchema>;',
    );
  });
});

/**
 * These are the shapes real schema dumps come in, and every one of them was
 * broken. Search Console on 2026-09-20 showed four of twelve queries asking for
 * an ER diagram from SQL, which is the site's clearest demand signal — and the
 * tool behind it could not read the output of either `mysqldump` or `pg_dump`.
 *
 * Each case below is the actual output format of the tool named, not a
 * simplified version of it.
 */
describe('SQL to ER diagram, against SQL as it is really written', () => {
  const flagsFor = (svg: string) =>
    [...svg.matchAll(/>(PK|FK)<\/text>/gu)].map((match) => match[1]);

  it('reads a mysqldump table, which closes with ENGINE options', () => {
    // `) ENGINE=InnoDB DEFAULT CHARSET=utf8;` — the old pattern demanded `);`
    // and threw "No valid CREATE TABLE statements found" on every MySQL dump.
    const svg = generateSqlErDiagramSvg(
      'CREATE TABLE `users` (\n  `id` int(11) NOT NULL,\n  `email` varchar(255),\n  PRIMARY KEY (`id`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8;',
    );

    expect(svg).toContain('users');
    expect(svg).toContain('email');
    expect(flagsFor(svg)).toContain('PK');
  });

  it('reads a pg_dump table, which qualifies the name with its schema', () => {
    // `CREATE TABLE public.users` — a bare-name pattern skipped the statement.
    const svg = generateSqlErDiagramSvg(
      'CREATE TABLE public.users (\n    id integer NOT NULL,\n    email text\n);',
    );

    expect(svg).toContain('users');
    expect(svg).toContain('email');
  });

  it('draws a foreign key that pg_dump declared in a later ALTER TABLE', () => {
    // pg_dump does not put foreign keys inside CREATE TABLE. Without a second
    // pass the tables were drawn and every relationship between them was
    // silently missing — the one thing an ER diagram exists to show.
    const svg = generateSqlErDiagramSvg(
      [
        'CREATE TABLE users (id integer NOT NULL);',
        'CREATE TABLE orders (id integer NOT NULL, user_id integer);',
        'ALTER TABLE ONLY orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);',
      ].join('\n'),
    );

    expect(flagsFor(svg)).toContain('FK');
  });

  it('puts the foreign key on the column that has it, not the first one', () => {
    // The worst of the four, because it produced a plausible wrong answer
    // rather than an error. Columns were split by newline, so this one-line
    // table parsed only `id`, then found REFERENCES in the leftover text and
    // marked **`id`** as the foreign key.
    const svg = generateSqlErDiagramSvg(
      'CREATE TABLE users (id INTEGER PRIMARY KEY);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id));',
    );

    expect(svg).toContain('user_id');
    expect(flagsFor(svg)).toContain('FK');
    // The FK marker must appear after `id` was already marked PK twice, i.e.
    // it belongs to the second table's second column.
    expect(flagsFor(svg)).toEqual(['PK', 'PK', 'FK']);
  });

  it('keeps a composite primary key as two columns', () => {
    const svg = generateSqlErDiagramSvg(
      'CREATE TABLE order_items (order_id INT, sku VARCHAR(20), PRIMARY KEY (order_id, sku));',
    );

    expect(svg).toContain('order_id');
    expect(svg).toContain('sku');
    expect(flagsFor(svg)).toEqual(['PK', 'PK']);
  });

  it('does not split a type that contains a comma', () => {
    // `DECIMAL(10, 2)` is one type. A naive comma split makes it two columns.
    const svg = generateSqlErDiagramSvg(
      'CREATE TABLE invoices (id INT PRIMARY KEY, total DECIMAL(10, 2), note TEXT);',
    );

    expect(svg).toContain('total');
    expect(svg).toContain('note');
    expect(svg).not.toContain('>2<');
  });

  it('still refuses input with no CREATE TABLE in it, by name', () => {
    expect(() => generateSqlErDiagramSvg('SELECT * FROM users;')).toThrow(
      /No valid CREATE TABLE/u,
    );
  });
});
