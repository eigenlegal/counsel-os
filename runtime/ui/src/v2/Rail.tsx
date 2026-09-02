import { useEffect, useState } from 'react';
import type { Health, ThreadHeader } from '../api/types';
import type { Route } from '../app';
import { ChatIcon, HomeIcon, ModelsIcon, SettingsIcon, VaultIcon } from './icons';
import { ModelSwitcher } from './ModelSwitcher';
import { prettifyName } from './vault/frontmatter';

export interface RailProps {
  route: Route;
  threads: ThreadHeader[];
  selected: string | null;
  /** True while the main pane holds a draft — a conversation with no thread
   * yet. The draft is a row so the reader can see where they are, and a
   * BUTTON so they can get back to it from any other surface (cou-88). */
  draft: boolean;
  busy?: boolean;
  /** `/health` — the footer's provider plate (spec §3.1, cou-90). */
  health: Health | null;
  /** True on the vault route: the rail collapses to a 56px icon rail
   * (spec §3.1). */
  collapsed: boolean;
  onSelect: (id: string) => void;
  /** Threads with a step in flight — one dot each, so work you walked away
   * from is visible from anywhere. */
  running?: readonly string[];
  onNew: () => void;
  /** The draft row: navigate back to the draft already live in the chat
   * pane — never a reset. `onNew` starts a draft; this one returns to it. */
  onOpenDraft: () => void;
  /** The reader confirmed the delete on the row itself — the rail owns the
   * "Delete · Keep" step, so this fires once, already confirmed. */
  onDelete: (id: string) => void;
  /** The footer switcher picked a loaded provider: save it as the default
   * (the settings round-trip lives in the Shell). */
  onSetDefault: (id: string) => void;
  /** The open thread's matter stays local (providers spec §7): the
   * switcher greys its cloud rows. */
  localOnly?: boolean;
  /** Matter path → title (from `/vault/overview`), for the faint second
   * line under a thread with an EXPLICIT matter link. Absent or missing a
   * path, the row falls back to the prettified filename. */
  matterTitles?: Record<string, string>;
}

/** The title the first send gave the thread, or `Untitled`. */
export function railLabel(thread: ThreadHeader): string {
  const title = thread.title?.trim() ?? '';
  return title !== '' ? title : 'Untitled';
}

/** The second line under a linked thread: the matter's title. Only an
 * EXPLICIT link earns it — the rail has no transcript to infer from. */
export function railMatter(thread: ThreadHeader, titles: Record<string, string> | undefined): string | null {
  const path = thread.matter?.trim() ?? '';
  if (path === '') return null;
  return titles?.[path] ?? prettifyName(path.slice(path.lastIndexOf('/') + 1));
}

