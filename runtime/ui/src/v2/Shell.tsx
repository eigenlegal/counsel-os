import { useCallback, useEffect, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import { readToken } from '../api/token';
import { onUnauthorized } from '../api/unauthorized';
import type { Health, ThreadHeader } from '../api/types';
import { parseHash, TOKEN_MESSAGE, vaultPathFromHash } from '../app';
import { Chat } from '../chat/Chat';
import { Settings } from '../settings/Settings';
import { Vault } from '../vault/Vault';
import { Drawer } from './Drawer';
import { Rail } from './Rail';

type Route = 'chat' | 'vault' | 'settings';

export interface DrawerState {
  open: boolean;
  path: string | null;
}

function detail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function byRecent(a: ThreadHeader, b: ThreadHeader): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

/**
 * The workbench (spec §2, "Shell"): top bar, thread rail, the thread, and a
 * vault drawer on the right. `#/vault` and `#/settings` are still full
 * pages; on the chat route the nav's "Vault" opens the drawer instead, so a
 * file can be checked without leaving the thread.
 *
 * The chat is keyed by `chatKey`, which changes when the reader PICKS a
 * different thread or starts a draft — never when a draft becomes a thread
 * on its first send. Re-keying then would remount the chat mid-stream.
 */
export function Shell(): JSX.Element {
  const [route, setRoute] = useState<Route>(() => parseHash(globalThis.location.hash).route);
  const [vaultPath, setVaultPath] = useState<string | null>(() => vaultPathFromHash(globalThis.location.hash));
  const [unauthorized, setUnauthorized] = useState(() => readToken() === null);
  const [health, setHealth] = useState<Health | null>(null);
  const [threads, setThreads] = useState<ThreadHeader[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, path: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openDrawer = useCallback((path: string | null): void => {
    setDrawer(current => ({ open: true, path: path ?? current.path }));
  }, []);
  const closeDrawer = useCallback((): void => setDrawer(current => ({ ...current, open: false })), []);

  useEffect(() => {
    const onHashChange = (): void => {
      setRoute(parseHash(globalThis.location.hash).route);
      setVaultPath(vaultPathFromHash(globalThis.location.hash));
    };
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

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
        const first = list[0]?.id ?? null;
        setSelected(current => current ?? first);
        if (first === null) setDraft(true);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
      }
    })();
  }, [unauthorized, loadThreads]);

  const selectThread = (id: string): void => {
    setSelected(id);
    setDraft(false);
    setChatKey(k => k + 1);
  };

  const newDraft = (): void => {
    setSelected(null);
    setDraft(true);
    setChatKey(k => k + 1);
  };

  const deleteThread = async (id: string): Promise<void> => {
    if (!globalThis.confirm('Delete this thread? Its transcript cannot be recovered from here.')) return;
    setBusy(true);
    setError(null);
    try {
      await fetchJson<void>(`/threads/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const list = await loadThreads();
      if (selected === id) {
        const next = list[0]?.id ?? null;
        if (next === null) newDraft();
        else selectThread(next);
      }
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
    <div className="v2-shell">
      <header className="v2-top">
        <h1 className="v2-brand">counsel-os</h1>
        <nav aria-label="Surfaces">
          <a href="#/" aria-current={route === 'chat' ? 'page' : undefined}>
            Chat
          </a>
          <a
            href="#/vault"
            aria-current={route === 'vault' ? 'page' : undefined}
            onClick={
              route === 'chat'
                ? event => {
                    // On the chat route the vault is a drawer, not a page.
                    event.preventDefault();
                    openDrawer(null);
                  }
                : undefined
            }
          >
            Vault
          </a>
          <a href="#/settings" aria-current={route === 'settings' ? 'page' : undefined}>
            Settings
          </a>
        </nav>
        {health === null ? null : (
          <span className="v2-top-meta">
            <span className="v2-top-vault" title={health.vault}>
              {health.vault}
            </span>
            <span className="v2-top-model">{health.default ?? 'no default model'}</span>
          </span>
        )}
      </header>

      {error === null ? null : (
        <p className="v2-notice v2-notice-error" role="alert">
          {error}
        </p>
      )}

      {route === 'chat' ? (
        <div className={drawer.open ? 'v2-work v2-drawer-open' : 'v2-work'}>
          <Rail
            threads={threads}
            selected={selected}
            draft={draft}
            busy={busy}
            onSelect={selectThread}
            onNew={newDraft}
            onDelete={id => void deleteThread(id)}
          />
          <main className="v2-main">
            {health === null ? (
              <p className="muted v2-empty">Loading…</p>
            ) : draft || selected === null ? (
              // Task 2 replaces this branch with the v2 Chat's draft mode.
              <p className="muted v2-empty">New conversation. Send a message to start it.</p>
            ) : (
              <Chat key={chatKey} threadId={selected} health={health} onThreadTouched={() => void loadThreads()} />
            )}
          </main>
          {drawer.open ? <Drawer path={drawer.path} onOpen={path => openDrawer(path)} onClose={closeDrawer} /> : null}
        </div>
      ) : route === 'vault' ? (
        <Vault
          path={vaultPath}
          onOpen={path => {
            globalThis.location.hash = `#/vault?path=${encodeURIComponent(path)}`;
          }}
        />
      ) : (
        <main className="v2-page">
          <Settings health={health} />
        </main>
      )}
    </div>
  );
}
