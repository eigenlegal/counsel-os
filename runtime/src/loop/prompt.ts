import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoContentSource } from '../content/repo';
import type { ContentSource } from '../content/source';
import type { Platform } from '../core/types';
import type { VaultConfig } from '../vault/resolve-root';

/**
 * A script call the methodology may reference, and the tool + fields it maps
 * to. Purely the mapping-table content for `HOST_PREAMBLE` — which tools are
 * actually available on a given platform is supplied by the caller (see
 * `AvailableTools`), not looked up here. Keep this list in lockstep with
 * `tools/builtin.ts`'s `builtinTools()` — the field names here must match
 * that file's `inputSchema`s exactly, or the preamble will teach the model
 * to call tools with the wrong arguments.
 */
interface ScriptToolMapping {
  name: string;
  invocation: string;
  fields: string;
}

const SCRIPT_TOOL_MAPPINGS: ScriptToolMapping[] = [
  {
    name: 'docket_sweep',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/docket_sweep.py" <matters_dir> --window <days> --format json',
    fields: '`days` (optional, default 60)',
  },
  {
    name: 'extract_redlines',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/extract_redlines.py" <file> --format json',
    fields: '`docx`',
  },
  {
    name: 'check_document',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/check_document.py" <file> --json',
    fields: '`file` — accepts .docx, .md, or .txt; always run with --json',
  },
  {
    name: 'clean_format',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/clean_format.py" <input.docx> <output.docx>',
    fields: '`input`, `output`',
  },
  {
    name: 'apply_redlines',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply_redlines.py" [--track] <original.docx> <redlines.json> <output.docx>',
    fields: '`original`, `edits`, `output`, `track` (optional)',
  },
  {
    name: 'word_compare',
    invocation: '"${CLAUDE_PLUGIN_ROOT}/scripts/word_compare.sh" <original.docx> <modified.docx> <author> <output.docx>',
    fields: '`original`, `modified`, `author`, `output`',
  },
];

/**
 * The tool availability this run's caller already computed — typically from
 * a `ToolRegistry` built with every builtin tool registered:
 * `{ available: registry.available(platform).map(t => t.name), unavailable: registry.unavailable(platform) }`.
 * `HOST_PREAMBLE` only renders this; it does not decide platform gating.
 */
export interface AvailableTools {
  available: string[];
  unavailable: Array<{ name: string; needs: Platform[] }>;
}

/**
 * The host-specific header prepended to the methodology body. Written for the
 * model, not the user: it maps every "run this script" / "read this file" /
 * "{legal_root}/..." step in `SKILL.md` and the primitives onto the tool
 * calls and vault-relative paths this runtime actually uses, states what the
 * propose-then-approve write gate is, says what to do when no tool covers a
 * step, and lists which tools exist on this run's platform.
 */