export function Rail({
  route,
  threads,
  selected,
  draft,
  busy = false,
  health,
  collapsed,
  onSelect,
  running = [],
  onNew,
  onOpenDraft,
  onDelete,
  onSetDefault,
  matterTitles,
  localOnly = false,
}: RailProps): JSX.Element {
  /** The row whose × was clicked: it reads "Delete this? ·
   * Delete · Keep" in set text until answered — no `window.confirm`, no
   * modal. Escape anywhere on the row keeps. */
  const [confirming, setConfirming] = useState<string | null>(null);
  // A row that vanished (deleted elsewhere, list refetched) takes its
  // question with it.
  useEffect(() => {
    if (confirming !== null && !threads.some(t => t.id === confirming)) setConfirming(null);
  }, [threads, confirming]);

  return (
    <aside className={collapsed ? 'v2-rail v2-rail-icons' : 'v2-rail'} aria-label="Rail">
      <div className="v2-brand">
        <span className="v2-mark" aria-hidden="true" />
        <span className="v2-lbl">counsel-os</span>
      </div>
      <nav className="v2-nav" aria-label="Surfaces">
        <a href="#/" aria-current={route === 'home' ? 'page' : undefined}>
          <HomeIcon />
          <span className="v2-lbl">Home</span>
        </a>
        <a href="#/chat" aria-current={route === 'chat' ? 'page' : undefined}>
          <ChatIcon />
          <span className="v2-lbl">Chat</span>
        </a>
        <a href="#/vault" aria-current={route === 'vault' ? 'page' : undefined}>
          <VaultIcon />
          <span className="v2-lbl">Vault</span>
        </a>
        <a href="#/models" aria-current={route === 'models' ? 'page' : undefined}>
          <ModelsIcon />
          <span className="v2-lbl">Models</span>
        </a>
        <a href="#/settings" aria-current={route === 'settings' ? 'page' : undefined}>
          <SettingsIcon />
          <span className="v2-lbl">Settings</span>
        </a>
      </nav>
      {collapsed ? null : (
        <>
          <div className="v2-rail-section">
            <span>Conversations</span>
            <button type="button" className="v2-rail-new" aria-label="New conversation" onClick={onNew} disabled={busy || draft}>
              ＋
            </button>
          </div>
          <ul className="v2-rail-list" aria-label="Threads">
            {draft ? (
              /* A button, not dead text (cou-88 nav bug: a draft left for
                 Home or Settings was unreachable). The aria-label is distinct
                 from the + button's "New conversation" — the two sit side by
                 side and name different acts: start vs return. */
              <li className="v2-draft" aria-current="true">
                <button type="button" className="v2-thread-open" aria-label="Open the new conversation" onClick={onOpenDraft}>
                  <span className="v2-thread-title">New conversation</span>
                </button>
              </li>
            ) : null}
            {threads.map(thread => {
              const matter = railMatter(thread, matterTitles);
              return (
                <li key={thread.id} className="v2-thread" aria-current={thread.id === selected && !draft ? 'true' : undefined}>
                  {confirming === thread.id ? (
                    <span
                      className="v2-thread-confirm"
                      role="group"
                      aria-label={`Delete ${railLabel(thread)}?`}
                      onKeyDown={event => {
                        if (event.key === 'Escape') setConfirming(null);
                      }}
                    >
                      <span className="v2-thread-confirm-q">Delete this?</span>
                      <button
                        type="button"
                        className="v2-thread-confirm-yes"
                        autoFocus
                        onClick={() => {
                          setConfirming(null);
                          onDelete(thread.id);
                        }}
                      >
                        Delete
                      </button>
                      <button type="button" className="v2-thread-confirm-no" onClick={() => setConfirming(null)}>
                        Keep
                      </button>
                    </span>
                  ) : (
                    <>
                      <button type="button" className="v2-thread-open" onClick={() => onSelect(thread.id)}>
                        <span className="v2-thread-title">
                          {/* The dot is decoration; the words are what a
                              screen reader hears, and they fold into the
                              button's own name rather than sitting on an
                              empty labelled span that may not be announced
                              at all. */}
                          {running.includes(thread.id) ? (
                            <>
                              <span className="v2-thread-running" aria-hidden="true" />
                              <span className="v2-sr">still running: </span>
                            </>
                          ) : null}
                          {railLabel(thread)}
                        </span>
                        {matter === null ? null : (
                          <span className="v2-thread-sub" title={thread.matter}>
                            {matter}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="v2-thread-delete"
                        aria-label={`Delete ${railLabel(thread)}`}
                        disabled={busy}
                        onClick={() => setConfirming(thread.id)}
                      >
                        ×
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {/* No "No threads yet." note: a fresh Home already carries the one
              getting-started copy, and a second empty-state line in the rail
              beside it read as the app saying the same thing twice
              (cou-82). An empty list under the Conversations heading reads
              empty on its own. */}
        </>
      )}
      <ModelSwitcher health={health} collapsed={collapsed} onSetDefault={onSetDefault} localOnly={localOnly} />
    </aside>
  );
}
