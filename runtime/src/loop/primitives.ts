import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { ToolDef } from '../core/types';

/** Primitive names available under `<pluginRoot>/primitives/`, without the
 * `.md` extension — e.g. `draft`, `evaluate`, `read`, `remember`, `research`. */
function listPrimitiveNames(pluginRoot: string): string[] {
  const dir = join(pluginRoot, 'primitives');
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.filter(name => name.endsWith('.md')).map(name => name.slice(0, -'.md'.length));
}

/**
 * `read_primitive {name}` — the runtime's stand-in for "read
 * `primitives/{name}.md`" in the methodology (see `HOST_PREAMBLE`). The
 * allowlist is the actual set of `.md` files under `<pluginRoot>/primitives/`
 * at call time, so an unknown or path-traversal name (`../../etc/passwd`,
 * `draft/../../../x`) is rejected rather than joined onto a filesystem path.
 */
export function readPrimitiveTool(pluginRoot: string): ToolDef<{ name: string }, string> {
  return {
    name: 'read_primitive',
    description: 'Read a primitive\'s detailed instructions by name (e.g. "draft", "evaluate", "read", "redline-output", "remember", "research").',
    inputSchema: z.object({ name: z.string().describe('The primitive name, without the .md extension.') }),
    execute: async ({ name }) => {
      const allowed = listPrimitiveNames(pluginRoot);
      if (!allowed.includes(name)) {
        throw new Error(`unknown primitive: ${name}. Available: ${allowed.join(', ') || '(none)'}`);
      }
      return readFileSync(join(pluginRoot, 'primitives', `${name}.md`), 'utf8');
    },
  };
}
