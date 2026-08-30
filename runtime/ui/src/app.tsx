import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchJson } from './api/client';
import { readToken } from './api/token';
import { onUnauthorized } from './api/unauthorized';
import type { Health, ThreadHeader } from './api/types';
import { Chat } from './chat/Chat';
import { ThreadList } from './chat/ThreadList';
import { Settings } from './settings/Settings';
import { onUiFlagChange, readUiFlag, type UiFlag } from './ui-flag';
import { Shell } from './v2/Shell';
import { Vault } from './vault/Vault';

/** The three surfaces the fragment routes between. */
type Route = 'chat' | 'vault' | 'settings';

/** Spec §5, word for word: the page cannot fix this itself — the token is
 * printed by the process that owns it. */
export const TOKEN_MESSAGE = 'token missing or stale — restart `counsel-os serve` and open the printed URL';

/** The fragment split into the part that picks a surface and the part that
 * parameterizes it — `#/vault?path=matters/acme/notes.md`. The query lives
 * in the FRAGMENT, not the URL's own query string: the token lives there
 * too, and neither is anything the server should ever see. */
export function parseHash(hash: string): { route: Route; params: URLSearchParams } {
  const raw = hash.replace(/^#/, '');
  const cut = raw.indexOf('?');
  const path = cut === -1 ? raw : raw.slice(0, cut);
  const params = new URLSearchParams(cut === -1 ? '' : raw.slice(cut + 1));
  if (path === '/vault' || path.startsWith('/vault/')) return { route: 'vault', params };
  if (path === '/settings' || path.startsWith('/settings/')) return { route: 'settings', params };
  return { route: 'chat', params };
}

export function routeFromHash(hash: string): Route {
  return parseHash(hash).route;
}

/** The vault file the fragment names, or `null` for "the tree, nothing
 * open". */
export function vaultPathFromHash(hash: string): string | null {
  const { route, params } = parseHash(hash);
  if (route !== 'vault') return null;
  const path = params.get('path');
  return path === null || path === '' ? null : path;
}

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Newest first, so the thread someone just used is the one at the top. */
function byRecent(a: ThreadHeader, b: ThreadHeader): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function App(): JSX.Element {
  const [route, setRoute] = useState<Route>(() => routeFromHash(globalThis.location.hash));
  const [vaultPath, setVaultPath] = useState<string | null>(() => vaultPathFromHash(globalThis.location.hash));
  // The token bootstrap has already run (`main.tsx`), so a token that is
  // missing NOW is missing for good — the page can say so before it makes a
  // single request rather than after a failed one.
  const [unauthorized, setUnauthorized] = useState(() => readToken() === null);
  const [health, setHealth] = useState<Health | null>(null);
  const [threads, setThreads] = useState<ThreadHeader[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onHashChange = (): void => {
      setRoute(routeFromHash(globalThis.location.hash));
      setVaultPath(vaultPathFromHash(globalThis.location.hash));
    };
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  // One subscription for the whole app: `client.ts` reports a missing or
  // rejected token from wherever it happened, and the page answers with one
  // message instead of every surface inventing its own.
  useEffect(() => onUnauthorized(() => setUnauthorized(true)), []);

  const loadThreads = useCallback(async (): Promise<ThreadHeader[]> => {
    const list = await fetchJson<ThreadHeader[]>('/threads');
    const sorted = [...list].sort(byRecent);
    setThreads(sorted);
    return sorted;
  }, []);

  useEffect(() => {
    if (unauthorized) return;
    void (async () => {
      try {
        setHealth(await fetchJson<Health>('/health'));
        const list = await loadThreads();
        setSelected(current => current ?? list[0]?.id ?? null);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
      }
    })();
  }, [unauthorized, loadThreads]);

  const createThread = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const header = await fetchJson<ThreadHeader>('/threads', { method: 'POST', body: JSON.stringify({}) });
      await loadThreads();
      setSelected(header.id);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
    } finally {
      setBusy(false);
    }
  };

  const deleteThread = async (id: string): Promise<void> => {
    // A thread is the transcript AND its proposals; deleting one is not
    // recoverable from the page, so it asks.
    if (!globalThis.confirm('Delete this thread? Its transcript cannot be recovered from here.')) return;
    setBusy(true);
    setError(null);
    try {
      await fetchJson<void>(`/threads/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const list = await loadThreads();
      setSelected(current => (current === id ? (list[0]?.id ?? null) : current));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
    } finally {
      setBusy(false);
    }
  };

  if (unauthorized) {
    return (
      <main className="page-message">
        <h1>counsel-os</h1>
        <p className="notice notice-error" role="alert">
          {TOKEN_MESSAGE}
        </p>
      </main>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>counsel-os</h1>
        <nav aria-label="Surfaces">
          <a href="#/" aria-current={route === 'chat' ? 'page' : undefined}>
            Chat
          </a>
          <a href="#/vault" aria-current={route === 'vault' ? 'page' : undefined}>
            Vault
          </a>
          <a href="#/settings" aria-current={route === 'settings' ? 'page' : undefined}>
            Settings
          </a>
        </nav>
        {health === null ? null : (
          <span className="app-vault" title={health.vault}>
            {health.vault}
          </span>
        )}
      </header>

      {error === null ? null : (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      {route === 'chat' ? (
        <div className="two-column">
          <ThreadList
            threads={threads}
            selected={selected}
            busy={busy}
            onSelect={setSelected}
            onCreate={() => void createThread()}
            onDelete={id => void deleteThread(id)}
          />
          <main className="column-main">
            {health === null ? (
              <p className="muted">Loading…</p>
            ) : selected === null ? (
              <p className="muted">No thread selected. Make one to start.</p>
            ) : (
              <Chat key={selected} threadId={selected} health={health} onThreadTouched={() => void loadThreads()} />
            )}
          </main>
        </div>
      ) : route === 'vault' ? (
        // The fragment owns which file is open, so a proposal card's link
        // and a click in the tree land in exactly the same state — and the
        // browser's Back button walks between files for free.
        <Vault
          path={vaultPath}
          onOpen={path => {
            globalThis.location.hash = `#/vault?path=${encodeURIComponent(path)}`;
          }}
        />
      ) : (
        <main className="column-main settings-page">
          <Settings health={health} />
        </main>
      )}
    </div>
  );
}

/**
 * Picks the shell by the design flag and stamps it on `<html data-ui>` so the
 * v2 tokens in `styles.css` apply to the whole page, dialogs included.
 */
export function Root(): JSX.Element {
  const [ui, setUi] = useState<UiFlag>(() => readUiFlag());
  useEffect(() => onUiFlagChange(setUi), []);
  useEffect(() => {
    document.documentElement.dataset['ui'] = ui;
  }, [ui]);
  return ui === 'v2' ? <Shell /> : <App />;
}
