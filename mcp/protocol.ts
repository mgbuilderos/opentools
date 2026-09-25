/**
 * Minimal MCP server over JSON-RPC 2.0, written against the wire format
 * rather than the SDK.
 *
 * No new dependency: ADR-004 requires licence review before a dependency, the
 * SBOM (`npm run sbom`) covers what ships, and the three methods this server
 * needs — initialize, tools/list, tools/call — are small enough that pulling a
 * package in to reach them would cost more review than it saves.
 */
import {
  FILE_INPUT_COUNT,
  OPERATION_COUNT,
  PURE_OPERATIONS,
  runOperation,
  searchOperations,
  SOURCE_COUNT,
} from './bridge';
import type { FsBoundary } from './fs-boundary';

export const PROTOCOL_VERSION = '2025-06-18';
export const SERVER_NAME = 'opentools-local';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Counted at load, never typed. `stated-numbers.test.ts` exists because a
 * hand-written count on the support page went stale; the same trap is open to
 * a server description, so the description is assembled from the manifest.
 */
export function serverInstructions(): string {
  return [
    `OpenTools exposes ${OPERATION_COUNT} local operations from ${SOURCE_COUNT} sources, counted from the kernel manifest at startup.`,
    `${FILE_INPUT_COUNT} of them take a file as input; the rest take text or no input.`,
    'They run in this process: no network call, no upload, no remote model.',
    'Call search_operations to find one, describe_operation for its parameters, then run_operation.',
  ].join(' ');
}

/**
 * Arguments arrive as whatever JSON the agent chose. Coercing an object with
 * `String()` yields "[object Object]", which reaches an operation as a real
 * value and fails somewhere far from the cause, so a non-scalar is refused
 * here with the name of the field that was wrong.
 */
function scalar(value: unknown, field: string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  throw new TypeError(
    `${field} must be a string, not ${Array.isArray(value) ? 'an array' : typeof value}.`,
  );
}

function optionalScalar(value: unknown, field: string): string | undefined {
  return value === undefined || value === null
    ? undefined
    : scalar(value, field);
}

function textContent(text: string) {
  return { content: [{ type: 'text', text }] };
}

function errorContent(message: string) {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function maybe<K extends string, V>(
  key: K,
  value: V | undefined,
): Record<K, V> | Record<string, never> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}

function readParams(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('params must be an object of parameter id to value.');
  }
  return value as Record<string, unknown>;
}

function readPaths(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new TypeError('inputPaths must be an array of paths.');
  }
  return value.map((entry, index) => scalar(entry, `inputPaths[${index}]`));
}

export const TOOLS = [
  {
    name: 'search_operations',
    description:
      'Search the local operation catalogue by keyword. Returns id, source, what it does, and the input it takes. Start here.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Space-separated terms, all of which must match, e.g. "merge pdf" or "csv json".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'describe_operation',
    description:
      'Full description of one operation: every parameter, its type, default and options, plus the input and output shape.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        source: {
          type: 'string',
          description:
            'Required only when the id exists in more than one source.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'run_operation',
    description:
      'Run one operation locally. Text results come back inline; file results are written to outputDir. Nothing leaves this machine.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        source: { type: 'string' },
        text: { type: 'string', description: 'Input for text operations.' },
        params: {
          type: 'object',
          description:
            'Parameters from describe_operation. Omitted ones use their default.',
        },
        inputPaths: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Input files, for operations whose input is file or files.',
        },
        outputDir: {
          type: 'string',
          description:
            'Existing directory for file output. Requires the server to run with --allow-write.',
        },
      },
      required: ['id'],
    },
  },
] as const;

export async function handleRequest(
  request: JsonRpcRequest,
  boundary: FsBoundary,
  signal: AbortSignal,
): Promise<JsonRpcResponse | undefined> {
  const id = request.id ?? null;
  const reply = (result: unknown): JsonRpcResponse => ({
    jsonrpc: '2.0',
    id,
    result,
  });

  switch (request.method) {
    case 'initialize':
      return reply({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: '0.0.0-unpublished' },
        instructions: serverInstructions(),
      });

    // Notifications carry no id and get no response.
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return undefined;

    case 'ping':
      return reply({});

    case 'tools/list':
      return reply({ tools: TOOLS });

    case 'tools/call': {
      const name = request.params?.name;
      const args = (request.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        if (name === 'search_operations') {
          const { matched, returned } = searchOperations(
            optionalScalar(args.query, 'query') ?? '',
          );
          if (matched === 0) {
            return reply(
              textContent(
                `No operation matches that. ${OPERATION_COUNT} operations are available; try a single broader word.`,
              ),
            );
          }
          const lines = returned.map(
            (operation) =>
              `${operation.source}:${operation.id} — ${operation.name}. ${operation.description} [input: ${operation.input}, output: ${operation.output.kind}]`,
          );
          const note =
            matched > returned.length
              ? `\n\nShowing ${returned.length} of ${matched} matches. Narrow the query to see the rest.`
              : '';
          return reply(textContent(lines.join('\n') + note));
        }

        if (name === 'describe_operation') {
          const wanted = scalar(args.id, 'id');
          const source = optionalScalar(args.source, 'source');
          const matches = PURE_OPERATIONS.filter(
            (operation) =>
              operation.id === wanted &&
              (source === undefined || operation.source === source),
          );
          if (matches.length === 0) {
            return reply(
              errorContent(
                `No operation ${wanted}. Call search_operations to find its exact id.`,
              ),
            );
          }
          if (matches.length > 1) {
            return reply(
              errorContent(
                `${wanted} exists in ${matches.map((match) => match.source).join(', ')}. Pass source to choose one.`,
              ),
            );
          }
          const operation = matches[0]!;
          const params =
            operation.params.length === 0
              ? '  (none)'
              : operation.params
                  .map((param) => {
                    const options = param.options
                      ? ` options: ${param.options.map((option) => option.value).join(' | ')}`
                      : '';
                    return `  ${param.id} (${param.type}) default=${JSON.stringify(param.defaultValue)}${options} — ${param.label}`;
                  })
                  .join('\n');
          return reply(
            textContent(
              [
                `${operation.source}:${operation.id} — ${operation.name}`,
                operation.description,
                `input: ${operation.input}   output: ${operation.output.kind}${operation.output.extension ? ` (.${operation.output.extension})` : ''}   deterministic: ${operation.deterministic}`,
                operation.notice ? `notice: ${operation.notice}` : '',
                'parameters:',
                params,
              ]
                .filter(Boolean)
                .join('\n'),
            ),
          );
        }

        if (name === 'run_operation') {
          const outcome = await runOperation(
            {
              id: scalar(args.id, 'id'),
              ...maybe('source', optionalScalar(args.source, 'source')),
              ...maybe('text', optionalScalar(args.text, 'text')),
              ...maybe('params', readParams(args.params)),
              ...maybe('inputPaths', readPaths(args.inputPaths)),
              ...maybe(
                'outputDir',
                optionalScalar(args.outputDir, 'outputDir'),
              ),
            },
            boundary,
            signal,
          );
          if (outcome.text !== undefined)
            return reply(textContent(outcome.text));
          return reply(
            textContent(
              `${outcome.summary}\nWrote:\n${(outcome.writtenFiles ?? []).join('\n')}`,
            ),
          );
        }

        return reply(errorContent(`Unknown tool: ${String(name)}`));
      } catch (error) {
        return reply(
          errorContent(error instanceof Error ? error.message : String(error)),
        );
      }
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      };
  }
}
