import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Platform } from '../core/types';

/**
 * A script tool the methodology may reference, and the fields the matching
 * runtime tool takes. Used by `HOST_PREAMBLE` to build the script-mapping
 * table and to compute which tools are unavailable on a given platform. Keep
 * this list in lockstep with `tools/builtin.ts`'s `builtinTools()` — the
 * field names here must match that file's `inputSchema`s exactly, or the
 * preamble will teach the model to call tools with the wrong arguments.
 */
interface KnownScriptTool {
  name: string;
  invocation: string;
  fields: string;
  platforms: Platform[];
  unavailableReason: string;
}

const ALL_PLATFORMS: Platform[] = ['macos', 'linux', 'windows', 'hosted'];

const KNOWN_SCRIPT_TOOLS: KnownScriptTool[] = [
  {
    name: 'docket_sweep',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/docket_sweep.py" <matters_dir> --window <days> --format json',
    fields: '`days` (optional, default 60)',
    platforms: ALL_PLATFORMS,
    unavailableReason: 'not available on this platform',
  },
  {
    name: 'extract_redlines',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/extract_redlines.py" <input.docx>',
    fields: '`docx`',
    platforms: ALL_PLATFORMS,
    unavailableReason: 'not available on this platform',
  },
  {
    name: 'check_document',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/check_document.py" <input>',
    fields: '`docx`',
    platforms: ALL_PLATFORMS,
    unavailableReason: 'not available on this platform',
  },
  {
    name: 'clean_format',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/clean_format.py" <input.docx> <output.docx>',
    fields: '`input`, `output`',
    platforms: ALL_PLATFORMS,
    unavailableReason: 'not available on this platform',
  },
  {
    name: 'apply_redlines',
    invocation: 'python3 "${CLAUDE_PLUGIN_ROOT}/scripts/apply_redlines.py" [--track] <original.docx> <edits.json> <output.docx>',
    fields: '`original`, `edits`, `output`, `track` (optional)',
    platforms: ALL_PLATFORMS,
    unavailableReason: 'not available on this platform',
  },
  {
    name: 'word_compare',
    invocation: '"${CLAUDE_PLUGIN_ROOT}/scripts/word_compare.sh" <original.docx> <modified.docx> <author> <output.docx>',
    fields: '`original`, `modified`, `author`, `output`',
    platforms: ['macos'],
    unavailableReason: 'requires Microsoft Word for Mac',
  },
];

/**
 * The host-specific header prepended to the methodology body. Written for the
 * model, not the user: it maps every "run this script" / "read this file"
 * step in `SKILL.md` and the primitives onto the tool calls this runtime
 * actually exposes, states what the propose-then-approve write gate is, and
 * lists which tools exist on this run's platform.
 */
export function HOST_PREAMBLE(toolNames: string[], platform: Platform): string {
  const scriptTable = KNOWN_SCRIPT_TOOLS
    .map(t => `| \`${t.invocation}\` | \`${t.name}\` | ${t.fields} |`)
    .join('\n');

  const available = [...toolNames].sort().map(n => `\`${n}\``).join(', ');

  const unavailable = KNOWN_SCRIPT_TOOLS.filter(t => !toolNames.includes(t.name));
  const unavailableList = unavailable.length === 0
    ? 'none — every tool listed above is available on this platform.'
    : unavailable.map(t => `\`${t.name}\` (${t.unavailableReason})`).join(', ');

  return `# Host: Counsel OS runtime

You run inside the Counsel OS runtime, not inside Claude Code. Some steps in
the methodology below do not apply here. Use this section to translate them.

## The legal root is already resolved

The runtime resolved \`{legal_root}\` before this session started. Do not run
\`scripts/resolve_legal_root.sh\`. Do not ask the user for the legal root.
Treat every vault path in the methodology as already resolved.

## Scripts are tools

The methodology tells you to run scripts directly, for example
\`python3 "\${CLAUDE_PLUGIN_ROOT}/scripts/apply_redlines.py" ...\`. In this
runtime, call the matching tool instead. Do not run \`python3\` or \`bash\`
yourself. Pass the tool's arguments as named fields, not as a command line.

| Script call in the methodology | Tool | Fields |
|---|---|---|
${scriptTable}

## Primitives are a tool call

The methodology tells you to read \`primitives/{name}.md\` for the detailed
steps of a mode. In this runtime, call \`read_primitive\` with that name
instead of reading the file yourself. For example, call
\`read_primitive {"name": "draft"}\` to load \`primitives/draft.md\`.

## Writes go through two paths

Matter files stay under direct control. Call \`vault_write\` for any path
under \`matters/\`.

Knowledge-system files do not write directly. This covers \`practice/\`,
\`memory/\`, \`law/\`, and the entities directory. Call \`propose_update\` for
these paths instead. \`propose_update\` does not write the file — it records
a proposed change for the user to approve or reject. Tell the user what you
proposed and why.

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

/** Reads `path` with `readFile`, returning `null` instead of throwing when
 * the file does not exist (or any other read error occurs). */
function readIfPresent(readFile: (path: string) => string, path: string): string | null {
  try {
    return readFile(path);
  } catch {
    return null;
  }
}

export interface AssembleSystemPromptOptions {
  pluginRoot: string;
  vaultRoot: string;
  matterPath?: string;
  platform: Platform;
  toolNames: string[];
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
  const skillPath = join(opts.pluginRoot, 'skills', 'counsel', 'SKILL.md');
  const skillBody = stripFrontmatter(readFile(skillPath));

  let prompt = HOST_PREAMBLE(opts.toolNames, opts.platform) + '\n\n' + skillBody;

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
