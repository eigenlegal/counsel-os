import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../../api/client';
import type { VaultEntry, VaultHit, VaultOverview } from '../../api/types';
import { prettifyName } from './frontmatter';
import { Reader } from './Reader';
import { VaultTree } from './VaultTree';

/** Where a hit lives, for the run-in: `practice/reference`, or `''` at the root. */
function dirOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? '' : path.slice(0, cut);
}

/**
 * A hit is a DOCUMENT, not a path (cou-93 item 4): thirty truncated
 * `practice/reference/corporate-partnering…` rows told the reader nothing.
 * A matter shows its overview title; anything else its filename prettified,
 * the way the reader's own dochead does. The full path stays one hover away.
 */
export function hitTitle(path: string, overview: VaultOverview | null): string {
  const matter = overview?.matters.find(m => m.path === path);
  return matter?.title ?? prettifyName(path.slice(path.lastIndexOf('/') + 1));
}

/** The matched line as prose: heading marks, list bullets, quote bars and
 * bold stars are markdown for the reader's editor, not for a results row. */
export function cleanSnippet(snippet: string): string {
  return snippet.replace(/^[\s#>*-]+/, '').replace(/\*\*/g, '').trim();
}

export interface VaultPageProps {
  /** The file named by `#/vault?path=…`, or `null` for the tree alone. */
  path: string | null;
  onOpen(path: string): void;
  /** The reading pane's "Ask counsel about this file ↵" (spec §3.4). */
  onAsk?: (path: string) => void;
}

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * The vault surface (spec §3.4): a ~300px tree pane — search on top (⌘K
 * focuses, Enter runs `/vault/search`, results replace the tree until
 * cleared), the grouped tree under it — and the reading pane.
 */
export function VaultPage({ path, onOpen, onAsk }: VaultPageProps): JSX.Element {
  const [overview, setOverview] = useState<VaultOverview | null>(null);
  const [root, setRoot] = useState<VaultEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<VaultHit[] | null>(null);
  const search = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [ov, entries] = await Promise.all([
          fetchJson<VaultOverview>('/vault/overview'),
          fetchJson<VaultEntry[]>('/vault/list'),
        ]);
        setOverview(ov);
        setRoot(entries);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
      }
    })();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        search.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const runSearch = useCallback(async (): Promise<void> => {
    // A stale failure must not survive the next attempt — the error branch
    // replaces the whole tree.
    setError(null);
    const q = query.trim();
    if (q === '') {
      setHits(null);
      return;
    }
    try {
      setHits(await fetchJson<VaultHit[]>(`/vault/search?q=${encodeURIComponent(q)}`));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
    }
  }, [query]);

  const clear = (): void => {
    setQuery('');
    setHits(null);
    setError(null);
  };

  return (
    <div className="v2-vault">
      <div className="v2-vtree">
        <div className="v2-vsearch">
          <input
            ref={search}
            aria-label="Search the vault"
            placeholder="Search the vault…"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') void runSearch();
              if (event.key === 'Escape') clear();
            }}
          />
          <kbd aria-hidden="true">⌘K</kbd>
        </div>
        {/* Typing alone searches nothing — said before the reader wonders
            why the tree did not move (cou-93 item 4). */}
        {hits === null && query.trim() !== '' ? (
          <p className="muted v2-vhint" role="status">
            Enter to search
          </p>
        ) : null}

        {hits !== null ? (
          <div className="v2-tlist v2-vresults" role="region" aria-label="Search results">
            <div className="v2-vgroup">
              <span>
                Results{hits.length === 0 ? null : <span className="v2-vcount"> · {hits.length}</span>}
              </span>
              <button type="button" className="v2-link" onClick={clear}>
                clear
              </button>
            </div>
            {hits.length === 0 ? (
              <p className="muted v2-vempty">
                No results for “{query.trim()}”.{' '}
                <button type="button" className="v2-link" onClick={clear}>
                  Clear the search
                </button>
              </p>
            ) : (
              hits.map(hit => {
                const dir = dirOf(hit.path);
                // The server falls back to the path itself when no line
                // matched (a filename hit); repeating it under the title
                // would say nothing twice.
                const snippet = hit.snippet === hit.path ? '' : cleanSnippet(hit.snippet);
                return (
                  <button
                    key={hit.path}
                    type="button"
                    className="v2-vrow v2-vhit"
                    aria-current={path === hit.path ? 'page' : undefined}
                    title={hit.path}
                    onClick={() => onOpen(hit.path)}
                  >
                    <span className="v2-vhit-title">{hitTitle(hit.path, overview)}</span>
                    {dir === '' && snippet === '' ? null : (
                      <span className="v2-vhit-line">
                        {dir === '' ? null : <span className="v2-vhit-dir">{dir}</span>}
                        {snippet}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        ) : error !== null ? (
          <p className="notice notice-error v2-vempty" role="alert">
            {error}
          </p>
        ) : overview === null || root === null ? (
          <p className="muted v2-vempty">Loading…</p>
        ) : (
          <VaultTree overview={overview} root={root} selected={path} onOpen={onOpen} />
        )}
      </div>

      <main className="v2-vault-main">
        {path === null ? (
          <p className="muted v2-empty">Pick a file to read it.</p>
        ) : (
          <Reader key={path} path={path} outline onAsk={onAsk} />
        )}
      </main>
    </div>
  );
}
