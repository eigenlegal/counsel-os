import { useCallback, useEffect, useRef, useState } from 'react';
import {
  go,
  href,
  parseRoute,
  request,
  type Matter,
  type Snapshot,
  type Surface,
  type WorkspaceCatalog,
  type ConversationSummary,
  type MatterBrief,
} from './api';
import { Badge, ErrorNotice } from './components';
import { Editor, type EditorKind, type EditorState } from './Editor';
import { Chat } from './Chat';
import { Icon, type IconName } from './icons';
import { Library } from './Library';
import { ClientPage } from './Clients';
import { MatterPage } from './MatterPage';
import { RecordReader } from './RecordReader';
import { SearchPage } from './SearchPage';
import { Settings } from './Settings';
import { ImportWorkspace } from './ImportWorkspace';
import { ProfileEditor, ProfileSetupContext } from './Profile';
import { PracticeDocumentModal, ConfirmPracticeIdentity } from './PracticeDocument';
import { ConversationHistory } from './ConversationHistory';
import { RecordTrash } from './RecordTrash';
import { ImportActivity } from './ImportActivity';
import { SidebarRecents } from './SidebarRecents';
import { WorkspaceWelcome } from './WorkspaceWelcome';
import { WorkspaceFrame } from './WorkspaceFrame';

const nav: { page: Surface; label: string; icon: IconName }[] = [
  { page: 'home', label: 'Chats', icon: 'chat' },
  { page: 'matters', label: 'Matters', icon: 'matter' },
  { page: 'work', label: 'Saved outputs', icon: 'work' },
  { page: 'knowledge', label: 'Practice', icon: 'knowledge' },
  { page: 'references', label: 'Sources', icon: 'reference' },
];
const surfaces: Record<EditorKind, Surface> = {
  matter: 'matters',
  reference: 'references',
  knowledge: 'knowledge',
  work: 'work',
};

function RemoteMatter({
  id,
  data,
  openEditor,
}: {
  id: string;
  data: Snapshot;
  openEditor: (state: EditorState) => void;
}): JSX.Element {
  const [context, setContext] = useState<
    | (WorkspaceCatalog & {
        matter: Matter;
        brief: MatterBrief | null;
        conversations: ConversationSummary[];
      })
    | null
  >(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    const abort = new AbortController();
    request<
      WorkspaceCatalog & {
        matter: Matter;
        brief: MatterBrief | null;
        conversations: ConversationSummary[];
      }
    >(`/matters/${id}/context`, undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) {
          setContext(value);
          setError('');
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError((e as Error).message);
      });
    return () => abort.abort();
  }, [id, data, revision]);
  return error ? (
    <ErrorNotice message={error} />
  ) : context ? (
    <MatterPage
      matter={context.matter}
      brief={context.brief}
      conversations={context.conversations}
      refresh={() => setRevision((v) => v + 1)}
      data={{ ...data, ...context, matters: data.matters }}
      openEditor={openEditor}
    />
  ) : (
    <div className="loading-state">Opening matter…</div>
  );
}

