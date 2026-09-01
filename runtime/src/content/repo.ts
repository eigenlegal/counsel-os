import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isShippedPath, SHIPPED_ROOTS, type ContentSource } from './source';

export interface RepoSourceOptions {
  /** Injected for tests and for the prompt's own fake reader. Default:
   * `readFileSync(path, 'utf8')`. */
  readFile?: (absolutePath: string) => string;
}

/** Walks `dir` recursively, returning repo-relative paths of every FILE,
 * sorted. Missing or unreadable directories list as empty — a checkout
 * without `templates/` is a checkout with no memory template, not a crash. */
function walk(root: string, rel: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(join(root, rel)).sort();
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const path = `${rel}/${name}`;
    let isDir = false;
    try {
      isDir = statSync(join(root, path)).isDirectory();
    } catch {
      continue;
    }
    if (isDir) out.push(...walk(root, path));
    else if (isShippedPath(path)) out.push(path);
  }
  return out;
}

/**
 * The content source over a checkout (or an installed plugin tree): the
 * shipped roots under `pluginRoot`, read from disk on every call — editing
 * a primitive is visible on the next `read_primitive`, as it is today.
 */
export function repoContentSource(pluginRoot: string, opts: RepoSourceOptions = {}): ContentSource {
  const readFile = opts.readFile ?? (p => readFileSync(p, 'utf8'));
  return {
    kind: 'repo',
    list(prefix: string): string[] {
      const roots = SHIPPED_ROOTS.filter(root => prefix === root || prefix.startsWith(`${root}/`) || root.startsWith(`${prefix}/`));
      const files: string[] = [];
      for (const root of roots) {
        for (const path of walk(pluginRoot, root)) {
          if (path === prefix || path.startsWith(`${prefix}/`)) files.push(path);
        }
      }
      return files.sort();
    },
    has(path: string): boolean {
      if (!isShippedPath(path)) return false;
      try {
        return statSync(join(pluginRoot, path)).isFile();
      } catch {
        return false;
      }
    },
    read(path: string): string {
      if (!isShippedPath(path)) throw new Error(`not shipped content: ${path}`);
      return readFile(join(pluginRoot, path));
    },
  };
}
