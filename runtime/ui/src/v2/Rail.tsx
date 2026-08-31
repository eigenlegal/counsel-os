import type { Health, ThreadHeader } from '../api/types';
import type { Route } from '../app';
import { ChatIcon, HomeIcon, SettingsIcon, VaultIcon } from './icons';
import { ModelSwitcher } from './ModelSwitcher';

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
  onNew: () => void;
  /** The draft row: navigate back to the draft already live in the chat
   * pane — never a reset. `onNew` starts a draft; this one returns to it. */
  onOpenDraft: () => void;
  onDelete: (id: string) => void;
  /** The footer switcher picked a loaded provider: save it as the default
   * (the settings round-trip lives in the Shell). */
  onSetDefault: (id: string) => void;
}

/** The title the first send gave the thread, or `Untitled`. */
export function railLabel(thread: ThreadHeader): string {
  const title = thread.title?.trim() ?? '';
  return title !== '' ? title : 'Untitled';
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
  onNew,
  onOpenDraft,
  onDelete,
  onSetDefault,
}: RailProps): JSX.Element {
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
            {threads.map(thread => (
              <li key={thread.id} className="v2-thread" aria-current={thread.id === selected && !draft ? 'true' : undefined}>
                <button type="button" className="v2-thread-open" onClick={() => onSelect(thread.id)}>
                  <span className="v2-thread-title">{railLabel(thread)}</span>
                </button>
                <button
                  type="button"
                  className="v2-thread-delete"
                  aria-label={`Delete ${railLabel(thread)}`}
                  onClick={() => onDelete(thread.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          {/* No "No threads yet." note: a fresh Home already carries the one
              getting-started copy, and a second empty-state line in the rail
              beside it read as the app saying the same thing twice
              (cou-82). An empty list under the Conversations heading reads
              empty on its own. */}
        </>
      )}
      <ModelSwitcher health={health} onSetDefault={onSetDefault} />
    </aside>
  );
}
