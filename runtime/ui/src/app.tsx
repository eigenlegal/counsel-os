import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchJson } from './api/client';
import { readToken } from './api/token';
import { onUnauthorized } from './api/unauthorized';
import type { Health, ThreadHeader } from './api/types';
import { Chat } from './chat/Chat';
import { ThreadList } from './chat/ThreadList';

/** The three surfaces the fragment routes between. Two of them are stubs
 * until the vault and settings screens land. */
type Route = 'chat' | 'vault' | 'settings';

/** Spec §5, word for word: the page cannot fix this itself — the token is
 * printed by the process that owns it. */
export const TOKEN_MESSAGE = 'token missing or stale — restart `counsel-os serve` and open the printed URL';

export function routeFromHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path === '/vault' || path.startsWith('/vault/')) return 'vault';
  if (path === '/settings' || path.startsWith('/settings/')) return 'settings';
  return 'chat';
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
    const onHashChange = (): void => setRoute(routeFromHash(globalThis.location.hash));
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
      ) : (
        <main className="column-main">
          <ComingNext surface={route} />
        </main>
      )}
    </div>
  );
}

/** The vault and settings surfaces are the next build step (spec §7); the
 * routes exist now so the shell they land in does not change under them. */
function ComingNext({ surface }: { surface: 'vault' | 'settings' }): JSX.Element {
  return (
    <section className="page-message">
      <h2>{surface === 'vault' ? 'Vault' : 'Settings'}</h2>
      <p className="muted">Coming next.</p>
    </section>
  );
}
