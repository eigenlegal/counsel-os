/**
 * Tool name → what a lawyer reads (spec §2, "Verb table"). One glance, no
 * raw JSON: `vault_read {path}` is the line "Read matters/acme.md".
 */
import type { ToolCallView } from '../chat/turns';

export interface Verb {
  verb: string;
  /** The `path` input when present; otherwise the first of name / query /
   * dir, which is what the other vault tools call their subject. */
  object?: string;
}

const TABLE: Record<string, string> = {
  vault_read: 'Read',
  vault_list: 'Listed',
  vault_search: 'Searched',
  read_primitive: 'Consulted primitive',
  propose_update: 'Proposed',
  vault_write: 'Wrote',
};

const SEARCH_LIKE = /grep|search|find/i;

/** The verbs whose object is a vault path a drawer can open. */
const FILE_VERBS: ReadonlySet<string> = new Set(['Read', 'Proposed', 'Wrote']);

function objectOf(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const record = input as Record<string, unknown>;
  for (const key of ['path', 'name', 'query', 'dir']) {
    const value = record[key];
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

export function verbFor(tool: ToolCallView): Verb {
  const verb = TABLE[tool.name] ?? (SEARCH_LIKE.test(tool.name) ? 'Searched' : `Ran ${tool.name}`);
  const object = objectOf(tool.input);
  return object === undefined ? { verb } : { verb, object };
}

/** The vault path a step line can open, or `null` when the step is not about one file. */
export function pathOf(tool: ToolCallView): string | null {
  const { verb } = verbFor(tool);
  if (!FILE_VERBS.has(verb)) return null;
  if (typeof tool.input !== 'object' || tool.input === null) return null;
  const path = (tool.input as Record<string, unknown>)['path'];
  return typeof path === 'string' && path !== '' ? path : null;
}

/**
 * A call that came back with nothing: `[]`, `{}`, `''`, `null`, or no result
 * field at all.
 *
 * It is not an error, and that is the problem this answers — a search that
 * found nothing renders in the same ink as a read that found the file, and
 * under a design whose promise is "the work folds away and you can still
 * audit it", the one line that explains the whole answer must not fold away
 * silently.
 */
export function isEmptyResult(output: unknown): boolean {
  if (output === null || output === undefined) return true;
  if (typeof output === 'string') return output.trim() === '';
  if (Array.isArray(output)) return output.length === 0;
  if (typeof output === 'object') return Object.keys(output).length === 0;
  return false;
}

/** What a step line reads as: still running, failed, came back empty, or ok. */
export function stateOf(tool: ToolCallView): 'running' | 'error' | 'empty' | 'ok' {
  if (!tool.hasResult) return 'running';
  if (tool.isError === true) return 'error';
  return isEmptyResult(tool.output) ? 'empty' : 'ok';
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "read 2 files, ran 1 tool" — the collapsed strip's one line. */
export function summarize(tools: ToolCallView[]): string {
  if (tools.length === 0) return 'no tools';
  let read = 0;
  let consulted = 0;
  let ran = 0;
  for (const tool of tools) {
    if (tool.name === 'vault_read') read += 1;
    else if (tool.name === 'read_primitive') consulted += 1;
    else ran += 1;
  }
  const parts: string[] = [];
  if (read > 0) parts.push(`read ${plural(read, 'file', 'files')}`);
  if (consulted > 0) parts.push(`consulted ${plural(consulted, 'primitive', 'primitives')}`);
  if (ran > 0) parts.push(`ran ${plural(ran, 'tool', 'tools')}`);
  return parts.join(', ');
}
