import type { ManagedProcessId } from '../shared/types';

export function assertString(
  input: unknown,
  opts: { name: string; maxLen: number },
): asserts input is string {
  if (typeof input !== 'string') throw new Error(`${opts.name} must be a string`);
  if (input.length === 0) throw new Error(`${opts.name} must not be empty`);
  if (input.length > opts.maxLen) throw new Error(`${opts.name} too long (max ${opts.maxLen})`);
}

export function assertObject(
  input: unknown,
  opts: { name: string },
): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null)
    throw new Error(`${opts.name} must be an object`);
}

const PROCESS_IDS: readonly ManagedProcessId[] = ['monitor', 'agent', 'logTail'] as const;
export function assertManagedProcessId(input: unknown): asserts input is ManagedProcessId {
  if (typeof input !== 'string') throw new Error('process id must be a string');
  if (!PROCESS_IDS.includes(input as ManagedProcessId)) {
    throw new Error(`unknown process id: ${input}`);
  }
}

export function assertToken(input: unknown): asserts input is string {
  assertString(input, { name: 'token', maxLen: 128 });
  // UUID v4 is expected, but keep validation permissive.
  if (!/^[a-zA-Z0-9-]+$/.test(input)) throw new Error('token has invalid characters');
}

export function assertUrlAllowed(input: unknown): asserts input is string {
  assertString(input, { name: 'url', maxLen: 2048 });
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('invalid url');
  }

  if (url.protocol !== 'https:') throw new Error('only https urls are allowed');

  const allowedHosts = new Set([
    'github.com',
    'www.github.com',
    'jira.atlassian.com',
    // Add your Jira domain(s) and Azure portal domains here later.
    'portal.azure.com',
  ]);

  if (!allowedHosts.has(url.hostname)) {
    throw new Error(`blocked host: ${url.hostname}`);
  }
}
