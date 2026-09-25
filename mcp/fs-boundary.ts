/**
 * Filesystem boundary for the MCP server.
 *
 * In the browser the operations run in a tab that cannot see the disk. Over
 * MCP they run in a process an agent drives, so the sandbox that used to be
 * free has to be built. Every path an agent supplies passes through here.
 *
 * The rule is containment against a root the operator chose on the command
 * line: a resolved path must be the root or sit beneath it, symlinks are
 * resolved before the check so a link cannot walk out, and writing needs a
 * second, explicit opt-in.
 */
import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export class PathBoundaryError extends Error {
  readonly code = 'PATH_OUTSIDE_ROOT';
  constructor(message: string) {
    super(message);
    this.name = 'PathBoundaryError';
  }
}

export interface FsBoundary {
  /** Absolute, symlink-resolved directory every path must sit inside. */
  readonly root: string;
  /** Writing is refused unless the operator passed --allow-write. */
  readonly allowWrite: boolean;
}

/** True when `candidate` is `root` itself or a descendant of it. */
export function isContained(root: string, candidate: string): boolean {
  if (root === candidate) return true;
  const step = relative(root, candidate);
  return step !== '' && !step.startsWith('..') && !isAbsolute(step);
}

/**
 * Resolves an agent-supplied path for reading.
 *
 * The file must already exist: `realpath` is what collapses `..` segments and
 * symlinks, and a path that does not resolve cannot be proven contained.
 */
export async function resolveForRead(
  boundary: FsBoundary,
  candidate: string,
): Promise<string> {
  const absolute = resolve(boundary.root, candidate);
  let real: string;
  try {
    real = await realpath(absolute);
  } catch {
    throw new PathBoundaryError(
      `No readable file at ${candidate}. Paths resolve against the server root and the file must exist.`,
    );
  }
  if (!isContained(boundary.root, real)) {
    throw new PathBoundaryError(
      `${candidate} resolves outside the server root. The server reads only inside ${boundary.root}.`,
    );
  }
  return real;
}

/**
 * Resolves a directory an output file may be written into.
 *
 * The directory must exist, so its realpath is checkable; the filename is
 * appended afterwards and is never taken from the agent (see `safeFileName`).
 */
export async function resolveForWrite(
  boundary: FsBoundary,
  candidateDirectory: string,
): Promise<string> {
  if (!boundary.allowWrite) {
    throw new PathBoundaryError(
      'This server was started read-only. Restart it with --allow-write to let operations write files.',
    );
  }
  const absolute = resolve(boundary.root, candidateDirectory);
  let real: string;
  try {
    real = await realpath(absolute);
  } catch {
    throw new PathBoundaryError(
      `No such directory: ${candidateDirectory}. Create it first; the server does not create directories.`,
    );
  }
  if (!isContained(boundary.root, real)) {
    throw new PathBoundaryError(
      `${candidateDirectory} resolves outside the server root. The server writes only inside ${boundary.root}.`,
    );
  }
  return real;
}

/**
 * Strips an operation-supplied output name down to a plain filename.
 *
 * Output names come from the operations, not from the agent, but they are
 * still data: a name carrying a separator would place the file somewhere the
 * boundary check above never saw.
 */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/u).pop() ?? '';
  const cleaned = base.replaceAll('\u0000', '').trim();
  if (cleaned === '' || cleaned === '.' || cleaned === '..')
    return 'output.bin';
  return cleaned;
}

export function joinInRoot(directory: string, fileName: string): string {
  return `${directory}${sep}${safeFileName(fileName)}`;
}
