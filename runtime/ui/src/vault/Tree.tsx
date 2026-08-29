import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import type { VaultEntry } from '../api/types';

/** The key the root level is cached under. `GET /vault/list` with no `dir`
 * lists the vault root, and `''` is what the server normalizes `.` to. */
export const ROOT = '';

/** The runtime's private directory. The server refuses to list or read it,
 * and it is filtered here too: a client that only hides what the server
 * happens to hide is one server bug away from showing thread logs and the
 * bearer token's neighbours in a file tree. */
const RESERVED = '.counsel';

export function baseName(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? path : path.slice(cut + 1);
}

/** Case-insensitive, and on EVERY segment: the vault lives on macOS, where
 * `.Counsel` and `.COUNSEL` are the same directory. */
export function isReserved(path: string): boolean {
  return path.split('/').some(segment => segment.toLowerCase() === RESERVED);
}

/** Directories first, then by name. A vault is folders of matters with a few
 * files beside them, and a flat alphabetical list buries the folders. */
export function orderEntries(entries: VaultEntry[]): VaultEntry[] {
  return entries
    .filter(e => !isReserved(e.path))
    .sort((a, b) =>
      a.kind === b.kind ? baseName(a.path).localeCompare(baseName(b.path)) : a.kind === 'dir' ? -1 : 1,
    );
}

interface Level {
  entries?: VaultEntry[];
  error?: string;
}

export interface TreeProps {
  /** The file currently open, so the tree can mark it. */
  selected: string | null;
  onSelect(path: string): void;
}

/**
 * The vault as a tree, one directory at a time.
 *
 * Lazy on purpose (spec §2): a real vault is thousands of files across
 * matters and law content, and a recursive listing would walk all of it to
 * draw a sidebar. A folder is listed when somebody opens it, and the result
 * is kept — closing and reopening does not ask again.
 */
export function Tree({ selected, onSelect }: TreeProps): JSX.Element {
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set([ROOT]));

  const load = useCallback(async (dir: string): Promise<void> => {
    const query = dir === ROOT ? '' : `?dir=${encodeURIComponent(dir)}`;
    try {
      const entries = await fetchJson<VaultEntry[]>(`/vault/list${query}`);
      setLevels(prev => ({ ...prev, [dir]: { entries: orderEntries(entries) } }));
    } catch (err) {
      // A 401 is the app's problem, not this folder's — `client.ts` has
      // already announced it, and a per-folder message would just be noise
      // over the top of the page-wide one.
      if (err instanceof ApiError && err.status === 401) return;
      setLevels(prev => ({ ...prev, [dir]: { error: err instanceof Error ? err.message : String(err) } }));
    }
  }, []);

  useEffect(() => {
    void load(ROOT);
  }, [load]);

  const toggle = (dir: string): void => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
    // Fetched once, on first open. `levels` keeps both the entries and a
    // failure, so a folder that errored does not re-request on every click.
    if (levels[dir] === undefined) void load(dir);
  };

  const root = levels[ROOT];

  return (
    <nav className="vault-tree" aria-label="Vault">
      <h2>Vault</h2>
      {root === undefined ? (
        <p className="muted">Loading…</p>
      ) : (
        <Level dir={ROOT} levels={levels} open={open} selected={selected} onToggle={toggle} onSelect={onSelect} />
      )}
    </nav>
  );
}

interface LevelProps {
  dir: string;
  levels: Record<string, Level>;
  open: ReadonlySet<string>;
  selected: string | null;
  onToggle(dir: string): void;
  onSelect(path: string): void;
}

function Level({ dir, levels, open, selected, onToggle, onSelect }: LevelProps): JSX.Element {
  const level = levels[dir];
  if (level === undefined) return <p className="muted vault-level-note">Loading…</p>;
  if (level.error !== undefined) {
    return (
      <p className="notice notice-error vault-level-note" role="alert">
        {level.error}
      </p>
    );
  }
  const entries = level.entries ?? [];
  if (entries.length === 0) return <p className="muted vault-level-note">Empty.</p>;

  return (
    <ul className="vault-level">
      {entries.map(entry =>
        entry.kind === 'dir' ? (
          <li key={entry.path}>
            <button
              type="button"
              className="vault-dir"
              aria-expanded={open.has(entry.path)}
              onClick={() => onToggle(entry.path)}
            >
              <span aria-hidden="true">{open.has(entry.path) ? '▾' : '▸'}</span> {baseName(entry.path)}
            </button>
            {open.has(entry.path) ? (
              <Level
                dir={entry.path}
                levels={levels}
                open={open}
                selected={selected}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ) : null}
          </li>
        ) : (
          <li key={entry.path}>
            <button
              type="button"
              className="vault-file"
              aria-current={selected === entry.path ? 'page' : undefined}
              onClick={() => onSelect(entry.path)}
            >
              {baseName(entry.path)}
            </button>
          </li>
        ),
      )}
    </ul>
  );
}
