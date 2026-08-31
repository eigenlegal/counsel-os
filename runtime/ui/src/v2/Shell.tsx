import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import { readToken } from '../api/token';
import { onUnauthorized } from '../api/unauthorized';
import type { Health, ThreadHeader } from '../api/types';
import { parseHash, threadFromHash, TOKEN_MESSAGE, vaultPathFromHash, type Route } from '../app';
import { Chat } from './chat/Chat';
import { Drawer } from './Drawer';
import { Rail } from './Rail';
import { SettingsPage } from './settings/SettingsPage';
import { VaultPage } from './vault/VaultPage';

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
 * The workbench (redesign spec §3.1): the rail on the left of EVERYTHING
 * (216px; a 56px icon rail on the vault route), then the main column —
 * Home at `#/`, the chat workspace at `#/chat?thread=<id>`, the vault and
 * settings pages.
 *
 * The keep-stream invariant (PR #28) still holds: the chat workspace is
 * HIDDEN off `#/chat`, never unmounted — unmounting aborts the step stream
 * and records the run `abandoned`. Thread selection is written INTO the
 * fragment (`?thread=`), but a rail click selects directly and rewrites the
 * hash with `replaceState` — the `hashchange` listener is for navigation
 * that arrives from outside (home rows, the docket's Review anchor, a
 * pasted link).
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
  const [listed, setListed] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, path: null });
  const [drawerRevision, setDrawerRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  /** Set when the fragment named a thread the list does not have. The reader
   * gets a draft AND is told — silently opening a DIFFERENT conversation is
   * the one thing a pasted link must never do. */
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  /** The route as of this render, for the callbacks that must not navigate:
   * `onThreadCreated` (the send may finish after the reader left chat) and
   * `deleteThread` (the rail is global now — delete is reachable from Home). */
  const routeRef = useRef(route);
  routeRef.current = route;
  const listSeq = useRef(0);

  const openDrawer = useCallback((path: string | null): void => {
    setDrawer(current => ({ open: true, path: path ?? current.path }));
  }, []);
  const closeDrawer = useCallback((): void => setDrawer(current => ({ ...current, open: false })), []);

  const drawerRef = useRef(drawer);
  drawerRef.current = drawer;

  const fileDecided = useCallback((path: string): void => {
    const open = drawerRef.current;
    if (open.open && open.path === path) setDrawerRevision(revision => revision + 1);
  }, []);

  const selectThread = (id: string): void => {
    setNotFound(false);
    if (id === selected && !draft) return;
    setSelected(id);
    setDraft(false);
    setChatKey(k => k + 1);
  };

  /** A rail/home click: select AND put the thread in the fragment, without
   * waiting on a hashchange (deterministic under tests, and a no-op remount
   * for the thread already on screen). */
  const openThread = (id: string): void => {
    selectThread(id);
    setRoute('chat');
    setVaultPath(null);
    globalThis.history.replaceState(null, '', `#/chat?thread=${encodeURIComponent(id)}`);
  };

  const newDraft = (): void => {
    setNotFound(false);
    setSelected(null);
    setDraft(true);
    setChatKey(k => k + 1);
  };

  const openDraft = (): void => {
    newDraft();
    setRoute('chat');
    setVaultPath(null);
    globalThis.history.replaceState(null, '', '#/chat');
  };

  /** Re-stamp `?thread=` onto a bare `#/chat`. The rail's Chat link has no
   * thread in its href, so following it from `#/chat?thread=t-1` used to
   * leave t-1 on screen under a URL that no longer named it — copy the link
   * or reload and the thread was gone. Only `?thread=` ever CHANGES the
   * selection; a bare `#/chat` keeps it and fixes the URL instead. */
  const stampThread = (): void => {
    if (draft || selected === null) return;
    globalThis.history.replaceState(null, '', `#/chat?thread=${encodeURIComponent(selected)}`);
  };

  /** Kept current for the hashchange listener, which must see this render's
   * `selected`/`draft` without re-subscribing. */
  const selectRef = useRef(selectThread);
  selectRef.current = selectThread;
  const stampRef = useRef(stampThread);
  stampRef.current = stampThread;

  useEffect(() => {
    const onHashChange = (): void => {
      const hash = globalThis.location.hash;
      const next = parseHash(hash).route;
      setRoute(next);
      setVaultPath(vaultPathFromHash(hash));
      const id = threadFromHash(hash);
      if (id !== null) {
        selectRef.current(id);
        return;
      }
      if (next === 'chat') stampRef.current();
    };
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => onUnauthorized(() => setUnauthorized(true)), []);

  const loadThreads = useCallback(async (): Promise<{ threads: ThreadHeader[]; fresh: boolean }> => {
    const ticket = ++listSeq.current;
    const list = await fetchJson<ThreadHeader[]>('/threads');
    const sorted = [...list].sort(byRecent);
    const fresh = ticket === listSeq.current;
    if (fresh) setThreads(sorted);
    return { threads: sorted, fresh };
  }, []);

  useEffect(() => {
    if (unauthorized) return;
    void (async () => {
      try {
        setHealth(await fetchJson<Health>('/health'));
        const { threads: list, fresh } = await loadThreads();
        if (!fresh) return;
        // The fragment may already name the thread (a pasted link, the
        // docket's Review). It wins over "most recent" when it exists.
        const wanted = threadFromHash(globalThis.location.hash);
        if (wanted !== null && !list.some(t => t.id === wanted)) {
          // Deleted, or from another vault. Open a draft and SAY so, and drop
          // the dead `?thread=` so the URL stops claiming otherwise.
          if (!draftRef.current) {
            setNotFound(true);
            setDraft(true);
            globalThis.history.replaceState(null, '', '#/chat');
          }
          return;
        }
        const first = wanted ?? list[0]?.id ?? null;
        if (!draftRef.current) setSelected(current => current ?? first);
        if (first === null) setDraft(true);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
        setDraft(true);
      } finally {
        setListed(true);
      }
    })();
  }, [unauthorized, loadThreads]);

  const deleteThread = async (id: string): Promise<void> => {
    if (!globalThis.confirm('Delete this thread? Its transcript cannot be recovered from here.')) return;
    setBusy(true);
    setError(null);
    try {
      await fetchJson<void>(`/threads/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const { threads: list } = await loadThreads();
      if (selected === id) {
        const next = list[0]?.id ?? null;
        if (next === null) newDraft();
        else selectThread(next);
        // The rail is global now, so Delete is reachable from Home and
        // Settings. Only the chat route follows the new selection into the
        // fragment — deleting from Home must not navigate away from Home.
        if (routeRef.current === 'chat') {
          globalThis.history.replaceState(null, '', next === null ? '#/chat' : `#/chat?thread=${encodeURIComponent(next)}`);
        }
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
      <Rail
        route={route}
        threads={threads}
        selected={selected}
        draft={draft}
        busy={busy}
        health={health}
        collapsed={route === 'vault'}
        onSelect={openThread}
        onNew={openDraft}
        onDelete={id => void deleteThread(id)}
      />
      <div className="v2-main-col">
        {error === null ? null : (
          <p className="v2-notice v2-notice-error" role="alert">
            {error}
          </p>
        )}
        {notFound ? (
          <p className="v2-notfound muted" role="status">
            that conversation was not found
          </p>
        ) : null}

        {/* The chat workspace stays MOUNTED on every route and is only
            HIDDEN off `#/chat` — the keep-stream invariant (PR #28). */}
        <div className={drawer.open ? 'v2-work v2-drawer-open' : 'v2-work'} hidden={route !== 'chat'}>
          <main className="v2-main">
            {health === null || (!draft && !listed) ? (
              <p className="muted v2-empty">Loading…</p>
            ) : (
              <Chat
                key={chatKey}
                threadId={draft ? null : selected}
                health={health}
                onThreadCreated={header => {
                  setSelected(header.id);
                  setDraft(false);
                  // The fragment now names the thread — replaceState, so no
                  // hashchange, so no remount mid-stream. Only while the
                  // reader is still ON chat: a send that finishes after they
                  // opened the vault must not rewrite the URL out from under
                  // the page they are reading.
                  if (routeRef.current === 'chat') {
                    globalThis.history.replaceState(null, '', `#/chat?thread=${encodeURIComponent(header.id)}`);
                  }
                  void loadThreads();
                }}
                onThreadTouched={() => void loadThreads()}
                onFileDecided={fileDecided}
                onOpenFile={openDrawer}
              />
            )}
          </main>
          {drawer.open ? (
            <Drawer path={drawer.path} revision={drawerRevision} onOpen={path => openDrawer(path)} onClose={closeDrawer} />
          ) : null}
        </div>

        {route === 'home' ? (
          // Task 4 replaces this stub with <HomePage …/>.
          <main className="v2-page v2-home" aria-label="Home">
            <p className="muted v2-empty">Home lands in Task 4.</p>
          </main>
        ) : null}

        {route === 'vault' ? (
          <VaultPage
            path={vaultPath}
            onOpen={path => {
              globalThis.location.hash = `#/vault?path=${encodeURIComponent(path)}`;
            }}
          />
        ) : null}

        {route === 'settings' ? (
          <main className="v2-page">
            <SettingsPage health={health} />
          </main>
        ) : null}
      </div>
    </div>
  );
}