export function WorkspaceApp(): JSX.Element {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const [routeHash, setRouteHash] = useState(location.hash);
  const setupStarted = useRef(false);
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [confirmingIdentity, setConfirmingIdentity] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [toast, setToast] = useState('');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const requestSequence = useRef(0);
  const contentRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const shortcutsRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    try {
      const [next, chats] = await Promise.all([
        request<Snapshot>(),
        request<ConversationSummary[]>('/conversations'),
      ]);
      if (sequence === requestSequence.current) {
        setData(next);
        setConversations(chats);
        setError('');
      }
    } catch (e) {
      if (sequence === requestSequence.current) setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const focused = () => {
      void refresh();
    };
    window.addEventListener('focus', focused);
    return () => {
      window.removeEventListener('focus', focused);
      requestSequence.current++;
    };
  }, [refresh, route.page]);
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await request<ConversationSummary[]>(
          '/conversations',
          undefined,
          abort.signal,
        );
        if (!abort.signal.aborted) setConversations(result);
      } catch {
        /* The main surface reports connection failures; retain saved navigation. */
      }
      if (!abort.signal.aborted)
        timer = setTimeout(() => {
          void poll();
        }, 1500);
    }
    void poll();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const resized = () => {
      setCompact(media.matches);
      if (!media.matches) setMobileNav(false);
    };
    media.addEventListener('change', resized);
    return () => media.removeEventListener('change', resized);
  }, []);
  useEffect(() => {
    if (compact && mobileNav) sidebarRef.current?.querySelector<HTMLElement>('a')?.focus();
  }, [compact, mobileNav]);
  useEffect(() => {
    let acceptedHash = location.hash, sequence = 0;
    const changed = async () => {
      const requested = location.hash, current = ++sequence;
      // Keep the current editor mounted until pending drafts are durable.
      // Failed/conflicting saves must not strand copyable text off-screen.
      const saved = !window.counselSaveDrafts || await window.counselSaveDrafts();
      if (current !== sequence) return;
      if (!saved) {
        history.replaceState(null, '', `${location.pathname}${location.search}${acceptedHash}`);
        setToast('Finish draft recovery before leaving this page. Your text is still here.');
        return;
      }
      acceptedHash = requested; setRouteHash(requested);
      setRoute(parseRoute(requested)); setMobileNav(false);
    };
    window.addEventListener('hashchange', changed);
    return () => { sequence++; window.removeEventListener('hashchange', changed); };
  }, []);
  useEffect(() => {
    const label =
      nav.find((n) => n.page === route.page)?.label ??
      (route.page === 'search' ? 'Search' : route.page === 'work' ? 'Saved outputs' : route.page === 'trash' ? 'Trash' : route.page === 'imports' ? 'Import' : 'Settings');
    document.title = `${label} — Counsel`;
    if (initialized.current) {
      if (route.page === 'search')
        contentRef.current?.querySelector<HTMLInputElement>('input')?.focus();
      else contentRef.current?.focus();
      window.scrollTo({ top: 0 });
    }
    initialized.current = true;
  }, [route.page, route.id, route.revision]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !editor) {
        event.preventDefault();
        go('search');
      }
      if (event.key === 'Escape') setMobileNav(false);
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [editor]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  const changed = (message: string) => {
    setToast(message);
    void refresh();
  };
  const saved = (kind: EditorKind, id: string) => {
    setEditor(null);
    changed(
      kind === 'knowledge'
        ? 'Practice item saved for your review.'
        : kind === 'matter'
          ? 'Matter created.'
          : kind === 'reference'
            ? 'Reference saved.'
            : 'Work saved.',
    );
    go(surfaces[kind], { id });
  };
  if (data?.setup?.suggested) setupStarted.current = true;
  const setupRequested = route.page === 'settings' && new URLSearchParams(routeHash.split('?')[1]).get('view') === 'setup';
  const firstRun = setupStarted.current && !data?.setup?.dismissed && route.page === 'home' && !route.id && !routeHash.includes('?');
  const setupAvailable = !!data?.setup && !data.setup.dismissed && !data.demo;
  const showingSetup = setupAvailable && (setupRequested || firstRun);
  const showingHistory = route.page === 'home' && !route.id && new URLSearchParams(routeHash.split('?')[1]).get('view') === 'history';
  const pageTitle = showingSetup ? 'Workspace setup' :
    nav.find((n) => n.page === route.page)?.label ??
    (route.page === 'search' ? 'Search' : route.page === 'work' ? 'Saved outputs' : route.page === 'trash' ? 'Trash' : route.page === 'imports' ? 'Import' : 'Settings');
  let surface: JSX.Element | null = null;
  if (data) {
    if (showingSetup) surface = <WorkspaceWelcome data={data} changed={refresh} editProfile={() => setEditingProfile(true)} />;
    else if (route.page === 'home') {
      const params = new URLSearchParams(routeHash.split('?')[1]);
      surface = showingHistory
        ? <ConversationHistory data={data} conversations={conversations} onChanged={() => void refresh()} /> : (
        <Chat
          key={`${route.id ?? 'new'}:${params.get('new')}:${params.get('matter')}`}
          id={route.id}
          data={data}
          onChanged={refresh}
          initialMatter={params.get('matter') ?? undefined}
          newChatKey={params.get('new') ?? undefined}
          focusTurn={params.get('turn') ?? undefined}
          initialTemplate={params.get('template') ?? undefined}
        />
      );
    } else if (route.page === 'search')
      surface = (
        <SearchPage
          key={`${route.query}:${new URLSearchParams(routeHash.split('?')[1]).get('matter')}`}
          data={data}
          initialQuery={route.query ?? ''}
          initialMatter={new URLSearchParams(routeHash.split('?')[1]).get('matter') ?? ''}
        />
      );
    else if (route.page === 'settings')
      surface = (
        <Settings data={data} onChanged={refresh} />
      );
    else if (route.page === 'imports') surface = <ImportWorkspace key={route.id ?? 'new'} id={route.id} data={data} onChanged={refresh} />;
    else if (route.page === 'trash') surface = <RecordTrash changed={refresh} />;
    else if (route.page === 'matters' && new URLSearchParams(routeHash.split('?')[1]).get('client'))
      surface = <ClientPage key={new URLSearchParams(routeHash.split('?')[1]).get('client')!} id={new URLSearchParams(routeHash.split('?')[1]).get('client')!} data={data} changed={refresh}/>;
    else if (route.page === 'matters' && route.id)
      surface = <RemoteMatter key={route.id} id={route.id} data={data} openEditor={setEditor} />;
    else if ((route.id || route.revision) && route.page !== 'matters')
      surface = <RecordReader route={route} data={data} onChanged={changed} />;
    else
      surface = <Library key={route.page} page={route.page} data={data} openEditor={setEditor} changed={refresh} />;
  }
  return (
    <ProfileSetupContext.Provider value={() => data?.practiceDocument ? setConfirmingIdentity(true) : setEditingProfile(true)}>
      <div className="workspace-app">
        <a
          className="skip-link"
          href="#workspace-content"
          onClick={(event) => {
            event.preventDefault();
            contentRef.current?.focus();
          }}
        >
          Skip to content
        </a>
        {mobileNav && (
          <button
            className="nav-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          />
        )}
        <aside
          ref={sidebarRef}
          className={`app-sidebar ${mobileNav ? 'sidebar-open' : ''}`}
          aria-label="Workspace navigation"
          {...(compact && !mobileNav ? { inert: '', 'aria-hidden': true } : {})}
          onKeyDown={(event) => {
            if (!compact || !mobileNav || event.key !== 'Tab') return;
            const items = sidebarRef.current?.querySelectorAll<HTMLElement>(
              'a, button:not(:disabled)',
            );
            if (!items?.length) return;
            const first = items[0]!;
            const last = items[items.length - 1]!;
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }}
        >
          <a
            className="brand"
            href={href('home', { view: 'history' })}
            aria-label="Counsel chats"
            onClick={() => setMobileNav(false)}
          >
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
            </span>
            <span>
              counsel<span className="brand-period">.</span>
            </span>
          </a>
          <div className="workspace-identity">
            <div>
              <strong>{data?.demo ? 'Example workspace' : 'Personal workspace'}</strong>
              {setupAvailable && <a className="sidebar-setup" href={href('settings', { view: 'setup' })}
                aria-current={showingSetup ? 'page' : undefined} onClick={() => setMobileNav(false)}>Finish setup</a>}
            </div>
            {data?.demo && <span className="workspace-example-badge">Test</span>}
          </div>
          <a className="sidebar-search" href={href('search')} onClick={() => setMobileNav(false)}>
            <Icon name="search" size={16} /><span>Search workspace</span><kbd>⌘ K</kbd>
          </a>
          <button
            className="nav-new"
            disabled={!data}
            onClick={() => {
              const next = href('home', { new: crypto.randomUUID() });
              location.hash = next;
              // The hash-change guard saves the current draft before mounting
              // a new chat. Eager mounting here makes that guard see the new,
              // still-loading draft and roll the URL back to the old page.
              setMobileNav(false);
              if (shortcutsRef.current) shortcutsRef.current.scrollTop = 0;
            }}
          >
            <Icon name="plus" size={19} />
            New chat
          </button>
          <nav aria-label="Workspace pages">
            {nav.map((item) => (
              <a
                key={item.page}
                href={href(item.page, item.page === 'home' ? { view: 'history' } : {})}
                onClick={() => setMobileNav(false)}
                className={`nav-link ${!showingSetup && route.page === item.page ? 'active' : ''} ${item.page === 'knowledge' ? 'nav-library-start' : ''}`}
                aria-current={!showingSetup && route.page === item.page ? 'page' : undefined}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                {item.page === 'knowledge' && !!(data?.practiceReviewCount ?? data?.totals.pending) && (
                  <span className="nav-count" title="Practice changes needing review">{data?.practiceReviewCount ?? data?.totals.pending}</span>
                )}
              </a>
            ))}
          </nav>
          <div className="sidebar-scroll" ref={shortcutsRef}>
          <SidebarRecents page={route.page} id={route.id} enabled={(data?.interfaceVersion ?? 0) >= 12} close={() => setMobileNav(false)} />
          </div>
          <div className="sidebar-bottom">
            <nav className="sidebar-utilities" aria-label="Workspace utilities">
            {data && <ImportActivity active={route.page === 'imports'} close={() => setMobileNav(false)} />}
            <a
              className={!showingSetup && route.page === 'settings' ? 'nav-link active' : 'nav-link'}
              href={href('settings')}
              onClick={() => setMobileNav(false)}
              aria-current={!showingSetup && route.page === 'settings' ? 'page' : undefined}
            >
              <Icon name="settings" size={19} />
              Settings
            </a>
            <a className={`nav-link ${route.page === 'trash' ? 'active' : ''}`} href={href('trash')}
              onClick={() => setMobileNav(false)} aria-current={route.page === 'trash' ? 'page' : undefined}>
              <Icon name="trash" size={19} />Trash
            </a>
            </nav>
            <a className="sidebar-storage" href={href('settings')} onClick={() => setMobileNav(false)}
              title="Records and files are saved on this device. Chats share selected context with your AI connection.">
              {data ? 'Files saved on this device' : 'Connecting to workspace…'}
            </a>
          </div>
        </aside>
        <div className="app-body">
          <header className="app-topbar">
            <WorkspaceFrame className="topbar-frame">
              <div className="topbar-location">
                <button
                  className="icon-button mobile-menu"
                  aria-label="Open navigation"
                  aria-expanded={mobileNav}
                  onClick={() => setMobileNav(!mobileNav)}
                >
                  <Icon name="menu" />
                </button>
                <span>Workspace</span>
                <Icon name="chevron" size={13} />
                <strong>{pageTitle}</strong>
              </div>
              <div className="topbar-actions">
                <a href={href('search')} className="topbar-search mobile-search" aria-label="Search workspace">
                  <Icon name="search" size={17} />
                  <span>Search workspace</span>
                  <kbd>⌘ K</kbd>
                </a>
              </div>
            </WorkspaceFrame>
          </header>
          {data?.demo && (
            <div className="demo-banner">
              <WorkspaceFrame className="demo-banner-frame">
                <Badge tone="blue">Example workspace</Badge>
                <span>
                  Seeded with examples; added files may contain real information. Chats use your selected AI connection.
                </span>
                <a href={href('settings')}>About this workspace</a>
              </WorkspaceFrame>
            </div>
          )}
          <WorkspaceFrame
            as="main"
            mode={route.page === 'home' && !showingHistory ? 'canvas' : 'page'}
            ref={contentRef}
            id="workspace-content"
            className={`app-content page-${route.page}`}
            tabIndex={-1}
          >
            {error && (
              <ErrorNotice
                message={error}
                retry={() => {
                  void refresh();
                }}
              />
            )}
          {data && data.interfaceVersion !== 33 && (
              <ErrorNotice message="The interface and workspace engine need the same update. Quit and reopen the updated Counsel app, or restart your original workspace command. Saved records are preserved." />
            )}
            {!data && !error && (
              <div className="loading-state" role="status">
                Opening your workspace…
              </div>
            )}
            {!data && error && (
              <div className="connection-help">
                <Icon name="shield" size={32} />
                <h1>Let’s open your workspace.</h1>
                <p>
                  Open Counsel on this device. If you use the developer version, run <code>bun run workspace</code> and open the link it prints.
                </p>
              </div>
            )}
            {surface}
          </WorkspaceFrame>
        </div>
        {toast && (
          <div className="toast" role="status">
            <Icon name="check" size={18} />
            <span>{toast}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setToast('')}
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}
        {editor && data && (
          <Editor state={editor} data={data} onClose={() => setEditor(null)} onSaved={saved} />
        )}
        {editingProfile && data?.practiceDocument && <PracticeDocumentModal value={data.practiceDocument} startEditing={(data.interfaceVersion ?? 0) >= 33} close={() => setEditingProfile(false)} changed={() => void refresh()} />}
        {confirmingIdentity && data?.practiceDocument && <ConfirmPracticeIdentity value={data.practiceDocument} close={() => setConfirmingIdentity(false)} saved={() => { setConfirmingIdentity(false); void refresh(); }} />}
        {editingProfile && data && !data.practiceDocument && (
          <ProfileEditor
            profile={data.profile}
            close={() => setEditingProfile(false)}
            saved={(profile) => {
              setData((current) => (current ? { ...current, profile } : current));
              setEditingProfile(false);
              setToast('Profile saved. New responses will use your current preference.');
              void refresh();
            }}
          />
        )}
      </div>
    </ProfileSetupContext.Provider>
  );
}
