import { z } from 'zod';
import { repoContentSource } from '../content/repo';
import type { ContentSource } from '../content/source';
import type { ToolDef } from '../core/types';

const PRIMITIVES = 'primitives';

/** Primitive names the source ships under `primitives/`, without the `.md`
 * extension — e.g. `draft`, `evaluate`, `read`, `remember`, `research`. */
function listPrimitiveNames(source: ContentSource): string[] {
  return source
    .list(PRIMITIVES)
    .filter(path => path.endsWith('.md') && path.split('/').length === 2)
    .map(path => path.slice(PRIMITIVES.length + 1, -'.md'.length));
}

/**
 * `read_primitive {name}` — the runtime's stand-in for "read
 * `primitives/{name}.md`" in the methodology (see `HOST_PREAMBLE`). The
 * allowlist is the actual set of `.md` files the content source ships under
 * `primitives/` at call time, so an unknown or path-traversal name
 * (`../../etc/passwd`, `draft/../../../x`) is rejected rather than joined
 * onto a filesystem path.
 *
 * Takes the plugin root (the repo source over it, read on every call, so an
 * edited primitive is live at once) or a `ContentSource` (spec 2026-09-01
 * §3 — the compiled binary's embedded content, later).
 */
export function readPrimitiveTool(pluginRootOrSource: string | ContentSource): ToolDef<{ name: string }, string> {
  const source = typeof pluginRootOrSource === 'string' ? repoContentSource(pluginRootOrSource) : pluginRootOrSource;
  return {
    name: 'read_primitive',
    description: 'Read a primitive\'s detailed instructions by name (e.g. "draft", "evaluate", "read", "redline-output", "remember", "research").',
    inputSchema: z.object({ name: z.string().describe('The primitive name, without the .md extension.') }),
    execute: async ({ name }) => {
      const allowed = listPrimitiveNames(source);
      if (!allowed.includes(name)) {
        throw new Error(`unknown primitive: ${name}. Available: ${allowed.join(', ') || '(none)'}`);
      }
      return source.read(`${PRIMITIVES}/${name}.md`);
    },
  };
}
