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
  vault_search: 'Searched the vault for',
  read_primitive: 'Consulted primitive',
  propose_update: 'Proposed',
  vault_write: 'Wrote',
  // The Word read path (docx stage 1): file verbs, so their paths open the
  // reader like a vault_read does.
  docx_read: 'Read',
  extract_redlines: 'Extracted changes from',
  check_document: 'Checked',
};

/** The platform's script tools (`runtime/src/tools/builtin.ts`) — the one
 * family where "Ran" is the honest verb, because a script is a thing you
 * run. Everything else unknown reads "Called". */
const SCRIPT_TOOLS: ReadonlySet<string> = new Set([
  'docket_sweep',
  'clean_format',
  'apply_redlines',
  'word_compare',
]);

const SEARCH_LIKE = /grep|search|find/i;

/** The verbs whose object is a vault path a drawer can open. */
const FILE_VERBS: ReadonlySet<string> = new Set(['Read', 'Proposed', 'Wrote', 'Extracted changes from', 'Checked']);

function objectOf(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const record = input as Record<string, unknown>;
  for (const key of ['path', 'name', 'query', 'dir']) {
    const value = record[key];
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

/** The fallback resolves by NAME, never by argument: an unnamed tool must
 * not read as "Ran ." with the input standing in for the verb's subject
 * (cou-93 item 2). */
function fallbackVerb(name: string): string {
  if (name === '') return 'Called a tool';
  if (SCRIPT_TOOLS.has(name)) return `Ran ${name}`;
  if (SEARCH_LIKE.test(name)) return 'Searched';
  return `Called ${name}`;
}

export function verbFor(tool: ToolCallView): Verb {
  const verb = TABLE[tool.name] ?? fallbackVerb(tool.name);
  const object = objectOf(tool.input);
  // The root listing's argument is `.` — "Listed ." reads as a typo.
  if (tool.name === 'vault_list' && (object === undefined || object === '.' || object === '/')) return { verb: 'Listed the vault' };
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


export interface WorkLineParts {
  searched: boolean;
  listed: boolean;
  /** Unique basenames of the files read, in first-read order. */
  read: string[];
  proposed: number;
  other: number;
}

function baseOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Basenames — unless two read files share one, in which case the parent
 * directory joins in. Folding `practice/standards/nda.md` and
 * `matters/acme/nda.md` into one `nda.md` chip would say the turn read one
 * file when it read two. */
function labelPaths(paths: string[]): string[] {
  const counts = new Map<string, number>();
  for (const path of paths) counts.set(baseOf(path), (counts.get(baseOf(path)) ?? 0) + 1);
  return paths.map(path => (counts.get(baseOf(path)) === 1 ? baseOf(path) : path.split('/').slice(-2).join('/')));
}

/** The one quiet work line (spec §3.3): "Searched the vault · read nda.md
 * acme-nda.md ⌄" (the ⌄ now an SVG chevron). Proposals are not "work" here — they get slips of their
 * own below the prose. */
export function workLineOf(tools: ToolCallView[]): WorkLineParts {
  const parts: WorkLineParts = { searched: false, listed: false, read: [], proposed: 0, other: 0 };
  const paths: string[] = [];
  for (const tool of tools) {
    if (tool.name === 'vault_search' || SEARCH_LIKE.test(tool.name)) parts.searched = true;
    else if (tool.name === 'vault_list') parts.listed = true;
    else if (tool.name === 'vault_read') {
      const path = pathOf(tool);
      if (path !== null && !paths.includes(path)) paths.push(path);
    } else if (tool.name === 'propose_update') parts.proposed += 1;
    else parts.other += 1;
  }
  parts.read = labelPaths(paths);
  return parts;
}
