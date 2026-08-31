/**
 * Source chips (spec §3.3): derived — the files the step ACTUALLY read,
 * rendered when the model's text names them. No prompt change: this is a
 * transform on the markdown SOURCE (backticked mentions become markdown
 * links into the vault), so the output still flows through `renderMarkdown`
 * and its sanitizer like every other character of the answer.
 */
import type { ToolCallView } from '../../chat/turns';

export function readPathsOf(tools: ToolCallView[]): string[] {
  const out: string[] = [];
  for (const tool of tools) {
    if (tool.name !== 'vault_read') continue;
    const input = tool.input;
    if (typeof input !== 'object' || input === null) continue;
    const path = (input as Record<string, unknown>)['path'];
    if (typeof path === 'string' && path !== '' && !out.includes(path)) out.push(path);
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function linkCitations(source: string, readPaths: string[]): string {
  let out = source;
  for (const path of readPaths) {
    const base = path.slice(path.lastIndexOf('/') + 1);
    const href = `#/vault?path=${encodeURIComponent(path)}`;
    for (const name of new Set([path, base])) {
      // Only backticked spellings; the lookaround keeps an existing markdown
      // link from being wrapped twice.
      const mention = new RegExp(`(?<!\\[)\`${escapeRegExp(name)}\`(?!\\]\\()`, 'g');
      out = out.replace(mention, `[\`${name}\`](${href})`);
    }
  }
  return out;
}
