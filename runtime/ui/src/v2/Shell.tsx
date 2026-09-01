import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchJson } from '../api/client';
import { bootstrapToken } from '../api/token';
import { onUnauthorized } from '../api/unauthorized';
import type { Health, SettingsView, ThreadHeader, VaultOverview } from '../api/types';
import { parseHash, threadFromHash, vaultPathFromHash, type Route } from '../app';
import { Chat } from './chat/Chat';
import type { ComposerSeed } from './chat/Composer';
import { Drawer } from './Drawer';
import { HomePage } from './home/HomePage';
import { Rail } from './Rail';
import { SessionLost } from './SessionLost';
import { SetupPage } from './SetupPage';
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
  // Not "no token in this tab": the browser may hold the sign-in cookie
  // from an earlier visit. The first request finds out; a 401 flips this.
  const [unauthorized, setUnauthorized] = useState(false);
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
  /** A prefill for the composer, pushed from the vault reader's ask bar. */
  const [seed, setSeed] = useState<ComposerSeed | undefined>(undefined);
  /** A message home's ask box already committed to — the chat pane SENDS
   * this one rather than parking it in the box. Same one-shot shape as
   * `seed`, and cleared the same way (`askUsed`). */
  const [initialAsk, setInitialAsk] = useState<ComposerSeed | undefined>(undefined);

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

  /**
   * Every file path the vault holds (`GET /vault/index`), the set behind
   * clickable paths in answers (cou-93 item 8). Loaded once the token is
   * good and again after a proposal lands — an approval can create the very
   * file the answer names. An older runtime without the route answers with
   * the HTML shell; that parse failure is swallowed and paths stay plain
   * text, which is exactly what they were before.
   */
  const [vaultPaths, setVaultPaths] = useState<ReadonlySet<string>>(() => new Set());
  const loadIndex = useCallback(async (): Promise<void> => {
    try {
      const paths = await fetchJson<unknown>('/vault/index');
      if (Array.isArray(paths)) setVaultPaths(new Set(paths.filter((p): p is string => typeof p === 'string')));
    } catch {
      // Left as it was: a stale or empty index only means fewer chips.
    }
  }, []);

  /**
   * Matter path → title, for the rail's second line under a thread with an
   * explicit matter link. One read of `/vault/overview` beside `/health`,
   * refreshed when a proposal lands (it may have created or renamed a
   * matter). HomePage keeps its own read — the two are not coupled.
   */
  const [matterTitles, setMatterTitles] = useState<Record<string, string>>({});
  const loadMatterTitles = useCallback(async (): Promise<void> => {
    try {
      const overview = await fetchJson<VaultOverview>('/vault/overview');
      const titles: Record<string, string> = {};
      for (const matter of overview.matters) titles[matter.path] = matter.title;
      setMatterTitles(titles);
    } catch {
      // The rail falls back to prettified filenames; nothing to say here.
    }
  }, []);

  const fileDecided = useCallback(
    (path: string): void => {
      const open = drawerRef.current;
      if (open.open && open.path === path) setDrawerRevision(revision => revision + 1);
      void loadIndex();
      void loadMatterTitles();
    },
    [loadIndex, loadMatterTitles],
  );

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

  /** The rail's draft row: RETURN to the draft already live in the chat
   * pane. Navigation only — never `newDraft`, which re-keys `Chat` and
   * would wipe whatever the reader had typed. The pane is mounted-but-hidden
   * off `#/chat` (the keep-stream invariant), so the draft is simply shown
   * again (cou-88). */
  const returnToDraft = (): void => {
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

  /** The vault's "Ask counsel about this file ↵": prefill the composer with
   * the path and go to chat (spec §3.4). A prompt-fill, not a flow.
   *
   * The fragment is re-stamped, never left bare: a URL that stops naming the
   * open thread reopens a DIFFERENT one on reload (the invariant
   * `stampThread` exists for). A draft has no thread to name, so `#/chat` is
   * the whole truth there. */
  const askAbout = useCallback((path: string): void => {
    setSeed(current => ({ text: `Regarding \`${path}\`: `, nonce: (current?.nonce ?? 0) + 1 }));
    setRoute('chat');
    setVaultPath(null);
    globalThis.history.replaceState(null, '', '#/chat');
    stampRef.current();
  }, []);

  /** The composer took the seed. Dropping it here is what makes a seed fire
   * ONCE: `Chat` is re-keyed on every thread switch and new draft, and a
   * seed still in state would refill the fresh box with a path the reader
   * left long ago. */
  const seedUsed = useCallback((): void => setSeed(undefined), []);

  /** Home's ask box: open a fresh draft chat and send the message. The draft
   * path already creates the thread on send, titled from the first line —
   * home adds nothing the composer's own send does not do.
   *
   * `setChatKey` remounts `Chat`, so the ask arrives at a pane with nothing
   * of the last conversation in it. */
  const startAsk = useCallback((message: string): void => {
    setNotFound(false);
    setSelected(null);
    setDraft(true);
    setChatKey(k => k + 1);
    setInitialAsk(current => ({ text: message, nonce: (current?.nonce ?? 0) + 1 }));
    setRoute('chat');
    setVaultPath(null);
    globalThis.history.replaceState(null, '', '#/chat');
  }, []);

  /** The chat pane sent the ask. Dropping it here is what keeps it to ONE
   * send: `Chat` is re-keyed on every thread switch, and an ask left in
   * state would be sent again — into whatever thread the reader opened
   * next. */
  const askUsed = useCallback((): void => setInitialAsk(undefined), []);

  useEffect(() => {
    const onHashChange = (): void => {
      // A printed `#token=…` link opened INTO a tab already showing the app
      // (the session-lost page, say) is a same-document navigation: no
      // reload, so `main.tsx`'s bootstrap never ran for it. Take the token
      // here, the same way — stored, fragment rewritten — and let the app in.
      if (bootstrapToken() !== null) setUnauthorized(false);
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

  /** Bumped by the setup page once a vault exists: re-runs the initial load. */
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (unauthorized) return;
    void (async () => {
      try {
        const next = await fetchJson<Health>('/health');
        setHealth(next);
        // Setup mode (spec 2026-09-01 §4): there is no vault, so every
        // vault-backed read would be a 409. The setup page is the whole app
        // until /health says otherwise.
        if (next.setup === true) return;
        void loadIndex();
        void loadMatterTitles();
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
  }, [unauthorized, attempt, loadThreads, loadIndex, loadMatterTitles]);

  /**
   * The rail footer's switcher picked a loaded provider (cou-90): make it
   * the saved default via the settings API, then fold the PUT's own
   * `effective` back into `health` so the plate updates in place.
   *
   * Read-modify-write on `registry` — the FILE — never on `effective`:
   * round-tripping `effective` through the PUT would write the built-ins
   * (and `--fake`) into the operator's `providers.yaml` as if they had
   * asked for them. Only `default` changes; providers, routes and the
   * timeout ride along untouched.
   */
  const setDefaultProvider = async (id: string): Promise<void> => {
    setError(null);
    try {
      const view = await fetchJson<SettingsView>('/settings');
      const next = await fetchJson<SettingsView>('/settings', {
        method: 'PUT',
        body: JSON.stringify({ ...view.registry, default: id }),
      });
      setHealth(current =>
        current === null
          ? current
          : {
              ...current,
              default: next.effective.default,
              providers: next.effective.providers,
              stepTimeoutMs: next.effective.stepTimeoutMs,
            },
      );
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setError(detail(err));
    }
  };

  /** Already confirmed: the rail's row asked "Delete this conversation?"
   * and the reader answered on the row itself (no `window.confirm`). */
  const deleteThread = async (id: string): Promise<void> => {
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

  // No usable key in this tab (never had one, or the runtime refused it).
  // Flipping the flag back re-runs the initial load above — it keys on
  // `unauthorized` — so a pasted token picks up exactly where a fresh
  // open would, with no reload and nothing written to the URL.
  if (unauthorized) return <SessionLost onRestored={() => setUnauthorized(false)} />;
  if (health?.setup === true) return <SetupPage onDone={() => setAttempt(n => n + 1)} />;

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
        onOpenDraft={returnToDraft}
        onDelete={id => void deleteThread(id)}
        onSetDefault={id => void setDefaultProvider(id)}
        matterTitles={matterTitles}
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
                seed={seed}
                onSeedUsed={seedUsed}
                initialAsk={initialAsk}
                onAskUsed={askUsed}
                onFileDecided={fileDecided}
                onOpenFile={openDrawer}
                vaultPaths={vaultPaths}
              />
            )}
          </main>
          {drawer.open ? (
            <Drawer
              path={drawer.path}
              revision={drawerRevision}
              onOpen={path => openDrawer(path)}
              onClose={closeDrawer}
              onAsk={askAbout}
            />
          ) : null}
        </div>

        {/* The pages wait for /health: before it answers, the runtime may be
            in setup mode, and Home's own reads would be 409s. */}
        {route === 'home' && health !== null ? <HomePage threads={threads} onAsk={startAsk} onOpenThread={openThread} health={health} /> : null}

        {route === 'vault' && health !== null ? (
          <VaultPage
            path={vaultPath}
            onAsk={askAbout}
            onOpen={path => {
              globalThis.location.hash = `#/vault?path=${encodeURIComponent(path)}`;
            }}
          />
        ) : null}

        {route === 'settings' && health !== null ? (
          <main className="v2-page">
            <SettingsPage health={health} />
          </main>
        ) : null}
      </div>
    </div>
  );
}