export function HOST_PREAMBLE(tools: AvailableTools, platform: Platform, cfg: VaultConfig): string {
  const scriptTable = SCRIPT_TOOL_MAPPINGS
    .map(t => `| \`${t.invocation}\` | \`${t.name}\` | ${t.fields} |`)
    .join('\n');

  const available = [...tools.available].sort().map(n => `\`${n}\``).join(', ');

  const unavailableList = tools.unavailable.length === 0
    ? 'none — every tool listed above is available on this platform.'
    : tools.unavailable.map(t => `\`${t.name}\` (needs ${t.needs.join(', ')})`).join(', ');

  return `# Host: Counsel OS runtime

You run inside the Counsel OS runtime, not inside Claude Code. Some steps in
the methodology below do not apply here. Use this section to translate them.

## The legal root is already resolved

The runtime resolved \`{legal_root}\` before this session started. Do not run
\`scripts/resolve_legal_root.sh\`. Do not ask the user for the legal root.
Treat every vault path in the methodology as already resolved.

## Vault paths

The methodology writes vault paths as \`{legal_root}/x/y.md\`. Vault tools do
not take that prefix. Drop \`{legal_root}/\`. Pass \`x/y.md\` instead. Never
pass an absolute path.

Matter files live under \`${cfg.mattersPath}/\`. Entity files live under
\`${cfg.entitiesPath}/\`.

## Scripts are tools

The methodology tells you to run scripts directly, for example
\`python3 "\${CLAUDE_PLUGIN_ROOT}/scripts/apply_redlines.py" ...\`. In this
runtime, call the matching tool instead. Do not run \`python3\` or \`bash\`
yourself. Pass the tool's arguments as named fields, not as a command line.

| Script call in the methodology | Tool | Fields |
|---|---|---|
${scriptTable}

If a methodology step calls for a script or shell command with no tool
listed above, do not improvise. Tell the user what you cannot do. Continue
with the rest of the request.

## Primitives are a tool call

The methodology tells you to read \`primitives/{name}.md\` for the detailed
steps of a mode. In this runtime, call \`read_primitive\` with that name
instead of reading the file yourself. For example, call
\`read_primitive {"name": "draft"}\` to load \`primitives/draft.md\`.

## Writes go through two paths

Matter files stay under direct control. Call \`vault_write\` for any path
under \`${cfg.mattersPath}/\`.

Knowledge-system files do not write directly. This covers \`practice/\`,
\`memory/\`, \`law/\`, and \`${cfg.entitiesPath}/\`. Call \`propose_update\` for
these paths instead. \`propose_update\` does not write the file — it records
a proposed change for the user to approve or reject. Tell the user what you
proposed and why.

## Typed answers

If the request carries an output schema, do the work with the primitives first, then give the final answer in exactly that structure — nothing else in the final answer.

## Tools on this platform (${platform})

Available: ${available || 'none'}.

Unavailable: ${unavailableList}`;
}

/** Strips a leading `--- ... ---` YAML frontmatter block, if present. */
function stripFrontmatter(text: string): string {
  if (!text.startsWith('---')) return text;
  const closeIdx = text.indexOf('\n---', 3);
  if (closeIdx === -1) return text;
  const afterClose = text.indexOf('\n', closeIdx + 1);
  const body = afterClose === -1 ? '' : text.slice(afterClose + 1);
  return body.replace(/^\n+/, '');
}

/** Reads `path` with `readFile`, returning `null` when the file does not
 * exist (`ENOENT`) — the only expected reason `practice/profile.md` or a
 * matter file might be absent. Any other error (permissions, a directory
 * where a file was expected, a broken injected `readFile`) is a real
 * failure and is left to propagate rather than silently rendered as
 * "absent". */
function readIfPresent(readFile: (path: string) => string, path: string): string | null {
  try {
    return readFile(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null;
    throw err;
  }
}

export interface AssembleSystemPromptOptions {
  pluginRoot: string;
  /** Where the counsel skill is read from (spec 2026-09-01 §3). Omitted →
   * the repo source over `pluginRoot`, through the same `readFile`, which
   * is exactly what this function did before the source existed. */
  content?: ContentSource;
  vaultRoot: string;
  matterPath?: string;
  platform: Platform;
  tools: AvailableTools;
  cfg: VaultConfig;
}

/**
 * Builds the system prompt for a counsel-loop step: the host preamble, the
 * body of `skills/counsel/SKILL.md` (frontmatter stripped), the practice
 * profile if present, and the current matter file if present. Pure — every
 * file is read through the injected `readFile` (default `readFileSync`), so
 * a fake `readFile` makes this fully testable without touching disk. Never
 * reads `primitives/*.md`: those load lazily via the `read_primitive` tool,
 * so editing a primitive does not change the system prompt.
 */
export function assembleSystemPrompt(
  opts: AssembleSystemPromptOptions,
  readFile: (path: string) => string = path => readFileSync(path, 'utf8'),
): string {
  const content = opts.content ?? repoContentSource(opts.pluginRoot, { readFile });
  const skillBody = stripFrontmatter(content.read('skills/counsel/SKILL.md'));

  let prompt = HOST_PREAMBLE(opts.tools, opts.platform, opts.cfg) + '\n\n' + skillBody;

  const profile = readIfPresent(readFile, join(opts.vaultRoot, 'practice', 'profile.md'));
  if (profile !== null) {
    prompt += '\n\n## Practice profile\n' + profile;
  }

  if (opts.matterPath) {
    const matter = readIfPresent(readFile, join(opts.vaultRoot, opts.matterPath));
    if (matter !== null) {
      prompt += '\n\n## Current matter\n' + matter;
    }
  }

  return prompt;
}
